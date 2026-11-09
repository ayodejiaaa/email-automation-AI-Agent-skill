# Data Model (additive)

All tables are **new** — no existing table is altered. Names are illustrative; adapt to the stack's
conventions.

```
email_sequences
  id, key, name, enabled(bool), description,
  default_discount_pct(int, default 0),
  priority(int), created_at, updated_at

email_sequence_steps
  id, sequence_id FK, position(int),
  delay_minutes(int),                 # due_at = enrol time + delay
  subject, body_html, body_text,
  discount_pct(int, nullable),        # null → use sequence default; 0 → no discount text
  stop_condition(varchar),            # e.g. purchased | logged_in | activated | reviewed
  created_at, updated_at

email_enrollments
  id, user_id FK, sequence_id FK,
  reason(varchar),                    # why enrolled (trigger)
  status(active | completed | cancelled | suppressed),
  enrolled_at, completed_at, cancelled_at

email_scheduled
  id, enrollment_id FK, step_id FK, user_id FK,
  due_at(timestamp),
  status(scheduled | sending | sent | cancelled | failed),
  locked_at, attempts(int), error(text),
  UNIQUE(enrollment_id, step_id)      # idempotency: never double-schedule

email_sent                                   # immutable audit log
  id, user_id FK, enrollment_id FK, step_id FK,
  sequence_key, step_position,
  sent_at, to_email, from_email, subject,
  status(delivered | bounced | complained),
  trigger_reason(varchar),            # "what & why" for the admin log
  converted_at(nullable),             # attribution fill-in
  revenue_attributed(decimal, nullable)

email_settings
  id, singleton,
  master_enabled(bool, DEFAULT false),        # ships PAUSED
  from_name, from_email, reply_to, physical_address,
  max_per_day(int, default 1), max_per_week(int, default 4),
  quiet_hours_start, quiet_hours_end,
  attribution_window_days(int, default 7),
  show_admin_tables(bool, default true)

email_suppressions
  id, email, reason(unsubscribed | hard_bounce | complaint | admin),
  created_at

user_events (optional, if the app has no hooks)
  id, user_id FK, type(registration | login | cart_add | checkout_start | purchase | activation),
  payload(jsonb), created_at
```

## Attribution

- `email_sent.converted_at` / `revenue_attributed` are filled by a job that checks, for each send,
  whether the user purchased within `attribution_window_days`.
- The Statistics chart aggregates these by day/week/month.

## Retention & privacy

- `email_sent` holds emails + subjects → treat as PII; restrict to admins and set a retention window
  (e.g. 24 months).
- Deletion of a user should cascade/anonymise their rows per the app's privacy policy.
- Suppressions are permanent until the user re-consents.

# Data Model (additive)

All tables are **new** — no existing table is altered. Names are illustrative; adapt to the stack.

```
email_sequences
  id, key, name, enabled(bool), description,
  default_discount_pct(int, default 0),
  priority(int), holdout_pct(int, default 0),   -- % of eligible users withheld (measure lift)
  created_at, updated_at

email_sequence_steps
  id, sequence_id FK, position(int),
  delay_minutes(int),                 -- due_at = enrol time + delay
  subject, body_html, body_text,
  discount_pct(int, nullable),        -- null → sequence default; 0 → no discount text
  stop_condition(varchar),            -- purchased | logged_in | activated | reviewed
  min_cart_total(decimal, nullable),  -- skip incentive below this cart value
  ab_variant(varchar, nullable),      -- 'A' | 'B' for subject testing
  created_at, updated_at

email_enrollments
  id, user_id FK, sequence_id FK,
  reason(varchar),                    -- why enrolled (trigger)
  trigger_ref(varchar),               -- idempotency: cart id / session / date
  group(varchar, default 'treatment'),-- 'treatment' | 'holdout'
  status(active | completed | cancelled | suppressed),
  enrolled_at, completed_at, cancelled_at,
  UNIQUE(user_id, sequence_id, trigger_ref)

email_scheduled
  id, enrollment_id FK, step_id FK, user_id FK,
  due_at(timestamp),
  status(scheduled | sending | sent | cancelled | failed),
  locked_at, attempts(int), error(text),
  UNIQUE(enrollment_id, step_id)      -- idempotency: never double-schedule

email_sent                                   -- immutable audit log
  id, user_id FK, enrollment_id FK, step_id FK,
  sequence_key, step_position,
  sent_at, to_email, from_email, subject, ab_variant,
  status(delivered | bounced | complained),
  trigger_reason(varchar),            -- "what & why" for the admin log
  converted_at(nullable),             -- attribution
  revenue_attributed(decimal, nullable)

email_settings
  id, singleton,
  master_enabled(bool, DEFAULT false),        -- ships PAUSED
  from_name, from_email, reply_to, physical_address,
  max_per_day(int, default 1), max_per_week(int, default 4),
  send_window_start, send_window_end,          -- passed to isWithinAllowedSendWindow
  fallback_timezone(varchar, default 'UTC'),   -- when a user has no timezone
  attribution_window_days(int, default 7),
  show_admin_tables(bool, default true)

email_suppressions
  id, email (unique), reason(unsubscribed | hard_bounce | complaint | admin),
  sequence_key(varchar, nullable),    -- null = all sequences
  created_at

email_consent
  id, user_id FK, marketing bool, consent_at, consent_ip, source, updated_at

email_unsubscribe_tokens
  id, user_id FK, token_hash, expires_at, used_at

user_events (optional, if the app has no hooks)
  id, user_id FK, type(registration | login | cart_add | checkout_start | product_view |
                      activation | purchase | review | inactivity),
  payload(jsonb), created_at

admin_audit
  id, admin_user_id, action, target, meta(jsonb), created_at
```

## Notes

- **`users.timezone`** is required for quiet-hours correctness (add it if missing). Falls back to
  `email_settings.fallback_timezone`.
- **`group = holdout`** users receive no marketing emails; they are the control for honest lift.
- **`trigger_ref`** (e.g. cart id, date bucket) makes enrolment idempotent across polling runs.
- **`ab_variant`** on steps enables subject/body A/B; `email_sent.ab_variant` records which was sent.

## Retention & privacy

- `email_sent` holds emails + subjects → restrict to admins; retention e.g. 24 months.
- Deleting a user anonymises/removes their rows per the app's privacy policy.
- Suppressions persist until re-consent.

## Indexes

- `email_scheduled(status, due_at)` — the worker's hot path (`FOR UPDATE SKIP LOCKED`).
- `email_sent(user_id, sent_at)` and `email_sent(converted_at)` — attribution.
- `email_enrollments(user_id, status)` — precedence + duplicate checks.

# Sending Engine & Compliance

How emails actually go out — cron-based, per-user, idempotent, rate-limited — and the standards that
keep them out of spam and out of legal trouble.

---

## Architecture

```
event (registration / login / cart / purchase / inactivity)
   │
   ▼
enrollment ──▶ scheduled_emails (one row per step, with due_at + status)
   │
   ▼
scheduler (cron, every minute) ──▶ pick due rows ──▶ STOP-CONDITION CHECK ──▶ send worker
   │                                                                              │
   │                                              reuse the app's mail connection ┘
   ▼
sent_emails (audit: who, sequence, step, when, why, status)
```

- **No mass blasts.** Each row is one email to one user.
- **Cron/queue**, not request-time sends — never block a user request on email.
- Reuse the app's existing mail transport (`Mail::to`, `send_mail`, provider SDK). Do not add a new
  SMTP connection.

## Enrolment & scheduling

- When a trigger event fires, **enrol** the user in the sequence and **materialise** its steps into
  `scheduled_emails` with `due_at = event_time + step.delay`.
- **One active promotional sequence per user** (orchestration), unless the admin enables overlap.
- On a new relevant event, **cancel** conflicting future emails (e.g. purchase cancels cart reminder).

## Stop-condition check (before every send)

The worker must, at send time, verify the user still qualifies:

```
if user unsubscribed            → cancel + suppress
if address hard-bounced / complaint → cancel + suppress
if step.stop_condition_met(user)   → cancel (e.g. purchased, logged in, activated)
if frequency cap would be exceeded → defer to next allowed window
if within quiet hours              → defer
else                               → send, mark sent, log
```

**Idempotency:** mark a row `sending` with a lock before sending so a cron overlap or retry never
double-sends. Use a unique `(enrollment_id, step_id)` constraint.

## Frequency caps & quiet hours (anti-spam)

- **≤ 1 marketing email per user per 24h** (default), **≤ 4 per week** — configurable.
- **Quiet hours:** only send between the user's local 08:00–21:00 (or admin-set window).
- **Global suppression list:** unsubscribed, hard-bounced, spam-complained, or admin-blocked addresses
  are never emailed by any sequence.
- **Engagement guard:** if a user hasn't opened anything in N sends, throttle or pause them.

## Failure handling

- Retry transient send failures with backoff (max 3); mark permanent failures and suppress.
- Never lose a scheduled email silently — surface failures in the admin log.
- Log **why** each email was sent (sequence + step + triggering event) and **why** each was cancelled.

---

## Deliverability pre-flight (check, don't assume)

Before sending a single marketing email, **verify** (and warn the admin if not ready):

- **SPF, DKIM, DMARC** published for the sending domain (aligned with the from-domain)?
- Is the domain **warmed**? A new domain sending marketing to many recipients at once lands in spam.
- Is this mailer **transactional-only** today? Suddenly adding marketing can hurt reputation — ramp up.
- Is the **from-address on a branded domain** (never Gmail/Yahoo)?
- Are bounce + complaint **webhooks** wired (see `compliance.md`)?

Word lists are **secondary** — reputation is the primary signal. Use the safe-words list as hygiene,
not as the strategy.

## Deliverability standards (email-client agnostic)

- **Authentication:** SPF, DKIM, DMARC published for the sending domain; align the from-domain.
- **Branded domain** for the from-address — never Gmail/Yahoo/Hotmail.
- **MIME**: `multipart/alternative` with both HTML and **plain-text (≥500 chars)**; inline CSS,
  table-based layout (width ~600px), web-safe fonts, alt text, no JavaScript.
- **Headers:** `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click`;
  `Reply-To` a monitored inbox; a consistent `From` identity.
- **Content:** no spam-trigger words (see `email-copy.md`), no fake urgency, no misleading subjects,
  healthy text-to-image ratio.
- **Warm-up:** when starting on a new domain, ramp volume gradually.
- **Monitor:** bounce rate, complaint rate (keep < 0.1%), unsubscribe rate; pause a sequence if
  complaints spike.

## Legal & compliance

- **CAN-SPAM (US):** truthful subject + from, a clear **unsubscribe** in every marketing email, honour
  opt-outs promptly (within 10 days; do it sooner), and a **physical postal address** in the footer.
- **GDPR / ePrivacy (EU/UK):** a lawful basis (consent for marketing), clear opt-in (double opt-in is
  best practice), easy withdrawal, data-subject rights (access/erasure/portability), and a linked
  privacy policy. Log consent.
- **CASL (Canada) / Spam Act (AU):** consent + identification + working unsubscribe (honour within
  the local window).
- **Transactional vs marketing:** order/receipt emails are transactional; everything in this system is
  **marketing** and therefore needs consent + unsubscribe. Keep the line clear.

## Transactional vs marketing (enforced)

- **Marketing** (welcome, cart, upsell, win-back, browse, review, replenishment): requires
  `consent_marketing`, respects `email_suppressions` (unsubscribe/bounce/complaint), and the holdout
  group.
- **Transactional / account** (email verification, KYC, billing/trial, security/2FA, policy re-consent):
  part of delivering the service. They **bypass marketing consent/unsubscribe** but still avoid
  hard-bounced/complained addresses. **Never let a marketing unsubscribe stop "verify your email".**
- Tag each sequence with `kind` (`marketing` | `transactional`); the worker checks it
  (`examples/worker.mjs`, tested).

## Provider throughput, tenancy & i18n

- **Provider rate limits:** respect the ESP's caps (SendGrid/SES/Mailgun have per-second limits).
  Batch + throttle; handle `429` with backoff.
- **Multi-tenancy:** scope every table by `tenant_id` and never let one tenant see another's emails or
  people. The admin UI + queries must filter by tenant.
- **i18n:** store per-locale subject/body (or translate at render). Use the user's locale; fall back to
  the default. Don't send English to a Spanish user if Spanish is supported.

## Max active sequences

- Enforce **at most 1 active marketing sequence per user** (highest priority wins; lower-priority
  scheduled rows are cancelled on enrolment). This guard keeps many enabled sequences from turning into
  spam. Implemented in `examples/worker.mjs`.

## The pause-by-default contract

- On install, **everything is paused** (master switch OFF, no sequence active).
- The admin is notified: "Email Automation is installed and paused — review the sequences, then turn it
  on." The agent may offer to enable it after a preview.
- A **global kill switch** stops all sends instantly without unenrolling users.
- **Rollback:** disabling the system stops all sends; dropping the additive tables fully removes it,
  leaving the app's own email/config untouched.

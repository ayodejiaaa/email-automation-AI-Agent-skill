# Changelog

## [1.0.0] — 2026-11-09

### Design
- **The admin page is now built with the `ui-ux-20-laws` skill** — added
  `references/admin-design-laws.md` (per-surface law map, Audit → Implement → Trace, pre-ship
  checklist) and wired it into the workflow, admin-ui, and README.

### Hardening (review items 2–10)
- **Worker now enforces** consent, holdout group, sequence precedence (max 1 active marketing), admin
  per-step exclusions, timezone-aware quiet hours, frequency caps, retry caps and max deferrals, and
  **transactional vs marketing** separation. Tests added for each (`worker.test.mjs`, 14 tests).
- **Signed unsubscribe tokens** (HMAC) with verify + tamper tests; **erasure** helper.
- **Discount conditional tested** with a real template engine (Mustache): `examples/render.mjs` +
  `render.test.mjs` assert a 0% discount renders **no** discount text.
- **CI** (`.github/workflows/test.yml`) runs `npm install && npm test` on every push.
- **WYSIWYG**: reuse the app's existing editor if it has one; else a free one. Email-safe pipeline
  (sanitize → transform → base template) documented in `references/wysiwyg.md`.
- **Provider rate limits, multi-tenancy, i18n** guidance + **max active sequences** guard.
- **Quickstart** (`references/quickstart.md`) + fixed ambiguities (delay = from enrolment; `kind`;
  config `templates` map; transactional vs marketing).

## [Unreleased]

### Platform scouting & derived sequences
- **Scout the platform's purpose** during discovery and derive the sequences that fit — added a
  **platform-derived sequence library** (email verification, profile completion, onboarding, KYC,
  billing/trial, trial ending, feature adoption, 2FA, policy re-consent, booking, renewal, first→second
  purchase, birthday) in `references/sequences.md` and `references/discovery.md` §4b.

### Admin controls & health
- **Sequence controls** — **Start / Pause / Delete** per sequence (delete requires typing **`delete`** in
  a confirmation modal, then soft-deletes + is restorable); bulk start/pause/delete.
- **Calmer admin UI** — ≤4 tabs, one primary action per view, details in a slide-over drawer, secondary/
  destructive actions in an overflow (`⋯`) menu, advanced settings collapsed, health banners only when
  there's a problem.
- **Add / reorder / delete sequence steps** from the admin (new steps also schedule for active enrolments).
- **Users tab** — search a user by email, expand their sequence with the down caret, **cancel a
  specific email**, or **exclude the user** from all automation (with audit + re-include).
- **Health banners** — warn when **automation is paused**, the **cron/scheduler isn't running** (with a
  detailed why + stack-specific fix commands + "Test now"), or there's **no SMTP/API key** (with setup
  steps + "Send test email"). Added `references/health-checks.md`.
- Data model: `email_step_exclusions`, `email_settings.last_cron_run_at`.


### Hardening (from the review)
- **Executable, tested engine** — `examples/worker.mjs` + `worker.test.mjs` (idempotency,
  stop-conditions, frequency caps, crash-recovery reaper) and `references/reference-implementation.md`
  (SQL with `FOR UPDATE SKIP LOCKED`, reaper, attribution).
- **Enforced non-disruption contract** (`references/non-disruption.md`) — backup, reversible
  migrations, `try/catch` hook isolation, smoke test, rollback drill.
- **Exact trigger rules** (`references/triggers.md`) — cart-abandon, inactivity, activation, etc.
- **Operationalized compliance** (`references/compliance.md`) — consent, signed one-click unsubscribe,
  preference center, bounce/complaint webhooks, retention.
- **Sending hardening** — locking, reaper, batching, user timezone, deliverability pre-flight.
- **Attribution** — last-touch model + holdout group.
- **Sequence precedence matrix**, min-cart discount guard, A/B subjects, and extra sequences
  (browse-abandon, back-in-stock, price-drop, dunning, referral).
- **Data model** — timezone, consent, unsubscribe tokens, holdout, admin audit.
- **Admin UI** — cache/paginate admin tables, permission + audit, rate-limit test-send.
- Trimmed the description; added a "when NOT to use" section.

- Initial release: non-disruptive email automation admin-section builder.
  - 8 research-backed lifecycle sequences (welcome, no-login, inactive, abandoned cart,
    post-purchase review, upsell, win-back, replenishment).
  - Personal one-to-one copy standards, discount rules (0% = hidden), contact-admin link in every email.
  - Cron-based sending engine with idempotency, stop conditions, frequency caps, quiet hours.
  - Admin dashboard: sequences, recipients log (100/page), conversion + revenue statistics, settings.
  - Admin-only purchased/abandoned tables on product & checkout pages.
  - **Free, self-hosted WYSIWYG editor** (TinyMCE Community; Quill/TipTap/Summernote/GrapesJS) for
    editing email bodies — email-safe HTML, merge tokens, conditional-discount block, plain-text twin,
    preview + test-send.
  - Deliverability + compliance (SPF/DKIM/DMARC, CAN-SPAM, GDPR, unsubscribe, physical address).
  - Ships paused by default; additive schema; reuses the app's email connection.

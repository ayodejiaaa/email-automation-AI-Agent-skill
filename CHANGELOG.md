# Changelog

## [Unreleased]

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

# Changelog

## [Unreleased]
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

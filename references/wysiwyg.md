# Email Template Editor (WYSIWYG)

How the admin edits the email body — and how to keep the output **email-safe**.

---

## 1. Check for an existing editor FIRST

Before adding any dependency, **inspect the app**:

- Is a rich-text editor already available? (TinyMCE, CKEditor, Quill, Summernote, TipTap, GrapesJS,
  or the framework's admin editor / a `wysiwyg` config / an existing rich-text field component.)
- **If one exists → reuse it.** Just configure it for email-safe output (below). Adding a second
  editor bloats the bundle, confuses the admin, and causes inconsistency.
- **If none exists → add a free, self-hosted editor:** TinyMCE Community (MIT), Quill, TipTap,
  Summernote, or GrapesJS + MJML. **Never** a paid cloud-only editor (Unlayer/Froala).

## 2. Email-safe pipeline (required for whatever editor you use)

A normal WYSIWYG produces **web HTML that breaks in email clients** (Outlook/Gmail strip `<style>`,
external CSS, and JS). Run every save through:

```
editor HTML ─▶ sanitize (allowlist) ─▶ transform to email-safe ─▶ wrap in base template ─▶ store HTML + plain text
```

- **Sanitize:** allowlist tags/attributes (e.g. **DOMPurify** client-side, or an HTML sanitizer
  server-side). Strip `<script>`, `<style>`, event handlers, `<iframe>`, `<form>`, external CSS.
  This prevents **stored XSS** in the admin preview and the inbox.
- **Transform to email-safe:** table-based layout, **inline CSS**, ~600px width, web-safe fonts, alt
  text on images. Or author in **MJML/GrapesJS** which outputs responsive email HTML.
- **Base template:** wrap the body in a branded shell — header/logo, footer with brand name,
  physical address, unsubscribe + preferences.
- **Plain-text twin:** auto-generate a plain-text version (≥500 chars); store both.
- **Store:** `body_html` + `body_text` per step; render at send time with merge data.
- **Preview:** desktop / mobile / dark mode + **test-send** to the admin's own inbox.

## 3. Merge tokens & conditional blocks

- Merge tokens: `{{first_name}}`, `{{product_name}}`, `{{cart_link}}`, `{{discount_pct}}`,
  `{{support_link}}`, `{{unsubscribe_link}}` — with safe fallbacks.
- **Conditional discount:** `{{#discount_active}}…{{/discount_active}}` — rendered **only when
  discount > 0**, so a 0% email shows **no discount text**. This is a real Mustache template (see
  `examples/render.mjs` + `render.test.mjs`, which assert the 0% case).
- **Escape interpolated values by default** (Mustache escapes automatically) to prevent injection.

## 4. Don't

- Don't add a second editor when one already exists.
- Don't store raw editor HTML without sanitizing (stored XSS).
- Don't rely on `<style>` blocks or external CSS.
- Don't use a paid, cloud-only editor.

## 5. Lazy-load

Load the editor only on the template-edit page (dynamic import) so the rest of the admin stays fast.

# Admin UI — the Email Automation section

A first-class, beautiful admin area that matches the app's existing design. Use its design tokens
(spacing, type, color, radius). If the app has no admin theme, apply the 20-laws rules: clear
hierarchy, ≤5 top-level tabs, 44px targets, 4.5:1 contrast, empty/loading/error states.

---

## Navigation

Add one top-level menu item: **"Email Automation"** (mail icon), placed near other management items.

Tabs: **Sequences · Recipients · Statistics · Settings**.

---

## Tab 1 — Sequences

- A list of the 8 sequences (Welcome, No-login, Re-engage, Abandoned cart, Review, Upsell, Win-back,
  Replenishment) as **cards**.
- Each card: name, status badge (**On / Paused / Off**), counts (enrolled, sent, converted), and an
  **Edit** action.
- Edit drawer/page: step list with **delay**, **discount %** (0 = hidden in email), **subject + body**
  (edited with a **free WYSIWYG editor** — see below), **stop conditions**, and **on/off**.
- **Preview & test-send** to the admin's own email before enabling.

### Email body editor (free WYSIWYG — required)

The body of every step is edited with a **free, self-hosted WYSIWYG editor** — never a paid,
cloud-only one.

- **Primary:** **TinyMCE Community (self-hosted)** — familiar, mature, MIT-licensed, easy to embed.
- **Lightweight alternatives:** **Quill**, **TipTap**, **Summernote** (all free / open-source).
- **Drag-and-drop email builder (optional):** **GrapesJS** with the newsletter/email preset (pairs
  with **MJML** for responsive output).
- **Email-safe output is mandatory.** The editor must produce HTML that survives email clients:
  table-based layout, **inline CSS**, ~600px width, alt text on images, **no `<script>`**, no external
  stylesheets/JS, no forms. Web-only HTML breaks in Outlook/Gmail.
- **Merge tokens:** a toolbar button inserts `{{first_name}}`, `{{product_name}}`, `{{cart_link}}`,
  `{{discount}}`, `{{support_link}}`, `{{unsubscribe_link}}`, etc., with safe fallbacks.
- **Conditional blocks:** the discount sentence is a conditional block that renders only when
  discount > 0 (so a 0% email shows no discount text).
- **Sanitize on save** with a tag/attribute allowlist (prevents XSS in the admin and in the inbox).
- **Plain-text twin:** auto-generate a plain-text version (≥500 chars) from the HTML; store both.
- **Preview** (desktop / mobile / dark mode) + **test-send** to the admin's own inbox.
- **Lazy-load** the editor only on the template-edit page so the rest of the admin stays fast.

## Tab 2 — Recipients (the log)

The audit trail. **Paginated by 100.**

Columns:

| Column | Notes |
|--------|-------|
| User | email — **clickable → user profile** |
| Sequence / step | e.g. "Abandoned cart · Step 2" |
| Status | sent · scheduled · cancelled · failed |
| When | sent_at or scheduled due_at (user-local time) |
| Why | the triggering event + stop-condition reason ("cart abandoned 24h ago") |

- Filters: sequence, status, date range, search by email.
- A **scheduled** row shows its future `due_at`; a cancelled row shows *why*.
- Empty state: "No emails yet — turn on a sequence to start."

## Tab 3 — Statistics (conversion attribution)

The payoff: **do reminders convert?**

- For every reminder sent, attribute a conversion if the user purchases within an admin-set window
  (default **7 days**).
- Headline metrics: reminders sent · recipients · **converted** · **conversion rate** · **attributed
  revenue**.
- **Chart** of conversions + revenue by **day / week / month** (a toggle). Line/bar, accessible labels,
  tooltips. One series "reminders attributed", one "revenue".
- Per-sequence breakdown table (sent, converted, rate, revenue).
- Make clear it's **attribution**, not causation, and state the attribution window.

## Tab 4 — Settings

- **Master switch** (big, obvious): *Email Automation is PAUSED / ON*. Ships **PAUSED**.
- **Sender:** from-name, from-email (branded domain), reply-to, physical mailing address.
- **Limits:** max emails/user/24h, max/week, quiet-hours window.
- **Attribution window** (default 7 days).
- **Admin tables toggle** (see below) + instructions.
- Test-send button.

---

## Admin-only tables on product & checkout pages

At the **bottom** of each **product detail** and **checkout** page, show a table **only to admins** —
clearly marked **"Admin only"** (a badge + a one-line note, e.g. *"This data is visible to admins
only."*).

Two tabs:

- **Purchased** — users who bought this product.
- **Abandoned** — users who reached this cart/checkout but didn't purchase.

Columns:

| Column | Behaviour |
|--------|-----------|
| Email | **clickable → user profile** |
| Registered | datetime |
| Logged in | datetime |
| Abandoned | datetime (abandoned tab) |
| Would have paid | amount + currency |
| Phone | **clickable → `tel:` call** (if present) |
| Emails ▾ | caret expands a list of **emails received + scheduled** (what + when) |

- The caret opens a small timeline: sent (with date) and scheduled (with due date).
- Respect privacy: only aggregate the data the admin already has access to.

### Disabling these tables

The admin can **hide these tables** from **Email Automation → Settings** with a single toggle. Put the
instructions **right under the table title** for discoverability:

> **Admin only · [Purchased | Abandoned]**
> *To hide this table, go to Email Automation → Settings → "Show purchased/abandoned tables".*
> (link)

When disabled, the table disappears from product/checkout pages but the automation keeps working.

---

## Design & states

- **Empty states** with a next action.
- **Loading** skeletons for tables/charts.
- **Errors** are inline and actionable.
- **Destructive** actions (delete a sequence) confirmed.
- **Responsive**: tables scroll or collapse to cards on mobile; charts resize.
- **Accessible**: labelled inputs, focus rings, keyboard-navigable tabs, chart data available as a
  table for screen readers.
- **Seamless**: reuse the app's admin layout, sidebar, buttons, and colors — it should look native.

## Turning it on (hand-off)

The section ships **paused**. On first open, show a banner:

> "Email Automation is installed and **paused**. Preview a sequence, then switch it on when you're
> ready." → **[Turn on]** **[Preview]**

The admin can also ask the agent to turn it on after a successful preview/test-send.

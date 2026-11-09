# Discovery — study the app before you build

**Never start coding until you understand the app.** The goal of this phase is a short
**integration plan** you can hand back to the user. Do not modify anything yet.

---

## 1. Identify the stack

- **Framework / language** — Laravel, Rails, Django, Next.js, Express, Spring, custom PHP, etc.
- **ORM / database** — Postgres, MySQL, SQLite, MongoDB; migration tool.
- **Templating / UI** — Blade, ERB, Django templates, React/Vue/Svelte, admin theme (e.g. Filament,
  Nova, Django admin, ActiveAdmin).
- **Job runner / cron** — the app's scheduler (`cron`, `schedule:run`, Sidekiq, Celery, queues).
- **How config/secrets are stored** — `.env`, config files, a settings table.

## 2. Find the admin panel

- Look for `/admin`, `/dashboard`, `/manage`, an `admin/` namespace, a role/permission system, or a
  dedicated admin framework (Filament, Nova, Django admin, ActiveAdmin, `administrate`).
- Identify **where to add a top-level menu** and how routes/pages are registered.
- **If there is no admin panel:** stop and ask the user — "There's no admin panel; shall I create a
  minimal protected one, or add this under an existing settings page?" Don't silently invent one.

## 3. Find the existing email connection (reuse it)

- A mailer/SMTP config, a provider SDK (SendGrid, Mailgun, Postmark, SES, Resend), or a notifications
  system. **This system must reuse it — never add a second connection.**
- Note the **from address** currently used, and whether SPF/DKIM/DMARC are configured.

## 4. Map the domain

| Object | What to find |
|--------|--------------|
| **User** | table/model, email, phone, `created_at`, last login, roles |
| **Auth** | login/registration controllers, session/token, events or hooks |
| **Product** | product model, price, type (physical/digital/service/consumable), detail page route |
| **Cart / checkout** | cart model, checkout flow, "abandon" signal, order model |
| **Orders** | order/purchase model, amount, status, timestamps |
| **Events** | any existing event/observer/webhook system you can hook into |

Record the exact **event names or hook points** for: registration, first login, cart add, checkout
start, purchase/order-paid, inactivity.

## 5. Decide the integration path

Choose the least invasive option that matches the stack:

1. **Event hooks / observers** if the framework has them (best — no core changes).
2. **DB triggers or polling** if there are no hooks — poll for state changes on a schedule.
3. **Middleware / logging** as a last resort (observe only — never block or alter the request).

Prefer **append-only**: write events into a new `user_events` table from an observer, and let the
scheduler read from there. This keeps you out of the app's critical path.

## 6. Security & data notes

- The automation reads **user emails and phone numbers** — treat as PII; restrict admin access.
- Do not expose the automation's tables/endpoints to non-admins.
- Note current **authentication on admin routes** so the new page matches it.

---

## Output: the integration plan

Produce a short plan like:

```
Stack: Laravel 11 + MySQL, Blade admin at /admin (no admin framework), queue via database, SMTP via
existing MAIL_* config.

Admin: add a top-level "Email Automation" item to the admin sidebar + routes under /admin/email-automation.

Email: reuse MAIL_* / Mail facade; existing from-address notifications@brand.com.

Events available: registration (Registered event), login (Login event), purchase (OrderPaid event).
Missing: cart-abandon. Plan: observe checkout page + a `carts` table poll every 10 min.

New tables (additive): email_sequences, email_sequence_steps, email_enrollments, email_scheduled,
email_sent, email_settings, email_suppressions, user_events.

Non-disruptive: master switch OFF; no changes to existing controllers/tables; new observers only.
If no admin panel → ask user first.
```

Keep the plan to one screen. Get the user's OK before building.

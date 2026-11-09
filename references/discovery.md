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

## 3b. Detect existing push / SMS / WhatsApp infrastructure

Before adding providers, check what the app already uses:

- **Push:** FCM, APNs, OneSignal, web-push, Pusher Beams, Airship — or the framework's notification system.
- **SMS:** Twilio, MessageBird, Vonage/Nexmo, AWS SNS, Africa's Talking, Termii (`TWILIO_*` etc. in env).
- **WhatsApp:** Meta WhatsApp Cloud API, Twilio WhatsApp, 360dialog, Wati, Gupshup.

**If a provider exists → reuse its sender and credentials.** If it doesn't → plan to add credentials on
the admin **Channels** tab (`references/channels.md`). Never add a second provider for the same channel.

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

## 4b. Understand the platform's purpose & derive extra sequences

Email automation must fit the **product**, not a generic template. Before building, answer:

- **What is this platform for?** (e-commerce, SaaS, fintech, booking, marketplace, social, content,
  education, healthcare…)
- **What is the core "aha"/activation event** that makes the product valuable?
- **What critical account steps gate value?** email verification, profile completion, onboarding
  setup, KYC/identity, billing/payment method, 2FA.
- **What lifecycle moments exist?** trial, subscription/renewal, booking/appointment, delivery,
  consumables, certificates/domains.
- **What does the product's own marketing promise?** (read its homepage/docs — sequences should lead
  the user to that promise.)

From those answers, **propose additional reminder sequences** beyond the default catalog, e.g.:

- Registered but **email not verified** → verification reminder.
- **Profile incomplete** (marketplace/social/dating/professional) → profile-completion reminder.
- **Onboarding/setup incomplete** (SaaS) → setup reminder.
- **KYC pending** (fintech) → identity-verification reminder.
- **No payment method / trial ending** (SaaS) → billing reminder.
- **Booking/appointment** → reminder before the appointment.
- **Renewal/expiry** (subscriptions, domains, certificates) → renewal reminder.

Add a **sequence shortlist** to the integration plan: the default sequences that apply **plus** the
platform-specific ones, each with trigger + stop condition. **Never add a sequence the platform can't
detect or act on.**

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

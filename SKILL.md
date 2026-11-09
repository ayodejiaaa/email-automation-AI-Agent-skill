---
name: email-automation
description: >-
  Build a complete, non-disruptive "Email Automation" section inside an app's admin panel that turns
  user behaviour into lifecycle email reminders — welcome, re-engagement, abandoned cart/checkout,
  post-purchase review, upsell/cross-sell, win-back, and replenishment — using proven funnel timing,
  personal one-to-one copy, discounts/urgency, and cron-based sending through the app's existing email
  connection. Ships an admin dashboard (sequences, recipient log paginated by 100, conversion
  statistics chart, sender + pause settings) and admin-only purchased/abandoned tables on product and
  checkout pages. Everything starts PAUSED and non-disruptive. Use when adding email automation,
  drip/lifecycle email, abandoned-cart recovery, reminder emails, or an "Email Automation" admin menu.
  Triggers: "email automation", "drip campaign", "abandoned cart emails", "reminder emails",
  "lifecycle emails", "welcome sequence", "win-back emails", "upsell emails", "email reminders in my
  admin", "build an email automation section".
---

# Email Automation — Admin Section Builder

Build a **world-class email automation system inside the user's existing admin panel**. It watches
user behaviour, enrols people in the right lifecycle sequence, and sends **personal, one-at-a-time
reminder emails** through the app's own configured email connection — underpinned by proven funnel
timing, not blasts.

**Goal:** increase user return, purchase, and retention — without spamming anyone and without breaking
anything that already works.

> **Read this first:** this skill is *non-disruptive by design*. It **studies the app before touching
> it**, adds **only new tables/routes** (never rewrites existing flows), **reuses the app's email
> connection**, and ships **paused**. Nothing sends until an admin explicitly turns it on.

---

## The workflow

```
0. Discover ─▶ 1. Design ─▶ 2. Build ─▶ 3. Wire events ─▶ 4. Admin UI ─▶ 5. Verify ─▶ 6. Hand off
   study the     data model    new tables/    triggers →       dashboard +     dry-run +     paused +
   app + admin   + sequences   worker/cron    enrolments       tables + stats  preview       "turn on?"
```

### 0. Discover (mandatory, before any code)
Study the app thoroughly and produce a short **integration plan**. See `references/discovery.md`.
- Detect the stack, framework, ORM/DB, auth, sessions, the **admin panel** (or note its absence).
- Find the existing **email connection** (SMTP/provider SDK) — reuse it; never add a second one.
- Map **products**, **cart/checkout**, **orders**, **users**, and the events needed.
- If there is **no admin panel**, ask the user whether to create a minimal one.

### 1. Design
- Define the **data model** (`examples/data-model.md`): sequences, steps, enrolments, scheduled
  emails, sent log, settings, suppressions.
- Choose the **sequence set** and timings (`references/sequences.md`).

### 2. Build (additive only)
- Add new tables/collections, a scheduler job, and the send worker. **Do not modify existing tables.**
- Add a **feature flag / master pause switch** (default OFF) and a global kill switch.

### 3. Wire events
- Hook the app's existing events (registration, login, cart add, checkout start, purchase, inactivity)
  into enrolment — **without changing their behaviour** (observe, don't intercept).

### 4. Admin UI
- Add a top-level **"Email Automation"** menu with tabs: **Sequences · Recipients · Statistics ·
  Settings**. See `references/admin-ui.md`.
- Add **admin-only** purchased/abandoned tables at the bottom of product and checkout pages.

### 5. Verify
- Dry-run mode, a **preview/test-send** tool, idempotency checks, and a stop-condition audit.

### 6. Hand off
- The system ships **paused**. Notify the admin, show a one-click "Turn on" (or let the agent help),
  and document rollback.

---

## The sequence catalog (proven funnel timing)

Full detail, copy intent, and stop conditions: `references/sequences.md`. Summary:

| # | Sequence | Trigger | Timing (default) | Stops when |
|---|----------|---------|------------------|------------|
| 1 | **Welcome / activate** | Registration | 0h welcome → 24h value → 72h social proof | Login / purchase |
| 2 | **Registered, never logged in** | Registered + no login | 1h → 24h → 72h | Login |
| 3 | **Logged in, no purchase/use** | Logged in, inactive | 1h nudge → 24h → 5d | Purchase / activation |
| 4 | **Abandoned cart / checkout / product** | Cart or checkout or product view, no purchase | **1h reminder (no discount) → 24h social proof/objection → 48–72h urgency + discount** | Purchase |
| 5 | **Post-purchase review** | Purchase (product type aware) | Next day "how's it going?" → 2 weeks "experience + upsell" | Review / unsubscribe |
| 6 | **Upsell / cross-sell** | Purchase, other products exist | After value moment (3–7 days) | Purchase of promoted item |
| 7 | **Win-back / re-engagement** | Inactive 30 / 60 / 90 days | Neutral → value → final "we'll stop" | Activity / unsubscribe |
| 8 | **Replenishment** | Consumable product | ~Day 45–60 | Repurchase |

**Discounts:** upsells may carry a discount; abandoned carts carry **urgency + discount**. Default
**0%** — when 0, the email must **not mention a discount at all**. (`references/sequences.md`.)

---

## Non-negotiable rules

1. **Study before building.** Never modify existing auth, cart, checkout, order, or user flows. Add
   new tables/routes only.
2. **Reuse the existing email connection.** No second SMTP/provider setup. No mass/bulk sending —
   emails are **per-user and event-driven**.
3. **Ships paused.** Master switch OFF; admin is notified to turn it on (agent can offer to help).
4. **No spam.** Frequency caps (default ≤1 marketing email/user/24h, ≤4/week), quiet hours, and a
   **global suppression list** (unsubscribed, bounced, complained). Respect interest + consent.
5. **Stop conditions always win.** Re-check the goal (purchase/login/activation) **before every send**
   so buyers don't get cart reminders.
6. **Personal, one-to-one copy.** "From" one real person (`Name from Brand`), personally worded,
   references the actual product, one clear CTA, and a **"contact admin" link in every email**.
7. **Deliverability + legal.** SPF/DKIM/DMARC, branded sending domain, HTML + plain-text, unsubscribe
   + physical address, no spam trigger words. See `references/sending-and-compliance.md`.
8. **Everything auditable.** Every send is logged (who, which sequence/step, when, why) and every
   scheduled email is visible in the admin.
9. **Beauty + seamlessness.** Match the app's design tokens; the admin section must look native. Use
   the `reviews-to-features`-style rigor: clear hierarchy, 44px targets, accessible contrast.

---

## Admin surface (what the admin gets)

- **Email Automation** menu (top-level), with tabs:
  - **Sequences** — per-sequence on/off, delays, discounts, copy, stop conditions.
  - **Recipients** — table of users + emails sent/scheduled, **paginated by 100**, with *when* and
    *why* (sequence + step + trigger).
  - **Statistics** — of users who received a reminder, how many converted, revenue, and a chart by
    **day / week / month**.
  - **Settings** — sender (from-name/from-email/reply-to/physical address), master pause, caps,
    quiet hours.
- **Admin-only tables** at the bottom of **product** and **checkout** pages:
  - Tab **Purchased** and tab **Abandoned** — clearly marked *"Admin only"*.
  - Columns: email (→ user profile), registration/login/abandon datetimes, would-have-paid amount,
    phone (→ `tel:` call), and a caret revealing **emails received + scheduled + when**.
  - Disable-able from Email Automation → Settings, with instructions under the table title + link.

Full UI spec: `references/admin-ui.md`.

---

## Deliverables the agent produces

1. `references/discovery.md` → an **integration plan** for the specific app.
2. New tables/migrations + the scheduler + send worker (additive).
3. The event hooks (observe-only).
4. The admin "Email Automation" page + tabs + statistics chart.
5. The admin-only purchased/abandoned tables.
6. A preview/test-send tool + dry-run + rollback notes.
7. A short **hand-off doc**: what was added, how to turn it on, how to pause, how to roll back.

---

## References

- `references/discovery.md` — study the app, find the admin, choose an integration path.
- `references/sequences.md` — the full sequence catalog, timing, copy intent, stop conditions.
- `references/email-copy.md` — personal "from one person" copy standards, subject lines, templates.
- `references/sending-and-compliance.md` — scheduler, idempotency, caps, deliverability, CAN-SPAM/GDPR.
- `references/admin-ui.md` — the dashboard, log (100/page), statistics chart, admin-only tables.
- `examples/data-model.md` — DB schema.
- `examples/sequence-config.json` — a concrete, editable sequence config.
- `examples/email-templates.md` — sample rendered emails.

# Email Automation — AI Agent Skill

> **Ask your AI agent to use this skill to create email automation for your product — to improve sales
> and user returns.** One sentence is all it takes, and it builds out an elaborate, clean Email
> Automation section in your admin page, ready to go.

**Copy this prompt into your AI agent:**

```
Use the email-automation skill to build a complete, ready-to-go Email Automation section in my app's
admin for {{PRODUCT}} — automated lifecycle reminders that improve sales and user returns — and ship
it paused so I can review and turn it on.
```

---

> **This is an AI agent skill.** It builds a complete, non-disruptive **"Email Automation"** section
> inside your app's admin panel — turning user behaviour into personal, proven lifecycle emails that
> increase return, purchase, and retention.

Give an agent (Claude Code, Codex, Cursor, OpenCode, …) this skill and it will: study your app, find
the admin panel, add an **Email Automation** menu, wire up the right sequences (welcome, abandoned
cart, post-purchase, upsell, win-back…), and ship it **paused** so nothing breaks and nothing sends
until you say so.

---

## What it builds

| Piece | What the admin gets |
|-------|---------------------|
| **Sequences** | 8 lifecycle sequences, each on/off, with editable delays, discounts, and copy |
| **Template editor** | a **free, self-hosted WYSIWYG editor** (TinyMCE Community; or Quill/TipTap/Summernote/GrapesJS) to edit each email body — email-safe HTML, merge tokens, preview + test-send |
| **Editable sequences** | admin can **add / reorder / delete steps**; a new step also schedules for active enrolments |
| **Health checks** | banners when emails can't send: **paused**, **cron not running** (with exact fix commands), **no SMTP/API key** (with setup steps) |
| **User controls** | search a user by email, expand their sequence with a caret, **cancel one specific email** or **exclude the user** from all automation |
| **Recipients log** | every user + emails sent/scheduled, **paginated by 100**, with *when* and *why* |
| **Statistics** | of those who got reminders, how many converted + revenue, charted by day/week/month |
| **Settings** | sender (from-name/email, reply-to, address), master pause, caps, quiet hours |
| **Admin-only tables** | on **product & checkout** pages: *Purchased* / *Abandoned* — email → profile, phone → call, caret → emails sent/scheduled. Disable-able from Settings |
| **Safety** | ships **paused**, global kill switch, no change to existing flows, reuse the app's email connection |

---

## The sequences (research-backed funnel timing)

| # | Sequence | Trigger | Timing | Discount |
|---|----------|---------|--------|----------|
| 1 | **Welcome / activate** | Registration | 0h → 24h → 72h | 0% |
| 2 | **Registered, never logged in** | Registered + no login | 1h → 24h → 72h | 0% |
| 3 | **Logged in, no purchase/use** | Inactive after login | 1h → 24h → 5d | 0% |
| 4 | **Abandoned cart / checkout / product** | Cart/checkout/product, no purchase | **1h (no discount) → 24h social proof → 48–72h urgency + discount** | up to 10% on step 3 |
| 5 | **Post-purchase review** | Purchase (product-type aware) | next day → 2 weeks | 0% |
| 6 | **Upsell / cross-sell** | Purchase, other products exist | after value moment (3–7d) | optional |
| 7 | **Win-back** | Inactive 30/60/90d | neutral → value → "we'll stop" | optional |
| 8 | **Replenishment** | Consumable product | ~day 45–60 | optional |

**Discount rule:** default **0%** — and at 0% the email **never mentions a discount**.

---

## The non-disruptive guarantee

1. **Studies before it builds** — stack, admin, auth, products, cart, email connection.
2. **Additive only** — new tables/routes; never rewrites existing auth, cart, checkout, or user flows.
3. **Reuses the app's email connection** — no second SMTP/provider.
4. **Ships paused** — master switch OFF; the admin is prompted to review and turn it on (the agent can
   help).
5. **Per-user, not mass** — cron-driven, one email at a time, with frequency caps and stop conditions.
6. **Rollback** — disable stops all sends; dropping the new tables removes it cleanly.

---

## What makes the emails good

- **Personal, from one person** — `Dave from NoteVault`, a monitored reply-to, references the exact
  product. Example:

  > *Hi Dave, I noticed you wanted to buy the Sony Xmax TV but haven't completed the payment. Is
  > anything blocking you? You can finish here — and I've added 10% off if you complete it in the next
  > 24 hours.*

- **One clear CTA** and a **"contact admin" link in every email**.
- **Deliverability-safe**: SPF/DKIM/DMARC, branded domain, HTML + plain-text, no spam trigger words,
  unsubscribe + physical address (CAN-SPAM/GDPR).
- **Client-agnostic**: table-based HTML, inline CSS, ~600px, alt text, dark-mode aware.

---

## Structure

```
SKILL.md                              # the skill: workflow, sequences, non-negotiables
references/
├── discovery.md                      # study the app, find admin, choose integration path
├── non-disruption.md                 # enforced contract: backup, reversible migrations, smoke test
├── triggers.md                       # exact detection rules (cart-abandon, inactivity, etc.)
├── sequences.md                      # catalog: precedence, timing, copy intent, stop conditions
├── email-copy.md                     # personal copy standards, subject lines, templates
├── sending-and-compliance.md         # cron, idempotency, caps, deliverability pre-flight
├── compliance.md                     # consent, signed unsubscribe, preference center, webhooks
├── admin-ui.md                       # dashboard, log (100/page), stats chart, admin tables, WYSIWYG
└── reference-implementation.md       # engine pseudocode + SQL (locking, reaper, attribution)
examples/
├── worker.mjs                        # executable scheduler/worker core
├── worker.test.mjs                   # tests: idempotency, stop-conditions, caps, reaper
├── data-model.md                     # additive DB schema
├── sequence-config.json              # concrete, editable config
└── email-templates.md                # sample rendered emails
package.json                          # `npm test`
```

Run the reference engine's tests with `npm test` (or `node --test examples/*.test.mjs`).

---

## Pull it & start using

Copy this prompt into your agent:

```
Pull the email-automation skill from
https://github.com/davepartner/email-automation-AI-Agent-skill (pin it by tag or commit), read
SKILL.md, and build the Email Automation section into this app:

1. DISCOVER first: identify the stack, the admin panel, the existing email connection, and the
   products / cart / checkout / orders / user models. Produce a one-screen integration plan and show
   me it BEFORE writing code. If there is no admin panel, ask me whether to create one.
2. Build it additively (new tables/routes only) with a feature flag, and SHIP IT PAUSED.
3. Add the "Email Automation" admin menu with tabs: Sequences · Recipients (100/page) · Statistics
   (conversion + revenue chart by day/week/month) · Settings (sender, caps, pause).
4. Wire the sequences (welcome, no-login, inactive, abandoned cart, post-purchase review, upsell,
   win-back, replenishment) with personal copy, stop conditions, and discounts (0% = no mention).
5. Add admin-only Purchased/Abandoned tables to product & checkout pages, hide-able from Settings.
6. Reuse the existing email connection; no mass email; respect caps + unsubscribe.
7. Give me a preview/test-send and a rollback doc, then ask if you should turn it on.
```

---

## Strengths & limitations

**Strengths**
- **Behaviour-triggered, not blasts** — each email is personal and per-user.
- **Proven timing** — 1h cart reminder, 24h social proof, 48–72h urgency; day-1 + 2-week post-purchase.
- **Tested engine** — the scheduler/worker core ships as runnable code with tests (idempotency,
  stop-conditions, frequency caps, crash recovery).
- **Non-disruptive, verified** — additive + reversible migrations, hook isolation, smoke test, rollback
  drill; paused by default.
- **Operational compliance** — signed one-click unsubscribe, preference center, consent capture,
  bounce/complaint webhooks, retention.
- **Measurable & honest** — last-touch attribution with a holdout group to estimate true lift.

**Limitations**
- **Sending depends on the app's existing mail setup** — if that is broken, reminders fail too.
- **Behaviour tracking quality varies** — a custom app without events may need polling/observers (lower
  fidelity than a clean event bus).
- **Attribution still needs volume** — even with last-touch + a holdout, small samples are noisy; treat
  lift as directional until you have data.
- **Deliverability is earned** — new domains need warm-up; the skill is only as good as sender reputation.
- **Timezone/quiet-hours** need a stored user timezone; unknown timezones fall back to the admin window.

---

## Versioning

Pin by commit hash or tag when you pull it into a project. See `CHANGELOG.md`.

## License

MIT — see [LICENSE](./LICENSE).

---

## Search index — keywords

*Findable by AI agents and humans searching for lifecycle email automation and admin tooling:*

Email automation, email automation admin, lifecycle emails, drip campaign, drip email, email
sequences, automated reminders, reminder emails, abandoned cart emails, cart abandonment recovery,
abandoned checkout email, product page abandonment, welcome email sequence, onboarding emails,
re-engagement email, win-back email, reactivation email, upsell email, cross-sell email, post-purchase
email, review request email, replenishment reminder, user retention, increase retention, repeat
purchase, conversion optimization, funnel emails, sales funnel automation, customer.io alternative,
klaviyo alternative, mautic alternative, dittofeed alternative, email marketing automation, cron email,
scheduled emails, stop conditions, frequency cap, quiet hours, personalization, one-to-one email,
transactional vs marketing email, conversion attribution, email statistics, email analytics.

WYSIWYG, free WYSIWYG editor, email template editor, email body editor, rich text editor, TinyMCE,
Quill, TipTap, Summernote, GrapesJS, MJML, email-safe HTML, inline CSS, merge tokens, template preview,
test send, email deliverability, SPF, DKIM, DMARC, spam trigger words, CAN-SPAM, GDPR, CASL, unsubscribe,
List-Unsubscribe, plain text email, HTML email, email client agnostic, branded sending domain, sender
reputation, email compliance.

Add email step, edit sequence, cancel scheduled email, exclude user, user search, email automation
health, cron not running, scheduler heartbeat, SMTP not configured, email transport missing, send test
email, pause warning, admin user management, per-email cancellation, resend control, non-disruptive,
reversible migration, migration rollback, feature flag, kill switch, event observer,
conversion attribution, holdout group, last-touch attribution, A/B subject testing, browse abandonment,
back in stock, price drop, dunning, referral email, preference center, consent, double opt-in, signed
unsubscribe token, one-click unsubscribe, bounce webhook, complaint webhook, retention policy,
timezone-aware sending, quiet hours.

Admin panel, admin menu, feature flag, non-disruptive, rollback, database schema, additive migration,
email log, admin-only table, user profile link, call link, conversion chart.

AI agent skill, Claude Code skill, Claude skill, Cursor rules, AI coding rules, agent prompt, system
prompt, LLM rules, agentic development, developer skill, engineering skill, product skill, growth
skill, lifecycle marketing.

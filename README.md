# Email Automation — AI Agent Skill

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
├── sequences.md                      # full catalog: timing, copy intent, stop conditions
├── email-copy.md                     # personal copy standards, subject lines, templates
├── sending-and-compliance.md         # cron, idempotency, caps, deliverability, CAN-SPAM/GDPR
└── admin-ui.md                       # dashboard, log (100/page), stats chart, admin tables
examples/
├── data-model.md                     # additive DB schema
├── sequence-config.json              # concrete, editable config
└── email-templates.md                # sample rendered emails
```

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
- **Non-disruptive** — paused by default, additive schema, reuse existing mail.
- **Tunable** — discounts default to 0 and are hidden at 0; delays/caps are configurable.
- **Measurable** — conversion attribution + revenue chart.
- **Compliant & deliverable** — SPF/DKIM/DMARC, unsubscribe, physical address, plain-text.

**Limitations**
- **Sending depends on the app's existing mail setup** — if that is broken, reminders fail too.
- **Behaviour tracking quality varies** — a custom app without events may need polling/observers (lower
  fidelity than a clean event bus).
- **Attribution ≠ causation** — conversions counted within a window may have happened anyway; treat the
  stats as directional.
- **Deliverability is earned** — new domains need warm-up; the skill is only as good as the sender
  reputation.
- **Timezone/quiet-hours** rely on knowing the user's local time; unknown timezones fall back to the
  admin window.

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

Admin panel, admin menu, feature flag, non-disruptive, rollback, database schema, additive migration,
email log, admin-only table, user profile link, call link, conversion chart.

AI agent skill, Claude Code skill, Claude skill, Cursor rules, AI coding rules, agent prompt, system
prompt, LLM rules, agentic development, developer skill, engineering skill, product skill, growth
skill, lifecycle marketing.

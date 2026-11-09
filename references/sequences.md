# Sequences — the funnel catalog

The heart of the system. Each sequence is a short, **bounded** series of personal emails triggered by
behaviour, with explicit timing, copy intent, discounts, and **stop conditions**.

Timing is grounded in funnel research (Klaviyo/Shopify/Mailchimp abandoned-cart guidance, lifecycle
playbooks): the first touch should land within ~1 hour for intent-based flows, later touches space out,
and every sequence is capped and respects frequency limits.

> **Golden rules for every sequence**
> - **Stop condition always wins.** Re-check the goal (login / purchase / activation / unsubscribe)
>   **before** each send. A buyer must never receive an abandoned-cart email.
> - **One email at a time.** Never send a user two sequences on the same day.
> - **Discount default = 0%.** When the configured discount is 0, the email must **not mention a
>   discount at all**.
> - **First email = no discount** (discounting early trains users to wait).
> - **Bounded and suppressed.** Respect unsubscribe, hard bounce, spam complaint, and frequency caps.

---

## 1. Welcome / activate (registration)

| Step | Delay | Intent | Discount |
|------|-------|--------|----------|
| 1 | immediate (~0h) | Warm welcome; confirm the account; the single next step to take | 0% |
| 2 | +24h | Show the core value / best-sellers / how to get started | 0% |
| 3 | +72h | Social proof + a gentle nudge to act | 0% (optional welcome offer if configured) |

**Stop:** first login, first purchase, unsubscribe.
**Why:** welcome emails are the highest-engagement email in the lifecycle.

---

## 2. Registered, never logged in

| Step | Delay | Intent |
|------|-------|--------|
| 1 | +1h | "You're in — here's the one thing to do first." |
| 2 | +24h | Address a likely friction (forgot password? unclear value?) |
| 3 | +72h | Final gentle nudge; offer help / contact admin |

**Stop:** first login, unsubscribe. **Never** send this if they *have* logged in.

---

## 3. Logged in, but no purchase / no use

| Step | Delay | Intent |
|------|-------|--------|
| 1 | +1h after inactivity signal | Re-engage with the specific thing they viewed |
| 2 | +24h | Show value / a relevant product or feature |
| 3 | +5d | Last check-in; offer to help |

**Stop:** purchase, activation event, unsubscribe. Configurable "inactivity" window.

---

## 4. Abandoned cart / checkout / product (highest value)

| Step | Delay | Intent | Discount |
|------|-------|--------|----------|
| 1 | **+1h** | Friendly reminder: show the exact item(s), one clear link back | **0%** |
| 2 | **+24h** | Social proof / reviews / answer a common objection | 0% (or small) |
| 3 | **+48–72h** | Urgency + **incentive** (this is where the discount lives) | configurable |

**Stop:** purchase (check before every send), unsubscribe. Trim to 2 emails for low-value carts.
**Why:** recovery rates fall steeply after 24h; 3 touches within ~72h is the benchmark. Don't discount
step 1.

---

## 5. Post-purchase review / experience

| Step | Delay | Intent | Discount |
|------|-------|--------|----------|
| 1 | next day (or after delivery + usage time) | "How's it going?" — offer help / a tip | 0% |
| 2 | +2 weeks | Ask about their experience + introduce a relevant next product | optional upsell |

**Stop:** review left, unsubscribe. Adjust delay by **product type** (consumables/electronics wait
longer before asking for a review). Never ask for a review before the product has been used.

---

## 6. Upsell / cross-sell (post-purchase)

| Step | Delay | Intent | Discount |
|------|-------|--------|----------|
| 1 | after value moment (3–7d) | "Because you bought X, you may also like Y" | configurable |

**Stop:** purchase of the promoted item, unsubscribe. Only run if **other products/services exist**.
Frame as a helpful suggestion, not a hard sell. Segment by what they bought.

---

## 7. Win-back / re-engagement

| Step | Delay | Intent | Discount |
|------|-------|--------|----------|
| 1 | inactive 30d | Neutral check-in: "Anything we could do better?" | 0% |
| 2 | inactive 60d | Show what's new / a relevant reason to return | 0% |
| 3 | inactive 90d | Final offer (optional) + "we'll stop here" | optional |

**Stop:** any activity, unsubscribe. After the final email, **suppress** from re-engagement. This
protects sender reputation (don't keep emailing the unresponsive).

---

## 8. Replenishment (consumables only)

| Step | Delay | Intent | Discount |
|------|-------|--------|----------|
| 1 | ~day 45–60 (by product) | "Running low? Reorder in one click." | configurable |

**Stop:** repurchase, unsubscribe. Only for products with a known usage cycle.

---

## Discount & urgency rules

- **Default discount per sequence = 0%.** 0% ⇒ **omit any discount text entirely** (no "0% off", no
  teaser). This is a hard rule.
- **Abandoned cart** step 3 and **upsell** may carry a discount; the value is admin-configurable.
- Discounts should be **time-boxed** ("valid for 48 hours") to create honest urgency — never fake
  countdowns.
- Generate a **unique, expiring code** per user when possible; log redemption.
- Never stack multiple discounts in one send.

## World-standard additions included

- **Welcome series** (registration) — highest-ROI lifecycle email.
- **Win-back** with a final "we'll stop" email (protects deliverability).
- **Replenishment** for consumables.
- **Referral ask** after a positive review (optional, config-gated).
- **Frequency caps + quiet hours** (see `sending-and-compliance.md`).
- **Orchestration priority** — a user is in at most one promotional sequence at a time; purchase flows
  outrank cart flows.

## Copy intent → templates

Every step has a copy brief here; the actual wording rules and templates live in
`references/email-copy.md`. All emails are personal, one-to-one, and carry a **contact-admin link**.

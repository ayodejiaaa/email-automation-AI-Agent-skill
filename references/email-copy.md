# Email Copy — personal, one-to-one, deliverability-safe

Every email must read like it came from **one real person at the brand**, not "the marketing team".
That's what makes lifecycle reminders feel helpful instead of spammy.

---

## Voice & identity

- **From name:** `FirstName from Brand` (e.g. `Dave from NoteVault`). Never "no-reply", never
  "The Team", never a generic mailbox.
- **From address:** a **branded domain** (`dave@notevault.com` or `hello@notevault.com`). Never
  `@gmail.com` / `@yahoo.com` — mailbox providers penalise it.
- **Reply-to:** a real, monitored inbox (replies should reach a human).
- **Tone:** warm, human, specific, low-pressure. Short paragraphs. One idea per email.
- **Length:** ~80–180 words. **Always include a plain-text version with 500+ characters** (spam filters
  flag image-only emails).

## Structure of every email

1. **Subject** — 2–6 words, lowercase or sentence case, specific, curiosity-friendly. No ALL CAPS, no
   `!!!`, no clickbait.
2. **Greeting** — `Hi {{first_name}},` (fall back to `Hi there,` when unknown).
3. **The specific hook** — reference the exact product/action ("I noticed you were looking at the
   Sony Xmax TV…").
4. **One clear CTA** — a single button/link back to finish the action.
5. **Optional incentive** — only if discount > 0.
6. **Contact line** — every email: *"Any questions? Just reply to this email or contact us at
   {{support_link}}."*
7. **Footer (required by law & deliverability):** physical mailing address, unsubscribe link,
   preference link, brand name.

## The "personal sales note" pattern (use for cart / product reminders)

> Subject: **your {{product}} is still waiting**
>
> Hi {{first_name}},
>
> I noticed you wanted to buy the {{product}} from {{brand}}, but you haven't completed the payment
> yet. Is there anything blocking you from finishing it?
>
> You can pick up right where you left off here:
> **{{cart_link}}**
>
> {{#if_discount}}I've included a **{{discount}}% discount** so you can get it a little cheaper — it's
> valid for the next {{expiry}}.{{/if_discount}}{{^if_discount}}If something's not clear, just reply
> and I'll help.{{/if_discount}}
>
> Any questions? Reply here or contact us at {{support_link}}.
>
> — {{sender_name}}, {{brand}}
>
> *{{physical_address}} · Unsubscribe · Manage preferences*

**Rules baked into the template:**
- The discount sentence is **conditional**. At 0% it is **omitted entirely**.
- The CTA is a single link back to the cart/checkout.
- The **contact-admin link is always present**.
- Plain-text version mirrors this without images.

---

## Subject-line bank (per sequence)

| Sequence | Safe, personal subjects |
|----------|-------------------------|
| Welcome | "welcome, {{first_name}} 👋", "you're in — start here" |
| No login | "did you get a chance to look around?" |
| Re-engage | "your {{product}} is still waiting", "still thinking it over?" |
| Cart 1h | "did you get distracted? your cart's still here" |
| Cart 24h | "a few people asked about the {{product}}" (social proof) |
| Cart 48–72h | "your cart expires soon", "one last note before your cart clears" |
| Review | "how's the {{product}} treating you?", "try this one thing first" |
| Upsell | "because you bought the {{product}}…" |
| Win-back | "we saved your spot", "should we stop emailing?" |

---

## Spam-trigger words & patterns to AVOID

Do not use (case-insensitive): **free!!!, act now, limited time!!!, buy now, click here, guaranteed,
risk-free, 100%, $$$, cash, urgent, hurry, don't miss out, winner, congratulations you won, no
obligation, call now, all caps, multiple exclamation marks, excessive emoji**.

Rules:
- No ALL-CAPS words; no strings of `!!!` or `???`.
- No "Fake Re:" / misleading subjects (CAN-SPAM violation).
- No image-only emails; keep a healthy text ratio.
- No link-obfuscation or shortened links that look suspicious; use your branded domain.
- No attachments.

---

## Personalisation data

- Use `{{first_name}}`, `{{product_name}}`, `{{product_image}}`, `{{cart_link}}`, `{{order_link}}`,
  `{{support_link}}`, `{{sender_name}}`, `{{unsubscribe_link}}`, `{{physical_address}}`.
- **Fallbacks are mandatory** — never render a raw `{{token}}` or "Hi ,".
- Never leak PII of other users; only personalise with data about the recipient.

---

## Accessibility & rendering

- Semantic headings, alt text on every image, ≥16px body, high contrast.
- Responsive single-column layout; max width ~600px.
- Test across Gmail, Apple Mail, Outlook, and mobile.
- Support dark mode (via `prefers-color-scheme` meta/CSS where possible).

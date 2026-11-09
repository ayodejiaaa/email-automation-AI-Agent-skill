# Message templates — email, push, WhatsApp, SMS

Each channel has its own format and limits. Keep the same intent, adapt the length and tone.

---

## Push notification (≤4 KB payload; title ~40 chars, body ~120)

```json
{
  "title": "Your cart is still waiting",
  "body": "The Sony Xmax TV is still reserved. Tap to finish — 10% off ends in 48h.",
  "deepLink": "app://cart/…",
  "data": { "cart_id": "…" }
}
```

---

## SMS (160 GSM-7 chars = 1 segment)

> NoteVault: your Sony Xmax TV is still in your cart. Finish here: shop.example/c/abc — 10% off ends
> in 48h. Reply STOP to opt out.

- Keep links short; include opt-out instructions; no marketing to non-opted-in numbers.

---

## WhatsApp (approved template outside the 24h window)

```
Hello {{first_name}} 👋
Your {{product_name}} is still waiting in your cart. I've added a 10% discount for the next 48 hours.
[Complete your order →](https://shop.example/c/abc)
Questions? Reply here — a real person will answer.
```

- Use a **pre-approved template** for the first message; a user reply opens the 24h session window.
- Opt-in required; honor opt-out.

---

## Email (the full message — see `examples/email-templates.md`)

- Subject, greeting, the specific product, one CTA, contact-admin link, footer with address + unsubscribe.
- HTML + plain-text twin (≥500 chars).

---

## Rules across channels

- **One idea, one CTA** per message.
- **Discount default 0%** — omit any discount text at 0%.
- **Every message** offers a way to stop (SMS `STOP`, WhatsApp reply/unsubscribe, push settings link,
  email unsubscribe) and a contact path.
- **Don't duplicate across channels the same day** (cross-channel cap).
- Personalise with the recipient's own data only.

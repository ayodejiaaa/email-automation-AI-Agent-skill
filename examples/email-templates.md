# Email Templates — sample rendered emails

All emails are personal, one-to-one, with a **contact-admin link** and a legal footer. The discount
sentence is **conditional** — omitted entirely at 0%.

---

## 1. Abandoned cart — Step 1 (1 hour, no discount)

**From:** Dave from NoteVault · **Reply-To:** support@notevault.com
**Subject:** did you get distracted? your cart's still here

Hi Dave,

I noticed you were looking at the **Sony Xmax TV** but didn't finish the payment. Was something
unclear, or did you just get pulled away?

You can pick up right where you left off here:
**[Finish my purchase →]({{cart_link}})**

If anything's blocking you, just reply to this email — I'll help.

— Dave, NoteVault

*Any questions? [Contact us]({{support_link}}) · 1 Example Street, Lagos, Nigeria · [Unsubscribe]({{unsubscribe_link}}) · [Manage preferences]({{preferences_link}})*

---

## 2. Abandoned cart — Step 3 (48–72h, urgency + 10% discount)

**Subject:** your cart expires soon — here's 10% off

Hi Dave,

Your **Sony Xmax TV** is still reserved, but I can't hold it forever. I've added a **10% discount** so
you can get it a little cheaper — it's valid for the next **48 hours**.

**[Complete my order with 10% off →]({{cart_link}})**

Still have questions? Reply here or [contact us]({{support_link}}) — happy to help.

— Dave, NoteVault

*[Contact us]({{support_link}}) · 1 Example Street, Lagos, Nigeria · [Unsubscribe]({{unsubscribe_link}}) · [Manage preferences]({{preferences_link}})*

> At **0%**, the second sentence becomes: "Your **Sony Xmax TV** is still reserved, but I can't hold it
> forever." — the discount sentence is removed completely.

---

## 3. Welcome — Step 1 (immediate)

**Subject:** welcome, Dave 👋

Hi Dave,

Thanks for joining NoteVault. The quickest way to get value: **[create your first note →]({{app_link}})**.

It takes about 30 seconds, and everything auto-saves.

If you get stuck, reply to this email — a real person reads it.

— Dave, NoteVault

*[Contact us]({{support_link}}) · 1 Example Street, Lagos, Nigeria · [Unsubscribe]({{unsubscribe_link}})*

---

## 4. Registered, never logged in — Step 1 (1 hour)

**Subject:** did you get a chance to look around?

Hi Dave,

You created a NoteVault account but haven't jumped in yet. Your workspace is ready whenever you are:
**[sign in and start →]({{login_link}})**.

Having trouble signing in? [Reset your password]({{reset_link}}) or reply to this email.

— Dave, NoteVault

*[Contact us]({{support_link}}) · 1 Example Street, Lagos, Nigeria · [Unsubscribe]({{unsubscribe_link}})*

---

## 5. Post-purchase — next day

**Subject:** how's the NoteVault Pro treating you?

Hi Dave,

Your **NoteVault Pro** should be all set. Quick tip most people miss: **[set up your first template →]({{guide_link}})** —
it saves hours later.

Anything not working as expected? Reply here and I'll sort it out.

— Dave, NoteVault

*[Contact us]({{support_link}}) · 1 Example Street, Lagos, Nigeria · [Unsubscribe]({{unsubscribe_link}})*

---

## 6. Post-purchase — 2 weeks (experience + upsell, 0% by default)

**Subject:** two weeks in — how's it going?

Hi Dave,

You've had **NoteVault Pro** for a couple of weeks now — how's it working for you?

If you want to take it further, **NoteVault Teams** lets you share notes with your whole team.
**[See NoteVault Teams →]({{product_link}})**

No pressure — and if something's not right, just reply.

— Dave, NoteVault

*[Contact us]({{support_link}}) · 1 Example Street, Lagos, Nigeria · [Unsubscribe]({{unsubscribe_link}})*

---

## 7. Win-back — final (90 days)

**Subject:** should we stop emailing?

Hi Dave,

I don't want to clutter your inbox, so this is my last note. If NoteVault isn't for you, no hard
feelings — you can **[unsubscribe here]({{unsubscribe_link}})** and I'll stop.

If you'd like to give it another look: **[see what's new →]({{app_link}})**.

— Dave, NoteVault

*[Contact us]({{support_link}}) · 1 Example Street, Lagos, Nigeria · [Unsubscribe]({{unsubscribe_link}})*

---

## Plain-text fallback (every email)

Every HTML email ships with a plain-text twin (≥500 chars) that mirrors the content, keeps the one CTA
link, the contact link, the physical address, and the unsubscribe link. Example:

```
Hi Dave,

I noticed you were looking at the Sony Xmax TV but didn't finish the payment. Was something
unclear, or did you just get pulled away?

Finish here: {{cart_link}}

If anything's blocking you, just reply to this email and I'll help.

— Dave, NoteVault
Contact us: {{support_link}}
1 Example Street, Lagos, Nigeria
Unsubscribe: {{unsubscribe_link}}
```

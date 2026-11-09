# Opt-in prompts — get permission at the right moment

Users must **opt in** to push / SMS / WhatsApp before reminders use those channels. The prompt timing
and wording decide whether they say yes.

## When to prompt

- **At a moment of value**, not on first page load: after they create something, finish checkout, or
  open Settings → Notifications when relevant.
- **Push:** show a short explanation ("Get a reminder when your order ships") for a button; only call
  the browser/native permission prompt **after** they tap it. If they deny, don't re-prompt — show a
  "Enable in settings" link.
- **SMS / WhatsApp:** collect and **verify** the phone number (OTP), then show an **unchecked** opt-in
  box with clear wording and a link to the privacy policy.
- **Email:** already opted in at signup (with consent).

## How to ask (good)

- One channel at a time, with a concrete benefit and a single action.
- "Not now" and "enable" have equal prominence; never a dark pattern.
- Explain frequency ("about once a week").
- Store `consent`, `timestamp`, and `source` when they accept.

## Push permission specifics

- Web: `Notification.requestPermission()` — call it inside the user gesture, never on load.
- Native: FCM/APNs permission; handle "denied" by linking to app settings.
- Store the device token; remove tokens that the provider says are invalid.
- Never ask on every visit. Respect the answer.

## SMS / WhatsApp specifics

- Collect **country code + number**, normalize, verify with an OTP.
- **SMS:** explicit opt-in; disclose "reply STOP to opt out"; honor STOP immediately. TCPA (US) requires
  prior express consent for marketing texts.
- **WhatsApp:** explicit opt-in (Meta requirement); use **approved templates** for the first message;
  a user reply opens the 24h session window.

## Where the prompts live

- A small **Notifications** section in the user profile (per-channel toggles).
- An inline prompt at the value moment (e.g., after a purchase: "Get shipping updates by SMS").
- A one-time banner in the app shell, dismissible, with a link.

## Never

- Prompt on page load, repeatedly, or with a deceptive "Allow" that isn't the channel.
- Pre-tick consent boxes.
- Keep sending to a denied/unsubscribed channel.
- Hide how to turn it off.

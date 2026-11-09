# Channels — Email, Push, WhatsApp, SMS

Reminders are **multi-channel**. Email is the baseline; **push, WhatsApp, and SMS are opt-in**. The
system reuses whatever the platform already has, and only asks the admin for credentials when a channel
doesn't exist yet.

## 1. Discovery — reuse what already exists

Before adding any provider, detect the platform's existing infrastructure:

| Channel | Look for |
|---------|----------|
| **Push** | FCM, APNs, OneSignal, web-push, Pusher Beams, Airship; framework notification systems (Laravel/Rails/Django notifications); Novu/Knock |
| **SMS** | Twilio, MessageBird, Vonage/Nexmo, AWS SNS, Africa's Talking, Termii |
| **WhatsApp** | Meta WhatsApp Cloud API, Twilio WhatsApp, 360dialog, Wati, Gupshup |
| **Config** | env keys like `TWILIO_*`, `FCM_*`, `APNS_*`, `WHATSAPP_*`; provider services in `config/` |

**If a provider exists → reuse it** (its sender and credentials). **Only if it doesn't**, surface setup on
the admin **Channels** tab (below). Never add a second provider for the same channel.

## 2. Priority & fallback

- Default priority: **push → email → WhatsApp → SMS** (cheap, high-attention first).
- Resolve per user with the tested helper (`examples/channels.mjs`):

  ```js
  resolveChannels({ priority, available, consent, suppressed });
  // available  = provider configured AND user reachable (device token / verified phone / email)
  // consent    = explicit per-channel opt-in
  // suppressed = invalid token, hard bounce, opt-out, complaint
  ```

- A step can target a **specific channel** or **"any usable"** with fallback to the next.
- If the chosen channel fails at send time, fall back to the next usable one (record the attempt; don't
  duplicate).

## 3. Per-channel consent (required)

| Channel | Consent | Notes |
|---------|---------|-------|
| Email | marketing consent | existing |
| Push | explicit opt-in **+ permission granted + device token** | browser/native permission |
| SMS | explicit opt-in (**TCPA** in the US) + **verified phone** | honor `STOP` |
| WhatsApp | explicit opt-in (Meta requires it) | **template** outside the 24h window |

Store `consent[channel]` and `suppressed[channel]` per user. Non-email channels are **blocked** unless
opted in.

## 4. Provider constraints

- **Push:** small payload (≤4 KB; see `pushPayloadFits`), permission required, tokens expire → remove
  invalid tokens.
- **SMS:** **160 GSM‑7 chars** (153 per part); **UCS‑2 70/67**; include opt‑out ("reply STOP"); sender
  ID; only to opted-in numbers.
- **WhatsApp:** **approved template** outside the 24h customer-service window (`whatsappNeedsTemplate`);
  opt-in required; watch the quality rating.
- **Email:** SPF/DKIM/DMARC, unsubscribe, physical address (see `sending-and-compliance.md`).

## 5. Admin — the Channels tab

On **Email Automation → Settings → Channels**, list every channel with a status badge
(**Configured / Not configured / Off**) and:

- provider detected? (show the existing one; else fields for **API key / secret / sender ID / number**)
- **Send test** to the admin
- an **enable/disable** toggle per channel
- a link to the provider's setup docs

Credentials are stored **encrypted** and never printed in logs. If a channel isn't configured, any
sequence using it is **blocked** and a health warning is shown.

## 6. Worker behaviour

- Scheduled rows carry a `channel`.
- Non-email channels require `hasChannelConsent` and are blocked by `isChannelSuppressed`.
- A channel error never crashes the worker (`sendVia` returns `{ ok, error }`).
- The marketing frequency cap is **cross-channel** — don't send on two channels the same day.

## 7. Data model (see `examples/data-model.md`)

- `users`: email, verified phone, push tokens.
- `channel_consent`: user_id, channel, consent, verified_at, source.
- `channel_suppressions`: user_id/channel, reason.
- `messages_sent`: channel, provider id, status.
- `channel_settings`: provider, encrypted credentials, enabled.

## 8. Opt-in prompts

See `references/opt-in-prompts.md` — prompt at the right moment, never nag, handle denial gracefully.

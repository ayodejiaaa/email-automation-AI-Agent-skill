// Channel layer: email + push + WhatsApp + SMS.
// Email is the baseline; push / WhatsApp / SMS require explicit opt-in.
// Zero deps. This is the decision logic — swap the adapters for the app's providers.

export const CHANNEL = { EMAIL: 'email', PUSH: 'push', WHATSAPP: 'whatsapp', SMS: 'sms' };

// Try a cheap, high-attention channel first, then fall back.
export const DEFAULT_PRIORITY = [CHANNEL.PUSH, CHANNEL.EMAIL, CHANNEL.WHATSAPP, CHANNEL.SMS];

/**
 * Which channels can this user actually receive, in priority order?
 * available:  provider configured AND user reachable (has a device token / phone / email)
 * consent:    explicit per-channel opt-in
 * suppressed: token invalid, hard bounce, opt-out, complaint
 */
export function resolveChannels({ priority = DEFAULT_PRIORITY, available = {}, consent = {}, suppressed = {} } = {}) {
  return priority.filter(
    (ch) => available[ch] === true && consent[ch] === true && suppressed[ch] !== true,
  );
}

/** First usable channel, or null. */
export function pickChannel(opts) {
  const usable = resolveChannels(opts);
  return usable.length ? usable[0] : null;
}

/** SMS segmentation: GSM-7 = 160 chars (153 per part); UCS-2 = 70 (67 per part). */
export function smsSegments(text) {
  const str = String(text ?? '');
  const gsm = /^[\x00-\x7F]*$/.test(str) && !/[{}[\]~|^\\]/.test(str);
  const perSingle = gsm ? 160 : 70;
  const perMulti = gsm ? 153 : 67;
  const length = [...str].length;
  const segments = length <= perSingle ? 1 : Math.ceil(length / perMulti);
  return {
    encoding: gsm ? 'GSM-7' : 'UCS-2',
    length,
    segments,
    perSegment: length <= perSingle ? perSingle : perMulti,
  };
}

/** Push payload size (bytes) and a guard (FCM/APNs payloads must stay small). */
export function pushPayloadBytes(payload) {
  return Buffer.byteLength(JSON.stringify(payload ?? {}), 'utf8');
}
export function pushPayloadFits(payload, maxBytes = 4096) {
  return pushPayloadBytes(payload) <= maxBytes;
}

/** WhatsApp: outside the 24h customer-service window you must send an approved template. */
export function whatsappNeedsTemplate({
  lastUserMessageAtMs = null,
  nowMs = Date.now(),
  windowMs = 24 * 3600 * 1000,
} = {}) {
  if (lastUserMessageAtMs == null) return true;
  return nowMs - lastUserMessageAtMs > windowMs;
}

/** Run a channel adapter safely; a channel error must never crash the worker. */
export async function sendVia(adapter, message) {
  try {
    await adapter(message);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

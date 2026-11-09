import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANNEL,
  DEFAULT_PRIORITY,
  pickChannel,
  pushPayloadBytes,
  pushPayloadFits,
  resolveChannels,
  sendVia,
  smsSegments,
  whatsappNeedsTemplate,
} from './channels.mjs';

test('resolveChannels keeps only available + consenting + non-suppressed channels, in priority order', () => {
  const usable = resolveChannels({
    available: { email: true, push: true, sms: true, whatsapp: false },
    consent: { email: true, push: false, sms: true, whatsapp: true },
    suppressed: { sms: true },
  });
  assert.deepEqual(usable, [CHANNEL.EMAIL]);
});

test('push preferred over email when both are usable', () => {
  const usable = resolveChannels({
    available: { email: true, push: true },
    consent: { email: true, push: true },
  });
  assert.deepEqual(usable, [CHANNEL.PUSH, CHANNEL.EMAIL]);
});

test('pickChannel returns null when nothing is usable', () => {
  assert.equal(pickChannel({ available: {}, consent: {} }), null);
});

test('smsSegments: GSM-7 under 160 is one segment', () => {
  const r = smsSegments('Hello, your order shipped.');
  assert.equal(r.encoding, 'GSM-7');
  assert.equal(r.segments, 1);
});

test('smsSegments: over 160 GSM-7 splits at 153', () => {
  const r = smsSegments('a'.repeat(161));
  assert.equal(r.segments, 2);
  assert.equal(r.perSegment, 153);
});

test('smsSegments: non-GSM text uses UCS-2 (70/67)', () => {
  const r = smsSegments('héllo '.repeat(20));
  assert.equal(r.encoding, 'UCS-2');
  assert.ok(r.segments >= 2);
});

test('pushPayloadFits guards payload size', () => {
  assert.equal(pushPayloadFits({ title: 'hi' }), true);
  assert.equal(pushPayloadFits({ body: 'x'.repeat(5000) }), false);
  assert.ok(pushPayloadBytes({ title: 'hi' }) > 0);
});

test('whatsappNeedsTemplate: true when no inbound message or outside 24h', () => {
  const now = 1_000_000_000;
  assert.equal(whatsappNeedsTemplate({ lastUserMessageAtMs: null, nowMs: now }), true);
  assert.equal(whatsappNeedsTemplate({ lastUserMessageAtMs: now - 25 * 3600 * 1000, nowMs: now }), true);
  assert.equal(whatsappNeedsTemplate({ lastUserMessageAtMs: now - 1 * 3600 * 1000, nowMs: now }), false);
});

test('sendVia reports success and failure without throwing', async () => {
  assert.deepEqual(await sendVia(async () => {}, {}), { ok: true });
  const failed = await sendVia(async () => { throw new Error('provider down'); }, {});
  assert.equal(failed.ok, false);
  assert.match(failed.error, /provider down/);
});

test('DEFAULT_PRIORITY puts push first and sms last', () => {
  assert.equal(DEFAULT_PRIORITY[0], CHANNEL.PUSH);
  assert.equal(DEFAULT_PRIORITY[DEFAULT_PRIORITY.length - 1], CHANNEL.SMS);
});

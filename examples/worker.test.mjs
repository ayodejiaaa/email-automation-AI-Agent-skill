import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EmailWorker,
  KIND,
  MemoryStore,
  PRIORITY,
  isWithinAllowedSendWindow,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from './worker.mjs';

// PATCH: consent is opt-in now, so the helper grants it unless a test says otherwise.
function addUser(store, id, o = {}) {
  store.setUser(id, { consentMarketing: true, ...o });
}

function setup(opts = {}) {
  const store = new MemoryStore();
  const sent = [];
  const worker = new EmailWorker({
    store,
    sendEmail: async (m) => { sent.push(m); },
    now: opts.now ?? (() => 12 * 3600 * 1000), // 12:00 UTC by default (inside the default 09–20 window)
    maxPerDay: opts.maxPerDay ?? 5,
    maxDeferrals: opts.maxDeferrals ?? 3,
    maxAttempts: opts.maxAttempts ?? 3,
    sendWindow: opts.sendWindow,
    isEligible: opts.isEligible ?? (() => true),
  });
  store.registerSequence('welcome', { kind: KIND.MARKETING, priority: PRIORITY.welcome });
  store.registerSequence('cart', { kind: KIND.MARKETING, priority: PRIORITY.cart });
  store.registerSequence('win_back', { kind: KIND.MARKETING, priority: PRIORITY.win_back });
  store.registerSequence('verify', { kind: KIND.TRANSACTIONAL, priority: 9 });
  return { store, worker, sent };
}

test('processDue is idempotent — running twice sends once', async () => {
  const { store, worker, sent } = setup();
  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  const r1 = await worker.processDue();
  const r2 = await worker.processDue();

  assert.equal(sent.length, 1);
  assert.equal(r1.sent, 1);
  assert.equal(r2.sent, 0);
});

test('stop condition cancels instead of sending (never email a buyer)', async () => {
  const { store, worker, sent } = setup({ isEligible: () => false });
  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'cart', stepDefs: [{ id: 's1', delayMinutes: 0, stopCondition: 'purchased' }], at: 0 });

  const r = await worker.processDue();
  assert.equal(sent.length, 0);
  assert.equal(r.cancelled, 1);
});

test('frequency cap defers a second marketing email in the same day', async () => {
  const { store, worker } = setup({ maxPerDay: 1 });
  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }, { id: 's2', delayMinutes: 0 }], at: 0 });

  const r = await worker.processDue();
  assert.equal(r.sent, 1);
  assert.equal(r.deferred, 1);
});

test('reaper recovers stuck rows but caps retries → failed', () => {
  const { store, worker } = setup({ maxAttempts: 2 });
  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });
  const row = [...store.rows.values()][0];

  store.claim(row.id, 0);
  assert.equal(worker.reapStuck(60_000).reaped, 1); // attempts 0 → 1
  store.claim(row.id, 0);
  assert.equal(worker.reapStuck(60_000).reaped, 1); // attempts 1 → 2
  store.claim(row.id, 0);
  assert.equal(worker.reapStuck(60_000).failed, 1); // attempts 2 >= cap → failed
  assert.equal(row.status, 'failed');
});

test('allowed send window handles normal and wrap-around hours', () => {
  assert.equal(isWithinAllowedSendWindow(12, 8, 21), true);
  assert.equal(isWithinAllowedSendWindow(23, 8, 21), false);
  assert.equal(isWithinAllowedSendWindow(2, 22, 6), true);
});

test('marketing is cancelled without consent; transactional still sends', async () => {
  const { store, worker, sent } = setup();
  addUser(store, 'u1', { email: 'u1@example.com', consentMarketing: false });

  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });
  const r1 = await worker.processDue();
  assert.equal(r1.cancelled, 1);
  assert.equal(sent.length, 0);

  worker.enroll({ userId: 'u1', enrollmentId: 'e2', sequenceKey: 'verify', stepDefs: [{ id: 'v1', delayMinutes: 0 }], at: 0 });
  const r2 = await worker.processDue();
  assert.equal(r2.sent, 1);
  assert.equal(sent.length, 1);
});

test('a suppressed (unsubscribed) user gets no marketing email', async () => {
  const { store, worker, sent } = setup();
  addUser(store, 'u1', { email: 'u1@example.com' });
  store.suppress('u1@example.com', 'unsubscribed');
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  const r = await worker.processDue();
  assert.equal(r.cancelled, 1);
  assert.equal(sent.length, 0);
});

test('holdout users receive no marketing email', async () => {
  const { store, worker, sent } = setup();
  addUser(store, 'u1', { email: 'u1@example.com' });
  const scheduled = worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0, group: 'holdout' });

  assert.equal(scheduled, 0);
  await worker.processDue();
  assert.equal(sent.length, 0);
});

test('a higher-priority marketing sequence wins; lower one is skipped/cancelled', async () => {
  const { store, worker } = setup();

  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'cart', stepDefs: [{ id: 'c1', delayMinutes: 60 }], at: 0 });
  const skipped = worker.enroll({ userId: 'u1', enrollmentId: 'e2', sequenceKey: 'win_back', stepDefs: [{ id: 'w1', delayMinutes: 60 }], at: 0 });
  assert.equal(skipped, 0);

  addUser(store, 'u2', { email: 'u2@example.com' });
  worker.enroll({ userId: 'u2', enrollmentId: 'e3', sequenceKey: 'win_back', stepDefs: [{ id: 'w2', delayMinutes: 60 }], at: 0 });
  worker.enroll({ userId: 'u2', enrollmentId: 'e4', sequenceKey: 'cart', stepDefs: [{ id: 'c2', delayMinutes: 60 }], at: 0 });

  const u2 = [...store.rows.values()].filter((r) => r.userId === 'u2');
  assert.equal(u2.find((r) => r.sequenceKey === 'win_back').status, 'cancelled');
  assert.equal(u2.find((r) => r.sequenceKey === 'cart').status, 'scheduled');
});

test('admin per-step exclusion cancels that email only', async () => {
  const { store, worker, sent } = setup();
  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'cart', stepDefs: [{ id: 's1', delayMinutes: 0 }, { id: 's2', delayMinutes: 0 }], at: 0 });
  store.excludeStep('u1', 's1');

  const r = await worker.processDue();
  assert.equal(sent.length, 1);
  const excluded = [...store.rows.values()].find((r2) => r2.stepId === 's1');
  assert.equal(excluded.status, 'cancelled');
  assert.equal(excluded.reason, 'admin-excluded');
});

test('quiet hours use the user timezone; outside window is cancelled at max deferrals', async () => {
  const { store, worker, sent } = setup({ maxDeferrals: 0 });
  // 12:00 UTC + 660 min (11h) = 23:00 local → outside 09–20
  addUser(store, 'u1', { email: 'u1@example.com', timezoneOffsetMinutes: 660 });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  const r = await worker.processDue();
  assert.equal(sent.length, 0);
  assert.equal(r.cancelled, 1);
  assert.match([...store.rows.values()][0].reason, /quiet-hours/);
});

test('repeated deferrals are capped and then cancelled', async () => {
  let clock = 12 * 3600 * 1000;
  const { store, worker } = setup({ maxPerDay: 1, maxDeferrals: 1, now: () => clock });
  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }, { id: 's2', delayMinutes: 0 }], at: 0 });

  const r1 = await worker.processDue();
  assert.equal(r1.sent, 1);
  assert.equal(r1.deferred, 1);

  clock += 2 * 3600 * 1000; // past the 1h reschedule
  const r2 = await worker.processDue();
  assert.equal(r2.cancelled, 1);
});

test('signed unsubscribe tokens verify; tampering and wrong secret are rejected', () => {
  const secret = 'a-long-enough-secret-123';
  const token = signUnsubscribeToken({ userId: 'u1', email: 'u1@example.com' }, secret);

  assert.deepEqual(verifyUnsubscribeToken(token, secret), { userId: 'u1', email: 'u1@example.com' });
  assert.equal(verifyUnsubscribeToken(`${token}x`, secret), null);
  assert.equal(verifyUnsubscribeToken(token, 'a-different-long-secret-456'), null);
  assert.equal(verifyUnsubscribeToken('garbage', secret), null);
});

test('erasing a user removes their scheduled rows and sent log', async () => {
  const { store, worker } = setup();
  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });
  await worker.processDue();
  assert.equal(store.sent.length, 1);

  store.eraseUser('u1');
  assert.equal(store.sent.length, 0);
  assert.equal([...store.rows.values()].filter((r) => r.userId === 'u1').length, 0);
  assert.equal(store.emailOf('u1'), null);
});

test('non-email channels require explicit opt-in', async () => {
  const { store, worker, sent } = setup();
  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0, channel: 'push' }], at: 0 });

  const r = await worker.processDue();
  assert.equal(r.cancelled, 1);
  assert.equal(sent.length, 0);
  assert.match([...store.rows.values()][0].reason, /no-channel-consent/);
});

test('an opted-in push step is sent on the push channel', async () => {
  const { store, worker, sent } = setup();
  addUser(store, 'u1', { email: 'u1@example.com' });
  store.setChannelConsent('u1', 'push', true);
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0, channel: 'push' }], at: 0 });

  const r = await worker.processDue();
  assert.equal(r.sent, 1);
  assert.equal(sent[0].channel, 'push');
});

test('a suppressed channel is cancelled', async () => {
  const { store, worker, sent } = setup();
  addUser(store, 'u1', { email: 'u1@example.com' });
  store.setChannelConsent('u1', 'sms', true);
  store.suppressChannel('u1', 'sms', 'opted-out');
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0, channel: 'sms' }], at: 0 });

  const r = await worker.processDue();
  assert.equal(r.cancelled, 1);
  assert.equal(sent.length, 0);
  assert.match([...store.rows.values()][0].reason, /channel-suppressed/);
});

// ───────────────────────── PATCH: tests for the hardened behaviour ─────────────────────────
import { createHmac } from 'node:crypto';
import { normalizeEmail } from './worker.mjs';

const HOUR = 3600 * 1000;
const MIN = 60 * 1000;
const SECRET = 'a-long-enough-secret-123';

test('EmailWorker refuses to start without an isEligible function (fail closed)', () => {
  assert.throws(() => new EmailWorker({ store: new MemoryStore(), sendEmail: async () => {} }), /isEligible/);
});

test('marketing consent is opt-in: a user created without it gets no marketing', async () => {
  const { store, worker, sent } = setup();
  store.setUser('u1', { email: 'u1@example.com' }); // no consentMarketing given
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  const r = await worker.processDue();
  assert.equal(r.cancelled, 1);
  assert.equal(sent.length, 0);
  assert.equal([...store.rows.values()][0].reason, 'no-consent');
});

test('default send window is 09:00–20:00, so quiet hours are 20:00–09:00', () => {
  for (const h of [9, 12, 19]) assert.equal(isWithinAllowedSendWindow(h), true, `hour ${h} should send`);
  for (const h of [20, 23, 0, 3, 8]) assert.equal(isWithinAllowedSendWindow(h), false, `hour ${h} is quiet`);
});

test('localHour is minute-accurate for half-hour and negative offsets', () => {
  const { worker } = setup();
  const at = 12 * HOUR + 40 * MIN; // 12:40 UTC
  assert.equal(worker.localHour(at, 330), 18); // 18:10 in +05:30 (the old code said 17)
  assert.equal(worker.localHour(at, -210), 9); // 09:10 in -03:30 (the old code said 8)
  assert.equal(worker.localHour(at, 0), 12);
  assert.equal(worker.localHour(30 * MIN, -60), 23); // wraps to the previous day
});

test('a +05:30 user is held back once their local time passes 20:00', async () => {
  // 14:40 UTC = 20:10 local in +05:30 → quiet. The old floor-based math read it as 19:xx and sent.
  const { store, worker, sent } = setup({ now: () => 14 * HOUR + 40 * MIN, maxDeferrals: 0 });
  addUser(store, 'u1', { email: 'u1@example.com', timezoneOffsetMinutes: 330 });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  await worker.processDue();
  assert.equal(sent.length, 0);
});

test('re-delivering the same enrollment does not duplicate emails', async () => {
  const { store, worker, sent } = setup();
  addUser(store, 'u1', { email: 'u1@example.com' });
  const args = { userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 };

  assert.equal(worker.enroll(args), 1);
  assert.equal(worker.enroll(args), 0);
  await worker.processDue();
  assert.equal(sent.length, 1);
});

test('when a batch limit applies, higher-priority rows go first', async () => {
  const { store, worker, sent } = setup();
  addUser(store, 'u1', { email: 'u1@example.com' });
  addUser(store, 'u2', { email: 'u2@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'win_back', stepDefs: [{ id: 'w', delayMinutes: 0 }], at: 0 });
  worker.enroll({ userId: 'u2', enrollmentId: 'e2', sequenceKey: 'cart', stepDefs: [{ id: 'c', delayMinutes: 0 }], at: 0 });

  await worker.processDue(1);
  assert.deepEqual(sent.map((m) => m.userId), ['u2']);
});

test('an isEligible check that throws never results in a send', async () => {
  const { store, worker, sent } = setup({ isEligible: () => { throw new Error('db down'); } });
  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'cart', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  const r = await worker.processDue();
  assert.equal(sent.length, 0);
  assert.equal(r.deferred, 1);
});

test('isEligible must return exactly true; anything else cancels', async () => {
  const { store, worker, sent } = setup({ isEligible: () => undefined });
  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'cart', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  const r = await worker.processDue();
  assert.equal(sent.length, 0);
  assert.equal(r.cancelled, 1);
});

test('transient send failures are retried, then succeed', async () => {
  let clock = 12 * HOUR;
  let calls = 0;
  const store = new MemoryStore();
  const worker = new EmailWorker({
    store,
    isEligible: () => true,
    now: () => clock,
    sendEmail: async () => { calls += 1; if (calls === 1) throw new Error('timeout'); },
    maxPerDay: 5,
  });
  store.registerSequence('welcome', { kind: KIND.MARKETING, priority: PRIORITY.welcome });
  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  const r1 = await worker.processDue();
  assert.equal(r1.failed, 0);
  assert.equal(r1.deferred, 1);

  clock += 10 * MIN;
  const r2 = await worker.processDue();
  assert.equal(r2.sent, 1);
});

test('a send that keeps failing ends as failed after maxAttempts', async () => {
  let clock = 12 * HOUR;
  const store = new MemoryStore();
  const worker = new EmailWorker({
    store,
    isEligible: () => true,
    now: () => clock,
    sendEmail: async () => { throw new Error('boom'); },
    maxAttempts: 2,
    maxPerDay: 5,
  });
  store.registerSequence('welcome', { kind: KIND.MARKETING, priority: PRIORITY.welcome });
  addUser(store, 'u1', { email: 'u1@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  await worker.processDue();
  clock += 10 * MIN;
  const r = await worker.processDue();
  assert.equal(r.failed, 1);
  assert.equal([...store.rows.values()][0].status, 'failed');
});

test('suppression ignores case and whitespace in the address', async () => {
  const { store, worker, sent } = setup();
  addUser(store, 'u1', { email: 'U1@Example.com' });
  store.suppress('  u1@example.COM ', 'unsubscribed');
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  await worker.processDue();
  assert.equal(sent.length, 0);
  assert.equal(normalizeEmail('  A@B.com '), 'a@b.com');
});

test('unsubscribe survives an email change and withdraws consent', async () => {
  const { store, worker, sent } = setup();
  addUser(store, 'u1', { email: 'old@example.com' });
  store.unsubscribe('u1', 'old@example.com');
  assert.equal(store.hasConsent('u1'), false);

  // The user later changes address; they must still not receive marketing.
  addUser(store, 'u1', { email: 'new@example.com' });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  const r = await worker.processDue();
  assert.equal(sent.length, 0); // the user-level suppression still blocks it
  assert.equal(r.cancelled, 1);
  assert.equal([...store.rows.values()][0].reason, 'suppressed');
});

test('transactional mail with no address is cancelled, not sent', async () => {
  const { store, worker, sent } = setup();
  store.setUser('u1', {}); // no email
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'verify', stepDefs: [{ id: 'v1', delayMinutes: 0 }], at: 0 });

  const r = await worker.processDue();
  assert.equal(r.cancelled, 1);
  assert.equal(sent.length, 0);
  assert.equal([...store.rows.values()][0].reason, 'no-address');
});

test('weak unsubscribe secrets are refused', () => {
  assert.throws(() => signUnsubscribeToken({ userId: 'u1', email: 'a@b.com' }, ''), /at least/);
  assert.throws(() => signUnsubscribeToken({ userId: 'u1', email: 'a@b.com' }, 'short'), /at least/);
  assert.equal(verifyUnsubscribeToken('x.y', ''), null);
});

test('unsubscribe tokens can expire', () => {
  const token = signUnsubscribeToken({ userId: 'u1', email: 'a@b.com' }, SECRET, { expiresAt: 1000 });
  assert.ok(verifyUnsubscribeToken(token, SECRET, { now: 999 }));
  assert.equal(verifyUnsubscribeToken(token, SECRET, { now: 1001 }), null);
});

test('a correctly signed token with the wrong payload shape is rejected', () => {
  const sign = (obj) => {
    const payload = Buffer.from(JSON.stringify(obj)).toString('base64url');
    return `${payload}.${createHmac('sha256', SECRET).update(payload).digest('base64url')}`;
  };
  assert.equal(verifyUnsubscribeToken(sign({ userId: 'u1' }), SECRET), null); // no email
  assert.equal(verifyUnsubscribeToken(sign({ email: 'a@b.com' }), SECRET), null); // no userId
  assert.equal(verifyUnsubscribeToken(sign([1, 2]), SECRET), null);
});

test('erasure removes channel consent, exclusions and step keys, but keeps the suppression', async () => {
  const { store, worker } = setup();
  addUser(store, 'u1', { email: 'u1@example.com' });
  store.setChannelConsent('u1', 'push', true);
  store.suppressChannel('u1', 'sms', 'opted-out');
  store.excludeStep('u1', 's1');
  store.unsubscribe('u1', 'u1@example.com');
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  store.eraseUser('u1');
  assert.equal(store.hasChannelConsent('u1', 'push'), false);
  assert.equal(store.isChannelSuppressed('u1', 'sms'), false);
  assert.equal(store.isExcluded('u1', 's1'), false);
  assert.equal(store.isUserSuppressed('u1'), false);
  assert.equal(store.isSuppressed('u1@example.com'), true); // deliberate: honour the opt-out
  // The step key is free again, so a fresh enrollment can reuse the id.
  addUser(store, 'u1', { email: 'other@example.com' });
  assert.equal(worker.enroll({ userId: 'u1', enrollmentId: 'e1', sequenceKey: 'welcome', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 }), 1);

  store.suppress('gone@example.com', 'unsubscribed');
  addUser(store, 'u9', { email: 'gone@example.com' });
  store.eraseUser('u9', { keepSuppression: false });
  assert.equal(store.isSuppressed('gone@example.com'), false);
});

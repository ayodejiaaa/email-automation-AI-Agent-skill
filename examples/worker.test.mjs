import test from 'node:test';
import assert from 'node:assert/strict';
import { EmailWorker, MemoryStore, isWithinAllowedSendWindow } from './worker.mjs';

test('processDue is idempotent — running twice sends once', async () => {
  const store = new MemoryStore();
  let calls = 0;
  const worker = new EmailWorker({ store, sendEmail: async () => { calls += 1; }, now: () => 1000 });

  worker.enroll({ userId: 'u1', enrollmentId: 'e1', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });
  const r1 = await worker.processDue();
  const r2 = await worker.processDue();

  assert.equal(calls, 1);
  assert.equal(r1.sent, 1);
  assert.equal(r2.sent, 0);
});

test('stop condition cancels instead of sending (never email a buyer)', async () => {
  const store = new MemoryStore();
  let calls = 0;
  const worker = new EmailWorker({
    store,
    sendEmail: async () => { calls += 1; },
    isEligible: () => false,
    now: () => 1000,
  });

  worker.enroll({ userId: 'u1', enrollmentId: 'e1', stepDefs: [{ id: 's1', delayMinutes: 0, stopCondition: 'purchased' }], at: 0 });
  const r = await worker.processDue();

  assert.equal(calls, 0);
  assert.equal(r.cancelled, 1);
});

test('frequency cap defers a second email in the same day', async () => {
  const store = new MemoryStore();
  let calls = 0;
  const worker = new EmailWorker({ store, sendEmail: async () => { calls += 1; }, now: () => 1000, maxPerDay: 1 });

  worker.enroll({ userId: 'u1', enrollmentId: 'e1', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });
  worker.enroll({ userId: 'u1', enrollmentId: 'e2', stepDefs: [{ id: 's2', delayMinutes: 0 }], at: 0 });

  const r = await worker.processDue();
  assert.equal(calls, 1);
  assert.equal(r.sent, 1);
  assert.equal(r.deferred, 1);
});

test('reapStuck returns crashed sending rows to scheduled', () => {
  const store = new MemoryStore();
  const worker = new EmailWorker({ store, sendEmail: async () => {}, now: () => 1_000_000 });
  worker.enroll({ userId: 'u1', enrollmentId: 'e1', stepDefs: [{ id: 's1', delayMinutes: 0 }], at: 0 });

  const row = [...store.rows.values()][0];
  store.claim(row.id, 0); // simulate a worker crashing mid-send

  const reaped = worker.reapStuck(60_000);
  assert.equal(reaped, 1);
  assert.equal(store.rows.get(row.id).status, 'scheduled');
});

test('allowed send window handles normal and wrap-around hours', () => {
  assert.equal(isWithinAllowedSendWindow(12, 8, 21), true);
  assert.equal(isWithinAllowedSendWindow(23, 8, 21), false);
  assert.equal(isWithinAllowedSendWindow(2, 22, 6), true);
});

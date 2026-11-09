// Reference implementation of the scheduler/worker core. Zero dependencies, Node ESM.
// Illustrative — swap the in-memory store for your DB (see references/reference-implementation.md
// for the SQL: SELECT ... FOR UPDATE SKIP LOCKED, reaping, batching).
//
// The point of this file is to make the *critical* logic testable:
//   - idempotency (never double-send)
//   - stop conditions (never email a buyer)
//   - frequency caps
//   - crash recovery (reaper)
//   - allowed send window

let idSeq = 0;
const nextId = () => `sched_${++idSeq}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * In-memory store implementing the worker's persistence contract.
 * A real adapter maps these methods to SQL (claim must be an atomic
 * `UPDATE ... WHERE status='scheduled'`).
 */
export class MemoryStore {
  constructor() {
    this.rows = new Map();
    this.sent = [];
  }

  insertScheduled(row) {
    this.rows.set(row.id, {
      attempts: 0,
      status: 'scheduled',
      lockedAt: null,
      ...row,
    });
  }

  dueScheduled(now, limit) {
    return [...this.rows.values()]
      .filter((r) => r.status === 'scheduled' && r.dueAt <= now)
      .slice(0, limit);
  }

  /** Atomic claim: only succeeds while still 'scheduled'. */
  claim(id, now) {
    const row = this.rows.get(id);
    if (!row || row.status !== 'scheduled') return false;
    row.status = 'sending';
    row.lockedAt = now;
    return true;
  }

  markSent(id, now) {
    const row = this.rows.get(id);
    if (!row) return;
    row.status = 'sent';
    row.sentAt = now;
    this.sent.push({ id, userId: row.userId, stepId: row.stepId, sentAt: now });
  }

  markCancelled(id, reason) {
    const row = this.rows.get(id);
    if (row) {
      row.status = 'cancelled';
      row.reason = reason;
    }
  }

  markFailed(id, error) {
    const row = this.rows.get(id);
    if (row) {
      row.status = 'failed';
      row.error = String(error);
    }
  }

  /** Return a claimed row to 'scheduled' so it is retried later. */
  reschedule(id, dueAt) {
    const row = this.rows.get(id);
    if (row && row.status === 'sending') {
      row.status = 'scheduled';
      row.lockedAt = null;
      row.dueAt = dueAt;
    }
  }

  /** Rows stuck in 'sending' longer than timeout (crash recovery). */
  stuck(now, timeoutMs) {
    return [...this.rows.values()].filter(
      (r) => r.status === 'sending' && r.lockedAt != null && now - r.lockedAt > timeoutMs,
    );
  }

  sentSince(userId, since) {
    return this.sent.filter((s) => s.userId === userId && s.sentAt >= since).length;
  }

  reaper(id) {
    const row = this.rows.get(id);
    if (row) {
      row.status = 'scheduled';
      row.lockedAt = null;
      row.attempts = (row.attempts ?? 0) + 1;
    }
  }
}

export class EmailWorker {
  constructor({
    store,
    sendEmail,
    isEligible = () => true,
    now = () => Date.now(),
    maxPerDay = 1,
    dayMs = 24 * 3600 * 1000,
  }) {
    this.store = store;
    this.sendEmail = sendEmail;
    this.isEligible = isEligible;
    this.now = now;
    this.maxPerDay = maxPerDay;
    this.dayMs = dayMs;
  }

  /** Materialise a sequence's steps into scheduled rows (due from enrolment time). */
  enroll({ userId, enrollmentId, stepDefs, at = this.now() }) {
    for (const step of stepDefs) {
      this.store.insertScheduled({
        id: nextId(),
        enrollmentId,
        stepId: step.id,
        userId,
        dueAt: at + step.delayMinutes * 60 * 1000,
        stopCondition: step.stopCondition ?? 'purchased',
      });
    }
  }

  /** Claim due rows, check stop + cap, send. Returns a report. */
  async processDue(limit = 100) {
    const report = { sent: 0, cancelled: 0, deferred: 0, failed: 0 };
    const now = this.now();

    for (const row of this.store.dueScheduled(now, limit)) {
      // Idempotency: another worker (or a previous run) may have claimed it.
      if (!this.store.claim(row.id, now)) continue;

      // Stop condition: never email a user who already converted.
      if (!this.isEligible({ userId: row.userId, stopCondition: row.stopCondition })) {
        this.store.markCancelled(row.id, `stop:${row.stopCondition}`);
        report.cancelled += 1;
        continue;
      }

      // Frequency cap: at most N marketing emails per user per day.
      if (this.store.sentSince(row.userId, now - this.dayMs) >= this.maxPerDay) {
        this.store.reschedule(row.id, now + 60 * 60 * 1000); // retry in an hour
        report.deferred += 1;
        continue;
      }

      try {
        await this.sendEmail({ userId: row.userId, stepId: row.stepId, rowId: row.id });
        this.store.markSent(row.id, now);
        report.sent += 1;
      } catch (err) {
        this.store.markFailed(row.id, err);
        report.failed += 1;
      }
    }
    return report;
  }

  /** Recover rows a crashed worker left in 'sending'. */
  reapStuck(timeoutMs = 5 * 60 * 1000) {
    const stuck = this.store.stuck(this.now(), timeoutMs);
    for (const row of stuck) this.store.reaper(row.id);
    return stuck.length;
  }
}

/**
 * Allowed send window (e.g. 08:00–21:00 local). Supports wrap-around
 * (start > end means an overnight window, e.g. 22–06). Pure + testable.
 */
export function isWithinAllowedSendWindow(hour, start = 8, end = 21) {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

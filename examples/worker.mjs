import { createHmac, timingSafeEqual } from 'node:crypto';

// Reference scheduler/worker core. Zero runtime deps (node:crypto only).
// Illustrative — swap MemoryStore for your DB (see references/reference-implementation.md
// for the SQL: SELECT ... FOR UPDATE SKIP LOCKED, reaper, batching).
//
// Encodes the behaviours that actually matter and are easy to get wrong:
//   idempotency · stop conditions · consent · holdout · precedence · exclusions ·
//   timezone-aware send window · frequency cap · retry cap · max deferral ·
//   transactional vs marketing · signed unsubscribe · erasure.

let idSeq = 0;
const nextId = () => `sched_${++idSeq}_${Math.random().toString(36).slice(2, 8)}`;

export const KIND = { MARKETING: 'marketing', TRANSACTIONAL: 'transactional' };

/** PATCH: one canonical form for email comparison. */
export const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : null);

// Lower number = higher priority (purchase wins over win-back).
export const PRIORITY = {
  purchase: 1,
  cart: 2,
  browse: 3,
  welcome: 4,
  no_login: 5,
  inactive: 6,
  win_back: 7,
};

export class MemoryStore {
  constructor() {
    this.rows = new Map();
    this.sent = [];
    this.suppressions = new Map(); // email -> reason
    this.consent = new Map(); // userId -> boolean
    this.timezones = new Map(); // userId -> UTC offset in minutes
    this.users = new Map(); // userId -> { email }
    this.exclusions = new Set(); // `${userId}:${stepId}`
    this.sequences = new Map(); // key -> { kind, priority }
    this.channelConsent = new Map(); // `${userId}:${channel}` -> boolean
    this.channelSuppressed = new Map(); // `${userId}:${channel}` -> reason
    this.userSuppressions = new Map(); // userId -> reason
    this.stepKeys = new Set(); // `${enrollmentId}:${stepId}` — enforces uniqueness
  }

  // PATCH: marketing consent is opt-in. A user has none until it is explicitly granted.
  setUser(userId, { email, timezoneOffsetMinutes = 0, consentMarketing = false }) {
    this.users.set(userId, { email });
    this.timezones.set(userId, timezoneOffsetMinutes);
    this.consent.set(userId, consentMarketing);
  }
  emailOf(userId) {
    return this.users.get(userId)?.email ?? null;
  }
  offsetOf(userId) {
    return this.timezones.get(userId) ?? 0;
  }
  setConsent(userId, value) {
    this.consent.set(userId, value);
  }
  hasConsent(userId) {
    return this.consent.get(userId) === true;
  }
  setChannelConsent(userId, channel, value) {
    this.channelConsent.set(`${userId}:${channel}`, value);
  }
  hasChannelConsent(userId, channel) {
    if (channel === 'email') return this.hasConsent(userId);
    return this.channelConsent.get(`${userId}:${channel}`) === true;
  }
  suppressChannel(userId, channel, reason) {
    this.channelSuppressed.set(`${userId}:${channel}`, reason);
  }
  isChannelSuppressed(userId, channel) {
    return this.channelSuppressed.has(`${userId}:${channel}`);
  }
  // PATCH: suppression is keyed by normalized email so "A@x.com " and "a@x.com" match.
  suppress(email, reason) {
    const key = normalizeEmail(email);
    if (key) this.suppressions.set(key, reason);
  }
  isSuppressed(email) {
    return this.suppressions.has(normalizeEmail(email));
  }
  suppressionReason(email) {
    return this.suppressions.get(normalizeEmail(email)) ?? null;
  }
  // PATCH: suppress by user id too, so an address change cannot revive an unsubscribed user.
  suppressUser(userId, reason) {
    this.userSuppressions.set(userId, reason);
  }
  isUserSuppressed(userId) {
    return this.userSuppressions.has(userId);
  }
  /** Honour an unsubscribe: suppress the address and the user, and withdraw consent. */
  unsubscribe(userId, email, reason = 'unsubscribed') {
    this.suppress(email, reason);
    this.suppress(this.emailOf(userId), reason);
    this.suppressUser(userId, reason);
    this.consent.set(userId, false);
  }
  excludeStep(userId, stepId) {
    this.exclusions.add(`${userId}:${stepId}`);
  }
  isExcluded(userId, stepId) {
    return this.exclusions.has(`${userId}:${stepId}`);
  }
  registerSequence(key, meta) {
    this.sequences.set(key, meta);
  }
  sequenceMeta(key) {
    return this.sequences.get(key) ?? { kind: KIND.MARKETING, priority: 5 };
  }

  // PATCH: mirrors a UNIQUE (enrollment_id, step_id) constraint. Returns false on a duplicate.
  insertScheduled(row) {
    if (row.enrollmentId != null) {
      const key = `${row.enrollmentId}:${row.stepId}`;
      if (this.stepKeys.has(key)) return false;
      this.stepKeys.add(key);
    }
    this.rows.set(row.id, {
      attempts: 0,
      deferrals: 0,
      status: 'scheduled',
      lockedAt: null,
      kind: KIND.MARKETING,
      group: 'treatment',
      channel: 'email',
      ...row,
    });
    return true;
  }
  // PATCH: highest priority first (lower number wins), then oldest due, so a batch limit
  // cannot starve important rows.
  dueScheduled(now, limit) {
    return [...this.rows.values()]
      .filter((r) => r.status === 'scheduled' && r.dueAt <= now)
      .sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9) || a.dueAt - b.dueAt)
      .slice(0, limit);
  }
  // PATCH: transient send failure — count the attempt and retry later.
  retry(id, dueAt) {
    const row = this.rows.get(id);
    if (row && row.status === 'sending') {
      row.status = 'scheduled';
      row.lockedAt = null;
      row.dueAt = dueAt;
      row.attempts = (row.attempts ?? 0) + 1;
    }
  }
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
    this.sent.push({
      id,
      userId: row.userId,
      stepId: row.stepId,
      sequenceKey: row.sequenceKey,
      kind: row.kind,
      channel: row.channel,
      sentAt: now,
    });
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
  reschedule(id, dueAt, { countDeferral = false } = {}) {
    const row = this.rows.get(id);
    if (row && row.status === 'sending') {
      row.status = 'scheduled';
      row.lockedAt = null;
      row.dueAt = dueAt;
      if (countDeferral) row.deferrals += 1;
    }
  }
  stuck(now, timeoutMs) {
    return [...this.rows.values()].filter(
      (r) => r.status === 'sending' && r.lockedAt != null && now - r.lockedAt > timeoutMs,
    );
  }
  sentSince(userId, since, kind) {
    return this.sent.filter(
      (s) => s.userId === userId && s.sentAt >= since && (!kind || s.kind === kind),
    ).length;
  }
  activeMarketingPriority(userId) {
    let min = null;
    for (const r of this.rows.values()) {
      if (r.userId === userId && r.kind === KIND.MARKETING && r.status === 'scheduled') {
        if (min === null || r.priority < min) min = r.priority;
      }
    }
    return min;
  }
  cancelLowerPriorityMarketing(userId, priority) {
    let n = 0;
    for (const r of this.rows.values()) {
      if (
        r.userId === userId &&
        r.status === 'scheduled' &&
        r.kind === KIND.MARKETING &&
        r.priority > priority
      ) {
        r.status = 'cancelled';
        r.reason = 'precedence';
        n += 1;
      }
    }
    return n;
  }
  reaper(id) {
    const row = this.rows.get(id);
    if (row) {
      row.status = 'scheduled';
      row.lockedAt = null;
      row.attempts = (row.attempts ?? 0) + 1;
    }
  }
  // PATCH: erase every per-user record, including channel consent, exclusions and step keys.
  // The email-keyed suppression entry is deliberately KEPT when `keepSuppression` is true
  // (default), so an erased user who unsubscribed is not re-mailed if re-imported. Document
  // that retention in your privacy policy.
  eraseUser(userId, { keepSuppression = true } = {}) {
    const email = this.emailOf(userId);
    for (const [id, r] of [...this.rows]) {
      if (r.userId === userId) {
        this.stepKeys.delete(`${r.enrollmentId}:${r.stepId}`);
        this.rows.delete(id);
      }
    }
    this.sent = this.sent.filter((s) => s.userId !== userId);
    this.users.delete(userId);
    this.consent.delete(userId);
    this.timezones.delete(userId);
    this.userSuppressions.delete(userId);
    for (const key of [...this.channelConsent.keys()]) if (key.startsWith(`${userId}:`)) this.channelConsent.delete(key);
    for (const key of [...this.channelSuppressed.keys()]) if (key.startsWith(`${userId}:`)) this.channelSuppressed.delete(key);
    for (const key of [...this.exclusions]) if (key.startsWith(`${userId}:`)) this.exclusions.delete(key);
    if (!keepSuppression && email) this.suppressions.delete(normalizeEmail(email));
  }
}

export class EmailWorker {
  constructor({
    store,
    sendEmail,
    senders, // PATCH: { marketing, transactional } — one provider per kind (see below)
    isEligible, // PATCH: required. Defaulting to "always eligible" skipped stop conditions silently.
    now = () => Date.now(),
    maxPerDay = 1,
    dayMs = 24 * 3600 * 1000,
    // PATCH: sends allowed 09:00–20:00 local; quiet hours are 20:00–09:00 (end is exclusive).
    sendWindow = { start: 9, end: 20 },
    maxAttempts = 3,
    maxDeferrals = 3,
    retryDelayMs = 5 * 60 * 1000,
  }) {
    if (typeof isEligible !== 'function') {
      throw new TypeError('EmailWorker requires an isEligible({ userId, stopCondition }) function');
    }
    // PATCH: send through ONE function (sendEmail) or one per kind (senders). With `senders`
    // there is no fallback between kinds: marketing never goes out through the transactional
    // provider (e.g. ZeptoMail forbids promotional mail), and a missing sender defers the row.
    if (typeof sendEmail !== 'function' && !senders) {
      throw new TypeError('EmailWorker requires sendEmail, or senders: { marketing, transactional }');
    }
    Object.assign(this, {
      store,
      sendEmail,
      senders,
      isEligible,
      now,
      maxPerDay,
      dayMs,
      sendWindow,
      maxAttempts,
      maxDeferrals,
      retryDelayMs,
    });
  }

  /**
   * Materialise a sequence's steps. Enforces holdout + precedence:
   * only the highest-priority marketing sequence may be active per user.
   */
  enroll({ userId, enrollmentId, sequenceKey, stepDefs, at = this.now(), group = 'treatment' }) {
    const meta = this.store.sequenceMeta(sequenceKey);

    if (meta.kind === KIND.MARKETING) {
      if (group === 'holdout') return 0; // holdout users get no marketing email
      const active = this.store.activeMarketingPriority(userId);
      if (active !== null && active < meta.priority) return 0; // a higher-priority sequence wins
      this.store.cancelLowerPriorityMarketing(userId, meta.priority);
    }

    let scheduled = 0;
    for (const step of stepDefs) {
      // PATCH: a repeated (enrollmentId, stepId) is ignored, so re-delivering an event is harmless.
      const inserted = this.store.insertScheduled({
        id: nextId(),
        enrollmentId,
        sequenceKey,
        stepId: step.id,
        userId,
        dueAt: at + step.delayMinutes * 60 * 1000,
        stopCondition: step.stopCondition ?? 'purchased',
        kind: meta.kind,
        priority: meta.priority,
        group,
        channel: step.channel ?? 'email',
      });
      if (inserted !== false) scheduled += 1;
    }
    return scheduled;
  }

  // PATCH: minute-accurate, so +05:30 / +05:45 / -03:30 offsets give the right local hour.
  localHour(nowMs, offsetMinutes) {
    const minuteOfDay = (((Math.floor(nowMs / 60_000) + offsetMinutes) % 1440) + 1440) % 1440;
    return Math.floor(minuteOfDay / 60);
  }

  async processDue(limit = 100) {
    const report = { sent: 0, cancelled: 0, deferred: 0, failed: 0 };
    const now = this.now();

    for (const row of this.store.dueScheduled(now, limit)) {
      if (!this.store.claim(row.id, now)) continue;
      const email = this.store.emailOf(row.userId);
      const channel = row.channel ?? 'email';

      // Non-email channels require explicit per-channel opt-in + are per-channel suppressed.
      if (channel !== 'email') {
        if (!this.store.hasChannelConsent(row.userId, channel)) {
          this.store.markCancelled(row.id, 'no-channel-consent');
          report.cancelled += 1;
          continue;
        }
        if (this.store.isChannelSuppressed(row.userId, channel)) {
          this.store.markCancelled(row.id, 'channel-suppressed');
          report.cancelled += 1;
          continue;
        }
      }

      if (row.kind === KIND.MARKETING) {
        if (this.store.isSuppressed(email) || this.store.isUserSuppressed(row.userId)) {
          this.store.markCancelled(row.id, 'suppressed');
          report.cancelled += 1;
          continue;
        }
        if (!this.store.hasConsent(row.userId)) {
          this.store.markCancelled(row.id, 'no-consent');
          report.cancelled += 1;
          continue;
        }
        if (row.group === 'holdout') {
          this.store.markCancelled(row.id, 'holdout');
          report.cancelled += 1;
          continue;
        }
      } else {
        // PATCH: nothing to send to.
        if (channel === 'email' && !email) {
          this.store.markCancelled(row.id, 'no-address');
          report.cancelled += 1;
          continue;
        }
        // Transactional bypasses marketing consent/suppression, but not undeliverable addresses.
        const reason = this.store.suppressionReason(email);
        if (reason === 'hard_bounce' || reason === 'complaint') {
          this.store.markCancelled(row.id, 'undeliverable');
          report.cancelled += 1;
          continue;
        }
      }

      // Admin excluded this user from this specific email.
      if (this.store.isExcluded(row.userId, row.stepId)) {
        this.store.markCancelled(row.id, 'admin-excluded');
        report.cancelled += 1;
        continue;
      }

      // Stop condition: never email a user who already converted.
      // PATCH: if the check itself throws we cannot prove the user still qualifies, so we do
      // not send. The row is deferred (and cancelled once deferrals run out).
      let eligible;
      try {
        eligible = await this.isEligible({ userId: row.userId, stopCondition: row.stopCondition });
      } catch {
        this.deferOrCancel(row, now, 'eligibility-error', report);
        continue;
      }
      if (eligible !== true) {
        this.store.markCancelled(row.id, `stop:${row.stopCondition}`);
        report.cancelled += 1;
        continue;
      }

      // Frequency cap (marketing only).
      if (
        row.kind === KIND.MARKETING &&
        this.store.sentSince(row.userId, now - this.dayMs, KIND.MARKETING) >= this.maxPerDay
      ) {
        this.deferOrCancel(row, now, 'frequency-cap', report);
        continue;
      }

      // Quiet hours in the USER's timezone.
      const localHour = this.localHour(now, this.store.offsetOf(row.userId));
      if (!isWithinAllowedSendWindow(localHour, this.sendWindow.start, this.sendWindow.end)) {
        this.deferOrCancel(row, now, 'quiet-hours', report);
        continue;
      }

      // PATCH: no provider for this kind (e.g. no marketing sender) → defer, then cancel. Never
      // fall back to the other kind's provider.
      const send = this.senderFor(row.kind);
      if (!send) {
        this.deferOrCancel(row, now, `no-sender:${row.kind}`, report);
        continue;
      }

      try {
        await send({ userId: row.userId, stepId: row.stepId, kind: row.kind, channel, rowId: row.id });
        this.store.markSent(row.id, now);
        report.sent += 1;
      } catch (err) {
        // PATCH: retry transient failures with linear backoff; fail only when attempts run out.
        // Providers should use `rowId` as an idempotency key so a retry cannot double-send.
        if ((row.attempts ?? 0) + 1 < this.maxAttempts) {
          this.store.retry(row.id, now + this.retryDelayMs * ((row.attempts ?? 0) + 1));
          report.deferred += 1;
        } else {
          this.store.markFailed(row.id, err);
          report.failed += 1;
        }
      }
    }
    return report;
  }

  /** PATCH: the send function for a kind; `senders` wins over the single `sendEmail`. */
  senderFor(kind) {
    if (this.senders) return typeof this.senders[kind] === 'function' ? this.senders[kind] : null;
    return this.sendEmail;
  }

  deferOrCancel(row, now, reason, report) {
    if ((row.deferrals ?? 0) >= this.maxDeferrals) {
      this.store.markCancelled(row.id, `max-deferrals:${reason}`);
      report.cancelled += 1;
    } else {
      this.store.reschedule(row.id, now + 60 * 60 * 1000, { countDeferral: true });
      report.deferred += 1;
    }
  }

  /** Recover rows a crashed worker left in 'sending'; cap retries. */
  reapStuck(timeoutMs = 5 * 60 * 1000) {
    const result = { reaped: 0, failed: 0 };
    for (const row of this.store.stuck(this.now(), timeoutMs)) {
      if ((row.attempts ?? 0) >= this.maxAttempts) {
        this.store.markFailed(row.id, 'max-attempts');
        result.failed += 1;
      } else {
        this.store.reaper(row.id);
        result.reaped += 1;
      }
    }
    return result;
  }
}

/**
 * Allowed SEND window, e.g. 09:00–20:00 means sends are allowed from 09:00 up to (not including)
 * 20:00, so QUIET hours are 20:00–09:00. Supports wrap-around (start > end).
 */
export function isWithinAllowedSendWindow(hour, start = 9, end = 20) {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

/** Signed, unguessable unsubscribe token (HMAC-SHA256). */
// PATCH: reject weak secrets, support an optional expiry, and keep the payload minimal.
// NOTE the payload is signed, not encrypted: anyone holding the link can read it.
const MIN_SECRET_LENGTH = 16;
export function signUnsubscribeToken({ userId, email }, secret, { expiresAt } = {}) {
  if (typeof secret !== 'string' || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`unsubscribe secret must be a string of at least ${MIN_SECRET_LENGTH} characters`);
  }
  const body = { userId, email };
  if (expiresAt != null) body.exp = expiresAt;
  const payload = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** Verify an unsubscribe token; returns the payload or null. */
export function verifyUnsubscribeToken(token, secret, { now = Date.now() } = {}) {
  if (typeof secret !== 'string' || secret.length < MIN_SECRET_LENGTH) return null;
  const raw = String(token ?? '');
  const idx = raw.lastIndexOf('.');
  if (idx <= 0) return null;
  const payload = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    // PATCH: validate the shape and honour expiry; never trust a parsed payload blindly.
    if (!data || typeof data !== 'object') return null;
    if (data.userId == null || typeof data.email !== 'string') return null;
    if (data.exp != null && !(typeof data.exp === 'number' && data.exp > now)) return null;
    return data;
  } catch {
    return null;
  }
}

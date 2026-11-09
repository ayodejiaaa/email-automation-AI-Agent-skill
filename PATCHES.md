# Patches to examples/worker.mjs

Based on davepartner/email-automation-AI-Agent-skill @ 25fe8ce. Search the code for `PATCH:`.

| # | Original behaviour | Patched behaviour |
|---|---|---|
| 1 | `isEligible` defaulted to `() => true` | Required; the constructor throws without it. Must return exactly `true`. A throw defers the row, never sends. |
| 2 | `consentMarketing` defaulted to `true` | Defaults to `false` (opt-in). |
| 3 | Send window 08:00–21:00 | 09:00–20:00 (quiet hours 20:00–09:00). End hour is exclusive. |
| 4 | `localHour` dropped the minutes of the offset | Minute-accurate (+05:30, +05:45, -03:30). |
| 5 | Duplicate `(enrollmentId, stepId)` inserted twice | Ignored, like a UNIQUE constraint. `enroll()` returns the count actually inserted. |
| 6 | Batch limit ignored priority | Sorted by priority, then due time. |
| 7 | A send error marked the row failed at once | Retried with linear backoff until `maxAttempts`, then failed. |
| 8 | Suppression keyed by raw email | Normalized email plus user id. `store.unsubscribe()` does both and withdraws consent. |
| 9 | Transactional row with no address was attempted | Cancelled with reason `no-address`. |
| 10 | Unsubscribe token: any secret, no expiry, payload unchecked | Secret must be 16+ chars, optional `expiresAt`, payload shape validated. Still signed, not encrypted. |
| 11 | `eraseUser` left channel consent, exclusions | Clears them. Keeps the email suppression unless `keepSuppression: false`. |

Not fixed (needs a real database): atomic claiming with `FOR UPDATE SKIP LOCKED`, a true UNIQUE
constraint, at-least-once delivery. Pass `rowId` to your email provider as an idempotency key.
Marketing consent is still one flag shared across channels; push, SMS and WhatsApp also need their
own opt-in, as the original already requires.

# Health Checks & Warnings

The Email Automation page must **tell the admin immediately why emails aren't going out**. Show
prominent banners at the top of every tab, with a one-line reason, an expandable **"how to fix"**, and
action buttons. Re-check on load, every 60s, and on a manual "Re-check".

Order of priority: **no transport → scheduler down → paused.**

---

## 1. No email transport configured (critical)

**Detect:** the app has no usable mail connection — no SMTP host/credentials and no provider API key
(SendGrid, Mailgun, Postmark, SES, Resend). Check the app's mail config/env, not the automation tables
(this system reuses the app's connection).

**Banner:**

> 🛑 **No email sending is configured.** Reminders can't be delivered until the app has an email
> connection. [Configure] [Send test email]

**How to fix (explain in-app):**
- This section **reuses the app's existing email setup** — it doesn't add a second connection.
- Set one of:
  - SMTP: `MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`,
    `MAIL_ENCRYPTION`.
  - Provider API key: `SENDGRID_API_KEY`, `MAILGUN_API_KEY` + `MAILGUN_DOMAIN`, `POSTMARK_TOKEN`,
    `RESEND_API_KEY`, etc.
- Or fill the app's built-in **mail settings** page (link it).
- Then click **Send test email** to confirm.

**Do:** never store email secrets in the automation tables; read the app's config. (Only credentials for a
new push/SMS/WhatsApp provider are stored, encrypted at rest.) Never send if this check
fails.

---

## 2. Scheduler / cron not running (critical)

**Detect (heartbeat):** the scheduler writes `email_settings.last_cron_run_at = now()` on every run.
If it is missing or `now - last_cron_run_at > 10 minutes` (configurable), the scheduler is not running.

**Banner:**

> 🛑 **The email scheduler hasn't run in {duration}.** Emails are queued but **not being sent**.
> [Why?] [Run now] [Copy cron command]

**Detailed "why" (expand):** the scheduler is the cron/queue job that picks up due emails every minute.
It may not be running because:
- **No cron entry** on the server.
- **Scheduler/queue worker isn't started** (or was stopped after a crash/deploy/OOM).
- **Wrong server clock/timezone.**
- **Permissions** — the cron user can't run the command.
- **Queue backlog** (if the app uses a queue) — worker not consuming.

**Ways to fix it (show the exact command for the detected stack):**

| Stack | Command / fix |
|-------|---------------|
| Laravel | `* * * * * cd /path && php artisan schedule:run >> /dev/null 2>&1`; register the job in `schedule()`; if queued, run `php artisan queue:work` (or supervisor) |
| Symfony | `* * * * * php /path/bin/console app:email-tick` |
| Node/Express | `* * * * * cd /app && node scripts/email-worker.js`, or `node-cron` in-process, or a platform cron |
| Rails | `* * * * * cd /app && bin/rails runner "EmailTicker.tick"`, or Sidekiq + a scheduler |
| Django | `* * * * * python manage.py email_tick`, or Celery beat |
| Platform (Render/Fly/Vercel) | use the platform's **Cron Jobs** feature with the tick command |

Also: a **"Test now"** button runs the tick once (and updates the heartbeat). A **"Copy command"**
button copies the right cron line. If the app uses a queue, surface **queue depth** too.

---

## 3. Automation paused (warning)

**Detect:** `email_settings.master_enabled = false`.

**Banner:**

> ⚠️ **Email Automation is paused.** No emails are being sent. [Review sequences] [Turn on]

This is intentional by default (the system ships paused) — show it as a **warning**, not an error, and
link straight to the toggle.

---

## 4. A channel isn't configured (warning)

If a sequence uses push / SMS / WhatsApp but there's no provider or credentials, show:
*"Push reminders are paused — no provider configured."* → link to **Settings → Channels**. Show the
status per channel (Configured / Not configured / Off). Existing providers are reused automatically;
missing ones need credentials.

## Banner component (consistent)

- **Icon + short title + one-line reason.**
- **Expandable "How to fix"** with copy-able commands and a link to the relevant settings.
- **Action buttons** (e.g. Configure, Send test, Run now, Turn on).
- **Re-check** button + auto-refresh every 60s.
- **Accessible:** `role="alert"` for critical, `role="status"` for warnings; keyboard reachable.

## Hand-off

When the admin fixes an issue, the banner clears on the next re-check. The **"Send test email"** and
**"Test now"** buttons double as the verification step. Document each fix in the hand-off notes so the
admin knows where their cron and mail settings live.

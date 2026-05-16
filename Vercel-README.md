# Digital Raghav — Vercel Migration Bundle

This archive contains everything you need to migrate the Digital Raghav bot from Railway to Vercel Hobby (free).

## Start here

1. Read `docs/MIGRATION.md` first — the full step-by-step.
2. Then read `docs/ROLLBACK.md` so you know what to do if anything breaks.
3. Then read `CHECKLIST.md` — printable, tick boxes as you go.

## What you're getting

### New Vercel-specific files
- `vercel.json` — project config, function timeouts
- `package.json` — drops express + node-cron, otherwise same deps as V1.1
- `.env.example` — checklist of env vars to set in Vercel dashboard
- `api/` — six new route files (whatsapp, tick, garmin-poll, brief, nudge, dashboard) plus sub-routes for config and audit
- `lib/tickAuth.js` — bearer-token check for cron endpoints
- `lib/scheduler.js` — pure tick logic (no node-cron)

### What you bring from V1.1

All your existing `src/*.js` files go into `lib/`. Plus the V1.2 admin add-on files (from the earlier `digital-raghav-v1.2-whatsapp-addon.zip`):

- `configStore.js`, `auditLog.js`, `garmin.js`, `garminTriggers.js`, `undo.js`, `adminNLParser.js`, `handlers/admin.js`

## Current state

Railway is **off** (free trial expired). Madhav is **safe on his pillbox + paper Rx**. We're starting from a clean "off" state and turning the bot back on via Vercel — there's no live cutover to manage. This is actually less stressful than a hot migration.

## Cost

$0/month on Vercel Hobby. The only paid dependency you keep is Twilio (per-message), and that's unchanged from before. cron-job.org is free.

## Critical files you must not skip

These are non-obvious things that make this migration safe:

| File | Why it matters |
|---|---|
| `lib/tickAuth.js` | Without this, anyone with your tick URL can DoS your Vercel function quota |
| `docs/ROLLBACK.md` | What to do when (not if) something breaks |
| `.env.example` | Order of env vars matters; missing one means silent failures |

## Estimated time

| Step | Time |
|---|---|
| Repo setup + file shuffle | 30 min |
| Vercel project + env vars | 20 min |
| First deploy | 10 min |
| cron-job.org setup | 10 min |
| Smoke tests | 30 min |
| Twilio webhook cutover | 5 min |
| Self-test with WhatsApp | 15 min |
| **Total focused time** | **~2 hours** |

Plus 48 hours of passive monitoring after cutover.

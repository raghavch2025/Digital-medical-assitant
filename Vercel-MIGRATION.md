# Digital Raghav — Vercel Migration Guide

**Current state:** Railway bot is off (free trial expired). Madhav is safe on physical pillbox + paper prescription. No urgency window — we can do this right.

**Goal:** Stand up the full bot on Vercel Hobby (free), test thoroughly, point Twilio at it. Total cost: $0/month going forward.

**Time:** 4–6 hours focused work today.

## Order of operations

1. Madhav stays on pillbox routine (confirmed — your earlier answer)
2. Build the Vercel deploy in parallel, test against your OWN WhatsApp number first
3. Once happy, point Twilio webhook at Vercel
4. Send Madhav a "bot is back" message yourself
5. Watch for 48 hours, fix anything that misfires
6. Done — Railway stays off forever

Because the bot is already down, **there's no cutover risk window.** You're starting from "off" and turning it back "on" via Vercel. This is less stressful than a live migration.

## Why this architecture

Railway runs your code as one long-lived Node process. Vercel runs each API route as a short-lived serverless function. That changes three things:

| Concern | Railway (was) | Vercel (now) |
|---|---|---|
| Web server | Express app, always running | Serverless functions per route |
| Scheduler | `node-cron` ticks inside the process | **cron-job.org** hits `/api/tick` every minute |
| Bootstrap | `await bootstrap()` once on start | Top of every tick (idempotent + cached) |

Business logic (parser, nudge, audit, admin) is **unchanged**. Only routing + scheduler trigger change.

### One new external dependency: cron-job.org

Vercel Hobby cron only runs once per day. Medication reminders need per-minute granularity. cron-job.org is free, reliable, and emails you when your endpoint stops responding. To eliminate this dependency later, upgrade to Vercel Pro ($20/mo) for built-in per-minute cron.

## Architecture

```
                  ┌─────────────────────────────────────┐
                  │  Twilio (WhatsApp)                  │
                  └──────────────┬──────────────────────┘
                                 │ webhook POST
                                 ▼
                  ┌─────────────────────────────────────┐
                  │  Vercel — Hobby tier (free)         │
                  │                                     │
                  │  /api/whatsapp     Twilio webhook   │
                  │  /api/tick         scheduler        │
                  │  /api/garmin-poll  daily pull       │
                  │  /api/brief        on-demand brief  │
                  │  /api/nudge        manual send      │
                  │  /api/dashboard    read-only viewer │
                  └──────────────┬──────────────────────┘
                                 │ reads/writes
                                 ▼
                  ┌─────────────────────────────────────┐
                  │  Google Sheets (state)              │
                  └─────────────────────────────────────┘

         ┌─────────────────────────────────────────────┐
         │  cron-job.org (free external pinger)        │
         │  Every 1 min  → POST /api/tick              │
         │  Daily 06:00  → POST /api/garmin-poll       │
         └─────────────────────────────────────────────┘
```

## Files in this archive

### New (Vercel-specific)

```
api/
├── whatsapp.js      Twilio webhook (replaces old Express /whatsapp route)
├── tick.js          per-minute scheduler (replaces node-cron)
├── garmin-poll.js   daily Garmin pull
├── brief.js         on-demand /brief and /status
├── nudge.js         manual nudge endpoint
└── dashboard.js     read-only dashboard
lib/
├── tickAuth.js      bearer-token check for cron endpoints
└── scheduler.js     pure tick logic (extracted from old scheduler.js)
vercel.json
package.json         (replaces V1.1's)
.env.example
```

### Files you copy from V1.1 (into `lib/`)

```
lib/
├── parser.js              (with V1.2 patch from previous drop)
├── parser.llm.js
├── briefGenerator.js
├── claudeClient.js
├── nudge.js
├── whatsapp.js
├── sheets.js              (with V1.2 replaceTab() addition)
├── alerts.js
├── config.js
└── handlers/
    ├── (your existing handlers/*)
    └── admin.js           (V1.2 addition)
```

Plus V1.2 additions:
```
lib/
├── configStore.js
├── auditLog.js
├── garmin.js
├── garminTriggers.js
├── undo.js
└── adminNLParser.js
```

### NOT carried over

- `src/index.js` (old Express app) — replaced by per-route Vercel functions
- `src/scheduler.js` (node-cron driver) — replaced by `lib/scheduler.js` + `api/tick.js`

## Step-by-step

### 1. Create the Vercel project (10 min)

```bash
git clone <your-existing-repo> digital-raghav-vercel
cd digital-raghav-vercel
git checkout -b vercel-migration

# Copy this archive on top
# Delete src/index.js and src/scheduler.js (no longer needed)
# Move existing src/*.js into lib/
```

### 2. Generate TICK_SECRET (1 min)

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
# Save the output — you'll paste it into Vercel env vars and cron-job.org headers
```

### 3. First deploy (5 min)

```bash
npm install -g vercel
vercel login
vercel        # creates project, gives you a URL
```

It'll be broken on first deploy (no env vars). Expected.

### 4. Set env vars in Vercel (10 min)

Project → Settings → Environment Variables. Add for **Production**, **Preview**, **Development**:

| Variable | Notes |
|---|---|
| `ANTHROPIC_API_KEY` | from Anthropic console |
| `TWILIO_ACCOUNT_SID` | from Twilio console |
| `TWILIO_AUTH_TOKEN` | from Twilio console |
| `TWILIO_WHATSAPP_FROM` | e.g. `whatsapp:+14155238886` (your old Railway env had this) |
| `GOOGLE_SHEET_ID` | from old Railway env |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | the full JSON, single-line string |
| `RAGHAV_WHATSAPP` | `whatsapp:+91...` |
| `MADHAV_WHATSAPP` | `whatsapp:+91...` |
| `DASHBOARD_TOKEN` | same as old |
| `TICK_SECRET` | the one you just generated |
| `TZ` | `Asia/Kolkata` |
| `GARMIN_ENABLED` | `false` |

Then: `vercel --prod` to redeploy with these vars.

### 5. Set up cron-job.org (5 min)

1. Sign up at https://cron-job.org (free, no credit card)
2. Create **Job 1: tick**
   - URL: `https://YOUR-VERCEL-URL/api/tick`
   - Method: POST
   - Schedule: every 1 minute
   - Headers: `Authorization: Bearer YOUR_TICK_SECRET`
   - Timeout: 30 seconds
   - Notifications: enable email on failure
3. Create **Job 2: garmin-poll**
   - URL: `https://YOUR-VERCEL-URL/api/garmin-poll`
   - Method: POST
   - Schedule: daily at 06:00 Asia/Kolkata
   - Headers: `Authorization: Bearer YOUR_TICK_SECRET`

### 6. Smoke tests (15 min)

Twilio is still NOT pointed at Vercel at this stage.

```bash
export VURL="https://YOUR-VERCEL-URL"
export TS="YOUR_TICK_SECRET"
export DT="YOUR_DASHBOARD_TOKEN"

# Tick alive
curl -X POST -H "Authorization: Bearer $TS" $VURL/api/tick
# Expect: {"ok":true,...}

# Bad auth rejected
curl -X POST -H "Authorization: Bearer wrong" $VURL/api/tick
# Expect: 401

# Brief works
curl "$VURL/api/brief?key=$DT"

# Dashboard loads in browser
open "$VURL/api/dashboard?key=$DT"

# Config endpoints
curl "$VURL/api/config/schedule?key=$DT"
```

Watch cron-job.org for 30 minutes. All ticks should return 200. **Don't proceed until stable.**

### 7. Twilio cutover (5 min)

Twilio Console → Phone Numbers → Manage → your WhatsApp sender → Messaging:
- "When a message comes in" webhook → `https://YOUR-VERCEL-URL/api/whatsapp`
- Method: HTTP POST
- Save

### 8. Verify with yourself (10 min)

From your own phone, send the bot:
- `/help` → reply with admin commands
- `/schedule` → current schedule
- `/say test from raghav` → sends to Madhav
- `/audit` → shows the nudge

Any failure → check Vercel logs, fix before step 9.

### 9. Tell Bhaiya (1 min)

```
hey, the bot's back. reminders resume from this evening.
keep the pillbox handy anyway.
```

### 10. Monitor 48 hours

Watch: Vercel logs, cron-job.org history, the Sheet, Madhav's experience.

### 11. Done

After 48h stable:
- Delete the Railway project
- Update README to say "deployed on Vercel"

## TICK_SECRET safety

`/api/tick` and `/api/garmin-poll` only check `Authorization: Bearer ...`. If TICK_SECRET leaks, attacker can DoS by hammering these endpoints (eats your Vercel function quota). They cannot send WhatsApp messages from those routes — that requires the dashboard token.

**If leaked:** regenerate → update Vercel env → update cron-job.org header. Auto-redeploys on env save.

## Known limitations vs Railway

| Capability | Railway | Vercel | Impact |
|---|---|---|---|
| Tick precision | exact | ±30s drift | Acceptable for med reminders |
| 60s config cache | Across requests | Within single tick only | Slightly more Sheets reads |
| Long tasks | No limit | 60s Hobby / 300s Pro | All tasks <10s |
| Cold starts | None | ~500ms occasionally | Negligible at human scale |

## If something goes wrong

See `ROLLBACK.md`. Short: **revert Twilio webhook URL**, bot stops responding, Madhav stays on pillbox. Zero medical risk.

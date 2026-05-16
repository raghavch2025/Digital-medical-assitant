# Migration Checklist

Tick each box as you go. Total focused time: ~2 hours.

## Phase 1 — Local setup (30 min)

- [ ] Clone existing repo into new directory: `digital-raghav-vercel`
- [ ] Create branch: `git checkout -b vercel-migration`
- [ ] Copy this archive's contents over the top
- [ ] Move existing `src/*.js` files to `lib/`
- [ ] Delete `src/index.js` and `src/scheduler.js` (no longer needed)
- [ ] Verify file structure: `api/`, `lib/`, `lib/handlers/`, `vercel.json`, `package.json`
- [ ] Run `npm install` (drops express, node-cron; everything else stays)
- [ ] Run `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` and save the output as `TICK_SECRET`

## Phase 2 — Vercel project (20 min)

- [ ] `npm install -g vercel` (if not installed)
- [ ] `vercel login`
- [ ] `vercel` (first deploy, will be broken — expected)
- [ ] Note the project URL (something like `digital-raghav-vercel-abc123.vercel.app`)
- [ ] In Vercel dashboard → Project → Settings → Environment Variables, add:
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `TWILIO_ACCOUNT_SID`
  - [ ] `TWILIO_AUTH_TOKEN`
  - [ ] `TWILIO_WHATSAPP_FROM`
  - [ ] `GOOGLE_SHEET_ID`
  - [ ] `GOOGLE_SERVICE_ACCOUNT_JSON` (paste as single-line string)
  - [ ] `RAGHAV_WHATSAPP`
  - [ ] `MADHAV_WHATSAPP`
  - [ ] `DASHBOARD_TOKEN`
  - [ ] `TICK_SECRET` (the one you generated)
  - [ ] `TZ` = `Asia/Kolkata`
  - [ ] `GARMIN_ENABLED` = `false`
- [ ] All three scopes ticked: Production, Preview, Development
- [ ] `vercel --prod` to redeploy with env vars

## Phase 3 — cron-job.org setup (10 min)

- [ ] Sign up at https://cron-job.org
- [ ] **Job 1: tick**
  - [ ] URL: `https://YOUR-VERCEL-URL/api/tick`
  - [ ] Method: POST
  - [ ] Schedule: every 1 minute
  - [ ] Header: `Authorization: Bearer YOUR_TICK_SECRET`
  - [ ] Timeout: 30 seconds
  - [ ] Email notifications on failure: ON
- [ ] **Job 2: garmin-poll**
  - [ ] URL: `https://YOUR-VERCEL-URL/api/garmin-poll`
  - [ ] Method: POST
  - [ ] Schedule: every day at 06:00 Asia/Kolkata
  - [ ] Same header
- [ ] Both jobs saved and **enabled**

## Phase 4 — Smoke tests (30 min)

Run these from your laptop. **Twilio is still pointed at Railway (or off).**

```bash
export VURL="https://YOUR-VERCEL-URL"
export TS="YOUR_TICK_SECRET"
export DT="YOUR_DASHBOARD_TOKEN"
```

- [ ] `curl -X POST -H "Authorization: Bearer $TS" $VURL/api/tick` returns 200
- [ ] `curl -X POST -H "Authorization: Bearer wrong" $VURL/api/tick` returns 401
- [ ] `curl "$VURL/api/brief?key=$DT"` returns brief text
- [ ] `curl "$VURL/api/config/schedule?key=$DT"` returns JSON of current schedule
- [ ] Open `$VURL/api/dashboard?key=$DT` in browser, loads ok
- [ ] Watch cron-job.org for 30 min — all minute-ticks return 200
- [ ] No 500s in Vercel function logs

If any of these fail: fix before proceeding. Do not point Twilio at a broken bot.

## Phase 5 — Twilio cutover (5 min)

- [ ] Twilio Console → Phone Numbers → Manage → your WhatsApp sender
- [ ] Messaging → "When a message comes in" webhook
- [ ] Change to: `https://YOUR-VERCEL-URL/api/whatsapp`
- [ ] Method: HTTP POST
- [ ] Save

## Phase 6 — Self-test (15 min)

From your own phone, send to the bot:

- [ ] `/help` → replies with admin commands list
- [ ] `/schedule` → shows current med schedule
- [ ] `/thresholds` → shows alert thresholds
- [ ] `/say test from raghav` → Madhav receives it (check his phone)
- [ ] `/audit` → shows the nudge you just sent
- [ ] Wait for the next scheduled med time, verify Madhav receives the reminder

If any fail: check Vercel function logs, fix, retry. **Do not proceed to step 7 with broken commands.**

## Phase 7 — Tell Bhaiya (1 min)

- [ ] Send Bhaiya: "hey, the bot's back up. reminders resume from this evening. keep the pillbox handy anyway."

## Phase 8 — Monitor (48 hours, passive)

- [ ] Hour 1: Vercel logs show normal traffic
- [ ] Hour 6: cron-job.org history all green
- [ ] Hour 24: ask Madhav casually if reminders feel normal
- [ ] Hour 48: check the Sheet — BP, mood, meds rows being added daily
- [ ] No surprise emails from cron-job.org

## Phase 9 — Decommission Railway (10 min)

- [ ] Save Railway env vars to your password manager (insurance)
- [ ] Download Railway logs from last 30 days (insurance)
- [ ] Delete the Railway project
- [ ] Confirm card not auto-billed for next cycle

## Phase 10 — Done

- [ ] Update repo README to say "deployed on Vercel"
- [ ] Update any personal notes about deployment
- [ ] Tell yourself well done

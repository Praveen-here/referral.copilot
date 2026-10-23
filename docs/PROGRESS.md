# Progress
_Last updated: 2026-10-23. Keep this file short; replace, don't append._

## Status
Live at https://referral-copilot.onrender.com (Render, auto-deploys from `main`). Used for real outreach. Database = Neon `production` branch (fresh: earlier data on the deleted `dev` branch was lost 2026-10-21; user re-adding jobs).

## Done
- Google login; profile (college, degree, semester, fit line, skills, resume link, sign-off)
- Jobs: add by URL (Greenhouse/Lever auto-fill; LinkedIn → paste JD, no auto job ID) or manual; AI job analysis
- Discovery: Serper plain-keyword queries (alumni-heavy) → verify → AI classify → research-based ranking → top 15 + 10 reserves; "no alumni found" card → LinkedIn paste
- LinkedIn page paste (company People page / college-filtered / search results), verified, "1st" ⇒ connected
- Pipeline tabs with one-click statuses, undo, optimistic updates, "sent?" prompt on tab return, reserve promotion
- AI-written messages in the user's reference style (Gemini → fallback models → Groq → template), Rewrite (shorter/warmer/formal/fresh), recruiter intro
- Paste a reply → outcome, suggested status, drafted answer
- Today page, invite budget (15/day, 100/week), Ctrl+K people search with inline "Accepted", sample data
- Mobile: bottom tab bar, `/companies`, bottom sheets, 16px inputs, safe areas; logo/favicon
- Early job alerts (2026-10-24): `/openings` page + Today section; ~88 seed boards over 7 feed types, boards auto-added from job URLs and debugwithshubham apply links; New/Intern/Entry filters; one click → job + discovery; hide with undo
- Docs: CLAUDE.md + `docs/` (architecture, development, decisions, API, preferences, research, roadmap)

## In progress
- Accuracy check on real jobs (target ≥12/15 correct); tune from user feedback
- Better Stack uptime monitor on `/healthz` (unverified whether set up)

## Known issues
- Undoing WRONG_PERSON/SKIP doesn't demote the reserve that was promoted
- Closing a job sets JOB_CLOSED via bulk update without event rows
- Discovery runs in-process: a restart mid-run leaves it RUNNING up to 5 min
- Careers pages embedding Greenhouse via `?gh_jid=` aren't auto-read
- Existing drafts keep old wording until the user clicks Rewrite
- Gemini free tier: main model's daily quota can run out (fallback models/Groq cover it)
- Serper key exposed in chat 2026-10-20; rotation unverified

## Next
1. Openings follow-ups: outside cron (cron-job.org → `/api/cron/openings`, set `CRON_SECRET` on Render) so scans run while the app is closed; Keka/Zoho readers; paste-a-hiring-post + scam check; funded-startup tracker (`docs/research/reports/`)
2. Warm-up step / founder targeting / "ping the hiring manager" line (ROADMAP)
3. Fix known issues; periodic DB export
4. Settings page, data export/delete, analytics

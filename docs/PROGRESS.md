# Progress
_Last updated: 2026-10-26. Keep this file short; replace, don't append._

## Status
Live at https://referral-copilot.onrender.com (Render, auto-deploys from `main`). Used for real outreach. Database = Neon `production` branch (fresh: earlier data on the deleted `dev` branch was lost 2026-10-21; user re-adding jobs). Last push: board finder + 10 boards + intern/apprentice/grad filter (2026-10-26).

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
- **Openings / early job alerts (2026-10-24)**: `/openings` page (New / Interns / Entry level / All, "Check now") + "New openings" on Today + sidebar link; one click "Find people" → job + discovery; hide with undo. 7 feed readers (Greenhouse, Lever, Ashby, SmartRecruiters, Workday, amazon.jobs, debugwithshubham.com). 123 boards watched at launch (88 seed + 35 auto-added from aggregator apply links; 98 seed after 2026-10-25); first scans found ~440 open India tech roles, ~78 intern, ~76 entry. "New" counts only intern/entry.
- **Scans while the app is closed**: cron-job.org job "Referral Copilot scan" calls `GET /api/cron/openings` every 2 h (UTC schedule) with `x-cron-key`; `CRON_SECRET` set on Render; test run returned 202 `{"scanning":true}` (2026-10-24).
- **Board finder (2026-10-25)**: `services/board-finder.ts` finds a company's Workday/Greenhouse/Lever/Ashby board via `site:` search, keeps it only if tenant/slug matches the company and the feed answers (DECISIONS #23). One run over the research CSV added 10 seed boards (Micron, Broadcom, Cisco, Walmart Global Tech, Wells Fargo, Expedia, Visa, Emergent, Paytm Payments). Intern/apprentice/grad programs whose title names no field are now kept unless they name a business function (Walmart "(IND) Grad Intern - No Work Experience"); Workday and Amazon readers also search "apprentice". intern-list.com reverse-engineered: Jobright's US-only index in Airtable, nothing for India.
- Research (2026-10-24, `docs/research/reports/`): where Indian tech interns are posted (+ 204-company CSV), which channels lead to offers (referrals ≫ cold email > contests > posts), Reddit/LinkedIn/X findings; debugwithshubham.com reverse-engineered (DECISIONS #21)
- Docs: CLAUDE.md + `docs/` (architecture, development, decisions, API, preferences, research, roadmap)

## In progress
- Accuracy check on real jobs (target ≥12/15 correct); tune from user feedback
- User checking the Openings page in the browser (not yet viewed by Claude: needs Google login)

## Known issues
- Undoing WRONG_PERSON/SKIP doesn't demote the reserve that was promoted
- Closing a job sets JOB_CLOSED via bulk update without event rows
- Discovery runs in-process: a restart mid-run leaves it RUNNING up to 5 min
- Careers pages embedding Greenhouse via `?gh_jid=` aren't auto-read (also not watched as boards)
- Existing drafts keep old wording until the user clicks Rewrite
- Gemini free tier: main model's daily quota can run out (fallback models/Groq cover it)
- Serper key exposed in chat 2026-10-20; rotation unverified
- Openings: Workday gives only relative dates ("Posted 30+ Days Ago" → approximate); Workday/Amazon/big SmartRecruiters boards are searched, not fully listed, so their roles are never marked closed; a posting's title/location isn't refreshed after first seen; "UNSPECIFIED" level (no level in title) is 496 of 745 open openings and includes many experienced roles (fix: ROADMAP "Description check"); feed readers have no unit tests (filters in `core/postings.ts` do); Lever `aprio` 404s (auto-deactivates after 3 failed scans)

## Next
1. Description check for openings (ROADMAP, proposed 2026-10-25; waiting for user go-ahead)
2. Paste-a-hiring-post (LinkedIn/X post → job, poster as top contact) + scam check (ROADMAP, research report "Social channels")
3. Funded-startup tracker from news RSS (Inc42 `/buzz/feed/`, Entrackr `/rss`, YourStory, ET Tech)
4. Warm-up step, founder email path for small startups, contact source tagging (ROADMAP)
5. More feed readers: Zoho Recruit (has RSS: Zoho, Coditas, Innefu), Keka, Rippling, Recruitee; hiring contests list. Optional: run the board finder when the user adds a job whose company has no watched board (needs a `BoardOrigin` value + migration; ~1–3 Serper searches per new company)
6. Undecided by user: read job-alert emails (LinkedIn/Internshala/Naukri) via read-only Gmail
7. Fix known issues; periodic DB export; settings page, data export/delete, analytics

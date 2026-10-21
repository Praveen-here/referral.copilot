# Progress
_Last updated: 2026-10-21. Keep this file short; replace, don't append._

## Status
Usable locally for real outreach. Not deployed. Discovery works against live Serper results; accuracy on real jobs not yet measured.

## Done
- Google login, profile (college, degree, semester, fit line, resume link)
- Jobs: add by URL (Greenhouse/Lever auto-fill; LinkedIn job ID parsed) or manual; AI job analysis
- Discovery: top 15 + 10 reserves with match score and reasons; wrong-person → reserve promotion
- Pipeline tabs with one-click statuses, undo, optimistic updates, "sent?" prompt on tab return
- AI-written drafts (Gemini → fallback models → Groq → template) with Rewrite (shorter/warmer/formal/fresh); recruiter-specific intro
- Paste a reply: AI reads it, suggests the status, drafts the answer
- LinkedIn page paste (company People page / filtered for college / search results), verified like web results
- Research-based ranking (mid-level and early-career first); "no alumni found" guidance
- Today page (computed reminders), invite budget bar, sample data, Ctrl+K people search with inline "Accepted"
- Mobile layout: bottom tab bar (Today · Companies · + · Search · Profile), `/companies` list, bottom sheets, 16px inputs, safe areas
- Logo and favicon; repo on GitHub (`Praveen-here/referral.copilot`, branch `main`)

## In progress
- Deploying to Render (single service) + Better Stack uptime monitor
- Accuracy check: run discovery on 3–5 real jobs, target ≥12/15 correct, tune queries/weights from user feedback

## Known issues
- Undoing WRONG_PERSON/SKIP doesn't demote the reserve that was promoted
- Closing a job sets JOB_CLOSED via bulk update without event rows
- Discovery runs in-process: a server restart mid-run leaves it RUNNING for up to 5 min before retry is allowed
- Company careers pages that embed Greenhouse via `?gh_jid=` aren't auto-read
- Serper key was exposed in a chat log on 2026-10-20; confirm it was rotated (unverified)

## Next (plan order)
1. Tune discovery from real-job feedback (LinkedIn paste now available for alumni)
2. Fix small known issues above
3. Data export / account delete, settings page (caps, weights)
4. Analytics (acceptance/reply/referral rates, alumni vs non-alumni)
5. E2E tests in repo, Sentry, deployment

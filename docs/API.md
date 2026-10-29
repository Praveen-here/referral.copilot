# API map

Express, all under `/api/v1` (session required, scoped to `res.locals.userId`), routes in `apps/api/src/routes/v1.ts`. Auth (Better Auth) at `/api/auth/*`. Health: `/healthz` on both the web (Render health check) and the API. Errors: `{error:{code,message,details,requestId}}`.

| Method & path | Purpose | Service |
|---|---|---|
| GET `/me` | User, profile, college, onboarded flag | routes |
| PUT `/me/profile` | Save profile (college → `education`, fit line → `projects[0].oneLiner`, sign-off → `settings`) | routes |
| GET `/sidebar` | Active companies + `attentionCount` = messages waiting to be sent (referral requests + drafted answers) (also the phone Companies page) | views |
| GET `/today` | Messages ready (same rule as the badge), follow-ups, reply/acceptance checks, cleanup + invite budget (the Today page shows only messages ready + cleanup) | views |
| GET `/invite-budget` | Requests sent today/week vs caps (15/100) | views |
| GET `/search?q=` | People by name across all jobs (Ctrl+K) | routes |
| GET / DELETE `/companies/:id` | Company with jobs / delete (cascades) | views |
| POST `/jobs` | Create job (+ background AI analysis) | routes → jobs |
| GET `/openings` | India intern/entry tech openings from job feeds, newest first; starts a scan if the last is >2 h old | openings |
| POST `/openings/scan` | "Check now" (no-op if scanned <10 min ago) | openings |
| POST `/openings/:id/add` | Opening → job + start discovery; returns `{jobId, companyId}` | openings |
| POST / DELETE `/openings/:id/dismiss` | Hide an opening / undo | openings |
| POST `/jobs/read-url` | Read a Greenhouse/Lever posting; LinkedIn → `needsPaste` | jobs |
| GET / PATCH / DELETE `/jobs/:id` | Job detail with people, counts / edit (title/JD edit clears analysis; CLOSED cascades) / delete | views |
| POST `/jobs/:id/discover` | Start discovery run (async) | discovery |
| GET `/jobs/:id/discovery` | Latest run + `searchConfigured` | discovery |
| POST `/jobs/:id/paste-people` `{text, source}` | People from a copied LinkedIn page; `source` = COMPANY_PEOPLE / COMPANY_PEOPLE_COLLEGE / SEARCH | discovery |
| POST `/jobs/:id/people` | Add one person manually | people |
| POST `/outreach/:id/events` `{type, expectedVersion}` | Any pipeline change (REQUEST_SENT, ACCEPTED, MESSAGE_SENT, REPLIED, …) | outreach |
| POST `/outreach/:id/undo` | Undo last event (2-min window) | outreach |
| POST `/outreach/:id/drafts` `{template, writer?}` | Get/write a draft (REFERRAL_REQUEST, FOLLOW_UP_1/2, RESUME_SHARE, THANK_YOU, THANKS_ANYWAY, REPLY_RESPONSE); `writer: "template"` skips the AI (used for follow-up nudges) | messages |
| GET `/outreach/:id/messages` | Chat thread: `{person, messages}` (sent messages, pasted replies, open draft; oldest first) | replies + views |
| POST `/outreach/:id/messages` `{text}` | "I sent something else": log the user's own message, discard the unsent draft, MESSAGE_SENT if in conversation (204) | replies |
| POST `/outreach/:id/reply` `{text}` | Read a pasted reply → outcome, suggested event, drafted answer | replies |
| PATCH `/messages/:id` | Edit a draft (dashes stripped) | routes |
| POST `/messages/:id/rewrite` `{style}` | AI rewrite: shorter / warmer / formal / fresh | messages |
| POST `/messages/:id/sent` · `/discard` | Mark a non-state draft sent / discard | routes |
| POST / DELETE `/sample-data` | Fictional demo company (dev only for POST) | sample |

Outside `/api/v1`: GET/POST `/api/cron/openings` with header `x-cron-key: $CRON_SECRET` (or `?key=`) starts a scan if the last is >30 min old; 404 when `CRON_SECRET` is unset.

Web pages (`apps/web/app`): `/login`, `/` (Today, with a "New openings" section), `/openings`, `/companies` (list, used on phones), `/companies/[id]?job=&tab=&person=` (job pipeline; `person` scrolls+highlights), `/profile`, `/healthz`, `/manifest.webmanifest` (from `app/manifest.ts`: standalone home-screen app, icons in `public/icons/`).
Key components: `app-shell` (sidebar/tab bar + search + new-job sheets), `person-row`, `message-card`, `chat-sheet`, `paste-people-sheet`, `discovery-panel`, `search-palette`, `feedback` (toast + "sent?" prompt).

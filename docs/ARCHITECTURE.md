# Architecture

## Shape
```
Browser ──▶ Next.js :3000 (UI) ──/api/* rewrite──▶ Express :4000 ──▶ Neon Postgres
                                                     ├──▶ Gemini (fallback Groq)
                                                     └──▶ Serper (Google search)
```
Modular monolith: one API process, no queue/worker, no Redis. Background work (discovery, analysis) runs in-process; reminders are computed from timestamps when a page loads.

## Components
| Component | Responsibility |
|---|---|
| `apps/web` | Client-rendered pages (`(app)/` = authed area: Today, company page, profile; `login/`). Data via TanStack Query with refetch-on-focus. Key UI units: `person-row` (per-stage one-click actions), `message-card` (draft + "Copy & open LinkedIn"), `discovery-panel`, `search-palette` (Ctrl+K), `feedback` (single undo toast + "did you send it?" prompt on tab return) |
| `apps/api` routes | REST under `/api/v1`, Zod-validated, `requireUser` middleware sets `res.locals.userId`. Errors: `{error:{code,message,details,requestId}}` |
| `services/outreach` | `applyEvent`: transition + optimistic-lock (`version`) + event log + auto-drafts; `undoLastEvent` (2 min window); reserve promotion |
| `services/discovery` | Discovery run: analyze job → plan queries → search → verify → classify (AI) → score → save top 15 + 10 reserves. Progress on `discovery_run` row; UI polls |
| `services/openings` + `feeds` | Early job alerts: reads public job feeds (`feeds.ts`), diffs IDs against `job_posting`, lists openings, turns one into a job. Scan on open (>2 h) or via `/api/cron/openings`; seed boards in `openings-seed.ts`; `board-finder.ts` finds missing boards by search (one-off script `src/scripts/find-boards.ts`); filters in `core/postings.ts` |
| `services/jobs` | Job posting reader (Greenhouse/Lever public APIs; LinkedIn URLs → "paste the JD", never fetched) and `ensureAnalysis` (AI, with rule fallback) |
| `services/messages` | `generateDraft`: facts → Gemini writes → code checks → one corrective retry → template fallback; Rewrite styles; in-flight dedupe |
| `services/replies` | `readReply`: AI classifies a pasted reply → suggested event + outcome-specific draft (thank-you / resume / answer) |
| `services/discovery` (paste) | `addPastedPeople`: AI extracts people from a copied LinkedIn page, every value must appear verbatim, then the same verify/rank/save as web results |
| `services/views` | Read models: sidebar, job detail, Today, invite budget |
| `packages/core` | All decision logic (pure, unit-tested) |
| `packages/ai` | `runTask`: JSON-schema output → Zod validate → one repair retry → next provider |

## Data model (Prisma, `packages/db/prisma/schema.prisma`)
- Auth tables owned by Better Auth: `user`, `session`, `account`, `verification`.
- `user_profile` (degree, semester, skills, `projects[0].oneLiner` = fit reason used in messages, `settings` JSON: signOffName, invite caps, weights) + `education` (shared by user and contacts; alumni = school match).
- `company` (per user) → `job_opportunity` (`analysis` JSON from AI) → `outreach` (one per contact×job; `state`, `nextCheckAt`, `rank`, `isReserve`, `matchScore`, `scoreBreakdown`, `version`).
- `contact` (unique per user+LinkedIn URL; `evidence`, `confidence`), `contact_tag` (COLLEGE_ALUMNI, RECRUITER, …).
- `outreach_event` (append-only log; payload.prev enables undo), `message` (DRAFT/SENT/DISCARDED), `discovery_run`, `ai_run` (every AI attempt logged).

## Key flows
- **Auth**: Google OAuth via Better Auth on Express at `/api/auth/*` (proxied, so cookies are first-party on :3000). Redirect URI `http://localhost:3000/api/auth/callback/google`. Session cookie cached 5 min to skip DB lookups. Web guards the `(app)` layout client-side.
- **Pipeline**: DISCOVERED → CONNECTION_SENT → ACCEPTED_MESSAGE_READY → AWAITING_REPLY ⇄ IN_CONVERSATION → REFERRAL_RECEIVED / DECLINED / NO_RESPONSE (+ SKIPPED, WRONG_PERSON, DROPPED, JOB_CLOSED, STOPPED). Accepting creates the referral draft; outcomes create resume/thank-you drafts. Follow-up due at day 5, max 2. Checks at +3d (acceptance), +2d/+5d (reply).
- **Discovery**: plain-keyword queries (alumni+role, alumni+company, role+city ×2, recruiters ×2, referral) → Serper → `parseProfileResult` reads Google's `Name - Title - Company | LinkedIn` + `Experience: · Education: · Location:` → `verifyCandidate` (current employer, former-employee and look-alike company rejection, school only from source) → AI classify seniority/function/relevance (rules fallback) → `scoreCandidate` (alumni 40, relevance 20, seniority 10, …; intern ×0.4, unrelated ×0.75) → `selectTop`.
- **Messages**: the message card asks `/outreach/:id/drafts`; the server AI-writes from a facts-only sheet (recipient, role, company, city, real job ID via `companyJobId`, link, shared college only if tagged, user's degree/semester/fit line/matching skills/resume) using the user's preferred shape (`docs/PREFERENCES.md`). Checks: no dashes/stock phrases/boasting, greeting, company named, link present, no job ID unless real, no implied shared college for non-alumni, sender is a student. Recruiters get an intro (no referral ask). Templates (`core/messages/templates.ts`) are the fallback; outcome replies (resume/thank-you) may start as templates.
- **Replies**: user pastes their reply → `readReply` → outcome + suggested event (user confirms) + drafted answer.
- **LinkedIn paste**: user copies a People page; `source` decides what's trusted (company page ⇒ employer; college-filtered ⇒ alumni, opt-in); "1st" badge ⇒ connected; ex-employees and "LinkedIn Member" dropped.

## External services
| Service | Use | Notes |
|---|---|---|
| Neon Postgres | All data | Pooled URL for app, direct URL for migrations; scale-to-zero |
| Google OAuth | Sign-in | Testing mode, only test users can log in |
| Gemini API | Job analysis, classification, message writing, reply reading, page parsing | `gemini-3.5-flash`, thinking minimal/low; on 429 tries `GEMINI_MODEL_FALLBACKS` (per-model free quotas) before Groq |
| Groq | Fallback LLM | `openai/gpt-oss-120b` |
| Serper | People search | Free plan: no quotes/`site:`/`OR`, 10 results/query |
| Public job feeds | Openings | Greenhouse, Lever, Ashby, SmartRecruiters, Workday CXS, amazon.jobs, debugwithshubham.com; no keys; see DECISIONS #19–21 |

## Deployment
Live at https://referral-copilot.onrender.com: one Render free web service running both processes (Next public on `$PORT`, Express internal on `API_PORT`, same `/api` rewrite as local), auto-deploys on push to `main`. Better Stack monitors `/healthz` (no DB) to keep it awake. cron-job.org calls `/api/cron/openings` every 2 h so job feeds are scanned while the app is closed. Database: Neon project `referral-copilot` (`billowing-waterfall-82246403`), single branch **`production`**, shared by local dev and Render. Setup → `docs/DEVELOPMENT.md`.

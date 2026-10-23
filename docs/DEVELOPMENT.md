# Development

## Setup
1. Node 22, pnpm 12 (`packageManager` in root `package.json`). Dev machine is Windows (Git Bash + PowerShell).
2. `pnpm install` (build scripts allowed via `allowBuilds` in `pnpm-workspace.yaml`).
3. Copy `.env.example` → `.env` at repo root and fill values (see table).
4. `pnpm db:generate` then `pnpm db:migrate` (applies to the DB in `DIRECT_URL`).
5. `npm run dev` → http://localhost:3000

## Commands
| Task | Command |
|---|---|
| Run web + api | `npm run dev` (root; concurrently + npm, see Gotchas) |
| Unit tests | `pnpm test` (Vitest in `packages/core`, `packages/ai`) |
| Single package | `pnpm --filter @rc/core test`, `pnpm --filter @rc/web typecheck` |
| Typecheck all | `pnpm typecheck` |
| Lint | `pnpm --filter @rc/web lint` (ESLint, web only). No formatter configured |
| Build web | `pnpm --filter @rc/web build` (API runs via `tsx`, no build step) |
| New migration | edit `packages/db/prisma/schema.prisma` → `pnpm db:migrate` (prompts for a name) |
| Regenerate client | `pnpm db:generate` (output `packages/db/generated/`, git-ignored) |
| DB browser | `pnpm db:studio` |

No browser/E2E tests in the repo yet (earlier ad-hoc Playwright runs used a DB-created test session and lived outside the repo).

## Environment (`.env`, repo root; names only)
| Var | Meaning |
|---|---|
| `DATABASE_URL` | Neon **pooled** URL (host has `-pooler`), used by the app |
| `DIRECT_URL` | Neon direct URL, used by Prisma CLI for migrations |
| `BETTER_AUTH_SECRET` | ≥32 chars random; signs sessions |
| `BETTER_AUTH_URL` | Public origin of the web app (`http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth web client; redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google` |
| `GEMINI_API_KEY`, `GROQ_API_KEY` | LLM providers (optional; app falls back to rules) |
| `GEMINI_MODEL_FAST`, `GEMINI_MODEL_QUALITY`, `GROQ_MODEL` | Optional model overrides (defaults in `apps/api/src/env.ts`) |
| `GEMINI_MODEL_FALLBACKS` | Comma list tried on Gemini quota errors (default `gemini-flash-lite-latest,gemini-3.5-flash-lite`) |
| `SERPER_API_KEY` (or `TAVILY_API_KEY`) | People search; without it the UI shows a setup card |
| `CRON_SECRET` (optional, 16+ chars) | Enables `/api/cron/openings` so an outside scheduler can scan job feeds while the app is closed |
| `API_PORT` | Internal API port, default 4000 (`PORT` is reserved for the public web server) |
| `API_URL` | (web) where `/api` is proxied, default `http://localhost:4000` |

## Deployment (Render, single free web service, https://referral-copilot.onrender.com)
- Render settings: Build `bash scripts/render-build.sh` · Start `npm start` · Health check `/healthz` · Region Singapore · Auto-deploy on `main`.
- Google OAuth client has both `http://localhost:3000` and the Render origin (+ `/api/auth/callback/google`) registered.
- Web and API run in **one** service (`npm start` → concurrently: API on `API_PORT`, Next on Render's `PORT`). The free plan has 750 instance-hours/month per workspace; one always-on service ≈ 744 h.
- Build command: `bash scripts/render-build.sh` (install → prisma generate → `migrate deploy` → next build). It runs pnpm via `npx pnpm@<packageManager version>` because Render's pnpm is read-only and `corepack enable` fails there (EROFS); bundled corepack also can't run pnpm 12. Start command: `npm start`. Do **not** set `NODE_ENV` on Render (pnpm would skip devDependencies needed for the build); the start scripts set production mode.
- Node version from `.node-version` (22, bundles corepack). Health check `/healthz` (web route, no DB access). Better Stack pings it every 3 min to prevent spin-down.
- Google OAuth client needs the Render origin and `<origin>/api/auth/callback/google`; `BETTER_AUTH_URL` = Render origin.

`apps/api/src/env.ts` validates on start and prints only variable names on failure. Neon: one branch, `production`, used by both local and Render (there is no dev branch any more; the old `dev` branch and its data were lost on 2026-10-21). Paste URLs into Render **without quotes** (the code now strips them anyway). A P1000 "authentication failed" means the Neon password changed: copy fresh strings from Neon → Connect into `.env` and Render.

## Openings scans (job feeds)
- In the app: `GET /api/v1/openings` starts a background scan when the last one is over 2 h old ("Check now" = 10 min). A full scan of ~123 boards takes 1–1.5 min.
- While the app is closed: cron-job.org (user's free account) job **Referral Copilot scan** → `GET https://referral-copilot.onrender.com/api/cron/openings`, every 2 hours (`0 */2 * * *`, UTC), header `x-cron-key: <CRON_SECRET>`, "Save responses in job history" on. Expected response: 202 `{"scanning":true}` (or `false` if a scan ran <30 min ago); 404 = secret mismatch or deploy not live.
- `CRON_SECRET` is set on Render only (not needed locally). To change it, update Render **and** the cron-job.org header.
- Run a scan by hand locally: a throwaway tsx script that imports `./env` then calls `scanOpenings()` from `services/openings` (writes only to `job_board`/`job_posting`).

## Safe migrations (one shared production DB)
There is no dev database, so `prisma migrate dev` is risky (it can offer to reset the DB on drift). Instead:
1. Edit `schema.prisma`, save the old one: `git show HEAD:packages/db/prisma/schema.prisma > old.prisma`.
2. `npx prisma migrate diff --from-schema old.prisma --to-schema prisma/schema.prisma --script > prisma/migrations/<timestamp>_<name>/migration.sql`, then delete the dotenv line ("◇ injected env…") it writes at the top.
3. Read the SQL: additive only unless the user approved otherwise. Ask before applying.
4. `npx prisma migrate deploy` (never resets) and `npx prisma generate`. Render's build also runs `migrate deploy`.

## Conventions
- Logic goes in `packages/core` as pure functions with tests; API services do IO and transactions.
- Prompts are versioned (`packages/ai/src/prompts/*`, `promptVersion`); bump on behavior change.
- Model names only via env/config, never hard-coded in business code.
- Comments explain *why*; match surrounding style; Zod at every route boundary.
- Commits end with the Claude co-author trailer when made by Claude; scan staged files for secrets before pushing.

## Gotchas
- `npm run dev` uses `concurrently`: on this machine pnpm 12 cannot spawn `pnpm` inside scripts.
- `apps/api/src/server.ts` must import `./env` first (loads `.env` before `@rc/db` reads it).
- Prisma 7: config in `packages/db/prisma.config.ts`, client generated into `generated/`, driver adapter required; transaction timeouts raised to 10s/20s for Neon latency.
- Port 3000 busy → a previous dev server is still running; stop that node process.
- `apps/web/AGENTS.md` is regenerated by `next dev`; Next 16 has breaking changes, so check `node_modules/next/dist/docs/` before using unfamiliar Next APIs.
- Serper free plan rejects quoted/`site:`/`OR` queries (HTTP 400 "Query pattern not allowed").

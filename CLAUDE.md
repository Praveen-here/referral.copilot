# Referral Copilot

Personal referral CRM for a student job hunt. Paste a job → the app finds the ~15 employees most likely to refer you (alumni first), drafts the outreach, and tracks each person through connect → accepted → message → reply → referral. **All LinkedIn actions stay manual** (user clicks Connect/Send); the app does research, ranking, drafting and tracking.

## Stack
pnpm monorepo, TypeScript everywhere · **web**: Next.js 16 (App Router), React 19, Tailwind 4, TanStack Query, motion · **api**: Express 5, Better Auth (Google only) · **db**: PostgreSQL on Neon via Prisma 7 (`@prisma/adapter-pg`) · **AI**: Gemini primary, Groq fallback · **search**: Serper (Google results) · tests: Vitest.

## Layout
| Path | Contents |
|---|---|
| `apps/web` | UI. Browser only talks to `:3000`; Next rewrites `/api/*` → Express |
| `apps/api` | Express routes (`src/routes/v1.ts`), services (`src/services/*`), env validation (`src/env.ts`) |
| `packages/core` | **Pure** domain logic, no IO: outreach state machine + schedule, discovery (query plan, result parsing/verification, scoring), message templates + validator, alumni matching |
| `packages/ai` | LLM provider abstraction, `runTask` (schema validation, repair, fallback), versioned prompts |
| `packages/db` | Prisma schema, migrations, client export |
| `docs/` | See doc map below |

## Commands (run from repo root)
- `npm run dev`: api :4000 + web :3000 (uses concurrently+npm because pnpm 12 can't call pnpm inside scripts on this machine)
- `pnpm test` (core + ai unit tests) · `pnpm typecheck` · `pnpm db:migrate` · `pnpm db:generate`
- Details, env vars and setup → `docs/DEVELOPMENT.md`

## Rules
- For any UI work, use the **apple-design skill**. Look: light theme, flat, premium, Notion-like; whitespace, system font, quiet colors, few clicks; respond on press; springs; respect reduced motion. Design tokens live in `apps/web/app/globals.css`; reuse them.
- **Never** add code that makes network requests to linkedin.com or automates LinkedIn (scraping, clicking, sending). Opening a LinkedIn URL in the user's own browser tab is fine. The API's job-posting reader only fetches Greenhouse/Lever APIs.
- Secrets live in `.env` (repo root, git-ignored). **Never read, print or commit values.** When inspecting `.env`, print variable names only.
- Generated messages must contain no em/en dashes, no stock AI phrases, and only verified facts (`packages/core/src/messages/validate.ts`).
- Every DB query is scoped by `userId`. Pipeline state changes go through `transition()` (core) + `applyEvent()` (api), never raw state writes.
- Neon round trips are ~150 ms: batch writes, avoid per-row queries in loops, no polling workers.

## Invariants worth knowing
- State machine (`packages/core/src/outreach/machine.ts`) is the source of truth for pipeline state; UI updates optimistically using the same function.
- Discovery never invents people or schools: candidates must come from a real search result showing the company in the Experience field or title (`discovery/verify.ts`).
- Interns are never referral targets; max 3 recruiters in a top 15.

## Doc map (read only when relevant)
- Architecture, data flow, components → `docs/ARCHITECTURE.md`
- Setup, commands, env vars, migrations → `docs/DEVELOPMENT.md`
- Why things are the way they are → `docs/DECISIONS.md`
- Current status, known issues, next tasks → `docs/PROGRESS.md`
- Original product spec and research (long, partly superseded; use for product questions only) → `docs/IMPLEMENTATION_PLAN.md`

# User preferences (how Praveen wants things done)

## Working style
- Explain things **in simple terms**, step by step, for setup tasks (no assumed DevOps knowledge).
- **Push to GitHub only when the user says "push".** Commit and push in one go then; scan staged files for secrets first.
- Back product decisions with **research** (Reddit, Blind, Quora, forums, "what experienced people say"), cite sources.
- Test in a real browser (Playwright, sample data, desktop + iPhone size) and check screenshots before handing over; stop any dev servers you started.
- Never print secrets; when checking `.env` show names/structure only.
- Wants **maximum coverage** of openings ("grab almost all the opportunity"): don't limit to a few sites because of our own earlier rules, but stay within legal/terms limits (no LinkedIn automation, no logins or bot-check bypass, no sites whose terms ban crawling).
- Never ask for or accept the user's LinkedIn/Reddit passwords; use official APIs, Google results, or user pastes.
- Don't spend the user's **Serper credits** on research (they're shared with daily discovery); use Claude's own web search.
- **Database: never modify or delete existing data.** Migrations must be additive; show the SQL and ask before applying (user approved this way 2026-10-24).
- Alerts **in the app only** for now (no email alerts).
- Explain results simply; when sharing research, give the key numbers and what it means for the app.

## Product
- LinkedIn stays manual (user clicks Connect/Send); everything else as automated as possible.
- The most important part is **finding the right people** accurately; alumni first.
- UI: Apple-design skill, light, flat, premium, Notion-like, few clicks; must work as well on **mobile** as desktop.
- Invite caps: 15/day, **100/week** (user's choice).

## Message style (user's reference, 2026-10-21)
- Shape: `Hi <name>,` → "Hope you're doing well! I'm a fellow <college> student currently pursuing my <degree>" (non-alumni: "I'm currently pursuing my <degree> at <college>") → "I came across the <role> opening at **<company>** in <city>" → `Job ID: <id>` line **only if it's the company's real ID** → "Would you be open to referring me for this role? I'd be happy to share my resume." → "Here's the job link: <url>" → `Thanks,` / name.
- Always name the company. Never quote LinkedIn's posting number as a job ID. Never say the student is an "alumnus".
- Shorter than the user's reference (~55–90 words). No em dashes, no boasting ("strong fit"), no invented coursework/projects.
- Reference message the user liked (HPE, for tone):
  > Hi Amit, Hope you're doing well! I'm a fellow PESU student currently pursuing my MCA, and I came across these two HPE internship openings in Bengaluru: College Intern — Job ID: 1211844 … Would you be open to referring me for either of these roles? I'd be happy to share my resume and the job links.

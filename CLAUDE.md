# Referral Copilot

The full plan is in `docs/IMPLEMENTATION_PLAN.md`. Read it before you make architectural changes.

- For any UI work, use the apple-design skill. The look should be light theme, flat, premium and Notion-like: lots of whitespace, the system font, quiet colors and few clicks.
- Never add code that makes network requests to linkedin.com or automates LinkedIn actions (see the plan, section 12).
- Secrets live in `.env`, which is never committed and never read or printed in output.

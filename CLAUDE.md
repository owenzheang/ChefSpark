# Claude Code entry point

Before making any ChefSpark change, read:

1. `README.md`
2. `AGENTS.md`
3. `RULES.md`
4. `PROJECT_CONTEXT.md`
5. `PROJECT_ROADMAP.md`
6. `PROJECT_HANDOVER.md`

Treat `PROJECT_CONTEXT.md` as current product truth, `PROJECT_ROADMAP.md` as the approved roadmap, and `PROJECT_HANDOVER.md` as the immediate continuation point. The two `SMARTKITCHEN_*_v1.md` files are historical references, not active requirements.

Inspect relevant source and tests before assuming documentation remains current. Prefer minimal, focused changes and preserve the approved React/Vite/vanilla-CSS, Express, and SQLite stack.

For OpenAI image work, first read `server/ZINE_POC.md` or `server/ZINE_ASSETS_POC.md` as applicable. These are developer-only tools: never make a paid request without explicit user authorization, never expose them as public endpoints, and never expose or commit secrets.

Explain significant architectural decisions before implementing them. Preserve unrelated working-tree changes.

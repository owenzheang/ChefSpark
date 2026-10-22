# Claude Code entry point

Before making any ChefSpark change, read:

1. `README.md`
2. `AGENTS.md`
3. `RULES.md`
4. `PROJECT_CONTEXT.md`
5. `PROJECT_ROADMAP.md`
6. `PROJECT_HANDOVER.md`
7. `DESIGN_SYSTEM.md` (for UI work)

Treat `PROJECT_CONTEXT.md` as current product truth, `PROJECT_ROADMAP.md` as the approved roadmap, and `PROJECT_HANDOVER.md` as the immediate continuation point. The two `SMARTKITCHEN_*_v1.md` files are historical references, not active requirements.

Inspect relevant source and tests before assuming documentation remains current. Prefer minimal, focused changes and preserve the approved stack in `RULES.md`: React, Vite, Tailwind CSS (approved 2026-10-22), Express, SQLite and server-side DeepSeek.

The One-Page Zine and its AI artwork are paused behind feature switches. For any OpenAI image work, first read `server/ZINE_POC.md` or `server/ZINE_ASSETS_POC.md`. Never make a paid request without explicit user authorization, never expose developer tools as public endpoints, and never expose or commit secrets.

Explain significant architectural decisions before implementing them. Preserve unrelated working-tree changes.

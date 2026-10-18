# ChefSpark agent instructions

Before changing ChefSpark, read in this order:

1. `README.md`
2. `AGENTS.md`
3. `RULES.md`
4. `PROJECT_CONTEXT.md`
5. `PROJECT_ROADMAP.md`
6. `PROJECT_HANDOVER.md`

Treat `PROJECT_CONTEXT.md` as current product truth, `PROJECT_ROADMAP.md` as the approved sequence, and `PROJECT_HANDOVER.md` as the immediate continuation point. `SMARTKITCHEN_Workflow_v1.md` and `SMARTKITCHEN_Technical_Design_v1.md` are historical references only.

Keep work focused, beginner-friendly, and within the approved React/Vite/vanilla-CSS, Express, SQLite stack. Inspect relevant source before relying on prose. Preserve unrelated or pre-existing working-tree changes.

Before touching image tooling, also read the relevant file in `server/`:

- `ZINE_POC.md` for Phase 6A.
- `ZINE_ASSETS_POC.md` for Phase 6B.2.

Never expose secrets, commit `.env` files, create a public generation endpoint, or make a paid API request without explicit user authorization. Explain significant architectural choices before implementing them.

# ChefSpark agent instructions

Before changing ChefSpark, read in this order:

1. `README.md`
2. `AGENTS.md`
3. `RULES.md`
4. `PROJECT_CONTEXT.md`
5. `PROJECT_ROADMAP.md`
6. `PROJECT_HANDOVER.md`
7. `DESIGN_SYSTEM.md` (for any UI work)

Treat `PROJECT_CONTEXT.md` as product truth, `PROJECT_ROADMAP.md` as the approved sequence, and
`PROJECT_HANDOVER.md` as the immediate continuation point. `SMARTKITCHEN_Workflow_v1.md` and
`SMARTKITCHEN_Technical_Design_v1.md` are historical references only.

Keep work focused, beginner-friendly, and within the approved stack in `RULES.md` (React, Vite,
Tailwind CSS, Express, SQLite). Inspect source before relying on prose. Preserve unrelated
working-tree changes.

The One-Page Zine and AI artwork are paused. Before touching image tooling, read
`server/ZINE_POC.md` (Discover edit) or `server/ZINE_ASSETS_POC.md` (asset sheet and the prompt
lessons behind the artwork feature).

Never expose secrets, commit `.env` files, create a public endpoint for developer tools, or make a
paid API request without explicit user authorization. Explain significant architectural choices
before implementing them.

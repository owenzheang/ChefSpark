# ChefSpark roadmap

## Completed product work

| Phase | Status | Outcome |
| --- | --- | --- |
| 1 | Complete | Recommendation-first recipe generation and backend matching foundation. |
| 2 | Complete | Structured Recipe JSON, validation, matching adaptation, and legacy saved-recipe compatibility. |
| 3 | Complete | Compact previews and Recipe Guide using the structured fields. |
| 4 | Complete | Ingredient categories and smart autocomplete. |
| 5 | Complete historical UI | Discover/Cook/Finish sample Zine UI and sample assets. Those assets remain references; the active format changed. |
| Match Score V2 | Complete | Conservative equivalence matching while backend matching remains authoritative. |
| 6A | Complete PoC | Local, safeguarded Discover-image CLI. One real paid reference-edit request was completed; it is not product integration. |
| 6B.1 | Complete frontend prototype | Responsive One-Page Hybrid Zine with HTML facts, legacy compatibility, and stable random `collage`, `notebook`, or `journal` style assignment. |
| 6B.2 implementation | Complete | Local, reference-free text-free asset-sheet CLI, quadrants/crops, reports, mocked coverage, and dry-runs. |
| 6B.2 live test | Complete; reviewed | One paid `collage` sheet (2026-10-15, estimate USD 0.016, not billed cost). Cooking, ingredients and decoration crops usable; hero rejected for unlisted egg. See `server/ZINE_ASSETS_POC.md`. |
| 6C Zine artwork | Implemented; live test pending | User-facing, saved-recipe AI artwork with SQLite storage, background generation, per-user/global daily limits, no retries and illustration-only disclosure. Local only. |

## Active next step

**Phase 6C — first live end-to-end test.** With `ZINE_GENERATION_ENABLED=true` locally, the user creates artwork for one saved recipe in the app; then review the four images, the stored usage/cost estimate and the failure/limit behaviour. Afterwards decide on deployment (persistent storage) and broader testing.

## Later, separately approved only when scoped

- Cloud object storage and deployment with persistent data; credits/billing for users.
- Sharing/export and stronger production operations (monitoring, abuse controls, automated image checks).

## Decisions that remain fixed

- Recipe JSON is factual; visuals are presentation.
- One-page Zine is the active format, not a three-page production flow.
- Users do not choose a visual style manually; the server picks one per Zine and stores it.
- No fuzzy matching, schema rewrite, or broad platform change without approval.

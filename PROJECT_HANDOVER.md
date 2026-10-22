# ChefSpark handover

Immediate continuation point. Read `README.md`, `AGENTS.md`, `RULES.md`, `PROJECT_CONTEXT.md`,
`PROJECT_ROADMAP.md`, `DESIGN_SYSTEM.md` and this file before changing anything. Inspect source
before treating prose as proof.

Repository: `D:\aproject\SmartKitchen`, branch `main`.

## State at 2026-10-22

- Direction changed to an AI cooking companion (see `PROJECT_CONTEXT.md`). Phase 0 done in this
  session apart from the open git decision below.
- Tests: 52 server and 32 client tests pass (mocked; no network or paid calls).
- Zine paused: `client/src/data/features.js` hides the Zine entry unless `VITE_ZINE_ENABLED=true`;
  `RecipeDetailPage` takes a `zineEnabled` prop for tests. Server artwork generation is off unless
  `ZINE_GENERATION_ENABLED=true`.
- `client/.env` and `client/dist/` are no longer tracked (both already ignored); `client/.env.example`
  lists the client settings.
- Not deployed. A throwaway local account `zine-test-…@example.test` with one saved recipe exists in
  the local database from earlier testing.

## Open decision: git remote

Local `main` is 11 commits ahead of and 5 behind `origin/main`. The 5 remote commits (July 2026:
security clean-up, docs, generation UI/API config, icons, "UI redesigned") will not be merged
(user decision 2026-10-20). Pushing therefore needs the user to choose, for example force-pushing
local `main` (discards those remote commits) or pushing to a new branch. Do not pull, merge or
force-push without that decision.

## Next action: Phase 1 step 1 — Tailwind foundation

1. Propose the setup before coding: Tailwind via its Vite plugin, theme variables for the
   `DESIGN_SYSTEM.md` tokens (colours, fonts, radii, shadows), Google Fonts loading, and how legacy
   `styles.css` coexists during migration. Ask whether to add a router (e.g. react-router) now.
2. After approval, build the app shell (background, bottom navigation, page container) and migrate
   screens one by one: Login/Register, Kitchen, Plan tonight, Results, Recipe page (Guide and Zine
   layout merged into one page), Shelf.
3. For each screen: keep behaviour and tests green, check 375px and desktop in the browser.

## File map

| Area | Files |
| --- | --- |
| App shell and navigation | `client/src/App.jsx` (state-based pages) |
| Screens | `client/src/pages/` — `IngredientsPage`, `RecipeGenerationPage`, `RecipeDetailPage`, `SavedRecipesPage`, `LoginPage`, `RegisterPage` |
| Legacy styles | `client/src/styles.css` (≈2,400 lines), `client/src/components/zine.css` |
| API client | `client/src/services/api.js` |
| Recipe generation | `server/src/services/deepseekService.js`, `server/src/controllers/recipeController.js` (cuisine allow-list: Chinese, Western) |
| Validation and matching | `server/src/utils/recipeValidation.js`, `server/src/utils/recipeMatching.js` |
| Images | `server/src/services/pexelsService.js` |
| Paused Zine | `client/src/components/OnePageZine.jsx`, `ZineSamplePreview.jsx`, `ZineArtwork.jsx`, `client/src/data/zineStyles.js`, `zineAssetSamples.js`; server `zineStore.js`, `zineGenerationService.js`, `zineController.js`, `zineRoutes.js`, `utils/zineAssets.js` |
| Developer image CLIs | `server/scripts/zine-poc.js`, `zine-assets.js` with `server/ZINE_POC.md`, `server/ZINE_ASSETS_POC.md` |
| Tests | `server/test/*.test.js`, `client/test/*.test.mjs` |

## Lessons worth keeping

- Image prompts need explicit allow-lists of visible foods and an instruction to ignore what the
  dish name usually implies; otherwise models add egg, sauces or garnish. Style decorations must be
  confined away from food. Details: `server/ZINE_ASSETS_POC.md`.
- Usage-based cost estimates are not bills (about USD 0.017–0.019 per 1024x1024 medium image).
- Never run paid generation, read or print secrets, or expose developer CLIs over HTTP.

## Session checklist

1. Read the documents above; run `git status --short` and preserve unrelated work.
2. Inspect the relevant source and tests before changing behaviour.
3. Make focused changes; report what was inspected, changed and run.
4. Ask before paid API calls, new dependencies, pushes or other hard-to-undo actions.

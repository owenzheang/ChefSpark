# ChefSpark handover

Immediate continuation point. Read `README.md`, `AGENTS.md`, `RULES.md`, `PROJECT_CONTEXT.md`,
`PROJECT_ROADMAP.md`, `DESIGN_SYSTEM.md` and this file before changing anything. Inspect source
before treating prose as proof.

Repository: `D:\aproject\SmartKitchen`, branch `main`.

## State at 2026-10-22

- Direction changed to an AI cooking companion (see `PROJECT_CONTEXT.md`). Phase 0 done in this
  session apart from the open git decision below.
- Tests: 52 server and 35 client tests pass (mocked; no network or paid calls); production build passes.
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

## Phase 1 progress

Done (2026-10-22):
- Tailwind 4.3.3 via `@tailwindcss/vite` (versions pinned). `client/src/index.css` is the style entry:
  layer order `legacy, theme, base, components, utilities`; `styles.css` is imported into the
  `legacy` layer so utilities always win; Tailwind preflight is omitted until `styles.css` is removed.
  Theme tokens mirror `DESIGN_SYSTEM.md` (default Tailwind colours removed), plus `bg-halftone`.
- Migrated markup carries `data-ds`, which applies a scoped reset of the legacy element rules
  (buttons, inputs, labels, headings) in the `base` layer.
- Fonts (Bricolage Grotesque, DM Sans, DM Mono) load from Google Fonts in `client/index.html`;
  PWA colours updated; paused Zine images excluded from the offline precache.
- `components/BottomNav.jsx`: ink pill with Kitchen / Cook / Shelf and a temporary log-out icon
  (moves to the Kitchen header when that screen is migrated). `App.jsx` uses it and wraps the app
  in `MotionConfig reducedMotion="user"`.
- `components/AuthCard.jsx` now renders Login and Register (fake "Forgot password" and terms text
  removed). `client/test/shell.test.mjs` covers auth, nav and token/doc consistency.
- Browser check at 375px: login, register (throwaway local account `riso-check-7f3a@example.test`),
  landing on Kitchen, tab switching, no horizontal overflow.

## Next action: migrate the Kitchen screen

`IngredientsPage` → Kitchen artboard of the mockup: headline, add-ingredient field with
autocomplete, inventory chips, account/log-out control in the header (then drop it from the nav),
primary action above the nav. The legacy Kitchen's bottom action is currently hidden behind the
nav; the migration fixes that. Pantry toggles need backend support, so treat them as a separate,
confirmed step. Router question still open (not added).

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

# ChefSpark handover

Immediate continuation point. Read `README.md`, `AGENTS.md`, `RULES.md`, `PROJECT_CONTEXT.md`,
`PROJECT_ROADMAP.md`, `DESIGN_SYSTEM.md` and this file before changing anything. Inspect source
before treating prose as proof.

Repository: `D:\aproject\SmartKitchen`, branch `main`.

## State at 2026-10-22

- Direction changed to an AI cooking companion (see `PROJECT_CONTEXT.md`). Phase 0 done in this
  session apart from the open git decision below.
- Tests: 58 server and 41 client tests pass (mocked; no network or paid calls); production build passes.
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

Design direction: **Ember (cream)**, chosen by the user on 2026-10-23 after comparing three explorations
on the design canvas (A · Riso Kitchen, B · Mono, C · Ember). Riso Kitchen was implemented first and then
replaced; see `DESIGN_SYSTEM.md` for the current rules.

Foundation:
- Tailwind 4.3.3 via `@tailwindcss/vite` (pinned). `client/src/index.css`: layer order
  `legacy, theme, base, components, utilities` during migration (superseded: see the cleanup below); no global
  preflight. Ember tokens only (`iron`, `flour`, `soft`, `ash`, `cream`; display/sans/mono/hand
  fonts; `shadow-glow`; `animate-shimmer`; `bg-ember-glow`).
- `[data-ds]` scoped reset (base layer): legacy element rules, default border widths, lists, fieldsets,
  headings, disabled opacity. `body` and the page container are `iron` so no light legacy background
  shows behind migrated screens.
- Fonts (Instrument Serif, Hanken Grotesk, IBM Plex Mono, Caveat) in `client/index.html`; theme/PWA
  colours `#15120f`.
- Shared pieces: `Spark`, `PlateRing` (match ring), `Burners` (difficulty, with an `onCream` variant).

Screens in Ember: `BottomNav` (three text tabs, cream spark on the active one), `AuthCard` (login and
register), Kitchen (`IngredientsPage`, order-ticket list, cream add button, quick add with sparks, Log out
in the header), Plan tonight (`RecipeGenerationPage`: cuisine and difficulty pills, honest
`GenerationProgress` with Cancel), results as "Tonight's menu" (`RecipePreviewCard`: course numeral,
plate ring with the match score, no stock photo, computed chef's note when nothing is missing).

Server-side generation changes from this phase (still current): 60 s DeepSeek timeout, cancel on client
disconnect, user-safe `RecipeGenerationError` messages, 5 s Pexels timeout.

Verified 2026-10-23: 41 client and 58 server tests; production build; browser at 375px for Kitchen, Plan
tonight, progress + Cancel and the results menu (generate request stubbed in-page, no API call), and the
login component rendered on its own. Saved recipes and the recipe page are still legacy (light green) and
look inconsistent until migrated.

Router (2026-10-23, approved by the user): `react-router` 8.4.0 (pinned; 8.5.0 was only days old).
Routes `/login`, `/register`, `/kitchen` (and `/`), `/cook`, `/cook/dish/:n`, `/shelf`, `/shelf/:id`, others →
`/kitchen`. `RequireAuth` redirects to `/login` with the requested path and returns there after sign-in
(`safeReturnPath` only allows in-app paths). `api.js` treats a 401 on a signed-in request as sign-out
(clears the token, fires `chefspark:signed-out`; `App` navigates to login). Tonight's menu, cuisine and
difficulty persist in sessionStorage per tab and are cleared on sign-out. Pages still take callbacks as
props; only `App.jsx` uses router hooks. Verified: 46 client tests (route helpers, guard, dish route,
401 handling); build; in the browser: `/` → `/kitchen`, menu → `/cook/dish/2`, Back keeps the menu,
reload on the dish and on `/shelf/12` works, a missing dish falls back to `/cook`. Deployment must serve
`index.html` for unknown paths (SPA fallback).

Recipe page in Ember (2026-10-23): `RecipeDetailPage` follows the Recipe artboard — back link
("← MENU" / "← SHELF"), plate ring with the match score (decorative ring, score announced once; no
stock photo), cuisine + serif title, spec row (match / time shortened to "25 min" / serves / burners with
the word), You have / You need columns, order-ticket ingredients with "✦ … · NEED" on missing items, a
handwritten chef's note only from the recipe's first substitution, serif-numbered method, tips and
substitutions columns. The mockup's "Light the stove" button is left out until Cooking Mode exists
(Phase 2). The Zine entry still appears only with `VITE_ZINE_ENABLED=true`. Verified: 47 client tests;
build; browser at 375px on saved recipe 12 (no overflow; time fits after a fix). A script bug had
written backspace characters instead of `` in one regex; fixed, and all project files were scanned
clean.

Shelf + cleanup (2026-10-23) — **Phase 1 complete**:
- `SavedRecipesPage` in Ember: rows instead of cards (small plate ring, serif title, burners · cuisine ·
  time · saved date), the whole row opens the recipe, "Remove" asks "Remove from your shelf? Keep /
  Yes, remove" before deleting, empty state only after loading ("Nothing on the shelf yet" + Plan
  tonight link). The old bug where the empty message and a count could show together is gone.
- `client/src/styles.css` (≈2,400 lines) deleted; Tailwind preflight enabled; `index.css` is only
  theme + preflight + utilities + `html`/`body` defaults. App layout uses utilities; `phone-container`
  remains only as a hook for the paused Zine's wider layout; the Zine screen carries its old font and
  text colour in `zine.css`. Built CSS is about 34 KB.
- Verified: 48 client and 58 server tests; build; browser at 375px for Kitchen, Plan tonight, recipe
  12 and the Shelf (remove confirmation shown then cancelled; nothing deleted).

## Next action: Phase 1.5 — deployment

Choose hosting with persistent storage for SQLite (and SPA fallback to `index.html` for the client),
configure `CORS_ORIGINS`, `JWT_SECRET` and API keys as host secrets, and decide how `main` relates to
`origin/main` before pushing (see the open git decision above). Then Phase 2, Cooking Mode.

## File map

| Area | Files |
| --- | --- |
| App shell and navigation | `client/src/App.jsx` (routes, auth guard, sign-out), `client/src/routes.js` (paths and helpers), `client/src/utils/sessionState.js`, `client/src/main.jsx` (`BrowserRouter`) |
| Screens | `client/src/pages/` — `IngredientsPage`, `RecipeGenerationPage`, `RecipeDetailPage`, `SavedRecipesPage`, `LoginPage`, `RegisterPage` |
| Styles | `client/src/index.css` (Tailwind theme tokens), `client/src/components/zine.css` (paused Zine only) |
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

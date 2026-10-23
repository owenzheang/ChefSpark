# ChefSpark handover

Immediate continuation point, rewritten 2026-10-24 for a fresh session. Read `README.md`,
`AGENTS.md`, `RULES.md`, `PROJECT_CONTEXT.md`, `PROJECT_ROADMAP.md`, `DESIGN_SYSTEM.md` (UI work) and
this file before changing anything. Inspect source before treating prose as proof.

Repository: `D:\aproject\SmartKitchen`, branch `main`. Owner: a career switcher (digital media art,
Deakin MIT) building ChefSpark as a portfolio product; prefers plans explained before building,
answers in Chinese or English, and explicit approval before any paid API request.

## Where things stand (2026-10-24)

| Phase | Status |
| --- | --- |
| 0 · Clean-up and direction | Done. Zine paused behind switches; docs rewritten. |
| 1 · UI redesign (Tailwind, "Ember" cream) | Done 2026-10-23. Every screen; React Router; legacy CSS deleted. |
| 1.5 · Deployment | Deferred by the user. |
| 2 · Cooking Mode | Done 2026-10-23. |
| 3 · Recipe assistant | Done 2026-10-23, live-checked. |
| Diet choice on Plan tonight | Done 2026-10-23, live-checked. |
| 4 · Food images | **Next candidate** (or deployment). Not started. |
| 5 · Natural ingredient input | Planned. |

Tests: 72 server + 66 client, all mocked (no network, no paid calls); production build passes.
Working tree clean at `b46cfe6`.

## Git and remote (open decision, needs the user)

- Local `main` is 25 commits ahead of `origin/main` and 5 behind. The 5 remote commits (July 2026) are
  **not** to be merged (user decision 2026-10-20).
- Agreed approach: the user pushes local `main` to a new remote branch, leaving remote `main` intact:
  `git push origin main:refs/heads/companion` (the agent's push was blocked by permissions; the user
  runs it). After that, decide whether to make `companion` the GitHub default branch or replace
  remote `main`. Never pull, merge or force-push without the user's explicit decision.
- Local branch `phase-6b3-zine-assets` is already merged into `main` and can be deleted.

## What the app does now

`Kitchen → Plan tonight → Tonight's menu (3 dishes) → Recipe → Cooking Mode → Shelf`

- **Plan tonight** (`RecipeGenerationPage`): cuisine (Chinese/Western), difficulty, and **diet** (Any /
  Vegetarian / Vegan). The diet goes into the DeepSeek prompt and the server checks every ingredient
  with a keyword list (`server/src/utils/dietRules.js`, plant-based exceptions like coconut milk,
  peanut butter, vegetarian oyster sauce). A dish that breaks the diet is dropped, not retried; the
  response carries `droppedForDiet` and the page says so. Fitting dishes get a server-set `diet` label
  (menu, recipe page, shelf). The page tells users to check labels (keywords are not a guarantee).
- **Recipe page**: Ember layout (plate ring, order ticket, method), servings scaling, "Light the stove"
  → Cooking Mode, and **Adjust this dish** (recipe assistant, below).
- **Cooking Mode**: one step per screen, timers parsed from step text (ranges start at the lower
  bound), wake lock, chime, servings; **two step questions** ("What does this mean?", "How do I know
  it's done?") below the timers.
- **Shelf**: saved recipes as rows with remove confirmation.

## Recipe assistant (Phase 3) — how it works

- Server switch `ASSISTANT_ENABLED=true` (off by default; currently **on** in the local, ignored
  `server/.env`). Limits: 20 requests per user and 300 total per day (`ASSISTANT_USER_DAILY_LIMIT`,
  `ASSISTANT_GLOBAL_DAILY_LIMIT`), one request per user at a time, 30 s timeout, no retries,
  `max_tokens` 4000 for edits and 250 for explanations. Every paid request is logged in
  `assistant_requests` (tokens included); rejected and failed requests still count.
- Endpoints (`/api/assistant`, auth required): `GET /status`, `POST /edit`, `POST /explain`.
- Edit actions: **"I don't have …"** (one ingredient) and **"Simpler & quicker"**. There is no
  diet edit: diet is chosen only on Plan tonight (user decision 2026-10-23); an edit of a vegetarian or
  vegan recipe must stay so (prompt rule plus code check, otherwise rejected).
- Code, not AI, decides the result (`server/src/utils/recipeEdits.js`): main protein / staple
  detection; **minor** (same dish, keeps title and picture), **variant** (core swap or >30% of
  ingredients changed: own title, `variantOf`, no picture), **rejected** (core protein or staple lost,
  or >50% changed: "plan a new dish"). Max 3 chained edits (`editCount`). The server recalculates
  Match Score and computes the before/after diff.
- Accepting: an unsaved dish is replaced in tonight's menu; a saved recipe's version is saved as a
  **new** shelf recipe (the original stays).
- Step explanations are cached for everyone in `assistant_explanations` (key: model + prompt); cache
  hits are free and not counted.
- DeepSeek: one helper `requestDeepSeekJson` in `deepseekService.js` for generation and assistant.
  Model from `DEEPSEEK_MODEL`, default `deepseek-flash` (`deepseek-chat` is no longer on DeepSeek's price
  list). Prices checked 2026-10-23: input $0.30/M, output $1.20/M at peak (half off-peak).

Live check 2026-10-23 (user-authorised, 5 requests, ≈ USD 0.011 total): vegetarian generation gave
three sensible dishes and ignored chicken in the inventory (34.6 s); "I don't have spring onion" →
minor; "simpler" → minor, 6 → 4 steps; a (since removed) vegetarian edit → variant Tofu Fried Rice; a
doneness answer included 74°C / 165°F. A throwaway local account `assistant-test-…@example.test`
exists in the local database. Known nit: generated ingredient names came back lower-case with units
like "cups (cooked)" (UI upper-cases; a prompt tweak later is optional).

## Next action — ask the user which

1. **Phase 4 food images** (the user's stated next idea): compare OpenAI and Jimeng (即梦) on accuracy,
   cost and terms before choosing; provider abstraction; a reusable image library keyed by dish plus
   visible core ingredients (not title alone); variants never inherit a picture; never auto-generate.
   Start from the paused Zine artwork pipeline (allow-list prompts, cropping, limits, cost logging;
   `server/ZINE_ASSETS_POC.md`). Explain the plan and costs first; the user needs a Jimeng API key; no
   paid request without explicit authorisation.
2. **Deployment (1.5)**: hosting with persistent SQLite storage, SPA fallback (`index.html` for unknown
   paths), `CORS_ORIGINS`, host secrets; depends on the git decision above.

## Local running

- `.claude/launch.json` defines `server` (port 5000, `npm --prefix server run start`, no file watching:
  restart after server changes) and `client` (Vite, port 5173).
- Running the client tests re-optimises Vite deps; a running dev server may then show "Outdated
  Optimize Dep" until the page is reloaded.
- For browser checks without paid calls, stub `window.fetch` in the page (fake token in
  `localStorage.smartkitchen_token`, stubbed `/saved-recipes/:id` and `/assistant/*`), then navigate
  with `history.pushState` + `popstate`; remove the token and `chefspark:` session keys afterwards.

## File map

| Area | Files |
| --- | --- |
| App shell and navigation | `client/src/App.jsx` (routes, auth guard, sign-out, assistant adopt handlers), `client/src/routes.js`, `client/src/utils/sessionState.js`, `client/src/main.jsx` |
| Screens | `client/src/pages/` — `IngredientsPage`, `RecipeGenerationPage`, `RecipeDetailPage`, `CookingModePage`, `SavedRecipesPage`, `LoginPage`, `RegisterPage` |
| Ember components | `client/src/components/` — `Spark`, `PlateRing`, `Burners`, `BottomNav`, `RecipePreviewCard`, `GenerationProgress`, `StoveDial`, `RecipeAssistant`, `StepHelp`, `IngredientSuggestions`, `IngredientCategoryIcon` |
| Cooking utilities | `client/src/utils/` — `cookingTimers.js`, `scaleRecipe.js`, `useCookingTimers.js`, `useWakeLock.js`, `chime.js` |
| Styles | `client/src/index.css` (Tailwind theme tokens), `client/src/components/zine.css` (paused Zine only) |
| API client | `client/src/services/api.js` |
| Recipe generation | `server/src/services/deepseekService.js`, `server/src/controllers/recipeController.js`, `server/src/utils/dietRules.js` |
| Recipe assistant | `server/src/services/assistantService.js` (config, prompts), `assistantStore.js` (tables), `controllers/assistantController.js`, `routes/assistantRoutes.js`, `utils/recipeEdits.js` |
| Validation and matching | `server/src/utils/recipeValidation.js`, `server/src/utils/recipeMatching.js` |
| Images | `server/src/services/pexelsService.js` (URLs still returned, not shown) |
| Paused Zine | `client/src/components/OnePageZine.jsx`, `ZineSamplePreview.jsx`, `ZineArtwork.jsx`, `client/src/data/zineStyles.js`, `zineAssetSamples.js`, `features.js`; server `zineStore.js`, `zineGenerationService.js`, `zineController.js`, `zineRoutes.js`, `utils/zineAssets.js` |
| Developer image CLIs | `server/scripts/zine-poc.js`, `zine-assets.js` with `server/ZINE_POC.md`, `server/ZINE_ASSETS_POC.md` |
| Tests | `server/test/*.test.js`, `client/test/*.test.mjs` |

## Lessons worth keeping

- Files in this repo are mostly CRLF; scripted edits must normalise `\r\n` first, and template
  literals in scripts must not turn `\b` into a backspace character (scan for `\x08` after edits).
- Keep deterministic work in code (diet checks, match, diff, edit size, scaling, timers); AI proposes.
- Image prompts need explicit allow-lists of visible foods; style decorations away from food
  (`server/ZINE_ASSETS_POC.md`). Usage-based cost estimates are not bills.
- Never run paid generation, read or print secrets, commit `.env`, or expose developer CLIs over HTTP.

## Session checklist

1. Read the documents above; run `git status --short` and preserve unrelated work.
2. Inspect the relevant source and tests before changing behaviour.
3. Explain significant plans (and costs) before building; make focused changes; report what was
   inspected, changed and run.
4. Ask before paid API calls, new dependencies, pushes or other hard-to-undo actions.

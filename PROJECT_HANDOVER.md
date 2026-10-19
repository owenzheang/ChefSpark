# ChefSpark handover

## Read first

This is the detailed continuation document. Before changing the repository, read `README.md`, `AGENTS.md`, `RULES.md`, `PROJECT_CONTEXT.md`, `PROJECT_ROADMAP.md`, and this file. Treat the context as product truth, roadmap as approved sequencing, and this handover as the immediate continuation point. Inspect source before treating prose as implementation proof.

Repository: `D:\aproject\SmartKitchen`.

## Product and non-negotiable principles

ChefSpark helps users go from **Ingredients -> Recommended Dishes -> Recipe Guide -> Optional Personalized One-Page Zine**. Ingredients are recommendation signals; dishes can have sensible missing ingredients. The normal Recipe Guide must remain useful without any Zine.

```text
Structured Recipe JSON = factual source of truth.
AI-generated artwork = visual presentation only.
```

Do not make artwork authoritative for quantities, timings, temperatures, ingredients, instructions, safety, or style identity. Preserve React/Vite/vanilla CSS, Express, SQLite, DeepSeek, lucide-react, and existing dependencies unless approval says otherwise.

## Current implementation

### Recipes and matching

- `server/src/services/deepseekService.js` asks DeepSeek for exactly three recognizable structured recipes.
- `server/src/utils/recipeValidation.js` validates structured ingredients/steps and supports the smaller legacy saved-recipe shape.
- `server/src/utils/recipeMatching.js` provides backend matching; `server/src/controllers/recipeController.js` applies it after generation.
- `youHave` contains ingredients matched to real inventory. Salt, sugar, and basic cooking oil can contribute to score and avoid `youNeed`, but do not appear in `youHave` unless the user stored them. Soy sauce is not a default.
- Saved recipe JSON remains stored by the existing controller/database path; no Zine tables exist.

### Recipe Guide and One-Page Zine

- `client/src/pages/RecipeDetailPage.jsx` is the Guide and Zine entry point.
- `client/src/components/OnePageZine.jsx` renders structured facts as HTML and handles sensible legacy ingredient/step strings.
- `client/src/components/ZineSamplePreview.jsx` provides local intro/preview flow only; it has a Back to Recipe action.
- `client/src/data/zineStyles.js` defines the three distinct variants: `collage` (Editorial Collage), `notebook` (Rustic Notebook), and `journal` (Modern Food Journal). `getPreviewStyle` stores a random choice once per recipe-preview identity in session storage, with a deterministic fallback; `developerStyle` accepts development-only `?zineStyle=collage|notebook|journal`.
- Users do not select styles. A future persisted Zine must store `styleId` plus relevant version metadata on the Zine record, never in Recipe JSON.
- `client/public/zine-samples/discover.png`, `cook.png`, and `finish.png` are retained historical samples. Do not delete or present them as the active product flow.

## Completed history

- Phases 1–5: recommendation improvements, backend matching/validation, structured recipes with saved-recipe compatibility, recipe previews/Guide, ingredient catalog/autocomplete, Match Score V2, and historical three-page Zine samples.
- Phase 6A: developer-only Discover-image PoC. One paid request was successfully made using `gpt-image-2.5-flare`, medium, 1024x1536, one PNG, with the original Discover image as visual reference. Its ignored local result/report lives under `server/generated-zines/poc/`. Usage-based estimates are not exact billing.
- Phase 6B.1: frontend-only One-Page Hybrid Zine prototype with factual HTML text, responsive vertical growth, style variation, and stable random assignment.
- Phase 6B.2 implementation: a separate asset-sheet CLI, prompt builder, PNG crop utility, reports, mocked tests, and dry-runs. It uses `server/test/fixtures/chicken-fried-rice.json` because no genuine structured Chicken Wings fixture was found.
- Phase 6B.2 live test: one paid collage asset sheet succeeded on 2026-10-15 (usage-based estimate USD 0.01593, not billed cost). It was not documented at the time and was found in the ignored local report during the 2026-10-19 onboarding. Manual review: cooking, ingredients and decoration crops are usable; the hero is rejected because it shows egg (and likely soy-sauce colouring) that the recipe does not list. Details are in `server/ZINE_ASSETS_POC.md` under "First live result".

Latest reported verification from the prior implementation report—not rerun for this documentation handover—was: 42 backend tests passed; three asset-sheet dry-runs and a Phase 6A dry-run passed; syntax and whitespace checks passed.

## Developer-only paid image tooling

Read the matching document before touching either tool:

| Tool | Script and purpose | Documentation | Output |
| --- | --- | --- | --- |
| Phase 6A | `npm run zine:poc`; one portrait Discover-style reference edit | `server/ZINE_POC.md` | ignored `server/generated-zines/poc/` |
| Phase 6B.2 | `npm run zine:assets`; one square, text-free asset sheet plus four crops | `server/ZINE_ASSETS_POC.md` | ignored `server/generated-zines/assets-poc/` |

Phase 6B.2 safe default, from `server/`:

```powershell
npm run zine:assets -- --style=collage --dry-run
```

The paid command (already used once; any further run needs new explicit approval):

```powershell
npm run zine:assets -- --style=collage --execute --acknowledge-paid --allow-unverified-cost
```

It requires the exact interactive phrase `GENERATE ONE ASSET SHEET WITH UNVERIFIED COST`. Never run it without explicit user authorization. It uses one `gpt-image-2.5-flare` image at medium quality and 1024x1024, with no reference image. Its pre-request total cost cannot be verified; the configured budget is not an enforced ceiling in override mode. A failed request can still be billed. Automatic retries are disabled. Usage-derived cost is an estimate, never exact billing.

Secrets are manually supplied in ignored `server/.env`, remain server-only, and are never logged or documented. `OPENAI_API_KEY` is required only for a paid execution. Do not inspect or print it.

## Phase 6B.2 file map

- `server/scripts/zine-assets.js`: CLI entry point and final interactive paid confirmation.
- `server/src/services/zineAssetsService.js`: argument/configuration gates, one-request transport, local report/output handling.
- `server/src/utils/zineAssets.js`: factual prompt construction, asset layout, PNG crop utility.
- `server/test/zineAssets.test.js`: mock/dry-run/crop/safety coverage.
- `server/ZINE_ASSETS_POC.md`: operational constraints and commands.
- `client/src/data/zineStyles.js`: shared IDs and art direction, reused by the asset prompt so style names do not diverge.

## Known limitations and risks

- No public or user-facing OpenAI generation path, persistent Zine data, cloud storage, credits, exports, or sharing.
- Phase 6B.2 outputs are not yet integrated into One-Page Zine. Only one sheet exists; its hero crop is rejected.
- AI images can introduce words, unsupported food, incorrect scenes, or cropping defects; inspect full sheets and every crop manually. The first live sheet showed that an explicit "no eggs" instruction was ignored.
- Recipe-generation results are page state until saved; app navigation remains state-based.
- The remaining API credit/billing balance is unknown. Never imply otherwise.

## Exact next action

**Phase 6B.3 hybrid integration prototype — implemented 2026-10-19 (approved plan).**

- Reviewed crops copied to `client/public/zine-assets/dev-samples/chicken-fried-rice-collage/` (initially cooking, ingredients and decoration from the first sheet; since replaced by all four crops of the second sheet, below). Originals in `server/generated-zines/` are untouched.
- `client/src/data/zineAssetSamples.js` holds the sample manifest and `developerAssetSample`. Samples appear only when all hold: Vite dev mode, `?zineAssets=sample`, style `collage`, and recipe title "Chicken Fried Rice" (case-insensitive). Otherwise the Zine is unchanged.
- `OnePageZine` accepts optional `assets`: ingredients crop above the ingredient list, cooking crop above the steps, decoration as an edge-faded band above the footer (`alt=""`, `aria-hidden`). The hero keeps the existing photo/placeholder. The preview caption discloses reviewed AI artwork when a sample is shown.
- `zine-assets/**` is excluded from the PWA precache in `client/vite.config.js`.
- Verified: 30 client tests pass. In the browser, a different saved recipe (with the flag and collage) showed no samples; the Chicken Fried Rice layout was checked by rendering the real preview component with the fixture recipe, at desktop (~730px) and 375px widths, with no horizontal overflow. The logged-in account has no saved Chicken Fried Rice, so the full click-through path with a real saved record was not exercised.
- Note: running the client tests starts a Vite instance that re-optimizes `client/node_modules/.vite`; an already-running dev server may then return `504 Outdated Optimize Dep` until reloaded or restarted.

Hero prompt revision (2026-10-19): the user chose to refine the hero. The approved prompt changes, a mocked test and a free collage dry-run are done (see "Hero prompt revision" in `server/ZINE_ASSETS_POC.md`). The user then ran one live collage sheet with the revised prompt (2026-10-19T11:29Z, estimate USD 0.016575, not billed cost). Review: all four crops usable, hero now free of egg and sauce colouring, though food quadrants are plainer than the first sheet (see "Second live result" in `server/ZINE_ASSETS_POC.md`). The development sample now uses all four crops from this second sheet (one generation, consistent lighting and palette), including the AI hero in the taped hero frame; the hero caption no longer claims the hero is non-AI. Client tests (30) pass, and the layout was checked in the browser at desktop and 375px with no horizontal overflow. The first sheet's crops remain in git history (`75c1e22`) and in `server/generated-zines/`.

Style coverage (2026-10-19): the user ran one notebook and one journal sheet with the revised prompt. The hero allow-list held in both; notebook crops are usable; journal failed because botanical accents appear in the food quadrants and cross boundaries (see "Style coverage" in `server/ZINE_ASSETS_POC.md`).

Decoration confinement applied to `buildAssetPrompt` with mocked tests and passing dry-runs for all three styles (see "Decoration-confinement revision" in `server/ZINE_ASSETS_POC.md`).

Journal re-test (2026-10-19, ~USD 0.017 estimate): all four crops usable; the decoration rule held. Each style now has one passing sheet with the current prompt.

**Next:** paused for a product decision with the user; the image experiment is no longer the bottleneck.

## New Claude Code session checklist

1. Read the six root documents listed at the top.
2. Run `git status --short` before edits and preserve existing work.
3. For Zine/image work, read `server/ZINE_POC.md` and/or `server/ZINE_ASSETS_POC.md` first.
4. Inspect the named source files and relevant tests before changing behavior.
5. Make the smallest focused change and report evidence separately from assumptions.
6. Never run paid generation, expose a developer CLI through HTTP, commit secrets, or silently reverse the product decisions above.

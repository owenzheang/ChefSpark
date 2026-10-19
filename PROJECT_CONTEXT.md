# ChefSpark project context

## Product truth

ChefSpark is a beginner-friendly cooking product:

```text
Ingredients -> Recommended Dishes -> Recipe Guide -> Optional Personalized One-Page Zine
```

Available ingredients guide recommendations rather than constraining them. ChefSpark recommends recognizable dishes, permits sensible missing ingredients, and explains compatibility with **Match Score**, **You Have**, and **You Need**.

```text
Structured Recipe JSON = factual source of truth.
AI-generated artwork = visual presentation only.
```

## Implemented application capabilities

- React/Vite mobile-first frontend; Express backend; SQLite storage; JWT/bcrypt authentication.
- User ingredient inventory with category/autocomplete assistance.
- DeepSeek generation of exactly three structured recipes, validated server-side.
- Structured recipe fields: title, cuisine, difficulty, servings, cook time, structured ingredients and steps, tips, substitutions, image prompt, and backend-derived matching fields.
- Saved recipes store full JSON and retain compatibility with older string-ingredient/string-step records.
- Match Score V2 remains server authoritative. Salt, sugar, and basic cooking oil can satisfy matching but are neither inserted into inventory nor listed in `youHave` unless actually stored; soy sauce remains non-default.
- Recipe Guide renders structured or reasonable legacy saved data.
- One-Page Zine frontend prototype renders all factual content in HTML. It has `collage`, `notebook`, and `journal` variants. A new preview receives one randomly selected style, held stable by session storage with a deterministic fallback; development supports `?zineStyle=<id>` overrides.

## Zine artwork (product feature)

- Saved recipes can add optional AI artwork to their One-Page Zine: one server-side `gpt-image-2.5-flare` request makes a text-free 2x2 sheet that is split into hero, cooking, ingredients and decoration images. It is off unless `ZINE_GENERATION_ENABLED=true`, limited per user (default 3/day) and globally (default 30/day), never retried, and labelled as illustration only; recipe facts always remain HTML text.
- Backend: `server/src/services/zineStore.js` (tables `zines`, `zine_images` with PNG BLOBs, `zine_generations` for limits), `zineGenerationService.js`, `controllers/zineController.js`, authenticated `/api/zines` routes. Each Zine stores its random `styleId` and `prompt_version`; Recipe JSON is unchanged. Deleting a saved recipe removes its Zine; limits count attempts, including failures and deleted Zines.
- Frontend: `client/src/components/ZineArtwork.jsx` (status polling, blob image URLs, create/regenerate/remove) feeds `ZineSamplePreview`/`OnePageZine`. Unsaved generated recipes are asked to save first; failure keeps the full text Zine with a message.
- Not yet live-tested end to end; deployed hosting is not set up (local only).

## Image-generation tooling (developer only)

- Phase 6A is a developer-only, local Discover-image editing PoC. One paid request was previously completed successfully using `gpt-image-2.5-flare`, medium, one 1024x1536 PNG, and the historical Discover sample as a reference. The ignored local output/report are under `server/generated-zines/poc/`. Its billed cost is not known exactly.
- Phase 6B.2 is a separate developer-only, reference-free 1024x1024 asset-sheet PoC. It produces one sheet and, after validation, four 512x512 local crops. One paid `collage` sheet was generated on 2026-10-15 and manually reviewed on 2026-10-19: the cooking, ingredients and decoration crops are usable; the hero was rejected for unlisted egg. Revised prompts then produced fully usable sheets for collage, notebook and journal (see `server/ZINE_ASSETS_POC.md`); the product feature reuses that prompt.
- Neither CLI tool is exposed as an endpoint; the product feature uses its own service. Existing three-page sample images remain historical assets, not the active Zine experience.

## Limits and non-goals today

- No cloud storage, credits, sharing/export, or deployment; images live in local SQLite.
- Generated artwork is not human-reviewed before users see it; the prompt rules reduce but do not eliminate wrong food or crop defects.
- Generated recipe results remain page state until saved; navigation is state-based rather than routed URLs.

## Immediate approved next action

**First live end-to-end Zine artwork test, run locally by the user.** See `PROJECT_HANDOVER.md`.

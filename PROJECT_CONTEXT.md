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

## Image-generation tooling, not product UI

- Phase 6A is a developer-only, local Discover-image editing PoC. One paid request was previously completed successfully using `gpt-image-2.5-flare`, medium, one 1024x1536 PNG, and the historical Discover sample as a reference. The ignored local output/report are under `server/generated-zines/poc/`. Its billed cost is not known exactly.
- Phase 6B.2 is a separate developer-only, reference-free 1024x1024 asset-sheet PoC. It produces one sheet and, after validation, four 512x512 local crops. One paid `collage` sheet was generated on 2026-10-15 and manually reviewed on 2026-10-19: the cooking, ingredients and decoration crops are usable; the hero is rejected for unlisted egg. It is not yet connected to the frontend.
- Neither tool is a public endpoint or user-facing generation feature. Existing three-page sample images remain historical assets, not the active Zine experience.

## Limits and non-goals today

- No persistent Zine record, cloud storage, credits, sharing/export, or public image-generation API.
- The active frontend does not use real generated asset sheets.
- Generated recipe results remain page state until saved; navigation is state-based rather than routed URLs.
- Image quality and factual correctness always need human review; AI artwork must be checked for unwanted text, wrong food, and crop defects.

## Immediate approved next action

**Phase 6B.3 — hybrid frontend integration prototype using the three reviewed crops; the implementation plan needs user approval before coding.** See `PROJECT_HANDOVER.md` for the sequence and safeguards.

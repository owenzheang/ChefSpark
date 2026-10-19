# ChefSpark

ChefSpark is a beginner-friendly cooking app that moves people from available ingredients to useful, recognizable dishes and practical cooking guidance.

```text
Ingredients -> Recommended Dishes -> Recipe Guide -> Optional Personalized One-Page Zine
```

Ingredients are recommendation signals, not strict recipe constraints. A recipe may include sensible missing items, and ChefSpark explains the result through a backend-calculated Match Score, **You Have**, and **You Need**.

## Current product

Implemented application features include:

- Authentication, user-scoped SQLite ingredient inventory, and saved recipes.
- DeepSeek-backed generation of exactly three recognizable recipes.
- Structured Recipe JSON: servings, structured ingredients, structured steps, tips, substitutions, and image prompt.
- Backend Match Score V2, including matching-only pantry assumptions for salt, sugar, and basic cooking oil. Soy sauce is not a pantry default.
- A Recipe Guide that renders current structured recipes and reasonable older saved-recipe shapes.
- Ingredient categories and autocomplete.
- A local One-Page Zine prototype: factual recipe data remains readable React/HTML text, with three internally available visual variants selected once per preview.

Saved recipes can add optional AI artwork to their One-Page Zine: one server-side `gpt-image-2.5-flare` request makes a text-free 2x2 sheet that is split into hero, cooking, ingredients and decoration images. It is off unless `ZINE_GENERATION_ENABLED=true`, limited per user (default 3/day) and globally (default 30/day), never retried, and labelled as illustration only; recipe facts always remain HTML text. The historical Discover/Cook/Finish sample images remain in the repository for reference only; the active Zine direction is one continuous page.

## Core accuracy rule

```text
Structured Recipe JSON = factual source of truth.
AI-generated artwork = visual presentation only.
```

Artwork must not become the authority for ingredient quantities, steps, cooking times, temperatures, or safety guidance.

## Stack

- Frontend: React, Vite, vanilla CSS, lucide-react, motion, and vite-plugin-pwa.
- Backend: Node.js, Express, JWT, bcrypt, CORS, dotenv.
- Database: SQLite.
- Recipe generation: existing server-side DeepSeek integration.
- Optional developer tooling: server-side OpenAI Images API proof-of-concept scripts.

Do not introduce a framework or architecture rewrite without explicit approval. See [RULES.md](RULES.md).

## Local development

Prerequisites: Node.js 18+, npm, and backend environment values appropriate to the feature being exercised.

```powershell
cd D:\aproject\SmartKitchen\server
npm install
npm run dev
```

In another terminal:

```powershell
cd D:\aproject\SmartKitchen\client
npm install
npm run dev
```

The backend normally serves `http://localhost:5000`; Vite normally serves `http://localhost:5173`.

Keep secrets in ignored `server/.env` and frontend-safe configuration only in `client/.env`. Never commit keys.

Typical backend values are `DEEPSEEK_API_KEY`, `JWT_SECRET`, `PEXELS_API_KEY`, and `CORS_ORIGINS`. `OPENAI_API_KEY` is used only server-side, by the optional Zine artwork feature and the developer-only image commands; it is never a frontend value. Zine artwork also needs `ZINE_GENERATION_ENABLED=true`, `OPENAI_IMAGE_MODEL=gpt-image-2.5-flare` and `OPENAI_IMAGE_QUALITY=medium`; see `server/.env.example`. It switches itself off when the reviewed pricing profile expires (2026-11-13) until pricing is re-checked.

## Developer-only image experiments

Phase 6A and 6B.2 are local developer tools, not application endpoints and not production UI features. Their paid paths require explicit user approval, interactive confirmation, one image per invocation, and no automatic retry.

- [Phase 6A: Discover-image PoC](server/ZINE_POC.md)
- [Phase 6B.2: text-free asset-sheet PoC](server/ZINE_ASSETS_POC.md)

The safe default for the asset sheet is:

```powershell
cd D:\aproject\SmartKitchen\server
npm run zine:assets -- --style=collage --dry-run
```

Do not run a paid command merely while setting up or reviewing the project.

## Documentation map

- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md): concise current product and technical truth.
- [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md): approved sequence and status.
- [PROJECT_HANDOVER.md](PROJECT_HANDOVER.md): detailed continuation handover and exact next step.
- [AGENTS.md](AGENTS.md) and [RULES.md](RULES.md): agent workflow and safeguards.
- `SMARTKITCHEN_Workflow_v1.md` and `SMARTKITCHEN_Technical_Design_v1.md`: historical v1 references, not current requirements.

## Current next step

**First live end-to-end test of Zine artwork**, run locally by the user with the feature switched on. See `PROJECT_HANDOVER.md`.

# ChefSpark

ChefSpark is an AI cooking companion for beginner cooks: it helps people turn what is already in
their kitchen into a dish they can actually make tonight, and (from Phase 2) guides them while
they cook.

```text
What I have -> Three dishes I can make tonight -> Cook it step by step -> Save, adjust, repeat
```

Ingredients are recommendation signals, not strict constraints. Each dish explains itself with a
backend-calculated **Match Score**, **You Have** and **You Need**.

## Core accuracy rule

```text
Structured Recipe JSON = factual source of truth.
AI output (images, assistant answers) = presentation or proposals, never silent fact changes.
```

Quantities, steps, times, temperatures and safety guidance come only from validated recipe JSON.
Any AI change to a recipe must produce a new validated recipe version that the user can see.

## What works today

- Accounts (JWT + bcrypt), a per-user ingredient inventory with categories and autocomplete, and
  saved recipes in SQLite.
- DeepSeek generation of exactly three recognisable, structured recipes (servings, ingredients
  with quantities, numbered steps, tips, substitutions), validated server-side.
- Match Score V2 with matching-only pantry assumptions (salt, sugar, basic cooking oil).
- A Recipe Guide for current and older saved recipe shapes.
- Recipe pictures from Pexels search (often do not match the dish; to be replaced in Phase 1).

Paused, code kept: the One-Page Zine and its optional AI artwork (see
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)). Hidden unless `VITE_ZINE_ENABLED=true` (client) and
`ZINE_GENERATION_ENABLED=true` (server).

## Current focus

**Phase 1 — full UI redesign** with Tailwind CSS, following [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
("Ember": cast-iron black, flour-white type, one butter-cream accent) and its mockup. Then Cooking Mode (Phase 2). See [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md).

## Stack

- Frontend: React, Vite, Tailwind CSS (approved 2026-10-22; migration in Phase 1, legacy
  `styles.css` until then), React Router (URLs: `/kitchen`, `/cook`, `/cook/dish/:n`, `/shelf`,
  `/shelf/:id`, `/login`, `/register`), lucide-react, motion, vite-plugin-pwa.
- Hosting note: the built client is a single-page app; the web server must serve `index.html` for
  unknown paths so deep links and refresh work.
- Backend: Node.js, Express, JWT, bcrypt, CORS, dotenv.
- Database: SQLite.
- AI: DeepSeek (recipes, server-side). OpenAI Images (paused Zine artwork and developer tools).

Anything else needs explicit approval. See [RULES.md](RULES.md).

## Local development

Prerequisites: Node.js 18+ and npm.

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

The backend serves `http://localhost:5000`; Vite serves `http://localhost:5173`.

Configuration: copy `server/.env.example` to ignored `server/.env` (secrets: `DEEPSEEK_API_KEY`,
`JWT_SECRET`, `PEXELS_API_KEY`, optional `OPENAI_API_KEY`, `CORS_ORIGINS`) and
`client/.env.example` to ignored `client/.env` (`VITE_API_BASE_URL`, `VITE_ZINE_ENABLED`). Never
commit either `.env` file.

Tests (mocked, no network or paid calls):

```powershell
cd D:\aproject\SmartKitchen\server; npm test
cd D:\aproject\SmartKitchen\client; node --test test/*.mjs
```

Running the client tests re-optimises Vite's dependency cache; reload or restart a running dev
server if it then shows "Outdated Optimize Dep".

## Documentation map

- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md): product truth — positioning, what exists, what is paused.
- [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md): approved phases and priorities.
- [PROJECT_HANDOVER.md](PROJECT_HANDOVER.md): current state, file map and the exact next step.
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): the Ember design system for the redesign.
- [AGENTS.md](AGENTS.md) and [RULES.md](RULES.md): workflow and safeguards.
- `server/ZINE_POC.md`, `server/ZINE_ASSETS_POC.md`: records of the paused image experiments.
- `SMARTKITCHEN_*_v1.md`: historical v1 references only.

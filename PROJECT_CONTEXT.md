# ChefSpark project context

Product truth as of 2026-10-22. Inspect source before relying on any detail.

## Positioning

ChefSpark is an AI cooking companion for beginner cooks who want to use what they already have.
Its job: help someone decide what to cook tonight and get it done without stress.

```text
What I have -> Three dishes I can make tonight -> Cook it step by step -> Save, adjust, repeat
```

Why ChefSpark rather than asking a general chatbot:

1. It remembers the user's kitchen (inventory and pantry staples).
2. Recipes are structured and validated, so amounts and steps stay trustworthy.
3. Matching is transparent: Match Score, You Have, You Need.
4. It accompanies the cooking itself (Cooking Mode, then recipe-aware help).

## Principles

- Structured Recipe JSON is the only source of facts. AI images are illustrations; AI assistant
  answers may explain, but any change to a recipe becomes a new validated version shown to the user.
- Deterministic work stays in code (serving scaling, timers, matching); AI is used where judgement
  or language is needed.
- Every paid AI call has a server-side switch, per-user and global limits, no automatic retries,
  and never exposes keys to the client.
- Beginner-friendly: low effort to start (names, not exact stock), readable while cooking.

## What exists

- Auth (JWT/bcrypt), user ingredient inventory (names; quantity/unit columns exist but the UI stores
  names only), categories and autocomplete, saved recipes (full JSON, legacy shapes supported).
- DeepSeek generation of three structured recipes per request; cuisines limited to Chinese and
  Western; difficulty Easy/Medium/Hard. Results stay in this tab (sessionStorage) until saved.
- Match Score V2, server authoritative. Salt, sugar and basic cooking oil satisfy matching without
  being written to inventory or listed in `youHave`; soy sauce is not a pantry default.
- Recipe Guide (`RecipeDetailPage`) for structured and legacy recipes.
- Images: Pexels search by recipe image prompt; frequently mismatched.
- React Router URLs: `/kitchen`, `/cook`, `/cook/dish/:n` (unsaved dish), `/shelf`, `/shelf/:id`,
  `/login`, `/register`. Protected routes redirect to login and return afterwards; an API 401 signs
  the user out. Tonight's unsaved menu and choices are kept in the tab's sessionStorage.
- PWA via vite-plugin-pwa. Local only; not deployed.

## Paused (code kept, switched off)

- **One-Page Zine** and its **AI artwork**: a saved recipe could get a text-free 2x2 image sheet
  (`gpt-image-2.5-flare`) split into hero, cooking, ingredients and decoration images, stored in
  SQLite (`zines`, `zine_images`, `zine_generations`), with daily limits (3 per user, 30 total).
  Live-tested successfully on 2026-10-19 (prompt allow-lists keep unlisted foods out). Hidden unless
  `VITE_ZINE_ENABLED=true`; generation off unless `ZINE_GENERATION_ENABLED=true`. Its reviewed pricing
  profile expires 2026-11-13, after which generation stays off until pricing is rechecked.
- **Developer image CLIs** (`zine:poc`, `zine:assets`): records of the experiments behind the artwork
  prompt; not to be extended.

The artwork pipeline (allow-list prompts, cropping, limits, cost logging) is the intended starting
point for Phase 4 food images.

## Design

The redesign follows `DESIGN_SYSTEM.md` ("Ember": card-free, cast-iron black, flour-white type, one
butter-cream accent; Instrument Serif / Hanken Grotesk / IBM Plex Mono; spark, plate ring, burners, dial,
order ticket and chef's notes as signature elements) and its mockup. Cooking Mode uses the calm,
high-legibility variant described there.

## Known limits

- Not deployed; the SQLite file path is relative to the server's working directory.
- Local `main` has many commits not on `origin/main` and lacks 5 remote July commits that the user
  decided not to merge. Pushing needs a decision (new branch, or overwriting the remote `main`).
- AI images and answers are not human-reviewed before users see them.

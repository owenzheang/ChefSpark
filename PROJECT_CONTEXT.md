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
- Natural ingredient input (Phase 5, Kitchen): a typed list ("two eggs, half a cabbage and some chicken
  thighs") or speech goes through `parseIngredients` (client, code only: splits on commas/"and", drops
  amounts and filler, matches the catalog with plural forms and a few Australian aliases such as
  capsicum, prawns, mince; unpunctuated speech is split at the longest known names). The cook checks
  the list (near misses flagged "Did you mean this?", unknown words kept as written, items already in
  the kitchen skipped) before anything is saved. A single name is added straight away as before.
  Voice uses the browser's Web Speech API (`en-AU`): free, no server, needs HTTPS or localhost, hidden
  where unsupported (Firefox); the browser's speech service (Chrome: Google) hears the audio, and the
  page says so.
- DeepSeek generation of three structured recipes per request; cuisines limited to Chinese and
  Western; difficulty Easy/Medium/Hard. Results stay in this tab (sessionStorage) until saved.
- Match Score V2, server authoritative. Salt, sugar and basic cooking oil satisfy matching without
  being written to inventory or listed in `youHave`; soy sauce is not a pantry default. Singular and
  plural are the same ingredient, decided in code (`ingredientMatchKey`: "Tomato" covers "tomatoes",
  only the last word changes); synonyms (Spring Onion / Scallion) still need the AI's "same" judgment
  plus the reviewed list.
- Recipe Guide (`RecipeDetailPage`) for structured and legacy recipes, with a servings control
  (amounts rescaled in code; amounts written inside step text are not rewritten and a note says so).
- Cooking Mode (`/cook/dish/:n/cooking`, `/shelf/:id/cooking`): one step per screen, timers detected
  in step text (range → lower bound, "check at 5 min, up to 6"), chime + vibration + screen-reader
  announcement on finish (sound toggle), timers keep running across steps and survive refresh, step
  ingredients at the chosen servings, Screen Wake Lock where supported, "Done" screen with save for
  unsaved dishes. Per-tab state; cleared on sign-out.
- Diet choice on Plan tonight (Any / Vegetarian / Vegan): in the prompt and checked in code against an
  ingredient keyword list; dishes that break it are dropped (no retry) and the user is told.
- Recipe assistant ( off unless `ASSISTANT_ENABLED=true`): fixed changes on the recipe page
  ("I don't have…", simpler & quicker; diet is chosen on Plan tonight, not as an edit) shown as a before/after preview the
  cook accepts or not, and two questions per step in Cooking Mode ("What does this mean?", "How do I
  know it's done?").
  Code decides the edit's size: `minor` (same dish, keeps title and picture), `variant` (main protein or
  staple swapped, or over 30% of ingredients changed: own title, `variantOf`, no picture) or rejected
  (main protein or staple lost, or over 50% changed: "plan a new dish"). At most 3 chained edits
  (`editCount`). The server recalculates the match and the diff and keeps a vegetarian or vegan recipe so (a proposal that breaks it is rejected). Accepting
  replaces an unsaved dish in tonight's menu or saves a saved recipe's version as a new recipe.
  Limits: 20 requests per user and 300 in total per day, one at a time, 30 s, no retries, capped
  answers; step answers are cached for everyone and cache hits are free.
- Food pictures (Phase 4, off unless `FOOD_IMAGES_ENABLED=true`): after Plan tonight returns, the client
  asks `POST /api/food-images` for each dish (the menu never waits). One OpenAI request per new picture
  (`gpt-image-2.5-flare`, 1024x1024 WebP, `FOOD_IMAGE_QUALITY` low by default), short top-down prompt with
  an allow-list of visible ingredients (salt, oil, water, sugar, pepper left out). Pictures go into a
  shared SQLite library (`food_images`) keyed by prompt version, quality, dish name and visible
  ingredients; a dish already pictured is free for everyone, and parallel requests for one dish share
  one paid request. A minor assistant edit keeps the picture; a variant gets its own picture only when
  the cook keeps it (the original stays on screen meanwhile; without one it shows the empty plate).
  Limits per user per day: 6 menu pictures (two menus of three) and 2 variant pictures; 100 in total.
  Failed requests count, never retried; each paid request is logged in `food_image_requests` with a
  usage-based cost estimate. A dish saved before its picture arrived gets it when it lands. Pictures are
  served publicly by random id (`GET /api/food-images/:id.webp`) and shown as a round crop inside the
  plate ring, labelled "AI image"; anything else in `imageUrl` (old Pexels links) shows the empty plate.
  Off when the reviewed pricing profile in `server/src/utils/zinePocConfig.js` expires (2026-11-13).
  Pexels was removed on 2026-10-24.
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

# ChefSpark roadmap

Approved 2026-10-22: ChefSpark refocuses from the Zine to an AI cooking companion. One phase at a
time; each phase ends in a demoable version with passing tests.

## Phases

| Phase | Status | Scope |
| --- | --- | --- |
| 0 · Clean-up and direction | Done (git remote decision pending) | Pause the Zine behind switches; untrack `client/.env` and `client/dist`; rewrite docs; add `DESIGN_SYSTEM.md`. Open decision: how to reconcile local `main` with `origin/main`. |
| 1 · UI redesign | In progress — Ember direction; foundation, router, nav, auth, Kitchen, Plan tonight + results done | Tailwind + design tokens + app shell; migrate Login/Register → Kitchen → Plan tonight → Results → Recipe page → Shelf, following `DESIGN_SYSTEM.md`. Low-cost improvements from the mockup: pantry staples the user toggles, more cuisines with multi-select, "cook now only" filter, typographic covers instead of mismatched stock photos. React Router added (approved 2026-10-23). |
| 1.5 · Deployment | Planned | Online demo with persistent storage for SQLite; `CORS_ORIGINS`, secrets and build set up for production. |
| 2 · Cooking Mode | Planned | One step per screen, large type, timers detected from step text, screen wake lock, progress; serving scaling in code. No AI cost. |
| 3 · Recipe assistant | Planned | Scoped actions first ("I don't have X", dietary change, adjust taste, explain this step). Changes return a new validated recipe version with a visible diff; questions are answered in the recipe's context; daily limits. |
| 4 · Food images | Planned | Provider abstraction and reusable image library keyed by dish plus key visible ingredients (not title alone); compare OpenAI and Jimeng on accuracy, cost and terms before choosing; re-check pricing. |
| 5 · Natural ingredient input | Planned | Free-text parsing to a confirmable list, then voice (browser speech recognition); photo recognition only if justified. |

## Parked

n8n automation (e.g. weekly plan email, shopping-list export), Zine share cards ("save as image"),
exact stock tracking, credits/payments, open-ended chat.

## Completed history (earlier phases)

- 1–5: recommendation-first generation, backend matching and validation, structured recipes with
  legacy compatibility, previews and Recipe Guide, ingredient catalog and autocomplete, Match Score V2.
- 6A–6B.2: developer image experiments (Discover edit; text-free asset sheet with allow-list prompts).
- 6B.1, 6B.3, 6C: One-Page Zine prototype and user-facing AI artwork with limits; live-tested
  2026-10-19; paused 2026-10-22.

## Decisions that stay fixed

- Recipe JSON is factual; AI output never silently changes facts.
- Deterministic tasks are done in code, not by AI.
- Paid AI features ship with switches, limits and no automatic retries.
- Users do not maintain exact stock to use the app.

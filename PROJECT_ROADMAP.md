# ChefSpark roadmap

## Completed product work

| Phase | Status | Outcome |
| --- | --- | --- |
| 1 | Complete | Recommendation-first recipe generation and backend matching foundation. |
| 2 | Complete | Structured Recipe JSON, validation, matching adaptation, and legacy saved-recipe compatibility. |
| 3 | Complete | Compact previews and Recipe Guide using the structured fields. |
| 4 | Complete | Ingredient categories and smart autocomplete. |
| 5 | Complete historical UI | Discover/Cook/Finish sample Zine UI and sample assets. Those assets remain references; the active format changed. |
| Match Score V2 | Complete | Conservative equivalence matching while backend matching remains authoritative. |
| 6A | Complete PoC | Local, safeguarded Discover-image CLI. One real paid reference-edit request was completed; it is not product integration. |
| 6B.1 | Complete frontend prototype | Responsive One-Page Hybrid Zine with HTML facts, legacy compatibility, and stable random `collage`, `notebook`, or `journal` style assignment. |
| 6B.2 implementation | Complete | Local, reference-free text-free asset-sheet CLI, quadrants/crops, reports, mocked coverage, and dry-runs. |
| 6B.2 live test | Complete; reviewed | One paid `collage` sheet (2026-10-15, estimate USD 0.016, not billed cost). Cooking, ingredients and decoration crops usable; hero rejected for unlisted egg. See `server/ZINE_ASSETS_POC.md`. |

## Active next step

**Phase 6B.3 — hybrid frontend integration prototype with the three reviewed crops.** Direction chosen by the user on 2026-10-19; the implementation plan needs approval before coding.

1. Agree where the reviewed crops live in the client and how One-Page Zine places them.
2. Integrate them as development samples; leave the rejected hero out.
3. Visually check the layout; recipe facts remain HTML text.
4. Decide whether to refine the hero prompt (a separately approved paid request) or continue integration.

Do not expose a generation endpoint, add persistence, or make paid requests as part of this step.

## Later, separately approved only when scoped

- Persisted Zines that store `styleId`, style/prompt/recipe versions, ownership, and status outside Recipe JSON.
- Cloud object storage and generation-state/duplicate/rate-limit/credit safeguards.
- User-facing generation, credits, sharing/export, and stronger production operations.

## Decisions that remain fixed

- Recipe JSON is factual; visuals are presentation.
- One-page Zine is the active format, not a three-page production flow.
- Users do not choose a visual style manually; selection is stable per Zine identity.
- No fuzzy matching, schema rewrite, or broad platform change without approval.

# Phase 6B.2 — Text-free asset sheet experiment

Developer CLI only. No frontend connection, public endpoint, database or paid test during implementation.
Phase 6A retains its command, portrait edit request, prompt, confirmation and defaults.
Only two existing file/usage helpers are additionally exported for reuse.

Current status: one paid collage asset sheet was generated on 2026-10-15 and manually reviewed
on 2026-10-19 (see "First live result" below). Three of four crops passed review; the hero failed
food accuracy. No output is connected to the frontend yet. This tool is separate from the active
One-Page Zine frontend prototype.

## Request and inputs

Official OpenAI docs reviewed 2026-10-15 support `gpt-image-2.5-flare`, medium,
1024x1024 PNG, `n: 1`, via `POST /v1/images/generations` (JSON body).
No `response_format`, `input_fidelity`, or legacy API `style` parameter is sent.
Style is expressed in the prompt, using the existing frontend style IDs/art directions.

- collage: cream/olive/brick scrapbook, torn paper and dynamic collage.
- notebook: oat/moss/terracotta, sketches and pinned photos.
- journal: ivory/forest/dusty rose, refined food editorial and restrained decoration.

The only structured fixture found was `test/fixtures/chicken-fried-rice.json`; it is used unchanged.
No genuine Soy Sauce Chicken Wings fixture was available. A different reviewed structured JSON
inside the project can be supplied with `--recipe <path>`. No SQLite access or recipe invention.

Reference mode is deliberately **none**. The Teriyaki sample includes abundant text and dish-specific
facts, increasing contamination risk. This reference-free experiment trades exact sample fidelity
for a lower risk of unwanted words. Reference flags are rejected, not silently ignored.
All original sample assets are retained. Ingredients and steps are context, never rendered text.
The model is asked to choose one explicitly supplied step for the cooking scene.

## Configuration and commands

Run from `D:\aproject\SmartKitchen\server`. Existing ignored `.env` is read only.
Keep the existing manually configured `OPENAI_API_KEY`; never put it in terminal arguments.

Required: `OPENAI_IMAGE_MODEL=gpt-image-2.5-flare`, `OPENAI_IMAGE_QUALITY=medium`,
and a positive `ZINE_POC_MAX_COST_USD` (for example `0.50`). Optional `ZINE_ASSET_SIZE=1024x1024`;
other asset sizes are rejected. The Phase 6A `OPENAI_IMAGE_SIZE` portrait setting is not changed
and does not control this separate asset command. The existing pricing profile expires 2026-11-13.

Default dry-run (no network, no image/report writes):

```powershell
npm run zine:assets -- --style=collage --dry-run
```

`--style=notebook` and `--style=journal` are also supported. Style must be explicit.

Future test **only after explicit user approval**, from an interactive local terminal:

```powershell
npm run zine:assets -- --style=collage --execute --acknowledge-paid --allow-unverified-cost
```

Immediately before sending, manually type:

```text
GENERATE ONE ASSET SHEET WITH UNVERIFIED COST
```

Piped input, a different answer, or absent confirmation sends nothing. Normal execution without
the unverified-cost flag remains blocked. No automatic retries; every rerun can be another charge.
The configured budget is **not enforced or guaranteed** in override mode. Total pre-request cost
is unknown; the earlier Phase 6A observation is not a prediction for this different workload.
The request times out after three minutes and refuses redirects. A timeout/error can still be billed.
Do not retry before inspecting local reports and account billing.

## Local output and cropping

Output is under ignored `server/generated-zines/assets-poc/`, using timestamp + UUID filenames:
`-sheet.png`, `-hero.png`, `-cooking.png`, `-ingredients.png`, `-decoration.png`, and `.json`.
Exclusive writes prevent overwrites; output paths reject traversal and symlink/junction directories.
A pending report is written before confirmation. The original response is retained even when cropping
fails, for manual diagnosis; failure reports distinguish successfully saved paths. Do not treat a
retained failed sheet as a validated PNG or usable asset.

`pngjs@7.0.0` is a development-only, pure-JavaScript PNG decoder/encoder used for pixel cropping.
No native image service, OCR, resizing or AI region detection. PNG integrity and exact 1024x1024
dimensions are checked before crops. Quadrants (x, y, width, height):

| Asset | Rectangle |
| --- | --- |
| Hero | 0, 0, 512, 512 |
| Cooking | 512, 0, 512, 512 |
| Ingredients | 0, 512, 512, 512 |
| Decoration | 512, 512, 512, 512 |

Reports include title, style, settings, requested/validated dimensions, generation duration (excluding
manual confirmation and cropping on success), usage counters when available, crop coordinates, paths,
result, override status and manual-review requirement. No keys, headers or full prompt.
Usage-based USD estimate: `(textInput * 5 + imageInput * 8 + imageOutput * 30) / 1000000`.
This is a standard-rate estimate, not exact billing. Missing counters yield null; actualCost stays null.

## Verification and limitations

`npm test` includes synthetic PNG quadrant tests, mocked request/confirmation/output tests and all
Phase 6A regression tests. No paid requests in tests, builds or startup.
Geometric crops guarantee coordinates only. The model may produce text, wrong ingredients, gutters,
objects crossing boundaries, or a scene inconsistent with the recipe. No automatic detection is claimed.
Manually review the full sheet AND each crop before any frontend use. Each crop is only 512x512.
The sparse fixture limits the specificity of the cooking scene.

## First live result

One paid request through the interactive override, recorded in the ignored local report
`server/generated-zines/assets-poc/assets-2026-10-15T13-34-52-969Z-beb5196f-dab4-42eb-9c48-f2c96ae52b69.json`.
The run was not recorded in project docs at the time; this section was added from that report.

- 2026-10-15T13:34:52Z, `collage`, `gpt-image-2.5-flare`, medium, 1024x1024, no reference,
  Chicken Fried Rice fixture, manual confirmation received, `result: success`, 0 retries, ~17 s.
- Usage: 552 text input tokens, 0 image input, 439 image output tokens. Usage-based estimate
  USD 0.01593 — an estimate, not billed cost; `actualCost` is null. Check account billing.
- Sheet and all four crops saved; PNG and 1024x1024 dimensions validated before cropping.

Manual review (2026-10-19) of the full sheet and every crop:

| Crop | Food accuracy | Unwanted text | Crop boundary | Verdict |
| --- | --- | --- | --- | --- |
| Hero | Fail: egg-like yellow pieces despite the explicit "no eggs" instruction; rice colour suggests soy sauce, which is not listed | None | Clean | Rejected |
| Cooking | Pass: chicken pieces in a pan, matching step 2 "Cook the chicken" | None | Clean | Usable |
| Ingredients | Pass: chicken, rice and salt only | None | Clean | Usable |
| Decoration | n/a (non-food) | None; stamp has no lettering | Clean | Usable |

Findings: the 2x2 layout, text-free constraint and collage art direction held. The negative
ingredient instruction did not hold for the finished-dish quadrant, so prompt wording alone does
not guarantee food accuracy. This is a single sample and does not establish consistency across
recipes or styles.

## Hero prompt revision (2026-10-19)

Approved changes to `buildAssetPrompt`, applying to every recipe and style:

- The hero line now gives an explicit allow-list built from the JSON ingredient names (as a quoted
  JSON array, so names stay data) and forbids any other visible food.
- A new line tells the model to ignore ingredients commonly associated with the dish title.
- The negative rule now names egg in any form, sauce colouring (soy-sauce browning), vegetables,
  green onion, peas, carrots, sesame, chilli, herbs, garnish and side dishes, unless listed.
- A final line asks the model to re-check the top-left quadrant before finishing.

Mocked tests cover the new text. Collage dry-run: 3106 prompt characters (previously 2471), no network,
no writes. Expected usage-based estimate for one live request is about USD 0.017 (roughly 700 text
input and ~440 image output tokens at the reviewed rates), unverified before sending. A live run
needs separate explicit user authorization and the interactive confirmation; if egg persists, the next
lever is withholding the dish title from the hero instruction.

Sources:
- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
- https://developers.openai.com/api/reference/resources/images/methods/generate

### Second live result (revised prompt)

Report: `server/generated-zines/assets-poc/assets-2026-10-19T11-29-02-914Z-ecad0a78-65ae-4867-8cb2-8908f15db993.json`.
Run by the user after explicit authorization; prompt hash matches the reviewed dry-run.

- 2026-10-19T11:29:02Z, `collage`, `gpt-image-2.5-flare`, medium, 1024x1024, no reference, manual
  confirmation received, `result: success`, 0 retries, ~31 s.
- Usage: 681 text input, 0 image input, 439 image output tokens. Usage-based estimate USD 0.016575
  (not billed cost; `actualCost` null).

Manual review (2026-10-19):

| Crop | Food accuracy | Unwanted text | Crop boundary | Verdict |
| --- | --- | --- | --- | --- |
| Hero | Pass: only chicken pieces and pale rice; no egg, sauce colouring, vegetables or garnish | None | Clean | Usable |
| Cooking | Pass: chicken with rice grains in a pan, matching step 3 "Add the rice"; a fingertip and spatula handle enter at the top-right outer edge | None | Clean internal edges | Usable |
| Ingredients | Pass: chicken breast, rice and salt only | None | Clean | Usable |
| Decoration | n/a (non-food) | None | Clean | Usable |

Findings: the allow-list and title-association guard removed the unlisted egg and soy-sauce colouring
in this sample. Trade-off: the food quadrants are plainer, with less collage treatment (no torn-paper
corners) than the first sheet. Still a single sample per prompt version; consistency across recipes and
styles is not established.

### Style coverage with the revised prompt (notebook, journal)

Both run by the user after authorization on 2026-10-19, `gpt-image-2.5-flare`, medium, 1024x1024, no
reference, manual confirmation received, `result: success`, 0 retries. Usage-based estimates are not billed cost.

- notebook: `assets-2026-10-19T11-41-38-831Z-d14c8db3-9771-41ee-a64f-071ac1206723`, 682 text in / 439 image out, ~USD 0.01658, ~22 s.
- journal: `assets-2026-10-19T11-44-18-283Z-9c7e92fa-e9b4-42fd-9100-34aac1ee0af9`, 680 text in / 439 image out, ~USD 0.01657, ~14 s.

| Style | Crop | Food accuracy | Unwanted text | Crop boundary | Verdict |
| --- | --- | --- | --- | --- | --- |
| notebook | Hero | Pass: chicken and rice only; rice slightly golden but no egg pieces, sauce or garnish | None | Clean | Usable |
| notebook | Cooking | Pass: chicken browning, matching step 2 | None | Clean | Usable |
| notebook | Ingredients | Pass: chicken breast, rice, salt | None | Clean | Usable |
| notebook | Decoration | n/a; includes a pinned mountain-landscape photo and an ink leaf sprig (unrelated but non-food) | None | Clean | Usable, caveat |
| journal | Hero | Pass for the food | None | **Fail**: a leaf sprig from the ingredients quadrant crosses into the bottom-left corner | Not usable as-is |
| journal | Cooking | Pass for the pan (chicken, step 2); a potted plant sits in the background | None | Clean | Usable, caveat |
| journal | Ingredients | **Fail**: three botanical sprigs (one with berries) beside chicken, rice and salt can read as herbs, which are not listed; top sprig is cut by the boundary | None | **Fail** | Rejected |
| journal | Decoration | n/a | None | Clean | Usable |

Findings: the hero allow-list held in all three styles; no egg or sauce colouring appeared. The new failure
is style-driven: journal's "botanical accents" art direction places leaves and sprigs in the food
quadrants, where they look like ingredients and cross quadrant boundaries. Notebook's style is only
weakly expressed in the food quadrants (green cloth backdrop, no ruled-paper or pencil treatment).
Suggested fix: confine style decorations such as leaves, sprigs, stamps and pinned photos to the
bottom-right quadrant and forbid plants in the three food quadrants, then re-test journal.

### Decoration-confinement revision (2026-10-19, not yet tested live)

`buildAssetPrompt` now adds, after the style art direction, a rule that the treatment applies to palette,
paper, lighting and drawing or photographic style everywhere, but decorative elements (leaves, sprigs,
flowers, botanical accents, stamps, tape, pinned photographs, ink marks) appear ONLY in the bottom-right
quadrant, and the three food quadrants contain no plants of any kind, in the food or the background. The
final self-check also asks the model to remove plants, decorations and boundary-crossing objects from the
food quadrants. Mocked tests cover all three styles. Dry-runs: collage 3649, notebook 3655, journal 3651
prompt characters; no network, no writes. Expected estimate about USD 0.017 per request, unverified.
Next live check: one journal sheet, with separate user authorization.

# Discover Zine developer proof of concept

Frontend-independent CLI; no endpoint, database writes, generation button integration,
automatic retries, or background generation. Node 18+ native fetch/FormData/Blob and the
existing dotenv package are used. No new dependencies.

This historical Phase 6A experiment is not the active Zine UI. ChefSpark's active direction
is a One-Page Hybrid Zine whose factual text is rendered by React; this CLI's image remains
visual presentation only.

## Before another paid test

The initial implementation was tested with mocks and dry-run. One real paid request was
subsequently completed successfully using the controlled override described below. Obtain
explicit approval before every further real call. Review the full recipe and prompt builder first.
The PNG is presentation, never the factual recipe source.

Configure these variables manually in ignored, untracked `server/.env`. Preserve all
existing DeepSeek and other settings. Never put the key in frontend configuration,
source, terminal command arguments, documentation, or Git.

- `OPENAI_API_KEY`: your manually configured key (required only for execution).
- `OPENAI_IMAGE_MODEL=gpt-image-2.5-flare`: explicitly required; selected newer model.
- `OPENAI_IMAGE_QUALITY=medium`: explicitly required; low, medium, high accepted.
- `OPENAI_IMAGE_SIZE=1024x1536`: optional; this portrait resolution is fixed for the PoC.
- `ZINE_POC_MAX_COST_USD=0.50`: explicitly required positive estimated request budget, in USD.

The script loads server/.env regardless of working directory. Existing shell variables
take precedence. It never writes or prints credentials. Confirm billing, model access,
and any organization verification requirements separately; dry-run makes no network
calls and cannot verify account access.

**Normal paid execution is blocked:** official documentation reviewed on 13 October
2026 confirms Flare supports image editing, but a complete pre-request cost estimate
for reference-image input has not been verified. Dry-run validates the recipe, PNG and
settings and reports `costEstimateVerified: false` with a null total estimate.
Neither the normal paid flags nor a larger budget bypass this block. A separate local-only
controlled-test override is described below; it acknowledges uncertainty, not a verified estimate.
The local pricing-review deadline is 13 November 2026, not a model shutdown date.

Flare is selected as the current fast, high-quality image model supporting reference
editing. GPT Image 2 was also reviewed: switching to it does not resolve the missing
verified input-token estimate. The old GPT Image 1 tile formula and output-token counts
must not be reused for either newer model. This PoC accepts low/medium/high only;
Flare's additional xhigh/max options are intentionally outside its narrow settings.

## Commands

Run from `D:\aproject\SmartKitchen\server`.

Dry-run (default; no API call and no output files):

```powershell
npm run zine:poc
# Explicit equivalent:
npm run zine:poc -- --dry-run
```

Use a developer-reviewed structured recipe exported inside this project:

```powershell
npm run zine:poc -- --recipe ./path/to/recipe.json
```

Only after the cost-estimation blocker is resolved AND explicit paid-test approval
(currently this command refuses to send):

```powershell
npm run zine:poc -- --execute --acknowledge-paid
```

### Controlled first test with unverified cost

After explicit human approval, use a local interactive terminal:

```powershell
npm run zine:poc -- --execute --acknowledge-paid --allow-unverified-cost
```

This exception requires exactly `gpt-image-2.5-flare`, medium quality, 1024x1536,
one output and the existing reference. It cannot be enabled by an environment variable
or public route. Both stdin and stdout must be terminals; piped confirmations are refused.
Immediately before the request, read the cost warning and manually type exactly:

```text
GENERATE ONE IMAGE WITH UNVERIFIED COST
```

Anything else, EOF, or cancellation sends no request. The normal execution path still
requires a verified estimate within budget. For this exception, `ZINE_POC_MAX_COST_USD`
remains required configuration but is **not enforced and is not a guaranteed ceiling**.
Exact total cost is unknown before sending. There is no automatic retry. Each invocation
is a separate potentially billable attempt, not a lifetime one-use allowance. Do not rerun
after a failure without checking the local report and OpenAI billing first.

Before approval: review the unchanged fixture/prompt and reference, confirm billing/model
access, set the non-secret model/quality/size variables above, and run dry-run. Do not paste
the key into terminal commands. No live execution was performed during the initial
implementation. The later successful request is a single local PoC result, not proof of
general quality, account availability, or exact billed cost.

Reports record override use, manual confirmation, `costEstimateVerified: false`, and
`estimatedBudgetEnforced: false`. Available numeric usage includes text/image inputs,
output details and total tokens. When present, explicit image output tokens are used;
otherwise output_tokens is used for this image-only model. Missing counters yield a null
cost estimate, never zero. Observed standard-rate estimate in USD:
`(textInput * 5 + imageInput * 8 + imageOutput * 30) / 1000000`.
This is not an exact billed amount; `actualCost` remains null. Check account billing.

The two flags are independent gates. Neither test, build, server startup nor dry-run
can trigger paid execution. Unknown flags (including image-count overrides) are rejected.
Each invocation makes at most one request for exactly one image. Re-running the paid
command is a new billable attempt, so inspect local reports and account usage first.

## Recipe and prompt

`test/fixtures/chicken-fried-rice.json` is the existing structured validation test recipe,
extracted without changing its values. It is not a newly invented recipe or a saved
user record. Existing validation tests now share that fixture.

The unchanged fixture is intentionally basic: Salt has no quantity, no introduction is
supplied, and the instructions are sparse. Its old matching fields are not sent to the
image model. Use a reviewed real saved export for a meaningful cooking-quality evaluation;
the CLI never fills in missing facts or queries SQLite.

The existing structured validator runs before prompt creation. Only recipe factual fields
are sent, retaining quantities, units, steps, tips and substitutions. No scaling, unit
conversion, added safety facts, or enrichment takes place. Null quantities are explicitly
marked unspecified. Unsupported ingredients, steps or excessive prompts fail before sending.

## Reference and output

The unmodified `client/public/zine-samples/discover.png` is read locally, checked as a PNG,
and sent as multipart `image` to `POST https://api.openai.com/v1/images/edits`.
It is a style reference, not a source of Teriyaki facts. Parameters: one image,
1024x1536 portrait, PNG output, explicit model and quality. `input_fidelity` is omitted:
the old low-fidelity override is not carried into the newer model request.
GPT Image returns `data[0].b64_json`; URL outputs are not followed.

Outputs go to ignored `server/generated-zines/poc/`:

- `discover-<timestamp>-<uuid>.png`
- `discover-<timestamp>-<uuid>.json`

Names are independent of recipe text; exclusive creation prevents overwrites. Output
paths are restricted to that directory and reject symlinks/junctions. Input paths must
resolve within this project. A pending report is written before sending so interrupted
attempts are visible. Success/failure reports contain settings, time, title, hashes,
duration, numeric usage when available, and estimates. They omit keys, headers, raw
API error bodies and prompt contents. Validation failures and dry-run do not write reports.

## Estimated-cost protection

Reviewed standard USD rates for gpt-image-2.5-flare:
text input $5/million tokens; image input $8/million; image output $30/million.
Direct Images API edits do not receive cached-input pricing.

- Text allowance: full prompt UTF-8 bytes plus 1,024 tokens for overhead. This is
  deliberately conservative, not an exact tokenizer count.
- Reference and output token estimates remain null, not zero. Published token rates
  and output-only calculators do not establish a complete reference-edit estimate.
- No estimated dollar total is claimed. The earlier $0.105044 GPT Image 1 estimate
  is invalid for Flare and has been removed.
- Execution requires a verified positive finite total within the configured ceiling.
  Until a reliable model-specific estimator is implemented, normal live execution is blocked;
  only the explicitly confirmed controlled-test exception may proceed with unknown cost.

Missing, expired, unsupported or over-budget estimates block execution. Auto quality
and automatic sizes are not allowed. This is a **local estimated-cost gate, not an
OpenAI-enforced billing cap**. Taxes, account-specific adjustments and billing changes
are not included; verify current pricing before approving. Afterward, numeric response
usage provides a better labeled estimate if all required counters exist.
The Images response has no documented billed-dollar field, so `actualCost` stays null.

Requests time out after three minutes and refuse redirects. There is no SDK retry
mechanism and no retry loop. Timeouts, connection failures, invalid responses or a local
write failure may occur after billing: do not assume a failure is free.

## Verification and limitations

`npm test` uses injected fetch mocks and synthetic local PNGs, never live requests.
Transport/storage tests use a synthetic cost fixture, not a purported Flare estimate.
The CLI exposes no cost override; a mock estimator with the live transport is rejected.
Separate tests confirm the real estimator blocks acknowledged execution before writes.
Tests clean up their own unique mock directories.
Generated text and facts can still be wrong despite the prompt: manually compare every
quantity, time and ingredient to the JSON before treating an image as usable.
One live request has demonstrated this particular local path can complete, but it does not
establish broad quality, account access, latency, or exact billed cost. Review the ignored
local report and account billing before considering any further paid invocation.
No full three-page or user-facing system is included.

Official sources reviewed 2026-10-13:

- [Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
- [Images API reference](https://developers.openai.com/api/reference/resources/images)
- [Image edits](https://developers.openai.com/api/reference/resources/images/methods/edit)
- [GPT Image 2.5 Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare)
- [GPT Image 2](https://developers.openai.com/api/docs/models/gpt-image-2)
- [Current pricing](https://developers.openai.com/api/docs/pricing)
- [Image-input sizing](https://developers.openai.com/api/docs/guides/images-vision)
- [Deprecation schedule](https://developers.openai.com/api/docs/deprecations)

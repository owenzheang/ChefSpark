import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { buildAssetPrompt, splitAssetSheet } from "../src/utils/zineAssets.js";
import { runAssetPoc, parseAssetArgs, assetsRoot } from "../src/services/zineAssetsService.js";
import { defaultRecipePath } from "../src/services/zinePocService.js";
import { confirmAssetPaid, assetConfirmationPhrase } from "../scripts/zine-assets.js";
import { zineStyles } from "../../client/src/data/zineStyles.js";

const recipe = JSON.parse(await readFile(defaultRecipePath, "utf8"));
const now = new Date("2026-10-15T12:00:00Z");
const env = { OPENAI_IMAGE_MODEL: "gpt-image-2.5-flare", OPENAI_IMAGE_QUALITY: "medium",
  OPENAI_IMAGE_SIZE: "1024x1536", ZINE_POC_MAX_COST_USD: ".5", OPENAI_API_KEY: "test-secret-do-not-log" };
const paid = ["--style=collage", "--execute", "--acknowledge-paid", "--allow-unverified-cost"];
const noNetwork = () => { throw new Error("Unexpected network call"); };
const run = options => runAssetPoc({ args: ["--style=collage"], env, now, fetchImpl: noNetwork, log: () => {}, ...options });
async function workspace(t) {
  await mkdir(assetsRoot, { recursive: true });
  const directory = await mkdtemp(path.join(assetsRoot, "mock-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
function sheet(width = 1024, height = 1024) {
  const image = new PNG({ width, height });
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    image.data.set([x < width / 2 ? 20 : 80, y < height / 2 ? 40 : 120, 200, 255], offset);
  }
  return PNG.sync.write(image);
}
const bytes = sheet();
const response = (patch = {}) => ({ ok: true, json: async () => ({
  data: [{ b64_json: bytes.toString("base64") }],
  usage: { input_tokens: 2000, input_tokens_details: { text_tokens: 1000, image_tokens: 1000 },
    output_tokens: 1000, output_tokens_details: { image_tokens: 1000, text_tokens: 0 }, total_tokens: 3000 },
  ...patch
}) });

test("asset prompt validates recipe and reuses all frontend style directions without mutation", () => {
  const before = JSON.stringify(recipe);
  for (const style of zineStyles) {
    const prompt = buildAssetPrompt(recipe, style.id);
    assert.ok(prompt.includes(style.artDirection));
    assert.match(prompt, /No recipe text.*no labels.*no numbers.*no readable words.*no logos.*no watermarks.*no fake typography/);
    assert.match(prompt, /unrelated foods or unsupported ingredients/);
    assert.match(prompt, /Top left:.*finished dish/);
    assert.match(prompt, /Top right:.*ONE actual supplied recipe step/);
    assert.match(prompt, /Bottom left:/); assert.match(prompt, /Bottom right:/);
    const facts = JSON.parse(prompt.split("RECIPE_JSON:\n\n")[1]);
    assert.deepEqual(facts.ingredients, recipe.ingredients);
    assert.deepEqual(facts.steps, recipe.steps);
    assert.equal(facts.substitutions, undefined);
  }
  assert.equal(JSON.stringify(recipe), before);
  assert.throws(() => buildAssetPrompt({}, "collage"), /Invalid structured/);
  assert.throws(() => buildAssetPrompt(recipe, "bogus"), /Unsupported/);
});

test("hero prompt allow-lists only JSON ingredients and counters dish-title associations", () => {
  const prompt = buildAssetPrompt(recipe, "collage");
  assert.ok(prompt.includes('The ONLY visible foods are these listed ingredients: ["Chicken","Rice","Salt"].'));
  assert.match(prompt, /Ignore those associations; depict only the listed ingredients/);
  assert.match(prompt, /no egg in any form \(no yellow scrambled pieces\)/);
  assert.match(prompt, /no sauces or sauce colouring \(no soy-sauce browning\)/);
  assert.match(prompt, /re-check the top-left quadrant/);
  assert.ok(prompt.indexOf("re-check the top-left") < prompt.indexOf("RECIPE_JSON:"));
  for (const style of zineStyles) {
    const styled = buildAssetPrompt(recipe, style.id);
    // Decorations are confined to the decoration quadrant, after the style's art direction.
    assert.ok(styled.indexOf(style.artDirection) < styled.indexOf("place decorative elements"));
    assert.match(styled, /decorative elements \(leaves, sprigs, flowers, botanical accents, stamps, tape, pinned photographs, ink marks\) ONLY in the bottom-right quadrant/);
    assert.match(styled, /top-left, top-right and bottom-left quadrants contain no plants of any kind: no leaves, sprigs, flowers or potted plants, in the food or the background/);
    assert.match(styled, /re-check the three food quadrants: remove any plant or decorative element and anything crossing a quadrant boundary/);
  }
  const custom = { ...recipe, ingredients: [{ name: "Egg", quantity: 2, unit: "" }, { name: "Rice", quantity: 1, unit: "cup" }] };
  assert.ok(buildAssetPrompt(custom, "notebook").includes('listed ingredients: ["Egg","Rice"].'));
  const quoted = { ...recipe, ingredients: [{ name: 'Rice "basmati"', quantity: 1, unit: "cup" }] };
  assert.ok(buildAssetPrompt(quoted, "journal").includes('["Rice \\"basmati\\""]'));
});

test("asset dry-run validates settings, no reference, redacted summary and zero API calls", async () => {
  for (const style of zineStyles) {
    let calls = 0;
    const result = await run({ args: [`--style=${style.id}`, "--dry-run"],
      fetchImpl: () => { calls++; }, confirmPaid: noNetwork });
    assert.equal(calls, 0);
    assert.equal(result.result, "dry-run");
    assert.equal(result.summary.parameters.size, "1024x1024");
    assert.equal(result.summary.parameters.n, 1);
    assert.deepEqual(result.summary.reference, { mode: "none", count: 0 });
    assert.equal(result.summary.costEstimateVerified, false);
    assert.doesNotMatch(JSON.stringify(result), /test-secret|Chicken Fried Rice|200/);
  }
  for (const patch of [{ OPENAI_IMAGE_MODEL: "gpt-image-2" }, { OPENAI_IMAGE_QUALITY: "high" },
    { ZINE_ASSET_SIZE: "1023x1024" }, { ZINE_POC_MAX_COST_USD: "" }]) {
    await assert.rejects(run({ env: { ...env, ...patch } }), /configuration/);
  }
  await assert.rejects(run({ now: new Date("2026-11-13") }), /configuration/);
  await assert.rejects(run({ args: ["--style=collage", "--recipe", "not-present.json"] }), /Invalid recipe/);
});

test("strict flags, normal cost gate, missing key and CLI-only capability block execution", async () => {
  for (const args of [[], ["--style=bad"], ["--style=collage", "--style=journal"],
    ["--style=collage", "--reference=discover"], ["--style=collage", "--n=2"],
    ["--style=collage", "--allow-unverified-cost"], [...paid, "--dry-run"]]) {
    assert.throws(() => parseAssetArgs(args));
  }
  assert.equal(parseAssetArgs(["--style", "journal"]).style, "journal");
  await assert.rejects(run({ args: ["--style=collage", "--execute"] }), /acknowledge-paid/);
  await assert.rejects(run({ args: paid.slice(0, -1) }), /Unverified cost/);
  await assert.rejects(run({ args: paid, env: { ...env, OPENAI_API_KEY: "" } }), /API_KEY is missing/);
  await assert.rejects(run({ args: paid }), /CLI only/);
  await assert.rejects(run({ args: paid, fetchImpl: globalThis.fetch, confirmPaid: async () => true }), /CLI only/);
});

test("manual terminal confirmation is exact and rejects piped input", async () => {
  assert.equal(await confirmAssetPaid({ input: {}, output: {}, openTerminal: noNetwork }), false);
  for (const answer of ["yes", "", assetConfirmationPhrase, assetConfirmationPhrase + " "]) {
    let closed = false;
    const accepted = await confirmAssetPaid({ input: { isTTY: true }, output: { isTTY: true },
      openTerminal: () => ({ question: async warning => {
        assert.match(warning, /1024x1024, no reference/);
        assert.match(warning, /NOT enforced and NOT a guaranteed ceiling/);
        return answer;
      }, close: () => { closed = true; } }) });
    assert.equal(accepted, answer === assetConfirmationPhrase); assert.equal(closed, true);
  }
});

test("quadrant extraction preserves exact pixel boundaries with no resize", () => {
  const crops = splitAssetSheet(bytes);
  const colors = [[20, 40, 200, 255], [80, 40, 200, 255], [20, 120, 200, 255], [80, 120, 200, 255]];
  assert.deepEqual(crops.map(crop => [crop.name, crop.x, crop.y]), [
    ["hero", 0, 0], ["cooking", 512, 0], ["ingredients", 0, 512], ["decoration", 512, 512]
  ]);
  crops.forEach((crop, i) => {
    const decoded = PNG.sync.read(crop.bytes);
    assert.equal(decoded.width, 512); assert.equal(decoded.height, 512);
    for (let offset = 0; offset < decoded.data.length; offset += 4) {
      assert.deepEqual([...decoded.data.subarray(offset, offset + 4)], colors[i]);
    }
  });
  for (const bad of [Buffer.from("bad"), sheet(1023, 1024), sheet(1024, 1536), bytes.subarray(0, 100)]) {
    assert.throws(() => splitAssetSheet(bad));
  }
});

test("one confirmed request saves original plus four crops and sanitized usage report", async t => {
  const directory = await workspace(t);
  const events = [];
  const result = await run({ args: paid, outputDirectory: directory,
    confirmPaid: async () => { events.push("confirm"); return true; },
    fetchImpl: async (url, request) => {
      events.push("fetch");
      assert.equal(url, "https://api.openai.com/v1/images/generations");
      assert.equal(request.redirect, "error");
      const body = JSON.parse(request.body);
      assert.equal(body.n, 1); assert.equal(body.size, "1024x1024");
      assert.equal(body.model, "gpt-image-2.5-flare"); assert.equal(body.quality, "medium");
      assert.equal(body.image, undefined); assert.equal(body.style, undefined);
      assert.equal(body.response_format, undefined);
      return response();
    } });
  assert.deepEqual(events, ["confirm", "fetch"]);
  const files = await readdir(directory);
  assert.equal(files.filter(file => file.endsWith(".png")).length, 5);
  const original = files.find(file => file.endsWith("-sheet.png"));
  assert.deepEqual(await readFile(path.join(directory, original)), bytes);
  const report = JSON.parse(await readFile(result.reportPath, "utf8"));
  assert.equal(report.result, "success"); assert.equal(report.crops.length, 4);
  assert.equal(report.usageCostEstimate.amount, .043);
  assert.match(report.usageCostEstimate.kind, /estimate, not billed/);
  assert.equal(report.usage.total_tokens, 3000); assert.equal(report.actualCost, null);
  assert.equal(report.estimatedBudgetEnforced, false);
  assert.equal(report.manualVisualReviewRequired, true);
  assert.doesNotMatch(JSON.stringify(report), /test-secret|Bearer/);
});

test("cancellation never sends; API failures never retry or expose raw secrets", async t => {
  for (const confirmation of [async () => false, async () => { throw Error(env.OPENAI_API_KEY); }]) {
    let calls = 0;
    await assert.rejects(run({ args: paid, outputDirectory: await workspace(t), confirmPaid: confirmation,
      fetchImpl: () => { calls++; } }), /No request sent/);
    assert.equal(calls, 0);
  }
  for (const mock of [async () => { throw Error(env.OPENAI_API_KEY); },
    async () => ({ ok: false, status: 429, text: async () => env.OPENAI_API_KEY })]) {
    const directory = await workspace(t); let calls = 0;
    await assert.rejects(run({ args: paid, outputDirectory: directory, confirmPaid: async () => true,
      fetchImpl: async () => { calls++; return mock(); } }), /No retry|no retry/);
    assert.equal(calls, 1);
    const report = await readFile(path.join(directory, (await readdir(directory))[0]), "utf8");
    assert.doesNotMatch(report, /test-secret|Bearer/);
  }
});

test("invalid response dimensions or count fail without crops; absent usage stays unknown", async t => {
  for (const data of [[], [{ url: "https://example.com/not-followed" }], [{ b64_json: sheet(1023, 1024).toString("base64") }],
    [{ b64_json: bytes.toString("base64") }, { b64_json: bytes.toString("base64") }]]) {
    const directory = await workspace(t);
    await assert.rejects(run({ args: paid, outputDirectory: directory, confirmPaid: async () => true,
      fetchImpl: async () => response({ data }) }), /Invalid asset/);
    assert.equal((await readdir(directory)).filter(file => /-(hero|cooking|ingredients|decoration)\.png$/.test(file)).length, 0);
  }
  const result = await run({ args: paid, outputDirectory: await workspace(t), confirmPaid: async () => true,
    fetchImpl: async () => response({ usage: undefined }) });
  assert.equal(result.report.usage, null); assert.equal(result.report.usageCostEstimate, null);
});

test("unsafe output scope is rejected and application routes do not expose asset generation", async () => {
  await assert.rejects(run({ args: paid, outputDirectory: path.dirname(assetsRoot),
    confirmPaid: noNetwork }), /Output must remain/);
  for (const directory of ["routes", "controllers"]) {
    const root = new URL(`../src/${directory}/`, import.meta.url);
    for (const file of await readdir(root)) {
      if (file.endsWith(".js")) assert.doesNotMatch(await readFile(new URL(file, root), "utf8"),
        /zineAssets|zine-assets|runAssetPoc|confirmAssetPaid/);
    }
  }
});

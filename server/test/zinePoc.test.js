import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir, mkdtemp, readdir, rm, writeFile, symlink } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { confirmUnverifiedCost, confirmationPhrase } from "../scripts/zine-poc.js";
import { buildDiscoverPrompt } from "../src/utils/discoverPrompt.js";
import { readZineConfig, estimateZineCost, assertCostWithinBudget, usageCostEstimate } from "../src/utils/zinePocConfig.js";
import { runZinePoc, parsePocArgs, inspectPng, outputRoot, defaultRecipePath, referencePath } from "../src/services/zinePocService.js";

const recipe = JSON.parse(await readFile(defaultRecipePath, "utf8"));
const now = new Date("2026-10-13T12:00:00Z");
const env = { OPENAI_IMAGE_MODEL: "gpt-image-2.5-flare", OPENAI_IMAGE_QUALITY: "medium",
  ZINE_POC_MAX_COST_USD: "0.50", OPENAI_API_KEY: "test-secret-never-log" };
const paid = ["--execute", "--acknowledge-paid"];
const override = [...paid, "--allow-unverified-cost"];
const noNetwork = () => { throw new Error("Unexpected network access"); };
// Synthetic cost only for transport/storage tests; NOT an estimate for a real request.
const mockCost = () => ({ reliable: true, estimatedCeilingUsd: 0.25, kind: "test fixture only" });
async function workspace(t) {
  await mkdir(outputRoot, { recursive: true });
  const directory = await mkdtemp(path.join(outputRoot, "mock-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}
const run = options => runZinePoc({ env, now, fetchImpl: noNetwork, log: () => {}, ...options });

// Small valid portrait PNG built locally, NOT an AI-generated image.
function png(width = 1024, height = 1536) {
  function chunk(type, data) {
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, body, checksum]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 1;
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.alloc((Math.ceil(width / 8) + 1) * height))), chunk("IEND", Buffer.alloc(0))]);
}
const mockResponse = (overrides = {}) => ({
  ok: true, json: async () => ({
    data: [{ b64_json: png().toString("base64") }],
    usage: { input_tokens: 500, output_tokens: 1584, total_tokens: 2084,
      input_tokens_details: { text_tokens: 177, image_tokens: 323 } },
    ...overrides
  })
});

test("validates structured recipe without altering quantities, steps, or optional facts", () => {
  const before = JSON.stringify(recipe);
  const prompt = buildDiscoverPrompt(recipe);
  const facts = JSON.parse(prompt.split("RECIPE_JSON:\n\n")[1]);
  assert.deepEqual(facts.ingredients, recipe.ingredients);
  assert.deepEqual(facts.steps, recipe.steps);
  assert.deepEqual(facts.tips, recipe.tips);
  assert.deepEqual(facts.substitutions, recipe.substitutions);
  assert.equal(facts.cookTime, "25 minutes");
  assert.equal(facts.servings, 2);
  assert.equal(facts.ingredients[0].quantity, 200);
  assert.equal(facts.ingredients[1].quantity, 2);
  assert.equal(facts.ingredients[2].quantity, null);
  assert.equal(JSON.stringify(recipe), before);
  assert.match(prompt, /factual source of truth/);
  assert.match(prompt, /visual STYLE reference only/);
  assert.equal("matchScore" in facts, false);
  for (const invalid of [null, {}, { ...recipe, servings: 0 },
    { ...recipe, ingredients: ["200g Chicken"] }, { ...recipe, steps: [] }]) {
    assert.throws(() => buildDiscoverPrompt(invalid), /Invalid structured/);
  }
});

test("dry-run validates local reference and redacts prompt, with no API or output writes", async () => {
  let calls = 0;
  const logs = [];
  const result = await run({ fetchImpl: () => { calls++; }, log: value => logs.push(value),
    env: { ...env, OPENAI_API_KEY: "" } });
  assert.equal(calls, 0);
  assert.equal(result.result, "dry-run");
  assert.equal(result.summary.apiKeyConfigured, false);
  assert.equal(result.summary.parameters.n, 1);
  assert.equal(result.summary.parameters.model, "gpt-image-2.5-flare");
  assert.equal("input_fidelity" in result.summary.parameters, false);
  assert.equal(result.summary.costEstimateVerified, false);
  assert.equal(result.summary.estimate.estimatedCeilingUsd, null);
  assert.equal(result.summary.reference.sha256.length, 64);
  assert.ok(result.summary.reference.width > 0);
  assert.equal(result.summary.prompt.content, "[redacted]");
  assert.doesNotMatch(logs.join(""), /test-secret|Chicken Fried Rice|"quantity"/);
});

test("paid execution requires both explicit flags and a nonempty key", async () => {
  await assert.rejects(run({ args: ["--execute"] }), /acknowledge-paid/);
  await assert.rejects(run({ args: ["--acknowledge-paid"] }), /requires --execute/);
  await assert.rejects(run({ args: paid, env: { ...env, OPENAI_API_KEY: "" } }), /API_KEY is missing/);
  for (const args of [["--n", "2"], ["--execute", "--dry-run"], ["--execute", "--execute"], ["--recipe"]]) {
    assert.throws(() => parsePocArgs(args));
  }
});

test("rejects unsupported settings, missing budgets, expired costs, and over-budget requests", () => {
  for (const patch of [
    { OPENAI_IMAGE_MODEL: "" }, { OPENAI_IMAGE_MODEL: "gpt-image-2.5-sunburst" },
    { OPENAI_IMAGE_MODEL: "invented" }, { OPENAI_IMAGE_QUALITY: "" },
    { OPENAI_IMAGE_QUALITY: "auto" }, { OPENAI_IMAGE_SIZE: "1024x1024" },
    { ZINE_POC_MAX_COST_USD: "" }, { ZINE_POC_MAX_COST_USD: "NaN" },
    { ZINE_POC_MAX_COST_USD: "Infinity" }, { ZINE_POC_MAX_COST_USD: "-1" }
  ]) assert.throws(() => readZineConfig({ ...env, ...patch }, now));
  assert.throws(() => readZineConfig(env, new Date("2026-11-13")), /expired/);
  assert.throws(() => readZineConfig(env, new Date("invalid")), /clock/);
  const config = readZineConfig(env, now);
  const estimate = estimateZineCost(config, "hello", 1055, 1491);
  assert.equal(estimate.imageInputTokens, null);
  assert.equal(estimate.outputTokens, null);
  assert.equal(estimate.reliable, false);
  assert.throws(() => assertCostWithinBudget(estimate, config), /unavailable/);
  assert.throws(() => assertCostWithinBudget(mockCost(), { ...config, ceilingUsd: .001 }), /exceeds/);
  for (const amount of [null, NaN, Infinity, 0, -1]) {
    assert.throws(() => assertCostWithinBudget({ reliable: true, estimatedCeilingUsd: amount }, config), /unavailable/);
  }
  assert.doesNotThrow(() => assertCostWithinBudget(mockCost(), config));
  assert.throws(() => estimateZineCost({ ...config, n: 2 }, "hello", 1055, 1491), /unavailable/);
  assert.equal(usageCostEstimate({}), null);
  assert.equal(usageCostEstimate({ input_tokens_details: { text_tokens: 1000, image_tokens: 1000 },
    output_tokens: 1000 }).amount, .043);
});

test("unverified new-model costs block even acknowledged execution before writes or API", async () => {
  let calls = 0;
  await assert.rejects(run({ args: paid, fetchImpl: () => { calls++; },
    outputDirectory: path.dirname(outputRoot) }), /Reliable cost estimation unavailable/);
  assert.equal(calls, 0);
  await assert.rejects(runZinePoc({ estimateCost: mockCost }), /cannot be overridden/);
});

test("override requires all flags, CLI confirmation capability, and fixed settings", async () => {
  for (const args of [["--allow-unverified-cost"], ["--execute", "--allow-unverified-cost"],
    ["--acknowledge-paid", "--allow-unverified-cost"], [...override, "--dry-run"]]) {
    assert.throws(() => parsePocArgs(args));
  }
  await assert.rejects(run({ args: override }), /local developer CLI/);
  await assert.rejects(run({ args: override, env: { ...env, OPENAI_API_KEY: "" },
    confirmUnverifiedCost: async () => true }), /API_KEY is missing/);
  for (const patch of [{ OPENAI_IMAGE_QUALITY: "high" }, { OPENAI_IMAGE_QUALITY: "low" },
    { OPENAI_IMAGE_MODEL: "gpt-image-2" }, { OPENAI_IMAGE_SIZE: "1536x1024" }]) {
    await assert.rejects(run({ args: override, env: { ...env, ...patch }, confirmUnverifiedCost: noNetwork }));
  }
  // A route cannot enable live override merely by passing request flags and a callback.
  await assert.rejects(run({ args: override, fetchImpl: globalThis.fetch,
    confirmUnverifiedCost: async () => true }), /local developer CLI/);
  await assert.rejects(run({ args: override, estimateCost: () => ({ reliable: true, estimatedCeilingUsd: 99 }),
    confirmUnverifiedCost: noNetwork }), /exceeds/);
});

test("manual confirmation needs an interactive terminal and exact phrase", async () => {
  assert.equal(await confirmUnverifiedCost({ input: {}, output: {}, openTerminal: noNetwork }), false);
  for (const answer of ["", "yes", confirmationPhrase, confirmationPhrase + " "]) {
    let closed = false;
    assert.equal(await confirmUnverifiedCost({ input: { isTTY: true }, output: { isTTY: true },
      openTerminal: () => ({ question: async warning => {
        assert.match(warning, /NOT a guaranteed ceiling/);
        assert.match(warning, /Exact total cost cannot be known/);
        return answer;
      }, close: () => { closed = true; } }) }), answer === confirmationPhrase);
    assert.equal(closed, true);
  }
});

test("override confirms immediately before one request and records uncertain cost", async t => {
  const directory = await workspace(t);
  const events = [];
  const result = await run({ args: override, outputDirectory: directory,
    confirmUnverifiedCost: async () => { events.push("confirm"); return true; },
    fetchImpl: async (url, request) => {
      events.push("fetch");
      assert.equal(request.body.get("n"), "1");
      assert.equal(request.body.get("quality"), "medium");
      assert.equal(request.body.get("allowUnverifiedCost"), null);
      return mockResponse({ usage: { input_tokens: 2000, output_tokens: 1000, total_tokens: 3000,
        input_tokens_details: { text_tokens: 1000, image_tokens: 1000 },
        output_tokens_details: { image_tokens: 1000, text_tokens: 0 }, secret: env.OPENAI_API_KEY } });
    } });
  assert.deepEqual(events, ["confirm", "fetch"]);
  assert.equal(result.report.unverifiedCostOverride, true);
  assert.equal(result.report.manualConfirmationReceived, true);
  assert.equal(result.report.costEstimateVerified, false);
  assert.equal(result.report.estimatedBudgetEnforced, false);
  assert.equal(result.report.usageCostEstimate.amount, .043);
  assert.equal(result.report.usage.output_tokens_details.image_tokens, 1000);
  assert.equal(result.report.usage.total_tokens, 3000);
  assert.equal(result.report.actualCost, null);
  assert.doesNotMatch(JSON.stringify(result.report), /test-secret/);
});

test("cancelled or failed confirmation never sends; override errors never retry or leak", async t => {
  for (const confirmation of [async () => false, async () => "true", async () => { throw Error(env.OPENAI_API_KEY); }]) {
    let calls = 0;
    await assert.rejects(run({ args: override, outputDirectory: await workspace(t),
      confirmUnverifiedCost: confirmation, fetchImpl: () => { calls++; } }), /cancelled before sending/);
    assert.equal(calls, 0);
  }
  const directory = await workspace(t);
  let calls = 0;
  await assert.rejects(run({ args: override, outputDirectory: directory,
    confirmUnverifiedCost: async () => true,
    fetchImpl: async () => { calls++; throw Error(env.OPENAI_API_KEY); } }), /Image request failed/);
  assert.equal(calls, 1);
  const report = await readFile(path.join(directory, (await readdir(directory))[0]), "utf8");
  assert.doesNotMatch(report, /test-secret/);
});

test("missing usage stays unknown; explicit image output counters drive estimated cost", async t => {
  assert.equal(usageCostEstimate({ input_tokens_details: { text_tokens: 2 }, output_tokens: 5 }), null);
  assert.equal(usageCostEstimate({ input_tokens_details: { text_tokens: 2, image_tokens: -1 }, output_tokens: 5 }), null);
  assert.equal(usageCostEstimate({ input_tokens_details: { text_tokens: 1000, image_tokens: 1000 },
    output_tokens: 9000, output_tokens_details: { image_tokens: 1000, text_tokens: 8000 } }).amount, .043);
  const result = await run({ args: override, outputDirectory: await workspace(t),
    confirmUnverifiedCost: async () => true, fetchImpl: async () => mockResponse({ usage: undefined }) });
  assert.equal(result.report.usage, null);
  assert.equal(result.report.usageCostEstimate, null);
});

test("application routes and controllers do not import or expose the PoC", async () => {
  for (const directory of ["routes", "controllers"]) {
    const root = new URL(`../src/${directory}/`, import.meta.url);
    for (const file of await readdir(root)) {
      if (!file.endsWith(".js")) continue;
      assert.doesNotMatch(await readFile(new URL(file, root), "utf8"),
        /zinePoc|zine-poc|allow-unverified-cost|confirmUnverifiedCost/);
    }
  }
});

test("multipart edit uses real reference bytes, exactly one output, and no redirects/retries", async (t) => {
  const directory = await workspace(t);
  let calls = 0;
  const result = await run({ args: paid, estimateCost: mockCost, outputDirectory: directory, fetchImpl: async (url, request) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/images/edits");
    assert.equal(request.method, "POST");
    assert.equal(request.redirect, "error");
    assert.ok(request.signal instanceof AbortSignal);
    assert.ok(request.body instanceof FormData);
    assert.equal(request.body.get("n"), "1");
    assert.equal(request.body.get("size"), "1024x1536");
    assert.equal(request.body.get("model"), "gpt-image-2.5-flare");
    assert.equal(request.body.get("input_fidelity"), null);
    assert.equal(request.body.get("response_format"), null);
    assert.deepEqual(Buffer.from(await request.body.get("image").arrayBuffer()), await readFile(referencePath));
    return mockResponse();
  } });
  assert.equal(calls, 1);
  assert.deepEqual(await readFile(result.imagePath), png());
  const report = JSON.parse(await readFile(result.reportPath, "utf8"));
  assert.equal(report.result, "success");
  assert.equal(report.actualCost, null);
  assert.match(report.usageCostEstimate.kind, /estimate/);
  assert.equal(report.usage.total_tokens, 2084);
  assert.equal(report.recipeTitle, recipe.title);
  assert.equal(report.retries, 0);
  assert.equal(path.dirname(result.imagePath), directory);
  assert.doesNotMatch(JSON.stringify(report), /test-secret|Bearer/);
  const second = await run({ args: paid, estimateCost: mockCost, outputDirectory: directory, fetchImpl: async () => mockResponse() });
  assert.notEqual(second.imagePath, result.imagePath);
});

test("API and network failures create sanitized failure reports and never retry", async (t) => {
  for (const fetchImpl of [
    async () => ({ ok: false, status: 429, text: async () => env.OPENAI_API_KEY }),
    async () => { throw new Error("Authorization Bearer " + env.OPENAI_API_KEY); },
    async () => ({ ok: true, json: async () => { throw new Error(env.OPENAI_API_KEY); } })
  ]) {
    const directory = await workspace(t);
    let calls = 0;
    await assert.rejects(run({ args: paid, estimateCost: mockCost, outputDirectory: directory,
      fetchImpl: async (...args) => { calls++; return fetchImpl(...args); } }));
    assert.equal(calls, 1);
    const files = await readdir(directory);
    assert.equal(files.length, 1);
    const reportText = await readFile(path.join(directory, files[0]), "utf8");
    assert.doesNotMatch(reportText, /test-secret|Authorization|Bearer/);
    assert.equal(JSON.parse(reportText).result, "failure");
  }
});

test("invalid, multi-image, remote URL and wrong-size outputs are not saved", async (t) => {
  for (const data of [[], [{ url: "https://example.com/image.png" }],
    [{ b64_json: "not an image" }], [{ b64_json: png(1, 1).toString("base64") }],
    [{ b64_json: png().toString("base64") }, { b64_json: png().toString("base64") }]]) {
    const directory = await workspace(t);
    await assert.rejects(run({ args: paid, estimateCost: mockCost, outputDirectory: directory,
      fetchImpl: async () => mockResponse({ data }) }), /Invalid image response/);
    assert.equal((await readdir(directory)).filter(file => file.endsWith(".png")).length, 0);
  }
  assert.throws(() => inspectPng(Buffer.from("not png")));
  assert.throws(() => inspectPng(png().subarray(0, 35)));
  const corrupt = png();
  corrupt[24] ^= 1;
  assert.throws(() => inspectPng(corrupt), /checksum/);
});

test("invalid recipe paths/data and unsafe output paths never invoke API", async (t) => {
  const directory = await workspace(t);
  const invalid = path.join(directory, "bad.json");
  await writeFile(invalid, "{bad");
  await assert.rejects(run({ args: ["--recipe", invalid] }), /could not be validated/);
  await assert.rejects(run({ args: ["--recipe", path.join(directory, "missing.json")] }), /could not be validated/);
  await assert.rejects(run({ args: paid, estimateCost: mockCost, outputDirectory: path.dirname(outputRoot) }), /Output must stay/);
  const link = path.join(directory, "link");
  await symlink(directory, link, process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(run({ args: paid, estimateCost: mockCost, outputDirectory: link }), /Unsafe output/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { generateRecipesWithDeepSeek, RecipeGenerationError } from "../src/services/deepseekService.js";

const input = { ingredients: [{ name: "Eggs" }], cuisine: "Chinese", difficulty: "Easy" };
const realFetch = globalThis.fetch;
const realKey = process.env.DEEPSEEK_API_KEY;

function withFetch(t, impl) {
  process.env.DEEPSEEK_API_KEY = "test-only-not-a-real-key";
  globalThis.fetch = impl;
  t.after(() => {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = realKey;
  });
}

// Never resolves on its own; rejects when the request signal aborts, like a real fetch.
const hangingFetch = (url, { signal }) => new Promise((resolve, reject) => {
  signal.addEventListener("abort", () => reject(signal.reason), { once: true });
});

async function expectError(promise, status, pattern) {
  await assert.rejects(promise, error => {
    assert.ok(error instanceof RecipeGenerationError, "user-safe error type");
    assert.equal(error.status, status);
    assert.match(error.message, pattern);
    assert.doesNotMatch(error.message, /test-only|secret|Bearer|sk-/);
    return true;
  });
}

test("a slow recipe service times out with a friendly 504", async t => {
  withFetch(t, hangingFetch);
  await expectError(generateRecipesWithDeepSeek({ ...input, timeoutMs: 20 }), 504, /took too long/);
});

test("a user cancel aborts the AI request and is reported as cancelled", async t => {
  withFetch(t, hangingFetch);
  const cancel = new AbortController();
  const pending = generateRecipesWithDeepSeek({ ...input, signal: cancel.signal, timeoutMs: 5000 });
  cancel.abort();
  await expectError(pending, 499, /cancelled/);
});

test("service error bodies are never passed to users", async t => {
  withFetch(t, async () => ({ ok: false, status: 401, text: async () => "secret account details sk-abc123" }));
  await expectError(generateRecipesWithDeepSeek(input), 502, /unavailable right now/);
});

test("rate limits ask the user to wait", async t => {
  withFetch(t, async () => ({ ok: false, status: 429, text: async () => "rate limited" }));
  await expectError(generateRecipesWithDeepSeek(input), 503, /busy/);
});

test("network failures and unreadable answers get friendly messages", async t => {
  withFetch(t, async () => { throw new TypeError("fetch failed"); });
  await expectError(generateRecipesWithDeepSeek(input), 502, /Couldn't reach/);
  globalThis.fetch = async () => ({ ok: true, json: async () => { throw new SyntaxError("bad"); } });
  await expectError(generateRecipesWithDeepSeek(input), 502, /unreadable/);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "" } }] }) });
  await expectError(generateRecipesWithDeepSeek(input), 502, /no recipes/);
});

test("a missing API key reports unavailability without naming the setting", async t => {
  withFetch(t, async () => { throw new Error("must not be called"); });
  delete process.env.DEEPSEEK_API_KEY;
  await expectError(generateRecipesWithDeepSeek(input), 503, /unavailable/);
});

test("titles are English only: the prompt asks, and code removes a translation that slips through", async () => {
  const { buildRecipePrompt, englishTitle } = await import("../src/services/deepseekService.js");
  assert.match(buildRecipePrompt([{ name: "Eggs" }], "Chinese", "Easy").system, /title in English only/);
  assert.equal(englishTitle("Tomato Egg Stir-Fry (番茄炒蛋)"), "Tomato Egg Stir-Fry");
  assert.equal(englishTitle("Garlic Squid Stir-Fry（蒜香炒鱿鱼）"), "Garlic Squid Stir-Fry");
  assert.equal(englishTitle("Mapo Tofu 麻婆豆腐"), "Mapo Tofu");
  assert.equal(englishTitle("Chicken (Thigh) Stir-Fry"), "Chicken (Thigh) Stir-Fry");
  assert.equal(englishTitle("番茄炒蛋"), "番茄炒蛋", "never left empty");
});

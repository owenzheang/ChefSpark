import test from "node:test";
import assert from "node:assert/strict";
import sqlite3 from "sqlite3";
import { createAssistantController } from "../src/controllers/assistantController.js";
import { initAssistantTables } from "../src/services/assistantStore.js";
import { promisify } from "../src/services/zineStore.js";
import { buildEditPrompt, buildExplainPrompt, readAssistantConfig } from "../src/services/assistantService.js";
import { RecipeGenerationError } from "../src/services/deepseekService.js";
import { classifyEdit, coreGroupOf, recipeDiff } from "../src/utils/recipeEdits.js";

const ingredient = (name, quantity, unit) => ({ name, quantity, unit });
const steps = (texts) => texts.map((instruction, index) => ({ step: index + 1, instruction }));
const recipe = {
  title: "Chicken Fried Rice", cuisine: "Chinese", difficulty: "Easy", servings: 2, cookTime: "20 minutes",
  matchScore: 60, youHave: ["Chicken", "Rice"], youNeed: ["Peas"],
  ingredients: [ingredient("Chicken", 200, "g"), ingredient("Rice", 2, "cups"), ingredient("Eggs", 2, ""),
    ingredient("Peas", 50, "g"), ingredient("Carrot", 1, ""), ingredient("Spring Onion", 2, ""),
    ingredient("Soy Sauce", 2, "tbsp"), ingredient("Salt", null, "")],
  steps: steps(["Dice the chicken and carrot.", "Fry the chicken for 5 minutes.", "Add the eggs and scramble.",
    "Add the rice, peas and carrot and stir-fry for 4 minutes.", "Season with soy sauce and salt; top with spring onion."]),
  tips: ["Use cold, cooked rice."], substitutions: [{ ingredient: "Peas", substitute: "Corn" }],
  imagePrompt: "Chicken fried rice plated food"
};
const swap = (from, to) => recipe.ingredients.map((item) => item.name === from ? to : item);
const withIngredients = (ingredients, extra = {}) => ({ ...recipe, ingredients, ...extra });

const env = { ASSISTANT_ENABLED: "true", DEEPSEEK_API_KEY: "test-only-not-a-real-key" };
const fixedNow = () => new Date("2026-10-23T12:00:00Z");

async function setup({ envPatch = {}, answer } = {}) {
  const db = new sqlite3.Database(":memory:");
  await new Promise((resolve) => db.run("CREATE TABLE ingredients (id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT)", resolve));
  await initAssistantTables(db);
  const q = promisify(db);
  await q.run("INSERT INTO ingredients (user_id, name) VALUES (1, 'Rice'), (1, 'Tofu'), (1, 'Eggs')");
  const calls = [];
  const requestJson = async (request) => {
    calls.push(request);
    const value = typeof answer === "function" ? await answer(request) : answer;
    return { data: value, usage: { prompt_tokens: 900, completion_tokens: 700 } };
  };
  const controller = createAssistantController({ db, env: { ...env, ...envPatch }, requestJson, now: fixedNow });
  return { q, calls, controller };
}

function call(handler, { userId = 1, body = {} } = {}) {
  return new Promise((resolve) => {
    const res = { statusCode: 200, headersSent: false,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.headersSent = true; resolve({ status: this.statusCode, body: payload }); } };
    handler({ user: { userId }, body }, res);
  });
}

test("the assistant is off unless enabled with a key and valid limits", () => {
  assert.equal(readAssistantConfig({}).enabled, false);
  assert.equal(readAssistantConfig(env).enabled, true);
  assert.equal(readAssistantConfig(env).userDailyLimit, 20);
  assert.equal(readAssistantConfig(env).globalDailyLimit, 300);
  for (const patch of [{ ASSISTANT_ENABLED: "yes" }, { DEEPSEEK_API_KEY: " " }, { ASSISTANT_USER_DAILY_LIMIT: "-1" }, { ASSISTANT_GLOBAL_DAILY_LIMIT: "x" }]) {
    assert.equal(readAssistantConfig({ ...env, ...patch }).enabled, false, JSON.stringify(patch));
  }
});

test("disabled, invalid or pointless requests never reach DeepSeek", async () => {
  const off = await setup({ envPatch: { ASSISTANT_ENABLED: "false" }, answer: {} });
  assert.equal((await call(off.controller.edit, { body: { recipe, action: "simpler" } })).status, 503);
  assert.equal((await call(off.controller.explain, { body: { recipe, stepIndex: 0, question: "meaning" } })).status, 503);
  assert.deepEqual((await call(off.controller.status)).body, { enabled: false, remainingToday: 0 });

  const on = await setup({ answer: {} });
  const legacy = { title: "Old", ingredients: ["rice"], steps: ["Cook."] };
  assert.equal((await call(on.controller.edit, { body: { recipe: legacy, action: "simpler" } })).status, 422);
  assert.equal((await call(on.controller.edit, { body: { recipe, action: "rewrite everything" } })).status, 400);
  assert.equal((await call(on.controller.edit, { body: { recipe, action: "missing", ingredient: "Beef" } })).status, 400);
  assert.equal((await call(on.controller.edit, { body: { recipe, action: "diet", diet: "Keto" } })).status, 400);
  assert.match((await call(on.controller.edit, { body: { recipe: { ...recipe, editCount: 3 }, action: "simpler" } })).body.message, /3 times/);
  assert.equal((await call(on.controller.explain, { body: { recipe, stepIndex: 9, question: "meaning" } })).status, 400);
  assert.equal((await call(on.controller.explain, { body: { recipe, stepIndex: 0, question: "anything" } })).status, 400);
  assert.equal(on.calls.length, 0);
});

test("a recipe that already fits a diet is labelled in code for free", async () => {
  const { controller, calls, q } = await setup({ answer: {} });
  const tofu = withIngredients(swap("Chicken", ingredient("Tofu", 200, "g")), { title: "Tofu Fried Rice" });
  const result = await call(controller.edit, { body: { recipe: tofu, action: "diet", diet: "Vegetarian" } });
  assert.equal(result.body.tier, "minor");
  assert.equal(result.body.free, true);
  assert.equal(result.body.recipe.diet, "Vegetarian");
  assert.equal(calls.length, 0);
  assert.equal((await q.get("SELECT COUNT(*) AS n FROM assistant_requests")).n, 0);
});

test("a core swap becomes a variant with a code-computed diff, recalculated match and the diet kept", async () => {
  const proposal = withIngredients(swap("Chicken", ingredient("Firm Tofu", 200, "g")), {
    title: "Tofu Fried Rice", matchScore: 99, youHave: ["everything"], imageUrl: "https://example.test/x.jpg",
    ingredientMatches: [], steps: steps(["Dice the tofu and carrot.", "Fry the tofu for 5 minutes.", "Add the eggs and scramble.",
      "Add the rice, peas and carrot and stir-fry for 4 minutes.", "Season with soy sauce and salt; top with spring onion."])
  });
  const { controller, calls, q } = await setup({ answer: { recipe: proposal } });
  const result = await call(controller.edit, { body: { recipe, action: "diet", diet: "Vegetarian" } });
  assert.equal(result.status, 200);
  assert.equal(result.body.status, "proposed");
  assert.equal(result.body.tier, "variant");
  const edited = result.body.recipe;
  assert.equal(edited.title, "Tofu Fried Rice");
  assert.equal(edited.variantOf, "Chicken Fried Rice");
  assert.equal(edited.diet, "Vegetarian");
  assert.equal(edited.editCount, 1);
  assert.equal(edited.imageUrl, undefined, "a variant never inherits a picture");
  assert.notEqual(edited.matchScore, 99, "match is recalculated by the server");
  assert.ok(!edited.youHave.includes("everything"));
  assert.deepEqual(result.body.diff.removed, ["Chicken"]);
  assert.deepEqual(result.body.diff.added, [{ name: "Firm Tofu", amount: "200 g" }]);
  assert.equal(result.body.diff.steps.changed, 2);
  assert.equal(result.body.remainingToday, 19);
  assert.equal(calls[0].maxTokens, 3000);
  assert.equal(calls[0].timeoutMs, 30_000);
  assert.match(calls[0].user, /Make this recipe vegetarian/);
  const row = await q.get("SELECT kind, result, prompt_tokens, completion_tokens FROM assistant_requests");
  assert.deepEqual({ ...row }, { kind: "edit:diet", result: "success", prompt_tokens: 900, completion_tokens: 700 });
});

test("a small change keeps the title; the AI cannot rename or break the diet", async () => {
  const proposal = withIngredients(recipe.ingredients.filter((item) => item.name !== "Peas"), { title: "Peas-free Rice",
    diet: undefined, ingredientMatches: [] });
  const vegetarian = withIngredients(swap("Chicken", ingredient("Tofu", 200, "g")), { title: "Tofu Fried Rice", diet: "Vegetarian" });
  const { controller } = await setup({ answer: (request) => ({ recipe: request.user.includes("\"Peas\"")
    ? { ...proposal, ingredients: proposal.ingredients.map((item) => item.name === "Chicken" ? ingredient("Tofu", 200, "g") : item) }
    : proposal }) });
  const minor = await call(controller.edit, { body: { recipe: vegetarian, action: "missing", ingredient: "Peas" } });
  assert.equal(minor.body.tier, "minor");
  assert.equal(minor.body.recipe.title, "Tofu Fried Rice");
  assert.equal(minor.body.recipe.diet, "Vegetarian");
  assert.deepEqual(minor.body.diff.removed, ["Peas"]);

  // The original was vegetarian; a proposal with chicken is rejected rather than shown.
  const { controller: c2 } = await setup({ answer: { recipe: { ...proposal, ingredientMatches: [] } } });
  const broke = await call(c2.edit, { body: { recipe: vegetarian, action: "simpler" } });
  assert.equal(broke.body.status, "rejected");
  assert.match(broke.body.reason, /wasn't vegetarian/);
});

test("losing the main protein or most ingredients is rejected, and so is keeping the missing item", async () => {
  const noProtein = withIngredients(recipe.ingredients.filter((item) => !["Chicken", "Eggs"].includes(item.name)), { ingredientMatches: [] });
  const a = await setup({ answer: { recipe: noProtein } });
  const lost = await call(a.controller.edit, { body: { recipe, action: "missing", ingredient: "Chicken" } });
  assert.equal(lost.body.status, "rejected");
  assert.match(lost.body.reason, /main protein.*Plan a new dish/);

  const b = await setup({ answer: { recipe: { ...recipe, ingredientMatches: [] } } });
  assert.match((await call(b.controller.edit, { body: { recipe, action: "missing", ingredient: "Peas" } })).body.reason, /still used Peas/);

  const c = await setup({ answer: { recipe: { title: "Broken" } } });
  const bad = await call(c.controller.edit, { body: { recipe, action: "simpler" } });
  assert.equal(bad.status, 502);
  assert.match(bad.body.message, /unchanged/);
  assert.equal((await c.q.get("SELECT result FROM assistant_requests")).result, "failure");
});

test("edit tiers and the diff are decided in code", () => {
  assert.equal(coreGroupOf("Chicken Thighs"), "protein");
  assert.equal(coreGroupOf("Egg Noodles"), "staple");
  assert.equal(coreGroupOf("Chicken Stock"), null);
  assert.equal(coreGroupOf("Soy Sauce"), null);
  assert.equal(coreGroupOf("Bean Sprouts"), null);
  assert.equal(classifyEdit(recipe, withIngredients(recipe.ingredients.slice(0, 7))).tier, "minor");
  assert.equal(classifyEdit(recipe, withIngredients(swap("Rice", ingredient("Egg Noodles", 200, "g")))).tier, "variant");
  const mostChanged = withIngredients([recipe.ingredients[0], recipe.ingredients[1], recipe.ingredients[2],
    ingredient("A", 1, ""), ingredient("B", 1, ""), ingredient("C", 1, ""), ingredient("D", 1, ""), ingredient("E", 1, ""), ingredient("F", 1, "")]);
  assert.equal(classifyEdit(recipe, mostChanged).tier, "rejected");
  const diff = recipeDiff(recipe, withIngredients(recipe.ingredients.map((item) => item.name === "Soy Sauce" ? ingredient("Soy Sauce", 1, "tbsp") : item)));
  assert.deepEqual(diff.changed, [{ name: "Soy Sauce", from: "2 tbsp", to: "1 tbsp" }]);
  assert.equal(diff.title, null);
});

test("daily limits, one request at a time, and failures are counted without retries", async () => {
  const { controller, calls } = await setup({ envPatch: { ASSISTANT_USER_DAILY_LIMIT: "2" }, answer: { answer: "Toss quickly over high heat." } });
  for (const stepIndex of [0, 1]) assert.equal((await call(controller.explain, { body: { recipe, stepIndex, question: "meaning" } })).status, 200);
  const limited = await call(controller.explain, { body: { recipe, stepIndex: 2, question: "meaning" } });
  assert.equal(limited.status, 429);
  assert.match(limited.body.message, /today's 2/);
  // Another user is unaffected; the global limit counts everyone.
  assert.equal((await call(controller.explain, { userId: 2, body: { recipe, stepIndex: 2, question: "meaning" } })).status, 200);
  assert.equal(calls.length, 3);

  let release;
  const slow = await setup({ answer: () => new Promise((resolve) => { release = () => resolve({ answer: "Done." }); }) });
  const first = call(slow.controller.explain, { body: { recipe, stepIndex: 0, question: "doneness" } });
  while (!release) await new Promise((resolve) => setImmediate(resolve)); // first request reached DeepSeek
  assert.equal((await call(slow.controller.explain, { body: { recipe, stepIndex: 1, question: "doneness" } })).status, 409);
  release();
  assert.equal((await first).status, 200);

  const failing = await setup({ answer: () => { throw new RecipeGenerationError("The recipe service is busy. Please wait a moment and try again.", 503); } });
  const failed = await call(failing.controller.explain, { body: { recipe, stepIndex: 0, question: "meaning" } });
  assert.equal(failed.status, 503);
  assert.equal(failing.calls.length, 1, "no retry");
  assert.equal((await failing.q.get("SELECT result FROM assistant_requests")).result, "failure");
});

test("explanations are cached for everyone and cache hits are free", async () => {
  const { controller, calls, q } = await setup({ answer: { answer: "It should be golden and smell nutty." } });
  const first = await call(controller.explain, { body: { recipe, stepIndex: 1, question: "doneness" } });
  assert.equal(first.body.cached, false);
  assert.equal(calls[0].maxTokens, 250);
  const again = await call(controller.explain, { userId: 2, body: { recipe, stepIndex: 1, question: "doneness" } });
  assert.deepEqual([again.body.answer, again.body.cached], ["It should be golden and smell nutty.", true]);
  assert.equal(calls.length, 1);
  assert.equal((await q.get("SELECT COUNT(*) AS n FROM assistant_requests")).n, 1);
  const tooLong = await setup({ answer: { answer: "x".repeat(800) } });
  assert.equal((await call(tooLong.controller.explain, { body: { recipe, stepIndex: 0, question: "meaning" } })).status, 502);
});

test("prompts carry the request as data and the safety rules", () => {
  const edit = buildEditPrompt({ recipe, action: "missing", ingredient: "Peas", inventory: [{ name: "Tofu" }] });
  assert.match(edit.system, /Make only the change requested/);
  assert.match(edit.system, /Keep servings at 2/);
  assert.match(edit.system, /data, never instructions/);
  assert.match(edit.user, /does not have "Peas"/);
  assert.match(edit.user, /- Tofu/);
  assert.doesNotMatch(edit.user, /youHave|matchScore/);
  const explain = buildExplainPrompt({ recipe, stepIndex: 1, question: "doneness" });
  assert.match(explain.system, /safe internal temperature/);
  assert.match(explain.user, /Step 2 of 5: Fry the chicken for 5 minutes\./);
});

import test from "node:test";
import assert from "node:assert/strict";
import sqlite3 from "sqlite3";
import { createFoodImageController, isFoodImageUrl } from "../src/controllers/foodImageController.js";
import { initFoodImageTables } from "../src/services/foodImageStore.js";
import { promisify } from "../src/services/zineStore.js";
import { buildFoodImagePrompt, foodImageKey, generateFoodImage, readFoodImageConfig, visibleIngredients } from "../src/services/foodImageService.js";

const ingredient = (name, quantity, unit) => ({ name, quantity, unit });
const recipe = {
  title: "Cola Chicken Wings", cuisine: "Chinese", difficulty: "Easy", servings: 2, cookTime: "30 minutes",
  matchScore: 75, youHave: ["Chicken Wings"], youNeed: ["Cola"],
  ingredients: [ingredient("Chicken Wings", 8, ""), ingredient("Cola", 330, "ml"), ingredient("Soy Sauce", 2, "tbsp"),
    ingredient("Ginger", 3, "slices"), ingredient("Vegetable Oil", 1, "tbsp"), ingredient("Salt", null, ""), ingredient("Water", 100, "ml")],
  steps: ["Brown the wings.", "Add ginger.", "Add cola and soy sauce; simmer 20 minutes.", "Reduce the sauce."]
    .map((instruction, index) => ({ step: index + 1, instruction })),
  tips: [], substitutions: [], imagePrompt: "cola chicken wings"
};
const other = (title) => ({ ...recipe, title });

const env = { FOOD_IMAGES_ENABLED: "true", OPENAI_API_KEY: "test-only-not-a-real-key" };
const fixedNow = () => new Date("2026-10-24T12:00:00Z");
const fakeWebp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 fake")]);
const usage = { input_tokens: 120, output_tokens: 200, input_tokens_details: { text_tokens: 120, image_tokens: 0 } };

function okResponse(bytes = fakeWebp) {
  return { ok: true, status: 200, json: async () => ({ data: [{ b64_json: bytes.toString("base64") }], usage }) };
}

async function setup({ envPatch = {}, respond = () => okResponse() } = {}) {
  const db = new sqlite3.Database(":memory:");
  await new Promise((resolve) => db.run("CREATE TABLE saved_recipes (id INTEGER PRIMARY KEY, user_id INTEGER, recipe_json TEXT)", resolve));
  await initFoodImageTables(db);
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return respond(calls.length);
  };
  const controller = createFoodImageController({ db, env: { ...env, ...envPatch }, fetchImpl, now: fixedNow });
  return { q: promisify(db), calls, controller };
}

function call(handler, { userId = 1, body = {}, params = {} } = {}) {
  return new Promise((resolve) => {
    const res = { statusCode: 200, headersSent: false, headers: {},
      status(code) { this.statusCode = code; return this; },
      set(headers) { Object.assign(this.headers, headers); return this; },
      send(payload) { this.headersSent = true; resolve({ status: this.statusCode, headers: this.headers, body: payload }); },
      json(payload) { this.headersSent = true; resolve({ status: this.statusCode, body: payload }); } };
    handler({ user: { userId }, body, params }, res);
  });
}
const ask = (controller, body, userId) => call(controller.create, { body, userId });

test("food pictures are off unless enabled with a key; defaults are low quality and 6 + 2 per user", () => {
  assert.equal(readFoodImageConfig({}, fixedNow()).enabled, false);
  const config = readFoodImageConfig(env, fixedNow());
  assert.equal(config.enabled, true);
  assert.deepEqual(config.limits, { menu: 6, variant: 2, global: 100 });
  assert.deepEqual(config.parameters, { model: "gpt-image-2.5-flare", quality: "low", size: "1024x1024", n: 1,
    output_format: "webp", output_compression: 80 });
  for (const patch of [{ FOOD_IMAGES_ENABLED: "yes" }, { OPENAI_API_KEY: " " }, { FOOD_IMAGE_QUALITY: "high" },
    { FOOD_IMAGE_MENU_DAILY_LIMIT: "-1" }, { FOOD_IMAGE_GLOBAL_DAILY_LIMIT: "x" }]) {
    assert.equal(readFoodImageConfig({ ...env, ...patch }, fixedNow()).enabled, false, JSON.stringify(patch));
  }
  // An unreviewed pricing period switches the feature off rather than assuming the rates.
  assert.equal(readFoodImageConfig(env, new Date("2026-11-13T00:00:00Z")).enabled, false);
});

test("the prompt is short, top-down, and lists only visible ingredients", () => {
  assert.deepEqual(visibleIngredients(recipe), ["chicken wings", "cola", "ginger", "soy sauce"]);
  const prompt = buildFoodImagePrompt(recipe);
  assert.match(prompt, /Top-down food photo of "Cola Chicken Wings"/);
  assert.match(prompt, /one plain round plate/);
  assert.match(prompt, /\["chicken wings","cola","ginger","soy sauce"\]/);
  assert.match(prompt, /no other food, garnish, herbs/);
  assert.match(prompt, /No text/);
  assert.ok(prompt.length < 600, `prompt is ${prompt.length} characters`);
});

test("the library key follows the dish name and visible ingredients, not order, case or seasoning", () => {
  const key = foodImageKey(recipe, "low");
  const reordered = { ...recipe, title: " cola chicken WINGS ", ingredients: [...recipe.ingredients].reverse() };
  assert.equal(foodImageKey(reordered, "low"), key);
  assert.equal(foodImageKey({ ...recipe, ingredients: recipe.ingredients.filter((item) => item.name !== "Salt") }, "low"), key);
  assert.notEqual(foodImageKey({ ...recipe, ingredients: [...recipe.ingredients, ingredient("Spring Onion", 1, "")] }, "low"), key);
  assert.notEqual(foodImageKey(other("Cola Chicken Drumsticks"), "low"), key);
  assert.notEqual(foodImageKey(recipe, "medium"), key);
});

test("one request with the reviewed parameters; anything but one WebP image is a failure", async () => {
  const config = readFoodImageConfig(env, fixedNow());
  const sent = [];
  const result = await generateFoodImage({ recipe, config, apiKey: "k", fetchImpl: async (url, options) => {
    sent.push({ url, options }); return okResponse();
  } });
  assert.equal(result.ok, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, "https://api.openai.com/v1/images/generations");
  assert.equal(sent[0].options.redirect, "error");
  const body = JSON.parse(sent[0].options.body);
  assert.equal(body.output_format, "webp");
  assert.equal(body.quality, "low");
  assert.equal(body.prompt, buildFoodImagePrompt(recipe));
  assert.ok(result.costEstimate.amount > 0);
  const png = Buffer.from("\x89PNG\r\n\x1a\nnot webp", "binary");
  assert.equal((await generateFoodImage({ recipe, config, apiKey: "k", fetchImpl: async () => okResponse(png) })).ok, false);
  assert.equal((await generateFoodImage({ recipe, config, apiKey: "k", fetchImpl: async () => ({ ok: false, status: 500 }) })).ok, false);
  assert.equal((await generateFoodImage({ recipe, config, apiKey: "k", fetchImpl: async () => { throw new Error("network"); } })).ok, false);
});

test("switched off, nothing is sent", async () => {
  const { controller, calls } = await setup({ envPatch: { FOOD_IMAGES_ENABLED: "false" } });
  assert.equal((await ask(controller, { recipe, purpose: "menu" })).status, 503);
  assert.equal(calls.length, 0);
});

test("bad requests are refused before anything is paid", async () => {
  const { controller, calls } = await setup();
  assert.equal((await ask(controller, { recipe, purpose: "zine" })).status, 400);
  assert.equal((await ask(controller, { recipe: { ...recipe, ingredients: ["wings"] }, purpose: "menu" })).status, 422);
  assert.equal(calls.length, 0);
});

test("a new picture is paid once, stored, served publicly and then reused for free by anyone", async () => {
  const { controller, calls, q } = await setup();
  const first = await ask(controller, { recipe, purpose: "menu" });
  assert.equal(first.status, 200);
  assert.equal(first.body.cached, false);
  assert.ok(isFoodImageUrl(first.body.imageUrl), first.body.imageUrl);
  const again = await ask(controller, { recipe, purpose: "menu" }, 2);
  assert.deepEqual(again.body, { imageUrl: first.body.imageUrl, cached: true });
  assert.equal(calls.length, 1);
  const rows = await q.all("SELECT user_id, purpose, result, cost_estimate_usd FROM food_image_requests");
  assert.equal(rows.length, 1, "a library hit is not a request");
  assert.equal(rows[0].result, "success");
  assert.ok(rows[0].cost_estimate_usd > 0);

  const file = first.body.imageUrl.split("/").pop();
  const image = await call(controller.getImage, { params: { file } });
  assert.equal(image.headers["Content-Type"], "image/webp");
  assert.match(image.headers["Cache-Control"], /immutable/);
  assert.deepEqual(Buffer.from(image.body), fakeWebp);
  for (const bad of ["../smartkitchen.db", "abc.webp", `${file.slice(0, -5)}.png`]) {
    assert.equal((await call(controller.getImage, { params: { file: bad } })).status, 404, bad);
  }
});

test("parallel requests for the same dish share one paid request", async () => {
  const { controller, calls, q } = await setup();
  const results = await Promise.all([1, 2, 3].map((userId) => ask(controller, { recipe, purpose: "menu" }, userId)));
  assert.equal(calls.length, 1);
  assert.equal(new Set(results.map((result) => result.body.imageUrl)).size, 1);
  assert.equal((await q.get("SELECT COUNT(*) AS count FROM food_image_requests")).count, 1);
});

test("each user gets 6 menu pictures and 2 variation pictures a day, even when asked in parallel", async () => {
  const { controller, calls } = await setup();
  const menu = await Promise.all(Array.from({ length: 8 }, (_, index) => ask(controller, { recipe: other(`Dish ${index}`), purpose: "menu" })));
  assert.equal(menu.filter((result) => result.status === 200).length, 6);
  const limited = menu.find((result) => result.status === 429);
  assert.match(limited.body.message, /6 pictures for planned dishes/);
  assert.equal(calls.length, 6);

  assert.equal((await ask(controller, { recipe: other("Variant A"), purpose: "variant" })).status, 200);
  assert.equal((await ask(controller, { recipe: other("Variant B"), purpose: "variant" })).status, 200);
  const third = await ask(controller, { recipe: other("Variant C"), purpose: "variant" });
  assert.equal(third.status, 429);
  assert.match(third.body.message, /2 pictures for new variations/);
  // Another user still has their own allowance; a picture already in the library stays free.
  assert.equal((await ask(controller, { recipe: other("Second user's dish"), purpose: "menu" }, 2)).status, 200);
  const pictured = menu.findIndex((result) => result.status === 200);
  assert.equal((await ask(controller, { recipe: other(`Dish ${pictured}`), purpose: "menu" })).status, 200);
  assert.equal(calls.length, 9);
});

test("failed requests count toward the limit and are never retried; the global limit applies to everyone", async () => {
  const { controller, calls, q } = await setup({ envPatch: { FOOD_IMAGE_GLOBAL_DAILY_LIMIT: "2" },
    respond: () => ({ ok: false, status: 500 }) });
  const failed = await ask(controller, { recipe, purpose: "menu" });
  assert.equal(failed.status, 502);
  assert.equal(calls.length, 1);
  assert.equal((await q.get("SELECT result FROM food_image_requests")).result, "failure");
  assert.equal((await q.get("SELECT COUNT(*) AS count FROM food_images")).count, 0);
  await ask(controller, { recipe: other("Second"), purpose: "menu" }, 2);
  const busy = await ask(controller, { recipe: other("Third"), purpose: "menu" }, 3);
  assert.equal(busy.status, 429);
  assert.match(busy.body.message, /busy today/);
  assert.equal(calls.length, 2);
});

test("a dish saved before its picture arrived gets the picture; other saved recipes are untouched", async () => {
  const { controller, q } = await setup();
  await q.run("INSERT INTO saved_recipes (user_id, recipe_json) VALUES (1, ?), (1, ?), (2, ?)",
    [JSON.stringify(recipe), JSON.stringify(other("Something Else")), JSON.stringify(recipe)]);
  const { body } = await ask(controller, { recipe, purpose: "menu" });
  const rows = await q.all("SELECT user_id, recipe_json FROM saved_recipes ORDER BY id");
  assert.equal(JSON.parse(rows[0].recipe_json).imageUrl, body.imageUrl);
  assert.equal(JSON.parse(rows[1].recipe_json).imageUrl, undefined);
  assert.equal(JSON.parse(rows[2].recipe_json).imageUrl, undefined, "only the requesting user's shelf");
});

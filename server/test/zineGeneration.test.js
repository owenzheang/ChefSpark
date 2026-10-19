import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sqlite3 from "sqlite3";
import { PNG } from "pngjs";
import { createZineController } from "../src/controllers/zineController.js";
import { initZineTables, promisify, deleteZinesForSavedRecipe } from "../src/services/zineStore.js";
import { readGenerationConfig } from "../src/services/zineGenerationService.js";
import { defaultRecipePath } from "../src/services/zinePocService.js";

const recipe = JSON.parse(await readFile(defaultRecipePath, "utf8"));
const fixedNow = () => new Date("2026-10-19T12:00:00Z");
const env = { ZINE_GENERATION_ENABLED: "true", OPENAI_IMAGE_MODEL: "gpt-image-2.5-flare",
  OPENAI_IMAGE_QUALITY: "medium", OPENAI_API_KEY: "test-secret-do-not-store" };

function sheet() {
  const image = new PNG({ width: 1024, height: 1024 });
  image.data.fill(200);
  return PNG.sync.write(image).toString("base64");
}
const b64 = sheet();
const usage = { input_tokens: 700, input_tokens_details: { text_tokens: 700, image_tokens: 0 },
  output_tokens: 439, output_tokens_details: { image_tokens: 439, text_tokens: 0 }, total_tokens: 1139 };
const okResponse = async () => ({ ok: true, json: async () => ({ data: [{ b64_json: b64 }], usage }) });

async function setup({ envPatch = {}, fetchImpl = okResponse, random = () => 0.5 } = {}) {
  const db = new sqlite3.Database(":memory:");
  db.serialize(() => {
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password TEXT)");
    db.run("CREATE TABLE saved_recipes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, recipe_json TEXT NOT NULL, saved_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  });
  await initZineTables(db);
  const q = promisify(db);
  const calls = [];
  const transport = async (url, request) => { calls.push({ url, request }); return fetchImpl(url, request); };
  const controller = createZineController({ db, env: { ...env, ...envPatch }, fetchImpl: transport, now: fixedNow, random });
  const save = async (userId, value = recipe) =>
    (await q.run("INSERT INTO saved_recipes (user_id, recipe_json) VALUES (?, ?)", [userId, JSON.stringify(value)])).lastID;
  return { db, q, calls, controller, save };
}

function call(handler, { userId = 1, params = {}, body = {} } = {}) {
  return new Promise(resolve => {
    const res = { statusCode: 200, headers: {}, headersSent: false,
      status(code) { this.statusCode = code; return this; },
      set(headers) { Object.assign(this.headers, headers); return this; },
      json(payload) { this.headersSent = true; resolve({ status: this.statusCode, body: payload }); },
      send(payload) { this.headersSent = true; resolve({ status: this.statusCode, body: payload, headers: this.headers }); } };
    handler({ user: { userId }, params, body }, res);
  });
}

test("generation is disabled by default and when model, key, limits or pricing are invalid", () => {
  const now = new Date("2026-10-19T12:00:00Z");
  assert.deepEqual(readGenerationConfig({}, now).reasons.includes("disabled"), true);
  assert.equal(readGenerationConfig(env, now).enabled, true);
  assert.equal(readGenerationConfig(env, now).userDailyLimit, 3);
  assert.equal(readGenerationConfig(env, now).globalDailyLimit, 30);
  for (const patch of [{ OPENAI_IMAGE_MODEL: "gpt-image-1" }, { OPENAI_IMAGE_QUALITY: "high" }, { OPENAI_API_KEY: " " },
    { ZINE_USER_DAILY_LIMIT: "-1" }, { ZINE_GENERATION_ENABLED: "yes" }]) {
    assert.equal(readGenerationConfig({ ...env, ...patch }, now).enabled, false, JSON.stringify(patch));
  }
  assert.equal(readGenerationConfig(env, new Date("2026-11-13T00:00:00Z")).enabled, false);
  assert.deepEqual(readGenerationConfig(env, now).parameters, { model: "gpt-image-2.5-flare", quality: "medium", size: "1024x1024", n: 1, output_format: "png" });
});

test("disabled generation and legacy recipes never call the image API", async () => {
  const off = await setup({ envPatch: { ZINE_GENERATION_ENABLED: "false" } });
  const id = await off.save(1);
  assert.equal((await call(off.controller.generateForRecipe, { params: { savedRecipeId: id } })).status, 503);
  const on = await setup();
  const legacy = await on.save(1, { title: "Old", ingredients: ["rice"], steps: ["Cook."] });
  assert.equal((await call(on.controller.generateForRecipe, { params: { savedRecipeId: legacy } })).status, 422);
  assert.equal(off.calls.length + on.calls.length, 0);
});

test("one request generates, stores four images and records usage without secrets", async () => {
  const { controller, calls, save, q } = await setup();
  const id = await save(1);
  const empty = await call(controller.getForRecipe, { params: { savedRecipeId: id } });
  assert.equal(empty.body.zine, null);
  assert.deepEqual(empty.body.availability, { enabled: true, remainingToday: 3, globalRemainingToday: 30 });

  const started = await call(controller.generateForRecipe, { params: { savedRecipeId: id } });
  assert.equal(started.status, 202);
  assert.equal(started.body.zine.status, "generating");
  assert.equal(started.body.zine.styleId, "notebook");
  await controller.settle();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.openai.com/v1/images/generations");
  assert.equal(calls[0].request.redirect, "error");
  const sent = JSON.parse(calls[0].request.body);
  assert.equal(sent.n, 1); assert.equal(sent.size, "1024x1024"); assert.equal(sent.quality, "medium");
  assert.match(sent.prompt, /The ONLY visible foods are these listed ingredients: \["Chicken","Rice","Salt"\]/);

  const ready = await call(controller.getForRecipe, { params: { savedRecipeId: id } });
  assert.equal(ready.body.zine.status, "ready");
  assert.deepEqual(ready.body.zine.imageKinds, ["hero", "cooking", "ingredients", "decoration"]);
  assert.equal(ready.body.availability.remainingToday, 2);
  const image = await call(controller.getImage, { params: { id: ready.body.zine.id, kind: "hero" } });
  assert.equal(image.headers["Content-Type"], "image/png");
  assert.equal(PNG.sync.read(image.body).width, 512);

  const log = await q.get("SELECT * FROM zine_generations");
  assert.equal(log.result, "success");
  assert.ok(Math.abs(log.cost_estimate_usd - (700 * 5 + 439 * 30) / 1e6) < 1e-12);
  const dump = JSON.stringify(await q.all("SELECT * FROM zines")) + JSON.stringify(await q.all("SELECT * FROM zine_generations"));
  assert.doesNotMatch(dump, /test-secret|Bearer|RECIPE_JSON/);
});

test("other users cannot read, fetch images of, generate for or delete someone else's Zine", async () => {
  const { controller, save } = await setup();
  const id = await save(1);
  const { body } = await call(controller.generateForRecipe, { params: { savedRecipeId: id } });
  await controller.settle();
  const other = { userId: 2 };
  assert.equal((await call(controller.getForRecipe, { ...other, params: { savedRecipeId: id } })).body.zine, null);
  assert.equal((await call(controller.getImage, { ...other, params: { id: body.zine.id, kind: "hero" } })).status, 404);
  assert.equal((await call(controller.generateForRecipe, { ...other, params: { savedRecipeId: id } })).status, 404);
  assert.equal((await call(controller.remove, { ...other, params: { id: body.zine.id } })).status, 404);
  assert.equal((await call(controller.getImage, { params: { id: body.zine.id, kind: "secret" } })).status, 404);
});

test("ready Zines are reused; regeneration is explicit, keeps the style and counts toward the limit", async () => {
  const { controller, calls, save } = await setup({ random: () => 0.99 });
  const id = await save(1);
  await call(controller.generateForRecipe, { params: { savedRecipeId: id } });
  await controller.settle();
  const reused = await call(controller.generateForRecipe, { params: { savedRecipeId: id } });
  assert.equal(reused.status, 200); assert.equal(calls.length, 1);
  const again = await call(controller.generateForRecipe, { params: { savedRecipeId: id }, body: { regenerate: true } });
  assert.equal(again.status, 202); assert.equal(again.body.zine.styleId, "journal");
  await controller.settle();
  assert.equal(calls.length, 2);
  assert.equal((await call(controller.getForRecipe, { params: { savedRecipeId: id } })).body.availability.remainingToday, 1);
});

test("concurrent requests for one user start only one generation", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const { controller, calls, save } = await setup({ fetchImpl: async () => { await gate; return okResponse(); } });
  const first = await save(1), second = await save(1);
  assert.equal((await call(controller.generateForRecipe, { params: { savedRecipeId: first } })).status, 202);
  assert.equal((await call(controller.generateForRecipe, { params: { savedRecipeId: first } })).status, 409);
  assert.equal((await call(controller.generateForRecipe, { params: { savedRecipeId: second } })).status, 409);
  assert.equal((await call(controller.remove, { params: { id: 1 } })).status, 409);
  release(); await controller.settle();
  assert.equal(calls.length, 1);
});

test("per-user and global daily limits block requests, and deleting a Zine does not reset them", async () => {
  const { controller, calls, save } = await setup({ envPatch: { ZINE_USER_DAILY_LIMIT: "2", ZINE_GLOBAL_DAILY_LIMIT: "3" } });
  const ids = [await save(1), await save(1), await save(1)];
  for (const id of ids.slice(0, 2)) { await call(controller.generateForRecipe, { params: { savedRecipeId: id } }); await controller.settle(); }
  const zine = (await call(controller.getForRecipe, { params: { savedRecipeId: ids[0] } })).body.zine;
  assert.equal((await call(controller.remove, { params: { id: zine.id } })).status, 200);
  const blocked = await call(controller.generateForRecipe, { params: { savedRecipeId: ids[2] } });
  assert.equal(blocked.status, 429); assert.match(blocked.body.message, /limit of 2/);
  const otherId = await save(2);
  await call(controller.generateForRecipe, { userId: 2, params: { savedRecipeId: otherId } }); await controller.settle();
  const anotherId = await save(3);
  const globalBlocked = await call(controller.generateForRecipe, { userId: 3, params: { savedRecipeId: anotherId } });
  assert.equal(globalBlocked.status, 429); assert.match(globalBlocked.body.message, /busy today/);
  assert.equal(calls.length, 3);
});

test("failures are not retried, keep a generic message, never store the key and still count", async () => {
  for (const fetchImpl of [async () => { throw new Error(env.OPENAI_API_KEY); },
    async () => ({ ok: false, status: 500, json: async () => ({ error: env.OPENAI_API_KEY }) }),
    async () => ({ ok: true, json: async () => ({ data: [{ url: "https://example.com/x.png" }], usage }) })]) {
    const { controller, calls, save, q } = await setup({ fetchImpl });
    const id = await save(1);
    await call(controller.generateForRecipe, { params: { savedRecipeId: id } });
    await controller.settle();
    assert.equal(calls.length, 1);
    const { body } = await call(controller.getForRecipe, { params: { savedRecipeId: id } });
    assert.equal(body.zine.status, "failed");
    assert.match(body.zine.error, /Your recipe is still complete/);
    assert.deepEqual(body.zine.imageKinds, []);
    assert.equal(body.availability.remainingToday, 2);
    assert.equal((await q.get("SELECT COUNT(*) AS n FROM zine_images")).n, 0);
    assert.doesNotMatch(JSON.stringify(await q.all("SELECT * FROM zines")) + JSON.stringify(await q.all("SELECT * FROM zine_generations")), /test-secret/);
  }
});

test("restart marks interrupted generations failed; deleting a saved recipe removes its Zine", async () => {
  const { db, q, controller, save } = await setup();
  const id = await save(1);
  await call(controller.generateForRecipe, { params: { savedRecipeId: id } });
  await controller.settle();
  await q.run("UPDATE zines SET status = 'generating'");
  await q.run("UPDATE zine_generations SET result = 'pending'");
  await initZineTables(db);
  assert.equal((await q.get("SELECT status FROM zines")).status, "failed");
  assert.equal((await q.get("SELECT result FROM zine_generations")).result, "interrupted");
  await deleteZinesForSavedRecipe(db, id);
  assert.equal((await q.get("SELECT COUNT(*) AS n FROM zines")).n, 0);
  assert.equal((await q.get("SELECT COUNT(*) AS n FROM zine_images")).n, 0);
  assert.equal((await q.get("SELECT COUNT(*) AS n FROM zine_generations")).n, 1);
});

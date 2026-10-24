import { randomUUID } from "node:crypto";
import { promisify } from "../services/zineStore.js";
import { foodImageKey, foodImagePromptVersion, foodImagePurposes, generateFoodImage, readFoodImageConfig } from "../services/foodImageService.js";
import { isValidStructuredRecipe } from "../utils/recipeValidation.js";

const imageFile = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.webp$/;
const urlFor = (id) => `/api/food-images/${id}.webp`;
export const isFoodImageUrl = (value) => typeof value === "string" && /^\/api\/food-images\/[0-9a-f-]{36}\.webp$/.test(value);

const limitMessages = {
  menu: (limit) => `Today's ${limit} pictures for planned dishes are used up. Your recipes are complete without them.`,
  variant: (limit) => `Today's ${limit} pictures for new variations are used up. The recipe is complete without one.`,
  global: () => "Food pictures are busy today. Your recipes are complete without them."
};

// Dependencies are injectable so tests use an in-memory database and a mocked transport.
export function createFoodImageController({ db, env = process.env, fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  const q = promisify(db);
  const inFlight = new Map(); // image key -> Promise<image id | null>; one paid request per dish at a time.

  const dayStart = () => new Date(now().toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString();

  // Reserves one paid request only if the user's purpose limit and the global limit both allow it.
  // Check and insert are one statement, so parallel requests cannot overshoot the limits.
  async function reserve({ userId, purpose, key, config }) {
    const since = dayStart();
    const { lastID, changes } = await q.run(
      `INSERT INTO food_image_requests (user_id, purpose, image_key, result, started_at)
       SELECT ?, ?, ?, 'pending', ?
       WHERE (SELECT COUNT(*) FROM food_image_requests WHERE user_id = ? AND purpose = ? AND started_at >= ?) < ?
         AND (SELECT COUNT(*) FROM food_image_requests WHERE started_at >= ?) < ?`,
      [userId, purpose, key, now().toISOString(), userId, purpose, since, config.limits[purpose], since, config.limits.global]);
    if (changes) return { requestId: lastID };
    const used = await q.get("SELECT COUNT(*) AS count FROM food_image_requests WHERE user_id = ? AND purpose = ? AND started_at >= ?",
      [userId, purpose, since]);
    return { limited: used.count >= config.limits[purpose] ? purpose : "global" };
  }

  async function run({ recipe, key, config, requestId }) {
    const result = await generateFoodImage({ recipe, config, apiKey: env.OPENAI_API_KEY, fetchImpl });
    let id = null;
    if (result.ok) {
      id = randomUUID();
      await q.run("INSERT INTO food_images (id, image_key, prompt_version, model, quality, webp, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, key, foodImagePromptVersion, config.parameters.model, config.parameters.quality, result.bytes, now().toISOString()]);
    }
    await q.run("UPDATE food_image_requests SET result = ?, finished_at = ?, usage_json = ?, cost_estimate_usd = ? WHERE id = ?",
      [result.ok ? "success" : "failure", now().toISOString(), result.usage ? JSON.stringify(result.usage) : null,
        result.costEstimate?.amount ?? null, requestId]);
    return id;
  }

  // A dish saved before its picture arrived gets it now: the user's saved recipes with the same key.
  async function attachToSavedRecipes(userId, key, quality, imageUrl) {
    const rows = await q.all("SELECT id, recipe_json FROM saved_recipes WHERE user_id = ?", [userId]);
    for (const row of rows) {
      let recipe;
      try { recipe = JSON.parse(row.recipe_json); } catch { continue; }
      if (!isValidStructuredRecipe(recipe) || isFoodImageUrl(recipe.imageUrl) || foodImageKey(recipe, quality) !== key) continue;
      await q.run("UPDATE saved_recipes SET recipe_json = ? WHERE id = ?", [JSON.stringify({ ...recipe, imageUrl }), row.id]);
    }
  }

  async function create(req, res) {
    const config = readFoodImageConfig(env, now());
    if (!config.enabled) return res.status(503).json({ message: "Food pictures are not available right now." });
    const { recipe, purpose } = req.body || {};
    if (!foodImagePurposes.includes(purpose)) return res.status(400).json({ message: "Unknown picture request." });
    if (!isValidStructuredRecipe(recipe)) {
      return res.status(422).json({ message: "Pictures are only made for recipes with structured ingredients and steps." });
    }
    const userId = req.user.userId;
    const key = foodImageKey(recipe, config.parameters.quality);

    try {
      // Someone is already getting this exact picture: wait for it instead of paying again. Only if their
      // request hit their own limit does this one try for itself.
      let outcome = inFlight.has(key) ? await inFlight.get(key) : null;
      if (outcome?.id) outcome = { id: outcome.id, cached: true };
      if (!outcome || outcome.limited) {
        // Registered before the first await, so parallel requests for the same dish find it.
        const job = obtain({ userId, purpose, key, recipe, config });
        inFlight.set(key, job);
        job.finally(() => { if (inFlight.get(key) === job) inFlight.delete(key); });
        outcome = await job;
      }
      if (outcome.limited) return res.status(429).json({ message: limitMessages[outcome.limited](config.limits[outcome.limited]) });
      if (!outcome.id) return res.status(502).json({ message: "The picture couldn't be made this time." });
      const imageUrl = urlFor(outcome.id);
      await attachToSavedRecipes(userId, key, config.parameters.quality, imageUrl).catch(() => {});
      res.json({ imageUrl, cached: outcome.cached });
    } catch {
      if (!res.headersSent) res.status(500).json({ message: "The picture couldn't be made this time." });
    }
  }

  // Resolves to { id, cached } | { limited } | { failed }; never rejects.
  async function obtain({ userId, purpose, key, recipe, config }) {
    let requestId = null;
    try {
      const existing = await q.get("SELECT id FROM food_images WHERE image_key = ?", [key]);
      if (existing) return { id: existing.id, cached: true };
      const reservation = await reserve({ userId, purpose, key, config });
      if (reservation.limited) return { limited: reservation.limited };
      requestId = reservation.requestId;
      const id = await run({ recipe, key, config, requestId });
      return id ? { id, cached: false } : { failed: true };
    } catch {
      if (requestId) {
        await q.run("UPDATE food_image_requests SET result = 'failure', finished_at = ? WHERE id = ? AND result = 'pending'",
          [now().toISOString(), requestId]).catch(() => {});
      }
      return { failed: true };
    }
  }

  // Public on purpose: pictures are shared illustrations, not user data, and <img> cannot send a token.
  async function getImage(req, res) {
    const match = imageFile.exec(req.params.file || "");
    if (!match) return res.status(404).json({ message: "Image not found." });
    try {
      const row = await q.get("SELECT webp FROM food_images WHERE id = ?", [match[1]]);
      if (!row) return res.status(404).json({ message: "Image not found." });
      res.set({ "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff" }).send(row.webp);
    } catch {
      res.status(500).json({ message: "Could not load the image." });
    }
  }

  return { create, getImage };
}

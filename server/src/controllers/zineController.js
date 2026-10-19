import { createHash } from "node:crypto";
import { isValidStructuredRecipe } from "../utils/recipeValidation.js";
import { promisify, zineImageKinds } from "../services/zineStore.js";
import { readGenerationConfig, generateZineAssets, zinePromptVersion } from "../services/zineGenerationService.js";

const styleIds = ["collage", "notebook", "journal"];
const failureMessage = "We couldn't create the artwork this time. Your recipe is still complete.";

function formatZine(row) {
  return {
    id: row.id, savedRecipeId: row.saved_recipe_id, styleId: row.style_id, status: row.status,
    error: row.status === "failed" ? row.error : null,
    imageKinds: row.status === "ready" ? zineImageKinds : [],
    promptVersion: row.prompt_version, createdAt: row.created_at, updatedAt: row.updated_at
  };
}

// Dependencies are injectable so tests use an in-memory database and a mocked transport.
export function createZineController({ db, env = process.env, fetchImpl = globalThis.fetch,
  now = () => new Date(), random = Math.random } = {}) {
  const q = promisify(db);
  const busyUsers = new Set(); // Single-process guard: one generation per user at a time.
  const jobs = new Set();

  async function usage(userId) {
    const dayStart = new Date(now().toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString();
    const user = await q.get("SELECT COUNT(*) AS count FROM zine_generations WHERE user_id = ? AND started_at >= ?", [userId, dayStart]);
    const global = await q.get("SELECT COUNT(*) AS count FROM zine_generations WHERE started_at >= ?", [dayStart]);
    return { user: user.count, global: global.count };
  }

  async function availability(userId) {
    const config = readGenerationConfig(env, now());
    const used = await usage(userId);
    return { enabled: config.enabled, remainingToday: Math.max(0, config.userDailyLimit - used.user),
      globalRemainingToday: Math.max(0, config.globalDailyLimit - used.global) };
  }

  async function runJob({ zineId, generationId, recipe, styleId, config, userId }) {
    try {
      const result = await generateZineAssets({ recipe, styleId, config, apiKey: env.OPENAI_API_KEY, fetchImpl });
      const finishedAt = now().toISOString();
      if (result.ok) {
        for (const kind of zineImageKinds) {
          await q.run("INSERT INTO zine_images (zine_id, kind, png) VALUES (?, ?, ?)", [zineId, kind, result.images[kind]]);
        }
        await q.run("UPDATE zines SET status = 'ready', error = NULL, updated_at = ? WHERE id = ?", [finishedAt, zineId]);
      } else {
        await q.run("UPDATE zines SET status = 'failed', error = ?, updated_at = ? WHERE id = ?", [failureMessage, finishedAt, zineId]);
      }
      await q.run("UPDATE zine_generations SET result = ?, finished_at = ?, usage_json = ?, cost_estimate_usd = ? WHERE id = ?",
        [result.ok ? "success" : "failure", finishedAt, result.usage ? JSON.stringify(result.usage) : null,
          result.costEstimate?.amount ?? null, generationId]);
    } catch {
      await q.run("UPDATE zines SET status = 'failed', error = ?, updated_at = ? WHERE id = ?", [failureMessage, now().toISOString(), zineId]).catch(() => {});
      await q.run("UPDATE zine_generations SET result = 'failure', finished_at = ? WHERE id = ?", [now().toISOString(), generationId]).catch(() => {});
    } finally {
      busyUsers.delete(userId);
    }
  }

  async function getForRecipe(req, res) {
    try {
      const row = await q.get("SELECT * FROM zines WHERE saved_recipe_id = ? AND user_id = ?", [req.params.savedRecipeId, req.user.userId]);
      res.json({ zine: row ? formatZine(row) : null, availability: await availability(req.user.userId) });
    } catch {
      res.status(500).json({ message: "Could not load the Zine." });
    }
  }

  async function generateForRecipe(req, res) {
    const userId = req.user.userId;
    const config = readGenerationConfig(env, now());
    if (!config.enabled) return res.status(503).json({ message: "AI artwork is not available right now." });
    if (busyUsers.has(userId)) return res.status(409).json({ message: "Artwork is already being created. Please wait." });
    busyUsers.add(userId);
    let started = false;
    try {
      const saved = await q.get("SELECT id, recipe_json FROM saved_recipes WHERE id = ? AND user_id = ?", [req.params.savedRecipeId, userId]);
      if (!saved) return res.status(404).json({ message: "Saved recipe not found." });
      let recipe;
      try { recipe = JSON.parse(saved.recipe_json); } catch { recipe = null; }
      if (!isValidStructuredRecipe(recipe)) {
        return res.status(422).json({ message: "Artwork is only available for recipes with structured ingredients and steps." });
      }
      const existing = await q.get("SELECT * FROM zines WHERE saved_recipe_id = ?", [saved.id]);
      if (existing?.status === "generating") return res.status(409).json({ message: "Artwork is already being created. Please wait." });
      if (existing?.status === "ready" && req.body?.regenerate !== true) return res.json({ zine: formatZine(existing) });

      const used = await usage(userId);
      if (used.user >= config.userDailyLimit) {
        return res.status(429).json({ message: `You've reached today's limit of ${config.userDailyLimit} artwork creations. Try again tomorrow.` });
      }
      if (used.global >= config.globalDailyLimit) {
        return res.status(429).json({ message: "Artwork creation is busy today. Please try again tomorrow." });
      }

      const timestamp = now().toISOString();
      const recipeHash = createHash("sha256").update(saved.recipe_json).digest("hex");
      let zineId, styleId;
      if (existing) {
        // Regeneration keeps the Zine's stored style identity.
        zineId = existing.id; styleId = existing.style_id;
        await q.run("DELETE FROM zine_images WHERE zine_id = ?", [zineId]);
        await q.run("UPDATE zines SET status = 'generating', error = NULL, prompt_version = ?, recipe_sha256 = ?, updated_at = ? WHERE id = ?",
          [zinePromptVersion, recipeHash, timestamp, zineId]);
      } else {
        styleId = styleIds[Math.floor(random() * styleIds.length)] || styleIds[0];
        ({ lastID: zineId } = await q.run(
          "INSERT INTO zines (user_id, saved_recipe_id, style_id, prompt_version, recipe_sha256, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'generating', ?, ?)",
          [userId, saved.id, styleId, zinePromptVersion, recipeHash, timestamp, timestamp]));
      }
      const { lastID: generationId } = await q.run(
        "INSERT INTO zine_generations (user_id, zine_id, started_at, result) VALUES (?, ?, ?, 'pending')", [userId, zineId, timestamp]);

      started = true;
      const job = runJob({ zineId, generationId, recipe, styleId, config, userId });
      jobs.add(job); job.finally(() => jobs.delete(job));
      const row = await q.get("SELECT * FROM zines WHERE id = ?", [zineId]);
      res.status(202).json({ zine: formatZine(row) });
    } catch {
      if (!res.headersSent) res.status(500).json({ message: "Could not start artwork creation." });
    } finally {
      if (!started) busyUsers.delete(userId);
    }
  }

  async function getImage(req, res) {
    if (!zineImageKinds.includes(req.params.kind)) return res.status(404).json({ message: "Image not found." });
    try {
      const row = await q.get(`SELECT i.png FROM zine_images i JOIN zines z ON z.id = i.zine_id
        WHERE z.id = ? AND z.user_id = ? AND z.status = 'ready' AND i.kind = ?`, [req.params.id, req.user.userId, req.params.kind]);
      if (!row) return res.status(404).json({ message: "Image not found." });
      res.set({ "Content-Type": "image/png", "Cache-Control": "private, no-cache" }).send(row.png);
    } catch {
      res.status(500).json({ message: "Could not load the image." });
    }
  }

  async function remove(req, res) {
    try {
      const row = await q.get("SELECT status FROM zines WHERE id = ? AND user_id = ?", [req.params.id, req.user.userId]);
      if (!row) return res.status(404).json({ message: "Zine not found." });
      if (row.status === "generating") return res.status(409).json({ message: "Artwork is still being created." });
      await q.run("DELETE FROM zine_images WHERE zine_id = ?", [req.params.id]);
      await q.run("DELETE FROM zines WHERE id = ?", [req.params.id]);
      res.json({ message: "Artwork removed." });
    } catch {
      res.status(500).json({ message: "Could not remove the artwork." });
    }
  }

  return { getForRecipe, generateForRecipe, getImage, remove, settle: () => Promise.all([...jobs]) };
}

import { createHash } from "node:crypto";
import { promisify } from "../services/zineStore.js";
import { requestDeepSeekJson, deepSeekModel, RecipeGenerationError } from "../services/deepseekService.js";
import {
  ASSISTANT_TIMEOUT_MS, EDIT_MAX_TOKENS, EXPLAIN_MAX_TOKENS, MAX_ANSWER_LENGTH, buildEditPrompt, buildExplainPrompt,
  editActions, explainQuestions, readAssistantConfig, stepText
} from "../services/assistantService.js";
import { isValidStructuredRecipe } from "../utils/recipeValidation.js";
import { addRecipeMatch, normalizeIngredientName } from "../utils/recipeMatching.js";
import { applyDiet, findDietConflicts } from "../utils/dietRules.js";
import { MAX_CHAINED_EDITS, classifyEdit, recipeDiff } from "../utils/recipeEdits.js";

const editDiets = ["Vegetarian", "Vegan"];
const unusableEdit = "The suggested change didn't come back in a usable form. Your recipe is unchanged.";
const unusableAnswer = "The cooking helper couldn't answer this time. Please try again.";

// Dependencies are injectable so tests use an in-memory database and a mocked DeepSeek request.
export function createAssistantController({ db, env = process.env, requestJson = requestDeepSeekJson, now = () => new Date() } = {}) {
  const q = promisify(db);
  const busyUsers = new Set(); // Single-process guard: one assistant request per user at a time.

  async function usage(userId) {
    const dayStart = new Date(now().toISOString().slice(0, 10) + "T00:00:00.000Z").toISOString();
    const user = await q.get("SELECT COUNT(*) AS count FROM assistant_requests WHERE user_id = ? AND started_at >= ?", [userId, dayStart]);
    const global = await q.get("SELECT COUNT(*) AS count FROM assistant_requests WHERE started_at >= ?", [dayStart]);
    return { user: user.count, global: global.count };
  }

  async function remainingToday(userId, config) {
    return Math.max(0, config.userDailyLimit - (await usage(userId)).user);
  }

  // Runs one paid request inside the busy guard and daily limits, and logs it. `handle` turns the
  // parsed answer into { result, payload }, where result is "success", "rejected" or "failure".
  async function paidRequest(req, res, { kind, prompt, maxTokens, temperature, failureMessage, handle }) {
    const userId = req.user.userId;
    const config = readAssistantConfig(env);
    if (busyUsers.has(userId)) return res.status(409).json({ message: "The assistant is still working on your last request." });
    busyUsers.add(userId);
    const cancelled = new AbortController();
    res.on?.("close", () => { if (!res.writableEnded) cancelled.abort(); });
    let requestId = null;
    try {
      const used = await usage(userId);
      if (used.user >= config.userDailyLimit) {
        return res.status(429).json({ message: `You've used today's ${config.userDailyLimit} assistant requests. Try again tomorrow.` });
      }
      if (used.global >= config.globalDailyLimit) {
        return res.status(429).json({ message: "The assistant is busy today. Please try again tomorrow." });
      }
      ({ lastID: requestId } = await q.run("INSERT INTO assistant_requests (user_id, kind, result, started_at) VALUES (?, ?, 'pending', ?)",
        [userId, kind, now().toISOString()]));
      let answer;
      try {
        answer = await requestJson({ ...prompt, maxTokens, temperature, timeoutMs: ASSISTANT_TIMEOUT_MS, signal: cancelled.signal,
          emptyMessage: "The assistant returned no answer. Please try again." });
      } catch (error) {
        await q.run("UPDATE assistant_requests SET result = 'failure', finished_at = ? WHERE id = ?", [now().toISOString(), requestId]);
        if (cancelled.signal.aborted || res.headersSent) return;
        if (error instanceof RecipeGenerationError) return res.status(error.status).json({ message: error.message });
        return res.status(502).json({ message: "The assistant couldn't answer this time. Please try again." });
      }
      const { result, payload } = await handle(answer.data);
      await q.run("UPDATE assistant_requests SET result = ?, finished_at = ?, prompt_tokens = ?, completion_tokens = ? WHERE id = ?",
        [result, now().toISOString(), answer.usage?.prompt_tokens ?? null, answer.usage?.completion_tokens ?? null, requestId]);
      if (cancelled.signal.aborted) return;
      const remaining = await remainingToday(userId, config);
      if (result === "failure") return res.status(502).json({ message: failureMessage, remainingToday: remaining });
      res.json({ ...payload, remainingToday: remaining });
    } catch {
      if (requestId) await q.run("UPDATE assistant_requests SET result = 'failure' WHERE id = ? AND result = 'pending'", [requestId]).catch(() => {});
      if (!res.headersSent) res.status(500).json({ message: "The assistant couldn't answer this time. Please try again." });
    } finally {
      busyUsers.delete(userId);
    }
  }

  async function status(req, res) {
    try {
      const config = readAssistantConfig(env);
      res.json({ enabled: config.enabled, remainingToday: config.enabled ? await remainingToday(req.user.userId, config) : 0 });
    } catch {
      res.status(500).json({ message: "Could not load the assistant." });
    }
  }

  async function edit(req, res) {
    if (!readAssistantConfig(env).enabled) return res.status(503).json({ message: "The recipe assistant is not available right now." });
    const { recipe, action, ingredient, diet } = req.body || {};
    if (!isValidStructuredRecipe(recipe)) {
      return res.status(422).json({ message: "The assistant only works with recipes that have structured ingredients and steps." });
    }
    if (!editActions.includes(action)) return res.status(400).json({ message: "Unknown change." });
    const editCount = Number.isInteger(recipe.editCount) && recipe.editCount > 0 ? recipe.editCount : 0;
    if (editCount >= MAX_CHAINED_EDITS) {
      return res.status(400).json({ message: `This recipe has already been adjusted ${MAX_CHAINED_EDITS} times. Plan a new dish instead.` });
    }
    const missingName = normalizeIngredientName(ingredient);
    if (action === "missing" && !recipe.ingredients.some((item) => normalizeIngredientName(item.name) === missingName)) {
      return res.status(400).json({ message: "Choose an ingredient from this recipe." });
    }
    if (action === "diet" && !editDiets.includes(diet)) return res.status(400).json({ message: "Choose vegetarian or vegan." });
    if (action === "diet" && findDietConflicts(recipe, diet).length === 0) {
      // Already fits: label it in code, no AI request and nothing counted.
      const labelled = applyDiet(recipe, diet);
      return res.json({ status: "proposed", tier: "minor", recipe: labelled, diff: recipeDiff(recipe, labelled), free: true,
        remainingToday: await remainingToday(req.user.userId, readAssistantConfig(env)) });
    }

    const inventory = await q.all("SELECT name FROM ingredients WHERE user_id = ?", [req.user.userId]);
    const targetDiet = action === "diet" ? diet : (editDiets.includes(recipe.diet) ? recipe.diet : null);

    await paidRequest(req, res, {
      kind: `edit:${action}`, maxTokens: EDIT_MAX_TOKENS, temperature: 0.4, failureMessage: unusableEdit,
      prompt: buildEditPrompt({ recipe, action, ingredient, diet, inventory }),
      async handle(data) {
        const proposal = data?.recipe;
        if (!proposal || typeof proposal !== "object" || proposal.servings !== recipe.servings) return { result: "failure" };
        let edited = addRecipeMatch({ ...proposal, matchScore: 0, youHave: [], youNeed: [] }, inventory);
        if (!isValidStructuredRecipe(edited)) return { result: "failure" };

        const reject = (reason) => ({ result: "rejected", payload: { status: "rejected", reason } });
        if (action === "missing" && edited.ingredients.some((item) => normalizeIngredientName(item.name) === missingName)) {
          return reject(`The suggestion still used ${ingredient}.`);
        }
        if (targetDiet && findDietConflicts(edited, targetDiet).length > 0) {
          return reject(`The suggestion wasn't ${targetDiet.toLowerCase()}.`);
        }
        const { tier, reason } = classifyEdit(recipe, edited);
        if (tier === "rejected") return reject(`${reason} Plan a new dish instead.`);

        const { imageUrl, ...withoutImage } = edited;
        edited = {
          ...(tier === "minor" ? { ...edited, title: recipe.title, ...(recipe.imageUrl ? { imageUrl: recipe.imageUrl } : {}) } : withoutImage),
          editCount: editCount + 1
        };
        if (tier === "variant") {
          if (edited.title === recipe.title) edited.title = `${recipe.title} (variation)`;
          edited.variantOf = recipe.variantOf || recipe.title;
        }
        if (targetDiet) edited = applyDiet(edited, targetDiet);
        return { result: "success", payload: { status: "proposed", tier, recipe: edited, diff: recipeDiff(recipe, edited) } };
      }
    });
  }

  async function explain(req, res) {
    if (!readAssistantConfig(env).enabled) return res.status(503).json({ message: "The cooking helper is not available right now." });
    const { recipe, stepIndex, question } = req.body || {};
    const valid = recipe && typeof recipe.title === "string" && Array.isArray(recipe.steps) && Number.isInteger(stepIndex) &&
      stepIndex >= 0 && stepIndex < recipe.steps.length && typeof stepText(recipe.steps[stepIndex]) === "string" &&
      Object.hasOwn(explainQuestions, question);
    if (!valid) return res.status(400).json({ message: "Choose a step and a question." });

    const prompt = buildExplainPrompt({ recipe, stepIndex, question });
    // Same model, question, recipe and step text => same answer for everyone; no user data in the key.
    const cacheKey = createHash("sha256").update(JSON.stringify([deepSeekModel(), prompt.system, prompt.user])).digest("hex");
    try {
      const cached = await q.get("SELECT answer FROM assistant_explanations WHERE cache_key = ?", [cacheKey]);
      if (cached) return res.json({ answer: cached.answer, cached: true, remainingToday: await remainingToday(req.user.userId, readAssistantConfig(env)) });
    } catch {
      return res.status(500).json({ message: "The cooking helper couldn't answer this time." });
    }

    await paidRequest(req, res, {
      kind: `explain:${question}`, maxTokens: EXPLAIN_MAX_TOKENS, temperature: 0.3, prompt, failureMessage: unusableAnswer,
      async handle(data) {
        const answer = typeof data?.answer === "string" ? data.answer.trim() : "";
        if (!answer || answer.length > MAX_ANSWER_LENGTH) return { result: "failure" };
        await q.run("INSERT OR REPLACE INTO assistant_explanations (cache_key, answer, created_at) VALUES (?, ?, ?)",
          [cacheKey, answer, now().toISOString()]);
        return { result: "success", payload: { answer, cached: false } };
      }
    });
  }

  return { status, edit, explain };
}

// Food images (Phase 4): one top-down picture per dish from OpenAI, shared by everyone through a library
// keyed by dish and visible ingredients. Off unless FOOD_IMAGES_ENABLED=true. One request, no retries.
import { createHash } from "node:crypto";
import { normalizeIngredientName } from "../utils/recipeMatching.js";
import { pricingProfile, usageCostEstimate } from "../utils/zinePocConfig.js";
import { safeUsage } from "./zinePocService.js";

// Bump when buildFoodImagePrompt changes: the version is part of the library key.
export const foodImagePromptVersion = "food-v1";
export const FOOD_IMAGE_TIMEOUT_MS = 120_000;
export const foodImagePurposes = ["menu", "variant"];
const endpoint = "https://api.openai.com/v1/images/generations";
const qualities = ["low", "medium"];

// Ingredients that leave nothing to see on the plate; listing them invites the model to draw them.
const invisible = /^(?:(?:sea |kosher |table )?salt|water|(?:\w+ )*oil|(?:white |brown |caster |granulated )?sugar|(?:ground )?(?:black |white )?pepper|msg|baking (?:soda|powder)|cornstarch|corn starch|ice)$/;

function readLimit(value, fallback) {
  if (value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

// Disabled unless explicitly enabled, and also when the reviewed pricing profile has expired.
export function readFoodImageConfig(env = process.env, now = new Date()) {
  const quality = env.FOOD_IMAGE_QUALITY || "low";
  const limits = {
    menu: readLimit(env.FOOD_IMAGE_MENU_DAILY_LIMIT, 6),
    variant: readLimit(env.FOOD_IMAGE_VARIANT_DAILY_LIMIT, 2),
    global: readLimit(env.FOOD_IMAGE_GLOBAL_DAILY_LIMIT, 100)
  };
  const reasons = [];
  if (env.FOOD_IMAGES_ENABLED !== "true") reasons.push("disabled");
  if (!env.OPENAI_API_KEY?.trim()) reasons.push("missing key");
  if (!qualities.includes(quality)) reasons.push("quality");
  if (Object.values(limits).includes(null)) reasons.push("invalid limits");
  if (!(now >= new Date(pricingProfile.reviewedOn) && now < new Date(pricingProfile.expiresOn))) reasons.push("pricing");
  return {
    enabled: reasons.length === 0, reasons,
    limits: Object.fromEntries(Object.entries(limits).map(([key, value]) => [key, value ?? 0])),
    parameters: { model: pricingProfile.model, quality: qualities.includes(quality) ? quality : "low", size: "1024x1024",
      n: 1, output_format: "webp", output_compression: 80 }
  };
}

export function visibleIngredients(recipe) {
  const names = recipe.ingredients.map((item) => normalizeIngredientName(item.name)).filter((name) => name && !invisible.test(name));
  return [...new Set(names)].sort();
}

// Same dish name and same visible ingredients => same picture, for everyone. Quality is part of the key
// so changing it never serves a picture made at another setting.
export function foodImageKey(recipe, quality) {
  return createHash("sha256")
    .update(JSON.stringify([foodImagePromptVersion, quality, normalizeIngredientName(recipe.title), visibleIngredients(recipe)]))
    .digest("hex");
}

// Short on purpose: output tokens, not prompt length, decide the cost. The allow-list stays because the
// dish name alone makes the model add garnish the recipe doesn't have (server/ZINE_ASSETS_POC.md).
export function buildFoodImagePrompt(recipe) {
  return [
    `Top-down food photo of ${JSON.stringify(recipe.title)}, served on one plain round plate, centred; the plate fills most of the frame.`,
    `Visible food: ${JSON.stringify(visibleIngredients(recipe))}. Show no other food, garnish, herbs or side dishes, even if the dish name suggests them.`,
    "No text, no hands, no cutlery, no props. Soft natural light, plain light background."
  ].join("\n");
}

function isWebp(bytes) {
  return bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
}

// Exactly one request, no retry. Any failure after sending may still be billed.
export async function generateFoodImage({ recipe, config, apiKey, fetchImpl = globalThis.fetch }) {
  let usage = null;
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...config.parameters, prompt: buildFoodImagePrompt(recipe) }),
      redirect: "error", signal: AbortSignal.timeout(FOOD_IMAGE_TIMEOUT_MS)
    });
    if (!response.ok) throw new Error(`HTTP ${Number(response.status) || 0}`);
    const data = await response.json();
    usage = safeUsage(data.usage);
    if (!Array.isArray(data.data) || data.data.length !== 1) throw new Error("Expected one image");
    const encoded = data.data[0]?.b64_json;
    if (typeof encoded !== "string" || !encoded.length || encoded.length > 8_000_000 ||
        encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("Invalid base64");
    const bytes = Buffer.from(encoded, "base64");
    if (!isWebp(bytes)) throw new Error("Not a WebP image");
    return { ok: true, bytes, usage, costEstimate: usageCostEstimate(usage) };
  } catch {
    // Raw API errors are never stored or returned; they may contain request details.
    return { ok: false, usage, costEstimate: usageCostEstimate(usage) };
  }
}

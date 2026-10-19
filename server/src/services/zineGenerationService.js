import { buildAssetPrompt, splitAssetSheet } from "../utils/zineAssets.js";
import { pricingProfile, usageCostEstimate } from "../utils/zinePocConfig.js";
import { safeUsage } from "./zinePocService.js";

// Bump when buildAssetPrompt changes so stored Zines record which prompt produced them.
export const zinePromptVersion = "asset-sheet-v3";
const endpoint = "https://api.openai.com/v1/images/generations";

function positiveInteger(value, fallback) {
  const number = Number(value ?? fallback);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

// Server-side product configuration. Disabled unless explicitly enabled; also disabled when
// the reviewed pricing profile has expired, so costs are never assumed for unreviewed rates.
export function readGenerationConfig(env, now = new Date()) {
  const userDailyLimit = positiveInteger(env.ZINE_USER_DAILY_LIMIT, 3);
  const globalDailyLimit = positiveInteger(env.ZINE_GLOBAL_DAILY_LIMIT, 30);
  const reasons = [];
  if (env.ZINE_GENERATION_ENABLED !== "true") reasons.push("disabled");
  if (env.OPENAI_IMAGE_MODEL !== pricingProfile.model) reasons.push("model");
  if (env.OPENAI_IMAGE_QUALITY !== "medium") reasons.push("quality");
  if (!env.OPENAI_API_KEY?.trim()) reasons.push("key");
  if (userDailyLimit === null || globalDailyLimit === null) reasons.push("limits");
  if (!(now >= new Date(pricingProfile.reviewedOn) && now < new Date(pricingProfile.expiresOn))) reasons.push("pricing");
  return {
    enabled: reasons.length === 0, reasons,
    userDailyLimit: userDailyLimit ?? 0, globalDailyLimit: globalDailyLimit ?? 0,
    parameters: { model: pricingProfile.model, quality: "medium", size: "1024x1024", n: 1, output_format: "png" }
  };
}

// Exactly one request, no retry. Any failure after sending may still be billed.
export async function generateZineAssets({ recipe, styleId, config, apiKey, fetchImpl = globalThis.fetch }) {
  const prompt = buildAssetPrompt(recipe, styleId);
  let usage = null;
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...config.parameters, prompt }),
      redirect: "error", signal: AbortSignal.timeout(180_000)
    });
    if (!response.ok) throw new Error(`HTTP ${Number(response.status) || 0}`);
    const data = await response.json();
    usage = safeUsage(data.usage);
    if (!Array.isArray(data.data) || data.data.length !== 1) throw new Error("Expected one image");
    const encoded = data.data[0]?.b64_json;
    if (typeof encoded !== "string" || !encoded.length || encoded.length > 28_000_000 ||
        encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("Invalid base64");
    const crops = splitAssetSheet(Buffer.from(encoded, "base64"));
    const images = Object.fromEntries(crops.map(crop => [crop.name, crop.bytes]));
    return { ok: true, images, usage, costEstimate: usageCostEstimate(usage) };
  } catch {
    // Raw API errors are never stored or returned; they may contain request details.
    return { ok: false, usage, costEstimate: usageCostEstimate(usage) };
  }
}

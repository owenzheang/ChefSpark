import path from "node:path";
import { mkdir, lstat, realpath, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { projectRoot, defaultRecipePath, parsePocArgs, readLocalFile, safeUsage } from "./zinePocService.js";
import { readZineConfig, assertCostWithinBudget, usageCostEstimate } from "../utils/zinePocConfig.js";
import { buildAssetPrompt, splitAssetSheet } from "../utils/zineAssets.js";

export const assetsRoot = path.join(projectRoot, "server/generated-zines/assets-poc");
const endpoint = "https://api.openai.com/v1/images/generations";
export class AssetPocError extends Error {}

export function parseAssetArgs(args) {
  let style;
  const remaining = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--style" || arg.startsWith("--style=")) {
      if (style !== undefined) throw new AssetPocError("Duplicate style option.");
      style = arg === "--style" ? args[++i] : arg.slice(8);
      if (!["collage", "notebook", "journal"].includes(style)) throw new AssetPocError("Unsupported asset style.");
    } else remaining.push(arg);
  }
  if (!style) throw new AssetPocError("An explicit --style=collage, notebook, or journal is required.");
  try { return { ...parsePocArgs(remaining), style }; }
  catch { throw new AssetPocError("Invalid execution flags. Use --execute --acknowledge-paid --allow-unverified-cost together, or dry-run alone."); }
}

async function safeDirectory(directory) {
  const target = path.resolve(directory);
  const relative = path.relative(assetsRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new AssetPocError("Output must remain under assets-poc.");
  let current = await realpath(projectRoot);
  for (const segment of path.relative(projectRoot, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try { await mkdir(current); } catch (error) { if (error.code !== "EEXIST") throw error; }
    const entry = await lstat(current);
    if (!entry.isDirectory() || entry.isSymbolicLink()) throw new AssetPocError("Unsafe output directory.");
  }
  return current;
}

export async function runAssetPoc({ args = [], env = process.env, now = new Date(),
  fetchImpl = globalThis.fetch, log = console.log, confirmPaid, outputDirectory = assetsRoot } = {}) {
  const options = parseAssetArgs(args);
  let config, recipe, prompt;
  try {
    // Reuse credential-independent settings/rate expiry checks. The asset size is separate
    // from Phase 6A's OPENAI_IMAGE_SIZE, so its existing portrait setting is unchanged.
    config = { ...readZineConfig({ ...env, OPENAI_IMAGE_SIZE: undefined }, now), size: "1024x1024" };
    if (config.quality !== "medium" || (env.ZINE_ASSET_SIZE && env.ZINE_ASSET_SIZE !== config.size)) {
      throw new Error("Invalid settings");
    }
  } catch { throw new AssetPocError("Invalid asset configuration: require supported Flare, medium, ZINE_ASSET_SIZE=1024x1024, positive budget and current pricing profile."); }
  try {
    recipe = JSON.parse((await readLocalFile(options.recipePath || defaultRecipePath, 128_000)).toString("utf8").replace(/^\uFEFF/, ""));
    prompt = buildAssetPrompt(recipe, options.style);
  } catch { throw new AssetPocError("Invalid recipe, style or prompt. No request sent."); }
  const { ceilingUsd, ...parameters } = config;
  const estimate = { reliable: false, estimatedCeilingUsd: null, configuredCeilingUsd: ceilingUsd,
    kind: "unverified total cost, not a guaranteed ceiling" };
  const summary = { mode: options.execute ? "paid execution requested" : "dry-run", endpoint,
    parameters, style: options.style, retries: 0, reference: { mode: "none", count: 0 },
    prompt: { content: "[redacted]", characters: prompt.length, sha256: createHash("sha256").update(prompt).digest("hex") },
    costEstimateVerified: false, estimate, apiKeyConfigured: Boolean(env.OPENAI_API_KEY?.trim()) };
  log(JSON.stringify(summary, null, 2));
  if (!options.execute) return { result: "dry-run", summary };
  if (!options.acknowledgePaid) throw new AssetPocError("Paid execution requires --acknowledge-paid.");
  if (!env.OPENAI_API_KEY?.trim()) throw new AssetPocError("OPENAI_API_KEY is missing. No request sent.");
  if (!options.allowUnverifiedCost) {
    try { assertCostWithinBudget(estimate, config); }
    catch { throw new AssetPocError("Unverified cost blocks normal execution. No request sent."); }
  }
  const cli = path.join(projectRoot, "server/scripts/zine-assets.js");
  if (typeof confirmPaid !== "function" ||
      (fetchImpl === globalThis.fetch && path.resolve(process.argv[1] || "") !== cli)) {
    throw new AssetPocError("Paid asset generation is local developer CLI only; manual confirmation is required.");
  }
  const directory = await safeDirectory(outputDirectory);
  const id = `assets-${now.toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
  const reportPath = path.join(directory, `${id}.json`);
  const report = { ...summary, generationTimestamp: now.toISOString(),
    recipeTitle: recipe.title.split(env.OPENAI_API_KEY).join("[redacted]").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]"),
    model: config.model, quality: config.quality, requestedDimensions: { width: 1024, height: 1024 },
    outputDimensions: null, result: "pending", durationMs: 0, usage: null, usageCostEstimate: null,
    actualCost: null, unverifiedCostOverride: true, estimatedBudgetEnforced: false,
    manualConfirmationReceived: false, requestAttempted: false, outputFiles: {}, crops: [],
    manualVisualReviewRequired: true };
  await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: "wx", mode: 0o600 });
  let started;
  let errorMessage = "Manual confirmation cancelled or unavailable. No request sent.";
  try {
    const body = JSON.stringify({ ...parameters, prompt });
    if (await confirmPaid() !== true) throw new Error("Cancelled");
    report.manualConfirmationReceived = true;
    report.requestAttempted = true;
    started = performance.now();
    errorMessage = "Image request failed or timed out. Billing may have occurred; no retry attempted.";
    const response = await fetchImpl(endpoint, { method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body, redirect: "error", signal: AbortSignal.timeout(180_000) });
    if (!response.ok) {
      errorMessage = `OpenAI image request failed (HTTP ${Number(response.status) || 0}). No retry attempted.`;
      throw new Error("API error");
    }
    const data = await response.json();
    report.durationMs = Math.round(performance.now() - started);
    report.usage = safeUsage(data.usage);
    report.usageCostEstimate = usageCostEstimate(report.usage);
    errorMessage = "Invalid asset image, dimensions or local output failure. Billing may have occurred; no retry attempted.";
    if (!Array.isArray(data.data) || data.data.length !== 1) throw new Error("Expected one image");
    const encoded = data.data[0]?.b64_json;
    if (typeof encoded !== "string" || !encoded.length || encoded.length > 28_000_000 ||
        encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("Invalid base64");
    const bytes = Buffer.from(encoded, "base64");
    // Save the untouched response first, even if cropping then fails, for manual diagnosis.
    const sheetPath = path.join(directory, `${id}-sheet.png`);
    await writeFile(sheetPath, bytes, { flag: "wx", mode: 0o600 });
    report.outputFiles.sheet = path.relative(projectRoot, sheetPath);
    const crops = splitAssetSheet(bytes);
    report.outputDimensions = { width: 1024, height: 1024 };
    for (const { bytes: cropBytes, ...crop } of crops) {
      const file = path.join(directory, `${id}-${crop.name}.png`);
      await writeFile(file, cropBytes, { flag: "wx", mode: 0o600 });
      report.outputFiles[crop.name] = path.relative(projectRoot, file);
      report.crops.push({ ...crop, path: report.outputFiles[crop.name] });
    }
    report.result = "success";
  } catch {
    if (started && !report.durationMs) report.durationMs = Math.round(performance.now() - started);
    report.result = "failure";
    report.error = errorMessage;
  }
  try { await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 }); }
  catch { throw new AssetPocError("Could not finalize local report. Inspect outputs and billing before retrying."); }
  log(JSON.stringify({ result: report.result, report: path.relative(projectRoot, reportPath) }));
  if (report.result === "failure") throw new AssetPocError(report.error);
  return { result: "success", report, reportPath };
}

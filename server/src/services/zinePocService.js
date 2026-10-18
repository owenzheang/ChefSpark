import { readFile, stat, realpath, mkdir, lstat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { inflateSync } from "node:zlib";
import { buildDiscoverPrompt } from "../utils/discoverPrompt.js";
import { readZineConfig, estimateZineCost, assertCostWithinBudget, usageCostEstimate } from "../utils/zinePocConfig.js";

export const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
export const defaultRecipePath = path.join(projectRoot, "server/test/fixtures/chicken-fried-rice.json");
export const referencePath = path.join(projectRoot, "client/public/zine-samples/discover.png");
export const outputRoot = path.join(projectRoot, "server/generated-zines/poc");
const endpoint = "https://api.openai.com/v1/images/edits";
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

export function parsePocArgs(args) {
  const options = { execute: false, acknowledgePaid: false, recipePath: defaultRecipePath };
  const seen = new Set();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (seen.has(arg)) throw new Error("Duplicate CLI option. No request sent.");
    seen.add(arg);
    if (arg === "--execute") options.execute = true;
    else if (arg === "--acknowledge-paid") options.acknowledgePaid = true;
    else if (arg === "--allow-unverified-cost") options.allowUnverifiedCost = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--recipe" && args[i + 1] && !args[i + 1].startsWith("--")) {
      options.recipePath = path.resolve(args[++i]);
    } else throw new Error("Unknown or incomplete CLI option. No request sent.");
  }
  if (options.dryRun && options.execute) throw new Error("Cannot combine --dry-run and --execute.");
  if (options.acknowledgePaid && !options.execute) throw new Error("Paid acknowledgement requires --execute.");
  if (options.allowUnverifiedCost && (!options.execute || !options.acknowledgePaid)) {
    throw new Error("Paid execution override requires --execute AND --acknowledge-paid.");
  }
  return options;
}

export async function readLocalFile(file, maxBytes) {
  const resolved = await realpath(file);
  if (!inside(await realpath(projectRoot), resolved)) throw new Error("Input must remain within the project.");
  const info = await stat(resolved);
  if (!info.isFile() || info.size > maxBytes) throw new Error("Input file is invalid or too large.");
  return readFile(resolved);
}

export function inspectPng(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 45 ||
      !bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) ||
      bytes.toString("ascii", 12, 16) !== "IHDR" || bytes.readUInt32BE(8) !== 13) {
    throw new Error("Invalid PNG image.");
  }
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height || width * height > 20_000_000) throw new Error("Unsupported PNG dimensions.");
  const chunks = [];
  let offset = 8, ended = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    if (offset + 12 + length > bytes.length) throw new Error("Truncated PNG.");
    let crc = 0xffffffff;
    for (const byte of bytes.subarray(offset + 4, offset + 8 + length)) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    if (((crc ^ 0xffffffff) >>> 0) !== bytes.readUInt32BE(offset + 8 + length)) {
      throw new Error("Corrupt PNG checksum.");
    }
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
    if (type === "IEND") { ended = length === 0 && offset === bytes.length; break; }
  }
  if (!ended || !chunks.length) throw new Error("Incomplete PNG.");
  // Check the compressed image data without installing an image-processing library.
  if (!inflateSync(Buffer.concat(chunks), { maxOutputLength: 160_000_000 }).length) {
    throw new Error("Empty PNG.");
  }
  return { width, height, bytes: bytes.length, sha256: hash(bytes) };
}

async function prepareOutputDirectory(directory) {
  const target = path.resolve(directory);
  if (!inside(outputRoot, target)) throw new Error("Output must stay in server/generated-zines/poc.");
  // Walk from the real project root, refusing symlinks/junctions at every output level.
  let current = await realpath(projectRoot);
  for (const segment of path.relative(projectRoot, target).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try { await mkdir(current); } catch (error) { if (error.code !== "EEXIST") throw error; }
    const info = await lstat(current);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error("Unsafe output directory.");
  }
  return current;
}

export function safeUsage(value) {
  if (!value || typeof value !== "object") return null;
  const pick = object => Object.fromEntries(
    ["input_tokens", "output_tokens", "total_tokens", "text_tokens", "image_tokens", "cached_tokens"]
      .filter(key => Number.isSafeInteger(object?.[key]) && object[key] >= 0)
      .map(key => [key, object[key]])
  );
  return { ...pick(value), input_tokens_details: pick(value.input_tokens_details),
    ...(value.output_tokens_details ? { output_tokens_details: pick(value.output_tokens_details) } : {}) };
}

export async function runZinePoc({
  args = [], env = process.env, fetchImpl = globalThis.fetch,
  log = console.log, now = new Date(), outputDirectory = outputRoot,
  estimateCost = estimateZineCost, confirmUnverifiedCost
} = {}) {
  // Mock cost profiles are permitted only alongside an injected transport in unit tests.
  // The CLI exposes neither dependency and always uses the real cost gate.
  if (estimateCost !== estimateZineCost && fetchImpl === globalThis.fetch) {
    throw new Error("Reliable cost estimation cannot be overridden for the live transport.");
  }
  const options = parsePocArgs(args);
  const config = readZineConfig(env, now);
  let recipe, reference, referenceInfo;
  try {
    recipe = JSON.parse((await readLocalFile(options.recipePath, 128_000)).toString("utf8").replace(/^\uFEFF/, ""));
    reference = await readLocalFile(referencePath, 50_000_000);
    referenceInfo = inspectPng(reference);
  } catch {
    throw new Error("Recipe JSON or local reference PNG could not be validated. No request sent.");
  }
  const prompt = buildDiscoverPrompt(recipe);
  const estimate = estimateCost(config, prompt, referenceInfo.width, referenceInfo.height);
  const { ceilingUsd, ...parameters } = config;
  const summary = {
    mode: options.execute ? "paid execution requested" : "dry-run",
    endpoint, parameters, retries: 0,
    reference: { path: "client/public/zine-samples/discover.png", count: 1, ...referenceInfo },
    prompt: { content: "[redacted]", characters: prompt.length, sha256: hash(prompt),
      ingredients: recipe.ingredients.length, steps: recipe.steps.length },
    apiKeyConfigured: Boolean(env.OPENAI_API_KEY?.trim()),
    accountAccessVerified: false, costEstimateVerified: estimate.reliable === true, estimate
  };
  log(JSON.stringify(summary, null, 2));
  if (!options.execute) return { result: "dry-run", summary };
  if (!options.acknowledgePaid) throw new Error("Paid execution requires --execute AND --acknowledge-paid. No request sent.");
  if (!env.OPENAI_API_KEY?.trim()) throw new Error("OPENAI_API_KEY is missing. No request sent.");
  const unverifiedOverride = options.allowUnverifiedCost === true && estimate.reliable === false;
  if (options.allowUnverifiedCost) {
    if (config.model !== "gpt-image-2.5-flare" || config.quality !== "medium" ||
        config.size !== "1024x1536" || config.n !== 1) {
      throw new Error("Paid execution override requires Flare, medium quality, 1024x1536, and one image.");
    }
    const cliPath = path.join(projectRoot, "server/scripts/zine-poc.js");
    if (typeof confirmUnverifiedCost !== "function" ||
        (fetchImpl === globalThis.fetch && path.resolve(process.argv[1] || "") !== cliPath)) {
      throw new Error("Paid execution override is available only through the local developer CLI.");
    }
  }
  if (!unverifiedOverride) assertCostWithinBudget(estimate, config);

  const directory = await prepareOutputDirectory(outputDirectory);
  const id = `discover-${now.toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`;
  const imagePath = path.join(directory, id + ".png");
  const reportPath = path.join(directory, id + ".json");
  const report = {
    generationTimestamp: now.toISOString(), model: config.model, parameters,
    recipeTitle: recipe.title.split(env.OPENAI_API_KEY).join("[redacted]").replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]"),
    reference: summary.reference, prompt: summary.prompt,
    durationMs: 0, outputLocation: null, estimate, usage: null,
    actualCost: null, result: "pending", retries: 0,
    costEstimateVerified: estimate.reliable === true,
    unverifiedCostOverride: unverifiedOverride,
    estimatedBudgetEnforced: !unverifiedOverride,
    manualConfirmationReceived: false,
    usageCostEstimate: null
  };
  // Confirm writable storage before sending. Pending reports expose interrupted attempts.
  await writeFile(reportPath, JSON.stringify(report, null, 2), { flag: "wx", mode: 0o600 });
  const started = performance.now();
  let safeError = "Image request failed or timed out. Billing may have occurred; inspect your account before a manual retry.";
  try {
    const body = new FormData();
    for (const [key, value] of Object.entries(parameters)) body.append(key, String(value));
    body.append("prompt", prompt);
    body.append("image", new Blob([reference], { type: "image/png" }), "discover.png");
    if (unverifiedOverride) {
      safeError = "Paid execution cancelled before sending; manual confirmation was not completed.";
      const confirmed = await confirmUnverifiedCost();
      if (confirmed !== true) throw new Error("Not confirmed");
      report.manualConfirmationReceived = true;
    }
    safeError = "Image request failed or timed out. Billing may have occurred; inspect your account before a manual retry.";
    // Native fetch does not retry. Refuse redirects; never forward the key to another host.
    const response = await fetchImpl(endpoint, {
      method: "POST", headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body, redirect: "error", signal: AbortSignal.timeout(180_000)
    });
    if (!response.ok) {
      safeError = `OpenAI image request failed (HTTP ${Number(response.status) || 0}). No retry attempted.`;
      throw new Error("API failure");
    }
    safeError = "Invalid image response or local output failure. Billing may have occurred; no retry attempted.";
    const data = await response.json();
    report.usage = safeUsage(data.usage);
    report.usageCostEstimate = usageCostEstimate(report.usage);
    if (!Array.isArray(data.data) || data.data.length !== 1) throw new Error("Expected one image");
    const encoded = data.data[0]?.b64_json;
    if (typeof encoded !== "string" || !encoded.length || encoded.length > 70_000_000 ||
        encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("Invalid image");
    const bytes = Buffer.from(encoded, "base64");
    const outputInfo = inspectPng(bytes);
    if (outputInfo.width !== 1024 || outputInfo.height !== 1536) throw new Error("Unexpected image size");
    await writeFile(imagePath, bytes, { flag: "wx", mode: 0o600 });
    report.outputLocation = path.relative(projectRoot, imagePath);
    report.outputSha256 = outputInfo.sha256;
    report.result = "success";
  } catch {
    report.result = "failure";
    report.error = safeError; // Never log raw API bodies, exceptions, prompts or headers.
  }
  report.durationMs = Math.round(performance.now() - started);
  try {
    await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  } catch {
    throw new Error("Could not finalize local report. Billing may have occurred; do not automatically retry.");
  }
  log(JSON.stringify({ result: report.result, report: path.relative(projectRoot, reportPath) }));
  if (report.result === "failure") throw new Error(report.error);
  return { result: "success", imagePath, reportPath, report };
}

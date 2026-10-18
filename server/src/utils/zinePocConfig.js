// Sources and assumptions are documented in server/ZINE_POC.md.
// This profile is intentionally narrow: never guess rates for a different model.
export const pricingProfile = Object.freeze({
  model: "gpt-image-2.5-flare",
  reviewedOn: "2026-10-13",
  expiresOn: "2026-11-13", // Local review deadline, NOT a model shutdown date.
  textInputPerMillion: 5,
  imageInputPerMillion: 8,
  imageOutputPerMillion: 30
});

export function readZineConfig(env, now = new Date()) {
  if (env.OPENAI_IMAGE_MODEL !== pricingProfile.model) {
    throw new Error("Unsupported or missing OPENAI_IMAGE_MODEL; no verified cost profile. No request sent.");
  }
  if (!["low", "medium", "high"].includes(env.OPENAI_IMAGE_QUALITY)) {
    throw new Error("OPENAI_IMAGE_QUALITY must explicitly be low, medium, or high. No request sent.");
  }
  if (env.OPENAI_IMAGE_SIZE && env.OPENAI_IMAGE_SIZE !== "1024x1536") {
    throw new Error("Only portrait 1024x1536 is supported by this PoC. No request sent.");
  }
  const ceiling = Number(env.ZINE_POC_MAX_COST_USD);
  if (!Number.isFinite(ceiling) || ceiling <= 0) {
    throw new Error("Set a positive ZINE_POC_MAX_COST_USD. No request sent.");
  }
  if (!Number.isFinite(now.getTime()) || now < new Date(pricingProfile.reviewedOn) ||
      now >= new Date(pricingProfile.expiresOn)) {
    throw new Error("Cost profile expired or clock invalid. Review model availability and pricing before execution.");
  }
  return Object.freeze({
    model: env.OPENAI_IMAGE_MODEL, quality: env.OPENAI_IMAGE_QUALITY,
    size: "1024x1536", n: 1, output_format: "png",
    ceilingUsd: ceiling
  });
}

export function estimateZineCost(config, prompt, width, height) {
  if (config.model !== pricingProfile.model || config.n !== 1 ||
      config.size !== "1024x1536" || config.input_fidelity !== undefined ||
      !["low", "medium", "high"].includes(config.quality) ||
      !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("Reliable cost estimation unavailable for these settings. No request sent.");
  }
  // The official vision tile formula only covers GPT Image 1, not Flare.
  // Published token rates alone cannot establish the total reference-edit cost.
  // Never reuse legacy output tokens or hide an unknown input cost behind a margin.
  const textInputTokenAllowance = Buffer.byteLength(prompt, "utf8") + 1024;
  return {
    currency: "USD", kind: "unavailable; normal paid execution blocked", reliable: false,
    reason: "Full model-specific reference-image and output token estimation has not been verified.",
    textInputTokenAllowance, imageInputTokens: null, outputTokens: null,
    estimatedCeilingUsd: null, configuredCeilingUsd: config.ceilingUsd,
    ratesPerMillion: { textInput: 5, imageInput: 8, imageOutput: 30 },
    pricingReviewedOn: pricingProfile.reviewedOn, pricingExpiresOn: pricingProfile.expiresOn
  };
}

export function assertCostWithinBudget(estimate, config) {
  if (estimate?.reliable !== true || !Number.isFinite(estimate.estimatedCeilingUsd) ||
      estimate.estimatedCeilingUsd <= 0) {
    throw new Error("Reliable cost estimation unavailable. Paid execution blocked; no request sent.");
  }
  if (!Number.isFinite(config.ceilingUsd) || config.ceilingUsd <= 0 ||
      estimate.estimatedCeilingUsd > config.ceilingUsd) {
    throw new Error("Estimated request cost exceeds ZINE_POC_MAX_COST_USD. No request sent.");
  }
}

export function usageCostEstimate(usage) {
  const text = usage?.input_tokens_details?.text_tokens;
  const image = usage?.input_tokens_details?.image_tokens;
  const output = usage?.output_tokens_details ? usage.output_tokens_details.image_tokens : usage?.output_tokens;
  if (![text, image, output].every(value => Number.isSafeInteger(value) && value >= 0)) return null;
  return {
    currency: "USD", kind: "usage-based estimate, not billed cost; no cache discount assumed",
    amount: (text * pricingProfile.textInputPerMillion + image * pricingProfile.imageInputPerMillion +
      output * pricingProfile.imageOutputPerMillion) / 1e6
  };
}

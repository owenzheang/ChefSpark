// Development-only, manually reviewed Phase 6B.2 crops. Presentation only: each sample
// depicts one specific dish and style, so it is shown only for that exact pairing.
// The rejected hero crop is deliberately absent. See server/ZINE_ASSETS_POC.md.
const base = "/zine-assets/dev-samples/chicken-fried-rice-collage";
export const zineAssetSamples = [
  { id: "chicken-fried-rice-collage", recipeTitle: "Chicken Fried Rice", styleId: "collage",
    sourceReport: "assets-2026-10-15T13-34-52-969Z-beb5196f-dab4-42eb-9c48-f2c96ae52b69", reviewedOn: "2026-10-19",
    assets: {
      ingredients: { src: `${base}/ingredients.png`, alt: "Hand-drawn chicken, a bowl of rice and a dish of salt" },
      cooking: { src: `${base}/cooking.png`, alt: "Pieces of chicken browning in a pan with a wooden spatula" },
      decoration: { src: `${base}/decoration.png`, alt: "" }
    } }
];

const normalise = value => typeof value === "string" ? value.trim().toLowerCase() : "";

// Requires development mode, ?zineAssets=sample, the matching style and the matching dish title.
export function developerAssetSample(search, isDevelopment, recipe, styleId) {
  if (!isDevelopment || new URLSearchParams(search).get("zineAssets") !== "sample") return null;
  return zineAssetSamples.find(sample => sample.styleId === styleId &&
    sample.recipeTitle.toLowerCase() === normalise(recipe?.title)) || null;
}

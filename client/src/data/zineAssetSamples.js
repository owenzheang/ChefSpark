// Development-only, manually reviewed Phase 6B.2 crops. Presentation only: each sample
// depicts one specific dish and style, so it is shown only for that exact pairing.
// All four crops come from one sheet so lighting and palette match. See server/ZINE_ASSETS_POC.md.
const base = "/zine-assets/dev-samples/chicken-fried-rice-collage";
export const zineAssetSamples = [
  { id: "chicken-fried-rice-collage", recipeTitle: "Chicken Fried Rice", styleId: "collage",
    sourceReport: "assets-2026-10-19T11-29-02-914Z-ecad0a78-65ae-4867-8cb2-8908f15db993", reviewedOn: "2026-10-19",
    assets: {
      hero: { src: `${base}/hero.png`, alt: "A bowl of rice with pieces of cooked chicken" },
      ingredients: { src: `${base}/ingredients.png`, alt: "Hand-drawn chicken breast, a bowl of rice and a dish of salt" },
      cooking: { src: `${base}/cooking.png`, alt: "Chicken pieces and rice cooking in a pan with a wooden spatula" },
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

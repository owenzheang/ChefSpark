// Code-side rules for assistant edits: how far an edited recipe drifted from the original, and
// exactly what changed. The AI proposes; these decide whether the result is still the same dish.
import { normalizeIngredientName } from "./recipeMatching.js";

export const MAX_CHAINED_EDITS = 3;

// The ingredients that make a dish what it is: its main protein and its staple.
// Staples are checked first so "egg noodles" counts as the staple.
const coreGroups = {
  staple: ["rice", "noodle", "pasta", "spaghetti", "penne", "macaroni", "fusilli", "linguine", "udon",
    "vermicelli", "bread", "tortilla", "wrap", "potato", "quinoa", "couscous", "oat", "dumpling", "gnocchi"],
  protein: ["chicken", "beef", "pork", "lamb", "mutton", "duck", "turkey", "fish", "salmon", "tuna", "cod",
    "shrimp", "prawn", "crab", "squid", "scallop", "mussel", "clam", "tofu", "tempeh", "seitan", "egg",
    "bean", "chickpea", "lentil", "sausage", "bacon", "ham", "mince", "steak", "paneer", "halloumi"]
};
const groupPatterns = Object.fromEntries(Object.entries(coreGroups).map(([group, words]) =>
  [group, new RegExp(`\\b(?:${words.join("|")})(?:s|es)?\\b`)]));
// Not the main protein or staple even though the name contains one of the words.
const notCore = /\b(?:stock|broth|sauce|paste|powder|flour|starch|vinegar|wine|oil|milk|sprouts?|green beans?|bean sprouts?|eggplant)\b/;

export function coreGroupOf(name) {
  const text = normalizeIngredientName(name);
  if (!text || notCore.test(text)) return null;
  for (const [group, pattern] of Object.entries(groupPatterns)) if (pattern.test(text)) return group;
  return null;
}

function names(recipe) {
  return recipe.ingredients.map((item) => normalizeIngredientName(item.name));
}

function formatAmount(item) {
  if (item.quantity === null || item.quantity === undefined) return item.unit || "to taste";
  return `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`;
}

// What changed, for the before/after preview. Computed from the two recipes, never taken from the AI.
export function recipeDiff(original, edited) {
  const before = new Map(original.ingredients.map((item) => [normalizeIngredientName(item.name), item]));
  const after = new Map(edited.ingredients.map((item) => [normalizeIngredientName(item.name), item]));
  const removed = [...before].filter(([key]) => !after.has(key)).map(([, item]) => item.name);
  const added = [...after].filter(([key]) => !before.has(key)).map(([, item]) => ({ name: item.name, amount: formatAmount(item) }));
  const changed = [...after].filter(([key, item]) => before.has(key) && formatAmount(before.get(key)) !== formatAmount(item))
    .map(([key, item]) => ({ name: item.name, from: formatAmount(before.get(key)), to: formatAmount(item) }));
  const steps = Math.max(original.steps.length, edited.steps.length);
  let stepsChanged = 0;
  for (let index = 0; index < steps; index += 1) {
    if (original.steps[index]?.instruction !== edited.steps[index]?.instruction) stepsChanged += 1;
  }
  return {
    title: original.title === edited.title ? null : { from: original.title, to: edited.title },
    removed, added, changed,
    steps: { from: original.steps.length, to: edited.steps.length, changed: stepsChanged },
    cookTime: original.cookTime === edited.cookTime ? null : { from: original.cookTime, to: edited.cookTime },
    matchScore: { from: original.matchScore, to: edited.matchScore }
  };
}

// "minor": same dish, keeps its title. "variant": a core swap or a larger change; saved as a new dish.
// "rejected": a different dish (a core ingredient lost with nothing in its place, or most ingredients
// changed); the user is pointed to planning a new dish instead.
export function classifyEdit(original, edited) {
  const before = new Set(names(original));
  const after = new Set(names(edited));
  const removed = [...before].filter((name) => !after.has(name));
  const added = [...after].filter((name) => !before.has(name));
  const share = Math.max(removed.length, added.length) / Math.max(before.size, 1);

  for (const group of Object.keys(coreGroups)) {
    const had = [...before].some((name) => coreGroupOf(name) === group);
    const has = [...after].some((name) => coreGroupOf(name) === group);
    if (had && !has) {
      return { tier: "rejected", reason: `That would take out the dish's main ${group === "protein" ? "protein" : "staple"}, so it would be a different dish.` };
    }
  }
  if (share > 0.5) return { tier: "rejected", reason: "That changes most of the ingredients, so it would be a different dish." };

  const coreSwapped = removed.some((name) => coreGroupOf(name)) || added.some((name) => coreGroupOf(name));
  return { tier: coreSwapped || share > 0.3 ? "variant" : "minor" };
}

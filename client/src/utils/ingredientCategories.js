import { ingredientCatalog } from "../data/ingredientCatalog.js";

export function normalizeIngredientName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// For sentences like "You have 2: Pasta, Onion". The AI writes names in mixed case ("tomatoes",
// "grated Parmesan"); each word gets a capital, the rest is left as written.
export function displayIngredientName(name) {
  return String(name).trim().replace(/\s+/g, " ").replace(/(^|\s)(\p{Ll})/gu, (_, space, letter) => space + letter.toUpperCase());
}

const categories = new Map(
  ingredientCatalog.map(({ name, category }) => [normalizeIngredientName(name), category])
);

export function getIngredientCategory(name) {
  return categories.get(normalizeIngredientName(name)) ?? "other";
}


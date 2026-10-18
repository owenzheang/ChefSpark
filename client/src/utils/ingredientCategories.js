import { ingredientCatalog } from "../data/ingredientCatalog.js";

export function normalizeIngredientName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const categories = new Map(
  ingredientCatalog.map(({ name, category }) => [normalizeIngredientName(name), category])
);

export function getIngredientCategory(name) {
  return categories.get(normalizeIngredientName(name)) ?? "other";
}


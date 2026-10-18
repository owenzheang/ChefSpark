import { ingredientCatalog } from "../data/ingredientCatalog.js";
import { normalizeIngredientName } from "./ingredientCategories.js";

function editDistance(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[right.length];
}

export function searchIngredients(input) {
  const query = normalizeIngredientName(input);
  if (!query) return [];

  return ingredientCatalog.flatMap((ingredient, index) => {
    const name = normalizeIngredientName(ingredient.name);
    let rank;
    let distance = 0;
    if (name === query) rank = 0;
    else if (name.startsWith(query)) rank = 1;
    else if (name.includes(query)) rank = 2;
    else {
      // Short input is too ambiguous to correct. Longer names allow at most two edits.
      const limit = query.length >= 8 ? 2 : 1;
      if (query.length < 5 || Math.abs(name.length - query.length) > limit) return [];
      distance = editDistance(query, name);
      if (distance > limit || distance / Math.max(name.length, query.length) > 0.2) return [];
      rank = 3;
    }
    return [{ ...ingredient, isCorrection: rank === 3, rank, distance, index }];
  })
    .sort((a, b) => a.rank - b.rank || a.distance - b.distance || a.index - b.index)
    .slice(0, 5)
    .map(({ name, category, isCorrection }) => ({ name, category, isCorrection }));
}


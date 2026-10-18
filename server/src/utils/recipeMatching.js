const pantryDefaultIngredients = [
  "salt",
  "sugar",
  "basic cooking oil",
  "cooking oil"
];

export function normalizeIngredientName(ingredientName) {
  if (typeof ingredientName !== "string") {
    return "";
  }

  return ingredientName.trim().toLowerCase().replace(/\s+/g, " ");
}

// AI proposes equivalence; these reviewed groups bound what the backend will accept.
// Keep cuts, substitutes, generic categories, and specific oils out of these groups.
const sameIngredientGroups = [
  ["chicken wing", "chicken wings"],
  ["egg", "eggs"],
  ["spring onion", "spring onions", "scallion", "scallions"]
];

function validatedSameMatches(records, requiredNames, inventoryNames) {
  const matches = new Set();
  if (!Array.isArray(records)) return matches;

  const recordsByRequirement = new Map();
  for (const record of records) {
    if (!record || typeof record !== "object" || Array.isArray(record)) continue;
    const required = normalizeIngredientName(record.requiredIngredient);
    if (!requiredNames.has(required)) continue;
    const entries = recordsByRequirement.get(required) ?? [];
    entries.push(record);
    recordsByRequirement.set(required, entries);
  }

  for (const [required, entries] of recordsByRequirement) {
    // Ambiguous or duplicate judgments cannot grant semantic credit.
    if (entries.length !== 1) continue;
    const record = entries[0];
    if (record.matchType !== "same" || typeof record.matchedUserIngredient !== "string") continue;
    if (Object.keys(record).some(key => !["requiredIngredient", "matchedUserIngredient", "matchType"].includes(key))) continue;
    const owned = normalizeIngredientName(record.matchedUserIngredient);
    if (!inventoryNames.has(owned)) continue;
    if (sameIngredientGroups.some(group => group.includes(required) && group.includes(owned))) {
      matches.add(required);
    }
  }
  return matches;
}

export function calculateRecipeMatch(recipeIngredients, userIngredients, ingredientMatches) {
  const inventoryIngredients = new Set();

  userIngredients.forEach((ingredient) => {
    const ingredientName = typeof ingredient === "string" ? ingredient : ingredient?.name;
    const normalizedName = normalizeIngredientName(ingredientName);

    if (normalizedName) {
      inventoryIngredients.add(normalizedName);
    }
  });

  const availableIngredients = new Set([...inventoryIngredients, ...pantryDefaultIngredients]);

  const uniqueRequirements = new Map();
  recipeIngredients.forEach((ingredient) => {
    const ingredientName = typeof ingredient === "string" ? ingredient : ingredient.name;
    const normalizedName = normalizeIngredientName(ingredientName);
    if (!normalizedName || uniqueRequirements.has(normalizedName)) return;
    uniqueRequirements.set(normalizedName, {
      displayName: ingredientName.trim().replace(/\s+/g, " "),
      normalizedName
    });
  });
  const requiredIngredients = [...uniqueRequirements.values()];
  const semanticMatches = validatedSameMatches(
    ingredientMatches, new Set(uniqueRequirements.keys()), inventoryIngredients
  );

  const youHave = [];
  const youNeed = [];
  let matchedIngredientCount = 0;

  requiredIngredients.forEach(({ displayName, normalizedName }) => {
    const owned = inventoryIngredients.has(normalizedName) || semanticMatches.has(normalizedName);
    if (availableIngredients.has(normalizedName) || owned) {
      matchedIngredientCount += 1;
      if (owned) {
        youHave.push(displayName);
      }
    } else {
      youNeed.push(displayName);
    }
  });

  const totalIngredientCount = requiredIngredients.length;
  const matchScore = totalIngredientCount === 0
    ? 0
    : Math.round((matchedIngredientCount / totalIngredientCount) * 100);

  return { matchScore, youHave, youNeed };
}

export function addRecipeMatch(recipe, userIngredients) {
  const { ingredientMatches, ...publicRecipe } = recipe;
  return {
    ...publicRecipe,
    ...calculateRecipeMatch(recipe.ingredients, userIngredients, ingredientMatches)
  };
}

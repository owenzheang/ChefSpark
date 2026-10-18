const validDifficulties = ["Easy", "Medium", "Hard"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isOptionalString(value) {
  return value === undefined || typeof value === "string";
}

function isValidStructuredIngredient(ingredient) {
  return (
    ingredient &&
    typeof ingredient === "object" &&
    isNonEmptyString(ingredient.name) &&
    (
      ingredient.quantity === null ||
      (Number.isFinite(ingredient.quantity) && ingredient.quantity > 0)
    ) &&
    typeof ingredient.unit === "string"
  );
}

function isValidStructuredStep(step, index) {
  return (
    step &&
    typeof step === "object" &&
    Number.isInteger(step.step) &&
    step.step === index + 1 &&
    isNonEmptyString(step.instruction)
  );
}

function isValidSubstitution(substitution) {
  return (
    substitution &&
    typeof substitution === "object" &&
    isNonEmptyString(substitution.ingredient) &&
    isNonEmptyString(substitution.substitute)
  );
}

export function isValidStructuredRecipe(recipe) {
  return Boolean(
    recipe &&
    isNonEmptyString(recipe.title) &&
    isNonEmptyString(recipe.cuisine) &&
    validDifficulties.includes(recipe.difficulty) &&
    Number.isFinite(recipe.servings) &&
    recipe.servings > 0 &&
    recipe.servings <= 50 &&
    isNonEmptyString(recipe.cookTime) &&
    Number.isInteger(recipe.matchScore) &&
    recipe.matchScore >= 0 &&
    recipe.matchScore <= 100 &&
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.length > 0 &&
    recipe.ingredients.every(isValidStructuredIngredient) &&
    isStringArray(recipe.youHave) &&
    isStringArray(recipe.youNeed) &&
    Array.isArray(recipe.steps) &&
    recipe.steps.length >= 4 &&
    recipe.steps.length <= 8 &&
    recipe.steps.every(isValidStructuredStep) &&
    isStringArray(recipe.tips) &&
    Array.isArray(recipe.substitutions) &&
    recipe.substitutions.every(isValidSubstitution) &&
    isNonEmptyString(recipe.imagePrompt) &&
    isOptionalString(recipe.imageUrl)
  );
}

export function isValidLegacyRecipe(recipe) {
  const isLegacyStringArray = (value) => (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );

  return Boolean(
    recipe &&
    typeof recipe.title === "string" &&
    typeof recipe.cuisine === "string" &&
    typeof recipe.difficulty === "string" &&
    typeof recipe.cookTime === "string" &&
    Number.isInteger(recipe.matchScore) &&
    recipe.matchScore >= 0 &&
    recipe.matchScore <= 100 &&
    isLegacyStringArray(recipe.missingIngredients) &&
    isLegacyStringArray(recipe.ingredients) &&
    isLegacyStringArray(recipe.steps) &&
    isOptionalString(recipe.imagePrompt) &&
    isOptionalString(recipe.imageUrl)
  );
}

export function validateStructuredRecipeResponse(data) {
  return Boolean(
    data &&
    Array.isArray(data.recipes) &&
    data.recipes.length === 3 &&
    data.recipes.every(isValidStructuredRecipe)
  );
}

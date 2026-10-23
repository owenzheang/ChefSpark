// Diet choices for recipe generation, and a code check of the AI's ingredients against them.
// The check is a keyword safety net, not a guarantee: hidden animal ingredients (some cheeses,
// packaged sauces) can still slip through, so the app asks users to check labels.

export const allowedDiets = ["Any", "Vegetarian", "Vegan"];

const meatAndFish = [
  "chicken", "beef", "pork", "lamb", "mutton", "veal", "duck", "goose", "turkey", "venison",
  "bacon", "ham", "sausage", "salami", "pepperoni", "prosciutto", "pancetta", "chorizo", "lard",
  "fish", "salmon", "tuna", "cod", "anchovy", "anchovies", "sardine", "mackerel", "tilapia",
  "prawn", "shrimp", "crab", "lobster", "squid", "calamari", "octopus", "clam", "mussel",
  "oyster", "scallop", "seafood", "gelatin", "gelatine", "bonito", "dashi", "worcestershire"
];

const animalProducts = [
  "egg", "eggs", "milk", "buttermilk", "butter", "ghee", "cream", "cheese", "parmesan",
  "mozzarella", "cheddar", "feta", "ricotta", "paneer", "yogurt", "yoghurt", "honey",
  "mayonnaise", "mayo", "custard", "whey", "creme fraiche"
];

// Plant-based names that contain a keyword above. Removed before checking.
const plantBasedPhrases = [
  /\b(?:vegan|vegetarian|plant[- ]based|meat[- ]free|dairy[- ]free|egg[- ]free)\b.*$/,
  /\b(?:coconut|almond|oat|soy|soya|rice|cashew) (?:milk|cream|yogurt|yoghurt)\b/,
  /\b(?:peanut|almond|cashew|cocoa|shea) butter\b/,
  /\bbutter beans?\b/,
  /\bcream of tartar\b/,
  /\boyster mushrooms?\b/,
  /\bmushroom (?:oyster )?sauce\b/
];

function keywordPattern(words) {
  return new RegExp(`\\b(?:${words.join("|")})(?:s|es)?\\b`);
}

const vegetarianConflict = keywordPattern(meatAndFish);
const veganConflict = keywordPattern([...meatAndFish, ...animalProducts]);

export function conflictsWithDiet(name, diet) {
  if (diet !== "Vegetarian" && diet !== "Vegan") return false;
  let text = String(name).toLowerCase();
  for (const phrase of plantBasedPhrases) text = text.replace(phrase, " ");
  return (diet === "Vegan" ? veganConflict : vegetarianConflict).test(text);
}

// Names of the recipe's ingredients that break the diet (empty when it fits).
export function findDietConflicts(recipe, diet) {
  return recipe.ingredients.filter((ingredient) => conflictsWithDiet(ingredient.name, diet))
    .map((ingredient) => ingredient.name);
}

// Keeps a fitting recipe, marks its diet and drops substitutions that would break it.
export function applyDiet(recipe, diet) {
  if (diet !== "Vegetarian" && diet !== "Vegan") return recipe;
  return {
    ...recipe,
    diet,
    substitutions: recipe.substitutions.filter((item) => !conflictsWithDiet(item.substitute, diet))
  };
}

export function dietPromptRule(diet) {
  if (diet === "Vegetarian") {
    return "Every recipe must be vegetarian: no meat, poultry, fish or seafood, and nothing made from them (stock, broth, fish sauce, oyster sauce, shrimp paste, anchovy, Worcestershire sauce, gelatin, lard). Eggs and dairy are allowed. Ignore inventory items that are not vegetarian. Substitutions must also be vegetarian.";
  }
  if (diet === "Vegan") {
    return "Every recipe must be vegan: no meat, poultry, fish, seafood, eggs, dairy (milk, butter, cream, cheese, yogurt, ghee) or honey, and nothing made from them (stock, fish sauce, oyster sauce, gelatin, lard). Use plant-based versions where needed. Ignore inventory items that are not vegan. Substitutions must also be vegan.";
  }
  return "";
}

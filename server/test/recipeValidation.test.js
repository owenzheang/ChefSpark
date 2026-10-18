import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const structuredRecipeFixture = JSON.parse(readFileSync(
  new URL("./fixtures/chicken-fried-rice.json", import.meta.url), "utf8"
));
import { generateRecipesWithDeepSeek } from "../src/services/deepseekService.js";
import { addRecipeMatch } from "../src/utils/recipeMatching.js";

test("mocked generation uses one request and tolerates invalid optional matching metadata", async (t) => {
  const oldKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-only-not-a-real-key";
  t.after(() => {
    if (oldKey === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = oldKey;
  });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls += 1;
    const body = JSON.parse(options.body);
    assert.match(body.messages[0].content, /ingredientMatches/);
    assert.match(body.messages[0].content, /substitute/);
    assert.match(body.messages[1].content, /Eggs/);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({
        recipes: [
          createStructuredRecipe({ ingredientMatches: "malformed" }),
          createStructuredRecipe({ ingredientMatches: [null, {}] }),
          createStructuredRecipe({
            ingredients: [{ name: "Egg", quantity: 1, unit: "piece" }],
            ingredientMatches: [{ requiredIngredient: "Egg", matchedUserIngredient: "Eggs", matchType: "same" }]
          })
        ]
      }) } }] })
    };
  });
  const inventory = [{ name: "Eggs" }];
  const response = await generateRecipesWithDeepSeek({ ingredients: inventory, cuisine: "Chinese", difficulty: "Easy" });
  const recipes = response.recipes.map(recipe => addRecipeMatch(recipe, inventory));
  assert.equal(calls, 1);
  assert.equal(recipes.length, 3);
  assert.ok(recipes.every(isValidStructuredRecipe));
  assert.ok(recipes.every(recipe => !("ingredientMatches" in recipe)));
  assert.deepEqual(recipes.map(recipe => recipe.matchScore), [33, 33, 100]);
});
import {
  isValidLegacyRecipe,
  isValidStructuredRecipe,
  validateStructuredRecipeResponse
} from "../src/utils/recipeValidation.js";

function createStructuredRecipe(overrides = {}) {
  return { ...structuredClone(structuredRecipeFixture), ...overrides };
}

test("accepts a valid structured recipe", () => {
  assert.equal(isValidStructuredRecipe(createStructuredRecipe()), true);
});

test("rejects invalid structured ingredients", () => {
  const invalidRecipe = createStructuredRecipe({
    ingredients: [{ name: "Chicken", quantity: "200", unit: "g" }]
  });

  assert.equal(isValidStructuredRecipe(invalidRecipe), false);
});

test("rejects invalid or non-sequential structured steps", () => {
  const invalidRecipe = createStructuredRecipe({
    steps: [
      { step: 1, instruction: "Prepare the ingredients." },
      { step: 3, instruction: "Cook the chicken." },
      { step: 4, instruction: "Add the rice." },
      { step: 5, instruction: "Serve." }
    ]
  });

  assert.equal(isValidStructuredRecipe(invalidRecipe), false);
});

test("requires exactly three recipes in a generated response", () => {
  const recipe = createStructuredRecipe();

  assert.equal(validateStructuredRecipeResponse({ recipes: [recipe, recipe, recipe] }), true);
  assert.equal(validateStructuredRecipeResponse({ recipes: [recipe, recipe] }), false);
});

test("continues to accept the previous saved recipe shape", () => {
  const legacyRecipe = {
    title: "Onion Omelette",
    cuisine: "Chinese",
    difficulty: "Easy",
    cookTime: "10 minutes",
    matchScore: 80,
    missingIngredients: ["Soy Sauce"],
    ingredients: ["Egg", "Onion", "Soy Sauce"],
    steps: ["Slice the onion.", "Beat the eggs.", "Cook the omelette.", "Serve."],
    imagePrompt: "Onion Omelette Chinese plated food",
    imageUrl: ""
  };

  assert.equal(isValidLegacyRecipe(legacyRecipe), true);
});

import test from "node:test";
import assert from "node:assert/strict";
import { applyDiet, conflictsWithDiet, findDietConflicts } from "../src/utils/dietRules.js";
import { buildRecipePrompt } from "../src/services/deepseekService.js";
import { addRecipeMatch } from "../src/utils/recipeMatching.js";

test("vegetarian rejects meat, fish and hidden animal ingredients but allows eggs and dairy", () => {
  for (const name of ["Chicken Breast", "Chicken Stock", "Fish Sauce", "Oyster Sauce", "Prawns", "Anchovies", "Bacon", "Worcestershire Sauce", "Gelatine"]) {
    assert.equal(conflictsWithDiet(name, "Vegetarian"), true, name);
  }
  for (const name of ["Eggs", "Butter", "Parmesan", "Tofu", "Chickpeas", "Eggplant", "Oyster Mushrooms", "Mushroom Oyster Sauce", "Vegetarian Oyster Sauce", "Vegetable Stock", "Graham Crackers"]) {
    assert.equal(conflictsWithDiet(name, "Vegetarian"), false, name);
  }
});

test("vegan also rejects eggs, dairy and honey, but not plant-based look-alikes", () => {
  for (const name of ["Egg", "Eggs", "Whole Milk", "Unsalted Butter", "Heavy Cream", "Cheddar Cheese", "Greek Yogurt", "Honey", "Ghee"]) {
    assert.equal(conflictsWithDiet(name, "Vegan"), true, name);
  }
  for (const name of ["Coconut Milk", "Oat Milk", "Peanut Butter", "Butternut Squash", "Butter Beans", "Vegan Butter", "Dairy-free Cheese", "Eggplant", "Cream of Tartar"]) {
    assert.equal(conflictsWithDiet(name, "Vegan"), false, name);
  }
});

test("Any never conflicts", () => {
  assert.equal(conflictsWithDiet("Chicken", "Any"), false);
  assert.deepEqual(findDietConflicts({ ingredients: [{ name: "Beef" }] }, "Any"), []);
});

test("a fitting recipe is marked with its diet, keeps its match data and loses non-fitting substitutions", () => {
  const recipe = {
    title: "Tofu Fried Rice", ingredients: [{ name: "Tofu", quantity: 200, unit: "g" }, { name: "Rice", quantity: 2, unit: "cups" }],
    ingredientMatches: [], substitutions: [{ ingredient: "Tofu", substitute: "Chicken" }, { ingredient: "Rice", substitute: "Quinoa" }]
  };
  assert.deepEqual(findDietConflicts(recipe, "Vegetarian"), []);
  const marked = addRecipeMatch(applyDiet(recipe, "Vegetarian"), [{ name: "Tofu" }, { name: "Chicken" }]);
  assert.equal(marked.diet, "Vegetarian");
  assert.deepEqual(marked.substitutions, [{ ingredient: "Rice", substitute: "Quinoa" }]);
  assert.deepEqual(marked.youHave, ["Tofu"]);
  assert.equal(applyDiet(recipe, "Any"), recipe);
});

test("the prompt only carries a diet rule when one is chosen", () => {
  const any = buildRecipePrompt([{ name: "Tofu" }], "Chinese", "Easy");
  assert.doesNotMatch(any.system + any.user, /vegetarian|vegan/i);
  const vegan = buildRecipePrompt([{ name: "Tofu" }], "Chinese", "Easy", "Vegan");
  assert.match(vegan.system, /must be vegan/);
  assert.match(vegan.user, /Diet:\nVegan/);
});

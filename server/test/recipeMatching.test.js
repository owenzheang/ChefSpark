import test from "node:test";
import assert from "node:assert/strict";
const judgment = (requiredIngredient, matchedUserIngredient, matchType = "same") => ({
  requiredIngredient, matchedUserIngredient, matchType
});

test("reviewed same-food pairs require an AI same judgment and real inventory", () => {
  for (const [required, owned] of [
    ["Chicken Wings", "Chicken Wing"], ["Egg", "Eggs"], ["Spring Onion", "Scallion"]
  ]) {
    assert.deepEqual(calculateRecipeMatch([{ name: required }], [{ name: owned }], [judgment(required, owned)]),
      { matchScore: 100, youHave: [required], youNeed: [] });
    assert.equal(calculateRecipeMatch([required], [owned]).matchScore, 0);
    assert.equal(calculateRecipeMatch([required], [], [judgment(required, owned)]).matchScore, 0);
  }
});

test("AI same claims cannot equate arbitrary foods, cuts, categories, or oils", () => {
  for (const [required, owned] of [
    ["Chicken Breast", "Chicken Thigh"], ["Beef", "Lamb"], ["Tomato", "Potato"],
    ["Butter", "Cooking Oil"], ["Milk", "Cream"], ["Olive Oil", "Cooking Oil"],
    ["Chicken Wings", "Chicken"], ["Salt", "Soy Sauce"]
  ]) {
    const result = calculateRecipeMatch([required], [owned], [judgment(required, owned)]);
    assert.deepEqual(result.youHave, []);
    assert.equal(result.matchScore, required === "Salt" ? 100 : 0);
  }
});

test("substitute, different, missing, uncertain and malformed judgments grant no credit", () => {
  const invalidRecords = [
    null, [], "same", {}, judgment("Egg", "Eggs", "substitute"),
    judgment("Egg", "Eggs", "different"), judgment("Egg", null, "missing"),
    judgment("Egg", "Eggs", "uncertain"), judgment("Egg", null),
    judgment("Egg", 123), judgment("Not required", "Eggs"),
    { ...judgment("Egg", "Eggs"), confidence: 0.5 }
  ];
  for (const record of invalidRecords) {
    assert.equal(calculateRecipeMatch(["Egg"], ["Eggs"], [record]).matchScore, 0);
  }
  for (const metadata of [undefined, null, {}, "bad", 12]) {
    assert.deepEqual(calculateRecipeMatch(["Rice", "Egg"], ["Rice", "Eggs"], metadata),
      { matchScore: 50, youHave: ["Rice"], youNeed: ["Egg"] });
  }
});

test("duplicate and conflicting records fail closed without suppressing exact matches", () => {
  const record = judgment("Egg", "Eggs");
  for (const duplicate of [record, judgment(" egg ", null, "missing")]) {
    assert.equal(calculateRecipeMatch(["Egg"], ["Eggs"], [record, duplicate]).matchScore, 0);
    assert.equal(calculateRecipeMatch(["Egg"], ["Egg"], [record, duplicate]).matchScore, 100);
  }
  assert.deepEqual(calculateRecipeMatch(["Egg", " EGG ", "Soy Sauce"], ["Eggs"], [record]),
    { matchScore: 50, youHave: ["Egg"], youNeed: ["Soy Sauce"] });
});

test("semantic matches and pantry defaults produce backend score and inventory-only youHave", () => {
  const inventory = ["Chicken Wing", "Eggs", "Scallion", "Rice"];
  const result = calculateRecipeMatch(
    ["Chicken Wings", "Egg", "Spring Onion", "Rice", "Salt", "Cooking Oil", "Soy Sauce", "Olive Oil"],
    inventory,
    [judgment("Chicken Wings", "Chicken Wing"), judgment("Egg", "Eggs"),
      judgment("Spring Onion", "Scallion"), judgment("Salt", null, "missing"),
      judgment("Olive Oil", "Cooking Oil"), judgment("Soy Sauce", "Salt")]
  );
  assert.deepEqual(result, {
    matchScore: 75, youHave: ["Chicken Wings", "Egg", "Spring Onion", "Rice"],
    youNeed: ["Soy Sauce", "Olive Oil"]
  });
  assert.deepEqual(inventory, ["Chicken Wing", "Eggs", "Scallion", "Rice"]);
});

test("internal metadata is stripped and AI final fields are overwritten without mutation", () => {
  const recipe = { ingredients: [{ name: "Egg" }, { name: "Soy Sauce" }],
    ingredientMatches: [judgment("Egg", "Eggs")], matchScore: 100,
    youHave: ["Soy Sauce"], youNeed: [] };
  const result = addRecipeMatch(recipe, ["Eggs"]);
  assert.equal(result.matchScore, 50);
  assert.deepEqual(result.youHave, ["Egg"]);
  assert.deepEqual(result.youNeed, ["Soy Sauce"]);
  assert.equal("ingredientMatches" in result, false);
  assert.equal(recipe.matchScore, 100);
  assert.ok(recipe.ingredientMatches);
});
import {
  addRecipeMatch,
  calculateRecipeMatch,
  normalizeIngredientName
} from "../src/utils/recipeMatching.js";

test("normalizes case and surrounding or repeated whitespace only", () => {
  assert.equal(normalizeIngredientName("  Chicken   Breast  "), "chicken breast");
  assert.notEqual(normalizeIngredientName("chicken thigh"), normalizeIngredientName("chicken"));
  assert.notEqual(normalizeIngredientName("spring onion"), normalizeIngredientName("scallion"));
});

test("calculates youHave, youNeed, and a rounded match score", () => {
  const result = calculateRecipeMatch(
    [
      { name: "Chicken", quantity: 200, unit: "g" },
      { name: "Rice", quantity: 2, unit: "cup" },
      { name: "Egg", quantity: 2, unit: "piece" }
    ],
    [{ name: " chicken " }, { name: "RICE" }]
  );

  assert.deepEqual(result, {
    matchScore: 67,
    youHave: ["Chicken", "Rice"],
    youNeed: ["Egg"]
  });
});

test("matches pantry defaults without adding them to user ingredients", () => {
  const userIngredients = [{ name: "Rice" }];
  const result = calculateRecipeMatch(
    [
      { name: "Rice", quantity: 2, unit: "cup" },
      { name: "Salt", quantity: null, unit: "" },
      { name: "Sugar", quantity: 1, unit: "tsp" },
      { name: "Cooking Oil", quantity: 1, unit: "tbsp" }
    ],
    userIngredients
  );
  const basicOilResult = calculateRecipeMatch(
    [{ name: "Basic Cooking Oil", quantity: 1, unit: "tbsp" }],
    userIngredients
  );

  assert.equal(result.matchScore, 100);
  assert.deepEqual(result.youHave, ["Rice"]);
  assert.deepEqual(result.youNeed, []);
  assert.equal(basicOilResult.matchScore, 100);
  assert.deepEqual(basicOilResult.youHave, []);
  assert.deepEqual(basicOilResult.youNeed, []);
  assert.deepEqual(userIngredients, [{ name: "Rice" }]);
});

test("lists pantry ingredients in youHave only when actually stored", () => {
  const result = calculateRecipeMatch(
    [
      { name: "Salt", quantity: null, unit: "" },
      { name: "Cooking Oil", quantity: 1, unit: "tbsp" },
      { name: "Basic Cooking Oil", quantity: 1, unit: "tbsp" },
      { name: "Sugar", quantity: 1, unit: "tsp" }
    ],
    [{ name: " SALT " }, { name: " cooking   OIL " }]
  );

  assert.deepEqual(result, {
    matchScore: 100,
    youHave: ["Salt", "Cooking Oil"],
    youNeed: []
  });
});

test("does not treat soy sauce or specific oils as pantry defaults", () => {
  const result = calculateRecipeMatch(
    [
      { name: "Rice", quantity: 2, unit: "cup" },
      { name: "Soy Sauce", quantity: 2, unit: "tbsp" },
      { name: "Olive Oil", quantity: 1, unit: "tbsp" }
    ],
    [{ name: "Rice" }]
  );

  assert.deepEqual(result, {
    matchScore: 33,
    youHave: ["Rice"],
    youNeed: ["Soy Sauce", "Olive Oil"]
  });
});

test("overwrites temporary AI matching values", () => {
  const recipe = {
    title: "Chicken Fried Rice",
    ingredients: [
      { name: "Chicken", quantity: 200, unit: "g" },
      { name: "Rice", quantity: 2, unit: "cup" },
      { name: "Soy Sauce", quantity: 2, unit: "tbsp" },
      { name: "Salt", quantity: null, unit: "" },
      { name: "Cooking Oil", quantity: 1, unit: "tbsp" }
    ],
    matchScore: 99,
    youHave: [],
    youNeed: []
  };

  const result = addRecipeMatch(recipe, [{ name: "Chicken" }, { name: "Rice" }]);

  assert.equal(result.matchScore, 80);
  assert.deepEqual(result.youHave, ["Chicken", "Rice"]);
  assert.deepEqual(result.youNeed, ["Soy Sauce"]);
});

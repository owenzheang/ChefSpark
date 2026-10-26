import { test } from "node:test";
import assert from "node:assert/strict";
import { findStepTimers, formatClock } from "../src/utils/cookingTimers.js";
import { scaleQuantity, formatQuantity, scaleIngredients, ingredientsInStep } from "../src/utils/scaleRecipe.js";

test("durations in step text become timers; text without a time gets none", () => {
  const [single] = findStepTimers("Melt the butter, then cook the onion for 3 minutes until soft.");
  assert.deepEqual([single.seconds, single.maxSeconds, single.label], [180, null, "3 min"]);
  assert.equal(findStepTimers("Stir for 1 minute.")[0].seconds, 60);
  assert.equal(findStepTimers("Rest for 30 seconds.")[0].seconds, 30);
  assert.equal(findStepTimers("Bake for 1 hour.")[0].seconds, 3600);
  assert.equal(findStepTimers("Simmer for 1½ hours.")[0].seconds, 5400);
  assert.equal(findStepTimers("Let it rest for a minute.")[0].seconds, 60);
  assert.equal(findStepTimers("Fry for two mins each side.")[0].seconds, 120);
  assert.equal(findStepTimers("Soak in a 10-minute brine.")[0].seconds, 600);
  for (const text of ["Slice the mushrooms.", "Heat the oven to 180°C.", "Add 2 cups of rice.", "", null]) {
    assert.deepEqual(findStepTimers(text), [], String(text));
  }
});

test("ranges start at the lower bound so beginners check early", () => {
  const [range] = findStepTimers("Cook for 5 to 6 minutes until browned.");
  assert.equal(range.seconds, 300);
  assert.equal(range.maxSeconds, 360);
  assert.equal(range.label, "Check at 5 min, up to 6 min");
  assert.equal(findStepTimers("Simmer 2-3 minutes.")[0].seconds, 120);
  assert.equal(findStepTimers("Steam 8–10 mins.")[0].maxSeconds, 600);
});

test("several durations in one step are all found, in order", () => {
  const timers = findStepTimers("Boil for 10 minutes, then simmer for 2 to 3 minutes.");
  assert.deepEqual(timers.map(timer => timer.seconds), [600, 120]);
});

test("clock formatting", () => {
  assert.equal(formatClock(42), "0:42");
  assert.equal(formatClock(600), "10:00");
  assert.equal(formatClock(3725), "1:02:05");
  assert.equal(formatClock(-5), "0:00");
  assert.equal(formatClock(0.2), "0:01");
});

test("quantities scale with kitchen-friendly rounding", () => {
  assert.equal(scaleQuantity(200, "g", 2), 400);
  assert.equal(scaleQuantity(200, "g", 1.5), 300);
  assert.equal(scaleQuantity(30, "g", 1.5), 45);
  assert.equal(scaleQuantity(330, "ml", 1.5), 500);
  assert.equal(scaleQuantity(1, "tbsp", 1.5), 1.5);
  assert.equal(scaleQuantity(1, "small", 0.5), 0.5);
  assert.equal(scaleQuantity(2, "tbsp", 1 / 3), 2 / 3);
  assert.equal(scaleQuantity(1, "tsp", 0.1), 0.25);
  assert.equal(scaleQuantity(null, "", 2), null);
  assert.equal(scaleQuantity(200, "g", 1), 200);
  // Counted things stay whole (PC demo 2026-10-26: "12½ cloves" garlic at 5 servings).
  assert.equal(scaleQuantity(5, "cloves", 2.5), 13);
  assert.equal(scaleQuantity(8, "pieces", 2.5), 20);
  assert.equal(scaleQuantity(1, "clove", 0.5), 1, "never below one");
  assert.equal(scaleQuantity(3, "", 1.5, "Eggs"), 5);
  assert.equal(scaleQuantity(1, "small", 2.5, "Onion"), 2.5, "half an onion is fine");
  assert.equal(scaleQuantity(2, "", 1.25, "Tomato"), 2.5);
  assert.equal(formatQuantity(1.5), "1½");
  assert.equal(formatQuantity(0.25), "¼");
  assert.equal(formatQuantity(2 / 3), "⅔");
  assert.equal(formatQuantity(3), "3");
});

test("scaling keeps 'to taste' items and marks legacy strings as not scaled", () => {
  const rows = scaleIngredients([
    { name: "Pasta", quantity: 200, unit: "g" },
    { name: "Salt", quantity: null, unit: "" },
    "2 cups rice"
  ], 2, 4);
  assert.deepEqual(rows, [
    { name: "Pasta", amount: "400 g", scaled: true, unscalable: false },
    { name: "Salt", amount: "", scaled: false, unscalable: false },
    { name: "2 cups rice", amount: "", scaled: false, unscalable: true }
  ]);
  assert.equal(scaleIngredients([{ name: "Milk", quantity: 200, unit: "ml" }], 2, 2)[0].scaled, false);
  assert.equal(scaleIngredients([{ name: "Milk", quantity: 200, unit: "ml" }], undefined, 4)[0].amount, "200 ml");
});

test("a step lists the ingredients it mentions", () => {
  const rows = scaleIngredients([
    { name: "Butter", quantity: 2, unit: "tbsp" }, { name: "Onion", quantity: 1, unit: "small" },
    { name: "Mushrooms", quantity: 200, unit: "g" }, { name: "Grated Parmesan cheese", quantity: 30, unit: "g" }
  ], 2, 2);
  const names = text => ingredientsInStep(text, rows).map(row => row.name);
  assert.deepEqual(names("Melt the butter, then add the onion."), ["Butter", "Onion"]);
  assert.deepEqual(names("Add the mushrooms and cook."), ["Mushrooms"]);
  assert.deepEqual(names("Toss with the sauce and Parmesan cheese."), ["Grated Parmesan cheese"]);
  assert.deepEqual(names("Bring water to a boil."), []);
});

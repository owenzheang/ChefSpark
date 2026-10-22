import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ingredientCatalog } from "../src/data/ingredientCatalog.js";
import { getIngredientCategory, normalizeIngredientName } from "../src/utils/ingredientCategories.js";
import { searchIngredients } from "../src/utils/ingredientSearch.js";

let server;
let Icon;
let categoryIcons;
let Suggestions;
let IngredientsPage;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  const icons = await server.ssrLoadModule("/src/components/IngredientCategoryIcon.jsx");
  Icon = icons.default;
  categoryIcons = icons.categoryIcons;
  Suggestions = (await server.ssrLoadModule("/src/components/IngredientSuggestions.jsx")).default;
  IngredientsPage = (await server.ssrLoadModule("/src/pages/IngredientsPage.jsx")).default;
});
after(async () => { await server?.close(); });

test("catalog has 100–200 unique names and all 17 categories", () => {
  assert.ok(ingredientCatalog.length >= 100 && ingredientCatalog.length <= 200);
  assert.equal(new Set(ingredientCatalog.map(i => normalizeIngredientName(i.name))).size, ingredientCatalog.length);
  assert.equal(new Set(ingredientCatalog.map(i => i.category)).size, 17);
  for (const ingredient of ingredientCatalog) assert.ok(categoryIcons[ingredient.category]);
});

test("exact category lookup normalizes case and repeated whitespace only", () => {
  for (const name of ["Chicken Wings", "chicken wings", "  CHICKEN   WINGS  "]) {
    assert.equal(getIngredientCategory(name), "meat");
  }
  for (const [name, category] of [["Beef", "meat"], ["Salmon", "seafood"], ["Garlic", "vegetable"], ["Soy Sauce", "sauce"]]) {
    assert.equal(getIngredientCategory(name), category);
  }
  for (const name of ["Chiken Wings", "Special Homemade Sauce", "Chicken Wing", ""]) {
    assert.equal(getIngredientCategory(name), "other");
  }
});

test("all members of each category use the same icon, with Other fallback", () => {
  for (const ingredient of ingredientCatalog) {
    assert.equal(Icon({ name: ingredient.name }).type, categoryIcons[ingredient.category]);
  }
  assert.equal(Icon({ name: "Unlisted" }).type, categoryIcons.other);
  assert.equal(Icon({ name: "Brocoli" }).type, categoryIcons.other);
});

test("search ranks exact then prefix then partial, caps results, and normalizes input", () => {
  assert.equal(searchIngredients("  SOY   SAUCE ")[0].name, "Soy Sauce");
  assert.deepEqual(searchIngredients("chick").slice(0, 4).map(i => i.name),
    ["Chicken", "Chicken Wings", "Chicken Breast", "Chicken Thigh"]);
  assert.equal(searchIngredients("rice")[0].name, "Rice");
  assert.equal(searchIngredients("rice")[1].name, "Rice Noodles");
  assert.equal(searchIngredients("breast")[0].name, "Chicken Breast");
  assert.equal(searchIngredients("brocco")[0].name, "Broccoli");
  assert.equal(searchIngredients("")[0], undefined);
  assert.deepEqual(searchIngredients("   "), []);
  assert.ok(searchIngredients("a").length <= 5);
  assert.equal(new Set(searchIngredients("chick").map(i => i.name)).size, searchIngredients("chick").length);
});

test("strong typos are labeled; prefix matches are not corrections", () => {
  for (const [input, expected] of [["Chiken Wings", "Chicken Wings"], ["Brocoli", "Broccoli"], ["Soy Sause", "Soy Sauce"], ["Tomatos", "Tomato"]]) {
    const result = searchIngredients(input)[0];
    assert.equal(result.name, expected);
    assert.equal(result.isCorrection, true);
  }
  assert.equal(searchIngredients("Chicken Win")[0].name, "Chicken Wings");
  assert.equal(searchIngredients("Chicken Win")[0].isCorrection, false);
  const chicken = searchIngredients("Chicken");
  assert.equal(chicken[0].name, "Chicken");
  assert.equal(chicken[0].isCorrection, false);
  assert.equal(searchIngredients("Olive Oil")[0].name, "Olive Oil");
});

test("short, unrelated, and custom inputs do not get speculative corrections", () => {
  for (const input of ["so", "chik", "xyz", "zzzzzzzz", "Special Homemade Sauce"]) {
    assert.ok(searchIngredients(input).every(i => !i.isCorrection));
  }
  assert.deepEqual(searchIngredients("Special Homemade Sauce"), []);
});

test("suggestions only select canonical names on explicit button activation", () => {
  let selected;
  const suggestions = searchIngredients("Chiken Wings");
  const tree = Suggestions({ suggestions, onSelect: name => { selected = name; } });
  assert.equal(selected, undefined);
  const button = tree.props.children[0].props.children;
  assert.equal(button.props.type, "button");
  button.props.onClick();
  assert.equal(selected, "Chicken Wings");
  const html = renderToStaticMarkup(createElement(Suggestions, { suggestions, onSelect: () => {} }));
  assert.match(html, /Did you mean this\?/);
  assert.match(html, /ingredient-category-icon/);
  assert.equal(Suggestions({ suggestions: [], onSelect: () => {} }), null);
});

test("ingredient page preserves manual submit and add/delete API wiring", async () => {
  // Wiring checks supplement component tests without introducing a DOM test dependency.
  const source = await readFile(new URL("../src/pages/IngredientsPage.jsx", import.meta.url), "utf8");
  assert.match(source, /await addIngredientByName\(form.name\)/);
  assert.match(source, /const trimmedName = name.trim\(\)/);
  assert.match(source, /name: trimmedName,\s+quantity: null,\s+unit: ""/);
  assert.match(source, /await addIngredient\(ingredientData\)/);
  assert.match(source, /await deleteIngredient\(id\)/);
  assert.match(source, /onClick=\{\(\) => handleDelete\(ingredient.id\)\}/);
  assert.match(source, /onClick=\{\(\) => addIngredientByName\(ingredient\)\}/);
  assert.match(source, /function selectSuggestion\(name\) \{\s+setForm\(\{ name \}\)/);
  assert.match(source, /setForm\(\{ name: event.target.value \}\)/);
  const html = renderToStaticMarkup(createElement(IngredientsPage, { onGenerateRecipes: () => {} }));
  assert.match(html, /aria-label="Ingredient name"/);
  assert.match(html, /aria-label="Add ingredient"/);
  assert.equal((html.match(/aria-label="Add [A-Z]/g) || []).length, 8);
  assert.doesNotMatch(html, /Did you mean this\?/);
});

test("Kitchen screen uses the design system, owns log out and guards the main action", () => {
  let loggedOut = false;
  const html = renderToStaticMarkup(createElement(IngredientsPage, { onGenerateRecipes: () => {}, onLogout: () => { loggedOut = true; } }));
  assert.match(html, /<main data-ds=""/);
  assert.match(html, /<label for="ingredient-name"/);
  assert.match(html, /id="ingredient-name"/);
  assert.match(html, />LOG OUT<\/button>/);
  assert.match(html, /bg-iron/);
  assert.match(html, /<button type="button" disabled=""[^>]*aria-describedby="find-dishes-hint"/);
  assert.match(html, /ADD AT LEAST ONE INGREDIENT/);
  assert.equal((html.match(/aria-label="Add [A-Z]/g) || []).length, 8);
  assert.doesNotMatch(html, /Notifications|Recipes saved|Choose Cuisine/);
  assert.equal(loggedOut, false);
});

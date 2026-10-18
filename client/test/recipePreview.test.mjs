import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let server;
let Preview;
let Generation;
let Detail;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  Preview = (await server.ssrLoadModule("/src/components/RecipePreviewCard.jsx")).default;
  Generation = (await server.ssrLoadModule("/src/pages/RecipeGenerationPage.jsx")).default;
  Detail = (await server.ssrLoadModule("/src/pages/RecipeDetailPage.jsx")).default;
});
after(async () => { await server?.close(); });

const recipe = {
  title: "Chicken and Rice", cuisine: "Chinese", difficulty: "Easy",
  cookTime: "25 minutes", servings: 2, matchScore: 80, imageUrl: "",
  youHave: ["Chicken", "Rice"], youNeed: ["Garlic", "Ginger", "Onion", "Soy Sauce"],
  ingredients: [{ name: "Chicken", quantity: 400, unit: "g" }],
  steps: [{ step: 1, instruction: "Cook the chicken thoroughly." }]
};

test("preview summarizes requirements and hides full instructions and quantities", () => {
  const html = renderToStaticMarkup(createElement(Preview, { recipe }));
  assert.match(html, /Garlic, Ginger \+ 2 more/);
  assert.match(html, /Chicken, Rice/);
  assert.match(html, /Serves 2/);
  assert.match(html, /80% match/);
  assert.doesNotMatch(html, /Cook the chicken thoroughly|400/);
});

test("view and save are separate callbacks carrying the complete recipe", () => {
  let viewed;
  let saved;
  const tree = Preview({ recipe, onViewRecipe: value => { viewed = value; }, onSave: value => { saved = value; } });
  const actions = tree.props.children.at(-1).props.children;
  actions[0].props.onClick();
  assert.equal(viewed, recipe);
  assert.equal(saved, undefined);
  actions[1].props.onClick();
  assert.equal(saved, recipe);
});

test("generation renders three previews and preserves supplied selections", () => {
  const html = renderToStaticMarkup(createElement(Generation, {
    recipes: [recipe, { ...recipe, title: "Second dish" }, { ...recipe, title: "Third dish" }],
    cuisine: "Western", difficulty: "Hard"
  }));
  assert.equal((html.match(/View Recipe/g) || []).length, 3);
  assert.equal((html.match(/Save Recipe/g) || []).length, 3);
  assert.match(html, /value="Hard" selected/);
  assert.doesNotMatch(html, /Cook the chicken thoroughly/);
});

test("generated detail renders full ingredients and steps directly", () => {
  const html = renderToStaticMarkup(createElement(Detail, { generatedRecipe: recipe }));
  assert.match(html, /<span>Chicken<\/span>/);
  assert.match(html, /400 g/);
  assert.match(html, /Cook the chicken thoroughly/);
  assert.match(html, /Back to generated recipes/);
});

test("detail continues to render legacy ingredient and step strings", () => {
  const html = renderToStaticMarkup(createElement(Detail, {
    generatedRecipe: { ...recipe, ingredients: ["Chicken"], steps: ["Legacy cooking instruction"] }
  }));
  assert.match(html, /Chicken/);
  assert.match(html, /Legacy cooking instruction/);
});

test("detail uses backend score and matching lists without dynamic food images", () => {
  const html = renderToStaticMarkup(createElement(Detail, {
    generatedRecipe: { ...recipe, matchScore: 29, imageUrl: "https://example.com/food.jpg",
      youHave: ["Chicken"], youNeed: ["Soy Sauce"] }
  }));
  assert.match(html, /29% ingredient match/);
  assert.match(html, /You Have/);
  assert.match(html, /You Need/);
  assert.match(html, /Soy Sauce/);
  assert.doesNotMatch(html, /food.jpg|Salt|Cooking Oil/);
  assert.equal((html.match(/<img /g) || []).length, 0);
  assert.match(html, /Local prototype/);
});

test("detail omits unavailable legacy fields and preserves ingredient text", () => {
  const html = renderToStaticMarkup(createElement(Detail, {
    generatedRecipe: { title: "Legacy dish", ingredients: ["400 g chicken"], steps: ["First.", "Second."] }
  }));
  assert.match(html, /400 g chicken/);
  assert.doesNotMatch(html, /Match Score|You Have|You Need|Serves|Cooking Tips|Substitutions|null|undefined/);
  assert.ok(html.indexOf("First.") < html.indexOf("Second."));
});

test("detail handles null quantities, empty arrays, and invalid scores", () => {
  for (const matchScore of [undefined, null, -1, 101, "80", NaN]) {
    const html = renderToStaticMarkup(createElement(Detail, {
      generatedRecipe: { ...recipe, matchScore, youHave: [], youNeed: [], tips: [], substitutions: [],
        ingredients: [{ name: "Salt", quantity: null, unit: "" }] }
    }));
    assert.doesNotMatch(html, /Match Score|Cooking Tips|Substitutions|null|undefined/);
    assert.match(html, /No matching ingredients in your inventory/);
    assert.match(html, /No additional ingredients needed/);
  }
});

test("detail displays supplied tips and substitutions", () => {
  const html = renderToStaticMarkup(createElement(Detail, {
    generatedRecipe: { ...recipe, tips: ["Use chilled rice."],
      substitutions: [{ ingredient: "Chicken", substitute: "Firm tofu" }] }
  }));
  assert.match(html, /Cooking Tips/);
  assert.match(html, /Use chilled rice/);
  assert.match(html, /Substitutions/);
  assert.match(html, /Firm tofu/);
});

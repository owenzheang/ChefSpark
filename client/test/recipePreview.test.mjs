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
  assert.match(html, /80%<\/span><span[^>]*>MATCH/);
  assert.match(html, /You have 2:/);
  assert.match(html, /You need 4:/);
  assert.doesNotMatch(html, /Cook the chicken thoroughly|400/);
});

function findButtons(node, found = []) {
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) { node.forEach(child => findButtons(child, found)); return found; }
  if (node.type === "button") found.push(node);
  findButtons(node.props?.children, found);
  return found;
}

test("view and save are separate callbacks carrying the complete recipe", () => {
  let viewed;
  let saved;
  const tree = Preview({ recipe, onViewRecipe: value => { viewed = value; }, onSave: value => { saved = value; } });
  const [open, save] = findButtons(tree);
  assert.equal(open.props["aria-label"], "Open recipe: Chicken and Rice");
  assert.equal(save.props["aria-label"], "Save Chicken and Rice");
  open.props.onClick();
  assert.equal(viewed, recipe);
  assert.equal(saved, undefined);
  save.props.onClick();
  assert.equal(saved, recipe);
});

test("generation renders three previews and preserves supplied selections", () => {
  const html = renderToStaticMarkup(createElement(Generation, {
    recipes: [recipe, { ...recipe, title: "Second dish" }, { ...recipe, title: "Third dish" }],
    cuisine: "Western", difficulty: "Hard"
  }));
  assert.equal((html.match(/>Open recipe/g) || []).length, 3);
  assert.equal((html.match(/aria-label="Save /g) || []).length, 3);
  assert.match(html, /aria-pressed="true"[^>]*><span[^>]*>Western</);
  assert.match(html, /aria-pressed="true"[^>]*>(?:(?!<\/button>).)*Hard<\/button>/);
  assert.match(html, /Tonight&#x27;s menu/);
  assert.match(html, /3 dishes for tonight/);
  assert.equal((html.match(/role="img" aria-label="Match 80 percent"/g) || []).length, 3);
  assert.match(html, /data-ds=""/);
  assert.doesNotMatch(html, /<img /);
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
  // The Zine is paused by default and only appears when its feature switch is on.
  assert.doesNotMatch(html, /One-Page Zine|zine-entry/);
  const withZine = renderToStaticMarkup(createElement(Detail, { generatedRecipe: recipe, zineEnabled: true }));
  assert.match(withZine, /One-Page Zine/);
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

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let server, Assistant, DiffList, StepHelp, Detail, Cooking;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  ({ default: Assistant, DiffList } = await server.ssrLoadModule("/src/components/RecipeAssistant.jsx"));
  ({ default: StepHelp } = await server.ssrLoadModule("/src/components/StepHelp.jsx"));
  ({ default: Detail } = await server.ssrLoadModule("/src/pages/RecipeDetailPage.jsx"));
  ({ default: Cooking } = await server.ssrLoadModule("/src/pages/CookingModePage.jsx"));
});
after(async () => { await server?.close(); });

const recipe = { title: "Chicken Fried Rice", cuisine: "Chinese", difficulty: "Easy", cookTime: "20 minutes", servings: 2, matchScore: 60,
  youHave: ["Rice"], youNeed: ["Chicken"], ingredients: [{ name: "Chicken", quantity: 200, unit: "g" }, { name: "Rice", quantity: 2, unit: "cups" },
    { name: "Salt", quantity: null, unit: "" }], steps: [{ step: 1, instruction: "Fry the chicken for 5 minutes." }], tips: [], substitutions: [] };
const on = { enabled: true, remainingToday: 17 };
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test("the assistant stays hidden until the server says it is on, and for older recipe shapes", () => {
  assert.equal(render(Assistant, { recipe, onAdopt() {} }), "");
  assert.equal(render(Assistant, { recipe, onAdopt() {}, initialStatus: { enabled: false } }), "");
  assert.equal(render(Assistant, { recipe: { ...recipe, ingredients: ["rice"] }, onAdopt() {}, initialStatus: on }), "");
  assert.equal(render(StepHelp, { recipe, stepIndex: 0 }), "");
});

test("the fixed actions and the remaining count; diet is chosen when planning, not here", () => {
  const html = render(Assistant, { recipe, onAdopt() {}, initialStatus: on });
  assert.match(html, /Adjust this dish/);
  assert.match(html, /17 LEFT TODAY/);
  assert.match(html, /aria-expanded="false"[^>]*>I don(&#x27;|')t have…/);
  assert.match(html, />Simpler &amp; quicker</);
  assert.doesNotMatch(html, /Make it veg/);
  const worn = render(Assistant, { recipe: { ...recipe, editCount: 3 }, onAdopt() {}, initialStatus: on });
  assert.match(worn, /adjusted 3 times/);
  assert.doesNotMatch(worn, /Simpler/);
});

test("the before/after list shows exactly what the server computed", () => {
  const html = render(DiffList, { diff: { title: { from: "Chicken Fried Rice", to: "Tofu Fried Rice" }, removed: ["Chicken"],
    added: [{ name: "Tofu", amount: "200 g" }], changed: [{ name: "Soy Sauce", from: "2 tbsp", to: "1 tbsp" }],
    steps: { from: 5, to: 5, changed: 2 }, cookTime: null, matchScore: { from: 60, to: 80 } } });
  assert.match(html, /Chicken Fried Rice → Tofu Fried Rice/);
  assert.match(html, /line-through">Chicken</);
  assert.match(html, />Tofu · 200 g</);
  assert.match(html, />Soy Sauce 2 tbsp → 1 tbsp</);
  assert.match(html, /5 → 5 steps, 2 rewritten/);
  assert.match(html, /60% → 80%/);
  const none = render(DiffList, { diff: { title: null, removed: [], added: [], changed: [], steps: { from: 5, to: 5, changed: 0 }, cookTime: null, matchScore: { from: 60, to: 60 } } });
  assert.match(none, /Nothing else changes/);
});

test("the recipe page and Cooking Mode include the assistant only where wired", () => {
  assert.doesNotMatch(render(Detail, { generatedRecipe: recipe, assistantStatus: on }), /Adjust this dish/);
  assert.match(render(Detail, { generatedRecipe: recipe, assistantStatus: on, onAdopt() {} }), /Adjust this dish/);
  const cooking = render(Cooking, { recipe, recipeKey: "test", onExit() {}, assistantStatus: on });
  assert.match(cooking, /aria-label="Ask about this step"/);
  assert.match(cooking, />What does this mean\?</);
  assert.match(cooking, />How do I know it(&#x27;|')s done\?</);
});

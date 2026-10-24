import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let server, api, Preview, Detail, addMenuPictures, withVariantPicture;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  api = await server.ssrLoadModule("/src/services/api.js");
  Preview = (await server.ssrLoadModule("/src/components/RecipePreviewCard.jsx")).default;
  Detail = (await server.ssrLoadModule("/src/pages/RecipeDetailPage.jsx")).default;
  ({ addMenuPictures } = await server.ssrLoadModule("/src/pages/RecipeGenerationPage.jsx"));
  ({ withVariantPicture } = await server.ssrLoadModule("/src/components/RecipeAssistant.jsx"));
});
after(async () => { await server?.close(); });

const own = "/api/food-images/0f8fad5b-d9cb-469f-a165-70867728950e.webp";
const recipe = {
  title: "Cola Chicken Wings", cuisine: "Chinese", difficulty: "Easy", cookTime: "30 minutes", servings: 2, matchScore: 75,
  youHave: ["Chicken Wings"], youNeed: ["Cola"], ingredients: [{ name: "Chicken Wings", quantity: 8, unit: "" }],
  steps: [{ step: 1, instruction: "Brown the wings." }], tips: [], substitutions: []
};
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test("only ChefSpark's own pictures are shown; old stock photo links get the empty plate", () => {
  assert.match(api.foodImageSrc(own), /\/api\/food-images\/0f8fad5b-d9cb-469f-a165-70867728950e\.webp$/);
  for (const value of ["https://images.pexels.com/photos/1/x.jpg", "", undefined, "/api/food-images/../x.webp", `${own}?x=1`]) {
    assert.equal(api.foodImageSrc(value), null, String(value));
  }
});

test("with a picture the dish sits on the plate, labelled AI, and the score moves below the ring", () => {
  const html = render(Preview, { recipe: { ...recipe, imageUrl: own }, onViewRecipe() {}, onSave() {} });
  assert.match(html, /<img[^>]*src="[^"]*0f8fad5b[^"]*\.webp"[^>]*class="[^"]*rounded-full/);
  assert.match(html, /alt=""/);
  assert.match(html, /AI IMAGE/);
  assert.match(html, />75%</);
  assert.match(html, /aria-label="Match 75 percent"/, "the ring still announces the score");

  const stock = render(Preview, { recipe: { ...recipe, imageUrl: "https://images.pexels.com/x.jpg" }, onViewRecipe() {}, onSave() {} });
  assert.doesNotMatch(stock, /<img/);
  assert.doesNotMatch(stock, /AI IMAGE/);

  const detail = render(Detail, { generatedRecipe: { ...recipe, imageUrl: own }, onBack() {}, onStartCooking() {} });
  assert.match(detail, /<img[^>]*0f8fad5b/);
  assert.match(detail, /AI IMAGE/);
  assert.match(detail, />Match<\/dt><dd[^>]*><span class="text-cream">75%</, "the facts row keeps the score");
});

test("menu pictures land on the dish with that title while it still has none, and failures are ignored", async () => {
  let list = [{ ...recipe }, { ...recipe, title: "Tomato Egg" }, { ...recipe, title: "Kept", imageUrl: own }];
  const setRecipes = (update) => { list = update(list); };
  const asked = [];
  const request = async (dish, purpose) => {
    asked.push([dish.title, purpose]);
    if (dish.title === "Tomato Egg") throw new Error("limit");
    return { imageUrl: dish.title === "Kept" ? "/api/food-images/other.webp" : own };
  };
  addMenuPictures(list, setRecipes, request);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(asked, [["Cola Chicken Wings", "menu"], ["Tomato Egg", "menu"], ["Kept", "menu"]]);
  assert.equal(list[0].imageUrl, own);
  assert.equal(list[1].imageUrl, undefined);
  assert.equal(list[2].imageUrl, own, "an existing picture is never replaced");
});

test("a kept variation asks for its own picture; a small change keeps the original without asking", async () => {
  const asked = [];
  const request = async (dish, purpose) => { asked.push(purpose); return { imageUrl: own }; };
  const variant = { ...recipe, title: "Cola Tofu" };
  assert.equal((await withVariantPicture({ tier: "variant", recipe: variant }, request)).imageUrl, own);
  const minor = { ...recipe, imageUrl: "/api/food-images/original.webp" };
  assert.equal(await withVariantPicture({ tier: "minor", recipe: minor }, request), minor);
  assert.deepEqual(asked, ["variant"]);
  const failed = await withVariantPicture({ tier: "variant", recipe: variant }, async () => { throw new Error("limit"); });
  assert.equal(failed.imageUrl, undefined, "no picture means the empty plate, never the original's");
});

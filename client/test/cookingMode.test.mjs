import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { startTimer, pauseTimer, resetTimer, tickTimer } from "../src/utils/useCookingTimers.js";

let server, Cooking, Detail, routes;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  Cooking = (await server.ssrLoadModule("/src/pages/CookingModePage.jsx")).default;
  Detail = (await server.ssrLoadModule("/src/pages/RecipeDetailPage.jsx")).default;
  routes = await server.ssrLoadModule("/src/routes.js");
});
after(async () => { await server?.close(); });

const recipe = {
  title: "Creamy Mushroom Pasta", cuisine: "Western", difficulty: "Easy", cookTime: "25 minutes", servings: 2,
  matchScore: 44, youHave: ["Pasta"], youNeed: ["Butter"],
  ingredients: [{ name: "Pasta", quantity: 200, unit: "g" }, { name: "Butter", quantity: 2, unit: "tbsp" },
    { name: "Onion", quantity: 1, unit: "small" }, { name: "Salt", quantity: null, unit: "" }],
  steps: [
    { step: 1, instruction: "Melt the butter, then add the onion and cook for 3 minutes until soft." },
    { step: 2, instruction: "Add the pasta and stir well." },
    { step: 3, instruction: "Simmer for 5 to 6 minutes, then season with salt." }
  ]
};

test("Cooking Mode shows one step in large type, its ingredients, a dial timer and the next step", () => {
  const html = renderToStaticMarkup(createElement(Cooking, { recipe, recipeKey: "test", onExit() {} }));
  assert.match(html, /<main data-ds=""/);
  assert.match(html, /STEP 1 OF 3/);
  assert.match(html, /text-\[27px\][^>]*>Melt the butter, then add the onion and cook for 3 minutes until soft\.</);
  assert.match(html, /aria-label="Ingredients for this step"/);
  assert.match(html, /<span>Butter<\/span><span>2 tbsp<\/span>/);
  assert.match(html, /<span>Onion<\/span><span>1 small<\/span>/);
  assert.doesNotMatch(html, /<span>Pasta<\/span>/);
  assert.match(html, /NEXT · <\/span>Add the pasta and stir well\./);
  assert.match(html, /role="progressbar"[^>]*aria-valuemax="3"[^>]*aria-valuenow="1"/);
  assert.match(html, />Next step →</);
  assert.match(html, /SOUND ON/);
  assert.match(html, /aria-live="assertive"/);
});

test("a step without a time has no timer, and none is invented", () => {
  const html = renderToStaticMarkup(createElement(Cooking, {
    recipe: { ...recipe, steps: [{ step: 1, instruction: "Add the pasta and stir well." }] }, recipeKey: "no-timer", onExit() {}
  }));
  assert.doesNotMatch(html, /role="timer"|Start timer/);
  assert.match(html, />Finish</);
});

test("timer state: start, pause, resume, finish and reset use wall-clock time", () => {
  const timer = { id: "0-0", step: 0, label: "3 min", total: 180, remaining: 180, endsAt: null, done: false };
  const running = startTimer(timer, 1000);
  assert.equal(running.endsAt, 181000);
  assert.equal(tickTimer(running, 61000).remaining, 120);
  const paused = pauseTimer(running, 61000);
  assert.deepEqual([paused.remaining, paused.endsAt], [120, null]);
  assert.equal(tickTimer(paused, 999999), paused);
  const resumed = startTimer(paused, 100000);
  assert.equal(resumed.endsAt, 220000);
  const finished = tickTimer(resumed, 230000);
  assert.deepEqual([finished.remaining, finished.done, finished.endsAt], [0, true, null]);
  assert.equal(startTimer(finished, 0), finished);
  assert.deepEqual(resetTimer(finished), { ...timer });
});

test("cooking routes, the start button and servings live on the recipe page", async () => {
  assert.equal(routes.paths.generatedDishCooking(1), "/cook/dish/2/cooking");
  assert.equal(routes.paths.savedRecipeCooking(12), "/shelf/12/cooking");
  assert.equal(routes.tabForPath("/shelf/12/cooking"), "savedRecipes");

  const html = renderToStaticMarkup(createElement(Detail, { generatedRecipe: recipe, servingsKey: "test", onStartCooking() {} }));
  assert.match(html, /Light the stove — start cooking/);
  assert.match(html, /aria-label="Fewer servings"/);
  assert.match(html, /aria-label="More servings"/);
  assert.match(html, /<span>Pasta<\/span>(?:(?!<\/li>).)*200 g/);
  const plain = renderToStaticMarkup(createElement(Detail, { generatedRecipe: recipe }));
  assert.doesNotMatch(plain, /Light the stove|More servings/);
  assert.match(plain, /FOR 2/);
  const noSteps = renderToStaticMarkup(createElement(Detail, { generatedRecipe: { ...recipe, steps: [] }, onStartCooking() {} }));
  assert.doesNotMatch(noSteps, /Light the stove/);

  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /path=\{`\$\{paths\.cook\}\/dish\/:dish\/cooking`\} element=\{<FullScreen>/);
  assert.match(app, /path=\{`\$\{paths\.shelf\}\/:id\/cooking`\} element=\{<FullScreen>/);
  assert.match(app, /clearSessionPrefix\("chefspark:"\)/);
});

test("animations in Cooking Mode respect reduced motion", async () => {
  for (const file of ["../src/components/StoveDial.jsx", "../src/pages/CookingModePage.jsx"]) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    const animated = source.match(/\banimate-[a-z]+/g) || [];
    const guarded = source.match(/motion-safe:animate-[a-z]+/g) || [];
    assert.equal(animated.length, guarded.length, file);
  }
});

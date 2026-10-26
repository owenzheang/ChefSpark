// Fixes from the 2026-10-26 phone demo review.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { displayIngredientName } from "../src/utils/ingredientCategories.js";

let server, Preview;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  Preview = (await server.ssrLoadModule("/src/components/RecipePreviewCard.jsx")).default;
});
after(async () => { await server?.close(); });

const recipe = {
  title: "Tomato and Onion Pasta", cuisine: "Western", difficulty: "Easy", cookTime: "25 minutes", servings: 2, matchScore: 80,
  youHave: ["pasta", "onion"], youNeed: ["grated Parmesan"], ingredients: [], steps: []
};
const card = (props) => renderToStaticMarkup(createElement(Preview, { recipe, onViewRecipe() {}, onSave() {}, ...props }));

test("ingredient names in sentences get a capital on each word, the rest as written", () => {
  assert.equal(displayIngredientName("tomatoes"), "Tomatoes");
  assert.equal(displayIngredientName("grated Parmesan"), "Grated Parmesan");
  assert.equal(displayIngredientName("  black   pepper "), "Black Pepper");
  assert.equal(displayIngredientName("BBQ sauce"), "BBQ Sauce");
  const html = card({});
  assert.match(html, /You have 2: Pasta, Onion/);
  assert.match(html, /You need 1: Grated Parmesan/);
});

test("saving shows on the dish itself: saving, saved (kept), or a retry after a failure", () => {
  assert.match(card({}), />Save</);
  assert.match(card({ saveState: "saving" }), /disabled=""[^>]*>Saving…</);
  const saved = card({ saveState: "saved" });
  assert.match(saved, /role="status"[^>]*>.*Saved to shelf/);
  assert.doesNotMatch(saved, /aria-label="Save /);
  assert.match(card({ saveState: "error" }), /aria-label="Try saving Tomato and Onion Pasta again"[^>]*>Couldn(&#x27;|')t save · retry</);
});

test("Plan tonight brings the progress into view and remembers saved dishes for the tab", async () => {
  const source = await readFile(new URL("../src/pages/RecipeGenerationPage.jsx", import.meta.url), "utf8");
  assert.match(source, /progress\.current\?\.scrollIntoView\(\{\s+block: "start"/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /useSessionState\("chefspark:tonight:saved", \[\]\)/);
});

test("an answered step question looks chosen and is not disabled", async () => {
  const source = await readFile(new URL("../src/components/StepHelp.jsx", import.meta.url), "utf8");
  assert.match(source, /aria-pressed=\{answered\}/);
  assert.match(source, /disabled=\{!answered && Boolean\(pending\)\}/);
  assert.match(source, /answered \? "text-flour ring-cream"/);
});

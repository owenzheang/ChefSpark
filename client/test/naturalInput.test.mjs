import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { looksLikeList, parseIngredients } from "../src/utils/parseIngredients.js";
import { getSpeechRecognition } from "../src/utils/useSpeechInput.js";

let server, ConfirmList, IngredientsPage;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  ConfirmList = (await server.ssrLoadModule("/src/components/IngredientConfirmList.jsx")).default;
  IngredientsPage = (await server.ssrLoadModule("/src/pages/IngredientsPage.jsx")).default;
});
after(async () => { await server?.close(); });

const names = (text) => parseIngredients(text).map((item) => item.name);

test("a typed sentence becomes catalog names; amounts and filler words are dropped", () => {
  assert.deepEqual(names("two eggs, half a cabbage and some chicken thighs"), ["Eggs", "Cabbage", "Chicken Thigh"]);
  assert.deepEqual(names("2 cans of tomatoes; 500g beef mince\napple"), ["Tomato", "Ground Beef", "Apple"]);
  assert.deepEqual(names("I have leftover rice and frozen peas"), ["Rice", "Peas"]);
  assert.deepEqual(names("3 cloves garlic & a bunch of spinach"), ["Garlic", "Spinach"]);
  assert.deepEqual(names("garlic, Garlic, soy sauce"), ["Garlic", "Soy Sauce"], "no duplicates");
  assert.deepEqual(names("black pepper and salt"), ["Black Pepper", "Salt"], "longer names win");
});

test("speech without commas is split at known names, and Australian words are understood", () => {
  assert.deepEqual(names("eggs two tomatoes chicken thighs and rice"), ["Eggs", "Tomato", "Chicken Thigh", "Rice"]);
  assert.deepEqual(names("a red capsicum prawns and coriander"), ["Bell Pepper", "Shrimp", "Coriander"]);
  assert.deepEqual(names("spring onions zucchini"), ["Spring Onion", "Zucchini"]);
});

test("near misses are marked for checking; unknown words are kept as said", () => {
  const items = parseIngredients("brocoli and dragon fruit, eggs");
  assert.deepEqual(items[0], { name: "Broccoli", status: "corrected", said: "brocoli" });
  assert.deepEqual(items[1], { name: "Dragon Fruit", status: "unknown", said: "dragon fruit" });
  assert.equal(items[2].status, "matched");
  assert.deepEqual(parseIngredients(""), []);
  assert.deepEqual(parseIngredients(null), []);
});

test("only a list goes through the check; a single name is added as before", () => {
  assert.equal(looksLikeList("spinach"), false);
  assert.equal(looksLikeList("chicken thighs"), false);
  assert.equal(looksLikeList("eggs, rice"), true);
  assert.equal(looksLikeList("eggs and rice"), true);
  assert.equal(looksLikeList("eggs,"), false);
});

test("the check shows each item with its note, what is already there, and how many will be added", () => {
  const html = renderToStaticMarkup(createElement(ConfirmList, {
    items: [{ name: "Eggs", status: "matched", said: "eggs" }, { name: "Broccoli", status: "corrected", said: "brocoli" },
      { name: "Dragon Fruit", status: "unknown", said: "dragon fruit" }],
    alreadyHave: ["Rice"], onRemove() {}, onConfirm() {}, onCancel() {} }));
  assert.match(html, /CHECK BEFORE ADDING/);
  assert.match(html, /From “brocoli”\. Did you mean this\?/);
  assert.match(html, /Not in our list/);
  assert.match(html, /aria-label="Remove Eggs"/);
  assert.match(html, /Already in your kitchen: Rice\./);
  assert.match(html, />Add 3 to kitchen</);
  const empty = renderToStaticMarkup(createElement(ConfirmList, { items: [], alreadyHave: ["Rice"], onRemove() {}, onConfirm() {}, onCancel() {} }));
  assert.match(empty, /Nothing new to add/);
  assert.doesNotMatch(empty, /to kitchen</);
});

test("the microphone only appears where the browser has speech recognition", () => {
  assert.equal(getSpeechRecognition(undefined), null);
  assert.equal(getSpeechRecognition({}), null);
  const Webkit = function () {};
  assert.equal(getSpeechRecognition({ webkitSpeechRecognition: Webkit }), Webkit);
  const html = renderToStaticMarkup(createElement(IngredientsPage, { onGenerateRecipes() {} }));
  assert.doesNotMatch(html, /Say what you have/, "no window during server rendering, so no button");
  assert.match(html, /placeholder="eggs, rice and spinach…"/);
});

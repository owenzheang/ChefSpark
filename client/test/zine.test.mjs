import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getPreviewStyle, developerStyle } from "../src/data/zineStyles.js";
import { developerAssetSample, zineAssetSamples } from "../src/data/zineAssetSamples.js";
let server, Screen, Entry, Zine;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  const module = await server.ssrLoadModule("/src/components/ZineSamplePreview.jsx");
  Screen = module.default; Entry = module.ZineEntry;
  Zine = (await server.ssrLoadModule("/src/components/OnePageZine.jsx")).default;
});
after(async () => { await server?.close(); });
const recipe = { title: "Chicken Fried Rice", cuisine: "Chinese", difficulty: "Easy", cookTime: "25 minutes", servings: 2,
  ingredients: [{ name: "Chicken", quantity: 200, unit: "g" }, { name: "Rice", quantity: 1.5, unit: "cup" }, { name: "Salt", quantity: null, unit: "" }],
  steps: [{ step: 1, instruction: "First instruction." }, { step: 2, instruction: "Second instruction." }],
  tips: ["Use chilled rice."], substitutions: [{ ingredient: "Chicken", substitute: "Tofu" }] };
function nodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function click(tree, label) {
  const button = nodes(tree).find(node => node.type === "button" && nodes(node).flatMap(n => [n.props?.children].flat()).filter(v => typeof v === "string").join("").trim() === label);
  assert.ok(button, label); button.props.onClick();
}
test("all variants render every fact without mutating the recipe", () => {
  const before = JSON.stringify(recipe);
  for (const styleId of ["collage", "notebook", "journal"]) {
    const html = renderToStaticMarkup(createElement(Zine, { recipe, styleId }));
    for (const value of ["Chicken Fried Rice", "25 minutes", "Serves 2", "200 g", "1.5 cup", "Salt", "Use chilled rice.", "Tofu"]) assert.ok(html.includes(value), value);
    assert.ok(html.indexOf("First instruction.") < html.indexOf("Second instruction."));
    assert.ok(html.includes("one-zine--" + styleId));
    assert.doesNotMatch(html, /null|undefined|zine-samples/);
  }
  assert.equal(JSON.stringify(recipe), before);
});
test("legacy and missing optional fields remain readable", () => {
  const html = renderToStaticMarkup(createElement(Zine, { recipe: { title: "Legacy", ingredients: ["2 cups rice"], steps: ["Do this.", "Then this."] } }));
  assert.match(html, /2 cups rice/);
  assert.ok(html.indexOf("Do this.") < html.indexOf("Then this."));
  assert.doesNotMatch(html, /About the dish|Finishing notes|Serves|null|undefined/);
});
test("optional description and serving suggestions are used only when supplied", () => {
  const html = renderToStaticMarkup(createElement(Zine, { recipe: { ...recipe, description: "Supplied description.", servingSuggestions: ["Supplied suggestion."] } }));
  assert.match(html, /Supplied description/); assert.match(html, /Supplied suggestion/);
});
test("long recipes retain the final ingredient and step in every style", () => {
  const long = { ...recipe, ingredients: Array.from({ length: 50 }, (_, i) => `Ingredient ${i}`), steps: Array.from({ length: 30 }, (_, i) => `Instruction ${i} with full detail.`) };
  for (const styleId of ["collage", "notebook", "journal"]) {
    const html = renderToStaticMarkup(createElement(Zine, { recipe: long, styleId }));
    assert.match(html, /Ingredient 49/); assert.match(html, /Instruction 29 with full detail/);
  }
});
test("entry, preview and recipe return callbacks work locally", () => {
  let view = "intro", styleId = "collage", returned = false;
  click(Entry({ onOpen: () => { view = "intro"; } }), "Create My ChefSpark Zine");
  const tree = () => Screen({ recipe, view, styleId, onNavigate: value => { view = value; }, onStyleChange: value => { styleId = value; }, onBackToRecipe: () => { returned = true; } });
  click(tree(), "Preview One-Page Zine"); assert.equal(view, "preview");
  click(tree(), "Back to Recipe"); assert.equal(returned, true);
});
test("Zine screens have no three-page navigation and the presentational components make no requests", async () => {
  for (const view of ["intro", "preview"]) {
    const html = renderToStaticMarkup(createElement(Screen, { recipe, view }));
    assert.match(html, /One-Page Zine/);
    assert.doesNotMatch(html, /Next Page|Previous Page|View all three|Discover|zine-samples|Choose a visual style|aria-pressed/);
  }
  for (const file of ["ZineSamplePreview.jsx", "OnePageZine.jsx"]) {
    const source = await readFile(new URL("../src/components/" + file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /fetch\(|services\/api|localStorage|sessionStorage/);
  }
  const detail = await readFile(new URL("../src/pages/RecipeDetailPage.jsx", import.meta.url), "utf8");
  assert.match(detail, /recipe=\{recipe\}/);
  assert.match(detail, /setZine\(null\)/);
  for (const file of ["discover.png", "cook.png", "finish.png"]) {
    const data = await readFile(new URL("../public/zine-samples/" + file, import.meta.url));
    assert.equal(data.subarray(1, 4).toString(), "PNG");
  }
});

test("new identities randomly select all three styles; reopening never rerolls", async () => {
  const before = JSON.stringify(recipe);
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  let calls = 0;
  for (const [i, expected] of ["collage", "notebook", "journal"].entries()) {
    const snapshot = { ...recipe, title: `Recipe ${i}` };
    assert.equal(await getPreviewStyle(snapshot, { storage, random: () => { calls++; return (i + .5) / 3; } }), expected);
    // Fresh object and storage adapter simulate remount/refresh, without module state.
    assert.equal(await getPreviewStyle(JSON.parse(JSON.stringify(snapshot)), {
      storage: { ...storage }, random: () => { throw Error("Unexpected reroll"); }
    }), expected);
  }
  assert.equal(calls, 3);
  assert.equal(JSON.stringify(recipe), before);
  for (const key of values.keys()) assert.doesNotMatch(key, /Recipe|Chicken/);
});

test("unavailable storage gives a stable fallback and developer override is dev-only", async () => {
  const storage = { getItem() { throw Error("denied"); } };
  assert.equal(await getPreviewStyle(recipe, { storage }), await getPreviewStyle(structuredClone(recipe), { storage }));
  for (const id of ["collage", "notebook", "journal"]) {
    assert.equal(developerStyle(`?zineStyle=${id}`, true), id);
    assert.equal(developerStyle(`?zineStyle=${id}`, false), null);
  }
  assert.equal(developerStyle("?zineStyle=invalid", true), null);
});

test("ordinary renders preserve the supplied Zine style", () => {
  const props = { recipe, view: "preview", styleId: "notebook" };
  const first = renderToStaticMarkup(createElement(Screen, props));
  assert.equal(renderToStaticMarkup(createElement(Screen, { ...props })), first);
  assert.match(first, /one-zine--notebook/);
});

test("reviewed asset sample requires dev mode, flag, matching style and matching dish", () => {
  const flag = "?zineAssets=sample";
  assert.equal(developerAssetSample(flag, true, recipe, "collage")?.id, "chicken-fried-rice-collage");
  assert.equal(developerAssetSample(flag, true, { title: "  chicken fried rice " }, "collage")?.id, "chicken-fried-rice-collage");
  assert.equal(developerAssetSample(flag, false, recipe, "collage"), null);
  assert.equal(developerAssetSample("", true, recipe, "collage"), null);
  assert.equal(developerAssetSample("?zineAssets=other", true, recipe, "collage"), null);
  for (const styleId of ["notebook", "journal"]) assert.equal(developerAssetSample(flag, true, recipe, styleId), null);
  assert.equal(developerAssetSample(flag, true, { ...recipe, title: "Spaghetti Bolognese" }, "collage"), null);
  assert.equal(developerAssetSample(flag, true, null, "collage"), null);
});

test("sample uses all four reviewed crops and every referenced crop is a local PNG", async () => {
  for (const sample of zineAssetSamples) {
    assert.deepEqual(Object.keys(sample.assets).sort(), ["cooking", "decoration", "hero", "ingredients"]);
    for (const asset of Object.values(sample.assets)) {
      assert.match(asset.src, /^\/zine-assets\/dev-samples\//);
      const data = await readFile(new URL("../public" + asset.src, import.meta.url));
      assert.equal(data.subarray(1, 4).toString(), "PNG");
    }
  }
});

test("Zine with assets keeps every fact as text and hides decoration from assistive tech", () => {
  const { assets } = zineAssetSamples[0];
  const plain = renderToStaticMarkup(createElement(Zine, { recipe, styleId: "collage" }));
  assert.doesNotMatch(plain, /one-zine-asset|zine-assets/);
  const html = renderToStaticMarkup(createElement(Zine, { recipe, styleId: "collage", assets }));
  for (const value of ["Chicken Fried Rice", "25 minutes", "Serves 2", "200 g", "1.5 cup", "Salt", "First instruction.", "Use chilled rice.", "Tofu"]) assert.ok(html.includes(value), value);
  assert.ok(html.includes(assets.ingredients.alt) && html.includes(assets.cooking.alt));
  assert.match(html, /<figure class="one-zine-asset one-zine-asset--decoration" aria-hidden="true"><img src="[^"]+decoration\.png" alt=""/);
  assert.ok(html.indexOf("one-zine-asset--ingredients") < html.indexOf("200 g"));
  assert.ok(html.includes(`<figure class="one-zine-visual"><img src="${assets.hero.src}" alt="${assets.hero.alt}"`));
  assert.doesNotMatch(html, /Room for a delicious picture|null|undefined/);
  assert.match(plain, /Room for a delicious picture/);
});

test("preview caption discloses reviewed AI artwork only when a sample is shown", () => {
  const plain = renderToStaticMarkup(createElement(Screen, { recipe, view: "preview" }));
  assert.match(plain, /No AI artwork has been created for this Zine/);
  const html = renderToStaticMarkup(createElement(Screen, { recipe, view: "preview", assetSample: zineAssetSamples[0] }));
  assert.match(html, /Development sample: AI-generated artwork manually reviewed on 2026-10-19/);
  assert.doesNotMatch(html, /No AI artwork has been created for this Zine/);
});

test("generated artwork takes precedence over samples and is disclosed as illustration only", () => {
  const artworkAssets = { hero: { src: "blob:hero", alt: "AI-generated illustration of Chicken Fried Rice" },
    cooking: { src: "blob:cook", alt: "AI-generated cooking scene" }, ingredients: { src: "blob:ing", alt: "AI-generated ingredient illustration" },
    decoration: { src: "blob:deco", alt: "" } };
  const html = renderToStaticMarkup(createElement(Screen, { recipe, view: "preview", artworkAssets, assetSample: zineAssetSamples[0],
    artworkPanel: createElement("section", { className: "zine-artwork" }, "panel") }));
  assert.match(html, /blob:hero/); assert.doesNotMatch(html, /zine-assets\/dev-samples/);
  assert.match(html, /AI-generated artwork, for illustration only\. Every ingredient, amount and step comes from your saved recipe\./);
  assert.ok(html.indexOf("zine-artwork") < html.indexOf("one-zine "));
  for (const value of ["200 g", "1.5 cup", "First instruction.", "Use chilled rice."]) assert.ok(html.includes(value), value);
  const intro = renderToStaticMarkup(createElement(Screen, { recipe, view: "intro", artworkPanel: createElement("section", {}, "panel") }));
  assert.doesNotMatch(intro, /panel/);
});

test("artwork panel covers unsaved, disabled, empty, generating, ready, failed and exhausted states", async () => {
  const { ZineArtworkPanel } = await server.ssrLoadModule("/src/components/ZineArtwork.jsx");
  const base = { saved: true, loading: false, busy: false, message: "", zine: null, availability: { enabled: true, remainingToday: 3 },
    create() {}, regenerate() {}, remove() {} };
  const render = patch => renderToStaticMarkup(createElement(ZineArtworkPanel, { artwork: { ...base, ...patch } }));
  assert.match(render({ saved: false }), /Save this recipe to add personalised AI artwork/);
  assert.match(render({ availability: { enabled: false, remainingToday: 0 } }), /isn&#x27;t available right now\. Your Zine works without it/);
  const empty = render({});
  assert.match(empty, /Create AI artwork/); assert.match(empty, /3 of today&#x27;s creations left/); assert.doesNotMatch(empty, /disabled/);
  assert.match(render({ zine: { status: "generating" } }), /role="status"[^>]*>.*Creating your artwork/);
  const ready = render({ zine: { status: "ready" }, availability: { enabled: true, remainingToday: 1 } });
  assert.match(ready, /Create new artwork/); assert.match(ready, /Remove artwork/);
  const failed = render({ zine: { status: "failed", error: "We couldn't create the artwork this time. Your recipe is still complete." } });
  assert.match(failed, /role="alert">We couldn&#x27;t create the artwork/); assert.match(failed, /Try again/);
  const exhausted = render({ availability: { enabled: true, remainingToday: 0 } });
  assert.match(exhausted, /<button[^>]*disabled=""[^>]*>.*Create AI artwork/); assert.match(exhausted, /used today&#x27;s artwork creations/);
  assert.match(render({ busy: true, zine: { status: "ready" } }), /<button[^>]*disabled=""[^>]*>.*Remove artwork/);
});

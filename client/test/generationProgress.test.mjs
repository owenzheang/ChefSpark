import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let server, Progress, generationStage, formatElapsed, LONG_WAIT_SECONDS;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  ({ default: Progress, generationStage, formatElapsed, LONG_WAIT_SECONDS } =
    await server.ssrLoadModule("/src/components/GenerationProgress.jsx"));
});
after(async () => { await server?.close(); });

test("status lines describe the work in order without claiming completion", () => {
  const context = { ingredientCount: 6, cuisine: "Western" };
  const lines = [0, 3, 4, 9, 10, 17, 18, 60].map(seconds => generationStage(seconds, context));
  assert.deepEqual([...new Set(lines)], [
    "Reading your 6 ingredients",
    "Picking three Western dishes you can make",
    "Writing clear steps for each dish",
    "Checking what you have and what you'll need"
  ]);
  assert.equal(generationStage(0, { ingredientCount: 1, cuisine: "Chinese" }), "Reading your 1 ingredient");
  for (const line of lines) assert.doesNotMatch(line, /\d+%|done|complete/i);
});

test("elapsed time is shown as minutes and seconds", () => {
  assert.equal(formatElapsed(0), "0:00");
  assert.equal(formatElapsed(9), "0:09");
  assert.equal(formatElapsed(75), "1:15");
});

test("progress is indeterminate, announced politely, cancellable and has three placeholders", () => {
  const html = renderToStaticMarkup(createElement(Progress, { ingredientCount: 6, cuisine: "Chinese", onCancel() {} }));
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status" aria-live="polite"[^>]*>Reading your 6 ingredients</);
  assert.match(html, /role="progressbar"[^>]*aria-valuetext="In progress"/);
  assert.doesNotMatch(html, /aria-valuenow/);
  assert.match(html, /<button type="button"[^>]*>.*Cancel<\/button>/);
  assert.equal((html.match(/COURSE (I|II|III) · PLATING/g) || []).length, 3);
  assert.doesNotMatch(html, /Taking longer than usual/);
  const late = renderToStaticMarkup(createElement(Progress, { ingredientCount: 6, cuisine: "Chinese", onCancel() {}, initialSeconds: LONG_WAIT_SECONDS }));
  assert.match(late, /Taking longer than usual/);
  assert.match(late, />0:25</);
});

test("animations only run when the user allows motion", async () => {
  const source = await readFile(new URL("../src/components/GenerationProgress.jsx", import.meta.url), "utf8");
  const animated = source.match(/\banimate-[a-z]+/g) || [];
  const guarded = source.match(/motion-safe:animate-[a-z]+/g) || [];
  assert.ok(animated.length > 0);
  assert.equal(animated.length, guarded.length);
});

test("the generation page wires cancel to an AbortController and aborts on leave", async () => {
  const source = await readFile(new URL("../src/pages/RecipeGenerationPage.jsx", import.meta.url), "utf8");
  assert.match(source, /generateRecipes\(\{ cuisine, difficulty \}, \{ signal: controller\.signal \}\)/);
  assert.match(source, /function handleCancel\(\) \{\s+request\.current\?\.abort\(\);/);
  assert.match(source, /request\.current\?\.abort\(\); \/\/ Leaving the page/);
  assert.match(source, /error\.name === "AbortError"/);
});

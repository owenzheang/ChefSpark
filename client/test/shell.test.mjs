import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let server, Login, Register, BottomNav;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  Login = (await server.ssrLoadModule("/src/pages/LoginPage.jsx")).default;
  Register = (await server.ssrLoadModule("/src/pages/RegisterPage.jsx")).default;
  BottomNav = (await server.ssrLoadModule("/src/components/BottomNav.jsx")).default;
});
after(async () => { await server?.close(); });

test("auth screens use the design system with labelled fields and no fake links", () => {
  for (const [Page, submit, other] of [[Login, "Sign in", "Create an account"], [Register, "Create account", "Sign in"]]) {
    const html = renderToStaticMarkup(createElement(Page, {}));
    assert.match(html, /data-ds=""/);
    assert.match(html, /bg-iron/);
    for (const field of ["email", "password"]) {
      const id = html.match(new RegExp(`<label for="([^"]+-${field})"`))?.[1];
      assert.ok(id && html.includes(`id="${id}"`), `${field} label is associated with its input`);
    }
    assert.match(html, new RegExp(`type="submit"[^>]*>${submit}<`));
    assert.match(html, new RegExp(`>${other}</button>`));
    assert.match(html, /aria-label="Show password"/);
    assert.doesNotMatch(html, /Forgot password|Terms of Service/);
  }
});

test("bottom navigation has exactly three labelled tabs and marks the current one", () => {
  const html = renderToStaticMarkup(createElement(BottomNav, { activePage: "recipes", onNavigate() {} }));
  assert.match(html, /<nav aria-label="Main navigation" data-ds=""/);
  for (const label of ["Kitchen", "Cook", "Shelf"]) assert.match(html, new RegExp(`<span>${label}</span>`));
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.match(html, /aria-current="page"[^>]*>(?:(?!<\/button>).)*Cook/);
  assert.equal((html.match(/<button /g) || []).length, 3);
  assert.doesNotMatch(html, /Log out/);
});

test("Tailwind tokens match DESIGN_SYSTEM.md and the legacy stylesheet is gone", async () => {
  const css = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
  const doc = await readFile(new URL("../../DESIGN_SYSTEM.md", import.meta.url), "utf8");
  assert.match(css, /@layer theme, base, components, utilities;/);
  assert.match(css, /@import "tailwindcss\/preflight\.css" layer\(base\);/);
  assert.doesNotMatch(css, /styles\.css|legacy/);
  await assert.rejects(readFile(new URL("../src/styles.css", import.meta.url), "utf8"));
  for (const [token, hex] of [["iron", "#15120F"], ["flour", "#F7F5F0"], ["soft", "#D8CFC2"], ["ash", "#A39B90"], ["cream", "#EBCD98"]]) {
    assert.ok(doc.includes(`\`${token}\` | \`${hex}\``), `${token} documented`);
    assert.ok(css.toLowerCase().includes(`--color-${token}: ${hex.toLowerCase()};`), `${token} defined`);
  }
});

test("the Shelf lists saved recipes as rows and asks before removing one", async () => {
  const { default: Shelf, formatSavedDate } = await server.ssrLoadModule("/src/pages/SavedRecipesPage.jsx");
  const html = renderToStaticMarkup(createElement(Shelf, { onViewRecipe() {}, onCook() {} }));
  assert.match(html, /<main data-ds=""[^>]*bg-iron/);
  assert.match(html, /Your shelf/);
  assert.match(html, /0 RECIPES SAVED/);
  // The empty state appears only after loading finishes, never alongside a list.
  assert.doesNotMatch(html, /Nothing on the shelf yet/);
  const source = await readFile(new URL("../src/pages/SavedRecipesPage.jsx", import.meta.url), "utf8");
  assert.match(source, /onClick=\{\(\) => setConfirmingId\(savedRecipe\.id\)\}/);
  assert.match(source, /onClick=\{\(\) => handleDelete\(savedRecipe\.id\)\}/);
  assert.doesNotMatch(source, /<img /);
  const now = new Date("2026-10-23T12:00:00");
  assert.equal(formatSavedDate("2026-10-23T08:00:00", now), "today");
  assert.equal(formatSavedDate("2026-10-20T08:00:00", now), "3d ago");
  assert.equal(formatSavedDate("not a date", now), "Saved recently");
});

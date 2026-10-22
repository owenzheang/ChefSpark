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
    assert.match(html, /bg-paper/);
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

test("bottom navigation has three labelled tabs, marks the current one and keeps log out", () => {
  const html = renderToStaticMarkup(createElement(BottomNav, { activePage: "recipes", onNavigate() {}, onLogout() {} }));
  assert.match(html, /<nav aria-label="Main navigation" data-ds=""/);
  for (const label of ["Kitchen", "Cook", "Shelf"]) assert.match(html, new RegExp(`<span class="relative">${label}</span>`));
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.match(html, /aria-current="page"[^>]*>(?:(?!<\/button>).)*Cook/);
  assert.match(html, /aria-label="Log out"/);
});

test("Tailwind tokens match DESIGN_SYSTEM.md and legacy CSS sits in a lower layer", async () => {
  const css = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
  const doc = await readFile(new URL("../../DESIGN_SYSTEM.md", import.meta.url), "utf8");
  assert.match(css, /@layer legacy, theme, base, components, utilities;/);
  assert.match(css, /@import "\.\/styles\.css" layer\(legacy\);/);
  for (const [token, hex] of [["ink", "#141414"], ["paper", "#F3EDE2"], ["card", "#FFFDF8"], ["muted", "#4A4741"],
    ["tomato", "#E8542F"], ["tomato-tint", "#FBDCCF"], ["cobalt", "#2F4FE0"], ["cobalt-tint", "#D9DFFB"]]) {
    assert.ok(doc.includes(`\`${token}\` | \`${hex}\``), `${token} documented`);
    assert.ok(css.toLowerCase().includes(`--color-${token}: ${hex.toLowerCase()};`), `${token} defined`);
  }
});

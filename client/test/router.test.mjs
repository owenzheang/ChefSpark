import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

// Minimal storage stubs so the token and session helpers can run outside a browser.
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key), clear: () => values.clear() };
}
const local = memoryStorage();
Object.defineProperty(globalThis, "localStorage", { value: local, configurable: true });

let server, AppRoutes, routes, api;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom" });
  ({ AppRoutes } = await server.ssrLoadModule("/src/App.jsx"));
  routes = await server.ssrLoadModule("/src/routes.js");
  api = await server.ssrLoadModule("/src/services/api.js");
});
after(async () => { await server?.close(); });
beforeEach(() => local.clear());

const render = (path) => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] }, createElement(AppRoutes)));
const signIn = () => local.setItem("smartkitchen_token", "test-token");

test("route helpers map tabs, dish numbers and safe return paths", () => {
  const { tabForPath, pathForTab, dishIndexFromParam, safeReturnPath, isPublicPath, paths } = routes;
  assert.equal(tabForPath("/kitchen"), "ingredients");
  assert.equal(tabForPath("/cook/dish/2"), "recipes");
  assert.equal(tabForPath("/shelf/12"), "savedRecipes");
  assert.equal(pathForTab("recipes"), "/cook");
  assert.equal(pathForTab("unknown"), "/kitchen");
  assert.equal(paths.generatedDish(0), "/cook/dish/1");
  assert.equal(paths.savedRecipe(12), "/shelf/12");
  assert.equal(dishIndexFromParam("2"), 1);
  for (const bad of ["0", "-1", "1.5", "abc", undefined]) assert.equal(dishIndexFromParam(bad), null);
  assert.equal(safeReturnPath("/shelf/12"), "/shelf/12");
  for (const bad of ["//evil.example", "https://evil.example", "/login", "", null]) assert.equal(safeReturnPath(bad), "/kitchen");
  assert.ok(isPublicPath("/register"));
  assert.ok(!isPublicPath("/cook"));
});

test("signed-out visitors see login, and protected pages render nothing but a redirect", () => {
  assert.match(render("/login"), /Cook tonight with what you have\./);
  assert.match(render("/register"), /Your kitchen, remembered\./);
  for (const path of ["/kitchen", "/cook", "/shelf", "/shelf/3", "/cook/dish/1"]) {
    const html = render(path);
    assert.doesNotMatch(html, /Main navigation|What&#x27;s in your kitchen|Plan tonight/, path);
  }
});

test("signed-in users get each screen with the matching tab, and login redirects away", () => {
  signIn();
  const kitchen = render("/kitchen");
  assert.match(kitchen, /What&#x27;s in your kitchen tonight\?/);
  assert.match(kitchen, /aria-current="page"[^>]*>(?:(?!<\/button>).)*Kitchen/);
  assert.match(render("/cook"), /Plan tonight\./);
  assert.match(render("/cook"), /aria-current="page"[^>]*>(?:(?!<\/button>).)*Cook/);
  const shelf = render("/shelf/7");
  assert.match(shelf, /aria-current="page"[^>]*>(?:(?!<\/button>).)*Shelf/);
  assert.match(shelf, /Back to saved recipes/);
  assert.doesNotMatch(render("/login"), /Cook tonight with what you have/);
  assert.doesNotMatch(render("/nowhere"), /Main navigation/);
});

test("a generated dish route only renders a dish kept in this tab's menu", () => {
  signIn();
  assert.doesNotMatch(render("/cook/dish/1"), /Back to generated recipes/);
  const menu = [{ title: "Tonight Dish", cuisine: "Chinese", difficulty: "Easy", cookTime: "10 minutes", servings: 2,
    matchScore: 90, youHave: ["Eggs"], youNeed: [], ingredients: [{ name: "Eggs", quantity: 2, unit: "" }],
    steps: [{ step: 1, instruction: "Scramble the eggs." }] }];
  const session = memoryStorage();
  session.setItem("chefspark:tonight:recipes", JSON.stringify(menu));
  const previous = globalThis.window;
  globalThis.window = Object.assign(new EventTarget(), {
    sessionStorage: session, scrollTo() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  });
  try {
    const html = render("/cook/dish/1");
    assert.match(html, /Back to generated recipes/);
    assert.match(html, /Scramble the eggs\./);
    assert.doesNotMatch(render("/cook/dish/2"), /Scramble the eggs\./);
  } finally {
    globalThis.window = previous;
  }
});

test("a 401 on a signed-in request clears the token and announces sign-out", async () => {
  signIn();
  const events = new EventTarget();
  let signedOut = 0;
  events.addEventListener(api.SIGNED_OUT_EVENT, () => { signedOut += 1; });
  const realFetch = globalThis.fetch, realDispatch = globalThis.dispatchEvent;
  globalThis.dispatchEvent = event => events.dispatchEvent(event);
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ message: "Invalid or expired token." }) });
  try {
    await assert.rejects(api.getIngredients(), /session has ended/);
    assert.equal(api.getToken(), null);
    assert.equal(signedOut, 1);
    // A wrong password (no stored token) is a normal error, not a sign-out.
    await assert.rejects(api.loginUser("a@example.test", "wrong"), /Invalid or expired token\./);
    assert.equal(signedOut, 1);
  } finally {
    globalThis.fetch = realFetch;
    globalThis.dispatchEvent = realDispatch;
  }
});

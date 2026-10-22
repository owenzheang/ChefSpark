// URL structure for the app. Pages stay router-agnostic; App.jsx maps these paths to them.
export const paths = Object.freeze({
  login: "/login",
  register: "/register",
  kitchen: "/kitchen",
  cook: "/cook",
  generatedDish: (index) => `/cook/dish/${index + 1}`,
  generatedDishCooking: (index) => `/cook/dish/${index + 1}/cooking`,
  shelf: "/shelf",
  savedRecipe: (id) => `/shelf/${encodeURIComponent(id)}`,
  savedRecipeCooking: (id) => `/shelf/${encodeURIComponent(id)}/cooking`
});

const publicPaths = new Set([paths.login, paths.register]);

export function isPublicPath(pathname) {
  return publicPaths.has(pathname);
}

// Bottom-navigation tab for a URL (detail pages belong to the tab they were opened from).
export function tabForPath(pathname) {
  if (pathname.startsWith(paths.cook)) return "recipes";
  if (pathname.startsWith(paths.shelf)) return "savedRecipes";
  return "ingredients";
}

export function pathForTab(tab) {
  return { ingredients: paths.kitchen, recipes: paths.cook, savedRecipes: paths.shelf }[tab] || paths.kitchen;
}

// "/cook/dish/2" -> index 1; anything invalid -> null.
export function dishIndexFromParam(param) {
  const number = Number(param);
  return Number.isInteger(number) && number >= 1 ? number - 1 : null;
}

// Only same-app paths are allowed as a post-login destination.
export function safeReturnPath(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !isPublicPath(value)
    ? value : paths.kitchen;
}

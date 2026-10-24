const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const TOKEN_KEY = "smartkitchen_token";
// Fired when the server rejects the stored token, so the app can return to the login screen.
export const SIGNED_OUT_EVENT = "chefspark:signed-out";

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  try {
    return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null; // Storage blocked or unavailable (e.g. server-side rendering in tests).
  }
}

export function removeToken() {
  try {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
  } catch {
    // Nothing stored to remove.
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Can't reach ChefSpark right now. Check your connection and try again.");
  }

  // A proxy or crashed server may answer with non-JSON; fall back to a plain message.
  const data = await response.json().catch(() => ({}));

  // A signed-in request rejected with 401 means the session expired or the token is invalid.
  if (response.status === 401 && token) {
    removeToken();
    globalThis.dispatchEvent?.(new Event(SIGNED_OUT_EVENT));
    throw new Error("Your session has ended. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}

export function loginUser(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function registerUser(email, password) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function getIngredients() {
  return request("/ingredients");
}

export function addIngredient(ingredient) {
  return request("/ingredients", {
    method: "POST",
    body: JSON.stringify(ingredient)
  });
}

export function updateIngredient(id, ingredient) {
  return request(`/ingredients/${id}`, {
    method: "PUT",
    body: JSON.stringify(ingredient)
  });
}

export function deleteIngredient(id) {
  return request(`/ingredients/${id}`, {
    method: "DELETE"
  });
}

// Pass an AbortSignal to let the user cancel; the server then stops its AI request too.
export function generateRecipes(options, { signal } = {}) {
  return request("/recipes/generate", {
    method: "POST",
    body: JSON.stringify(options),
    signal
  });
}

// Recipe assistant (Phase 3). Each edit or uncached explanation is one paid DeepSeek request on the server.
export function getAssistantStatus() {
  return request("/assistant/status");
}

export function proposeRecipeEdit(change, { signal } = {}) {
  return request("/assistant/edit", { method: "POST", body: JSON.stringify(change), signal });
}

export function explainStep(question, { signal } = {}) {
  return request("/assistant/explain", { method: "POST", body: JSON.stringify(question), signal });
}

// Food pictures (Phase 4). A dish already in the shared library is free; otherwise one paid OpenAI request
// on the server, within daily limits. purpose is "menu" (planned dishes) or "variant" (accepted variation).
export function requestFoodImage(recipe, purpose) {
  return request("/food-images", { method: "POST", body: JSON.stringify({ recipe, purpose }) });
}

// Only ChefSpark's own pictures are shown; anything else (e.g. old stock photo links) gets the empty plate.
export function foodImageSrc(imageUrl) {
  if (typeof imageUrl !== "string" || !/^\/api\/food-images\/[0-9a-f-]{36}\.webp$/.test(imageUrl)) return null;
  try {
    return new URL(imageUrl, new URL(API_BASE_URL, globalThis.location?.href)).href;
  } catch {
    return null;
  }
}

export function saveRecipe(recipe) {
  return request("/saved-recipes", {
    method: "POST",
    body: JSON.stringify({ recipe })
  });
}

export function getSavedRecipes() {
  return request("/saved-recipes");
}

export function getSavedRecipe(id) {
  return request(`/saved-recipes/${id}`);
}

export function deleteSavedRecipe(id) {
  return request(`/saved-recipes/${id}`, {
    method: "DELETE"
  });
}

export function getZineArtwork(savedRecipeId) {
  return request(`/zines/recipe/${savedRecipeId}`);
}

export function createZineArtwork(savedRecipeId, regenerate = false) {
  return request(`/zines/recipe/${savedRecipeId}`, {
    method: "POST",
    body: JSON.stringify({ regenerate })
  });
}

export function deleteZineArtwork(zineId) {
  return request(`/zines/${zineId}`, {
    method: "DELETE"
  });
}

// Images require the auth header, so they are fetched as blobs and shown via object URLs.
export async function getZineImageUrl(zineId, kind) {
  const response = await fetch(`${API_BASE_URL}/zines/${zineId}/images/${kind}`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  if (!response.ok) {
    throw new Error("Image could not be loaded.");
  }
  return URL.createObjectURL(await response.blob());
}

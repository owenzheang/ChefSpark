const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const TOKEN_KEY = "smartkitchen_token";

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
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

export function generateRecipes(options) {
  return request("/recipes/generate", {
    method: "POST",
    body: JSON.stringify(options)
  });
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

const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";
const imageCache = new Map();

function normalizeQuery(query) {
  return query.trim().toLowerCase();
}

function getBestImageUrl(data) {
  const firstPhoto = data.photos?.[0];

  if (!firstPhoto?.src) {
    return "";
  }

  return firstPhoto.src.large || firstPhoto.src.medium || firstPhoto.src.landscape || "";
}

async function searchPexels(query) {
  const apiKey = process.env.PEXELS_API_KEY;
  const normalizedQuery = normalizeQuery(query);

  if (!apiKey || !normalizedQuery) {
    return "";
  }

  if (imageCache.has(normalizedQuery)) {
    return imageCache.get(normalizedQuery);
  }

  try {
    const params = new URLSearchParams({
      query: normalizedQuery,
      per_page: "1",
      orientation: "landscape"
    });

    // Pictures are optional: never let a slow image search hold up the recipes.
    const response = await fetch(`${PEXELS_SEARCH_URL}?${params.toString()}`, {
      headers: {
        Authorization: apiKey
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      imageCache.set(normalizedQuery, "");
      return "";
    }

    const data = await response.json();
    const imageUrl = getBestImageUrl(data);

    imageCache.set(normalizedQuery, imageUrl);
    return imageUrl;
  } catch {
    imageCache.set(normalizedQuery, "");
    return "";
  }
}

export async function fetchRecipeImageUrl({ imagePrompt, title }) {
  const imageFromPrompt = await searchPexels(imagePrompt || "");

  if (imageFromPrompt) {
    return imageFromPrompt;
  }

  return searchPexels(title || "");
}

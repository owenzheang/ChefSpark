// Presentation only: independent of cuisine and factual Recipe JSON.
export const zineStyles = [
  { id: "collage", name: "Editorial Collage", description: "Taped photographs, torn notes and oversized headings.", artDirection: "Cream paper, olive and brick red, asymmetric collage, torn edges, masking tape. Visuals only; no recipe text." },
  { id: "notebook", name: "Rustic Notebook", description: "Lined paper, a left-hand photograph and handwritten notes.", artDirection: "Oat paper, moss and terracotta, rustic notebook, pencil sketches, pinned photographs. Visuals only; no recipe text." },
  { id: "journal", name: "Modern Food Journal", description: "A wide hero, spacious columns and quiet editorial rules.", artDirection: "Ivory paper, forest green and dusty rose, modern food journal, botanical accents. Visuals only; no recipe text." }
];
export const getZineStyle = id => zineStyles.find(style => style.id === id) || zineStyles[0];

// One prototype identity per recipe snapshot. Store only a fingerprint and style,
// not recipe contents. Future persisted Zines should store styleId on the Zine.
export async function getPreviewStyle(recipe, { storage, random = Math.random } = {}) {
  const bytes = new TextEncoder().encode(JSON.stringify(recipe));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  const key = `chefspark:zine-style:v1:${fingerprint}`;
  try {
    const store = storage === undefined ? window.sessionStorage : storage;
    const existing = store.getItem(key);
    if (zineStyles.some(style => style.id === existing)) return existing;
    const selected = zineStyles[Math.floor(random() * zineStyles.length)].id;
    store.setItem(key, selected);
    return selected;
  } catch {
    // Storage denied/full: stable fallback rather than changing on each refresh.
    return zineStyles[parseInt(fingerprint.slice(0, 8), 16) % zineStyles.length].id;
  }
}

export function developerStyle(search, isDevelopment) {
  const id = isDevelopment ? new URLSearchParams(search).get("zineStyle") : null;
  return zineStyles.some(style => style.id === id) ? id : null;
}

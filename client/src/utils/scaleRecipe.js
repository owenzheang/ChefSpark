// Servings scaling in code, not AI (RULES.md). Only structured quantities change; "to taste"
// items (null quantity) and older string-only ingredients are kept as they are.

const METRIC = new Set(["g", "gram", "grams", "kg", "ml", "millilitre", "millilitres", "milliliter", "milliliters", "l", "litre", "liter"]);
const FRACTION_SYMBOLS = [[0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"]];

function roundMetric(value) {
  if (value < 10) return Math.round(value * 2) / 2;
  if (value < 100) return Math.round(value / 5) * 5;
  if (value < 1000) return Math.round(value / 10) * 10;
  return Math.round(value / 50) * 50;
}

// Kitchen-friendly rounding: nearest quarter or third for spoons, cups and pieces.
function roundKitchen(value) {
  const whole = Math.floor(value);
  const rest = value - whole;
  const candidates = [0, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1];
  const nearest = candidates.reduce((best, item) => Math.abs(item - rest) < Math.abs(best - rest) ? item : best, 0);
  const result = whole + nearest;
  return result === 0 ? 0.25 : result;
}

// Things counted whole: nobody uses 12½ garlic cloves or 4½ eggs. Half an onion or tomato is fine, so only
// these units (and eggs or wings counted without a unit) round to whole numbers, never below 1.
const WHOLE_UNITS = /^(?:cloves?|pieces?|pcs?|wings?|drumsticks?|sticks?|eggs?|fillets?|bulbs?|cans?|tins?)$/;
const WHOLE_ITEMS = /\b(?:eggs?|wings?|drumsticks?)\b/;

export function scaleQuantity(quantity, unit, factor, name = "") {
  if (!Number.isFinite(quantity) || !Number.isFinite(factor) || factor <= 0) return quantity;
  if (factor === 1) return quantity;
  const scaled = quantity * factor;
  const unitText = String(unit || "").trim().toLowerCase();
  if (WHOLE_UNITS.test(unitText) || (!unitText && WHOLE_ITEMS.test(String(name).toLowerCase()))) {
    return Math.max(1, Math.round(scaled));
  }
  return METRIC.has(unitText) ? roundMetric(scaled) : roundKitchen(scaled);
}

export function formatQuantity(quantity) {
  if (!Number.isFinite(quantity)) return "";
  const whole = Math.floor(quantity);
  const rest = quantity - whole;
  if (rest < 0.01) return String(whole);
  const symbol = FRACTION_SYMBOLS.find(([value]) => Math.abs(value - rest) < 0.01)?.[1];
  if (symbol) return whole ? `${whole}${symbol}` : symbol;
  return String(Math.round(quantity * 10) / 10);
}

// Returns display-ready rows: { name, amount, scaled, unscalable }.
export function scaleIngredients(ingredients = [], fromServings, toServings) {
  const factor = Number.isFinite(fromServings) && fromServings > 0 && Number.isFinite(toServings) && toServings > 0
    ? toServings / fromServings : 1;
  return ingredients.map((ingredient) => {
    if (typeof ingredient === "string") {
      return { name: ingredient, amount: "", scaled: false, unscalable: factor !== 1 };
    }
    const quantity = scaleQuantity(ingredient.quantity, ingredient.unit, factor, ingredient.name);
    const amount = Number.isFinite(quantity)
      ? [formatQuantity(quantity), typeof ingredient.unit === "string" ? ingredient.unit : ""].filter(Boolean).join(" ")
      : "";
    return { name: ingredient.name, amount, scaled: factor !== 1 && Number.isFinite(ingredient.quantity), unscalable: false };
  });
}

// Ingredients whose names appear in a step's text (simple, deterministic matching).
export function ingredientsInStep(stepText, rows) {
  if (typeof stepText !== "string") return [];
  const text = stepText.toLowerCase();
  return rows.filter((row) => {
    const name = String(row.name || "").toLowerCase().trim();
    if (!name) return false;
    const singular = name.replace(/(es|s)$/, "");
    const words = [name, singular, name.split(" ").pop(), singular.split(" ").pop()].filter((word) => word.length > 2);
    return words.some((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(text));
  });
}

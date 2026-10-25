// Phase 5: turns "two eggs, half a cabbage and some chicken thighs" (typed or spoken) into catalog
// names for the cook to confirm. Code only, no AI: amounts are dropped (the Match Score does not use
// them) and anything not in the catalog is kept as said and flagged.
import { ingredientCatalog } from "../data/ingredientCatalog.js";
import { normalizeIngredientName } from "./ingredientCategories.js";
import { searchIngredients } from "./ingredientSearch.js";

const catalogByName = new Map(ingredientCatalog.map(({ name }) => [normalizeIngredientName(name), name]));

// Everyday and Australian words for catalog items.
const aliases = new Map(Object.entries({
  capsicum: "Bell Pepper", "red capsicum": "Bell Pepper", "green capsicum": "Bell Pepper", pepper: "Bell Pepper",
  scallion: "Spring Onion", "green onion": "Spring Onion", shallot: "Spring Onion",
  prawn: "Shrimp", cilantro: "Coriander", mince: "Ground Beef", "beef mince": "Ground Beef", "pork mince": "Ground Pork", aubergine: "Eggplant", courgette: "Zucchini",
  mushies: "Mushroom", egg: "Eggs", noodle: "Egg Noodles", "pak choy": "Bok Choy", "pak choi": "Bok Choy"
}));

const separators = /\s*(?:[,;\n\r、，；]|\band\b|&|\bplus\b|\balso\b)\s*/i;
const numberWords = "a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|half|quarter|couple|few|several|some|a few|a couple|a little|little|lots|lot|bit|bunch|handful";
const units = "kg|kilo|kilos|g|grams?|ml|l|litres?|liters?|cups?|tbsp|tsp|tablespoons?|teaspoons?|cans?|tins?|packs?|packets?|bags?|boxes?|bottles?|jars?|pieces?|slices?|cloves?|heads?|bunch(?:es)?|handfuls?|stalks?|sticks?|blocks?|fillets?|pinch|dash";
// Word boundaries keep "a" from eating the start of "apple" and "g" the start of "garlic".
const amount = new RegExp(`^(?:(?:\\d+(?:[.,/]\\d+)?|[½¼¾⅓⅔])\\s*|(?:${numberWords})\\b\\s*)+(?:(?:${units})\\b\\.?\\s*)?(?:of\\b\\s*)?`, "i");
// Single words that are never an ingredient on their own (amounts inside unpunctuated speech).
const filler = new RegExp(`^(?:\\d+(?:[.,/]\\d+)?|[½¼¾⅓⅔]|${numberWords}|${units}|of|the|my|with)$`, "i");
const leftoverWords = /\b(?:fresh|frozen|leftover|left ?over|raw|cooked|some more|i have|we have|i've got|got|there is|there are|in the fridge|in the pantry)\b/gi;

function clean(piece) {
  return normalizeIngredientName(piece.replace(leftoverWords, " ").replace(/[.!?"']/g, " "))
    .replace(amount, "").replace(/^(?:the|my)\s+/, "").trim();
}

function singularForms(text) {
  const forms = [text];
  if (text.endsWith("ies")) forms.push(`${text.slice(0, -3)}y`);
  if (text.endsWith("oes")) forms.push(text.slice(0, -2));
  if (text.endsWith("es")) forms.push(text.slice(0, -2));
  if (text.endsWith("s")) forms.push(text.slice(0, -1));
  forms.push(`${text}s`);
  return forms;
}

// Exact name, alias, or the same word in singular/plural. Fuzzy corrections are marked for the cook.
function lookup(text) {
  for (const form of singularForms(text)) {
    if (catalogByName.has(form)) return { name: catalogByName.get(form), status: "matched" };
    if (aliases.has(form)) return { name: aliases.get(form), status: "matched" };
  }
  const [best] = searchIngredients(text);
  if (best?.isCorrection) return { name: best.name, status: "corrected" };
  return null;
}

// Speech often has no commas ("eggs tomatoes chicken thighs"): take the longest known name at each word.
function segment(words) {
  const found = [];
  const unknown = [];
  for (let start = 0; start < words.length;) {
    let match = null;
    for (let length = Math.min(3, words.length - start); length > 0 && !match; length -= 1) {
      const result = lookup(words.slice(start, start + length).join(" "));
      if (result) match = { ...result, length };
    }
    if (match) {
      if (unknown.length) found.push(unknownItem(unknown.splice(0).join(" ")));
      found.push({ name: match.name, status: match.status, said: words.slice(start, start + match.length).join(" ") });
      start += match.length;
    } else {
      if (!filler.test(words[start])) unknown.push(words[start]);
      else if (unknown.length) found.push(unknownItem(unknown.splice(0).join(" ")));
      start += 1;
    }
  }
  if (unknown.length) found.push(unknownItem(unknown.join(" ")));
  return found;
}

function unknownItem(said) {
  return { name: said.replace(/\b\w/g, (letter) => letter.toUpperCase()), status: "unknown", said };
}

// Returns [{ name, status: "matched" | "corrected" | "unknown", said }], without duplicates.
export function parseIngredients(text) {
  if (typeof text !== "string") return [];
  const items = [];
  for (const piece of text.split(separators)) {
    const said = clean(piece);
    if (!said) continue;
    const whole = lookup(said);
    items.push(...(whole ? [{ ...whole, said }] : segment(said.split(" "))));
  }
  const seen = new Set();
  return items.filter((item) => {
    const key = normalizeIngredientName(item.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Whether the text names more than one thing, so it should go through the confirm list.
export function looksLikeList(text) {
  return typeof text === "string" && text.split(separators).filter((piece) => piece.trim()).length > 1;
}

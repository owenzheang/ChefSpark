import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import IngredientCategoryIcon from "../components/IngredientCategoryIcon.jsx";
import IngredientSuggestions from "../components/IngredientSuggestions.jsx";
import IngredientConfirmList from "../components/IngredientConfirmList.jsx";
import { searchIngredients } from "../utils/ingredientSearch.js";
import { looksLikeList, parseIngredients } from "../utils/parseIngredients.js";
import { useSpeechInput } from "../utils/useSpeechInput.js";
import { ArrowRight, Mic, Plus, X } from "lucide-react";
import Spark from "../components/Spark.jsx";
import { addIngredient, deleteIngredient, getIngredients } from "../services/api.js";

const emptyForm = {
  name: ""
};

const pageMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] }
};

const chipMotion = {
  initial: { opacity: 0, scale: 0.82, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.74, y: -4 },
  transition: { duration: 0.18 }
};

const popularIngredients = [
  "Eggs",
  "Tomato",
  "Garlic",
  "Onion",
  "Rice",
  "Chicken",
  "Pasta",
  "Potato",
  "Spinach",
  "Carrot",
  "Mushroom",
  "Bell Pepper",
  "Tofu",
  "Soy Sauce",
  "Ginger"
];

function IngredientsPage({ onGenerateRecipes, onLogout }) {
  const [ingredients, setIngredients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // A typed or spoken list waiting for the cook's check: { items, alreadyHave } or null.
  const [pending, setPending] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const ingredientInput = useRef(null);
  const suggestions = showSuggestions && !looksLikeList(form.name) ? searchIngredients(form.name) : [];
  const speech = useSpeechInput({
    onText(text) {
      setForm({ name: text });
      reviewList(text);
    }
  });

  // Splits the text into catalog names; anything already in the kitchen is left out and mentioned.
  function reviewList(text) {
    const have = new Set(ingredients.map((ingredient) => ingredient.name.trim().toLowerCase()));
    const parsed = parseIngredients(text);
    setShowSuggestions(false);
    setMessage("");
    setPending({
      items: parsed.filter((item) => !have.has(item.name.toLowerCase())),
      alreadyHave: parsed.filter((item) => have.has(item.name.toLowerCase())).map((item) => item.name)
    });
    requestAnimationFrame(() => document.getElementById("confirm-heading")?.focus());
  }

  // One request per ingredient (the API adds one at a time); stops at the first failure.
  async function confirmPending() {
    setIsAdding(true);
    let added = 0;
    let result;
    try {
      for (const item of pending.items) {
        await addIngredient({ name: item.name, quantity: null, unit: "" });
        added += 1;
      }
      setPending(null);
      resetForm();
      result = `Added ${added} ${added === 1 ? "ingredient" : "ingredients"}.`;
    } catch (error) {
      setPending((value) => value && { ...value, items: value.items.slice(added) });
      result = `${added ? `Added ${added}. ` : ""}${error.message}`;
    } finally {
      setIsAdding(false);
      // Reloading clears the message, so the result is shown after it.
      await loadIngredients();
      setMessage(result);
    }
  }

  function selectSuggestion(name) {
    setForm({ name });
    setShowSuggestions(false);
    ingredientInput.current?.focus();
  }

  async function loadIngredients() {
    setMessage("");
    setIsLoading(true);

    try {
      const data = await getIngredients();
      setIngredients(data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadIngredients();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setShowSuggestions(false);
  }

  async function addIngredientByName(name) {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    const ingredientData = {
      name: trimmedName,
      quantity: null,
      unit: ""
    };

    try {
      await addIngredient(ingredientData);
      setMessage("Ingredient added.");
      resetForm();
      await loadIngredients();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    // "eggs, rice and spinach" goes through the check; a single name is added straight away as before.
    if (looksLikeList(form.name)) return reviewList(form.name);
    await addIngredientByName(form.name);
  }

  async function handleDelete(id) {
    setMessage("");

    try {
      await deleteIngredient(id);
      setMessage("Ingredient deleted.");
      await loadIngredients();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const weekday = new Date().toLocaleDateString("en", { weekday: "long" }).toUpperCase();
  const ingredientNames = ingredients.map((ingredient) => ingredient.name);
  const visiblePopularIngredients = popularIngredients
    .filter((ingredient) => !ingredientNames.includes(ingredient))
    .slice(0, 8);
  const hasIngredients = ingredients.length > 0;
  const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

  return (
    <motion.main data-ds="" {...pageMotion}
      className="min-h-screen bg-iron bg-ember-glow px-6 pt-5 pb-[calc(170px+env(safe-area-inset-bottom,0px))]">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-2xl italic">
          <Spark size={16} className="text-cream" />
          ChefSpark
        </span>
        <button type="button" onClick={onLogout}
          className={`min-h-11 px-1 font-mono text-[11px] tracking-[0.18em] text-ash hover:text-flour ${focusRing}`}>
          LOG OUT
        </button>
      </header>

      <p className="mt-7 font-mono text-[11px] tracking-[0.2em] text-ash">{weekday}</p>
      <h1 className="mt-2 font-display text-[52px] leading-[0.95] tracking-[-0.01em] italic">
        What's in your kitchen tonight?
      </h1>

      <section className="mt-7" aria-label="Add ingredients">
        <form onSubmit={handleSubmit} className="flex flex-col gap-1">
          <label htmlFor="ingredient-name" className="font-mono text-[11px] tracking-[0.2em] text-ash uppercase">Add ingredients</label>
          <div className="flex items-center gap-2 border-b border-flour focus-within:border-cream">
            <input
              id="ingredient-name"
              type="text"
              ref={ingredientInput}
              aria-label="Ingredient name, or a list of them"
              aria-controls={suggestions.length ? "ingredient-suggestions" : undefined}
              autoComplete="off"
              value={form.name}
              onChange={(event) => {
                setForm({ name: event.target.value });
                setShowSuggestions(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setShowSuggestions(false);
              }}
              placeholder="eggs, rice and spinach…"
              required
              className="min-h-12 min-w-0 flex-1 bg-transparent text-lg text-flour outline-none placeholder:text-ash"
            />
            {speech.supported && (
              <motion.button type="button" whileTap={{ scale: 0.9 }}
                aria-label={speech.listening ? "Stop listening" : "Say what you have"} aria-pressed={speech.listening}
                onClick={speech.listening ? speech.stop : speech.start} disabled={isAdding}
                className={`mb-1 flex size-11 shrink-0 items-center justify-center rounded-full ring-1 ${speech.listening ? "bg-cream/16 text-cream ring-cream motion-safe:animate-pulse" : "text-flour ring-flour/40 hover:ring-flour"} ${focusRing}`}>
                <Mic size={20} strokeWidth={2.2} aria-hidden="true" />
              </motion.button>
            )}
            <motion.button type="submit" aria-label="Add ingredient" whileTap={{ scale: 0.9 }} disabled={isAdding}
              className={`mb-1 flex size-11 shrink-0 items-center justify-center rounded-full bg-cream text-iron ${focusRing}`}>
              <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
            </motion.button>
          </div>
        </form>
        {speech.listening && (
          <p role="status" className="mt-2 font-mono text-[11px] tracking-[0.16em] text-cream">
            LISTENING… SAY WHAT YOU HAVE, E.G. “EGGS, RICE AND SPINACH”
          </p>
        )}
        {speech.supported && !speech.listening && !pending && !speech.error && (
          <p className="mt-2 text-[12px] text-ash">Type a list or tap the microphone. Your browser's speech service hears what you say.</p>
        )}
        {speech.error && <p role="alert" className="mt-2 text-[13px] text-flour">{speech.error}</p>}
        {pending ? (
          <IngredientConfirmList items={pending.items} alreadyHave={pending.alreadyHave} isAdding={isAdding}
            onRemove={(name) => setPending((value) => ({ ...value, items: value.items.filter((item) => item.name !== name) }))}
            onConfirm={confirmPending}
            onCancel={() => { setPending(null); ingredientInput.current?.focus(); }} />
        ) : (
          <IngredientSuggestions suggestions={suggestions} onSelect={selectSuggestion} />
        )}
      </section>

      <section aria-labelledby="kitchen-heading" className="mt-7 border-y-2 border-dashed border-flour/40 pt-3 pb-1.5">
        <div className="flex items-baseline justify-between font-mono text-[11px] tracking-[0.18em] text-ash">
          <h2 id="kitchen-heading">IN MY KITCHEN</h2>
          <span>{ingredients.length} {ingredients.length === 1 ? "ITEM" : "ITEMS"}</span>
        </div>

        {isLoading && <p role="status" className="py-3 font-mono text-xs text-ash">LOADING…</p>}
        {message && <p role="status" className="pt-2 font-mono text-xs text-ash">{message}</p>}

        <ul className="mt-1.5 grid grid-cols-2 gap-x-5 font-mono text-[14px] uppercase" aria-label="Ingredients in my kitchen">
          <AnimatePresence initial={false}>
            {ingredients.map((ingredient) => (
              <motion.li key={ingredient.id} layout {...chipMotion}
                className="flex min-h-11 items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <IngredientCategoryIcon name={ingredient.name} size={14} />
                  <span className="truncate">{ingredient.name}</span>
                </span>
                <motion.button
                  type="button"
                  aria-label={`Delete ${ingredient.name}`}
                  onClick={() => handleDelete(ingredient.id)}
                  whileTap={{ scale: 0.86 }}
                  className={`-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-ash hover:text-flour ${focusRing}`}
                >
                  <X size={16} strokeWidth={2} aria-hidden="true" />
                </motion.button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {!isLoading && !hasIngredients && (
          <p className="py-3 text-[15px] text-soft">Nothing here yet. Add what you have, or use quick add below.</p>
        )}
      </section>

      {visiblePopularIngredients.length > 0 && (
        <section aria-labelledby="quick-add-heading" className="mt-6 flex flex-col gap-2">
          <h2 id="quick-add-heading" className="font-mono text-[11px] tracking-[0.18em] text-ash">QUICK ADD</h2>
          <div className="flex flex-wrap gap-x-5">
            {visiblePopularIngredients.map((ingredient) => (
              <motion.button
                key={ingredient}
                type="button"
                onClick={() => addIngredientByName(ingredient)}
                whileTap={{ scale: 0.93 }}
                aria-label={`Add ${ingredient}`}
                className={`flex min-h-11 items-center gap-1.5 text-[15px] text-flour hover:text-cream ${focusRing}`}
              >
                <Spark size={9} className="text-cream" />
                {ingredient}
              </motion.button>
            ))}
          </div>
        </section>
      )}

      <div aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[5] mx-auto h-[calc(170px+env(safe-area-inset-bottom,0px))] max-w-[430px] bg-linear-to-t from-iron from-60% to-transparent" />
      <div className="fixed inset-x-6 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-10 mx-auto flex max-w-[382px] flex-col gap-1.5">
        {!hasIngredients && !isLoading && (
          <p id="find-dishes-hint" className="text-center font-mono text-[11px] tracking-[0.16em] text-ash">ADD AT LEAST ONE INGREDIENT</p>
        )}
        <motion.button
          type="button"
          onClick={onGenerateRecipes}
          disabled={!hasIngredients}
          aria-describedby={!hasIngredients ? "find-dishes-hint" : undefined}
          whileTap={{ scale: 0.97 }}
          className={`flex min-h-[58px] items-center justify-between rounded-full bg-cream px-6 text-lg font-semibold text-iron shadow-glow disabled:cursor-not-allowed disabled:bg-transparent disabled:text-ash disabled:shadow-none disabled:ring-1 disabled:ring-flour/40 ${focusRing}`}
        >
          Find tonight's dishes
          <ArrowRight size={22} strokeWidth={2.2} aria-hidden="true" />
        </motion.button>
      </div>
    </motion.main>
  );
}

export default IngredientsPage;

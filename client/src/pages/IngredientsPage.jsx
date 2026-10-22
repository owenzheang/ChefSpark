import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import IngredientCategoryIcon from "../components/IngredientCategoryIcon.jsx";
import IngredientSuggestions from "../components/IngredientSuggestions.jsx";
import { searchIngredients } from "../utils/ingredientSearch.js";
import { ArrowRight, LogOut, Plus, X } from "lucide-react";
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

// Small, alternating tilts give the chips a hand-placed sticker feel (DESIGN_SYSTEM.md).
const chipTilts = ["-rotate-2", "rotate-1", "rotate-0", "-rotate-1", "rotate-2", "rotate-0"];

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
  const ingredientInput = useRef(null);
  const suggestions = showSuggestions ? searchIngredients(form.name) : [];

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

  return (
    <motion.main data-ds="" {...pageMotion}
      className="min-h-screen bg-paper bg-halftone px-5 pt-7 pb-[calc(190px+env(safe-area-inset-bottom,0px))]">
      <header className="flex items-center justify-between">
        <span className="font-mono text-xs tracking-[0.14em]">CHEFSPARK · {weekday}</span>
        <button type="button" onClick={onLogout}
          className="flex min-h-11 items-center gap-1.5 rounded-full border-2 border-ink bg-card px-3.5 text-sm font-bold hover:bg-cobalt-tint focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
          <LogOut size={16} strokeWidth={2.2} aria-hidden="true" />
          Log out
        </button>
      </header>

      <h1 className="mt-5 font-display text-[50px] leading-[0.92] font-extrabold tracking-[-0.045em]">
        What's in<br />your fridge?
      </h1>

      <section className="mt-6" aria-label="Add an ingredient">
        <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
          <label htmlFor="ingredient-name" className="font-mono text-xs tracking-[0.12em] uppercase">Add an ingredient</label>
          <div className="flex gap-2">
            <input
              id="ingredient-name"
              type="text"
              ref={ingredientInput}
              aria-label="Ingredient name"
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
              placeholder="e.g. spinach"
              required
              className="min-h-13 min-w-0 flex-1 rounded-tile border-2 border-ink bg-card px-4 text-base font-medium placeholder:text-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
            />
            <motion.button type="submit" aria-label="Add ingredient" whileTap={{ scale: 0.9 }}
              className="flex size-13 shrink-0 items-center justify-center rounded-tile border-2 border-ink bg-ink text-paper hover:bg-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
              <Plus size={22} strokeWidth={2.5} aria-hidden="true" />
            </motion.button>
          </div>
        </form>
        <IngredientSuggestions suggestions={suggestions} onSelect={selectSuggestion} />
      </section>

      <section aria-labelledby="kitchen-heading"
        className="mt-6 flex flex-col gap-3 rounded-card border-2 border-ink bg-card p-4 shadow-hard">
        <div className="flex items-baseline justify-between">
          <h2 id="kitchen-heading" className="font-display text-[22px] font-extrabold">In my kitchen</h2>
          <span className="font-mono text-[13px]">{ingredients.length} {ingredients.length === 1 ? "ITEM" : "ITEMS"}</span>
        </div>

        {isLoading && <p role="status" className="font-mono text-xs text-muted">LOADING…</p>}
        {message && <p role="status" className="font-mono text-xs text-muted">{message}</p>}

        <ul className="flex flex-wrap gap-2" aria-label="Ingredients in my kitchen">
          <AnimatePresence initial={false}>
            {ingredients.map((ingredient, index) => (
              <motion.li key={ingredient.id} layout {...chipMotion}
                className={`flex min-h-11 items-center gap-1.5 rounded-full border-2 border-ink bg-cobalt-tint py-0.5 pr-0.5 pl-3 text-[15px] font-bold ${chipTilts[index % chipTilts.length]}`}>
                <IngredientCategoryIcon name={ingredient.name} size={16} />
                <span>{ingredient.name}</span>
                <motion.button
                  type="button"
                  aria-label={`Delete ${ingredient.name}`}
                  onClick={() => handleDelete(ingredient.id)}
                  whileTap={{ scale: 0.86 }}
                  className="flex size-9 items-center justify-center rounded-full hover:bg-card focus-visible:outline-3 focus-visible:outline-cobalt"
                >
                  <X size={16} strokeWidth={2.5} aria-hidden="true" />
                </motion.button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        {!isLoading && !hasIngredients && (
          <p className="text-[15px] text-muted">Nothing here yet. Add what you have, or tap a quick add below.</p>
        )}
      </section>

      {visiblePopularIngredients.length > 0 && (
        <section aria-labelledby="quick-add-heading" className="mt-6 flex flex-col gap-2.5">
          <h2 id="quick-add-heading" className="font-display text-xl font-extrabold">Quick add</h2>
          <div className="flex flex-wrap gap-2">
            {visiblePopularIngredients.map((ingredient) => (
              <motion.button
                key={ingredient}
                type="button"
                onClick={() => addIngredientByName(ingredient)}
                whileTap={{ scale: 0.93 }}
                aria-label={`Add ${ingredient}`}
                className="flex min-h-11 items-center gap-1.5 rounded-full border-2 border-dashed border-ink px-3.5 text-[15px] font-bold hover:border-solid hover:bg-card focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
              >
                <IngredientCategoryIcon name={ingredient} size={16} />
                {ingredient}
              </motion.button>
            ))}
          </div>
        </section>
      )}

      <div aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[5] mx-auto h-[calc(190px+env(safe-area-inset-bottom,0px))] max-w-[430px] bg-linear-to-t from-paper from-60% to-transparent" />
      <div className="fixed inset-x-4 bottom-[calc(92px+env(safe-area-inset-bottom,0px))] z-10 mx-auto flex max-w-[398px] flex-col gap-1.5">
        {!hasIngredients && !isLoading && (
          <p id="find-dishes-hint" className="text-center font-mono text-xs text-muted">ADD AT LEAST ONE INGREDIENT</p>
        )}
        <motion.button
          type="button"
          onClick={onGenerateRecipes}
          disabled={!hasIngredients}
          aria-describedby={!hasIngredients ? "find-dishes-hint" : undefined}
          whileTap={{ scale: 0.97 }}
          className="flex min-h-15 items-center justify-between rounded-full border-2 border-ink bg-tomato px-6 font-display text-xl font-extrabold text-ink shadow-hard-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt disabled:cursor-not-allowed disabled:bg-card disabled:shadow-none disabled:hover:translate-y-0"
        >
          Find tonight's dishes
          <ArrowRight size={24} strokeWidth={2.5} aria-hidden="true" />
        </motion.button>
      </div>
    </motion.main>
  );
}

export default IngredientsPage;

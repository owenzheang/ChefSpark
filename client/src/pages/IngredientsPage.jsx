import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import IngredientCategoryIcon from "../components/IngredientCategoryIcon.jsx";
import IngredientSuggestions from "../components/IngredientSuggestions.jsx";
import { searchIngredients } from "../utils/ingredientSearch.js";
import {
  ArrowRight,
  Bell,
  ChefHat,
  Leaf,
  Plus,
  Search,
  Sparkles,
  X
} from "lucide-react";
import {
  addIngredient,
  deleteIngredient,
  getIngredients,
  getSavedRecipes
} from "../services/api.js";

const hi = {emoji: "👋", label: "waving hand"};

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

function IngredientsPage({ onGenerateRecipes }) {
  const [ingredients, setIngredients] = useState([]);
  const [savedRecipeCount, setSavedRecipeCount] = useState(0);
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
    loadSavedRecipeCount();
  }, []);

  async function loadSavedRecipeCount() {
    try {
      const data = await getSavedRecipes();
      setSavedRecipeCount(data.length);
    } catch {
      setSavedRecipeCount(0);
    }
  }

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const ingredientNames = ingredients.map((ingredient) => ingredient.name);
  const visiblePopularIngredients = popularIngredients
    .filter((ingredient) => !ingredientNames.includes(ingredient))
    .slice(0, 8);

  return (
    <motion.main className="app-page ingredients-screen" {...pageMotion}>
      <div className="ingredients-bg-blob top" aria-hidden="true"></div>
      <div className="ingredients-bg-blob bottom" aria-hidden="true"></div>

      <motion.header
        className="ingredients-topbar"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
      >
        <div className="ingredients-logo" aria-hidden="true">
          <ChefHat size={18} strokeWidth={1.8} />
        </div>

        <div className="ingredients-greeting">
          <span>CHEFSPARK</span>
          <h1>{greeting}, Chef! {hi.emoji}</h1>
        </div>

        <motion.button
          className="notification-button"
          type="button"
          aria-label="Notifications"
          whileTap={{ scale: 0.92 }}
        >
          <Bell size={17} strokeWidth={1.8} aria-hidden="true" />
          <span></span>
        </motion.button>
      </motion.header>

      <motion.section
        className="ingredient-steps"
        aria-label="Recipe creation steps"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.34 }}
      >
        <div className="step-item active">
          <span>1</span>
          <strong>Ingredients</strong>
        </div>
        <div className="step-line"></div>
        <div className="step-item">
          <span>2</span>
          <strong>Generate</strong>
        </div>
      </motion.section>

      <motion.section
        className="ingredients-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.13, duration: 0.42 }}
      >
        <div className="hero-icon" aria-hidden="true">
          <Sparkles size={20} strokeWidth={1.8} />
        </div>
        <div>
          <h2>What's in your kitchen?</h2>
          <p>Add your ingredients and I'll find recipes</p>
        </div>
      </motion.section>

      <motion.section
        className="ingredients-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.42 }}
      >
        <div className="ingredients-card-title">
          <span className="leaf-icon" aria-hidden="true">
            <Leaf size={14} strokeWidth={2} />
          </span>
          <h2>My Ingredients</h2>
          <strong>{ingredients.length}</strong>
        </div>

        {isLoading && <p className="message">Loading ingredients...</p>}
        {message && <p className="message">{message}</p>}

        <ul className="ingredient-chip-list">
          <AnimatePresence initial={false}>
            {ingredients.map((ingredient) => (
              <motion.li key={ingredient.id} layout {...chipMotion}>
                <IngredientCategoryIcon name={ingredient.name} />
                <span>{ingredient.name}</span>
                <motion.button
                  type="button"
                  aria-label={`Delete ${ingredient.name}`}
                  onClick={() => handleDelete(ingredient.id)}
                  whileTap={{ scale: 0.86 }}
                >
                  <X size={9} strokeWidth={2.5} aria-hidden="true" />
                </motion.button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <AnimatePresence>
          {!isLoading && ingredients.length === 0 && (
            <motion.p
              className="empty-state ingredients-empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              No ingredients yet.
            </motion.p>
          )}
        </AnimatePresence>

        <motion.form className="ingredient-search-form" onSubmit={handleSubmit} layout>
          <Search size={15} strokeWidth={1.8} aria-hidden="true" />
          <input
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
            placeholder="Search or type an ingredient..."
            required
          />
          <motion.button type="submit" aria-label="Add ingredient" whileTap={{ scale: 0.9 }}>
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
          </motion.button>
        </motion.form>
        <IngredientSuggestions suggestions={suggestions} onSelect={selectSuggestion} />
      </motion.section>

      <motion.section
        className="popular-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.36 }}
      >
        <h2>Popular</h2>
        <div className="popular-chip-list">
          {visiblePopularIngredients.map((ingredient) => (
            <motion.button
              key={ingredient}
              type="button"
              onClick={() => addIngredientByName(ingredient)}
              whileTap={{ scale: 0.93 }}
            >
              <IngredientCategoryIcon name={ingredient} />
              {ingredient}
            </motion.button>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="ingredient-stats"
        aria-label="Kitchen statistics"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.36 }}
      >
        <motion.article whileTap={{ scale: 0.98 }}>
          <strong>{savedRecipeCount}</strong>
          <span>Recipes saved</span>
        </motion.article>
        <motion.article whileTap={{ scale: 0.98 }}>
          <strong>{ingredients.length}</strong>
          <span>Ingredients</span>
        </motion.article>
      </motion.section>

      <motion.button
        className="choose-cuisine-button"
        type="button"
        onClick={onGenerateRecipes}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.36 }}
      >
        Choose Cuisine
        <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
      </motion.button>
    </motion.main>
  );
}

export default IngredientsPage;

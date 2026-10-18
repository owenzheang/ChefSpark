import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ChefHat,
  Check,
  ChevronDown,
  Leaf,
  Sparkles,
  Utensils,
  X
} from "lucide-react";
import { generateRecipes, getIngredients, saveRecipe } from "../services/api.js";

import { useRef } from "react";
import RecipePreviewCard from "../components/RecipePreviewCard.jsx";

const pageMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] }
};

const cardMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.28 }
};

const cuisineOptions = [
  {
    name: "Chinese",
    emoji: "🥢",
    description: "Stir-fries, dumplings & more"
  },
  {
    name: "Western",
    emoji: "🍝",
    description: "Pasta, burgers & roasts"
  }
];

function RecipeGenerationPage({ onBack, onViewRecipe, recipes, setRecipes, cuisine, setCuisine, difficulty, setDifficulty }) {
  const [ingredients, setIngredients] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savingTitle, setSavingTitle] = useState("");

  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    async function loadIngredients() {
      try {
        const data = await getIngredients();
        setIngredients(data);
      } catch (error) {
        setMessage(error.message);
      }
    }

    loadIngredients();
    return () => { isMounted.current = false; };
  }, []);

  async function handleGenerate() {
    setMessage("");
    setRecipes([]);
    setIsLoading(true);

    try {
      const data = await generateRecipes({ cuisine, difficulty });
      if (isMounted.current) setRecipes(data.recipes);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(recipe) {
    setMessage("");
    setSavingTitle(recipe.title);

    try {
      await saveRecipe(recipe);
      setMessage(`Saved ${recipe.title}.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSavingTitle("");
    }
  }

  return (
    <motion.main className="app-page generate-screen" {...pageMotion}>
      <motion.header
        className="generate-topbar"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
      >
        <motion.button
          className="generate-back-button"
          type="button"
          aria-label="Back"
          onClick={onBack}
          whileTap={{ scale: 0.92 }}
        >
          <ArrowLeft size={24} strokeWidth={1.9} aria-hidden="true" />
        </motion.button>

        <div className="generate-title">
          <span>CHEFSPARK</span>
          <h1>Generate Recipes</h1>
        </div>

        <div className="generate-logo" aria-hidden="true">
          <ChefHat size={22} strokeWidth={1.8} />
        </div>
      </motion.header>

      <motion.section
        className="generate-steps"
        aria-label="Recipe generation steps"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.34 }}
      >
        <div className="generate-step complete">
          <span><Check size={16} strokeWidth={2.4} aria-hidden="true" /></span>
          <strong>Ingredients</strong>
        </div>
        <div className="generate-step-line"></div>
        <div className="generate-step active">
          <span>2</span>
          <strong>Generate</strong>
        </div>
      </motion.section>

      <motion.section className="generate-ingredients-card" {...cardMotion}>
        <div className="generate-card-heading">
          <span className="generate-leaf-icon" aria-hidden="true">
            <Leaf size={18} strokeWidth={1.8} />
          </span>
          <h2>Your ingredients</h2>
          <strong>{ingredients.length} items</strong>
        </div>

        {ingredients.length === 0 ? (
          <p className="empty-state">No ingredients yet.</p>
        ) : (
          <ul className="generate-ingredient-chips">
            {ingredients.map((ingredient) => (
              <motion.li
                key={ingredient.id}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18 }}
              >
                {ingredient.name}
              </motion.li>
            ))}
          </ul>
        )}
      </motion.section>

      <motion.section
        className="cuisine-card"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.42 }}
      >
        <div className="cuisine-card-title">
          <span aria-hidden="true"><Utensils size={18} strokeWidth={1.9} /></span>
          <div>
            <h2>Cuisine Style</h2>
            <p>Pick one cuisine style</p>
          </div>
        </div>

        <div className="cuisine-options">
          {cuisineOptions.map((option) => {
            const isSelected = cuisine === option.name;

            return (
              <motion.button
                key={option.name}
                type="button"
                className={isSelected ? "cuisine-option selected" : "cuisine-option"}
                onClick={() => setCuisine(option.name)}
                whileTap={{ scale: 0.97 }}
              >
                <span className="cuisine-icon" aria-hidden="true">{option.emoji}</span>
                <span>
                  <strong>{option.name}</strong>
                  <small>{option.description}</small>
                </span>
                <span className="cuisine-check">
                  {isSelected ? (
                    <Check size={16} strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    <X size={14} strokeWidth={2.4} aria-hidden="true" />
                  )}
                </span>
              </motion.button>
            );
          })}
        </div>

        <label className="difficulty-control">
          <span>Difficulty</span>
          <div className="difficulty-select-shell">
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
            <ChevronDown size={18} strokeWidth={2.2} aria-hidden="true" />
          </div>
        </label>

        <p className="selected-cuisine-count">1 cuisine selected</p>
      </motion.section>

      <motion.button
        className="generate-recipes-button"
        type="button"
        onClick={handleGenerate}
        disabled={isLoading || ingredients.length === 0}
        whileTap={{ scale: 0.97 }}
      >
        <Sparkles size={24} strokeWidth={1.9} aria-hidden="true" />
        {isLoading ? "Generating..." : "Generate Recipes"}
      </motion.button>

      {ingredients.length === 0 && (
        <p className="message">Add ingredients before generating recipes.</p>
      )}
      {message && <p className="message">{message}</p>}

      <AnimatePresence>
        {recipes.length > 0 && (
          <motion.section
            className="recipe-results generate-results"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h2>Recommended Recipes</h2>
            <div className="recipe-grid">
              {recipes.map((recipe, index) => (
                <RecipePreviewCard
                  key={`${recipe.title}-${index}`}
                  recipe={recipe}
                  onViewRecipe={onViewRecipe}
                  onSave={handleSave}
                  isSaving={savingTitle === recipe.title}
                />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.main>
  );
}

export default RecipeGenerationPage;

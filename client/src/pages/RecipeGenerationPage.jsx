import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { generateRecipes, getIngredients, saveRecipe } from "../services/api.js";
import RecipePreviewCard from "../components/RecipePreviewCard.jsx";
import GenerationProgress from "../components/GenerationProgress.jsx";

const pageMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] }
};

// The backend currently accepts exactly these two cuisines (see recipeController).
const cuisineOptions = [
  { name: "Chinese", description: "Stir-fries, noodles, rice dishes" },
  { name: "Western", description: "Pasta, bakes, salads" }
];

const difficultyOptions = ["Easy", "Medium", "Hard"];

const focusRing = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt";

function RecipeGenerationPage({ onBack, onViewRecipe, recipes, setRecipes, cuisine, setCuisine, difficulty, setDifficulty }) {
  const [ingredients, setIngredients] = useState([]);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingTitle, setSavingTitle] = useState("");
  const isMounted = useRef(false);
  const request = useRef(null);
  const resultsHeading = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    async function loadIngredients() {
      try {
        const data = await getIngredients();
        setIngredients(data);
      } catch (error) {
        setMessage({ tone: "error", text: error.message });
      }
    }

    loadIngredients();
    return () => {
      isMounted.current = false;
      request.current?.abort(); // Leaving the page cancels an unfinished generation.
    };
  }, []);

  async function handleGenerate() {
    const controller = new AbortController();
    request.current = controller;
    setMessage(null);
    setRecipes([]);
    setIsLoading(true);

    try {
      const data = await generateRecipes({ cuisine, difficulty }, { signal: controller.signal });
      if (!isMounted.current) return;
      if (!data.recipes?.length) {
        setMessage({ tone: "error", text: "No dishes came back this time. Please try again." });
        return;
      }
      setRecipes(data.recipes);
      requestAnimationFrame(() => resultsHeading.current?.focus());
    } catch (error) {
      if (!isMounted.current) return;
      setMessage(error.name === "AbortError"
        ? { tone: "info", text: "Cancelled. Change your choices or try again." }
        : { tone: "error", text: error.message });
    } finally {
      if (request.current === controller) request.current = null;
      if (isMounted.current) setIsLoading(false);
    }
  }

  function handleCancel() {
    request.current?.abort();
  }

  async function handleSave(recipe) {
    setMessage(null);
    setSavingTitle(recipe.title);

    try {
      await saveRecipe(recipe);
      setMessage({ tone: "info", text: `Saved ${recipe.title} to your shelf.` });
    } catch (error) {
      setMessage({ tone: "error", text: error.message });
    } finally {
      setSavingTitle("");
    }
  }

  const hasIngredients = ingredients.length > 0;

  return (
    <motion.main data-ds="" {...pageMotion}
      className="min-h-screen bg-paper bg-halftone px-5 pt-6 pb-[calc(110px+env(safe-area-inset-bottom,0px))]">
      <header className="flex items-center gap-3">
        <motion.button type="button" aria-label="Back to kitchen" onClick={onBack} whileTap={{ scale: 0.92 }}
          className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-card hover:bg-cobalt-tint ${focusRing}`}>
          <ArrowLeft size={20} strokeWidth={2.4} aria-hidden="true" />
        </motion.button>
        <span className="font-mono text-xs tracking-[0.14em]">
          STEP 2 OF 2 · {ingredients.length} {ingredients.length === 1 ? "INGREDIENT" : "INGREDIENTS"}
        </span>
      </header>

      <h1 className="mt-5 font-display text-[46px] leading-[0.92] font-extrabold tracking-[-0.045em]">Plan<br />tonight.</h1>

      {hasIngredients ? (
        <p className="mt-3 text-[15px] text-muted">
          Using {ingredients.slice(0, 4).map((item) => item.name).join(", ")}
          {ingredients.length > 4 ? ` and ${ingredients.length - 4} more` : ""}.
        </p>
      ) : (
        <p className="mt-3 rounded-tile border-2 border-ink bg-tomato-tint px-3.5 py-2.5 text-[15px]">
          Add ingredients in your kitchen first.
        </p>
      )}

      <fieldset className="mt-6 flex flex-col gap-2.5" disabled={isLoading}>
        <legend className="mb-2.5 font-display text-xl font-extrabold">Cuisine</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {cuisineOptions.map((option) => {
            const selected = cuisine === option.name;
            return (
              <motion.button key={option.name} type="button" aria-pressed={selected} onClick={() => setCuisine(option.name)}
                whileTap={{ scale: 0.97 }}
                className={`flex min-h-20 flex-col items-start justify-center gap-0.5 rounded-tile border-2 border-ink px-3.5 py-2.5 text-left disabled:opacity-60 ${selected ? "bg-tomato shadow-hard-sm" : "bg-card hover:bg-cobalt-tint"} ${focusRing}`}>
                <span className="text-base font-bold">{option.name}</span>
                <span className="text-[13px] leading-tight">{option.description}</span>
              </motion.button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5" disabled={isLoading}>
        <legend className="mb-2.5 font-display text-xl font-extrabold">How hard?</legend>
        <div className="grid grid-cols-3 gap-1 rounded-full border-2 border-ink bg-card p-1">
          {difficultyOptions.map((option) => {
            const selected = difficulty === option;
            return (
              <button key={option} type="button" aria-pressed={selected} onClick={() => setDifficulty(option)}
                className={`min-h-11 rounded-full text-[15px] font-bold disabled:opacity-60 ${selected ? "bg-ink text-paper hover:bg-ink" : "hover:bg-cobalt-tint"} ${focusRing}`}>
                {option}
              </button>
            );
          })}
        </div>
      </fieldset>

      <motion.button type="button" onClick={handleGenerate} disabled={isLoading || !hasIngredients} whileTap={{ scale: 0.97 }}
        className={`mt-6 flex min-h-15 w-full items-center justify-between rounded-full border-2 border-ink bg-tomato px-6 font-display text-xl font-extrabold text-ink shadow-hard-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 ${isLoading ? "" : "disabled:bg-card"} ${focusRing}`}>
        {isLoading ? "Cooking up 3 dishes…" : recipes.length ? "Try 3 new dishes" : "Cook up 3 dishes"}
        <Sparkles size={24} strokeWidth={2.4} aria-hidden="true" className={isLoading ? "motion-safe:animate-spin" : ""} />
      </motion.button>

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"}
          className={`mt-4 rounded-tile border-2 border-ink px-3.5 py-2.5 text-[15px] ${message.tone === "error" ? "bg-tomato-tint" : "bg-card"}`}>
          {message.text}
        </p>
      )}

      <div className="mt-6">
        {isLoading && (
          <GenerationProgress ingredientCount={ingredients.length} cuisine={cuisine} onCancel={handleCancel} />
        )}

        <AnimatePresence>
          {!isLoading && recipes.length > 0 && (
            <motion.section aria-labelledby="results-heading" className="flex flex-col gap-4"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <h2 id="results-heading" ref={resultsHeading} tabIndex={-1}
                className="font-display text-[32px] leading-none font-extrabold tracking-[-0.03em] focus:outline-none">
                {recipes.length} dishes for tonight
              </h2>
              {recipes.map((recipe, index) => (
                <RecipePreviewCard
                  key={`${recipe.title}-${index}`}
                  index={index}
                  recipe={recipe}
                  onViewRecipe={onViewRecipe}
                  onSave={handleSave}
                  isSaving={savingTitle === recipe.title}
                />
              ))}
              <p className="text-[13px] text-muted">Covers show the dish name. Every ingredient, amount and step comes from the recipe itself.</p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}

export default RecipeGenerationPage;

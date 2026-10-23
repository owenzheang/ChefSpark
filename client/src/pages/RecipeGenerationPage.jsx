import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { generateRecipes, getIngredients, saveRecipe } from "../services/api.js";
import RecipePreviewCard from "../components/RecipePreviewCard.jsx";
import GenerationProgress from "../components/GenerationProgress.jsx";
import Spark from "../components/Spark.jsx";
import Burners from "../components/Burners.jsx";

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

// Must match the server's allowedDiets (server/src/utils/dietRules.js).
const dietOptions = ["Any", "Vegetarian", "Vegan"];
const dietNotes = {
  Vegetarian: "No meat or fish. Eggs and dairy are fine.",
  Vegan: "No meat, fish, eggs, dairy or honey."
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

function RecipeGenerationPage({ onBack, onViewRecipe, recipes, setRecipes, cuisine, setCuisine, difficulty, setDifficulty, diet = "Any", setDiet = () => {} }) {
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
      const data = await generateRecipes({ cuisine, difficulty, diet }, { signal: controller.signal });
      if (!isMounted.current) return;
      if (!data.recipes?.length) {
        setMessage({ tone: "error", text: "No dishes came back this time. Please try again." });
        return;
      }
      setRecipes(data.recipes);
      if (data.droppedForDiet > 0) {
        const count = data.droppedForDiet === 1 ? "1 dish" : `${data.droppedForDiet} dishes`;
        setMessage({ tone: "info", text: `Left out ${count} that wasn't ${diet.toLowerCase()}.` });
      }
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
      className="min-h-screen bg-iron bg-ember-glow px-6 pt-4 pb-[calc(110px+env(safe-area-inset-bottom,0px))]">
      <header className="flex items-center justify-between">
        <motion.button type="button" onClick={onBack} whileTap={{ scale: 0.95 }} aria-label="Back to kitchen"
          className={`min-h-11 px-1 font-mono text-[11px] tracking-[0.18em] text-ash hover:text-flour ${focusRing}`}>
          ← KITCHEN
        </motion.button>
        <span className="font-mono text-[11px] tracking-[0.18em] text-ash">
          STEP 2 OF 2 · {ingredients.length} {ingredients.length === 1 ? "INGREDIENT" : "INGREDIENTS"}
        </span>
      </header>

      <h1 className="mt-8 font-display text-[56px] leading-[0.95] tracking-[-0.01em] italic">Plan tonight.</h1>

      {hasIngredients ? (
        <p className="mt-3 text-[15px] text-soft">
          Using {ingredients.slice(0, 4).map((item) => item.name).join(", ")}
          {ingredients.length > 4 ? ` and ${ingredients.length - 4} more` : ""}.
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-[15px] text-flour">
          <Spark size={12} className="text-cream" />
          Add ingredients in your kitchen first.
        </p>
      )}

      <fieldset className="mt-9" disabled={isLoading}>
        <legend className="mb-3 font-mono text-[11px] tracking-[0.2em] text-ash">CUISINE</legend>
        <div className="grid grid-cols-2 gap-3">
          {cuisineOptions.map((option) => {
            const selected = cuisine === option.name;
            return (
              <motion.button key={option.name} type="button" aria-pressed={selected} onClick={() => setCuisine(option.name)}
                whileTap={{ scale: 0.97 }}
                className={`flex min-h-20 flex-col items-start justify-center gap-0.5 rounded-[20px] px-4 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "bg-cream text-iron" : "text-flour ring-1 ring-flour/40 hover:ring-flour"} ${focusRing}`}>
                <span className="font-display text-[26px] leading-none italic">{option.name}</span>
                <span className={`text-[13px] leading-tight ${selected ? "text-iron/80" : "text-ash"}`}>{option.description}</span>
              </motion.button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-7" disabled={isLoading}>
        <legend className="mb-3 font-mono text-[11px] tracking-[0.2em] text-ash">HOW HARD</legend>
        <div className="grid grid-cols-3 gap-2">
          {difficultyOptions.map((option) => {
            const selected = difficulty === option;
            return (
              <button key={option} type="button" aria-pressed={selected} onClick={() => setDifficulty(option)}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-full text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "bg-cream text-iron" : "text-flour ring-1 ring-flour/40 hover:ring-flour"} ${focusRing}`}>
                <Burners difficulty={option} size={7} onCream={selected} />
                {option}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-7" disabled={isLoading}>
        <legend className="mb-3 font-mono text-[11px] tracking-[0.2em] text-ash">DIET</legend>
        <div className="grid grid-cols-3 gap-2">
          {dietOptions.map((option) => {
            const selected = diet === option;
            return (
              <button key={option} type="button" aria-pressed={selected} onClick={() => setDiet(option)}
                className={`flex min-h-12 items-center justify-center rounded-full text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "bg-cream text-iron" : "text-flour ring-1 ring-flour/40 hover:ring-flour"} ${focusRing}`}>
                {option}
              </button>
            );
          })}
        </div>
        {dietNotes[diet] && (
          <p className="mt-3 text-[13px] leading-snug text-ash">
            {dietNotes[diet]} ChefSpark checks every ingredient, but check labels on packaged sauces and cheese.
          </p>
        )}
      </fieldset>

      <motion.button type="button" onClick={handleGenerate} disabled={isLoading || !hasIngredients} whileTap={{ scale: 0.97 }}
        className={`mt-9 flex min-h-[58px] w-full items-center justify-between rounded-full bg-cream px-6 text-lg font-semibold text-iron shadow-glow disabled:cursor-not-allowed ${isLoading ? "disabled:opacity-70" : "disabled:bg-transparent disabled:text-ash disabled:shadow-none disabled:ring-1 disabled:ring-flour/40"} ${focusRing}`}>
        {isLoading ? "Cooking up 3 dishes…" : recipes.length ? "Try 3 new dishes" : "Cook up 3 dishes"}
        <Spark size={20} className={isLoading ? "motion-safe:animate-spin" : ""} />
      </motion.button>

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className="mt-5 flex items-start gap-2 text-[15px] text-flour">
          <Spark size={12} className="mt-1 text-cream" />
          {message.text}
        </p>
      )}

      <div className="mt-10">
        {isLoading && (
          <GenerationProgress ingredientCount={ingredients.length} cuisine={cuisine} onCancel={handleCancel} />
        )}

        <AnimatePresence>
          {!isLoading && recipes.length > 0 && (
            <motion.section aria-labelledby="results-heading" className="flex flex-col items-center gap-10 text-center"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex flex-col items-center gap-2">
                <span className="font-mono text-[11px] tracking-[0.3em] text-ash">FROM YOUR KITCHEN</span>
                <h2 id="results-heading" ref={resultsHeading} tabIndex={-1}
                  className="font-display text-[50px] leading-none italic focus:outline-none">
                  Tonight's menu
                </h2>
                <p className="sr-only">{recipes.length} dishes for tonight</p>
              </div>
              {recipes.map((recipe, index) => (
                <div key={`${recipe.title}-${index}`} className="flex w-full flex-col items-center gap-10">
                  {index > 0 && (
                    <div aria-hidden="true" className="flex w-full items-center gap-3.5">
                      <span className="h-px flex-1 bg-flour/16" /><Spark size={11} className="text-cream" /><span className="h-px flex-1 bg-flour/16" />
                    </div>
                  )}
                  <RecipePreviewCard
                    index={index}
                    recipe={recipe}
                    onViewRecipe={onViewRecipe}
                    onSave={handleSave}
                    isSaving={savingTitle === recipe.title}
                  />
                </div>
              ))}
              <p className="text-[13px] text-ash">Every ingredient, amount and step comes from the recipe itself.</p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}

export default RecipeGenerationPage;

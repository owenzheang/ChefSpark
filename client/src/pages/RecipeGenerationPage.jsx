import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getIngredients, requestFoodImage, saveRecipe } from "../services/api.js";
import RecipePreviewCard from "../components/RecipePreviewCard.jsx";
import GenerationProgress from "../components/GenerationProgress.jsx";
import Spark from "../components/Spark.jsx";
import Burners from "../components/Burners.jsx";
import { useSessionState } from "../utils/sessionState.js";

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

// Pictures follow the menu instead of holding it up. Each one lands on the dish with that title while it
// still has no picture (a small adjustment keeps the title); if it fails, the empty plate stays. They are
// not cancelled when the page closes: the server has already paid for them and keeps them in its library.
export function addMenuPictures(recipes, setRecipes, request = requestFoodImage) {
  for (const recipe of recipes) {
    request(recipe, "menu")
      .then(({ imageUrl }) => setRecipes((list) => list.map((item) =>
        item.title === recipe.title && !item.imageUrl ? { ...item, imageUrl } : item)))
      .catch(() => {});
  }
}

const idleGeneration = { running: false, startedAt: 0, cuisine: "", message: null,
  generate: async () => [], cancel() {}, setMessage() {} };

// generation comes from the app shell (useMenuGeneration), so it keeps running if the cook leaves this page.
function RecipeGenerationPage({ onBack, onViewRecipe, recipes, generation = idleGeneration, cuisine, setCuisine, difficulty, setDifficulty, diet = "Any", setDiet = () => {} }) {
  const [ingredients, setIngredients] = useState(null); // null until loaded
  const isLoading = generation.running;
  const message = generation.message;
  const setMessage = generation.setMessage;
  // Per dish title: "saving" or "error" for this visit; "saved" is kept for the tab so returning to the
  // menu still shows "Saved" instead of offering a second copy.
  const [saveStates, setSaveStates] = useState({});
  const [savedTitles, setSavedTitles] = useSessionState("chefspark:tonight:saved", []);
  const isMounted = useRef(false);
  const resultsHeading = useRef(null);
  const progress = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    async function loadIngredients() {
      try {
        const data = await getIngredients();
        if (isMounted.current) setIngredients(data);
      } catch (error) {
        if (isMounted.current) { setIngredients([]); setMessage({ tone: "error", text: error.message }); }
      }
    }

    loadIngredients();
    return () => {
      isMounted.current = false; // leaving does not cancel: the generation belongs to the app shell
    };
  }, []);

  async function handleGenerate() {
    setSavedTitles([]);
    setSaveStates({});
    // On a phone the progress appears below the button, out of sight: bring its heading to the top of the
    // screen (the block is taller than a phone, so centring it would hide the heading). Runs after render.
    setTimeout(() => progress.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    }), 0);

    const dishes = await generation.generate({ cuisine, difficulty, diet });
    if (isMounted.current && dishes.length) requestAnimationFrame(() => resultsHeading.current?.focus());
  }

  function handleCancel() {
    generation.cancel();
  }

  // The result shows on the dish's own Save button (the page message is usually scrolled out of view).
  async function handleSave(recipe) {
    const title = recipe.title;
    setSaveStates((states) => ({ ...states, [title]: "saving" }));

    try {
      await saveRecipe(recipe);
      setSavedTitles((titles) => titles.includes(title) ? titles : [...titles, title]);
      setSaveStates((states) => ({ ...states, [title]: undefined }));
    } catch {
      setSaveStates((states) => ({ ...states, [title]: "error" }));
    }
  }

  const ingredientsLoaded = ingredients !== null;
  const hasIngredients = ingredientsLoaded && ingredients.length > 0;
  const ingredientList = ingredients || [];

  return (
    <motion.main data-ds="" {...pageMotion}
      className="min-h-screen bg-iron bg-ember-glow px-6 pt-4 pb-[calc(110px+env(safe-area-inset-bottom,0px))] lg:mx-auto lg:grid lg:max-w-[1240px] lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-16 lg:px-12 lg:pt-12 lg:pb-16">
      {/* Desktop (DESIGN_SYSTEM.md): choices stay in view on the left, the menu fills the right. */}
      <div className="lg:sticky lg:top-10">
      <header className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-1">
        <motion.button type="button" onClick={onBack} whileTap={{ scale: 0.95 }} aria-label="Back to kitchen"
          className={`min-h-11 px-1 font-mono text-[11px] tracking-[0.18em] text-ash hover:text-flour ${focusRing}`}>
          ← KITCHEN
        </motion.button>
        <span className="font-mono text-[11px] tracking-[0.18em] text-ash">
          STEP 2 OF 2{ingredientsLoaded && ` · ${ingredientList.length} ${ingredientList.length === 1 ? "INGREDIENT" : "INGREDIENTS"}`}
        </span>
      </header>

      <h1 className="mt-8 font-display text-[56px] leading-[0.95] tracking-[-0.01em] italic">Plan tonight.</h1>

      {/* While the kitchen loads, say so; "add ingredients first" only once we know it's empty. */}
      {!ingredientsLoaded ? (
        <p role="status" className="mt-3 text-[15px] text-ash">Checking your kitchen…</p>
      ) : hasIngredients ? (
        <p className="mt-3 text-[15px] text-soft">
          Using {ingredientList.slice(0, 4).map((item) => item.name).join(", ")}
          {ingredientList.length > 4 ? ` and ${ingredientList.length - 4} more` : ""}.
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
      </div>

      <div className="mt-10 lg:mt-0">
        {!isLoading && recipes.length === 0 && (
          <p className="hidden pt-24 text-center font-display text-[32px] text-ash italic lg:block">Tonight's menu will appear here.</p>
        )}
        {isLoading && (
          <div ref={progress} className="scroll-mt-[calc(16px+env(safe-area-inset-top,0px))]">
            <GenerationProgress ingredientCount={ingredientList.length} cuisine={generation.cuisine || cuisine} onCancel={handleCancel}
              initialSeconds={Math.max(0, Math.floor((Date.now() - generation.startedAt) / 1000))} />
          </div>
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
              <div className="flex w-full flex-col items-center gap-10 lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-10">
              {recipes.map((recipe, index) => (
                <div key={`${recipe.title}-${index}`} className="flex w-full flex-col items-center gap-10 lg:h-full">
                  {index > 0 && (
                    <div aria-hidden="true" className="flex w-full items-center gap-3.5 lg:hidden">
                      <span className="h-px flex-1 bg-flour/16" /><Spark size={11} className="text-cream" /><span className="h-px flex-1 bg-flour/16" />
                    </div>
                  )}
                  <RecipePreviewCard
                    index={index}
                    recipe={recipe}
                    onViewRecipe={onViewRecipe}
                    onSave={handleSave}
                    saveState={savedTitles.includes(recipe.title) ? "saved" : saveStates[recipe.title]}
                  />
                </div>
              ))}
              </div>
              <p className="text-[13px] text-ash">Every ingredient, amount and step comes from the recipe itself.</p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}

export default RecipeGenerationPage;

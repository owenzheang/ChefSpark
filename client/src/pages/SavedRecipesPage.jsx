import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { deleteSavedRecipe, foodImageSrc, getSavedRecipes } from "../services/api.js";
import Burners from "../components/Burners.jsx";
import PlateRing from "../components/PlateRing.jsx";
import Spark from "../components/Spark.jsx";

const pageMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94] }
};

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

export function formatSavedDate(savedAt, now = new Date()) {
  const savedDate = new Date(savedAt);

  if (Number.isNaN(savedDate.getTime())) {
    return "Saved recently";
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfSavedDate = new Date(savedDate.getFullYear(), savedDate.getMonth(), savedDate.getDate());
  const dayDifference = Math.round((startOfToday - startOfSavedDate) / 86400000);

  if (dayDifference === 0) return "today";
  if (dayDifference > 0 && dayDifference < 7) return `${dayDifference}d ago`;

  return savedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCookTime(cookTime) {
  return typeof cookTime === "string" ? cookTime.replace(/\bminutes?\b/i, "min") : "";
}

function SavedRecipesPage({ onViewRecipe, onCook }) {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  async function loadSavedRecipes() {
    setIsLoading(true);

    try {
      const data = await getSavedRecipes();
      setSavedRecipes(data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }

  useEffect(() => {
    loadSavedRecipes();
  }, []);

  async function handleDelete(id) {
    setMessage("");
    setConfirmingId(null);

    try {
      await deleteSavedRecipe(id);
      setSavedRecipes((current) => current.filter((item) => item.id !== id));
      setMessage("Removed from your shelf.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  const count = savedRecipes.length;

  return (
    <motion.main data-ds="" {...pageMotion}
      className="min-h-screen bg-iron bg-ember-glow px-6 pt-5 pb-[calc(110px+env(safe-area-inset-bottom,0px))] lg:mx-auto lg:max-w-[1120px] lg:px-10 lg:pt-10 lg:pb-16">
      <header className="flex items-center justify-between">
        {/* On desktop the rail shows the name; the count stays. */}
        <span className="flex items-center gap-2 font-display text-2xl italic lg:invisible">
          <Spark size={16} className="text-cream" />
          ChefSpark
        </span>
        <span className="font-mono text-[11px] tracking-[0.18em] text-ash">
          {count} {count === 1 ? "RECIPE" : "RECIPES"} SAVED
        </span>
      </header>

      <h1 className="mt-8 font-display text-[56px] leading-[0.95] tracking-[-0.01em] italic">Your shelf</h1>

      {isLoading && !hasLoaded && <p role="status" className="mt-6 font-mono text-xs tracking-[0.16em] text-ash">LOADING…</p>}
      {message && (
        <p role="status" className="mt-5 flex items-center gap-2 text-[15px] text-flour">
          <Spark size={11} className="text-cream" />
          {message}
        </p>
      )}

      {hasLoaded && count === 0 && (
        <section className="mt-10 flex flex-col items-start gap-4 border-t border-flour/16 pt-8">
          <p className="font-display text-[30px] leading-tight italic">Nothing on the shelf yet.</p>
          <p className="text-[15px] text-soft">Save a dish from tonight's menu and it will wait for you here.</p>
          {onCook && (
            <button type="button" onClick={onCook}
              className={`min-h-11 border-b border-cream font-semibold text-flour hover:text-cream ${focusRing}`}>
              Plan tonight →
            </button>
          )}
        </section>
      )}

      {count > 0 && (
        // Desktop: the same rows in a three-column grid, a hairline under each (no cards).
        <ul className="mt-8 border-t border-flour/16 lg:grid lg:grid-cols-3 lg:gap-x-10 lg:border-t-0" aria-label="Saved recipes">
          <AnimatePresence initial={false}>
            {savedRecipes.map((savedRecipe) => {
              const recipe = savedRecipe.recipe || {};
              const hasScore = Number.isFinite(recipe.matchScore);
              const imageSrc = foodImageSrc(recipe.imageUrl);
              const confirming = confirmingId === savedRecipe.id;
              return (
                <motion.li key={savedRecipe.id} layout
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                  className="border-b border-flour/16 py-4">
                  <button type="button" onClick={() => onViewRecipe(savedRecipe.id)} aria-label={`Open ${recipe.title}`}
                    className={`flex w-full items-center gap-4 text-left ${focusRing}`}>
                    <PlateRing percent={hasScore ? recipe.matchScore : null} size={64} stroke={2.5} decorative imageSrc={imageSrc}>
                      {imageSrc ? null : hasScore
                        ? <span className="font-display text-lg leading-none italic">{recipe.matchScore}%</span>
                        : <Spark size={14} className="text-cream" />}
                    </PlateRing>
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="font-display text-[26px] leading-none italic lg:text-[22px]">{recipe.title}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] tracking-[0.12em] text-ash uppercase">
                        {recipe.difficulty && <><Burners difficulty={recipe.difficulty} size={7} /><span>{recipe.difficulty}</span></>}
                        {recipe.cuisine && <><span aria-hidden="true">·</span><span>{recipe.cuisine}</span></>}
                        {recipe.diet && <><span aria-hidden="true">·</span><span>{recipe.diet}</span></>}
                        {recipe.cookTime && <><span aria-hidden="true">·</span><span>{formatCookTime(recipe.cookTime)}</span></>}
                        <span aria-hidden="true">·</span><span>{formatSavedDate(savedRecipe.savedAt)}</span>
                        {/* With a picture on the plate, the score moves beside it. */}
                        {imageSrc && hasScore && <><span aria-hidden="true">·</span><span>{recipe.matchScore}% match</span></>}
                        {imageSrc && <><span aria-hidden="true">·</span><span>AI image</span></>}
                      </span>
                    </span>
                  </button>
                  <div className="mt-2 flex justify-end gap-4 text-sm">
                    {confirming ? (
                      <>
                        <span className="self-center text-soft">Remove from your shelf?</span>
                        <button type="button" onClick={() => setConfirmingId(null)}
                          className={`min-h-11 px-1 text-ash hover:text-flour ${focusRing}`}>Keep</button>
                        <button type="button" onClick={() => handleDelete(savedRecipe.id)} aria-label={`Yes, remove ${recipe.title}`}
                          className={`min-h-11 px-1 font-semibold text-flour underline decoration-cream underline-offset-4 ${focusRing}`}>Yes, remove</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setConfirmingId(savedRecipe.id)} aria-label={`Remove ${recipe.title}`}
                        className={`min-h-11 px-1 text-ash hover:text-flour ${focusRing}`}>Remove</button>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </motion.main>
  );
}

export default SavedRecipesPage;

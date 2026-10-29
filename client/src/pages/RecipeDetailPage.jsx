import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { foodImageSrc, getSavedRecipe } from "../services/api.js";
import ZineSamplePreview, { ZineEntry } from "../components/ZineSamplePreview.jsx";
import { getPreviewStyle, developerStyle } from "../data/zineStyles.js";
import { developerAssetSample } from "../data/zineAssetSamples.js";
import { useZineArtwork, ZineArtworkPanel } from "../components/ZineArtwork.jsx";
import { features } from "../data/features.js";
import Spark from "../components/Spark.jsx";
import CountUp from "../components/CountUp.jsx";
import PlateRing from "../components/PlateRing.jsx";
import RollingNumber from "../components/RollingNumber.jsx";
import Burners from "../components/Burners.jsx";
import RecipeAssistant from "../components/RecipeAssistant.jsx";
import { scaleIngredients } from "../utils/scaleRecipe.js";
import { displayIngredientName } from "../utils/ingredientCategories.js";
import { useSessionState } from "../utils/sessionState.js";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

// plateFlightId: set for a dish opened from tonight's menu, whose plate flies here from the menu (and back).
function RecipeDetailPage({ savedRecipeId, generatedRecipe, plateFlightId, onBack, onStartCooking, onAdopt, servingsKey,
  zineEnabled = features.zine, assistantStatus = null }) {
  const [savedRecipe, setSavedRecipe] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [zine, setZine] = useState(null);
  // Chosen servings are shared with Cooking Mode for the same recipe (per tab).
  const [servingsChoice, setServingsChoice] = useSessionState(`chefspark:servings:${servingsKey || "none"}`, null);

  async function navigateZine(view) {
    const styleId = zine?.styleId || developerStyle(window.location.search, import.meta.env.DEV) ||
      await getPreviewStyle(recipe);
    setZine({ view, styleId });
  }

  useEffect(() => {
    if (zine) {
      window.scrollTo(0, 0);
      document.getElementById("zine-heading")?.focus({ preventScroll: true });
    }
  }, [zine]);

  function closeZine() {
    setZine(null);
    requestAnimationFrame(() => {
      document.querySelector(".zine-entry button")?.focus();
    });
  }

  useEffect(() => {
    if (generatedRecipe || savedRecipeId == null) return;
    let active = true;
    async function loadRecipe() {
      setMessage("");
      setIsLoading(true);

      try {
        const data = await getSavedRecipe(savedRecipeId);
        if (active) setSavedRecipe(data);
      } catch (error) {
        if (active) setMessage(error.message);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadRecipe();
    return () => { active = false; };
  }, [savedRecipeId, generatedRecipe]);

  const recipe = generatedRecipe || savedRecipe?.recipe;
  // Artwork belongs to a saved recipe; unsaved generated recipes are asked to save first.
  const artwork = useZineArtwork({ savedRecipeId: generatedRecipe ? null : savedRecipeId,
    title: recipe?.title, active: zine?.view === "preview" });

  const hasServings = Number.isFinite(recipe?.servings) && recipe.servings > 0;
  const hasScore = Number.isFinite(recipe?.matchScore) && recipe.matchScore >= 0 && recipe.matchScore <= 100;
  const imageSrc = foodImageSrc(recipe?.imageUrl);

  if (zine && recipe) {
    // Generated artwork was drawn in the Zine's stored style, so that style wins once it exists.
    const styleId = artwork.assets && artwork.zine?.styleId ? artwork.zine.styleId : zine.styleId;
    return <ZineSamplePreview recipe={recipe} view={zine.view} styleId={styleId}
      assetSample={developerAssetSample(window.location.search, import.meta.env.DEV, recipe, styleId)}
      artworkAssets={artwork.assets} artworkPanel={<ZineArtworkPanel artwork={artwork} />}
      onNavigate={navigateZine} onBackToRecipe={closeZine} />;
  }

  const servings = hasServings ? (servingsChoice || recipe.servings) : null;
  const scaledRows = scaleIngredients(recipe?.ingredients || [], hasServings ? recipe.servings : null, servings);
  const canScale = hasServings && Boolean(servingsKey) && (recipe?.ingredients || []).some((item) => typeof item !== "string");
  const canCook = Boolean(onStartCooking) && Array.isArray(recipe?.steps) && recipe.steps.length > 0;
  const youHave = Array.isArray(recipe?.youHave) ? recipe.youHave : null;
  const youNeed = Array.isArray(recipe?.youNeed) ? recipe.youNeed : null;
  const needed = new Set((youNeed || []).map((name) => String(name).trim().toLowerCase()));
  const firstSwap = recipe?.substitutions?.find((item) => item?.ingredient && item?.substitute);
  // Compact time for the spec row ("25 minutes" -> "25 min"); the full text stays as its label.
  const shortTime = typeof recipe?.cookTime === "string"
    ? recipe.cookTime.replace(/\bminutes?\b/i, "min").replace(/\bhours?\b/i, "h") : recipe?.cookTime;
  // Shown under the plate on a phone and at the top of the method column on desktop (only one is visible).
  const titleBlock = recipe && (
    <>
      {(recipe.cuisine || recipe.diet) && (
        <span className="font-mono text-[11px] tracking-[0.3em] text-ash uppercase">
          {[recipe.cuisine, recipe.diet].filter(Boolean).join(" · ")}
        </span>
      )}
      <h1 className="font-display text-[50px] leading-[0.95] italic">{recipe.title}</h1>
    </>
  );

  return (
    // No page fade when the plate flies in from the menu: it would dim the plate in flight.
    <motion.main data-ds="" initial={plateFlightId ? false : { opacity: 0 }} animate={{ opacity: 1 }}
      className={`min-h-screen bg-iron bg-ember-glow px-6 pt-4 ${canCook ? "pb-[calc(190px+env(safe-area-inset-bottom,0px))]" : "pb-[calc(110px+env(safe-area-inset-bottom,0px))]"} lg:mx-auto lg:max-w-[1240px] lg:px-12 lg:pt-10 lg:pb-16`}>
      <header className="flex items-center justify-between">
        <button type="button" onClick={onBack}
          aria-label={generatedRecipe ? "Back to generated recipes" : "Back to saved recipes"}
          className={`min-h-11 px-1 font-mono text-[11px] tracking-[0.18em] text-ash hover:text-flour ${focusRing}`}>
          {generatedRecipe ? "← MENU" : "← SHELF"}
        </button>
        {/* On desktop the rail already shows the name. */}
        <span className="flex items-center gap-2 font-display text-xl italic lg:hidden">
          <Spark size={13} className="text-cream" />
          ChefSpark
        </span>
      </header>

      {isLoading && <p className="mt-10 font-mono text-xs tracking-[0.16em] text-ash" role="status">LOADING RECIPE…</p>}
      {message && (
        <p className="mt-10 flex items-start gap-2 text-[15px] text-flour" role="alert">
          <Spark size={12} className="mt-1 text-cream" />
          {message}
        </p>
      )}

      {recipe && (
        <article className="flex flex-col lg:mt-6 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-x-16">
          {/* Desktop (DESIGN_SYSTEM.md): the prep column (plate, facts, ingredients) on the left; the title,
              method and actions on the right. Not sticky: a long ingredient list can be taller than the screen.
              On a phone both columns stack in this order. */}
          <div className="flex flex-col">
          <div className="mt-4 flex flex-col items-center lg:mt-0">
            <PlateRing percent={hasScore ? recipe.matchScore : null} size={232} decorative imageSrc={imageSrc} animated={!plateFlightId} delay={0.2}
              flightId={plateFlightId}>
              {imageSrc ? null : hasScore ? (
                <span role="img" aria-label={`${recipe.matchScore}% ingredient match`} className="flex flex-col items-center">
                  <CountUp value={recipe.matchScore} suffix="%" delay={0.2} animated={!plateFlightId} aria-hidden="true" className="font-display text-[60px] leading-none italic" />
                  <span aria-hidden="true" className="mt-1 font-mono text-[10px] tracking-[0.2em] text-ash">MATCH</span>
                </span>
              ) : <Spark size={34} className="text-cream" />}
            </PlateRing>
            {/* The facts row below already gives the match score. */}
            {imageSrc && <p className="mt-3 font-mono text-[10px] tracking-[0.2em] text-ash">AI IMAGE</p>}
          </div>

          <header className="mt-6 flex flex-col items-center gap-2 text-center lg:hidden">
            {titleBlock}
          </header>

          {(hasScore || recipe.cookTime || hasServings || recipe.difficulty) && (
            <dl aria-label={hasScore ? "Match Score and recipe facts" : "Recipe facts"}
              className="mt-7 grid grid-cols-4 border-y border-flour/16 text-center">
              {[
                hasScore && ["Match", <span className="text-cream">{recipe.matchScore}%</span>],
                recipe.cookTime && ["Time", <span aria-label={recipe.cookTime}>{shortTime}</span>],
                hasServings && ["Serves", recipe.servings],
                recipe.difficulty && ["Heat", <span className="flex flex-col items-center gap-1.5 not-italic"><Burners difficulty={recipe.difficulty} size={8} /><span className="font-mono text-[10px] tracking-[0.14em] text-soft uppercase">{recipe.difficulty}</span></span>]
              ].filter(Boolean).map(([label, value], index) => (
                <div key={label} className={`flex flex-col items-center gap-1.5 py-3.5 ${index > 0 ? "border-l border-flour/16" : ""}`}>
                  <dt className="font-mono text-[10px] tracking-[0.16em] text-ash uppercase">{label}</dt>
                  <dd className="font-display text-[20px] leading-none whitespace-nowrap italic">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {(youHave || youNeed) && (
            <section className="mt-8 grid grid-cols-2 gap-x-5">
              {youHave && (
                <div className="flex flex-col gap-1.5">
                  <h2 className="font-mono text-[11px] tracking-[0.16em] text-ash">
                    <span className="uppercase">You Have</span> · {youHave.length}
                  </h2>
                  <p className="text-[15px] leading-snug text-soft">
                    {youHave.length ? youHave.map(displayIngredientName).join(", ") : "No matching ingredients in your inventory."}
                  </p>
                </div>
              )}
              {youNeed && (
                <div className="flex flex-col gap-1.5 border-l border-flour/16 pl-5">
                  <h2 className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] text-ash">
                    <Spark size={9} className="text-cream" />
                    <span className="uppercase">You Need</span> · {youNeed.length}
                  </h2>
                  <p className="text-[15px] leading-snug text-flour">
                    {youNeed.length ? youNeed.map(displayIngredientName).join(", ") : "No additional ingredients needed."}
                  </p>
                </div>
              )}
            </section>
          )}

          <section aria-labelledby="ticket-heading" className="mt-9 border-y-2 border-dashed border-flour/40 pt-3.5 pb-2.5">
            <div className="flex justify-between font-mono text-[11px] tracking-[0.18em] text-ash">
              <h2 id="ticket-heading" className="uppercase">Ingredients</h2>
              {hasServings && !canScale && <span>FOR {recipe.servings}</span>}
            </div>
            {canScale && (
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[11px] tracking-[0.18em] text-ash">SERVES</span>
                <span className="flex items-center gap-1">
                  <button type="button" aria-label="Fewer servings" disabled={servings <= 1}
                    onClick={() => setServingsChoice((value) => Math.max(1, (value || recipe.servings) - 1))}
                    className={`flex size-11 items-center justify-center rounded-full text-xl ring-1 ring-flour/40 disabled:opacity-40 ${focusRing}`}>−</button>
                  <RollingNumber value={servings} aria-live="polite" className="w-10 font-display text-2xl italic" />
                  <button type="button" aria-label="More servings" disabled={servings >= 24}
                    onClick={() => setServingsChoice((value) => Math.min(24, (value || recipe.servings) + 1))}
                    className={`flex size-11 items-center justify-center rounded-full text-xl ring-1 ring-flour/40 disabled:opacity-40 ${focusRing}`}>+</button>
                </span>
              </div>
            )}
            <ul className="mt-2.5 flex flex-col gap-2.5 font-mono text-[14px]">
              {(recipe.ingredients || []).map((ingredient, index) => {
                const name = typeof ingredient === "string" ? ingredient : ingredient.name;
                const isNeeded = typeof ingredient !== "string" && needed.has(String(name).trim().toLowerCase());
                const amount = scaledRows[index]?.amount || "";
                return (
                  <li key={index} className={`flex justify-between gap-4 ${isNeeded ? "text-cream" : ""}`}>
                    <span className="flex items-baseline gap-1.5 uppercase">
                      {isNeeded && <Spark size={9} className="self-center" />}
                      <span>{name}</span>
                      {isNeeded && <span className="text-[10px] tracking-[0.16em]"> · NEED</span>}
                    </span>
                    {amount && <RollingNumber value={amount} className="shrink-0 justify-end text-right uppercase" />}
                  </li>
                );
              })}
            </ul>
            {servings !== recipe.servings && hasServings && (
              <p className="mt-3 font-sans text-[13px] text-ash">
                Amounts above are for {servings}; amounts written in the method are for {recipe.servings}.
              </p>
            )}
          </section>
          {firstSwap && (
            <p className="mt-3 -rotate-[1.5deg] self-end font-hand text-[22px] text-cream">
              no {String(firstSwap.ingredient).toLowerCase()}? {String(firstSwap.substitute).toLowerCase()} works
            </p>
          )}
          </div>

          <div className="flex flex-col">
          <header className="hidden flex-col gap-2 lg:flex">
            {titleBlock}
          </header>

          <section aria-labelledby="method-heading" className="mt-9">
            <h2 id="method-heading" className="mb-3 font-display text-[32px] italic">The method</h2>
            <ol>
              {(recipe.steps || []).map((step, index) => (
                <li key={index} className={`grid grid-cols-[40px_1fr] border-t border-flour/16 py-3.5 ${index === (recipe.steps.length - 1) ? "border-b" : ""}`}>
                  <span aria-hidden="true" className="font-display text-[26px] leading-none text-ash italic">
                    {typeof step === "string" ? index + 1 : step.step}
                  </span>
                  <p className="text-base leading-relaxed text-soft">{typeof step === "string" ? step : step.instruction}</p>
                </li>
              ))}
            </ol>
          </section>

          {(recipe.tips?.length > 0 || recipe.substitutions?.length > 0) && (
            <section className="mt-8 grid grid-cols-2 gap-x-5">
              {recipe.tips?.length > 0 && (
                <div>
                  <h2 className="mb-2 font-mono text-[11px] tracking-[0.2em] text-ash uppercase">Cooking Tips</h2>
                  <ul className="flex flex-col gap-2 text-sm leading-relaxed text-soft">
                    {recipe.tips.map((tip, index) => <li key={index}>{tip}</li>)}
                  </ul>
                </div>
              )}
              {recipe.substitutions?.length > 0 && (
                <div className={recipe.tips?.length > 0 ? "border-l border-flour/16 pl-5" : ""}>
                  <h2 className="mb-2 font-mono text-[11px] tracking-[0.2em] text-ash uppercase">Substitutions</h2>
                  <dl className="flex flex-col gap-2 text-sm leading-relaxed">
                    {recipe.substitutions.map((item, index) => (
                      <div key={index}><dt className="font-semibold text-flour">{item.ingredient}</dt><dd className="text-soft">{item.substitute}</dd></div>
                    ))}
                  </dl>
                </div>
              )}
            </section>
          )}

          {onAdopt && <RecipeAssistant recipe={recipe} isSaved={!generatedRecipe} onAdopt={onAdopt} initialStatus={assistantStatus} />}

          {zineEnabled && <div className="mt-8"><ZineEntry onOpen={() => navigateZine("intro")} /></div>}

          {canCook && (
            <div className="mt-10 hidden lg:block">
              <button type="button" onClick={onStartCooking}
                className={`flex min-h-[58px] w-full max-w-[382px] items-center justify-between rounded-full bg-cream px-6 text-lg font-semibold text-iron shadow-glow ${focusRing}`}>
                Light the stove — start cooking
                <Spark size={20} />
              </button>
            </div>
          )}
          </div>
        </article>
      )}

      {/* Phone: the main action floats above the navigation. Desktop shows it at the end of the method. */}
      {recipe && canCook && (
        <div className="lg:hidden">
          <div aria-hidden="true"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[5] mx-auto h-[calc(170px+env(safe-area-inset-bottom,0px))] max-w-[430px] bg-linear-to-t from-iron from-60% to-transparent" />
          <div className="fixed inset-x-6 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-10 mx-auto max-w-[382px]">
            <button type="button" onClick={onStartCooking}
              className={`flex min-h-[58px] w-full items-center justify-between rounded-full bg-cream px-6 text-lg font-semibold text-iron shadow-glow ${focusRing}`}>
              Light the stove — start cooking
              <Spark size={20} />
            </button>
          </div>
        </div>
      )}
    </motion.main>
  );
}

export default RecipeDetailPage;

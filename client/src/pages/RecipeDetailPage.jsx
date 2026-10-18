import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ChefHat, CheckCircle2, ShoppingCart, ListChecks, Lightbulb, ArrowLeftRight } from "lucide-react";
import { getSavedRecipe } from "../services/api.js";
import ZineSamplePreview, { ZineEntry } from "../components/ZineSamplePreview.jsx";
import { getPreviewStyle, developerStyle } from "../data/zineStyles.js";

function IngredientChips({ title, items, owned }) {
  const Icon = owned ? CheckCircle2 : ShoppingCart;
  return (
    <section className="guide-card">
      <h2><Icon size={19} aria-hidden="true" />{title}<span className="guide-count">({items.length})</span></h2>
      {items.length ? (
        <ul className={owned ? "guide-chips owned" : "guide-chips"}>
          {items.map((name, index) => <li key={index}>{name}</li>)}
        </ul>
      ) : <p className="guide-muted">{owned ? "No matching ingredients in your inventory." : "No additional ingredients needed."}</p>}
    </section>
  );
}

function RecipeDetailPage({ savedRecipeId, generatedRecipe, onBack }) {
  const [savedRecipe, setSavedRecipe] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [zine, setZine] = useState(null);

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


  const hasServings = Number.isFinite(recipe?.servings) && recipe.servings > 0;
  const hasScore = Number.isFinite(recipe?.matchScore) && recipe.matchScore >= 0 && recipe.matchScore <= 100;

  if (zine && recipe) {
    return <ZineSamplePreview recipe={recipe} view={zine.view} styleId={zine.styleId}
      onNavigate={navigateZine} onBackToRecipe={closeZine} />;
  }

  return (
    <motion.main className="app-page recipe-detail-screen recipe-guide"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className="recipe-detail-topbar">
        <button type="button" className="recipe-detail-back-button"
          aria-label={generatedRecipe ? "Back to generated recipes" : "Back to saved recipes"} onClick={onBack}>
          <ArrowLeft size={23} aria-hidden="true" />
        </button>
        <div className="recipe-detail-titlebar"><span>CHEFSPARK</span><p>Recipe Guide</p></div>
        <div className="recipe-detail-logo" aria-hidden="true"><ChefHat size={21} /></div>
      </header>
      {isLoading && <p className="message" role="status">Loading recipe...</p>}
      {message && <p className="message error" role="alert">{message}</p>}
      {recipe && (
        <article className="guide-content">
          <header className="guide-heading">
            <h1>{recipe.title}</h1>
            <div className="guide-badges">
              {recipe.cuisine && <span>{recipe.cuisine}</span>}
              {recipe.difficulty && <span>{recipe.difficulty}</span>}
              {recipe.cookTime && <span>{recipe.cookTime}</span>}
              {hasServings && <span>Serves {recipe.servings}</span>}
            </div>
          </header>

          {hasScore && (
            <section className="guide-card guide-match" aria-label="Match Score">
              <div className="guide-score" style={{ "--score": `${recipe.matchScore}%` }}
                role="img" aria-label={`${recipe.matchScore}% ingredient match`}>
                <span>{recipe.matchScore}%</span>
              </div>
              <div><h2>Match Score</h2><p>Ingredient compatibility, including pantry basics.</p></div>
            </section>
          )}

          {Array.isArray(recipe.youHave) && <IngredientChips title="You Have" items={recipe.youHave} owned />}
          {Array.isArray(recipe.youNeed) && <IngredientChips title="You Need" items={recipe.youNeed} />}

          <section className="guide-card">
            <div className="guide-section-heading">
              <h2><ListChecks size={19} aria-hidden="true" />Ingredients</h2>
              {hasServings && <span className="guide-muted">For {recipe.servings} servings</span>}
            </div>
            <ul className="guide-ingredients">
              {(recipe.ingredients || []).map((ingredient, index) => (
                <li key={index}>
                  <span>{typeof ingredient === "string" ? ingredient : ingredient.name}</span>
                  {typeof ingredient !== "string" && (
                    <span className="guide-quantity">{[
                      Number.isFinite(ingredient.quantity) ? ingredient.quantity : null,
                      typeof ingredient.unit === "string" ? ingredient.unit : null
                    ].filter(value => value !== null && value !== "").join(" ")}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="guide-cooking">
            <h2><ChefHat size={21} aria-hidden="true" />Cooking Steps</h2>
            <ol className="guide-timeline">
              {(recipe.steps || []).map((step, index) => (
                <li key={index}>
                  <span className="guide-step-number" aria-hidden="true">{typeof step === "string" ? index + 1 : step.step}</span>
                  <p>{typeof step === "string" ? step : step.instruction}</p>
                </li>
              ))}
            </ol>
          </section>

          {recipe.tips?.length > 0 && (
            <section className="guide-card">
              <h2><Lightbulb size={19} aria-hidden="true" />Cooking Tips</h2>
              <ul className="guide-notes">{recipe.tips.map((tip, index) => <li key={index}>{tip}</li>)}</ul>
            </section>
          )}
          {recipe.substitutions?.length > 0 && (
            <section className="guide-card">
              <h2><ArrowLeftRight size={19} aria-hidden="true" />Substitutions</h2>
              <dl className="guide-substitutions">
                {recipe.substitutions.map((item, index) => (
                  <div key={index}><dt>{item.ingredient}</dt><dd>{item.substitute}</dd></div>
                ))}
              </dl>
            </section>
          )}
          <ZineEntry onOpen={() => navigateZine("intro")} />
        </article>
      )}
    </motion.main>
  );
}

export default RecipeDetailPage;

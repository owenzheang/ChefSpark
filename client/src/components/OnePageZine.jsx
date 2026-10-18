import { useState } from "react";
import { Leaf, Utensils, MoveDownRight } from "lucide-react";
import { getZineStyle } from "../data/zineStyles.js";
import "./zine.css";
const strings = values => Array.isArray(values) ? values.filter(value => typeof value === "string" && value.trim()) : [];
function RecipeVisual({ recipe }) {
  const [failed, setFailed] = useState(false);
  const url = typeof recipe.imageUrl === "string" && !recipe.imageUrl.includes("zine-samples") &&
    /^(https?:\/\/|\/[^/])/.test(recipe.imageUrl) ? recipe.imageUrl : "";
  return <figure className="one-zine-visual">
    {url && !failed ? <img src={url} alt={recipe.title || "Recipe photograph"} onError={() => setFailed(true)} /> :
      <div className="one-zine-placeholder"><div className="one-zine-plate"><Utensils size={52} strokeWidth={1} aria-hidden="true" /><Leaf size={32} aria-hidden="true" /></div><span>Room for a delicious picture</span><small>Visual placeholder · no image generated</small></div>}
  </figure>;
}
export default function OnePageZine({ recipe = {}, styleId = "collage" }) {
  const style = getZineStyle(styleId), tips = strings(recipe.tips), suggestions = strings(recipe.servingSuggestions);
  const substitutions = Array.isArray(recipe.substitutions) ? recipe.substitutions : [];
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  return <article className={`one-zine one-zine--${style.id}`} aria-label={`${recipe.title || "Recipe"} One-Page Zine`}>
    <div className="one-zine-masthead"><span><Leaf size={16} aria-hidden="true" /> ChefSpark</span><span>THE ONE-PAGE ZINE / 01</span></div>
    <div className="one-zine-hero">
      <header className="one-zine-title"><span className="one-zine-eyebrow">From your kitchen</span><h2>{recipe.title}</h2>
        <div className="one-zine-meta">{[recipe.cuisine, recipe.difficulty, recipe.cookTime].filter(Boolean).map((value, i) => <span key={i}>{value}</span>)}
          {Number.isFinite(recipe.servings) && recipe.servings > 0 && <span>Serves {recipe.servings}</span>}</div>
        <MoveDownRight className="one-zine-arrow" size={48} strokeWidth={1.3} aria-hidden="true" />
      </header>
      <RecipeVisual key={recipe.imageUrl || "placeholder"} recipe={recipe} />
    </div>
    {typeof recipe.description === "string" && recipe.description.trim() && <section className="one-zine-about"><h3>About the dish</h3><p>{recipe.description}</p></section>}
    <div className="one-zine-body">
      <section className="one-zine-ingredients"><span className="one-zine-eyebrow">Gather & prepare</span><h3>Ingredients</h3>
        <ul>{ingredients.map((ingredient, i) => <li key={i}><span>{typeof ingredient === "string" ? ingredient : ingredient.name}</span>
          {typeof ingredient !== "string" && ingredient.quantity != null && <span className="one-zine-quantity">{[ingredient.quantity, ingredient.unit].filter(value => value != null && value !== "").join(" ")}</span>}</li>)}</ul>
      </section>
      <section className="one-zine-steps"><span className="one-zine-eyebrow">At the stove</span><h3>Let's make it</h3>
        <ol>{steps.map((step, i) => <li key={i} value={typeof step === "object" && Number.isFinite(step.step) ? step.step : i + 1}><p>{typeof step === "string" ? step : step.instruction}</p></li>)}</ol>
      </section>
    </div>
    {(tips.length > 0 || substitutions.length > 0 || suggestions.length > 0) && <section className="one-zine-notes"><h3>Finishing notes</h3><div>
      {tips.length > 0 && <section><h4>Cooking tips</h4><ul>{tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul></section>}
      {substitutions.length > 0 && <section><h4>Substitutions</h4><dl>{substitutions.map((item, i) => <div key={i}>{typeof item === "string" ? <dd>{item}</dd> : <><dt>{item.ingredient}</dt><dd>{item.substitute}</dd></>}</div>)}</dl></section>}
      {suggestions.length > 0 && <section><h4>Serving suggestions</h4><ul>{suggestions.map((item, i) => <li key={i}>{item}</li>)}</ul></section>}
    </div></section>}
    <footer className="one-zine-footer"><Leaf size={18} aria-hidden="true" /><span>Your recipe. A little imagination.</span><span>CHEFSPARK</span></footer>
  </article>;
}

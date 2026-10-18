import { motion } from "motion/react";

function summarizeIngredients(ingredients = []) {
  if (ingredients.length === 0) return "None";
  const summary = ingredients.slice(0, 2).join(", ");
  return ingredients.length > 2 ? `${summary} + ${ingredients.length - 2} more` : summary;
}

export default function RecipePreviewCard({ recipe, onViewRecipe, onSave, isSaving }) {
  return (
    <motion.article className="panel recipe-card recipe-preview-card"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className={recipe.imageUrl ? "recipe-card-image has-image" : "recipe-card-image"}>
        {recipe.imageUrl && <img src={recipe.imageUrl} alt={recipe.title} loading="lazy" />}
        <span>{recipe.cuisine}</span>
      </div>
      <div className="recipe-card-header">
        <h3>{recipe.title}</h3>
        <span>{recipe.matchScore}% match</span>
      </div>
      <p className="recipe-card-meta">
        <span>{recipe.cuisine}</span><span aria-hidden="true">·</span>
        <span>{recipe.difficulty}</span><span aria-hidden="true">·</span>
        <span>{recipe.cookTime}</span><span aria-hidden="true">·</span>
        <span>Serves {recipe.servings}</span>
      </p>
      <div className="recipe-preview-summary">
        <p><strong>You Have:</strong> {summarizeIngredients(recipe.youHave)}</p>
        <p><strong>You Need:</strong> {summarizeIngredients(recipe.youNeed)}</p>
      </div>
      <div className="recipe-preview-actions">
        <button type="button" onClick={() => onViewRecipe(recipe)}>View Recipe</button>
        <button type="button" className="recipe-preview-save" disabled={isSaving}
          onClick={() => onSave(recipe)}>{isSaving ? "Saving..." : "Save Recipe"}</button>
      </div>
    </motion.article>
  );
}

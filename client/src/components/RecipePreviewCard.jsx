import { motion } from "motion/react";
import { ArrowRight, Bookmark } from "lucide-react";

function summarizeIngredients(ingredients = []) {
  if (ingredients.length === 0) return "None";
  const summary = ingredients.slice(0, 2).join(", ");
  return ingredients.length > 2 ? `${summary} + ${ingredients.length - 2} more` : summary;
}

// Typographic covers stand in for photos until dish-accurate images exist (DESIGN_SYSTEM.md),
// so a card never shows a stock picture of a different dish.
const covers = [
  "bg-cobalt text-white",
  "bg-tomato text-ink"
];

export default function RecipePreviewCard({ recipe, onViewRecipe, onSave, isSaving, index = 0 }) {
  const youHave = recipe.youHave || [];
  const youNeed = recipe.youNeed || [];
  const hasScore = Number.isFinite(recipe.matchScore);

  return (
    <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className="relative overflow-hidden rounded-card border-2 border-ink bg-card shadow-hard-lg">
      <div className={`flex min-h-28 items-end border-b-2 border-ink p-4 pr-24 ${covers[index % covers.length]}`}>
        <h3 className="font-display text-[26px] leading-none font-extrabold tracking-[-0.02em]">{recipe.title}</h3>
      </div>
      {hasScore && (
        <div className="absolute top-3 right-3 flex size-18 rotate-[-8deg] flex-col items-center justify-center rounded-full border-2 border-ink bg-card shadow-hard-sm">
          <span className="font-display text-2xl leading-none font-extrabold">{recipe.matchScore}%</span>
          <span className="font-mono text-[9px]">MATCH</span>
        </div>
      )}
      <div className="flex flex-col gap-3 p-4">
        <p className="flex flex-wrap gap-x-2 font-mono text-[13px] uppercase">
          <span>{recipe.cuisine}</span><span aria-hidden="true">·</span>
          <span>{recipe.difficulty}</span><span aria-hidden="true">·</span>
          <span>{recipe.cookTime}</span><span aria-hidden="true">·</span>
          <span>Serves {recipe.servings}</span>
        </p>
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="rounded-tile border-2 border-ink bg-cobalt-tint px-3 py-1.5">
            <strong>You have {youHave.length}:</strong> {summarizeIngredients(youHave)}
          </p>
          <p className="rounded-tile border-2 border-ink bg-tomato-tint px-3 py-1.5">
            <strong>You need {youNeed.length}:</strong> {summarizeIngredients(youNeed)}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onViewRecipe(recipe)} aria-label={`Open recipe: ${recipe.title}`}
            className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink font-bold text-paper hover:bg-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
            Open recipe <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <button type="button" disabled={isSaving} onClick={() => onSave(recipe)} aria-label={`Save ${recipe.title}`}
            className="flex min-h-12 items-center gap-1.5 rounded-full border-2 border-ink bg-card px-4 font-bold hover:bg-cobalt-tint focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt disabled:cursor-wait disabled:opacity-60">
            <Bookmark size={18} strokeWidth={2.4} aria-hidden="true" />
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

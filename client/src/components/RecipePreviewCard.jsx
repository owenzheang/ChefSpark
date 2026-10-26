import { motion } from "motion/react";
import Burners from "./Burners.jsx";
import PlateRing from "./PlateRing.jsx";
import Spark from "./Spark.jsx";
import { foodImageSrc } from "../services/api.js";

function summarizeIngredients(ingredients = []) {
  if (ingredients.length === 0) return "None";
  const summary = ingredients.slice(0, 2).join(", ");
  return ingredients.length > 2 ? `${summary} + ${ingredients.length - 2} more` : summary;
}

const courses = ["I", "II", "III", "IV", "V"];
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

// One course of "Tonight's menu" (DESIGN_SYSTEM.md): no card, a plate ring with the match score
// instead of a stock photo, the dish named like a menu item, and ticket-style facts.
export default function RecipePreviewCard({ recipe, onViewRecipe, onSave, isSaving, index = 0 }) {
  const youHave = recipe.youHave || [];
  const youNeed = recipe.youNeed || [];
  const hasScore = Number.isFinite(recipe.matchScore);
  const imageSrc = foodImageSrc(recipe.imageUrl);

  return (
    <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.1 }}
      className="flex flex-col items-center gap-3 text-center">
      <span className="font-display text-[22px] text-cream" aria-hidden="true">{courses[index] || index + 1}</span>
      <PlateRing percent={hasScore ? recipe.matchScore : null} size={168} imageSrc={imageSrc}>
        {imageSrc ? null : hasScore ? (
          <>
            <span className="font-display text-[44px] leading-none italic">{recipe.matchScore}%</span>
            <span className="mt-1 font-mono text-[10px] tracking-[0.2em] text-ash">MATCH</span>
          </>
        ) : <Spark size={28} className="text-cream" />}
      </PlateRing>
      {imageSrc && (
        <p className="flex items-baseline gap-2 font-mono text-[10px] tracking-[0.2em] text-ash">
          {/* The ring already announces the score to screen readers. */}
          {hasScore && <span aria-hidden="true" className="flex items-baseline gap-2">
            <span className="font-display text-[26px] leading-none tracking-normal text-flour italic">{recipe.matchScore}%</span>MATCH<span>·</span>
          </span>}
          AI IMAGE
        </p>
      )}
      <h3 className="mt-1 font-display text-[38px] leading-none italic lg:text-[30px]">{recipe.title}</h3>
      <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 font-mono text-[12px] tracking-[0.12em] text-soft uppercase">
        <Burners difficulty={recipe.difficulty} />
        <span>{recipe.difficulty}</span><span aria-hidden="true">·</span>
        <span>{recipe.cuisine}</span><span aria-hidden="true">·</span>
        {recipe.diet && <><span>{recipe.diet}</span><span aria-hidden="true">·</span></>}
        <span>{recipe.cookTime}</span><span aria-hidden="true">·</span>
        <span>Serves {recipe.servings}</span>
      </p>
      <p className="text-[15px] text-ash">
        You have {youHave.length}: {summarizeIngredients(youHave)}
      </p>
      {youNeed.length > 0 ? (
        <p className="flex items-center gap-1.5 text-[15px] text-flour">
          <Spark size={10} className="text-cream" />
          <span>You need {youNeed.length}: {summarizeIngredients(youNeed)}</span>
        </p>
      ) : (
        <p className="-rotate-[1.5deg] font-hand text-[22px] text-cream">you have everything for this one</p>
      )}
      <div className="flex items-center gap-6">
        <button type="button" onClick={() => onViewRecipe(recipe)} aria-label={`Open recipe: ${recipe.title}`}
          className={`min-h-11 border-b border-cream font-semibold text-flour hover:text-cream ${focusRing}`}>
          Open recipe →
        </button>
        <button type="button" disabled={isSaving} onClick={() => onSave(recipe)} aria-label={`Save ${recipe.title}`}
          className={`min-h-11 px-1 text-ash hover:text-flour disabled:cursor-wait ${focusRing}`}>
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </motion.article>
  );
}

import IngredientCategoryIcon from "./IngredientCategoryIcon.jsx";

export default function IngredientSuggestions({ suggestions, onSelect }) {
  if (!suggestions.length) return null;

  return (
    <ul id="ingredient-suggestions" aria-label="Ingredient suggestions"
      className="mt-2 flex flex-col overflow-hidden rounded-tile border-2 border-ink bg-card shadow-hard-sm">
      {suggestions.map(({ name, isCorrection }) => (
        <li key={name} className="border-b-2 border-dashed border-ink/20 last:border-b-0">
          <button type="button" onClick={() => onSelect(name)}
            className="flex min-h-12 w-full items-center gap-3 px-3.5 text-left text-base font-medium hover:bg-cobalt-tint focus-visible:bg-cobalt-tint focus-visible:outline-none">
            <IngredientCategoryIcon name={name} size={18} />
            <span className="flex flex-col">
              {name}
              {isCorrection && <small className="font-mono text-xs text-muted">Did you mean this?</small>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

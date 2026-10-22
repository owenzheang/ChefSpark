import IngredientCategoryIcon from "./IngredientCategoryIcon.jsx";

export default function IngredientSuggestions({ suggestions, onSelect }) {
  if (!suggestions.length) return null;

  return (
    <ul id="ingredient-suggestions" aria-label="Ingredient suggestions" className="flex flex-col">
      {suggestions.map(({ name, isCorrection }) => (
        <li key={name} className="border-b border-flour/16">
          <button type="button" onClick={() => onSelect(name)}
            className="flex min-h-12 w-full items-center gap-3 text-left text-base text-flour hover:text-cream focus-visible:text-cream focus-visible:outline-none">
            <IngredientCategoryIcon name={name} size={16} />
            <span className="flex flex-col">
              {name}
              {isCorrection && <small className="font-mono text-[11px] text-ash">Did you mean this?</small>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

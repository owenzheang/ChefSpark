import IngredientCategoryIcon from "./IngredientCategoryIcon.jsx";

export default function IngredientSuggestions({ suggestions, onSelect }) {
  if (!suggestions.length) return null;

  return (
    <ul id="ingredient-suggestions" className="ingredient-suggestions" aria-label="Ingredient suggestions">
      {suggestions.map(({ name, isCorrection }) => (
        <li key={name}>
          <button type="button" onClick={() => onSelect(name)}>
            <IngredientCategoryIcon name={name} />
            <span>{name}{isCorrection && <small>Did you mean this?</small>}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}


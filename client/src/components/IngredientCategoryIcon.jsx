import {
  Beef, Fish, Egg, Carrot, Apple, Wheat, CookingPot, Soup, Sandwich,
  Milk, Droplets, Flame, Sprout, Candy, GlassWater, CircleHelp
} from "lucide-react";
import { getIngredientCategory } from "../utils/ingredientCategories.js";

export const categoryIcons = {
  meat: Beef, seafood: Fish, egg: Egg, vegetable: Carrot, fruit: Apple,
  grain: Wheat, rice: CookingPot, noodles: Soup, bread: Sandwich,
  dairy: Milk, oil: Droplets, sauce: CookingPot, spice: Flame,
  herb: Sprout, sweetener: Candy, liquid: GlassWater, other: CircleHelp
};

export default function IngredientCategoryIcon({ name, size = 14 }) {
  const Icon = categoryIcons[getIngredientCategory(name)];
  return <Icon className="ingredient-category-icon shrink-0 text-ash" size={size} strokeWidth={2} aria-hidden="true" />;
}


import database from "../database.js";
import { generateRecipesWithDeepSeek, RecipeGenerationError } from "../services/deepseekService.js";
import { fetchRecipeImageUrl } from "../services/pexelsService.js";
import { addRecipeMatch } from "../utils/recipeMatching.js";
import { isValidStructuredRecipe } from "../utils/recipeValidation.js";
import { allowedDiets, applyDiet, findDietConflicts } from "../utils/dietRules.js";

const allowedCuisines = ["Chinese", "Western"];
const allowedDifficulties = ["Easy", "Medium", "Hard"];

function getUserIngredients(userId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, name, quantity, unit
      FROM ingredients
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;

    database.all(sql, [userId], (error, ingredients) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(ingredients);
    });
  });
}

export async function generateRecipes(req, res) {
  // If the user cancels (the connection closes before we answer), stop the AI request too.
  const cancelled = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) cancelled.abort();
  });

  try {
    const { cuisine, difficulty, diet = "Any" } = req.body;

    if (!allowedCuisines.includes(cuisine)) {
      return res.status(400).json({ message: "Cuisine must be Chinese or Western." });
    }

    if (!allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({ message: "Difficulty must be Easy, Medium, or Hard." });
    }

    if (!allowedDiets.includes(diet)) {
      return res.status(400).json({ message: "Diet must be Any, Vegetarian, or Vegan." });
    }

    const ingredients = await getUserIngredients(req.user.userId);

    if (ingredients.length === 0) {
      return res.status(400).json({ message: "Please add ingredients before generating recipes." });
    }

    const recipes = await generateRecipesWithDeepSeek({ ingredients, cuisine, difficulty, diet, signal: cancelled.signal });
    // The prompt asks for the diet; code checks it. A dish that breaks it is dropped, not retried.
    const fitting = recipes.recipes.filter((recipe) => findDietConflicts(recipe, diet).length === 0);
    if (fitting.length === 0) {
      throw new RecipeGenerationError(`None of the dishes came back ${diet.toLowerCase()}. Please try again.`);
    }
    const recipesWithMatches = fitting.map((recipe) => addRecipeMatch(applyDiet(recipe, diet), ingredients));

    if (!recipesWithMatches.every(isValidStructuredRecipe)) {
      throw new RecipeGenerationError("Generated recipe matching data was invalid. Please try again.");
    }

    const recipesWithImages = await Promise.all(
      recipesWithMatches.map(async (recipe) => ({
        ...recipe,
        imageUrl: await fetchRecipeImageUrl({
          imagePrompt: recipe.imagePrompt,
          title: recipe.title
        })
      }))
    );

    res.json({ recipes: recipesWithImages, droppedForDiet: recipes.recipes.length - fitting.length });
  } catch (error) {
    if (res.headersSent || cancelled.signal.aborted) return;
    if (error instanceof RecipeGenerationError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Recipe generation failed:", error.name);
    res.status(500).json({ message: "Something went wrong while creating recipes. Please try again." });
  }
}

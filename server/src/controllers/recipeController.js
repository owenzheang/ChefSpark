import database from "../database.js";
import { generateRecipesWithDeepSeek } from "../services/deepseekService.js";
import { fetchRecipeImageUrl } from "../services/pexelsService.js";
import { addRecipeMatch } from "../utils/recipeMatching.js";
import { isValidStructuredRecipe } from "../utils/recipeValidation.js";

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
  try {
    const { cuisine, difficulty } = req.body;

    if (!allowedCuisines.includes(cuisine)) {
      return res.status(400).json({ message: "Cuisine must be Chinese or Western." });
    }

    if (!allowedDifficulties.includes(difficulty)) {
      return res.status(400).json({ message: "Difficulty must be Easy, Medium, or Hard." });
    }

    const ingredients = await getUserIngredients(req.user.userId);

    if (ingredients.length === 0) {
      return res.status(400).json({ message: "Please add ingredients before generating recipes." });
    }

    const recipes = await generateRecipesWithDeepSeek({ ingredients, cuisine, difficulty });
    const recipesWithMatches = recipes.recipes.map((recipe) => addRecipeMatch(recipe, ingredients));

    if (!recipesWithMatches.every(isValidStructuredRecipe)) {
      throw new Error("Generated recipe matching data was invalid. Please try again.");
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

    res.json({ recipes: recipesWithImages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

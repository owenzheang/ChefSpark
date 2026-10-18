import database from "../database.js";

import {
  isValidLegacyRecipe,
  isValidStructuredRecipe
} from "../utils/recipeValidation.js";

function isValidRecipe(recipe) {
  return isValidStructuredRecipe(recipe) || isValidLegacyRecipe(recipe);
}

function formatSavedRecipe(row) {
  return {
    id: row.id,
    recipe: JSON.parse(row.recipe_json),
    savedAt: row.saved_at
  };
}

export function saveRecipe(req, res) {
  const { recipe } = req.body;

  if (!isValidRecipe(recipe)) {
    return res.status(400).json({ message: "Recipe format is invalid." });
  }

  const recipeJson = JSON.stringify(recipe);
  const sql = "INSERT INTO saved_recipes (user_id, recipe_json) VALUES (?, ?)";

  database.run(sql, [req.user.userId, recipeJson], function (error) {
    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.status(201).json({
      message: "Recipe saved.",
      savedRecipe: {
        id: this.lastID,
        recipe,
        savedAt: new Date().toISOString()
      }
    });
  });
}

export function getSavedRecipes(req, res) {
  const sql = `
    SELECT id, recipe_json, saved_at
    FROM saved_recipes
    WHERE user_id = ?
    ORDER BY saved_at DESC
  `;

  database.all(sql, [req.user.userId], (error, rows) => {
    if (error) {
      return res.status(500).json({ message: error.message });
    }

    try {
      res.json(rows.map(formatSavedRecipe));
    } catch (parseError) {
      res.status(500).json({ message: "Saved recipe data is invalid." });
    }
  });
}

export function getSavedRecipeById(req, res) {
  const sql = `
    SELECT id, recipe_json, saved_at
    FROM saved_recipes
    WHERE id = ? AND user_id = ?
  `;

  database.get(sql, [req.params.id, req.user.userId], (error, row) => {
    if (error) {
      return res.status(500).json({ message: error.message });
    }

    if (!row) {
      return res.status(404).json({ message: "Saved recipe not found." });
    }

    try {
      res.json(formatSavedRecipe(row));
    } catch (parseError) {
      res.status(500).json({ message: "Saved recipe data is invalid." });
    }
  });
}

export function deleteSavedRecipe(req, res) {
  const sql = "DELETE FROM saved_recipes WHERE id = ? AND user_id = ?";

  database.run(sql, [req.params.id, req.user.userId], function (error) {
    if (error) {
      return res.status(500).json({ message: error.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "Saved recipe not found." });
    }

    res.json({ message: "Saved recipe deleted." });
  });
}

import { useState } from "react";
import { MotionConfig } from "motion/react";
import BottomNav from "./components/BottomNav.jsx";
import IngredientsPage from "./pages/IngredientsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RecipeDetailPage from "./pages/RecipeDetailPage.jsx";
import RecipeGenerationPage from "./pages/RecipeGenerationPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SavedRecipesPage from "./pages/SavedRecipesPage.jsx";
import { getToken, removeToken } from "./services/api.js";

function AppPages() {
  const [page, setPage] = useState(getToken() ? "ingredients" : "login");
  const [selectedSavedRecipeId, setSelectedSavedRecipeId] = useState(null);
  const [selectedGeneratedRecipe, setSelectedGeneratedRecipe] = useState(null);
  const [generatedRecipes, setGeneratedRecipes] = useState([]);
  const [cuisine, setCuisine] = useState("Chinese");
  const [difficulty, setDifficulty] = useState("Easy");
  const activePage = page === "recipeDetail"
    ? (selectedGeneratedRecipe ? "recipes" : "savedRecipes") : page;

  function handleLogout() {
    removeToken();
    setSelectedSavedRecipeId(null);
    setSelectedGeneratedRecipe(null);
    setGeneratedRecipes([]);
    setCuisine("Chinese");
    setDifficulty("Easy");
    setPage("login");
  }

  function viewSavedRecipe(id) {
    setSelectedGeneratedRecipe(null);
    setSelectedSavedRecipeId(id);
    setPage("recipeDetail");
  }

  function viewGeneratedRecipe(recipe) {
    setSelectedSavedRecipeId(null);
    setSelectedGeneratedRecipe(recipe);
    setPage("recipeDetail");
  }

  function renderWithNavigation(content) {
    return (
      <div className="app-shell bg-iron">
        <div className="phone-container bg-iron">
          {content}
          <BottomNav activePage={activePage} onNavigate={setPage} />
        </div>
      </div>
    );
  }

  if (page === "register") {
    return (
      <RegisterPage
        onRegister={() => setPage("ingredients")}
        onShowLogin={() => setPage("login")}
      />
    );
  }

  if (page === "recipes") {
    return renderWithNavigation(
      <RecipeGenerationPage
        recipes={generatedRecipes}
        setRecipes={setGeneratedRecipes}
        cuisine={cuisine}
        setCuisine={setCuisine}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        onViewRecipe={viewGeneratedRecipe}
        onBack={() => setPage("ingredients")}
        onLogout={handleLogout}
        onSavedRecipes={() => setPage("savedRecipes")}
      />
    );
  }

  if (page === "savedRecipes") {
    return renderWithNavigation(
      <SavedRecipesPage
        onBack={() => setPage("ingredients")}
        onLogout={handleLogout}
        onViewRecipe={viewSavedRecipe}
      />
    );
  }

  if (page === "recipeDetail") {
    return renderWithNavigation(
      <RecipeDetailPage
        key={selectedGeneratedRecipe ? "generated" : selectedSavedRecipeId}
        generatedRecipe={selectedGeneratedRecipe}
        savedRecipeId={selectedSavedRecipeId}
        onBack={() => setPage(selectedGeneratedRecipe ? "recipes" : "savedRecipes")}
        onLogout={handleLogout}
      />
    );
  }

  if (page === "ingredients") {
    return renderWithNavigation(
      <IngredientsPage
        onGenerateRecipes={() => setPage("recipes")}
        onSavedRecipes={() => setPage("savedRecipes")}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <LoginPage
      onLogin={() => setPage("ingredients")}
      onShowRegister={() => setPage("register")}
    />
  );
}

// Animations follow the user's reduced-motion setting.
function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppPages />
    </MotionConfig>
  );
}

export default App;

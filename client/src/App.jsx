import { useState } from "react";
import { LayoutGroup, motion } from "motion/react";
import { Bookmark, ChefHat, LogOut, Package } from "lucide-react";
import IngredientsPage from "./pages/IngredientsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RecipeDetailPage from "./pages/RecipeDetailPage.jsx";
import RecipeGenerationPage from "./pages/RecipeGenerationPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SavedRecipesPage from "./pages/SavedRecipesPage.jsx";
import { getToken, removeToken } from "./services/api.js";

const navTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1]
};

const navIconTransition = {
  type: "spring",
  duration: 0.28,
  bounce: 0.18
};

const navIndicatorTransition = {
  type: "spring",
  duration: 0.28,
  bounce: 0.12
};

function App() {
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
      <div className="app-shell">
        <div className="phone-container">
          {content}
          <LayoutGroup id="bottom-navigation">
          <motion.nav
            className="bottom-nav"
            aria-label="Main navigation"
            layoutRoot
          >
            <motion.button
              type="button"
              className={page === "ingredients" ? "active" : ""}
              onClick={() => setPage("ingredients")}
              whileTap={{ scale: 0.94 }}
            >
              {page === "ingredients" && (
                <motion.span
                  className="bottom-nav-indicator"
                  layoutId="bottom-nav-indicator"
                  transition={navIndicatorTransition}
                />
              )}
              <motion.span
                className="bottom-nav-content"
                animate={{
                  color: page === "ingredients" ? "#ffffff" : "#738076",
                  opacity: page === "ingredients" ? 1 : 0.82
                }}
                transition={navTransition}
              >
                <motion.span
                  className="bottom-nav-icon"
                  animate={{ scale: page === "ingredients" ? 1.07 : 1 }}
                  transition={navIconTransition}
                >
                  <Package size={19} strokeWidth={2} aria-hidden="true" />
                </motion.span>
                <motion.span className="bottom-nav-label">
                  Ingredients
                </motion.span>
              </motion.span>
            </motion.button>
            <motion.button
              type="button"
              className={activePage === "recipes" ? "active" : ""}
              onClick={() => setPage("recipes")}
              whileTap={{ scale: 0.94 }}
            >
              {activePage === "recipes" && (
                <motion.span
                  className="bottom-nav-indicator"
                  layoutId="bottom-nav-indicator"
                  transition={navIndicatorTransition}
                />
              )}
              <motion.span
                className="bottom-nav-content"
                animate={{
                  color: activePage === "recipes" ? "#ffffff" : "#738076",
                  opacity: activePage === "recipes" ? 1 : 0.82
                }}
                transition={navTransition}
              >
                <motion.span
                  className="bottom-nav-icon"
                  animate={{ scale: activePage === "recipes" ? 1.07 : 1 }}
                  transition={navIconTransition}
                >
                  <ChefHat size={19} strokeWidth={2} aria-hidden="true" />
                </motion.span>
                <motion.span className="bottom-nav-label">
                  Generate
                </motion.span>
              </motion.span>
            </motion.button>
            <motion.button
              type="button"
              className={activePage === "savedRecipes" ? "active" : ""}
              onClick={() => setPage("savedRecipes")}
              whileTap={{ scale: 0.94 }}
            >
              {(activePage === "savedRecipes") && (
                <motion.span
                  className="bottom-nav-indicator"
                  layoutId="bottom-nav-indicator"
                  transition={navIndicatorTransition}
                />
              )}
              <motion.span
                className="bottom-nav-content"
                animate={{
                  color:
                    activePage === "savedRecipes"
                      ? "#ffffff"
                      : "#738076",
                  opacity:
                    activePage === "savedRecipes"
                      ? 1
                      : 0.82
                }}
                transition={navTransition}
              >
                <motion.span
                  className="bottom-nav-icon"
                  animate={{
                    scale:
                      activePage === "savedRecipes"
                        ? 1.07
                        : 1
                  }}
                  transition={navIconTransition}
                >
                  <Bookmark size={19} strokeWidth={2} aria-hidden="true" />
                </motion.span>
                <motion.span className="bottom-nav-label">Saved</motion.span>
              </motion.span>
            </motion.button>
            <motion.button type="button" onClick={handleLogout} whileTap={{ scale: 0.94 }}>
              <motion.span
                className="bottom-nav-content"
                animate={{ color: "#738076", opacity: 0.82 }}
                transition={navTransition}
              >
                <motion.span
                  className="bottom-nav-icon"
                  animate={{ scale: 1 }}
                  transition={navIconTransition}
                >
                  <LogOut size={19} strokeWidth={2} aria-hidden="true" />
                </motion.span>
                <motion.span className="bottom-nav-label">Logout</motion.span>
              </motion.span>
            </motion.button>
          </motion.nav>
          </LayoutGroup>
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

export default App;

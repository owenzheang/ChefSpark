import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router";
import BottomNav from "./components/BottomNav.jsx";
import IngredientsPage from "./pages/IngredientsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RecipeDetailPage from "./pages/RecipeDetailPage.jsx";
import RecipeGenerationPage from "./pages/RecipeGenerationPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SavedRecipesPage from "./pages/SavedRecipesPage.jsx";
import { getToken, removeToken, SIGNED_OUT_EVENT } from "./services/api.js";
import { dishIndexFromParam, pathForTab, paths, safeReturnPath, tabForPath } from "./routes.js";
import { clearSessionKeys, useSessionState } from "./utils/sessionState.js";

const sessionKeys = {
  recipes: "chefspark:tonight:recipes",
  cuisine: "chefspark:tonight:cuisine",
  difficulty: "chefspark:tonight:difficulty"
};

// Protected pages: without a token, go to login and come back afterwards.
function RequireAuth({ children }) {
  const location = useLocation();
  if (!getToken()) {
    return <Navigate to={paths.login} replace state={{ from: location.pathname }} />;
  }
  return children;
}

function WithNavigation({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <RequireAuth>
      <div className="app-shell bg-iron">
        <div className="phone-container bg-iron">
          {children}
          <BottomNav activePage={tabForPath(location.pathname)} onNavigate={(tab) => navigate(pathForTab(tab))} />
        </div>
      </div>
    </RequireAuth>
  );
}

function GeneratedDishRoute({ recipes }) {
  const { dish } = useParams();
  const navigate = useNavigate();
  const recipe = recipes[dishIndexFromParam(dish)];
  // The unsaved menu lives in this tab only; if it is gone, return to planning.
  if (!recipe) return <Navigate to={paths.cook} replace />;
  return <RecipeDetailPage key={`generated-${dish}`} generatedRecipe={recipe} onBack={() => navigate(paths.cook)} />;
}

function SavedRecipeRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <RecipeDetailPage key={`saved-${id}`} savedRecipeId={id} onBack={() => navigate(paths.shelf)} />;
}

export function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [generatedRecipes, setGeneratedRecipes] = useSessionState(sessionKeys.recipes, []);
  const [cuisine, setCuisine] = useSessionState(sessionKeys.cuisine, "Chinese");
  const [difficulty, setDifficulty] = useSessionState(sessionKeys.difficulty, "Easy");

  function signOut() {
    removeToken();
    clearSessionKeys(Object.values(sessionKeys));
    setGeneratedRecipes([]);
    setCuisine("Chinese");
    setDifficulty("Easy");
    navigate(paths.login, { replace: true });
  }

  // An expired or invalid token reported by the API also signs the user out.
  useEffect(() => {
    const onSignedOut = () => signOut();
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
  });

  // New page, new scroll position (the browser restores it on back where it can).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const afterSignIn = () => navigate(safeReturnPath(location.state?.from), { replace: true });
  const signedInHome = <Navigate to={paths.kitchen} replace />;

  return (
    <Routes>
      <Route path={paths.login} element={getToken() ? signedInHome
        : <LoginPage onLogin={afterSignIn} onShowRegister={() => navigate(paths.register, { state: location.state })} />} />
      <Route path={paths.register} element={getToken() ? signedInHome
        : <RegisterPage onRegister={afterSignIn} onShowLogin={() => navigate(paths.login, { state: location.state })} />} />

      <Route path={paths.kitchen} element={<WithNavigation>
        <IngredientsPage onGenerateRecipes={() => navigate(paths.cook)} onLogout={signOut} />
      </WithNavigation>} />

      <Route path={paths.cook} element={<WithNavigation>
        <RecipeGenerationPage
          recipes={generatedRecipes}
          setRecipes={setGeneratedRecipes}
          cuisine={cuisine}
          setCuisine={setCuisine}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          onViewRecipe={(recipe) => navigate(paths.generatedDish(Math.max(0, generatedRecipes.indexOf(recipe))))}
          onBack={() => navigate(paths.kitchen)}
        />
      </WithNavigation>} />
      <Route path={`${paths.cook}/dish/:dish`} element={<WithNavigation><GeneratedDishRoute recipes={generatedRecipes} /></WithNavigation>} />

      <Route path={paths.shelf} element={<WithNavigation>
        <SavedRecipesPage onBack={() => navigate(paths.kitchen)} onViewRecipe={(id) => navigate(paths.savedRecipe(id))} />
      </WithNavigation>} />
      <Route path={`${paths.shelf}/:id`} element={<WithNavigation><SavedRecipeRoute /></WithNavigation>} />

      <Route path="*" element={<Navigate to={paths.kitchen} replace />} />
    </Routes>
  );
}

// Animations follow the user's reduced-motion setting.
function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppRoutes />
    </MotionConfig>
  );
}

export default App;

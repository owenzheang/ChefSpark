import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router";
import BottomNav from "./components/BottomNav.jsx";
import SideRail from "./components/SideRail.jsx";
import CookingModePage from "./pages/CookingModePage.jsx";
import IngredientsPage from "./pages/IngredientsPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RecipeDetailPage from "./pages/RecipeDetailPage.jsx";
import RecipeGenerationPage, { addMenuPictures } from "./pages/RecipeGenerationPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SavedRecipesPage from "./pages/SavedRecipesPage.jsx";
import { getSavedRecipe, getToken, removeToken, saveRecipe, SIGNED_OUT_EVENT } from "./services/api.js";
import { dishIndexFromParam, pathForTab, paths, safeReturnPath, tabForPath } from "./routes.js";
import { clearSessionKeys, clearSessionPrefix, useSessionState } from "./utils/sessionState.js";
import { useMenuGeneration } from "./utils/useMenuGeneration.js";

// True while tonight's menu is being made, so the navigation can show it on the Cook tab from any page.
const CookingContext = createContext(false);

const sessionKeys = {
  recipes: "chefspark:tonight:recipes",
  cuisine: "chefspark:tonight:cuisine",
  difficulty: "chefspark:tonight:difficulty",
  diet: "chefspark:tonight:diet"
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
  const cooking = useContext(CookingContext);
  return (
    <RequireAuth>
      <div className="min-h-screen bg-iron">
        {/* Desktop: left rail plus a wide content area; each page sets its own max width and columns. */}
        <SideRail activePage={tabForPath(location.pathname)} onNavigate={(tab) => navigate(pathForTab(tab))} cooking={cooking}
          onLogout={() => window.dispatchEvent(new Event(SIGNED_OUT_EVENT))} />
        {/* "phone-container" is only a hook for the paused Zine's wider layout (zine.css). overflow-x-clip,
            not -hidden: hidden makes this a scroll container and breaks the desktop sticky columns. */}
        <div className="phone-container relative mx-auto min-h-screen w-full max-w-[430px] overflow-x-clip bg-iron lg:max-w-none lg:pl-36">
          {children}
          <BottomNav activePage={tabForPath(location.pathname)} onNavigate={(tab) => navigate(pathForTab(tab))} cooking={cooking} />
        </div>
      </div>
    </RequireAuth>
  );
}

// Storage key for one recipe's cooking progress and servings. Generated dishes include the title so a
// new menu never resumes an old dish's step.
const generatedKey = (dish, recipe) => `generated-${dish}-${recipe.title}`;

// Full-screen pages (Cooking Mode): same centred column, no bottom navigation.
function FullScreen({ children }) {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-iron">
        <div className="relative mx-auto min-h-screen w-full max-w-[430px] overflow-x-clip lg:max-w-[1280px]">{children}</div>
      </div>
    </RequireAuth>
  );
}

function GeneratedDishRoute({ recipes, setRecipes }) {
  const { dish } = useParams();
  const navigate = useNavigate();
  const index = dishIndexFromParam(dish);
  const recipe = recipes[index];
  // The unsaved menu lives in this tab only; if it is gone, return to planning.
  if (!recipe) return <Navigate to={paths.cook} replace />;
  // An accepted assistant version replaces this unsaved dish in tonight's menu.
  const adopt = (edited) => setRecipes((list) => list.map((item, position) => position === index ? edited : item));
  return <RecipeDetailPage key={`generated-${dish}`} generatedRecipe={recipe} plateFlightId={`dish-plate-${index}`}
    onBack={() => navigate(paths.cook, { state: { fromDish: index } })}
    servingsKey={generatedKey(dish, recipe)} onStartCooking={() => navigate(paths.generatedDishCooking(index))} onAdopt={adopt} />;
}

function SavedRecipeRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  // An accepted assistant version of a saved recipe is saved as a new recipe; the original stays.
  async function adopt(edited) {
    const data = await saveRecipe(edited);
    navigate(paths.savedRecipe(data.savedRecipe.id));
  }
  return <RecipeDetailPage key={`saved-${id}`} savedRecipeId={id} onBack={() => navigate(paths.shelf)}
    servingsKey={`saved-${id}`} onStartCooking={() => navigate(paths.savedRecipeCooking(id))} onAdopt={adopt} />;
}

function GeneratedCookingRoute({ recipes }) {
  const { dish } = useParams();
  const navigate = useNavigate();
  const index = dishIndexFromParam(dish);
  const recipe = recipes[index];
  if (!recipe) return <Navigate to={paths.cook} replace />;
  return <CookingModePage recipe={recipe} recipeKey={generatedKey(dish, recipe)}
    onExit={() => navigate(paths.generatedDish(index))} onSave={saveRecipe} />;
}

function SavedCookingRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ recipe: null, error: "" });
  useEffect(() => {
    let active = true;
    getSavedRecipe(id)
      .then((data) => active && setState({ recipe: data.recipe, error: "" }))
      .catch((error) => active && setState({ recipe: null, error: error.message }));
    return () => { active = false; };
  }, [id]);
  if (!state.recipe) {
    return (
      <main data-ds="" className="min-h-screen bg-iron px-6 pt-8">
        <p role={state.error ? "alert" : "status"} className="font-mono text-xs tracking-[0.16em] text-ash">
          {state.error || "LOADING RECIPE…"}
        </p>
      </main>
    );
  }
  return <CookingModePage recipe={state.recipe} recipeKey={`saved-${id}`} onExit={() => navigate(paths.savedRecipe(id))} />;
}

export function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [generatedRecipes, setGeneratedRecipes] = useSessionState(sessionKeys.recipes, []);
  const [cuisine, setCuisine] = useSessionState(sessionKeys.cuisine, "Chinese");
  const [difficulty, setDifficulty] = useSessionState(sessionKeys.difficulty, "Easy");
  const [diet, setDiet] = useSessionState(sessionKeys.diet, "Any");
  const generation = useMenuGeneration({
    setRecipes: setGeneratedRecipes,
    onRecipes: (recipes) => addMenuPictures(recipes, setGeneratedRecipes)
  });

  function signOut() {
    generation.reset();
    removeToken();
    clearSessionKeys(Object.values(sessionKeys));
    clearSessionPrefix("chefspark:"); // cooking progress and chosen servings too
    setGeneratedRecipes([]);
    setCuisine("Chinese");
    setDifficulty("Easy");
    setDiet("Any");
    navigate(paths.login, { replace: true });
  }

  // An expired or invalid token reported by the API also signs the user out.
  useEffect(() => {
    const onSignedOut = () => signOut();
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
  });

  // New page, new scroll position (the browser restores it on back where it can). Back on tonight's menu
  // from a dish, the menu scrolls to that dish instead (RecipeGenerationPage), so its plate can fly home.
  // A layout effect, so the scroll is settled before a flying plate measures where it lands.
  const fromDish = location.pathname === paths.cook && Number.isInteger(location.state?.fromDish) ? location.state.fromDish : undefined;
  useLayoutEffect(() => {
    if (fromDish === undefined) window.scrollTo(0, 0);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const afterSignIn = () => navigate(safeReturnPath(location.state?.from), { replace: true });
  const signedInHome = <Navigate to={paths.kitchen} replace />;

  return (
    <CookingContext.Provider value={generation.running}>
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
          generation={generation}
          cuisine={cuisine}
          setCuisine={setCuisine}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          diet={diet}
          setDiet={setDiet}
          onViewRecipe={(recipe) => navigate(paths.generatedDish(Math.max(0, generatedRecipes.indexOf(recipe))))}
          returnFromDish={fromDish}
          onBack={() => navigate(paths.kitchen)}
        />
      </WithNavigation>} />
      <Route path={`${paths.cook}/dish/:dish`} element={<WithNavigation><GeneratedDishRoute recipes={generatedRecipes} setRecipes={setGeneratedRecipes} /></WithNavigation>} />
      {/* Cooking Mode is full screen: signed in, but without the bottom navigation. */}
      <Route path={`${paths.cook}/dish/:dish/cooking`} element={<FullScreen><GeneratedCookingRoute recipes={generatedRecipes} /></FullScreen>} />

      <Route path={paths.shelf} element={<WithNavigation>
        <SavedRecipesPage onViewRecipe={(id) => navigate(paths.savedRecipe(id))} onCook={() => navigate(paths.cook)} />
      </WithNavigation>} />
      <Route path={`${paths.shelf}/:id`} element={<WithNavigation><SavedRecipeRoute /></WithNavigation>} />
      <Route path={`${paths.shelf}/:id/cooking`} element={<FullScreen><SavedCookingRoute /></FullScreen>} />

      <Route path="*" element={<Navigate to={paths.kitchen} replace />} />
    </Routes>
    </CookingContext.Provider>
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

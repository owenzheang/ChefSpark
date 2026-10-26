import { useRef, useState } from "react";
import { generateRecipes } from "../services/api.js";

// Tonight's menu generation lives in the app shell, not on the Plan tonight page, so moving to Kitchen
// or Shelf while it runs no longer cancels it (it takes 30–40 s). Only Cancel or signing out stops it.
// The result lands in tonight's menu (setRecipes); onRecipes runs once with the new dishes.
export function useMenuGeneration({ setRecipes, onRecipes = () => {} }) {
  const [state, setState] = useState({ running: false, startedAt: 0, cuisine: "", message: null });
  const request = useRef(null);

  async function generate({ cuisine, difficulty, diet }) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setRecipes([]);
    setState({ running: true, startedAt: Date.now(), cuisine, message: null });
    let message = null;
    let recipes = [];
    try {
      const data = await generateRecipes({ cuisine, difficulty, diet }, { signal: controller.signal });
      recipes = data.recipes || [];
      if (!recipes.length) {
        message = { tone: "error", text: "No dishes came back this time. Please try again." };
      } else {
        setRecipes(recipes);
        onRecipes(recipes);
        if (data.droppedForDiet > 0) {
          const count = data.droppedForDiet === 1 ? "1 dish" : `${data.droppedForDiet} dishes`;
          message = { tone: "info", text: `Left out ${count} that wasn't ${diet.toLowerCase()}.` };
        }
      }
    } catch (error) {
      message = error.name === "AbortError"
        ? { tone: "info", text: "Cancelled. Change your choices or try again." }
        : { tone: "error", text: error.message };
    }
    // A newer request (or sign-out) replaced this one: leave its state alone.
    if (request.current !== controller) return recipes;
    request.current = null;
    setState((value) => ({ ...value, running: false, message }));
    return recipes;
  }

  function cancel() {
    request.current?.abort();
  }

  // Sign-out: stop quietly and forget everything.
  function reset() {
    const current = request.current;
    request.current = null;
    current?.abort();
    setState({ running: false, startedAt: 0, cuisine: "", message: null });
  }

  return { ...state, generate, cancel, reset, setMessage: (message) => setState((value) => ({ ...value, message })) };
}

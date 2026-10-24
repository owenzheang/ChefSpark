import { useEffect, useRef, useState } from "react";
import { getAssistantStatus, proposeRecipeEdit, requestFoodImage } from "../services/api.js";
import Spark from "./Spark.jsx";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";
const ringButton = `min-h-11 rounded-full px-4 text-[15px] text-flour ring-1 ring-flour/40 hover:ring-flour disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
const notWorthAsking = /^(salt|water|sugar)$/i;

// Whether the server's assistant switch is on, and today's remaining requests. Hidden until known.
export function useAssistantStatus(initial = null) {
  const [status, setStatus] = useState(initial);
  useEffect(() => {
    if (initial) return;
    let active = true;
    getAssistantStatus().then((data) => active && setStatus(data)).catch(() => active && setStatus({ enabled: false }));
    return () => { active = false; };
  }, [initial]);
  return [status, setStatus];
}

const tierText = {
  minor: "Small change · same dish",
  variant: "New variation · kept as its own dish"
};

export function DiffList({ diff }) {
  const rows = [
    diff.title && ["Title", `${diff.title.from} → ${diff.title.to}`],
    ...diff.removed.map((name) => ["Out", name]),
    ...diff.added.map((item) => ["In", `${item.name} · ${item.amount}`]),
    ...diff.changed.map((item) => ["Amount", `${item.name} ${item.from} → ${item.to}`]),
    diff.steps.changed > 0 && ["Method", `${diff.steps.from} → ${diff.steps.to} steps, ${diff.steps.changed} rewritten`],
    diff.cookTime && ["Time", `${diff.cookTime.from} → ${diff.cookTime.to}`],
    diff.matchScore.from !== diff.matchScore.to && ["Match", `${diff.matchScore.from}% → ${diff.matchScore.to}%`]
  ].filter(Boolean);
  if (!rows.length) return <p className="text-[15px] text-soft">Nothing else changes.</p>;
  return (
    <dl className="flex flex-col gap-2 font-mono text-[13px]">
      {rows.map(([label, value], index) => (
        <div key={index} className="grid grid-cols-[72px_1fr] gap-3">
          <dt className={`tracking-[0.16em] uppercase ${label === "In" ? "text-cream" : "text-ash"}`}>{label}</dt>
          <dd className={`uppercase ${label === "Out" ? "text-ash line-through" : "text-flour"}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Fixed recipe changes (Phase 3). The AI proposes; the server checks the result and computes what
// changed; nothing replaces the recipe until the cook accepts it.
// A minor change keeps the dish's picture (the server copied it). A variation is a different dish: its
// picture is made only once the cook keeps it, while the original and its picture stay on screen.
// Without a picture (limit reached, failure) the variation keeps the empty plate.
export async function withVariantPicture(result, requestImage = requestFoodImage) {
  if (result.tier !== "variant") return result.recipe;
  const picture = await requestImage(result.recipe, "variant").catch(() => null);
  return picture?.imageUrl ? { ...result.recipe, imageUrl: picture.imageUrl } : result.recipe;
}

function RecipeAssistant({ recipe, isSaved, onAdopt, initialStatus = null }) {
  const [status, setStatus] = useAssistantStatus(initialStatus);
  const [choosing, setChoosing] = useState(false);
  const [pending, setPending] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [adopting, setAdopting] = useState(false);
  const request = useRef(null);
  const resultHeading = useRef(null);

  useEffect(() => () => request.current?.abort(), []);

  const structured = Array.isArray(recipe?.ingredients) && recipe.ingredients.every((item) => typeof item !== "string")
    && Array.isArray(recipe?.steps) && recipe.steps.every((step) => typeof step !== "string");
  if (!status?.enabled || !structured) return null;

  const editsLeft = 3 - (Number.isInteger(recipe.editCount) ? recipe.editCount : 0);
  const busy = Boolean(pending) || adopting;
  const missingChoices = recipe.ingredients.map((item) => item.name).filter((name) => !notWorthAsking.test(name));

  async function ask(change, label) {
    const controller = new AbortController();
    request.current = controller;
    setPending(label);
    setResult(null);
    setMessage("");
    setChoosing(false);
    try {
      const data = await proposeRecipeEdit({ recipe, ...change }, { signal: controller.signal });
      setResult(data);
      if (Number.isInteger(data.remainingToday)) setStatus((value) => ({ ...value, remainingToday: data.remainingToday }));
      requestAnimationFrame(() => resultHeading.current?.focus());
    } catch (error) {
      setMessage(error.name === "AbortError" ? "Cancelled. Your recipe is unchanged." : error.message);
    } finally {
      if (request.current === controller) request.current = null;
      setPending("");
    }
  }

  async function adopt() {
    setAdopting(true);
    setMessage("");
    try {
      await onAdopt(await withVariantPicture(result));
      setResult(null);
    } catch (error) {
      setMessage(error.message || "Couldn't keep this version. Please try again.");
    } finally {
      setAdopting(false);
    }
  }

  return (
    <section aria-labelledby="assistant-heading" className="mt-10 border-t border-flour/16 pt-6">
      <h2 id="assistant-heading" className="flex items-center gap-2 font-display text-[32px] italic">
        <Spark size={14} className="text-cream" />
        Adjust this dish
      </h2>
      <p className="mt-1 font-mono text-[11px] tracking-[0.16em] text-ash">
        AI SUGGESTS · YOU DECIDE · {status.remainingToday ?? 0} LEFT TODAY
      </p>

      {editsLeft <= 0 ? (
        <p className="mt-4 text-[15px] text-soft">This dish has been adjusted 3 times. Plan a new dish for a bigger change.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" aria-expanded={choosing} disabled={busy} onClick={() => setChoosing(!choosing)} className={ringButton}>
            I don't have…
          </button>
          <button type="button" disabled={busy} className={ringButton}
            onClick={() => ask({ action: "simpler" }, "Making it simpler…")}>
            Simpler &amp; quicker
          </button>
        </div>
      )}

      {choosing && !busy && (
        <fieldset className="mt-4">
          <legend className="mb-2 font-mono text-[11px] tracking-[0.16em] text-ash">WHICH ONE IS MISSING?</legend>
          <div className="flex flex-wrap gap-2">
            {missingChoices.map((name) => (
              <button key={name} type="button" className={`${ringButton} font-mono text-[13px] uppercase`}
                onClick={() => ask({ action: "missing", ingredient: name }, `Working around ${name}…`)}>
                {name}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {pending && (
        <p role="status" className="mt-5 flex items-center gap-2 text-[15px] text-flour">
          <Spark size={12} className="text-cream motion-safe:animate-spin" />
          {pending}
          <button type="button" onClick={() => request.current?.abort()}
            className={`ml-auto min-h-11 px-2 font-mono text-[11px] tracking-[0.16em] text-ash hover:text-flour ${focusRing}`}>CANCEL</button>
        </p>
      )}

      {message && (
        <p role="alert" className="mt-5 flex items-start gap-2 text-[15px] text-flour">
          <Spark size={12} className="mt-1 text-cream" />{message}
        </p>
      )}

      {result?.status === "rejected" && (
        <div className="mt-5 flex flex-col gap-3">
          <h3 ref={resultHeading} tabIndex={-1} className="font-mono text-[11px] tracking-[0.16em] text-ash focus:outline-none">NOT CHANGED</h3>
          <p className="text-[15px] text-flour">{result.reason}</p>
          <button type="button" onClick={() => setResult(null)} className={`self-start ${ringButton}`}>OK</button>
        </div>
      )}

      {result?.status === "proposed" && (
        <div className="mt-6 flex flex-col gap-4 border-y-2 border-dashed border-flour/40 py-4">
          <h3 ref={resultHeading} tabIndex={-1} className="flex flex-col gap-1 focus:outline-none">
            <span className="font-mono text-[11px] tracking-[0.16em] text-ash uppercase">
              {tierText[result.tier]}
            </span>
            <span className="font-display text-[28px] leading-none italic">{result.recipe.title}</span>
          </h3>
          <DiffList diff={result.diff} />
          <p className="text-[13px] text-ash">
            {isSaved ? "Saving adds it to your shelf as a new recipe; the original stays." : "Using it replaces this dish in tonight's menu."}
            {result.recipe.diet && " Check labels on packaged sauces and cheese."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={adopt} disabled={adopting}
              className={`min-h-12 rounded-full bg-cream px-5 font-semibold text-iron shadow-glow disabled:opacity-70 ${focusRing}`}>
              {adopting ? (result.tier === "variant" ? "Plating its picture…" : "Keeping…") : isSaved ? "Save as new recipe" : "Use this version"}
            </button>
            <button type="button" onClick={() => setResult(null)} disabled={adopting} className={ringButton}>Keep original</button>
          </div>
        </div>
      )}
    </section>
  );
}

export default RecipeAssistant;

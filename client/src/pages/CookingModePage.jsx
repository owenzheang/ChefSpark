import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import Spark from "../components/Spark.jsx";
import StoveDial from "../components/StoveDial.jsx";
import StepHelp from "../components/StepHelp.jsx";
import { findStepTimers, formatClock } from "../utils/cookingTimers.js";
import { ingredientsInStep, scaleIngredients } from "../utils/scaleRecipe.js";
import { useSessionState } from "../utils/sessionState.js";
import { useCookingTimers } from "../utils/useCookingTimers.js";
import { useWakeLock } from "../utils/useWakeLock.js";
import { playChime, prepareChime } from "../utils/chime.js";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";
const stepText = (step) => typeof step === "string" ? step : step?.instruction || "";

// Cooking Mode (DESIGN_SYSTEM.md): one step per screen in large type, timers read from the step
// text, the step's ingredients at the chosen servings, screen kept awake. Optional AI step help
// (StepHelp) only explains; it never changes the recipe.
function CookingModePage({ recipe, recipeKey, onExit, onSave, assistantStatus = null }) {
  const steps = Array.isArray(recipe?.steps) ? recipe.steps : [];
  const originalServings = Number.isFinite(recipe?.servings) && recipe.servings > 0 ? recipe.servings : null;
  const [stepIndex, setStepIndex] = useSessionState(`chefspark:cooking:${recipeKey}:step`, 0);
  const [servings, setServings] = useSessionState(`chefspark:servings:${recipeKey}`, originalServings);
  const [soundOn, setSoundOn] = useSessionState("chefspark:cooking:sound", true);
  const [announcement, setAnnouncement] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const stepHeading = useRef(null);
  const screenAwake = useWakeLock(true);

  const current = Math.min(Math.max(0, Number(stepIndex) || 0), steps.length);
  const finished = current >= steps.length;
  const rows = useMemo(() => scaleIngredients(recipe?.ingredients || [], originalServings, servings || originalServings),
    [recipe, originalServings, servings]);
  const scaledDifferently = originalServings && servings && servings !== originalServings;

  const { timers, ensure, start, pause, reset } = useCookingTimers((timer) => {
    if (soundOn) playChime();
    globalThis.navigator?.vibrate?.([200, 100, 200]);
    setAnnouncement(`Timer for step ${timer.step + 1} is done.`);
  }, { storageKey: `chefspark:cooking:${recipeKey}:timers` });

  const stepTimers = finished ? [] : findStepTimers(stepText(steps[current]));
  useEffect(() => {
    stepTimers.forEach((timer, index) => ensure(`${current}-${index}`, current, timer.seconds, timer.label));
  }, [current, stepTimers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    stepHeading.current?.focus({ preventScroll: true });
    window.scrollTo?.(0, 0);
  }, [current]);

  function go(delta) {
    setStepIndex(Math.min(Math.max(0, current + delta), steps.length));
  }

  useEffect(() => {
    function onKey(event) {
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function startTimer(id) {
    prepareChime(); // Browsers allow sound only after a user gesture like this one.
    start(id);
  }

  async function save() {
    setSaveState("saving");
    try {
      await onSave(recipe);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  const otherRunning = Object.values(timers).filter((timer) => timer.step !== current && (timer.endsAt || timer.done));

  // Rendered inside the step on a phone and in the right column on desktop; only one copy is visible.
  const dials = stepTimers.map((timer, index) => {
    const state = timers[`${current}-${index}`];
    if (!state) return null;
    const id = `${current}-${index}`;
    return (
      <section key={id} aria-label={`Timer: ${timer.label}`} className="mt-8 lg:mt-0 lg:mb-8">
        <StoveDial timer={state} onStart={() => startTimer(id)} onPause={() => pause(id)} onReset={() => reset(id)}
          size={index === 0 ? 216 : 160} />
      </section>
    );
  });
  const otherTimers = otherRunning.length > 0 && (
    <ul aria-label="Other timers" className="mt-8 flex flex-col border-t border-flour/16 lg:mt-0">
      {otherRunning.map((timer) => (
        <li key={timer.id} className="border-b border-flour/16">
          <button type="button" onClick={() => setStepIndex(timer.step)}
            className={`flex min-h-12 w-full items-center justify-between font-mono text-[13px] tracking-[0.12em] ${timer.done ? "text-cream" : "text-soft"} ${focusRing}`}>
            <span className="flex items-center gap-2">{timer.done && <Spark size={10} />}STEP {timer.step + 1}</span>
            <span>{timer.done ? "DONE" : formatClock(timer.remaining)}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  if (!steps.length) {
    return (
      <main data-ds="" className="min-h-screen bg-iron px-6 pt-6">
        <p className="text-soft">This recipe has no steps to cook through.</p>
        <button type="button" onClick={onExit} className={`mt-4 min-h-11 border-b border-cream font-semibold ${focusRing}`}>Back to recipe</button>
      </main>
    );
  }

  return (
    <main data-ds="" className="flex min-h-screen flex-col bg-iron px-6 pt-4 pb-[calc(104px+env(safe-area-inset-bottom,0px))] lg:px-12 lg:pt-10 lg:pb-16"
      style={{ backgroundImage: "radial-gradient(circle at 50% 42%, #ebcd981a, transparent 50%)" }}>
      <p role="status" aria-live="assertive" className="sr-only">{announcement}</p>

      <header className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate font-display text-xl italic">{recipe.title}</span>
        <span className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setSoundOn(!soundOn)} aria-pressed={soundOn}
            className={`min-h-11 px-2 font-mono text-[11px] tracking-[0.16em] text-ash hover:text-flour ${focusRing}`}>
            {soundOn ? "SOUND ON" : "SOUND OFF"}
          </button>
          <button type="button" onClick={onExit}
            className={`min-h-11 px-2 font-mono text-[11px] tracking-[0.16em] text-ash hover:text-flour ${focusRing}`}>EXIT</button>
        </span>
      </header>

      <div className="mt-2 flex items-center gap-2.5">
        <div role="progressbar" aria-label="Recipe progress" aria-valuemin={1} aria-valuemax={steps.length}
          aria-valuenow={Math.min(current + 1, steps.length)} className="flex flex-wrap items-center gap-2">
          {steps.map((_, index) => index === current
            ? <Spark key={index} size={14} className="text-cream" />
            : <span key={index} className={`size-2 rounded-full ${index < current ? "bg-flour" : "ring-1 ring-flour/40 ring-inset"}`} />)}
        </div>
        <span className="ml-auto font-mono text-[11px] tracking-[0.16em] text-ash">
          {finished ? "ALL STEPS DONE" : `STEP ${current + 1} OF ${steps.length}`}
        </span>
      </div>
      {screenAwake && <p className="mt-1 text-right font-mono text-[10px] tracking-[0.16em] text-ash">SCREEN STAYS ON</p>}

      {/* Desktop (DESIGN_SYSTEM.md): step list, the current step, and timers side by side. On a phone only
          the middle column shows, with timers inside the step and Back / Next fixed at the bottom. */}
      <div className="lg:mt-10 lg:grid lg:grid-cols-[240px_minmax(0,1fr)_280px] lg:items-start lg:gap-14">
      <nav aria-label="All steps" className="hidden lg:block">
        <h2 className="mb-3 font-mono text-[11px] tracking-[0.18em] text-ash">STEPS</h2>
        <ol className="flex flex-col">
          {steps.map((step, index) => (
            <li key={index}>
              <button type="button" onClick={() => setStepIndex(index)} aria-current={index === current && !finished ? "step" : undefined}
                className={`flex w-full items-start gap-2 border-t border-flour/16 py-2.5 text-left text-[14px] leading-snug ${index === current && !finished ? "text-cream" : index < current || finished ? "text-soft" : "text-ash hover:text-flour"} ${focusRing}`}>
                <span className="w-4 shrink-0 font-display text-[17px] italic">
                  {index === current && !finished ? <Spark size={11} className="mt-1" /> : index + 1}
                </span>
                <span className="line-clamp-2">{stepText(step)}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col">
      {finished ? (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-16 flex flex-col items-center gap-5 text-center">
          <Spark size={34} className="text-cream" />
          <h1 ref={stepHeading} tabIndex={-1} className="font-display text-[46px] leading-[0.95] italic focus:outline-none">
            Enjoy your {recipe.title}.
          </h1>
          <p className="text-soft">That's every step. Plate it up while it's hot.</p>
          {onSave && (
            <button type="button" onClick={save} disabled={saveState === "saving" || saveState === "saved"}
              className={`min-h-[52px] rounded-full bg-cream px-6 font-semibold text-iron shadow-glow disabled:opacity-70 ${focusRing}`}>
              {saveState === "saved" ? "Saved to your shelf" : saveState === "saving" ? "Saving…" : "Save to your shelf"}
            </button>
          )}
          {saveState === "error" && <p role="alert" className="text-sm text-flour">Couldn't save right now. Try again from the recipe.</p>}
        </motion.section>
      ) : (
        <motion.section key={current} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
          aria-labelledby="cooking-step" className="mt-8 flex flex-col">
          <h1 id="cooking-step" ref={stepHeading} tabIndex={-1} className="sr-only focus:outline-none">Step {current + 1}</h1>
          <p className="text-[27px] leading-[1.32] text-flour">{stepText(steps[current])}</p>

          {(() => {
            const here = ingredientsInStep(stepText(steps[current]), rows);
            return here.length > 0 && (
              <ul aria-label="Ingredients for this step" className="mt-5 flex flex-col gap-1.5 border-y-2 border-dashed border-flour/40 py-3 font-mono text-[14px] uppercase">
                {here.map((row) => (
                  <li key={row.name} className="flex justify-between gap-4"><span>{row.name}</span>{row.amount && <span>{row.amount}</span>}</li>
                ))}
              </ul>
            );
          })()}

          {originalServings && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] tracking-[0.16em] text-ash">SERVES</span>
              <span className="flex items-center gap-1">
                <button type="button" aria-label="Fewer servings" disabled={(servings || originalServings) <= 1}
                  onClick={() => setServings((value) => Math.max(1, (value || originalServings) - 1))}
                  className={`flex size-11 items-center justify-center rounded-full text-xl ring-1 ring-flour/40 disabled:opacity-40 ${focusRing}`}>−</button>
                <span aria-live="polite" className="w-10 text-center font-display text-2xl italic">{servings || originalServings}</span>
                <button type="button" aria-label="More servings" disabled={(servings || originalServings) >= 24}
                  onClick={() => setServings((value) => Math.min(24, (value || originalServings) + 1))}
                  className={`flex size-11 items-center justify-center rounded-full text-xl ring-1 ring-flour/40 disabled:opacity-40 ${focusRing}`}>+</button>
              </span>
            </div>
          )}
          {scaledDifferently && (
            <p className="mt-2 text-sm text-ash">Ingredient amounts are for {servings} servings; amounts written in the steps are for {originalServings}.</p>
          )}

          <div className="lg:hidden">{dials}</div>

          <StepHelp recipe={recipe} stepIndex={current} initialStatus={assistantStatus} />

          {current + 1 < steps.length && (
            <p className="mt-8 text-[15px] leading-relaxed text-ash">
              <span className="font-mono text-[10px] tracking-[0.2em]">NEXT · </span>{stepText(steps[current + 1])}
            </p>
          )}
        </motion.section>
      )}

      <div className="lg:hidden">{otherTimers}</div>

      <nav aria-label="Steps" className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-[430px] grid-cols-[1fr_2fr] gap-2.5 bg-iron px-6 pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))] lg:static lg:z-auto lg:mx-0 lg:mt-10 lg:max-w-[460px] lg:bg-transparent lg:px-0 lg:pb-0">
        <button type="button" onClick={() => go(-1)} disabled={current === 0}
          className={`min-h-[58px] rounded-full font-medium text-flour ring-1 ring-flour/40 disabled:opacity-40 ${focusRing}`}>Back</button>
        {finished ? (
          <button type="button" onClick={onExit}
            className={`min-h-[58px] rounded-full bg-cream font-semibold text-iron shadow-glow ${focusRing}`}>Exit Cooking Mode</button>
        ) : (
          <button type="button" onClick={() => go(1)}
            className={`min-h-[58px] rounded-full bg-cream font-semibold text-iron shadow-glow ${focusRing}`}>
            {current + 1 === steps.length ? "Finish" : "Next step →"}
          </button>
        )}
      </nav>
      </div>

      <aside aria-label="Timers" className="hidden lg:block">
        {!finished && dials}
        {otherTimers}
      </aside>
      </div>
    </main>
  );
}

export default CookingModePage;

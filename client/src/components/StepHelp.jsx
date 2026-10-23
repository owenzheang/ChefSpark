import { useEffect, useRef, useState } from "react";
import { explainStep } from "../services/api.js";
import { useAssistantStatus } from "./RecipeAssistant.jsx";
import Spark from "./Spark.jsx";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";
const questions = [
  ["meaning", "What does this mean?"],
  ["doneness", "How do I know it's done?"]
];

// Two fixed questions about the current Cooking Mode step. Answers explain; they never change the recipe.
function StepHelp({ recipe, stepIndex, initialStatus = null }) {
  const [status, setStatus] = useAssistantStatus(initialStatus);
  const [answers, setAnswers] = useState({});
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const request = useRef(null);

  useEffect(() => {
    request.current?.abort();
    setPending("");
    setMessage("");
  }, [stepIndex]);
  useEffect(() => () => request.current?.abort(), []);

  if (!status?.enabled) return null;

  async function ask(question) {
    const controller = new AbortController();
    request.current = controller;
    setPending(question);
    setMessage("");
    try {
      const data = await explainStep({ recipe, stepIndex, question }, { signal: controller.signal });
      setAnswers((value) => ({ ...value, [`${stepIndex}:${question}`]: data.answer }));
      if (Number.isInteger(data.remainingToday)) setStatus((value) => ({ ...value, remainingToday: data.remainingToday }));
    } catch (error) {
      if (error.name !== "AbortError") setMessage(error.message);
    } finally {
      if (request.current === controller) request.current = null;
      setPending("");
    }
  }

  const shown = questions.filter(([key]) => answers[`${stepIndex}:${key}`]);

  return (
    <section aria-label="Ask about this step" className="mt-6">
      <div className="flex flex-wrap gap-2">
        {questions.map(([key, label]) => (
          <button key={key} type="button" onClick={() => ask(key)} disabled={Boolean(pending) || Boolean(answers[`${stepIndex}:${key}`])}
            className={`min-h-11 rounded-full px-4 text-[14px] text-soft ring-1 ring-flour/40 hover:text-flour disabled:opacity-50 ${focusRing}`}>
            {pending === key ? "Thinking…" : label}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {shown.map(([key, label]) => (
          <div key={key} className="mt-4 border-l-2 border-cream pl-4">
            <p className="font-mono text-[10px] tracking-[0.16em] text-ash uppercase">{label}</p>
            <p className="mt-1 text-[17px] leading-relaxed text-flour">{answers[`${stepIndex}:${key}`]}</p>
          </div>
        ))}
        {shown.length > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-ash">
            <Spark size={8} className="text-cream" />AI help · the recipe's amounts and times still apply
          </p>
        )}
        {message && <p role="alert" className="mt-3 text-[14px] text-flour">{message}</p>}
      </div>
    </section>
  );
}

export default StepHelp;

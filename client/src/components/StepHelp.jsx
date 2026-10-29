import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { explainStep } from "../services/api.js";
import { useAssistantStatus } from "./RecipeAssistant.jsx";
import Spark from "./Spark.jsx";
import { duration, ember } from "../utils/motion.js";

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
  const reduce = useReducedMotion();

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
        {/* An answered question looks chosen (cream ring and spark), not disabled; tapping it again
            brings its answer into view instead of asking twice. */}
        {questions.map(([key, label]) => {
          const answered = Boolean(answers[`${stepIndex}:${key}`]);
          return (
            <button key={key} type="button" aria-pressed={answered}
              onClick={() => answered ? document.getElementById(`step-answer-${key}`)?.scrollIntoView({ block: "nearest" }) : ask(key)}
              disabled={!answered && Boolean(pending)}
              className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[14px] ring-1 disabled:opacity-50 ${answered ? "text-flour ring-cream" : "text-soft ring-flour/40 hover:text-flour"} ${focusRing}`}>
              {answered && <Spark size={9} className="text-cream" />}
              {pending === key ? "Thinking…" : label}
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {/* A new answer opens downward into its place rather than pushing the page all at once. */}
        <AnimatePresence initial={false}>
          {shown.map(([key, label]) => (
            <motion.div key={key} id={`step-answer-${key}`} className="overflow-hidden"
              initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              transition={{ height: { duration: duration.slow, ease: ember }, opacity: { duration: duration.slow, delay: 0.1 } }}>
              <div className="mt-4 border-l-2 border-cream pl-4">
                <p className="font-mono text-[10px] tracking-[0.16em] text-ash uppercase">{label}</p>
                <p className="mt-1 text-[17px] leading-relaxed text-flour">{answers[`${stepIndex}:${key}`]}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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

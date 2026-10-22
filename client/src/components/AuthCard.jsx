import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import Spark from "./Spark.jsx";

const fieldLabel = "font-mono text-[11px] tracking-[0.2em] text-ash uppercase";
const fieldShell = "flex min-h-12 items-center border-b border-flour focus-within:border-cream";
const fieldInput = "min-w-0 flex-1 bg-transparent py-3 text-lg text-flour outline-none placeholder:text-ash";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

// Shared sign-in / sign-up screen in the Ember style (DESIGN_SYSTEM.md).
export default function AuthCard({ title, subtitle, submitLabel, loadingLabel, onSubmit, switchPrompt, switchLabel, onSwitch }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsLoading(true);
    try {
      await onSubmit(email, password);
    } catch (error) {
      setMessage(error.message);
      setIsLoading(false);
    }
  }

  return (
    <main data-ds="" className="flex min-h-screen justify-center bg-iron bg-ember-glow px-6 pt-6 pb-10">
      <motion.section className="flex w-full max-w-[390px] flex-col"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}>
        <span className="flex items-center gap-2 font-display text-2xl italic">
          <Spark size={16} className="text-cream" />
          ChefSpark
        </span>

        <h1 className="mt-16 font-display text-[54px] leading-[0.95] tracking-[-0.01em] italic">{title}</h1>
        <p className="mt-4 text-base text-soft">{subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-7">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-email`} className={fieldLabel}>Email</label>
            <div className={fieldShell}>
              <input id={`${id}-email`} type="email" autoComplete="email" required value={email}
                onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className={fieldInput} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-password`} className={fieldLabel}>Password</label>
            <div className={fieldShell}>
              <input id={`${id}-password`} type={showPassword ? "text" : "password"} required value={password}
                autoComplete={submitLabel === "Sign in" ? "current-password" : "new-password"}
                onChange={(event) => setPassword(event.target.value)} placeholder="Password" className={fieldInput} />
              <button type="button" onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className={`flex size-11 shrink-0 items-center justify-center rounded-full text-ash hover:text-flour ${focusRing}`}>
                {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {message && (
              <motion.p role="alert" className="flex items-start gap-2 text-[15px] text-flour"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                <Spark size={12} className="mt-1 text-cream" />
                {message}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button type="submit" disabled={isLoading} whileTap={{ scale: 0.97 }}
            className={`mt-2 min-h-[58px] rounded-full bg-cream text-lg font-semibold text-iron shadow-glow transition-opacity disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}>
            {isLoading ? loadingLabel : submitLabel}
          </motion.button>
        </form>

        <p className="mt-8 flex flex-wrap items-center justify-center gap-x-2 text-base">
          <span className="text-ash">{switchPrompt}</span>
          <button type="button" onClick={onSwitch}
            className={`min-h-11 px-1 font-semibold text-flour underline decoration-cream decoration-1 underline-offset-[6px] ${focusRing}`}>
            {switchLabel}
          </button>
        </p>
      </motion.section>
    </main>
  );
}

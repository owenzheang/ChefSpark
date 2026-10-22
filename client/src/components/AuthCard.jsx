import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

const fieldShell = "flex min-h-13 items-center gap-3 rounded-tile border-2 border-ink bg-card px-3.5 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-cobalt";
const fieldInput = "min-w-0 flex-1 bg-transparent py-3 text-base text-ink outline-none placeholder:text-muted";
const fieldLabel = "font-mono text-xs tracking-[0.12em] uppercase";

// Shared sign-in / sign-up screen in the Riso Kitchen style (DESIGN_SYSTEM.md).
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
    <main data-ds="" className="flex min-h-screen items-center justify-center bg-paper bg-halftone px-5 py-10">
      <motion.section className="flex w-full max-w-[390px] flex-col gap-7"
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}>
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs tracking-[0.14em]">CHEFSPARK</span>
            <span className="rotate-3 rounded-full border-2 border-ink bg-tomato px-2.5 py-0.5 font-display text-sm font-extrabold">Cook tonight</span>
          </div>
          <h1 className="font-display text-[46px] leading-[0.92] font-extrabold tracking-[-0.045em]">{title}</h1>
          <p className="text-base text-muted">{subtitle}</p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-sheet border-2 border-ink bg-card p-5 shadow-hard-lg">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-email`} className={fieldLabel}>Email</label>
            <div className={fieldShell}>
              <Mail size={20} strokeWidth={2} aria-hidden="true" />
              <input id={`${id}-email`} type="email" autoComplete="email" required value={email}
                onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className={fieldInput} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-password`} className={fieldLabel}>Password</label>
            <div className={fieldShell}>
              <Lock size={20} strokeWidth={2} aria-hidden="true" />
              <input id={`${id}-password`} type={showPassword ? "text" : "password"} required value={password}
                autoComplete={submitLabel === "Sign in" ? "current-password" : "new-password"}
                onChange={(event) => setPassword(event.target.value)} placeholder="Password" className={fieldInput} />
              <button type="button" onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="-mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-cobalt-tint focus-visible:outline-3 focus-visible:outline-cobalt">
                {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {message && (
              <motion.p role="alert" className="rounded-tile border-2 border-ink bg-tomato-tint px-3.5 py-2.5 text-sm font-medium"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                {message}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button type="submit" disabled={isLoading} whileTap={{ scale: 0.97 }}
            className="mt-1 min-h-14 rounded-full border-2 border-ink bg-tomato font-display text-lg font-extrabold text-ink shadow-hard transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt disabled:cursor-not-allowed disabled:opacity-60">
            {isLoading ? loadingLabel : submitLabel}
          </motion.button>
        </form>

        <p className="flex flex-wrap items-center justify-center gap-x-2 text-base">
          <span className="text-muted">{switchPrompt}</span>
          <button type="button" onClick={onSwitch}
            className="min-h-11 px-1 font-bold underline decoration-2 underline-offset-4 hover:text-cobalt focus-visible:outline-3 focus-visible:outline-cobalt">
            {switchLabel}
          </button>
        </p>
      </motion.section>
    </main>
  );
}

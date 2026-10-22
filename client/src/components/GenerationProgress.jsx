import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

export const LONG_WAIT_SECONDS = 25;

// One server request makes all three dishes, so there is no real percentage to show.
// These lines describe what is happening without claiming steps are finished.
export function generationStage(seconds, { ingredientCount, cuisine }) {
  const items = `${ingredientCount} ingredient${ingredientCount === 1 ? "" : "s"}`;
  if (seconds < 4) return `Reading your ${items}`;
  if (seconds < 10) return `Picking three ${cuisine} dishes you can make`;
  if (seconds < 18) return "Writing clear steps for each dish";
  return "Checking what you have and what you'll need";
}

export function formatElapsed(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function GenerationProgress({ ingredientCount, cuisine, onCancel, initialSeconds = 0 }) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const started = Date.now() - initialSeconds * 1000;
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [initialSeconds]);

  const longWait = seconds >= LONG_WAIT_SECONDS;

  return (
    <section aria-labelledby="generation-progress-heading" aria-busy="true" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-card border-2 border-ink bg-card p-4 shadow-hard">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-cobalt text-white">
            <Sparkles size={20} strokeWidth={2.2} className="motion-safe:animate-pulse" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id="generation-progress-heading" className="font-display text-xl font-extrabold">Cooking up ideas…</h2>
            <p role="status" aria-live="polite" className="text-[15px] leading-snug">{generationStage(seconds, { ingredientCount, cuisine })}</p>
          </div>
          <span className="font-mono text-[13px]" aria-label={`${seconds} seconds elapsed`}>{formatElapsed(seconds)}</span>
        </div>

        <div role="progressbar" aria-label="Creating recipes" aria-valuetext="In progress"
          className="h-3 overflow-hidden rounded-full border-2 border-ink bg-cobalt-tint">
          <div className="size-full bg-stripes motion-safe:animate-stripes" />
        </div>

        {longWait && (
          <p className="text-sm text-muted">Taking longer than usual. You can keep waiting or cancel — we stop after one minute either way.</p>
        )}

        <button type="button" onClick={onCancel}
          className="flex min-h-11 items-center justify-center gap-1.5 self-start rounded-full border-2 border-ink bg-card px-4 text-sm font-bold hover:bg-tomato-tint focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
          <X size={16} strokeWidth={2.4} aria-hidden="true" />
          Cancel
        </button>
      </div>

      <ul aria-hidden="true" className="flex flex-col gap-4">
        {[1, 2, 3].map((dish) => (
          <li key={dish} className="overflow-hidden rounded-card border-2 border-ink bg-card">
            <div className="flex h-24 items-end border-b-2 border-ink bg-cobalt-tint bg-stripes p-3 motion-safe:animate-stripes">
              <span className="font-mono text-xs">DISH {dish} OF 3</span>
            </div>
            <div className="flex flex-col gap-2 p-4">
              <span className="h-5 w-3/4 rounded bg-ink/10" />
              <span className="h-3 w-1/2 rounded bg-ink/10" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

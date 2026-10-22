import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Spark from "./Spark.jsx";

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

const courses = ["I", "II", "III"];

export default function GenerationProgress({ ingredientCount, cuisine, onCancel, initialSeconds = 0 }) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const started = Date.now() - initialSeconds * 1000;
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [initialSeconds]);

  const longWait = seconds >= LONG_WAIT_SECONDS;

  return (
    <section aria-labelledby="generation-progress-heading" aria-busy="true" className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 border-y border-flour/16 py-5">
        <div className="flex items-start gap-3">
          <Spark size={22} className="mt-1 text-cream motion-safe:animate-pulse" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id="generation-progress-heading" className="font-display text-[30px] leading-none italic">Cooking up ideas…</h2>
            <p role="status" aria-live="polite" className="text-[15px] leading-snug text-soft">{generationStage(seconds, { ingredientCount, cuisine })}</p>
          </div>
          <span className="font-mono text-[13px] text-ash" aria-label={`${seconds} seconds elapsed`}>{formatElapsed(seconds)}</span>
        </div>

        <div role="progressbar" aria-label="Creating recipes" aria-valuetext="In progress"
          className="relative h-px overflow-hidden bg-flour/16">
          <div className="absolute inset-y-0 left-0 w-2/5 bg-cream motion-safe:animate-shimmer" />
        </div>

        {longWait && (
          <p className="text-sm text-ash">Taking longer than usual. You can keep waiting or cancel — we stop after one minute either way.</p>
        )}

        <button type="button" onClick={onCancel}
          className="flex min-h-11 items-center gap-1.5 self-start rounded-full px-4 text-sm font-medium text-flour ring-1 ring-flour/40 hover:ring-flour focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream">
          <X size={16} strokeWidth={2} aria-hidden="true" />
          Cancel
        </button>
      </div>

      <ul aria-hidden="true" className="flex flex-col items-center gap-10">
        {courses.map((course) => (
          <li key={course} className="flex flex-col items-center gap-3">
            <span className="font-display text-[22px] text-cream">{course}</span>
            <span className="flex size-[168px] items-center justify-center rounded-full ring-1 ring-flour/16">
              <Spark size={22} className="text-cream/60 motion-safe:animate-pulse" />
            </span>
            <span className="font-mono text-[11px] tracking-[0.2em] text-ash">COURSE {course} · PLATING</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { formatClock } from "../utils/cookingTimers.js";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

// A timer drawn like a stove knob (DESIGN_SYSTEM.md): tick marks and a cream arc for time left.
export default function StoveDial({ timer, onStart, onPause, onReset, size = 216 }) {
  const center = size / 2;
  const radius = size / 2 - 22;
  const circumference = 2 * Math.PI * radius;
  const fraction = timer.total > 0 ? timer.remaining / timer.total : 0;
  const running = Boolean(timer.endsAt);
  const ticks = Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * 2 * Math.PI;
    const outer = size / 2 - 4, inner = outer - (index % 3 === 0 ? 10 : 6);
    return [center + Math.sin(angle) * inner, center - Math.cos(angle) * inner, center + Math.sin(angle) * outer, center - Math.cos(angle) * outer];
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Done: the knob glows like a hot ring until the timer is reset. */}
        {timer.done && <span aria-hidden="true" className="absolute inset-[18px] rounded-full motion-safe:animate-ember-glow" />}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="absolute inset-0">
          {ticks.map(([x1, y1, x2, y2], index) => (
            <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-ash" />
          ))}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth="1" className="text-flour/16" />
          <circle cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${circumference * fraction} ${circumference}`} transform={`rotate(-90 ${center} ${center})`}
            className={`text-cream transition-[stroke-dasharray] duration-300 ${timer.done ? "motion-safe:animate-pulse" : ""}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="font-mono text-[10px] tracking-[0.2em] text-ash">{timer.done ? "DONE" : running ? "COOKING" : "TIMER"}</span>
          <span role="timer" aria-label={`${formatClock(timer.remaining)} left`} className="font-display text-[54px] leading-none">
            {formatClock(timer.remaining)}
          </span>
        </div>
      </div>
      <p className="text-center font-mono text-[11px] tracking-[0.14em] text-soft uppercase">{timer.label}</p>
      <div className="flex gap-3">
        {timer.done ? null : running ? (
          <button type="button" onClick={onPause}
            className={`min-h-12 min-w-28 rounded-full px-5 font-medium text-flour ring-1 ring-flour/40 hover:ring-flour ${focusRing}`}>Pause</button>
        ) : (
          <button type="button" onClick={onStart}
            className={`min-h-12 min-w-28 rounded-full bg-cream px-5 font-semibold text-iron ${focusRing}`}>
            {timer.remaining < timer.total ? "Resume" : "Start timer"}
          </button>
        )}
        {(timer.done || timer.remaining < timer.total) && (
          <button type="button" onClick={onReset}
            className={`min-h-12 rounded-full px-5 font-medium text-flour ring-1 ring-flour/40 hover:ring-flour ${focusRing}`}>Reset</button>
        )}
      </div>
    </div>
  );
}

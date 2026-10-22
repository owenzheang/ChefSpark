import { useCallback, useEffect, useRef } from "react";
import { useSessionState } from "./sessionState.js";

// Pure state transitions, exported for tests. A timer: { id, step, label, total, remaining, endsAt, done }.
// Running timers store endsAt (ms) so the countdown stays accurate even if ticks are delayed.
export function startTimer(timer, now) {
  if (timer.done || timer.endsAt) return timer;
  return { ...timer, endsAt: now + timer.remaining * 1000 };
}

export function pauseTimer(timer, now) {
  if (!timer.endsAt) return timer;
  return { ...timer, remaining: Math.max(0, (timer.endsAt - now) / 1000), endsAt: null };
}

export function resetTimer(timer) {
  return { ...timer, remaining: timer.total, endsAt: null, done: false };
}

export function tickTimer(timer, now) {
  if (!timer.endsAt) return timer;
  const remaining = Math.max(0, (timer.endsAt - now) / 1000);
  return remaining === 0 ? { ...timer, remaining: 0, endsAt: null, done: true } : { ...timer, remaining };
}

// Timers keep running while the cook moves between steps, and survive a refresh (they store an
// absolute end time in the tab's sessionStorage). onFinish(timer) fires once per finish.
const systemNow = () => Date.now();

export function useCookingTimers(onFinish, { storageKey = "chefspark:cooking:timers", now = systemNow } = {}) {
  const [timers, setTimers] = useSessionState(storageKey, {});
  const finished = useRef(onFinish);
  finished.current = onFinish;
  const clock = useRef(now);
  clock.current = now;
  const anyRunning = Object.values(timers).some((timer) => timer.endsAt);

  useEffect(() => {
    if (!anyRunning) return undefined;
    const interval = setInterval(() => {
      setTimers((current) => {
        const next = {};
        for (const [id, timer] of Object.entries(current)) {
          next[id] = tickTimer(timer, clock.current());
          if (next[id].done && !timer.done) queueMicrotask(() => finished.current?.(next[id]));
        }
        return next;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [anyRunning]);

  const ensure = useCallback((id, step, seconds, label) => {
    setTimers((current) => current[id] ? current
      : { ...current, [id]: { id, step, label, total: seconds, remaining: seconds, endsAt: null, done: false } });
  }, []);

  const update = useCallback((id, change) => {
    setTimers((current) => current[id] ? { ...current, [id]: change(current[id]) } : current);
  }, []);

  return {
    timers,
    ensure,
    start: (id) => update(id, (timer) => startTimer(timer, clock.current())),
    pause: (id) => update(id, (timer) => pauseTimer(timer, clock.current())),
    reset: (id) => update(id, resetTimer)
  };
}

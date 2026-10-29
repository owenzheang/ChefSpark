import { useEffect, useRef } from "react";
import { useInView } from "motion/react";

// Motion tokens (DESIGN_SYSTEM.md, "Motion"): warm and unhurried, like a hob coming up to heat.
// Only transform and opacity move; MotionConfig in App.jsx turns transform animations off for
// prefers-reduced-motion, and components that animate other values check useReducedMotion themselves.

// Ease-out with a long, soft landing ("ember").
export const ember = [0.22, 1, 0.36, 1];

export const duration = {
  fast: 0.15, // presses, small state changes
  base: 0.25, // steps, toggles
  slow: 0.45, // things arriving on screen
  fill: 1.1 // plate rings filling, numbers counting up
};

// The spark that marks the active tab or step glides to its new place.
export const sparkGlide = { type: "spring", stiffness: 420, damping: 34 };

// Courses of tonight's menu arrive one after another.
export const courseDelay = (index) => 0.15 + index * 0.18;

// For things that fill the first time they scroll into view: whether they have been seen, and how long
// to still wait. The delay counts from mount, so a plate already on screen waits for its course to
// arrive, while one scrolled to later starts at once.
export function useFirstView(ref, delay = 0) {
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const mountedAt = useRef(0);
  const startDelay = useRef(null);
  useEffect(() => { mountedAt.current = performance.now(); }, []);
  // Fixed the first time it is seen, so later renders never restart the animation.
  if (inView && startDelay.current === null) {
    startDelay.current = Math.max(0, delay - (performance.now() - mountedAt.current) / 1000);
  }
  return { inView, delay: startDelay.current ?? delay };
}

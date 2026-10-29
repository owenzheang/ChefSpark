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

// Plates that fly between screens (tonight's menu and the dish page). A plate leaving the screen notes
// where it was (in viewport coordinates, so page scrolling cannot skew it); the plate with the same id that
// arrives within a moment flies in from there. Notes are short-lived: an old one never starts a flight.
const departures = new Map();
const FLIGHT_WINDOW_MS = 700;

export function plateDeparted(id, element) {
  departures.set(id, { rect: element.getBoundingClientRect(), element, at: performance.now() });
}

// The departing plate's position, once. A note left by this same element (React StrictMode runs effects
// twice in development) is not a flight.
export function takeDeparture(id, element) {
  const note = departures.get(id);
  departures.delete(id);
  if (!note || note.element === element || performance.now() - note.at >= FLIGHT_WINDOW_MS) return null;
  return note.rect;
}

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

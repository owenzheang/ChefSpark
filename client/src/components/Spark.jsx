import { motion } from "motion/react";
import { duration, ember } from "../utils/motion.js";

// ChefSpark's four-point spark (DESIGN_SYSTEM.md). Decorative unless a label is given.
export default function Spark({ size = 12, className = "", label }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": "true" })}>
      <path d="M12 1.5C12.9 8.6 15.4 11.1 22.5 12 15.4 12.9 12.9 15.4 12 22.5 11.1 15.4 8.6 12.9 1.5 12 8.6 11.1 11.1 8.6 12 1.5Z" fill="currentColor" />
    </svg>
  );
}

// The spark on a primary button "lights" when pressed: it flares and turns while a ring of heat
// spreads out. burst counts presses; each new value plays it once.
export function IgniteSpark({ burst = 0, size, className = "" }) {
  return (
    <span className="relative flex" aria-hidden="true">
      {burst > 0 && (
        <motion.span key={`ring-${burst}`} className="absolute inset-0 rounded-full ring-2 ring-current"
          initial={{ scale: 0.4, opacity: 0.7 }} animate={{ scale: 2.8, opacity: 0 }}
          transition={{ duration: duration.slow * 1.4, ease: ember }} />
      )}
      <motion.span key={`spark-${burst}`} className="flex"
        initial={burst > 0 ? { scale: 1.7, rotate: -60 } : false} animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: duration.slow, ease: ember }}>
        <Spark size={size} className={className} />
      </motion.span>
    </span>
  );
}

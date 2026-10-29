import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { duration, ember, useFirstView } from "../utils/motion.js";

// Match score as a plate rim filling with cream (DESIGN_SYSTEM.md). Children render inside the plate.
// Pass decorative when the children already announce the score. imageSrc puts the dish on the plate
// (a round crop inside the rim); callers then show the score beside the ring instead of inside it.
// animated: the rim fills like a flame coming up the first time the plate scrolls into view, and the
// picture fades in once loaded; delay lines it up with the course arriving.
export default function PlateRing({ percent, size = 200, stroke = 3, decorative = false, imageSrc = null, animated = false, delay = 0, children }) {
  const value = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : null;
  const radius = size / 2 - stroke - 1;
  const inset = stroke + Math.max(3, Math.round(size / 40));
  const ref = useRef(null);
  const { inView, delay: wait } = useFirstView(ref, delay);
  const reduce = useReducedMotion();
  const still = !animated || reduce;
  const [loaded, setLoaded] = useState(false);
  const fill = value / 100;

  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }}>
      {imageSrc && (
        <motion.img src={imageSrc} alt="" loading="lazy" decoding="async" onLoad={() => setLoaded(true)}
          initial={still ? false : { opacity: 0, scale: 0.94 }} animate={still || loaded ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: duration.slow, ease: ember }}
          className="absolute rounded-full object-cover"
          style={{ inset, width: size - inset * 2, height: size - inset * 2 }} />
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0"
        {...(value === null || decorative ? { "aria-hidden": "true" } : { role: "img", "aria-label": `Match ${value} percent` })}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-flour/16" />
        {value !== null && value > 0 && (
          <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`} className="text-cream"
            initial={still ? { pathLength: fill } : { pathLength: 0, opacity: 0 }}
            animate={still || inView ? { pathLength: fill, opacity: 1 } : undefined}
            transition={{ pathLength: { duration: duration.fill, delay: wait, ease: ember }, opacity: { duration: 0.01, delay: wait } }} />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

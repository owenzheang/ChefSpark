import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";
import { duration, ember, useFirstView } from "../utils/motion.js";

// A number that counts up from 0 the first time it scrolls into view (with its plate ring). The markup
// always holds the final value, so server rendering, tests and reduced motion show it as is.
// animated={false}: shown as is (a plate that flew in from another screen is already full).
export default function CountUp({ value, suffix = "", delay = 0, animated = true, className = "", ...props }) {
  const ref = useRef(null);
  const { inView, delay: wait } = useFirstView(ref, delay);
  const still = useReducedMotion() || !animated;
  const final = `${value}${suffix}`;

  // Before the first paint, so the final number never flashes before counting starts.
  useLayoutEffect(() => {
    if (!still && ref.current) ref.current.textContent = `0${suffix}`;
  }, [still, suffix]);

  useEffect(() => {
    if (!inView || still) return undefined;
    const controls = animate(0, value, {
      duration: duration.fill, delay: wait, ease: ember,
      onUpdate: (latest) => { if (ref.current) ref.current.textContent = `${Math.round(latest)}${suffix}`; }
    });
    return () => controls.stop();
  }, [inView, still, value, suffix, wait]);

  return <span ref={ref} className={className} {...props}>{final}</span>;
}

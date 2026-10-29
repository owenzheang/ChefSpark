import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";
import { duration, ember, useFirstView } from "../utils/motion.js";

// A number that counts up from 0 the first time it scrolls into view (with its plate ring). The markup
// always holds the final value, so server rendering, tests and reduced motion show it as is.
export default function CountUp({ value, suffix = "", delay = 0, className = "", ...props }) {
  const ref = useRef(null);
  const { inView, delay: wait } = useFirstView(ref, delay);
  const reduce = useReducedMotion();
  const final = `${value}${suffix}`;

  // Before the first paint, so the final number never flashes before counting starts.
  useLayoutEffect(() => {
    if (!reduce && ref.current) ref.current.textContent = `0${suffix}`;
  }, [reduce, suffix]);

  useEffect(() => {
    if (!inView || reduce) return undefined;
    const controls = animate(0, value, {
      duration: duration.fill, delay: wait, ease: ember,
      onUpdate: (latest) => { if (ref.current) ref.current.textContent = `${Math.round(latest)}${suffix}`; }
    });
    return () => controls.stop();
  }, [inView, reduce, value, suffix, wait]);

  return <span ref={ref} className={className} {...props}>{final}</span>;
}

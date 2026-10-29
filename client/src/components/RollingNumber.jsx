import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { duration, ember } from "../utils/motion.js";

const roll = {
  enter: (direction) => ({ y: `${direction * 100}%`, opacity: 0 }),
  center: { y: "0%", opacity: 1 },
  exit: (direction) => ({ y: `${direction * -100}%`, opacity: 0 })
};

// A value (servings, an amount) that rolls like a kitchen counter when it changes: a bigger number comes
// up from below, a smaller one drops in from above. Text-only values roll up.
export default function RollingNumber({ value, className = "", ...props }) {
  const previous = useRef(value);
  const direction = parseFloat(value) < parseFloat(previous.current) ? -1 : 1;
  useEffect(() => { previous.current = value; }, [value]);

  return (
    <span className={`relative inline-flex justify-center overflow-hidden ${className}`} {...props}>
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.span key={value} custom={direction} variants={roll} initial="enter" animate="center" exit="exit"
          transition={{ duration: duration.base, ease: ember }} className="inline-block">
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

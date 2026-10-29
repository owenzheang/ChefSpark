import { motion } from "motion/react";
import Spark from "./Spark.jsx";
import { sparkGlide } from "../utils/motion.js";

const tabs = [
  { id: "ingredients", label: "Kitchen" },
  { id: "recipes", label: "Cook" },
  { id: "savedRecipes", label: "Shelf" }
];

// The active tab's spark glides to the new tab (one shared layoutId per nav); a busy tab's spark pulses.
export function NavSpark({ id, active, busy, size }) {
  const pulse = busy ? "motion-safe:animate-pulse" : "";
  if (active) {
    return (
      <motion.span layoutId={id} transition={sparkGlide} className="flex">
        <Spark size={size} className={`text-cream ${pulse}`} />
      </motion.span>
    );
  }
  return <Spark size={size} className={busy ? `text-cream ${pulse}` : "text-transparent"} />;
}

// Full-width bar with a top hairline and three text tabs; a cream spark marks the active tab
// (DESIGN_SYSTEM.md). Log out lives in the Kitchen header.
// cooking: tonight's menu is being made (from any page); the Cook tab's spark pulses until it is ready.
export default function BottomNav({ activePage, onNavigate, cooking = false }) {
  return (
    <nav aria-label="Main navigation" data-ds=""
      className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-[430px] grid-cols-3 lg:hidden border-t border-flour/16 bg-iron pb-[env(safe-area-inset-bottom,0px)] font-sans">
      {tabs.map(({ id, label }) => {
        const active = activePage === id;
        const busy = cooking && id === "recipes";
        return (
          <button key={id} type="button" onClick={() => onNavigate(id)} aria-current={active ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[15px] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-cream ${active ? "font-semibold text-flour" : "text-ash hover:text-flour"}`}>
            <NavSpark id="bottom-nav-spark" active={active} busy={busy} size={10} />
            <span>{label}</span>
            {busy && <span className="sr-only">(making tonight's menu)</span>}
          </button>
        );
      })}
    </nav>
  );
}

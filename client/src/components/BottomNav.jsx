import { motion } from "motion/react";
import { BookMarked, ChefHat, Refrigerator } from "lucide-react";

const tabs = [
  { id: "ingredients", label: "Kitchen", Icon: Refrigerator },
  { id: "recipes", label: "Cook", Icon: ChefHat },
  { id: "savedRecipes", label: "Shelf", Icon: BookMarked }
];

// Floating ink pill with three tabs (DESIGN_SYSTEM.md). Log out lives in the Kitchen header.
export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav aria-label="Main navigation" data-ds=""
      className="fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-10 mx-auto grid max-w-[398px] grid-cols-3 gap-1.5 rounded-full bg-ink p-1.5 font-sans">
      {tabs.map(({ id, label, Icon }) => {
        const active = activePage === id;
        return (
          <button key={id} type="button" onClick={() => onNavigate(id)} aria-current={active ? "page" : undefined}
            className={`relative flex min-h-12 items-center justify-center gap-1.5 rounded-full text-[15px] font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt ${active ? "text-ink" : "text-paper hover:text-white"}`}>
            {active && <motion.span layoutId="bottom-nav-active" aria-hidden="true"
              className="absolute inset-0 rounded-full bg-paper" transition={{ type: "spring", duration: 0.3, bounce: 0.12 }} />}
            <Icon size={18} strokeWidth={2.2} aria-hidden="true" className="relative" />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

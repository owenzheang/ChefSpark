import { NavSpark } from "./BottomNav.jsx";
import Spark from "./Spark.jsx";

const tabs = [
  { id: "ingredients", label: "Kitchen" },
  { id: "recipes", label: "Cook" },
  { id: "savedRecipes", label: "Shelf" }
];

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

// Desktop navigation (DESIGN_SYSTEM.md, "Desktop layout"): a 144px left rail replaces the bottom bar
// from the lg breakpoint. Same tabs and active spark; Log out sits at the bottom.
// cooking: tonight's menu is being made (from any page); the Cook tab's spark pulses until it is ready.
export default function SideRail({ activePage, onNavigate, onLogout, cooking = false }) {
  return (
    <nav aria-label="Main navigation" data-ds=""
      className="fixed inset-y-0 left-0 z-10 hidden w-36 flex-col gap-2 border-r border-flour/16 bg-iron px-6 py-8 font-sans lg:flex">
      <span className="mb-8 flex items-center gap-1.5 font-display text-[20px] italic">
        <Spark size={12} className="text-cream" />
        ChefSpark
      </span>
      {tabs.map(({ id, label }) => {
        const active = activePage === id;
        const busy = cooking && id === "recipes";
        return (
          <button key={id} type="button" onClick={() => onNavigate(id)} aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-1.5 text-left text-[15px] ${active ? "font-semibold text-flour" : "text-ash hover:text-flour"} ${focusRing}`}>
            <NavSpark id="rail-spark" active={active} busy={busy} size={9} />
            {label}
            {busy && <span className="sr-only">(making tonight's menu)</span>}
          </button>
        );
      })}
      <button type="button" onClick={onLogout}
        className={`mt-auto min-h-11 text-left font-mono text-[11px] tracking-[0.18em] text-ash hover:text-flour ${focusRing}`}>
        LOG OUT
      </button>
    </nav>
  );
}

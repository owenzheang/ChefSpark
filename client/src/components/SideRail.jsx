import Spark from "./Spark.jsx";

const tabs = [
  { id: "ingredients", label: "Kitchen" },
  { id: "recipes", label: "Cook" },
  { id: "savedRecipes", label: "Shelf" }
];

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

// Desktop navigation (DESIGN_SYSTEM.md, "Desktop layout"): a 112px left rail replaces the bottom bar
// from the lg breakpoint. Same tabs and active spark; Log out sits at the bottom.
export default function SideRail({ activePage, onNavigate, onLogout }) {
  return (
    <nav aria-label="Main navigation" data-ds=""
      className="fixed inset-y-0 left-0 z-10 hidden w-28 flex-col gap-2 border-r border-flour/16 bg-iron px-4 py-8 font-sans lg:flex">
      <span className="mb-6 flex items-center gap-1.5 font-display text-[19px] italic">
        <Spark size={12} className="text-cream" />
        ChefSpark
      </span>
      {tabs.map(({ id, label }) => {
        const active = activePage === id;
        return (
          <button key={id} type="button" onClick={() => onNavigate(id)} aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-1.5 text-left text-[15px] ${active ? "font-semibold text-flour" : "text-ash hover:text-flour"} ${focusRing}`}>
            <Spark size={9} className={active ? "text-cream" : "text-transparent"} />
            {label}
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

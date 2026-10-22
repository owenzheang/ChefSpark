import Spark from "./Spark.jsx";

const tabs = [
  { id: "ingredients", label: "Kitchen" },
  { id: "recipes", label: "Cook" },
  { id: "savedRecipes", label: "Shelf" }
];

// Full-width bar with a top hairline and three text tabs; a cream spark marks the active tab
// (DESIGN_SYSTEM.md). Log out lives in the Kitchen header.
export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav aria-label="Main navigation" data-ds=""
      className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-[430px] grid-cols-3 border-t border-flour/16 bg-iron pb-[env(safe-area-inset-bottom,0px)] font-sans">
      {tabs.map(({ id, label }) => {
        const active = activePage === id;
        return (
          <button key={id} type="button" onClick={() => onNavigate(id)} aria-current={active ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[15px] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-cream ${active ? "font-semibold text-flour" : "text-ash hover:text-flour"}`}>
            <Spark size={10} className={active ? "text-cream" : "text-transparent"} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

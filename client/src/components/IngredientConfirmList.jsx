import { X } from "lucide-react";
import IngredientCategoryIcon from "./IngredientCategoryIcon.jsx";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

const notes = {
  corrected: (said) => `From “${said}”. Did you mean this?`,
  unknown: () => "Not in our list. It will be added as written."
};

// Phase 5: what was understood from a typed or spoken list, checked by the cook before anything is saved.
export default function IngredientConfirmList({ items, alreadyHave = [], onRemove, onConfirm, onCancel, isAdding = false }) {
  const count = items.length;
  return (
    <section aria-labelledby="confirm-heading" className="mt-4 flex flex-col gap-3 border-y-2 border-dashed border-flour/40 py-3">
      <h2 id="confirm-heading" tabIndex={-1} className="font-mono text-[11px] tracking-[0.18em] text-ash focus:outline-none">
        CHECK BEFORE ADDING
      </h2>
      {count > 0 ? (
        <ul className="flex flex-col" aria-label="Ingredients to add">
          {items.map(({ name, status, said }) => (
            <li key={name} className="flex min-h-11 items-center justify-between gap-2 border-b border-flour/16 last:border-b-0">
              <span className="flex min-w-0 items-center gap-2">
                <IngredientCategoryIcon name={name} size={14} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-[14px] uppercase">{name}</span>
                  {notes[status] && <small className={`text-[12px] ${status === "unknown" ? "text-ash" : "text-cream"}`}>{notes[status](said)}</small>}
                </span>
              </span>
              <button type="button" aria-label={`Remove ${name}`} onClick={() => onRemove(name)} disabled={isAdding}
                className={`-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-ash hover:text-flour ${focusRing}`}>
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-soft">Nothing new to add.</p>
      )}
      {alreadyHave.length > 0 && (
        <p className="text-[13px] text-ash">Already in your kitchen: {alreadyHave.join(", ")}.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {count > 0 && (
          <button type="button" onClick={onConfirm} disabled={isAdding}
            className={`min-h-11 rounded-full bg-cream px-5 font-semibold text-iron disabled:opacity-70 ${focusRing}`}>
            {isAdding ? "Adding…" : `Add ${count} to kitchen`}
          </button>
        )}
        <button type="button" onClick={onCancel} disabled={isAdding}
          className={`min-h-11 rounded-full px-4 text-[15px] text-flour ring-1 ring-flour/40 hover:ring-flour ${focusRing}`}>
          Cancel
        </button>
      </div>
    </section>
  );
}

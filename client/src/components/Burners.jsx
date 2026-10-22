const levels = { Easy: 1, Medium: 2, Hard: 3 };

// Difficulty as lit stove rings (DESIGN_SYSTEM.md). Decorative: always shown next to the word.
// onCream switches to iron rings for use on a cream (selected) background.
export default function Burners({ difficulty, size = 9, onCream = false }) {
  const lit = levels[difficulty] || 0;
  const on = onCream ? "bg-iron" : "bg-cream";
  const off = onCream ? "ring-1 ring-iron/50 ring-inset" : "ring-1 ring-flour/40 ring-inset";
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 gap-1">
      {[1, 2, 3].map((ring) => (
        <span key={ring} style={{ width: size, height: size }} className={`rounded-full ${ring <= lit ? on : off}`} />
      ))}
    </span>
  );
}

// ChefSpark's four-point spark (DESIGN_SYSTEM.md). Decorative unless a label is given.
export default function Spark({ size = 12, className = "", label }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": "true" })}>
      <path d="M12 1.5C12.9 8.6 15.4 11.1 22.5 12 15.4 12.9 12.9 15.4 12 22.5 11.1 15.4 8.6 12.9 1.5 12 8.6 11.1 11.1 8.6 12 1.5Z" fill="currentColor" />
    </svg>
  );
}

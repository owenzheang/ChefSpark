// Match score as a plate rim filling with cream (DESIGN_SYSTEM.md). Children render inside the plate.
export default function PlateRing({ percent, size = 200, stroke = 3, children }) {
  const value = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : null;
  const radius = size / 2 - stroke - 1;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0"
        {...(value === null ? { "aria-hidden": "true" } : { role: "img", "aria-label": `Match ${value} percent` })}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-flour/16" />
        {value !== null && (
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${(circumference * value) / 100} ${circumference}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="text-cream" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

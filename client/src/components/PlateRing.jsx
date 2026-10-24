// Match score as a plate rim filling with cream (DESIGN_SYSTEM.md). Children render inside the plate.
// Pass decorative when the children already announce the score. imageSrc puts the dish on the plate
// (a round crop inside the rim); callers then show the score beside the ring instead of inside it.
export default function PlateRing({ percent, size = 200, stroke = 3, decorative = false, imageSrc = null, children }) {
  const value = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : null;
  const radius = size / 2 - stroke - 1;
  const circumference = 2 * Math.PI * radius;
  const inset = stroke + Math.max(3, Math.round(size / 40));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {imageSrc && (
        <img src={imageSrc} alt="" loading="lazy" decoding="async" className="absolute rounded-full object-cover"
          style={{ inset, width: size - inset * 2, height: size - inset * 2 }} />
      )}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0"
        {...(value === null || decorative ? { "aria-hidden": "true" } : { role: "img", "aria-label": `Match ${value} percent` })}>
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

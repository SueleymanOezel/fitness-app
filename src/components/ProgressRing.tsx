import type { CSSProperties } from 'react'

const RADIUS = 30
const LAENGE = 2 * Math.PI * RADIUS

/**
 * Ring als reine SVG-Grafik; die Füllung beim Mount ist CSS (.ring-fill in
 * index.css, unter reduced-motion aus), kein GSAP. Der Bogen entfällt bei 0,
 * weil die runde Kappe sonst einen Punkt zeichnen würde.
 */
export default function ProgressRing({ anteil, label, size = 72 }: { anteil: number; label: string; size?: number }) {
  const gefuellt = Math.min(1, Math.max(0, anteil))
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox="0 0 72 72" className="shrink-0 -rotate-90">
      <circle cx="36" cy="36" r={RADIUS} fill="none" strokeWidth="8" className="stroke-surface-raised" />
      {gefuellt > 0 && (
        <circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          // Only ever shows calories: nutrition orange.
          className="ring-fill stroke-chart-orange"
          strokeDasharray={LAENGE}
          strokeDashoffset={LAENGE * (1 - gefuellt)}
          style={{ '--ring-length': LAENGE } as CSSProperties}
        />
      )}
    </svg>
  )
}

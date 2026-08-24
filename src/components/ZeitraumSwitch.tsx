import { ZEITRAEUME, type Zeitraum } from '../lib/analysis/zeitraum'

/** Buttons rather than a select: four options, and one tap instead of two. */
export default function ZeitraumSwitch({
  wert,
  onChange,
}: {
  wert: Zeitraum
  onChange: (zeitraum: Zeitraum) => void
}) {
  return (
    <div>
      {ZEITRAEUME.map((zeitraum) => (
        <button
          key={String(zeitraum.wert)}
          type="button"
          aria-pressed={zeitraum.wert === wert}
          onClick={() => onChange(zeitraum.wert)}
        >
          {zeitraum.label}
        </button>
      ))}
    </div>
  )
}

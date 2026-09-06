import { ZEITRAEUME, type Zeitraum } from '../lib/analysis/zeitraum'
import Chip from './Chip'

/** Chips rather than a select: four options, and one tap instead of two. */
export default function ZeitraumSwitch({
  wert,
  onChange,
}: {
  wert: Zeitraum
  onChange: (zeitraum: Zeitraum) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ZEITRAEUME.map((zeitraum) => (
        <Chip key={String(zeitraum.wert)} active={zeitraum.wert === wert} onClick={() => onChange(zeitraum.wert)}>
          {zeitraum.label}
        </Chip>
      ))}
    </div>
  )
}

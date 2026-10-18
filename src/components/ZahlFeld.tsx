import { useId } from 'react'
import Pressable from './Pressable'
import { parseDecimal } from '../lib/parse-decimal'
import { fieldLabelClass, inputClass } from '../lib/ui-classes'
import { zahlDe } from '../lib/zahl'

/**
 * A number field with − and + beside it, sized for a thumb: between sets the
 * usual change is one step, not a new number typed on the keyboard. Used by the
 * live set form and the set correction dialog, so both behave the same.
 */
export default function ZahlFeld({
  label,
  wert,
  onChange,
  schritt,
  minimum,
  einheit,
  inputMode,
  ungueltig,
}: {
  label: string
  wert: string
  onChange: (next: string) => void
  schritt: number
  minimum: number
  einheit: string
  inputMode: 'decimal' | 'numeric'
  ungueltig: boolean
}) {
  const id = useId()
  function verschiebe(richtung: 1 | -1) {
    const aktuell = parseDecimal(wert)
    const basis = typeof aktuell === 'number' ? aktuell : richtung === 1 ? minimum - schritt : minimum
    onChange(zahlDe(Math.max(minimum, Math.round((basis + richtung * schritt) * 100) / 100)))
  }
  const schrittText = `${zahlDe(schritt)} ${einheit === 'kg' ? 'kg' : schritt === 1 ? einheit : `${einheit}en`}`
  // The label points at the input only: wrapping all three controls in one <label>
  // would name the "−" button instead (first labelable descendant).
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <span className="flex items-center gap-2">
        <Pressable
          variant="secondary"
          type="button"
          className="min-w-11 shrink-0 px-3!"
          aria-label={`${label}: ${schrittText} weniger`}
          onClick={() => verschiebe(-1)}
        >
          −
        </Pressable>
        <input
          id={id}
          className={`${inputClass} text-center`}
          inputMode={inputMode}
          value={wert}
          aria-invalid={ungueltig}
          onChange={(event) => onChange(event.target.value)}
        />
        <Pressable
          variant="secondary"
          type="button"
          className="min-w-11 shrink-0 px-3!"
          aria-label={`${label}: ${schrittText} mehr`}
          onClick={() => verschiebe(1)}
        >
          +
        </Pressable>
      </span>
    </div>
  )
}

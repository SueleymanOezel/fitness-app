import { useId } from 'react'
import { fieldLabelClass, inputClass } from '../../lib/ui-classes'
import type { UebungsOption } from '../../lib/analysis/training-charts'

/** Uebungsauswahl ueber den uebungsbezogenen Graphen T2 bis T5. */
export default function ExerciseSelect({
  optionen,
  wert,
  onChange,
}: {
  optionen: UebungsOption[]
  wert: string | null
  onChange: (exerciseId: string) => void
}) {
  // useId: die Seite zeigt vier dieser Felder, feste IDs waeren vierfach vergeben.
  const id = useId()
  if (optionen.length < 2) return null
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={fieldLabelClass}>Übung</label>
      <select id={id} className={inputClass} value={wert ?? ''} onChange={(event) => onChange(event.target.value)}>
        {optionen.map((option) => (
          <option key={option.exercise_id} value={option.exercise_id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import {
  EMPTY_INPUT,
  FIELD_LABELS,
  MEASUREMENT_FIELDS,
  parseBodyMetrics,
  today,
  type BodyMetricInput,
  type BodyMetricRow,
  type BodyMetricValues,
} from '../lib/body-metrics'
import { DatumBelegtError, ProfileWeightSyncError } from '../hooks/use-body-metrics'
import { cardClass, fieldLabelClass, inputClass } from '../lib/ui-classes'
import { VitaIcon } from './icons/VitaIcon'
import Pressable from './Pressable'

function inputFrom(entry: BodyMetricRow | undefined): BodyMetricInput {
  if (!entry) return EMPTY_INPUT
  const filled = { ...EMPTY_INPUT }
  for (const field of MEASUREMENT_FIELDS) {
    filled[field] = entry[field] == null ? '' : String(entry[field])
  }
  return filled
}

export default function BodyEntryForm({
  entry,
  onSave,
  onClose,
}: {
  entry?: BodyMetricRow
  onSave: (datum: string, values: BodyMetricValues) => Promise<void>
  onClose: () => void
}) {
  const [datum, setDatum] = useState(entry?.datum ?? today())
  const [draft, setDraft] = useState<BodyMetricInput>(() => inputFrom(entry))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const values = parseBodyMetrics(draft)
    if (!values) {
      setError(
        'Bitte mindestens einen plausiblen Wert eintragen (Gewicht 30–300 kg, Umfänge 10–300 cm, Körperfett 0–100 %).',
      )
      return
    }

    setSaving(true)
    try {
      await onSave(datum, values)
      onClose()
    } catch (err) {
      // ProfileWeightSyncError means body_metrics was already written — only the
      // profiles mirror failed afterwards. That is a save success from this
      // form's point of view; a stale-mirror notice belongs to the page that
      // owns the hook, not to this form.
      if (err instanceof ProfileWeightSyncError) {
        onClose()
        return
      }
      if (err instanceof DatumBelegtError) {
        setError('Für dieses Datum gibt es schon einen Eintrag.')
        return
      }
      // Nothing is cleared: the typed values are all the user has.
      setError('Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className={cardClass}>
        <label className={fieldLabelClass}>
          Datum
          <input
            className={inputClass}
            type="date"
            value={datum}
            // A future date — or 0007-08-24 from a mistyped year — would sort to
            // the top of the history and hold profiles.aktuelles_gewicht there.
            max={today()}
            onChange={(event) => setDatum(event.target.value)}
          />
        </label>
        {MEASUREMENT_FIELDS.map((field) => (
          <label key={field} className={fieldLabelClass}>
            {FIELD_LABELS[field]}
            <input
              className={inputClass}
              type="number"
              // Every one of these columns is numeric: without step="any" the
              // browser rejects 82,5 and aborts the submit before we see it.
              step="any"
              value={draft[field]}
              onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
            />
          </label>
        ))}
      </div>
      {error !== '' && <p role="alert">{error}</p>}
      <Pressable variant="primary" type="submit" disabled={saving}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="save" tone="mono" size={20} />
          Speichern
        </span>
      </Pressable>
      <Pressable variant="secondary" className="self-start" type="button" onClick={onClose}>
        Abbrechen
      </Pressable>
    </form>
  )
}

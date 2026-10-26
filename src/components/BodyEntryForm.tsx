import { useState, type FormEvent } from 'react'
import {
  EMPTY_INPUT,
  FIELD_LABELS,
  feldHinweis,
  ungueltigeFelder,
  type MeasurementField,
  MEASUREMENT_FIELDS,
  parseBodyMetrics,
  today,
  type BodyMetricInput,
  type BodyMetricRow,
  type BodyMetricValues,
  feldTeile,
} from '../lib/body-metrics'
import { DatumBelegtError, ProfileWeightSyncError } from '../hooks/use-body-metrics'
import { cardClass, fieldLabelClass, inputClass } from '../lib/ui-classes'
import { VitaIcon } from './icons/VitaIcon'
import Pressable from './Pressable'

function inputFrom(entry: BodyMetricRow | undefined, letztesGewicht: number | null): BodyMetricInput {
  // A new day starts from the last weight: the morning weigh-in is a small correction, not typing it all.
  if (!entry) return letztesGewicht == null ? EMPTY_INPUT : { ...EMPTY_INPUT, gewicht: String(letztesGewicht) }
  const filled = { ...EMPTY_INPUT }
  for (const field of MEASUREMENT_FIELDS) {
    filled[field] = entry[field] == null ? '' : String(entry[field])
  }
  return filled
}

export default function BodyEntryForm({
  entry,
  letztesGewicht = null,
  onSave,
  onClose,
}: {
  entry?: BodyMetricRow
  /** Shown in the weight field when there is no entry for the day yet. */
  letztesGewicht?: number | null
  onSave: (datum: string, values: BodyMetricValues) => Promise<void>
  onClose: () => void
}) {
  const [datum, setDatum] = useState(entry?.datum ?? today())
  const [draft, setDraft] = useState<BodyMetricInput>(() => inputFrom(entry, letztesGewicht))
  // True while the weight field still holds the untouched prefill (not a value the user typed).
  const [vorbelegt, setVorbelegt] = useState(!entry && letztesGewicht != null)
  const [error, setError] = useState('')
  const [falsch, setFalsch] = useState<MeasurementField[]>([])
  const [saving, setSaving] = useState(false)
  // Weight is the daily value; the rest stays folded unless this entry already has some.
  const [weitereOffen, setWeitereOffen] = useState(() =>
    MEASUREMENT_FIELDS.some((field) => field !== 'gewicht' && draft[field] !== ''),
  )

  function feld(field: (typeof MEASUREMENT_FIELDS)[number]) {
    return (
      <label key={field} className={fieldLabelClass}>
        {FIELD_LABELS[field]}
        <input
          id={`koerper-${field}`}
          aria-invalid={falsch.includes(field) || undefined}
          aria-describedby={falsch.includes(field) ? `koerper-${field}-fehler` : undefined}
          className={inputClass}
          type="number"
          // Every one of these columns is numeric: without step="any" the
          // browser rejects 82,5 and aborts the submit before we see it.
          step="any"
          value={draft[field]}
          data-autofocus={field === 'gewicht' ? true : undefined}
          onChange={(event) => {
            setDraft({ ...draft, [field]: event.target.value })
            if (field === 'gewicht') setVorbelegt(false)
            setFalsch((alt) => alt.filter((name) => name !== field))
          }}
        />
        {falsch.includes(field) && (
          <span id={`koerper-${field}-fehler`} className="text-sm text-danger-text">
            {feldHinweis(field)}
          </span>
        )}
      </label>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const fehlerhaft = ungueltigeFelder(draft)
    setFalsch(fehlerhaft)
    // A wrong measurement must not hide in the folded part; opened here, then left to the user,
    // so correcting it does not fold it away on the first keystroke.
    if (fehlerhaft.some((field) => field !== 'gewicht')) setWeitereOffen(true)
    if (fehlerhaft.length > 0) {
      setError(`Bitte prüfen: ${fehlerhaft.map((field) => feldTeile(field).name).join(', ')}.`)
      // After the render that unfolds the measurements, so a field inside them can take focus.
      requestAnimationFrame(() => document.getElementById(`koerper-${fehlerhaft[0]}`)?.focus())
      return
    }
    const values = parseBodyMetrics(draft)
    if (!values) {
      setError('Bitte mindestens einen Wert eintragen.')
      document.getElementById('koerper-gewicht')?.focus()
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
        <h2>{entry ? `Werte vom ${entry.datum.split('-').reverse().join('.')}` : 'Werte eintragen'}</h2>
        {/* At the top, not under the sticky buttons where it was covered; each field names its own fix. */}
        {error !== '' && (
          <p role="alert" className="text-danger-text">
            {error}
          </p>
        )}
        <label className={fieldLabelClass}>
          Datum
          <input
            className={inputClass}
            type="date"
            value={datum}
            // A future date — or 0007-08-24 from a mistyped year — would sort to
            // the top of the history and hold profiles.aktuelles_gewicht there.
            max={today()}
            onChange={(event) => {
              setDatum(event.target.value)
              // The prefill is the latest weight, maybe from after a backdated day: an untouched one goes.
              // ISO dates compare as strings; an emptied field is no backdate and keeps the prefill.
              if (vorbelegt && /^\d{4}-\d{2}-\d{2}$/.test(event.target.value) && event.target.value < today()) {
                setDraft((alt) => ({ ...alt, gewicht: '' }))
                setVorbelegt(false)
              }
            }}
          />
        </label>
        {feld('gewicht')}
        <details open={weitereOffen} onToggle={(event) => setWeitereOffen(event.currentTarget.open)}>
          <summary className="min-h-11 cursor-pointer py-2.5 font-medium">Umfänge und Körperfett</summary>
          <div className="flex flex-col gap-3 pt-2">
            {MEASUREMENT_FIELDS.filter((field) => field !== 'gewicht').map(feld)}
          </div>
        </details>
      </div>
      {/* Sticky: with the measurements unfolded the form is taller than the screen. */}
      <div className="sticky bottom-0 flex flex-col gap-2 rounded-3xl bg-bg/90 py-2 backdrop-blur-sm">
        <Pressable variant="primary" type="submit" disabled={saving}>
          <span className="inline-flex items-center justify-center gap-2">
            <VitaIcon name="save" tone="mono" size={20} />
            Speichern
          </span>
        </Pressable>
        <Pressable variant="secondary" type="button" onClick={onClose}>
          Abbrechen
        </Pressable>
      </div>
    </form>
  )
}

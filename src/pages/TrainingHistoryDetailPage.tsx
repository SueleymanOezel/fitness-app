import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWorkoutSession } from '../hooks/use-workout-session'
import { exerciseName } from '../lib/exercise-name'
import { parseDecimal } from '../lib/parse-decimal'
import { WIEDERHOLUNGEN_FEHLER } from '../lib/set-values'
import { cardClass, checkLabelClass, fieldLabelClass, inputClass, linkClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import { PressableLink } from '../components/Pressable'
import ConfirmDelete from '../components/ConfirmDelete'
import PageSkeleton from '../components/PageSkeleton'
import { zahlDe } from '../lib/zahl'

export default function TrainingHistoryDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  if (!sessionId) {
    return <PageSkeleton titel="Trainingseinheit" variante="liste" />
  }

  return <Detail sessionId={sessionId} />
}

function Detail({ sessionId }: { sessionId: string }) {
  const { session, sets, loading, updateSet, deleteSession } = useWorkoutSession(sessionId)
  const showToast = useToast()
  const navigate = useNavigate()

  if (loading) {
    return <PageSkeleton titel="Trainingseinheit" variante="liste" />
  }

  if (!session) {
    return (
      <div>
        <h1>Trainingseinheit</h1>
        <p role="alert">Diese Trainingseinheit gibt es nicht mehr.</p>
        <PressableLink to="/training/history" className={linkClass}>
          <VitaIcon name="back" tone="brand" size={20} />
          Zurück zur Historie
        </PressableLink>
      </div>
    )
  }

  async function run(action: () => Promise<void>, message: string) {
    try {
      await action()
    } catch {
      showToast(message, 'error')
    }
  }

  return (
    <div>
      <h1>Trainingseinheit</h1>
      {/* An unfinished session has no calorie result; "0 kcal" would read as a measurement. */}
      <p>{session.gesamt_kalorien == null ? 'nicht beendet' : `${Math.round(session.gesamt_kalorien)} kcal`}</p>
      <ul role="list" className="flex flex-col gap-3">
        {sets.map((set) => (
          <li key={set.id}>
            <div className={`${cardClass} w-full`}>
              <p className="font-semibold">{exerciseName(set.exercise) || 'Unbekannte Übung'}</p>
              <SetField
                label="Gewicht (kg)"
                stored={set.gewicht}
                onCommit={(value) => run(() => updateSet(set.id, { gewicht: value }), 'Speichern fehlgeschlagen.')}
              />
              <SetField
                label="Wiederholungen"
                stored={set.wiederholungen}
                integer
                pflichtMeldung={WIEDERHOLUNGEN_FEHLER}
                onCommit={(value) =>
                  run(() => updateSet(set.id, { wiederholungen: value }), 'Speichern fehlgeschlagen.')
                }
              />
              <SetField
                label="RIR"
                stored={set.rir}
                max={5}
                integer
                onCommit={(value) => run(() => updateSet(set.id, { rir: value }), 'Speichern fehlgeschlagen.')}
              />
              <label className={checkLabelClass}>
                <input
                  type="checkbox"
                  checked={set.ist_aufwaermsatz}
                  // Written straight through: there is nothing to type, so the
                  // blur-commit dance the number fields need buys nothing here.
                  onChange={(event) =>
                    run(
                      () => updateSet(set.id, { ist_aufwaermsatz: event.target.checked }),
                      'Speichern fehlgeschlagen.',
                    )
                  }
                />
                Aufwärmsatz
              </label>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDelete
        label="Session löschen"
        className="self-start"
        titel="Training löschen?"
        text="Alle Sätze dieser Trainingseinheit werden gelöscht. Das wirkt sich auch auf deine Analyse aus."
        onConfirm={async () => {
          await deleteSession()
          navigate('/training/history')
        }}
      />
      <PressableLink to="/training/history" className={linkClass}>
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zur Historie
      </PressableLink>
    </div>
  )
}

/**
 * Typed into local state and written on blur — a write per keystroke would
 * store every intermediate value and reload the list under the cursor.
 * An emptied field clears the value; Number('') is 0, not "unset".
 */
function SetField({
  label,
  stored,
  max,
  integer,
  pflichtMeldung,
  onCommit,
}: {
  label: string
  stored: number | null
  /** Rejected client-side too, so an out-of-range RIR never becomes a failed write. */
  max?: number
  /** rir and wiederholungen are integer columns: Postgres would round 2.6 to 3
   *  and store a value nobody typed. Gewicht is numeric and stays fractional. */
  integer?: boolean
  /** Gesetzt = Pflichtfeld (mindestens 1): leer oder 0 wird abgelehnt und diese Meldung gezeigt. */
  pflichtMeldung?: string
  onCommit: (value: number | null) => void
}) {
  const [draft, setDraft] = useState(stored == null ? '' : zahlDe(stored))
  const [meldung, setMeldung] = useState<string | null>(null)

  function commit() {
    const value = parseDecimal(draft, { integer })
    // Unverändert zuerst: ein alter Satz ohne Wiederholungen (null) darf beim bloßen
    // Antippen und Verlassen weder schreiben noch eine Meldung auslösen.
    if (value === stored) return
    // undefined = unlesbar (z. B. "1e1") oder Bruch in einem Ganzzahlfeld.
    const ungueltig = value === undefined || (value !== null && (value < 0 || (max != null && value > max)))
    const fehlt = pflichtMeldung !== undefined && (value === null || (value !== undefined && value < 1))
    if (ungueltig || fehlt) {
      setDraft(stored == null ? '' : zahlDe(stored))
      setMeldung(pflichtMeldung ?? null)
      return
    }
    setMeldung(null)
    onCommit(value)
  }

  return (
    <label className={fieldLabelClass}>
      {label}
      <input
        className={inputClass}
        value={draft}
        aria-invalid={meldung !== null}
        onChange={(event) => {
          setDraft(event.target.value)
          setMeldung(null)
        }}
        onBlur={commit}
      />
      {meldung && (
        <span role="alert" className="text-sm font-normal text-danger">
          {meldung}
        </span>
      )}
    </label>
  )
}

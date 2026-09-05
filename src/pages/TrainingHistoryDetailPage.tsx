import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWorkoutSession } from '../hooks/use-workout-session'
import { cardClass, buttonSecondaryClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'

export default function TrainingHistoryDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  if (!sessionId) {
    return (
      <div>
        <h1>Trainingseinheit</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Detail sessionId={sessionId} />
}

function Detail({ sessionId }: { sessionId: string }) {
  const { session, sets, loading, updateSet, deleteSession } = useWorkoutSession(sessionId)
  const showToast = useToast()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div>
        <h1>Trainingseinheit</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div>
        <h1>Trainingseinheit</h1>
        <p role="alert">Diese Trainingseinheit gibt es nicht mehr.</p>
        <Link to="/training/history">Zurück zur Historie</Link>
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
      <ul role="list" className="space-y-4">
        {sets.map((set) => (
          <li key={set.id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>
              {set.exercise?.name}
              <SetField
                label="Gewicht (kg)"
                stored={set.gewicht}
                onCommit={(value) => run(() => updateSet(set.id, { gewicht: value }), 'Speichern fehlgeschlagen.')}
              />
              <SetField
                label="Wiederholungen"
                stored={set.wiederholungen}
                integer
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
              <label>
                Aufwärmsatz
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
              </label>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={buttonSecondaryClass}
        onClick={async () => {
          try {
            await deleteSession()
          } catch {
            showToast('Löschen fehlgeschlagen.', 'error')
            return
          }
          navigate('/training/history')
        }}
      >
        Session löschen
      </button>
      <Link to="/training/history">Zurück zur Historie</Link>
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
  onCommit,
}: {
  label: string
  stored: number | null
  /** Rejected client-side too, so an out-of-range RIR never becomes a failed write. */
  max?: number
  /** rir and wiederholungen are integer columns: Postgres would round 2.6 to 3
   *  and store a value nobody typed. Gewicht is numeric and stays fractional. */
  integer?: boolean
  onCommit: (value: number | null) => void
}) {
  const [draft, setDraft] = useState(String(stored ?? ''))

  function commit() {
    const value = draft.trim() === '' ? null : Number(draft)
    const rejected =
      value !== null &&
      (!Number.isFinite(value) ||
        value < 0 ||
        (max != null && value > max) ||
        (integer === true && !Number.isInteger(value)))
    if (rejected) {
      setDraft(String(stored ?? ''))
      return
    }
    if (value === stored) return
    onCommit(value)
  }

  return (
    <label>
      {label}
      <input value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} />
    </label>
  )
}

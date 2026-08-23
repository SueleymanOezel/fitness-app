import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWorkoutSession } from '../hooks/use-workout-session'

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
  const [error, setError] = useState('')
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
    setError('')
    try {
      await action()
    } catch {
      setError(message)
    }
  }

  return (
    <div>
      <h1>Trainingseinheit</h1>
      {/* An unfinished session has no calorie result; "0 kcal" would read as a measurement. */}
      <p>{session.gesamt_kalorien == null ? 'nicht beendet' : `${Math.round(session.gesamt_kalorien)} kcal`}</p>
      <ul role="list">
        {sets.map((set) => (
          <li key={set.id}>
            {set.exercise?.name}
            <SetField
              label="Gewicht (kg)"
              stored={set.gewicht}
              onCommit={(value) => run(() => updateSet(set.id, { gewicht: value }), 'Speichern fehlgeschlagen.')}
            />
            <SetField
              label="Wiederholungen"
              stored={set.wiederholungen}
              onCommit={(value) =>
                run(() => updateSet(set.id, { wiederholungen: value }), 'Speichern fehlgeschlagen.')
              }
            />
          </li>
        ))}
      </ul>
      {error !== '' && <p role="alert">{error}</p>}
      <button
        type="button"
        onClick={async () => {
          setError('')
          try {
            await deleteSession()
          } catch {
            setError('Löschen fehlgeschlagen.')
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
  onCommit,
}: {
  label: string
  stored: number | null
  onCommit: (value: number | null) => void
}) {
  const [draft, setDraft] = useState(String(stored ?? ''))

  function commit() {
    const value = draft.trim() === '' ? null : Number(draft)
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
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

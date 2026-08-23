import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useWorkoutSession, type SessionExercise } from '../hooks/use-workout-session'

export default function WorkoutSessionPage() {
  const { session } = useSession()
  const { sessionId } = useParams<{ sessionId: string }>()
  const userId = session?.user.id

  if (!userId || !sessionId) {
    return (
      <div>
        <h1>Training</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <LiveSession userId={userId} sessionId={sessionId} />
}

function LiveSession({ userId, sessionId }: { userId: string; sessionId: string }) {
  const { profile } = useProfile(userId)
  const { session, exercises, sets, loading, logSet, completeSession } = useWorkoutSession(sessionId)
  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null)
  const [pause, setPause] = useState<{ until: number; sekunden: number } | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  if (loading) {
    return (
      <div>
        <h1>Training</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div>
        <h1>Training</h1>
        <p role="alert">Dieses Training gibt es nicht mehr.</p>
        <Link to="/training">Zurück zum Training</Link>
      </div>
    )
  }

  const gewichtKg = profile?.aktuelles_gewicht ?? null

  function pauseOver() {
    setPause(null)
    // The pause ends where the next set begins: stay on this exercise while it
    // still has target sets left, otherwise open the next one.
    const current = exercises.find((entry) => entry.exercise_id === openExerciseId)
    if (!current) return
    const done = sets.filter((set) => set.exercise_id === current.exercise_id).length
    if (current.ziel_saetze !== null && done >= current.ziel_saetze) {
      const sorted = [...exercises].sort((a, b) => a.reihenfolge - b.reihenfolge)
      const index = sorted.findIndex((entry) => entry.exercise_id === current.exercise_id)
      setOpenExerciseId(sorted[index + 1]?.exercise_id ?? null)
    }
  }

  async function complete() {
    if (gewichtKg === null) return
    setError('')
    try {
      await completeSession(gewichtKg)
      navigate('/training')
    } catch {
      setError('Training konnte nicht abgeschlossen werden.')
    }
  }

  return (
    <div>
      <h1>Training</h1>
      {pause !== null && <PauseTimer until={pause.until} sekunden={pause.sekunden} onDone={pauseOver} />}
      <ul>
        {exercises.map((entry) => (
          <li key={entry.exercise_id}>
            <button type="button" onClick={() => setOpenExerciseId(entry.exercise_id)}>
              {entry.name}
            </button>
            {openExerciseId === entry.exercise_id && (
              <SetForm
                exercise={entry}
                completedCount={sets.filter((set) => set.exercise_id === entry.exercise_id).length}
                onLog={async (satzNummer, gewicht, wiederholungen) => {
                  setError('')
                  try {
                    await logSet(entry.exercise_id, satzNummer, gewicht, wiederholungen)
                  } catch {
                    // No pause on a set that was never stored — it would suggest it counted.
                    setError('Satz konnte nicht gespeichert werden.')
                    return
                  }
                  if (entry.pausenzeit_sekunden) {
                    setPause({
                      until: Date.now() + entry.pausenzeit_sekunden * 1000,
                      sekunden: entry.pausenzeit_sekunden,
                    })
                  }
                }}
              />
            )}
          </li>
        ))}
      </ul>
      <p>{gewichtKg === null ? '—' : `${gewichtKg} kg`}</p>
      {gewichtKg === null && <p>Ohne Gewicht im Profil lässt sich der Verbrauch nicht berechnen.</p>}
      {error !== '' && <p role="alert">{error}</p>}
      <button type="button" disabled={gewichtKg === null} onClick={complete}>
        Training abschließen
      </button>
    </div>
  )
}

function SetForm({
  exercise,
  completedCount,
  onLog,
}: {
  exercise: SessionExercise
  completedCount: number
  onLog: (satzNummer: number, gewicht: number | null, wiederholungen: number | null) => Promise<void>
}) {
  const [gewicht, setGewicht] = useState('')
  const [wiederholungen, setWiederholungen] = useState('')

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        // Number('') is 0, not "unset" — an empty field must stay null, not become a fake 0.
        const gewichtValue = gewicht === '' ? null : Number(gewicht)
        const wiederholungenValue = wiederholungen === '' ? null : Number(wiederholungen)
        await onLog(completedCount + 1, gewichtValue, wiederholungenValue)
        setGewicht('')
        setWiederholungen('')
      }}
    >
      <p>{`Satz ${completedCount + 1}${exercise.ziel_saetze == null ? '' : ` von ${exercise.ziel_saetze}`}`}</p>
      <label>
        Gewicht (kg)
        <input value={gewicht} onChange={(event) => setGewicht(event.target.value)} />
      </label>
      <label>
        Wiederholungen
        <input value={wiederholungen} onChange={(event) => setWiederholungen(event.target.value)} />
      </label>
      <button type="submit">Satz abschließen</button>
    </form>
  )
}

function PauseTimer({ until, sekunden, onDone }: { until: number; sekunden: number; onDone: () => void }) {
  // Seeded from the configured pause rather than from Date.now(): reading the
  // clock during render is impure and would differ between renders.
  const [remainingSeconds, setRemainingSeconds] = useState(sekunden)
  // Held in a ref so a re-rendered parent does not restart the interval:
  // onDone is a fresh function on every render.
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    // A target timestamp, not a decrementing tick — recomputed from the wall
    // clock on every tick, so a backgrounded tab or a locked screen does not
    // desync the countdown from real elapsed time.
    const interval = setInterval(() => {
      const next = Math.max(0, Math.ceil((until - Date.now()) / 1000))
      setRemainingSeconds(next)
      if (next === 0) {
        clearInterval(interval)
        onDoneRef.current()
      }
    }, 250)
    return () => clearInterval(interval)
  }, [until])

  return <p>{`Pause: ${remainingSeconds}s`}</p>
}

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import {
  useWorkoutSession,
  type SessionExercise,
  type SetValues,
} from '../hooks/use-workout-session'

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
  const { profile, loading: profileLoading } = useProfile(userId)
  const { session, exercises, sets, loading, logSet, completeSession } = useWorkoutSession(sessionId)
  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null)
  const [pause, setPause] = useState<{ until: number; sekunden: number } | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Warm-ups are logged like any other set but count for nothing: not against
  // the target, and not in the volume charts the analysis area will draw.
  const workingSetCount = (exerciseId: string) =>
    sets.filter((set) => set.exercise_id === exerciseId && !set.ist_aufwaermsatz).length

  // Both queries are independent: without waiting for the profile too, a user
  // who has a weight stored is told for a moment that they have none.
  if (loading || profileLoading) {
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

  if (session.beendet_am !== null) {
    // Reopening a finished session (back button, bookmark) and completing it
    // again would recompute the duration from its original start and overwrite
    // the stored calories with a wildly inflated number.
    return (
      <div>
        <h1>Training</h1>
        <p role="alert">Dieses Training ist bereits abgeschlossen.</p>
        <Link to={`/training/history/${session.id}`}>Zur Trainingseinheit</Link>
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
    const done = workingSetCount(current.exercise_id)
    if (targetReached(current.ziel_saetze, done)) {
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
      <ul role="list">
        {exercises.map((entry) => (
          <li key={entry.exercise_id}>
            <button type="button" onClick={() => setOpenExerciseId(entry.exercise_id)}>
              {entry.name}
            </button>
            {openExerciseId === entry.exercise_id && (
              <SetForm
                exercise={entry}
                completedCount={workingSetCount(entry.exercise_id)}
                onLog={async (values) => {
                  setError('')
                  // satz_nummer stays a running order over every set of the
                  // exercise; only the displayed counting skips warm-ups.
                  const satzNummer =
                    sets.filter((set) => set.exercise_id === entry.exercise_id).length + 1
                  try {
                    await logSet(entry.exercise_id, satzNummer, values)
                  } catch {
                    // No pause on a set that was never stored — it would suggest it counted.
                    setError('Satz konnte nicht gespeichert werden.')
                    return false
                  }
                  if (entry.pausenzeit_sekunden) {
                    setPause({
                      until: Date.now() + entry.pausenzeit_sekunden * 1000,
                      sekunden: entry.pausenzeit_sekunden,
                    })
                  }
                  return true
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

/** 0 = nothing left in the tank, 5 = five more reps were there. */
const RIR_VALUES = [0, 1, 2, 3, 4, 5] as const

// ziel_saetze = 0 means "no target", not "already done": the schema has no CHECK
// on the column and the plan editor only rejects negative values.
function targetReached(zielSaetze: number | null, done: number) {
  return zielSaetze != null && zielSaetze > 0 && done >= zielSaetze
}

function SetForm({
  exercise,
  completedCount,
  onLog,
}: {
  exercise: SessionExercise
  completedCount: number
  onLog: (values: SetValues) => Promise<boolean>
}) {
  const [gewicht, setGewicht] = useState('')
  const [wiederholungen, setWiederholungen] = useState('')
  const [rir, setRir] = useState<number | null>(null)
  const [istAufwaermsatz, setIstAufwaermsatz] = useState(false)

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        // Number('') is 0, not "unset" — an empty field must stay null, not become a fake 0.
        const gewichtValue = gewicht === '' ? null : Number(gewicht)
        const wiederholungenValue = wiederholungen === '' ? null : Number(wiederholungen)
        // Only clear on a stored set: wiping the fields after a failed save
        // would force the user to type everything again.
        const stored = await onLog({
          gewicht: gewichtValue,
          wiederholungen: wiederholungenValue,
          rir,
          ist_aufwaermsatz: istAufwaermsatz,
        })
        if (!stored) return
        setGewicht('')
        setWiederholungen('')
        setRir(null)
        // ponytail: reset to a working set rather than keeping the toggle on.
        // Forgetting it on silently files real sets as warm-ups, which is the
        // more expensive mistake of the two.
        setIstAufwaermsatz(false)
      }}
    >
      <p>
        {istAufwaermsatz
          ? 'Aufwärmsatz — zählt nicht zum Ziel'
          : targetReached(exercise.ziel_saetze, completedCount)
            ? 'Alle Sätze erfasst'
            : `Satz ${completedCount + 1}${exercise.ziel_saetze == null ? '' : ` von ${exercise.ziel_saetze}`}`}
      </p>
      <label>
        Gewicht (kg)
        <input value={gewicht} onChange={(event) => setGewicht(event.target.value)} />
      </label>
      <label>
        Wiederholungen
        <input value={wiederholungen} onChange={(event) => setWiederholungen(event.target.value)} />
      </label>
      <label>
        Aufwärmsatz
        <input
          type="checkbox"
          checked={istAufwaermsatz}
          onChange={(event) => setIstAufwaermsatz(event.target.checked)}
        />
      </label>
      <fieldset>
        <legend>Wie viele hättest du noch geschafft?</legend>
        {RIR_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            // Pressed rather than disabled: tapping the same value again clears
            // it, so a mistap does not stick for the rest of the session.
            aria-pressed={rir === value}
            onClick={() => setRir(rir === value ? null : value)}
          >
            {value === 5 ? '5+' : String(value)}
          </button>
        ))}
      </fieldset>
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

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import {
  useWorkoutSession,
  type SessionExercise,
  type SessionSet,
  type SetValues,
} from '../hooks/use-workout-session'
import { cardClass, buttonPrimaryClass } from '../lib/ui-classes'
import Chip from '../components/Chip'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import { useExercises } from '../hooks/use-exercises'
import Dialog from '../components/Dialog'
import ExercisePicker from '../components/ExercisePicker'
import { useTrainingStreak } from '../hooks/use-training-streak'
import { streakText } from '../lib/streak'
import type { NeuerRekord } from '../lib/analysis/training-charts'

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
  const {
    session,
    exercises,
    sets,
    loading,
    logSet,
    completeSession,
    ermittleNeueRekorde,
    addExercisesToSession,
    removeExerciseFromSession,
  } = useWorkoutSession(sessionId)
  const { exercises: katalogUebungen } = useExercises(userId)
  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null)
  const [pause, setPause] = useState<{ until: number; sekunden: number } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [abschluss, setAbschluss] = useState<{
    neueRekorde: NeuerRekord[]
    dauerMinuten: number
    kalorien: number | null
  } | null>(null)
  const [abschlussLaeuft, setAbschlussLaeuft] = useState(false)
  const showToast = useToast()
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

  if (abschluss !== null) {
    return (
      <SessionCompletionScreen
        userId={userId}
        dauerMinuten={abschluss.dauerMinuten}
        kalorien={abschluss.kalorien}
        neueRekorde={abschluss.neueRekorde}
        onFertig={() => navigate('/training')}
      />
    )
  }

  // Set as soon as completion starts, before any await: once completeSession()
  // resolves, its internal reload() sets session.beendet_am non-null before
  // ermittleNeueRekorde() has finished — without this guard, a render in that
  // window would hit the "already completed" fallback below and flash it over
  // what should be the completion screen.
  if (abschlussLaeuft) {
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
        <Link to="/training" className="flex items-center justify-center gap-2">
          <VitaIcon name="back" tone="brand" size={20} />
          Zurück zum Training
        </Link>
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
        <Link to="/training" className="flex items-center justify-center gap-2">
          <VitaIcon name="back" tone="brand" size={20} />
          Zurück zum Training
        </Link>
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
    if (gewichtKg === null || session === null) return
    setAbschlussLaeuft(true)
    let ergebnis: { beendetAm: string; gesamtKalorien: number | null }
    try {
      ergebnis = await completeSession(gewichtKg)
    } catch {
      setAbschlussLaeuft(false)
      showToast('Training konnte nicht abgeschlossen werden.', 'error')
      return
    }
    let neueRekorde: NeuerRekord[] = []
    try {
      neueRekorde = await ermittleNeueRekorde()
    } catch {
      // PR-Ermittlung ist reiner Bonus-Inhalt — ein Fehler hier zeigt den
      // Abschluss-Screen trotzdem, nur ohne Rekord-Sektion.
    }
    const dauerMinuten = Math.round(
      (new Date(ergebnis.beendetAm).getTime() - new Date(session.gestartet_am).getTime()) / 60000,
    )
    setAbschluss({ neueRekorde, dauerMinuten, kalorien: ergebnis.gesamtKalorien })
  }

  async function addExercises(exerciseIds: string[]) {
    try {
      await addExercisesToSession(exerciseIds)
    } catch {
      showToast('Übung konnte nicht hinzugefügt werden.', 'error')
    }
  }

  async function removeExercise(sessionExerciseId: string) {
    try {
      await removeExerciseFromSession(sessionExerciseId)
    } catch {
      showToast('Übung konnte nicht entfernt werden.', 'error')
    }
  }

  return (
    <div>
      <h1>Training</h1>
      {pause !== null && <PauseTimer until={pause.until} sekunden={pause.sekunden} onDone={pauseOver} />}
      <ul role="list" className="space-y-4">
        {exercises.map((entry) => (
          <li key={entry.exercise_id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>
              <button type="button" onClick={() => setOpenExerciseId(entry.exercise_id)}>
                {entry.name}
              </button>
              {!sets.some((set) => set.exercise_id === entry.exercise_id) && (
                <button type="button" onClick={() => removeExercise(entry.id)}>
                  <span className="inline-flex items-center justify-center gap-2">
                    <VitaIcon name="delete" tone="mono" size={20} />
                    Entfernen
                  </span>
                </button>
              )}
              {openExerciseId === entry.exercise_id && (
                <LoggedSets sets={sets.filter((set) => set.exercise_id === entry.exercise_id)} />
              )}
              {openExerciseId === entry.exercise_id && (
                <SetForm
                  exercise={entry}
                  completedCount={workingSetCount(entry.exercise_id)}
                  onLog={async (values) => {
                    // satz_nummer stays a running order over every set of the
                    // exercise; only the displayed counting skips warm-ups.
                    const satzNummer =
                      sets.filter((set) => set.exercise_id === entry.exercise_id).length + 1
                    try {
                      await logSet(entry.exercise_id, satzNummer, values)
                    } catch {
                      // No pause on a set that was never stored — it would suggest it counted.
                      showToast('Satz konnte nicht gespeichert werden.', 'error')
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
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className={buttonPrimaryClass} onClick={() => setPickerOpen(true)}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="add" tone="mono" size={20} />
          Übung hinzufügen
        </span>
      </button>
      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the picker only while open resets the search field each
          time it opens, instead of keeping the last search around. */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)}>
        {pickerOpen && (
          <ExercisePicker
            exercises={katalogUebungen}
            alreadyAdded={exercises.map((entry) => entry.exercise_id)}
            // Same reasoning as the plan editor's picker: close synchronously
            // before the write resolves, since a toast raised while this
            // Dialog is still open would render invisible behind its native
            // top-layer backdrop.
            onAddSelected={(exerciseIds) => {
              void addExercises(exerciseIds)
              setPickerOpen(false)
            }}
          />
        )}
      </Dialog>
      <p>{gewichtKg === null ? '—' : `${gewichtKg} kg`}</p>
      {gewichtKg === null && <p>Ohne Gewicht im Profil lässt sich der Verbrauch nicht berechnen.</p>}
      <button type="button" className={buttonPrimaryClass} disabled={gewichtKg === null} onClick={complete}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="save" tone="mono" size={20} />
          Training abschließen
        </span>
      </button>
    </div>
  )
}

/** Eine Zahl mit einer Nachkommastelle, deutsch geschrieben — wie in PersonalRecordsList.tsx. */
function zahl(wert: number) {
  return wert.toFixed(1).replace('.', ',')
}

function SessionCompletionScreen({
  userId,
  dauerMinuten,
  kalorien,
  neueRekorde,
  onFertig,
}: {
  userId: string
  dauerMinuten: number
  kalorien: number | null
  neueRekorde: NeuerRekord[]
  onFertig: () => void
}) {
  const { streak, loading: streakLoading } = useTrainingStreak(userId)

  return (
    <div>
      <h1>Training abgeschlossen</h1>
      <p>{`${dauerMinuten} Minuten${kalorien == null ? '' : ` · ${Math.round(kalorien)} kcal`}`}</p>
      {neueRekorde.length > 0 && (
        <div className={cardClass}>
          <h2>Neue Rekorde</h2>
          <ul role="list" className="space-y-1">
            {neueRekorde.map((rekord) => (
              <li key={rekord.exercise_id}>
                {`${rekord.name} — neues 1RM ${zahl(rekord.neuesEinsRM)} kg (${
                  rekord.altesEinsRM == null ? 'erste Ausführung' : `vorher: ${zahl(rekord.altesEinsRM)} kg`
                })`}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p>{streakLoading ? '…' : streakText(streak)}</p>
      <button type="button" className={buttonPrimaryClass} onClick={onFertig}>
        Fertig
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

/**
 * Read-only history of what's already logged for the open exercise, shown
 * above SetForm so the next set (the form itself) reads as the one still
 * outstanding. Numbered like the "Satz N von M" status line below it — by
 * position among working sets, not by satz_nummer, which also counts
 * warm-ups (see workingSetCount).
 */
function LoggedSets({ sets }: { sets: SessionSet[] }) {
  if (sets.length === 0) return null

  const arbeitssaetze = sets.filter((set) => !set.ist_aufwaermsatz).sort((a, b) => a.satz_nummer - b.satz_nummer)
  const aufwaermsaetze = sets.filter((set) => set.ist_aufwaermsatz)

  return (
    <div>
      {aufwaermsaetze.length > 0 && (
        <p className="text-sm text-text-muted">
          {aufwaermsaetze.length} {aufwaermsaetze.length === 1 ? 'Aufwärmsatz' : 'Aufwärmsätze'}
        </p>
      )}
      {arbeitssaetze.length > 0 && (
        <ul role="list" aria-label="Erfasste Sätze" className="space-y-1">
          {arbeitssaetze.map((set, index) => (
            <li key={set.id} className="flex items-center gap-2">
              <VitaIcon name="save" tone="brand" size={20} />
              <span>{`Satz ${index + 1}: ${set.gewicht ?? '—'} kg × ${set.wiederholungen ?? '—'} Wdh.`}</span>
            </li>
          ))}
        </ul>
      )}
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
      <div className={cardClass}>
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
        <fieldset className="flex flex-wrap gap-2">
          <legend>Wie viele hättest du noch geschafft?</legend>
          {RIR_VALUES.map((value) => (
            <Chip
              key={value}
              active={rir === value}
              // Pressed rather than disabled: tapping the same value again clears
              // it, so a mistap does not stick for the rest of the session.
              onClick={() => setRir(rir === value ? null : value)}
            >
              {value === 5 ? '5+' : String(value)}
            </Chip>
          ))}
        </fieldset>
      </div>
      <button type="submit" className={buttonPrimaryClass}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="start" tone="mono" size={20} />
          Satz abschließen
        </span>
      </button>
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

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
import {
  cardClass,
  checkLabelClass,
  fieldLabelClass,
  inputClass,
  interactiveClass,
  labelClass,
  linkClass,
  statClass,
  stickyActionClass,
} from '../lib/ui-classes'
import Chip from '../components/Chip'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import { useExercises } from '../hooks/use-exercises'
import Dialog from '../components/Dialog'
import ExercisePicker from '../components/ExercisePicker'
import { useTrainingStreak } from '../hooks/use-training-streak'
import { streakText } from '../lib/streak'
import { parseDecimal } from '../lib/parse-decimal'
import type { NeuerRekord } from '../lib/analysis/training-charts'
import Pressable, { PressableLink } from '../components/Pressable'
import CompletionCelebration from '../components/CompletionCelebration'

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
        <PressableLink to="/training" className={linkClass}>
          <VitaIcon name="back" tone="brand" size={20} />
          Zurück zum Training
        </PressableLink>
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
        <div className="flex flex-col">
          <PressableLink to={`/training/history/${session.id}`} className={linkClass}>
            Zur Trainingseinheit
          </PressableLink>
          <PressableLink to="/training" className={linkClass}>
            <VitaIcon name="back" tone="brand" size={20} />
            Zurück zum Training
          </PressableLink>
        </div>
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
    if (session === null) return
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
      <ul role="list" className="flex flex-col gap-3">
        {exercises.map((entry) => (
          <li key={entry.exercise_id}>
            <div className={`${cardClass} w-full`}>
              <div className="flex items-center gap-2">
                <Pressable
                  variant="bare"
                  type="button"
                  className={`flex-1 border-0 m-0 bg-transparent px-0 text-left text-lg font-semibold ${interactiveClass}`}
                  onClick={() => setOpenExerciseId(entry.exercise_id)}
                >
                  {entry.name}
                </Pressable>
                {!sets.some((set) => set.exercise_id === entry.exercise_id) && (
                  <Pressable
                    variant="danger"
                    type="button"
                    className="px-3! py-2! text-sm"
                    onClick={() => removeExercise(entry.id)}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <VitaIcon name="delete" tone="mono" size={16} />
                      Entfernen
                    </span>
                  </Pressable>
                )}
              </div>
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
      <Pressable variant="secondary" type="button" className="w-full" onClick={() => setPickerOpen(true)}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="add" tone="mono" size={20} />
          Übung hinzufügen
        </span>
      </Pressable>
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
      <div className="flex flex-col gap-2">
        <p className={labelClass}>Körpergewicht für die kcal-Berechnung</p>
        <p className="text-xl font-bold tabular-nums">{gewichtKg === null ? '—' : `${gewichtKg} kg`}</p>
        {gewichtKg === null && (
          <>
            <p>Ohne Gewicht im Profil lässt sich der Verbrauch nicht berechnen.</p>
            <Link to="/profile" className={linkClass}>
              Gewicht im Profil eintragen
            </Link>
          </>
        )}
      </div>
      <Pressable variant="primary" type="button" className={stickyActionClass} onClick={complete}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="save" tone="mono" size={20} />
          Training abschließen
        </span>
      </Pressable>
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
      <CompletionCelebration>
        <div className="flex flex-col gap-6">
          <h1 className="text-center">Training abgeschlossen</h1>
          <dl className="grid grid-cols-2 gap-4">
            <Kennzahl label="Dauer" wert={dauerMinuten} einheit="Minuten" />
            {kalorien != null && <Kennzahl label="Verbrauch" wert={Math.round(kalorien)} einheit="kcal" />}
          </dl>
          {neueRekorde.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2>Neue Rekorde</h2>
              <ul role="list" className="flex flex-col gap-3">
                {neueRekorde.map((rekord) => (
                  <li key={rekord.exercise_id} data-pr-card className={`${cardClass} relative overflow-hidden`}>
                    <span
                      data-sweep
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-0 bg-linear-to-r from-transparent via-accent/30 to-transparent"
                    />
                    <p className="font-semibold">{rekord.name}</p>
                    <p className="text-2xl font-bold tracking-tight tabular-nums">{`${zahl(rekord.neuesEinsRM)} kg`}</p>
                    <p className={labelClass}>
                      {rekord.altesEinsRM == null ? 'erste Ausführung' : `vorher: ${zahl(rekord.altesEinsRM)} kg`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p data-reveal>{streakLoading ? '…' : streakText(streak)}</p>
        </div>
      </CompletionCelebration>
      <Pressable variant="primary" type="button" className={stickyActionClass} onClick={onFertig}>
        Fertig
      </Pressable>
    </div>
  )
}

function Kennzahl({ label, wert, einheit }: { label: string; wert: number; einheit: string }) {
  return (
    <div className={cardClass}>
      <dt className={labelClass}>{label}</dt>
      <dd>
        <span className={statClass} data-count-to={wert}>{wert}</span>{' '}
        <span className={labelClass}>{einheit}</span>
      </dd>
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
  // Snapshot beim Aufklappen: nur danach erfasste Sätze blenden ein.
  const [bekannteIds] = useState(() => new Set(sets.map((set) => set.id)))
  if (sets.length === 0) return null

  const arbeitssaetze = sets.filter((set) => !set.ist_aufwaermsatz).sort((a, b) => a.satz_nummer - b.satz_nummer)
  const aufwaermsaetze = sets.filter((set) => set.ist_aufwaermsatz)

  return (
    <div className="space-y-2">
      {aufwaermsaetze.length > 0 && (
        <p className="text-sm text-text-muted">
          {aufwaermsaetze.length} {aufwaermsaetze.length === 1 ? 'Aufwärmsatz' : 'Aufwärmsätze'}
        </p>
      )}
      {arbeitssaetze.length > 0 && (
        <table aria-label="Erfasste Sätze" className="w-full text-left tabular-nums">
          <thead>
            <tr className={labelClass}>
              <th className="py-1 font-medium">Satz</th>
              <th className="py-1 font-medium">kg</th>
              <th className="py-1 font-medium">Wdh.</th>
              <th className="py-1 font-medium">RIR</th>
            </tr>
          </thead>
          <tbody>
            {arbeitssaetze.map((set, index) => (
              <tr
                key={set.id}
                className={`border-t border-text-muted/20 ${bekannteIds.has(set.id) ? '' : 'row-in'}`}
              >
                <td className="py-1">{index + 1}</td>
                <td className="py-1">{set.gewicht ?? '—'}</td>
                <td className="py-1">{set.wiederholungen ?? '—'}</td>
                <td className="py-1">{set.rir ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const [fehler, setFehler] = useState<{ gewicht: boolean; wiederholungen: boolean }>({
    gewicht: false,
    wiederholungen: false,
  })

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault()
        const gewichtValue = parseDecimal(gewicht)
        const wiederholungenValue = parseDecimal(wiederholungen, { integer: true })
        // Refuse rather than store the set without the value: "22,5" used to become NaN and land as null.
        const gewichtUngueltig = gewichtValue === undefined || (gewichtValue !== null && gewichtValue < 0)
        const wiederholungenUngueltig =
          wiederholungenValue === undefined || (wiederholungenValue !== null && wiederholungenValue < 0)
        setFehler({ gewicht: gewichtUngueltig, wiederholungen: wiederholungenUngueltig })
        if (gewichtUngueltig || wiederholungenUngueltig) return
        // Only clear on a stored set: wiping the fields after a failed save
        // would force the user to type everything again.
        const stored = await onLog({
          gewicht: gewichtValue ?? null,
          wiederholungen: wiederholungenValue ?? null,
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
      <div className="flex flex-col gap-3">
        <p>
          {istAufwaermsatz
            ? 'Aufwärmsatz — zählt nicht zum Ziel'
            : targetReached(exercise.ziel_saetze, completedCount)
              ? 'Alle Sätze erfasst'
              : `Satz ${completedCount + 1}${exercise.ziel_saetze == null ? '' : ` von ${exercise.ziel_saetze}`}`}
        </p>
        <label className={fieldLabelClass}>
          Gewicht (kg)
          <input
            className={inputClass}
            inputMode="decimal"
            value={gewicht}
            aria-invalid={fehler.gewicht}
            onChange={(event) => setGewicht(event.target.value)}
          />
        </label>
        {fehler.gewicht && (
          <p role="alert" className="text-sm text-danger">
            Gewicht als Zahl ab 0 eingeben, z. B. 22,5.
          </p>
        )}
        <label className={fieldLabelClass}>
          Wiederholungen
          <input
            className={inputClass}
            inputMode="numeric"
            value={wiederholungen}
            aria-invalid={fehler.wiederholungen}
            onChange={(event) => setWiederholungen(event.target.value)}
          />
        </label>
        {fehler.wiederholungen && (
          <p role="alert" className="text-sm text-danger">
            Wiederholungen als ganze Zahl ab 0 eingeben.
          </p>
        )}
        <label className={checkLabelClass}>
          <input
            type="checkbox"
            checked={istAufwaermsatz}
            onChange={(event) => setIstAufwaermsatz(event.target.checked)}
          />
          Aufwärmsatz
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
      <Pressable variant="primary" type="submit">
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="start" tone="mono" size={20} />
          Satz abschließen
        </span>
      </Pressable>
    </form>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- exportiert für Tests
export function formatPause(sekunden: number) {
  return `${Math.floor(sekunden / 60)}:${String(sekunden % 60).padStart(2, '0')}`
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

  return (
    <div className={`${cardClass} sticky top-0 z-10`} role="timer">
      <p className={labelClass}>Pause</p>
      <p className={statClass}>{formatPause(remainingSeconds)}</p>
    </div>
  )
}

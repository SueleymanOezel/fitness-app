import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import {
  useLetzteWerte,
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
import RirChips from '../components/RirChips'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import { useExercises } from '../hooks/use-exercises'
import Dialog from '../components/Dialog'
import ExercisePicker from '../components/ExercisePicker'
import SetEditDialog from '../components/SetEditDialog'
import { useTrainingStreak } from '../hooks/use-training-streak'
import { streakText } from '../lib/streak'
import { parseSetInput } from '../lib/set-values'
import { parseDecimal } from '../lib/parse-decimal'
import type { NeuerRekord } from '../lib/analysis/training-charts'
import Pressable, { PressableLink } from '../components/Pressable'
import CompletionCelebration from '../components/CompletionCelebration'
import ConfirmDelete from '../components/ConfirmDelete'
import PageSkeleton from '../components/PageSkeleton'

export default function WorkoutSessionPage() {
  const { session } = useSession()
  const { sessionId } = useParams<{ sessionId: string }>()
  const userId = session?.user.id

  if (!userId || !sessionId) {
    return <PageSkeleton titel="Training" />
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
    updateSet,
    deleteSet,
    completeSession,
    ermittleNeueRekorde,
    addExercisesToSession,
    removeExerciseFromSession,
  } = useWorkoutSession(sessionId)
  const { exercises: katalogUebungen } = useExercises(userId)
  const letzteWerte = useLetzteWerte(
    sessionId,
    exercises.map((entry) => entry.exercise_id),
  )
  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null)
  const [pause, setPause] = useState<{ until: number; sekunden: number } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [bearbeiteterSatz, setBearbeiteterSatz] = useState<SessionSet | null>(null)
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
    return <PageSkeleton titel="Training" />
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
    return <PageSkeleton titel="Training" />
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
    const current = exercises.find((entry) => entry.exercise_id === aktuelleId)
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

  // The exercise that is open: the one the user tapped, otherwise the first one
  // whose target is not reached yet — the session opens straight on the next set.
  const sortiert = [...exercises].sort((a, b) => a.reihenfolge - b.reihenfolge)
  const aktuelleId =
    openExerciseId ??
    (sortiert.find((entry) => !targetReached(entry.ziel_saetze, workingSetCount(entry.exercise_id))) ?? sortiert[0])
      ?.exercise_id ??
    null
  const arbeitssaetzeGesamt = sets.filter((set) => !set.ist_aufwaermsatz).length

  /**
   * Where the form starts: the last working set of this exercise today, else its
   * last working set from an earlier workout, else just the target reps. Only a
   * suggestion in the fields — nothing is stored until "Satz abschließen".
   */
  function vorschlagFuer(entry: SessionExercise): Vorschlag | null {
    const heute = sets
      .filter((set) => set.exercise_id === entry.exercise_id && !set.ist_aufwaermsatz)
      .sort((a, b) => b.satz_nummer - a.satz_nummer)[0]
    if (heute) return { gewicht: heute.gewicht, wiederholungen: heute.wiederholungen, ausLetztemTraining: false }
    const frueher = letzteWerte.get(entry.exercise_id)
    if (frueher) return { ...frueher, ausLetztemTraining: true }
    if (entry.ziel_wiederholungen != null) {
      return { gewicht: null, wiederholungen: entry.ziel_wiederholungen, ausLetztemTraining: false }
    }
    return null
  }

  async function addExercises(exerciseIds: string[]) {
    try {
      await addExercisesToSession(exerciseIds)
    } catch {
      showToast('Übung konnte nicht hinzugefügt werden.', 'error')
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-1">
        <h1>{session.tag_name ?? 'Training'}</h1>
        <Laufzeit seit={session.gestartet_am} saetze={arbeitssaetzeGesamt} />
      </div>
      {pause !== null && (
        <PauseTimer
          until={pause.until}
          sekunden={pause.sekunden}
          onDone={pauseOver}
          onLaenger={() => setPause({ until: pause.until + 30_000, sekunden: pause.sekunden })}
        />
      )}
      <ul role="list" className="flex flex-col gap-3">
        {exercises.map((entry) => (
          <li key={entry.exercise_id}>
            <div className={`${cardClass} w-full`}>
              <div className="flex items-center gap-2">
                <Pressable
                  variant="bare"
                  type="button"
                  className={`flex-1 border-0 bg-transparent px-0 text-left text-lg font-semibold ${interactiveClass}`}
                  onClick={() => setOpenExerciseId(entry.exercise_id)}
                >
                  {entry.name}
                </Pressable>
                {!sets.some((set) => set.exercise_id === entry.exercise_id) && (
                  <ConfirmDelete
                    label="Entfernen"
                    className="px-3! py-2! text-sm"
                    icon={<VitaIcon name="delete" tone="mono" size={16} />}
                    titel="Übung entfernen?"
                    text={`${entry.name} wird nur aus diesem Training entfernt, nicht aus dem Plan.`}
                    bestaetigen="Ja, entfernen"
                    onConfirm={() => removeExerciseFromSession(entry.id)}
                  />
                )}
              </div>
              {aktuelleId === entry.exercise_id && (
                <LoggedSets
                  sets={sets.filter((set) => set.exercise_id === entry.exercise_id)}
                  onEdit={setBearbeiteterSatz}
                />
              )}
              {aktuelleId === entry.exercise_id && (
                <SetForm
                  // Remounts once the earlier workout's values arrive, so they land in the fields.
                  key={`${entry.exercise_id}-${letzteWerte.has(entry.exercise_id)}`}
                  exercise={entry}
                  vorschlag={vorschlagFuer(entry)}
                  completedCount={workingSetCount(entry.exercise_id)}
                  onLog={async (values) => {
                    // satz_nummer stays a running order over every set of the
                    // exercise; only the displayed counting skips warm-ups. Max + 1,
                    // not count + 1: after a deleted middle set the count would
                    // repeat a number that is still in use.
                    const satzNummer =
                      Math.max(
                        0,
                        ...sets.filter((set) => set.exercise_id === entry.exercise_id).map((set) => set.satz_nummer),
                      ) + 1
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
      <SetEditDialog
        set={bearbeiteterSatz}
        onClose={() => setBearbeiteterSatz(null)}
        onSave={(setId, patch) => updateSet(setId, patch)}
        onDelete={(setId) => deleteSet(setId)}
      />
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
        <p className="text-xl font-bold tabular-nums">
          {gewichtKg === null ? '—' : `${gewichtKg.toLocaleString('de-DE')} kg`}
        </p>
        {gewichtKg === null && (
          <>
            <p>Ohne Gewicht im Profil lässt sich der Verbrauch nicht berechnen.</p>
            <Link to="/profile" className={linkClass}>
              Gewicht im Profil eintragen
            </Link>
          </>
        )}
      </div>
      {/* Not sticky and not primary: it sat right under "Satz abschließen" and one
          mistap ended the workout for good. Now it is the last thing on the page
          and asks first. */}
      <ConfirmDelete
        variante="secondary"
        className="w-full"
        label="Training abschließen"
        icon={<VitaIcon name="save" tone="mono" size={20} />}
        titel="Training abschließen?"
        text={`${arbeitssaetzeGesamt} ${arbeitssaetzeGesamt === 1 ? 'Satz' : 'Sätze'} erfasst. Danach lässt sich das Training nicht mehr fortsetzen.`}
        bestaetigen="Abschließen"
        onConfirm={complete}
      />
    </div>
  )
}

/** Elapsed time and working sets under the title; ticks every 30 s. */
function Laufzeit({ seit, saetze }: { seit: string; saetze: number }) {
  const [jetzt, setJetzt] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setJetzt(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [])
  const minuten = Math.max(0, Math.floor((jetzt - new Date(seit).getTime()) / 60000))
  const dauer = minuten < 60 ? `${minuten} min` : `${Math.floor(minuten / 60)} h ${minuten % 60} min`
  return (
    <p className={labelClass}>{`Läuft seit ${dauer} · ${saetze} ${saetze === 1 ? 'Satz' : 'Sätze'}`}</p>
  )
}

type Vorschlag = { gewicht: number | null; wiederholungen: number | null; ausLetztemTraining: boolean }

/** Deutsch geschrieben, ohne überflüssige Nachkommastellen (72,5 statt 72.5). */
function alsText(wert: number | null) {
  return wert == null ? '' : wert.toLocaleString('de-DE', { maximumFractionDigits: 2 })
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

// ziel_saetze = 0 means "no target", not "already done": the schema has no CHECK
// on the column and the plan editor only rejects negative values.
function targetReached(zielSaetze: number | null, done: number) {
  return zielSaetze != null && zielSaetze > 0 && done >= zielSaetze
}

/**
 * History of what's already logged for the open exercise, shown above SetForm
 * so the next set (the form itself) reads as the one still outstanding.
 * Warm-ups appear as rows ("Aufw."); the visible number counts working sets
 * only, like the "Satz N von M" status line below — satz_nummer also counts
 * warm-ups (see workingSetCount). A row opens the correction dialog.
 */
function LoggedSets({ sets, onEdit }: { sets: SessionSet[]; onEdit: (set: SessionSet) => void }) {
  // Snapshot beim Aufklappen: nur danach erfasste Sätze blenden ein.
  const [bekannteIds] = useState(() => new Set(sets.map((set) => set.id)))
  if (sets.length === 0) return null

  // Reihenfolge wie erfasst (satz_nummer zählt alle Sätze); die sichtbare Nummer
  // zählt nur Arbeitssätze, Aufwärmsätze tragen "Aufw." (siehe workingSetCount).
  const sortiert = [...sets].sort((a, b) => a.satz_nummer - b.satz_nummer)
  const nummern = new Map<string, number>()
  const aufwaermNummern = new Map<string, number>()
  let arbeitssaetze = 0
  let aufwaermsaetze = 0
  for (const set of sortiert) {
    if (set.ist_aufwaermsatz) aufwaermNummern.set(set.id, (aufwaermsaetze += 1))
    else nummern.set(set.id, (arbeitssaetze += 1))
  }

  return (
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
        {sortiert.map((set) => {
          const label = set.ist_aufwaermsatz ? 'Aufw.' : String(nummern.get(set.id))
          return (
            // Der Zeilenklick öffnet die Korrektur; der Button in der ersten Zelle ist der
            // Zugang für Tastatur und Screenreader — sein Klick steigt zum <tr> auf und
            // hat bewusst keinen eigenen Handler (sonst öffnete der Dialog doppelt).
            <tr
              key={set.id}
              onClick={() => onEdit(set)}
              className={`cursor-pointer border-t border-text-muted/20 ${set.ist_aufwaermsatz ? 'text-text-muted' : ''} ${
                bekannteIds.has(set.id) ? '' : 'row-in'
              }`}
            >
              <td className="py-1">
                <Pressable
                  variant="bare"
                  type="button"
                  className={`min-h-11 min-w-11 rounded-lg text-left focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${interactiveClass}`}
                  aria-label={
                    set.ist_aufwaermsatz
                      ? `Aufw. ${aufwaermNummern.get(set.id)} bearbeiten`
                      : `Satz ${label} bearbeiten`
                  }
                >
                  {label}
                </Pressable>
              </td>
              <td className="py-1">{set.gewicht == null ? '—' : alsText(set.gewicht)}</td>
              <td className="py-1">{set.wiederholungen ?? '—'}</td>
              <td className="py-1">{set.rir ?? '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function SetForm({
  exercise,
  vorschlag,
  completedCount,
  onLog,
}: {
  exercise: SessionExercise
  vorschlag: Vorschlag | null
  completedCount: number
  onLog: (values: SetValues) => Promise<boolean>
}) {
  const [gewicht, setGewicht] = useState(() => alsText(vorschlag?.gewicht ?? null))
  const [wiederholungen, setWiederholungen] = useState(() => alsText(vorschlag?.wiederholungen ?? null))
  const [rir, setRir] = useState<number | null>(null)
  const [istAufwaermsatz, setIstAufwaermsatz] = useState(false)
  const [fehler, setFehler] = useState<{ gewicht?: string; wiederholungen?: string }>({})

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault()
        // Eine Regel für alle Wege, einen Satz zu speichern (src/lib/set-values.ts).
        const eingabe = parseSetInput(gewicht, wiederholungen)
        setFehler(eingabe.ok ? {} : eingabe.fehler)
        if (!eingabe.ok) return
        // Only clear on a stored set: wiping the fields after a failed save
        // would force the user to type everything again.
        const stored = await onLog({
          gewicht: eingabe.values.gewicht,
          wiederholungen: eingabe.values.wiederholungen,
          rir,
          ist_aufwaermsatz: istAufwaermsatz,
        })
        if (!stored) return
        // Weight and reps stay: the next set is usually the same, one tap away.
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
        {vorschlag?.ausLetztemTraining && (
          <p className={labelClass}>
            {`Letztes Training: ${vorschlag.gewicht == null ? '—' : `${alsText(vorschlag.gewicht)} kg`} × ${alsText(vorschlag.wiederholungen) || '—'}`}
          </p>
        )}
        <ZahlFeld
          label="Gewicht (kg)"
          wert={gewicht}
          onChange={setGewicht}
          schritt={2.5}
          minimum={0}
          einheit="kg"
          inputMode="decimal"
          ungueltig={fehler.gewicht !== undefined}
        />
        {fehler.gewicht && (
          <p role="alert" className="text-sm text-danger">
            {fehler.gewicht}
          </p>
        )}
        <ZahlFeld
          label="Wiederholungen"
          wert={wiederholungen}
          onChange={setWiederholungen}
          schritt={1}
          minimum={1}
          einheit="Wiederholung"
          inputMode="numeric"
          ungueltig={fehler.wiederholungen !== undefined}
        />
        {fehler.wiederholungen && (
          <p role="alert" className="text-sm text-danger">
            {fehler.wiederholungen}
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
        <RirChips value={rir} onChange={setRir} />
      </div>
      {/* Sticky above the nav: the one action between sets stays under the thumb
          while the form is on screen, without scrolling past the RIR row. */}
      <Pressable variant="primary" type="submit" className={stickyActionClass}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="start" tone="mono" size={20} />
          Satz abschließen
        </span>
      </Pressable>
    </form>
  )
}

/**
 * A number field with − and + beside it, sized for a thumb: between sets the
 * usual change is one step, not a new number typed on the keyboard.
 */
function ZahlFeld({
  label,
  wert,
  onChange,
  schritt,
  minimum,
  einheit,
  inputMode,
  ungueltig,
}: {
  label: string
  wert: string
  onChange: (next: string) => void
  schritt: number
  minimum: number
  einheit: string
  inputMode: 'decimal' | 'numeric'
  ungueltig: boolean
}) {
  const id = useId()
  function verschiebe(richtung: 1 | -1) {
    const aktuell = parseDecimal(wert)
    const basis = typeof aktuell === 'number' ? aktuell : richtung === 1 ? minimum - schritt : minimum
    onChange(alsText(Math.max(minimum, Math.round((basis + richtung * schritt) * 100) / 100)))
  }
  const schrittText = `${alsText(schritt)} ${einheit === 'kg' ? 'kg' : schritt === 1 ? einheit : `${einheit}en`}`
  // The label points at the input only: wrapping all three controls in one <label>
  // would name the "−" button instead (first labelable descendant).
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <span className="flex items-center gap-2">
        <Pressable
          variant="secondary"
          type="button"
          className="min-w-11 shrink-0 px-3!"
          aria-label={`${label}: ${schrittText} weniger`}
          onClick={() => verschiebe(-1)}
        >
          −
        </Pressable>
        <input
          id={id}
          className={`${inputClass} text-center`}
          inputMode={inputMode}
          value={wert}
          aria-invalid={ungueltig}
          onChange={(event) => onChange(event.target.value)}
        />
        <Pressable
          variant="secondary"
          type="button"
          className="min-w-11 shrink-0 px-3!"
          aria-label={`${label}: ${schrittText} mehr`}
          onClick={() => verschiebe(1)}
        >
          +
        </Pressable>
      </span>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- exportiert für Tests
export function formatPause(sekunden: number) {
  return `${Math.floor(sekunden / 60)}:${String(sekunden % 60).padStart(2, '0')}`
}

function PauseTimer({
  until,
  sekunden,
  onDone,
  onLaenger,
}: {
  until: number
  sekunden: number
  onDone: () => void
  onLaenger: () => void
}) {
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
    <div className={`${cardClass} sticky top-0 z-10`}>
      <div role="timer">
        <p className={labelClass}>Pause</p>
        <p className={statClass}>{formatPause(remainingSeconds)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Pressable variant="secondary" type="button" onClick={onLaenger}>
          +30 s
        </Pressable>
        <Pressable variant="secondary" type="button" onClick={onDone}>
          Überspringen
        </Pressable>
      </div>
    </div>
  )
}

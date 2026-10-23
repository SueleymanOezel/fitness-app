import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import {
  useLetzteWerte,
  useWorkoutSession,
  type LetzteWerte,
  type SessionExercise,
  type SessionSet,
  type SetValues,
} from '../hooks/use-workout-session'
import {
  cardClass,
  checkLabelClass,
  interactiveClass,
  labelClass,
  linkClass,
  listClass,
  listRowClass,
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
import LoggedSets from '../components/LoggedSets'
import ZahlFeld from '../components/ZahlFeld'
import { useTrainingStreak } from '../hooks/use-training-streak'
import { streakText } from '../lib/streak'
import { parseSetInput } from '../lib/set-values'
import type { NeuerRekord } from '../lib/analysis/training-charts'
import Pressable, { PressableLink } from '../components/Pressable'
import CompletionCelebration from '../components/CompletionCelebration'
import ConfirmDelete from '../components/ConfirmDelete'
import PageSkeleton from '../components/PageSkeleton'
import { dauerText } from '../lib/dauer'
import { prefersReducedMotion } from '../lib/motion'
import { abschlussZahlen, type Vergleich } from '../lib/abschluss'
import { zahlDe } from '../lib/zahl'
import { useActiveTrainingDay } from '../hooks/use-active-training-day'
import { SATZ_LEGENDE } from '../components/LoggedSets'

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
  /** Text of the "Pause vorbei" bar; null = not showing. */
  const [pauseEnde, setPauseEnde] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [bearbeiteterSatz, setBearbeiteterSatz] = useState<SessionSet | null>(null)
  const [abschluss, setAbschluss] = useState<
    | ({
        neueRekorde: NeuerRekord[]
        dauerMinuten: number
        kalorien: number | null
        /** The plan day just trained, so the screen can tell the next one apart from a stale copy. */
        tagId: string | null
      } & ReturnType<typeof abschlussZahlen>)
    | null
  >(null)
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
      <SessionCompletionScreen userId={userId} {...abschluss} onFertig={() => navigate('/training')} />
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

  /** `signal`: the timer ran out on its own — the user may be looking away, so say so. A skip needs no signal. */
  function pauseOver(signal: boolean) {
    setPause(null)
    // The pause ends where the next set begins: stay on this exercise while it
    // still has target sets left, otherwise open the next one.
    const current = exercises.find((entry) => entry.exercise_id === aktuelleId)
    if (!current) return
    let weiter: SessionExercise | undefined = current
    if (targetReached(current.ziel_saetze, workingSetCount(current.exercise_id))) {
      const sorted = [...exercises].sort((a, b) => a.reihenfolge - b.reihenfolge)
      const index = sorted.findIndex((entry) => entry.exercise_id === current.exercise_id)
      weiter = sorted[index + 1]
      setOpenExerciseId(weiter?.exercise_id ?? null)
    }
    if (!signal) return
    // Not on iOS Safari; there the accent bar alone carries the signal.
    navigator.vibrate?.([200, 100, 200])
    const naechster = weiter ? workingSetCount(weiter.exercise_id) + 1 : 0
    setPauseEnde(
      weiter
        ? `Satz ${naechster}${weiter.ziel_saetze ? ` von ${weiter.ziel_saetze}` : ''} · ${weiter.name}`
        : 'Alle Übungen erledigt.',
    )
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
    // Clock skew between device and server must not show a negative duration.
    const dauerMinuten = Math.max(
      0,
      Math.round((new Date(ergebnis.beendetAm).getTime() - new Date(session.gestartet_am).getTime()) / 60000),
    )
    setAbschluss({
      neueRekorde,
      dauerMinuten,
      kalorien: ergebnis.gesamtKalorien,
      ...abschlussZahlen(sets, sortiert, letzteWerte),
      tagId: session.workout_plan_day_id,
    })
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
    if (heute) return { gewicht: heute.gewicht, wiederholungen: heute.wiederholungen }
    const frueher = letzteWerte.get(entry.exercise_id)
    if (frueher) return frueher
    if (entry.ziel_wiederholungen != null) {
      return { gewicht: null, wiederholungen: entry.ziel_wiederholungen }
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
    // The one bottom bar (pause + "Satz abschließen") floats over the page: room to scroll past it.
    <div className={pause !== null || pauseEnde !== null ? 'pb-36' : 'pb-20'}>
      <div className="flex flex-col gap-1">
        <h1>{session.tag_name ?? 'Training'}</h1>
        <Laufzeit seit={session.gestartet_am} saetze={arbeitssaetzeGesamt} />
      </div>
      <div className={leisteClass}>
        {pause !== null && (
          <PauseTimer
            until={pause.until}
            sekunden={pause.sekunden}
            onDone={() => pauseOver(true)}
            onSkip={() => pauseOver(false)}
            onLaenger={() => setPause({ until: pause.until + 30_000, sekunden: pause.sekunden })}
          />
        )}
        {pauseEnde !== null && <PauseEnde text={pauseEnde} onClose={() => setPauseEnde(null)} />}
        {aktuelleId !== null && (
          <Pressable variant="primary" type="submit" form={SATZ_FORM_ID}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="save" tone="mono" size={20} />
              Satz abschließen
            </span>
          </Pressable>
        )}
      </div>
      <ul role="list" className="flex flex-col gap-3">
        {exercises.map((entry) => (
          <li key={entry.exercise_id}>
            <div className={`${cardClass} w-full`}>
              <div className="flex items-center gap-2">
                <Pressable
                  variant="bare"
                  type="button"
                  className={`flex-1 border-0 bg-transparent px-0 text-left text-lg font-semibold ${interactiveClass}`}
                  aria-expanded={aktuelleId === entry.exercise_id}
                  onClick={() => setOpenExerciseId(entry.exercise_id)}
                >
                  {entry.name}
                </Pressable>
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
                  letzte={letzteWerte.get(entry.exercise_id)}
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
                    setPauseEnde(null)
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
              {/* Inside the open card, quiet and last: next to a header it sat where the thumb opens the exercise. */}
              {aktuelleId === entry.exercise_id && !sets.some((set) => set.exercise_id === entry.exercise_id) && (
                <ConfirmDelete
                  ruhig
                  label={`${entry.name} entfernen`}
                  titel="Übung entfernen?"
                  text={`${entry.name} wird nur aus diesem Training entfernt, nicht aus dem Plan.`}
                  bestaetigen="Ja, entfernen"
                  onConfirm={() => removeExerciseFromSession(entry.id)}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      {sets.length > 0 && <p className={labelClass}>{SATZ_LEGENDE}</p>}
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
  const dauer = dauerText(minuten)
  return (
    <p className={labelClass}>{`Läuft seit ${dauer} · ${saetze} ${saetze === 1 ? 'Satz' : 'Sätze'}`}</p>
  )
}

type Vorschlag = { gewicht: number | null; wiederholungen: number | null }

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
  saetze,
  volumen,
  vergleiche,
  tagId,
  onFertig,
}: {
  userId: string
  dauerMinuten: number
  kalorien: number | null
  neueRekorde: NeuerRekord[]
  saetze: number
  volumen: number
  vergleiche: Vergleich[]
  tagId: string | null
  onFertig: () => void
}) {
  const { streak, loading: streakLoading } = useTrainingStreak(userId)
  const { day: naechsterTag } = useActiveTrainingDay(userId)
  // The hook first shows its stored copy, which is still the day just trained;
  // the next day only counts once the fresh rotation has replaced it.
  const naechster = naechsterTag && naechsterTag.id !== tagId ? naechsterTag.name : null
  const mitVorher = vergleiche.filter((vergleich) => vergleich.vorher != null)

  return (
    <div>
      <CompletionCelebration>
        <div className="flex flex-col gap-6">
          <h1 className="text-center">Training abgeschlossen</h1>
          <dl className="grid grid-cols-2 gap-4">
            <Kennzahl label="Dauer" wert={dauerMinuten} einheit="Minuten" />
            {kalorien != null && <Kennzahl label="Verbrauch" wert={Math.round(kalorien)} einheit="kcal" />}
            <Kennzahl label="Sätze" wert={saetze} einheit={saetze === 1 ? 'Satz' : 'Sätze'} />
            {volumen > 0 && <Kennzahl label="Volumen" wert={volumen} einheit="kg" />}
          </dl>
          {mitVorher.length > 0 && (
            <section data-reveal className="flex flex-col gap-3">
              <h2>Im Vergleich zum letzten Mal</h2>
              <ul role="list" className={`${cardClass} ${listClass}`}>
                {mitVorher.map((vergleich) => (
                  <li key={vergleich.exercise_id} className={`${listRowClass} justify-between`}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{vergleich.name}</span>
                      <span className={labelClass}>
                        {`${satzText(vergleich.heute)} · zuletzt ${satzText(vergleich.vorher!)}`}
                      </span>
                    </span>
                    <Differenz heute={vergleich.heute.gewicht} vorher={vergleich.vorher!.gewicht} />
                  </li>
                ))}
              </ul>
            </section>
          )}
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
                    <p className="text-2xl font-bold tracking-tight tabular-nums">{`≈ ${zahl(rekord.neuesEinsRM)} kg`}</p>
                    <p className={labelClass}>
                      {rekord.altesEinsRM == null
                        ? 'geschätztes 1RM · erste Ausführung'
                        : `geschätztes 1RM · vorher ≈ ${zahl(rekord.altesEinsRM)} kg`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p data-reveal>{streakLoading ? '…' : streakText(streak)}</p>
          {naechster && <p data-reveal className={labelClass}>{`Nächstes Mal: ${naechster}`}</p>}
        </div>
      </CompletionCelebration>
      <Pressable variant="primary" type="button" className={stickyActionClass} onClick={onFertig}>
        Fertig
      </Pressable>
    </div>
  )
}

/** "72,5 kg × 8", or "8 Wdh." for a set without weight. */
function satzText({ gewicht, wiederholungen }: { gewicht: number | null; wiederholungen: number | null }) {
  const wdh = wiederholungen ?? '–'
  return gewicht == null || gewicht === 0 ? `${wdh} Wdh.` : `${zahlDe(gewicht)} kg × ${wdh}`
}

/** The weight change on the heaviest set; nothing to say when either side has no weight. */
function Differenz({ heute, vorher }: { heute: number | null; vorher: number | null }) {
  if (heute == null || vorher == null || (heute === 0 && vorher === 0)) return null
  const delta = Math.round((heute - vorher) * 100) / 100
  const text = delta === 0 ? '±0 kg' : `${delta > 0 ? '+' : '−'}${zahlDe(Math.abs(delta))} kg`
  return (
    <span className={`shrink-0 font-semibold tabular-nums ${delta > 0 ? 'text-accent-text' : 'text-text-muted'}`}>
      {text}
    </span>
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

function SetForm({
  exercise,
  vorschlag,
  letzte,
  completedCount,
  onLog,
}: {
  exercise: SessionExercise
  vorschlag: Vorschlag | null
  /** Last working set of an earlier workout: shown under the set counter every time, not just before the first set. */
  letzte: LetzteWerte extends Map<string, infer V> ? V | undefined : never
  completedCount: number
  onLog: (values: SetValues) => Promise<boolean>
}) {
  const [gewicht, setGewicht] = useState(() => alsText(vorschlag?.gewicht ?? null))
  const [wiederholungen, setWiederholungen] = useState(() => alsText(vorschlag?.wiederholungen ?? null))
  const [rir, setRir] = useState<number | null>(null)
  const [istAufwaermsatz, setIstAufwaermsatz] = useState(false)
  const [fehler, setFehler] = useState<{ gewicht?: string; wiederholungen?: string }>({})
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      id={SATZ_FORM_ID}
      // The scroll margin is the bottom bar with the pause in it: scrolled into view, the RIR row ends above it.
      className="flex scroll-mb-[calc(10rem+env(safe-area-inset-bottom))] flex-col gap-3"
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
        // After the render that shows the pause bar: bring the next set's inputs (RIR last) above it.
        requestAnimationFrame(() =>
          formRef.current?.scrollIntoView?.({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }),
        )
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
        {letzte && (
          <p className={labelClass}>
            {`Letztes Mal: ${satzText(letzte)}${letzte.rir == null ? '' : ` · RIR ${letzte.rir}`}`}
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
    </form>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- exportiert für Tests
export function formatPause(sekunden: number) {
  return `${Math.floor(sekunden / 60)}:${String(sekunden % 60).padStart(2, '0')}`
}

/** One bar on the bottom edge, above the safe area: the thumb zone, where the next tap happens anyway. */
const leisteClass =
  'fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-[40rem] flex-col gap-2'
const leisteKarteClass = 'overflow-hidden rounded-3xl shadow-lg shadow-black/40'
/** The form the bar's submit button belongs to (the button lives outside it, in the bar). */
const SATZ_FORM_ID = 'satz-form'

function PauseTimer({
  until,
  sekunden,
  onDone,
  onSkip,
  onLaenger,
}: {
  until: number
  sekunden: number
  onDone: () => void
  onSkip: () => void
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

  // +30 s can push the remaining time past the configured pause: the bar then simply stays full.
  const anteil = remainingSeconds / Math.max(sekunden, remainingSeconds, 1)

  return (
    <div className={`${leisteKarteClass} bg-surface ring-1 ring-inset ring-text-muted/25`}>
      <div className="flex items-center gap-2 p-2">
        <div role="timer" className="flex flex-1 items-baseline gap-2 pl-3">
          <span className={labelClass}>Pause</span>
          <span className="font-display text-3xl font-bold tabular-nums">{formatPause(remainingSeconds)}</span>
        </div>
        <Pressable variant="secondary" type="button" className="px-3!" onClick={onLaenger}>
          +30 s
        </Pressable>
        <Pressable variant="secondary" type="button" className="px-3!" onClick={onSkip}>
          Überspringen
        </Pressable>
      </div>
      <div
        aria-hidden="true"
        className="h-1 bg-accent transition-[width] duration-300 ease-linear motion-reduce:transition-none"
        style={{ width: `${anteil * 100}%` }}
      />
    </div>
  )
}

/** Replaces the timer when it runs out: a color change at the edge of vision, readable in a glance. */
function PauseEnde({ text, onClose }: { text: string; onClose: () => void }) {
  // Same ref trick as PauseTimer: the parent's fresh onClose must not restart the 6 s.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  useEffect(() => {
    const timeout = setTimeout(() => onCloseRef.current(), 6000)
    return () => clearTimeout(timeout)
  }, [text])

  return (
    <div role="status" className={`${leisteKarteClass} pause-ende bg-accent text-on-bright`}>
      <Pressable
        variant="bare"
        type="button"
        className="flex w-full min-w-0 flex-col items-start px-5 py-2.5 text-left"
        onClick={onClose}
      >
        <span className="text-lg font-bold">Pause vorbei</span>
        {/* One line: a long exercise name must not grow the bar into the button above it. */}
        <span className="w-full truncate text-sm font-medium">{text}</span>
      </Pressable>
    </div>
  )
}

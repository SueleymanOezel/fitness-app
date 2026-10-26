import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutPlan, type DayExercisePatch, type WorkoutPlanDay } from '../hooks/use-workout-plans'
import { useExercises } from '../hooks/use-exercises'
import {
  cardClass,
  fieldLabelClass,
  inputClass,
  interactiveClass,
  labelClass,
  linkClass,
  listClass,
  listRowClass,
} from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import ExerciseThumbnail from '../components/ExerciseThumbnail'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import { zonenFuerTag } from '../lib/muscle-zones'
import TagMuskelSilhouette from '../components/TagMuskelSilhouette'
import ExercisePicker, { type PickableExercise } from '../components/ExercisePicker'
import Pressable, { PressableLink } from '../components/Pressable'
import ConfirmDelete from '../components/ConfirmDelete'
import PageSkeleton from '../components/PageSkeleton'

export default function TrainingPlanEditPage() {
  const { session } = useSession()
  const { planId } = useParams<{ planId: string }>()
  const userId = session?.user.id

  if (!userId || !planId) {
    return <PageSkeleton titel="Plan bearbeiten" />
  }

  return <PlanEditor userId={userId} planId={planId} />
}

function PlanEditor({ userId, planId }: { userId: string; planId: string }) {
  const {
    plan,
    days,
    loading,
    addDay,
    moveDay,
    addExercisesToDay,
    updateDayExercise,
    removeDayExercise,
    moveDayExercise,
    deletePlan,
  } = useWorkoutPlan(planId)
  const navigate = useNavigate()
  const { exercises } = useExercises(userId)
  const [newDayName, setNewDayName] = useState('')
  const [dayNameError, setDayNameError] = useState('')
  const showToast = useToast()

  if (loading) {
    return <PageSkeleton titel="Plan bearbeiten" />
  }

  if (!plan) {
    return (
      <div>
        <h1>Plan bearbeiten</h1>
        <p role="alert">Diesen Plan gibt es nicht mehr.</p>
        <PressableLink to="/training/plans" className={linkClass}>
          <VitaIcon name="back" tone="brand" size={20} />
          Zurück zu meinen Plänen
        </PressableLink>
      </div>
    )
  }

  // The hook rejects on a failed write; without this the rejection would go
  // unhandled and the user would see nothing at all.
  async function run(action: () => Promise<void>, message: string, erfolg?: string) {
    try {
      await action()
      if (erfolg) showToast(erfolg, 'success')
    } catch {
      showToast(message, 'error')
    }
  }

  return (
    <div>
      <h1>{plan.name}</h1>
      {days.map((day, index) => (
        <DayBlock
          key={day.id}
          day={day}
          exercises={exercises}
          canMoveUp={index > 0}
          canMoveDown={index < days.length - 1}
          onMoveDay={(direction) => run(() => moveDay(day.id, direction), 'Verschieben fehlgeschlagen.')}
          onAddExercises={(exerciseIds) =>
            run(() => addExercisesToDay(day.id, exerciseIds), 'Übung hinzufügen fehlgeschlagen.')
          }
          onUpdateExercise={(id, patch) => run(() => updateDayExercise(id, patch), 'Speichern fehlgeschlagen.', 'Gespeichert.')}
          onRemoveExercise={(id) => removeDayExercise(id)}
          onMoveExercise={(exerciseRowId, direction) =>
            run(() => moveDayExercise(day.id, exerciseRowId, direction), 'Verschieben fehlgeschlagen.')
          }
        />
      ))}
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          if (newDayName.trim() === '') {
            setDayNameError('Der Tag braucht einen Namen.')
            return
          }
          setDayNameError('')
          const name = newDayName.trim()
          setNewDayName('')
          void run(() => addDay(name), 'Tag hinzufügen fehlgeschlagen.')
        }}
      >
        <label className={fieldLabelClass}>
          Neuer Tag
          <input className={inputClass} value={newDayName} onChange={(event) => setNewDayName(event.target.value)} />
        </label>
        <Pressable variant="secondary" type="submit">
          <span className="inline-flex items-center justify-center gap-2">
            <VitaIcon name="add" tone="mono" size={20} />
            Tag hinzufügen
          </span>
        </Pressable>
      </form>
      {dayNameError !== '' && <p role="alert">{dayNameError}</p>}
      {/* Destructive actions live on the plan's own page, not next to every row of the list. */}
      <ConfirmDelete
        label="Plan löschen"
        ruhig
        titel="Plan löschen?"
        text={`„${plan.name}“ mit allen Tagen und Übungen wird gelöscht. Deine bisherigen Trainings bleiben erhalten.`}
        onConfirm={async () => {
          await deletePlan()
          navigate('/training/plans', { replace: true })
        }}
      />
    </div>
  )
}

function DayBlock({
  day,
  exercises,
  canMoveUp,
  canMoveDown,
  onMoveDay,
  onAddExercises,
  onUpdateExercise,
  onRemoveExercise,
  onMoveExercise,
}: {
  day: WorkoutPlanDay
  exercises: PickableExercise[]
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveDay: (direction: 'up' | 'down') => void
  onAddExercises: (exerciseIds: string[]) => Promise<void>
  onUpdateExercise: (id: string, patch: DayExercisePatch) => void
  onRemoveExercise: (id: string) => Promise<void>
  onMoveExercise: (exerciseRowId: string, direction: 'up' | 'down') => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  // One exercise open at a time, like the live session — the day stays a short list.
  const [offen, setOffen] = useState<string | null>(null)

  // Muscle data isn't in day.exercises[].exercise (that embed only selects
  // id/name/name_de/bild_url) — matched against the already-loaded catalog
  // instead, so no new query is needed just for the silhouette.
  const trainierteUebungen = day.exercises
    .map((row) => exercises.find((exercise) => exercise.id === row.exercise_id))
    .filter((exercise): exercise is PickableExercise => exercise !== undefined)
  const zonen = zonenFuerTag(trainierteUebungen)

  return (
    <section className={cardClass}>
      <h2>{day.name}</h2>
      <TagMuskelSilhouette zonen={zonen} />
      {(canMoveUp || canMoveDown) && (
        <div className="flex flex-wrap gap-2">
          {canMoveUp && (
            <Pressable variant="secondary" className="min-w-11 px-3" type="button" aria-label={`${day.name} nach oben`} onClick={() => onMoveDay('up')}>
              ↑︎
            </Pressable>
          )}
          {canMoveDown && (
            <Pressable variant="secondary" className="min-w-11 px-3" type="button" aria-label={`${day.name} nach unten`} onClick={() => onMoveDay('down')}>
              ↓︎
            </Pressable>
          )}
        </div>
      )}
      <ul role="list" className={listClass}>
        {day.exercises.map((row, index) => (
          <li key={row.id} className={`${listRowClass} items-start`}>
            <ExerciseThumbnail bildUrl={row.exercise?.bild_url ?? null} />
            <div className="flex flex-1 flex-col gap-2">
              <Pressable
                variant="bare"
                type="button"
                aria-expanded={offen === row.id}
                className={`flex min-h-11 flex-col items-start rounded-lg text-left ${interactiveClass}`}
                onClick={() => setOffen(offen === row.id ? null : row.id)}
              >
                <span className="font-medium">{row.exercise?.name_de ?? row.exercise?.name}</span>
                <span className={labelClass}>{zielText(row)}</span>
              </Pressable>
              {offen === row.id && (
                <>
                  <TargetField
                    label="Sätze"
                    stored={row.ziel_saetze}
                    onCommit={(value) => onUpdateExercise(row.id, { ziel_saetze: value })}
                  />
                  <TargetField
                    label="Wiederholungen"
                    stored={row.ziel_wiederholungen}
                    onCommit={(value) => onUpdateExercise(row.id, { ziel_wiederholungen: value })}
                  />
                  <TargetField
                    label="Pause (Sekunden)"
                    stored={row.pausenzeit_sekunden}
                    onCommit={(value) => onUpdateExercise(row.id, { pausenzeit_sekunden: value })}
                  />
                  <div className="flex flex-wrap gap-2">
                    {index > 0 && (
                      <Pressable
                        variant="secondary"
                        className="min-w-11 px-3"
                        type="button"
                        aria-label="Nach oben"
                        onClick={() => onMoveExercise(row.id, 'up')}
                      >
                        ↑︎
                      </Pressable>
                    )}
                    {index < day.exercises.length - 1 && (
                      <Pressable
                        variant="secondary"
                        className="min-w-11 px-3"
                        type="button"
                        aria-label="Nach unten"
                        onClick={() => onMoveExercise(row.id, 'down')}
                      >
                        ↓︎
                      </Pressable>
                    )}
                    <ConfirmDelete
                      label="Entfernen"
                      titel="Übung aus dem Tag entfernen?"
                      text="Nur der Plan ändert sich. Bereits aufgezeichnete Trainings bleiben unverändert."
                      bestaetigen="Ja, entfernen"
                      onConfirm={() => onRemoveExercise(row.id)}
                    />
                  </div>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Pressable variant="secondary" type="button" onClick={() => setPickerOpen(true)}>
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
            exercises={exercises}
            alreadyAdded={day.exercises.map((row) => row.exercise_id)}
            // onAddExercises' write failure reports via a toast (see run() above); the
            // dialog is already closed by the time it would land, since this callback
            // closes it synchronously before the write resolves — a toast raised while
            // this Dialog is still open would render invisible behind its native
            // top-layer backdrop (see ExercisesPage.tsx's onSave for the case where
            // that actually happened). Do not make this await the write before closing.
            onAddSelected={(exerciseIds) => {
              void onAddExercises(exerciseIds)
              setPickerOpen(false)
            }}
          />
        )}
      </Dialog>
    </section>
  )
}

/** "3 × 8 · 120 s" — the targets at a glance; a missing value shows as "–". */
function zielText(row: { ziel_saetze: number | null; ziel_wiederholungen: number | null; pausenzeit_sekunden: number | null }) {
  const teile: string[] = []
  if (row.ziel_saetze != null || row.ziel_wiederholungen != null) {
    teile.push(`${row.ziel_saetze ?? '–'} × ${row.ziel_wiederholungen ?? '–'}`)
  }
  if (row.pausenzeit_sekunden != null) teile.push(`${row.pausenzeit_sekunden} s`)
  return teile.length > 0 ? teile.join(' · ') : 'Keine Ziele'
}

/**
 * Typed into local state and written on blur — a write per keystroke would
 * store every intermediate value (typing "12" would briefly store 1).
 * An emptied field clears the target; Number('') is 0, not "unset".
 */
function TargetField({
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
    // ziel_saetze, ziel_wiederholungen and pausenzeit_sekunden are all integer
    // columns: Postgres would round 2.6 to 3 and store a target nobody set.
    if (value !== null && (!Number.isInteger(value) || value < 0)) {
      setDraft(String(stored ?? ''))
      return
    }
    if (value === stored) return
    onCommit(value)
  }

  return (
    <label className={fieldLabelClass}>
      {label}
      <input className={inputClass} type="number" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} />
    </label>
  )
}

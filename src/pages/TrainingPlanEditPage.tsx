import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutPlan, type DayExercisePatch, type WorkoutPlanDay } from '../hooks/use-workout-plans'
import { useExercises } from '../hooks/use-exercises'
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import { useToast } from '../components/ToastProvider'

export default function TrainingPlanEditPage() {
  const { session } = useSession()
  const { planId } = useParams<{ planId: string }>()
  const userId = session?.user.id

  if (!userId || !planId) {
    return (
      <div>
        <h1>Plan bearbeiten</h1>
        <p>Lädt…</p>
      </div>
    )
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
    addExerciseToDay,
    updateDayExercise,
    removeDayExercise,
    moveDayExercise,
  } = useWorkoutPlan(planId)
  const { exercises } = useExercises(userId)
  const [newDayName, setNewDayName] = useState('')
  const [dayNameError, setDayNameError] = useState('')
  const showToast = useToast()

  if (loading) {
    return (
      <div>
        <h1>Plan bearbeiten</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div>
        <h1>Plan bearbeiten</h1>
        <p role="alert">Diesen Plan gibt es nicht mehr.</p>
        <Link to="/training/plans">Zurück zu meinen Plänen</Link>
      </div>
    )
  }

  // The hook rejects on a failed write; without this the rejection would go
  // unhandled and the user would see nothing at all.
  async function run(action: () => Promise<void>, message: string) {
    try {
      await action()
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
          onAddExercise={(exerciseId) =>
            run(() => addExerciseToDay(day.id, exerciseId), 'Übung hinzufügen fehlgeschlagen.')
          }
          onUpdateExercise={(id, patch) => run(() => updateDayExercise(id, patch), 'Speichern fehlgeschlagen.')}
          onRemoveExercise={(id) => run(() => removeDayExercise(id), 'Entfernen fehlgeschlagen.')}
          onMoveExercise={(exerciseRowId, direction) =>
            run(() => moveDayExercise(day.id, exerciseRowId, direction), 'Verschieben fehlgeschlagen.')
          }
        />
      ))}
      <form
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
        <label>
          Neuer Tag
          <input value={newDayName} onChange={(event) => setNewDayName(event.target.value)} />
        </label>
        <button type="submit" className={buttonPrimaryClass}>
          Tag hinzufügen
        </button>
      </form>
      {dayNameError !== '' && <p role="alert">{dayNameError}</p>}
      <Link to="/training/plans">Zurück zu meinen Plänen</Link>
    </div>
  )
}

function DayBlock({
  day,
  exercises,
  canMoveUp,
  canMoveDown,
  onMoveDay,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
  onMoveExercise,
}: {
  day: WorkoutPlanDay
  exercises: { id: string; name: string }[]
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveDay: (direction: 'up' | 'down') => void
  onAddExercise: (exerciseId: string) => void
  onUpdateExercise: (id: string, patch: DayExercisePatch) => void
  onRemoveExercise: (id: string) => void
  onMoveExercise: (exerciseRowId: string, direction: 'up' | 'down') => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <section className={cardClass}>
      <h2>{day.name}</h2>
      {canMoveUp && (
        <button type="button" onClick={() => onMoveDay('up')}>
          Tag nach oben
        </button>
      )}
      {canMoveDown && (
        <button type="button" onClick={() => onMoveDay('down')}>
          Tag nach unten
        </button>
      )}
      <ul role="list" className="space-y-4">
        {day.exercises.map((row, index) => (
          <li key={row.id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>
              {row.exercise?.name}
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
              {index > 0 && (
                <button type="button" onClick={() => onMoveExercise(row.id, 'up')}>
                  Nach oben
                </button>
              )}
              {index < day.exercises.length - 1 && (
                <button type="button" onClick={() => onMoveExercise(row.id, 'down')}>
                  Nach unten
                </button>
              )}
              <button type="button" className={buttonSecondaryClass} onClick={() => onRemoveExercise(row.id)}>
                Entfernen
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className={buttonPrimaryClass} onClick={() => setPickerOpen(true)}>
        Übung hinzufügen
      </button>
      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the picker only while open resets the search field each
          time it opens, instead of keeping the last search around. */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)}>
        {pickerOpen && (
          <ExercisePicker
            exercises={exercises}
            alreadyAdded={day.exercises.map((row) => row.exercise_id)}
            onPick={(exerciseId) => {
              onAddExercise(exerciseId)
              setPickerOpen(false)
            }}
          />
        )}
      </Dialog>
    </section>
  )
}

function ExercisePicker({
  exercises,
  alreadyAdded,
  onPick,
}: {
  exercises: { id: string; name: string }[]
  alreadyAdded: string[]
  onPick: (exerciseId: string) => void
}) {
  const [query, setQuery] = useState('')
  // Already-added exercises are filtered out rather than silently rejected by
  // the hook's duplicate guard, which would look like a dead button.
  const matches =
    query === ''
      ? []
      : exercises.filter(
          (exercise) =>
            exercise.name.toLowerCase().includes(query.toLowerCase()) && !alreadyAdded.includes(exercise.id),
        )

  return (
    <div className={cardClass}>
      <label>
        Übung suchen
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul role="list">
        {matches.map((exercise) => (
          <li key={exercise.id}>
            {exercise.name}
            <button type="button" onClick={() => onPick(exercise.id)}>
              {`${exercise.name} hinzufügen`}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
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
    <label>
      {label}
      <input type="number" value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} />
    </label>
  )
}

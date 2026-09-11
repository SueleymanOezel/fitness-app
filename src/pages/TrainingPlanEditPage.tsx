import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutPlan, type DayExercisePatch, type WorkoutPlanDay } from '../hooks/use-workout-plans'
import { useExercises } from '../hooks/use-exercises'
import { cardClass, buttonPrimaryClass, buttonSecondaryClass, interactiveClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import ExerciseFilterChips from '../components/ExerciseFilterChips'
import ExerciseThumbnail from '../components/ExerciseThumbnail'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import {
  groupByMuskelgruppe,
  matchesExerciseFilter,
  uniqueEquipment,
  uniqueMuskelgruppen,
} from '../lib/exercise-filters'
import { equipmentLabel } from '../lib/equipment-labels'
import { muskelgruppeLabel } from '../lib/muscle-group-labels'
import { zonenFuerTag } from '../lib/muscle-zones'
import TagMuskelSilhouette from '../components/TagMuskelSilhouette'

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
    addExercisesToDay,
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
        <Link to="/training/plans" className="flex items-center justify-center gap-2">
          <VitaIcon name="back" tone="brand" size={20} />
          Zurück zu meinen Plänen
        </Link>
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
          onAddExercises={(exerciseIds) =>
            run(() => addExercisesToDay(day.id, exerciseIds), 'Übung hinzufügen fehlgeschlagen.')
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
          <span className="inline-flex items-center justify-center gap-2">
            <VitaIcon name="add" tone="mono" size={20} />
            Tag hinzufügen
          </span>
        </button>
      </form>
      {dayNameError !== '' && <p role="alert">{dayNameError}</p>}
      <Link to="/training/plans" className="flex items-center justify-center gap-2">
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zu meinen Plänen
      </Link>
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
  onRemoveExercise: (id: string) => void
  onMoveExercise: (exerciseRowId: string, direction: 'up' | 'down') => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

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
            <div className={`${cardClass} w-full flex items-start gap-4`}>
              <ExerciseThumbnail bildUrl={row.exercise?.bild_url ?? null} />
              <div className="flex-1">
                <span className="block font-medium">{row.exercise?.name_de ?? row.exercise?.name}</span>
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
                  <span className="inline-flex items-center justify-center gap-2">
                    <VitaIcon name="delete" tone="mono" size={20} />
                    Entfernen
                  </span>
                </button>
              </div>
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

type PickableExercise = {
  id: string
  name: string
  name_de: string | null
  muskelgruppen_primaer: string[] | null
  muskelgruppen_sekundaer: string[] | null
  equipment: string | null
  bild_url: string | null
}

function ExercisePicker({
  exercises,
  alreadyAdded,
  onAddSelected,
}: {
  exercises: PickableExercise[]
  alreadyAdded: string[]
  onAddSelected: (exerciseIds: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [muskelgruppe, setMuskelgruppe] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])

  // Already-added exercises are filtered out rather than silently rejected by
  // the hook's duplicate guard, which would look like a dead row.
  const selectable = exercises.filter((exercise) => !alreadyAdded.includes(exercise.id))
  const muskelgruppen = uniqueMuskelgruppen(selectable)
  const equipmentWerte = uniqueEquipment(selectable)
  const filtered = selectable.filter((exercise) => matchesExerciseFilter(exercise, { query, muskelgruppe, equipment }))
  // Grouping by muscle group only makes sense while more than one could be
  // showing — a specific muskelgruppe filter already narrows to one section.
  // Grouping only ever uses an exercise's FIRST primary muscle group as the
  // key (see groupByMuskelgruppe) — unlike the muskelgruppe filter chip
  // above, which matches against every one of an exercise's primary muscle
  // groups. A chest+triceps exercise files under "Brust" here but still
  // shows up when the "Trizeps" chip is active; that's deliberate (one row
  // per exercise, not one per muscle group — see the domain-model note on
  // volume being split across groups for charts, which is a different,
  // numeric-conservation concern that doesn't apply to a UI list).
  const groups = muskelgruppe === null ? groupByMuskelgruppe(filtered) : [{ gruppe: '', exercises: filtered }]

  function toggle(exerciseId: string) {
    setSelected((current) =>
      current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId],
    )
  }

  return (
    <div className={cardClass}>
      <label>
        Übung suchen
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ExerciseFilterChips
        muskelgruppen={muskelgruppen}
        muskelgruppe={muskelgruppe}
        onMuskelgruppeChange={setMuskelgruppe}
        equipmentWerte={equipmentWerte}
        equipment={equipment}
        onEquipmentChange={setEquipment}
      />
      {filtered.length === 0 && <p>Keine Übungen gefunden.</p>}
      {groups.map((group) => (
        <div key={group.gruppe || 'gefiltert'}>
          {group.gruppe !== '' && <h3>{group.gruppe}</h3>}
          <ul role="list" className="space-y-2">
            {group.exercises.map((exercise) => {
              const name = exercise.name_de ?? exercise.name
              const isSelected = selected.includes(exercise.id)
              const caption = [
                exercise.equipment ? equipmentLabel(exercise.equipment) : null,
                exercise.muskelgruppen_primaer?.[0] ? muskelgruppeLabel(exercise.muskelgruppen_primaer[0]) : null,
              ]
                .filter((part): part is string => part !== null)
                .join(' · ')

              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(exercise.id)}
                    className={`${cardClass} ${interactiveClass} flex w-full items-center gap-4 text-left`}
                  >
                    <span className="relative shrink-0">
                      <ExerciseThumbnail bildUrl={exercise.bild_url} />
                      {isSelected && (
                        <VitaIcon
                          name="save"
                          tone="brand"
                          size={20}
                          className="absolute -bottom-1 -right-1 rounded-full bg-bg"
                        />
                      )}
                    </span>
                    <span className="flex-1">
                      <span className="block">{name}</span>
                      {caption !== '' && <span className="block text-sm text-text-muted">{caption}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {/* Sticky so it stays reachable once the (now ungated, potentially
          long) list scrolls inside the dialog's own scroll box. */}
      <div className="sticky bottom-0 bg-surface pt-2">
        <button
          type="button"
          className={buttonPrimaryClass}
          disabled={selected.length === 0}
          onClick={() => onAddSelected(selected)}
        >
          {`Hinzufügen (${selected.length})`}
        </button>
      </div>
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

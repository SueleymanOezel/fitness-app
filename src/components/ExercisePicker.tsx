import { useState } from 'react'
import { cardClass, buttonPrimaryClass, interactiveClass } from '../lib/ui-classes'
import ExerciseFilterChips from './ExerciseFilterChips'
import ExerciseThumbnail from './ExerciseThumbnail'
import { VitaIcon } from './icons/VitaIcon'
import {
  groupByMuskelgruppe,
  matchesExerciseFilter,
  uniqueEquipment,
  uniqueMuskelgruppen,
} from '../lib/exercise-filters'
import { equipmentLabel } from '../lib/equipment-labels'
import { muskelgruppeLabel } from '../lib/muscle-group-labels'

export type PickableExercise = {
  id: string
  name: string
  name_de: string | null
  muskelgruppen_primaer: string[] | null
  muskelgruppen_sekundaer: string[] | null
  equipment: string | null
  bild_url: string | null
}

/**
 * Shared exercise-selection dialog content — used by the plan editor
 * (adding exercises to a training day) and the live workout session
 * (adding exercises to just that session, see use-workout-session.ts).
 * The caller owns the surrounding Dialog and what onAddSelected does with
 * the chosen ids.
 */
export default function ExercisePicker({
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

import { useState } from 'react'
import { cardClass, fieldLabelClass, inputClass, interactiveClass, listClass, listRowClass } from '../lib/ui-classes'
import ExerciseFilterChips from './ExerciseFilterChips'
import ExerciseThumbnail from './ExerciseThumbnail'
import { VitaIcon } from './icons/VitaIcon'
import {
  groupByMuskelgruppe,
  matchesExerciseFilter,
  uniqueEquipment,
  uniqueMuskelgruppen,
} from '../lib/exercise-filters'
import { exerciseCaption, revealDelay } from '../lib/exercise-caption'
import Pressable from './Pressable'
import { useVisibleCount } from '../hooks/use-visible-count'

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
  const { count, showMore } = useVisibleCount(`${query}|${muskelgruppe}|${equipment}`)

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
  // Only the first `count` hits are rendered (thumbnails are third-party requests); they are cut
  // before grouping so a section never shows more than the list allows.
  const gefiltert = filtered.length
  const sichtbar = filtered.slice(0, count)
  const groups = muskelgruppe === null ? groupByMuskelgruppe(sichtbar) : [{ gruppe: '', exercises: sichtbar }]

  function toggle(exerciseId: string) {
    setSelected((current) =>
      current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId],
    )
  }

  return (
    <div className={cardClass}>
      <label className={fieldLabelClass}>
        Übung suchen
        <input className={inputClass} placeholder="z. B. Kniebeuge" value={query} onChange={(event) => setQuery(event.target.value)} />
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
        <div key={group.gruppe || 'gefiltert'} className="flex flex-col gap-1">
          {group.gruppe !== '' && <h3>{group.gruppe}</h3>}
          <ul role="list" className={listClass}>
            {group.exercises.map((exercise, index) => {
              const name = exercise.name_de ?? exercise.name
              const isSelected = selected.includes(exercise.id)
              const caption = exerciseCaption(exercise)

              return (
                <li key={exercise.id} className="list-in" style={{ animationDelay: revealDelay(index) }}>
                  <Pressable
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(exercise.id)}
                    className={`${listRowClass} ${interactiveClass} w-full rounded-2xl px-2 text-left`}
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
                  </Pressable>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {gefiltert > count && (
        <Pressable variant="secondary" type="button" className="w-full" onClick={showMore}>
          {`Mehr anzeigen (${gefiltert - count} weitere)`}
        </Pressable>
      )}
      {/* Sticky so it stays reachable once the (now ungated, potentially
          long) list scrolls inside the dialog's own scroll box. */}
      <div className="sticky bottom-0 bg-surface pt-2">
        <Pressable
          variant="primary"
          type="button"
          disabled={selected.length === 0}
          onClick={() => onAddSelected(selected)}
        >
          {`Hinzufügen (${selected.length})`}
        </Pressable>
      </div>
    </div>
  )
}

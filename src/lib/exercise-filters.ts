import { muskelgruppeLabel } from './muscle-group-labels'
import { equipmentLabel } from './equipment-labels'

export type FilterableExercise = {
  name: string
  name_de: string | null
  muskelgruppen_primaer: string[] | null
  equipment: string | null
}

export function uniqueMuskelgruppen(exercises: FilterableExercise[]): string[] {
  return [...new Set(exercises.flatMap((exercise) => exercise.muskelgruppen_primaer ?? []))].sort((a, b) =>
    muskelgruppeLabel(a).localeCompare(muskelgruppeLabel(b), 'de'),
  )
}

export function uniqueEquipment(exercises: FilterableExercise[]): string[] {
  return [...new Set(exercises.flatMap((exercise) => (exercise.equipment ? [exercise.equipment] : [])))].sort(
    (a, b) => equipmentLabel(a).localeCompare(equipmentLabel(b), 'de'),
  )
}

export function matchesExerciseFilter(
  exercise: FilterableExercise,
  filter: { query: string; muskelgruppe: string | null; equipment: string | null },
): boolean {
  return (
    (exercise.name_de ?? exercise.name).toLowerCase().includes(filter.query.toLowerCase()) &&
    (filter.muskelgruppe === null || (exercise.muskelgruppen_primaer ?? []).includes(filter.muskelgruppe)) &&
    (filter.equipment === null || exercise.equipment === filter.equipment)
  )
}

/** Sorted last: an exercise the source data never assigned a muscle group to. */
const OHNE_MUSKELGRUPPE = 'Ohne Muskelgruppe'

/**
 * One exercise can have several primary muscle groups (see the domain-model
 * notes on volume being split across them) — only the first is used as the
 * grouping key, so every exercise appears in exactly one section.
 */
export function groupByMuskelgruppe<T extends FilterableExercise>(exercises: T[]): { gruppe: string; exercises: T[] }[] {
  const groups = new Map<string, T[]>()
  for (const exercise of exercises) {
    const primary = exercise.muskelgruppen_primaer
    const label = primary && primary.length > 0 ? muskelgruppeLabel(primary[0]) : OHNE_MUSKELGRUPPE
    const bucket = groups.get(label)
    if (bucket) bucket.push(exercise)
    else groups.set(label, [exercise])
  }

  const sortedLabels = [...groups.keys()].sort((a, b) => {
    if (a === OHNE_MUSKELGRUPPE) return 1
    if (b === OHNE_MUSKELGRUPPE) return -1
    return a.localeCompare(b, 'de')
  })

  return sortedLabels.map((gruppe) => ({
    gruppe,
    exercises: [...(groups.get(gruppe) ?? [])].sort((a, b) =>
      (a.name_de ?? a.name).localeCompare(b.name_de ?? b.name, 'de'),
    ),
  }))
}

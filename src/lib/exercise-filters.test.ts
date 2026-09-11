import { describe, expect, it } from 'vitest'
import { groupByMuskelgruppe, matchesExerciseFilter, uniqueEquipment, uniqueMuskelgruppen } from './exercise-filters'

type Exercise = {
  name: string
  name_de: string | null
  muskelgruppen_primaer: string[] | null
  equipment: string | null
}

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    name: 'Bench Press',
    name_de: 'Bankdrücken',
    muskelgruppen_primaer: ['chest'],
    equipment: 'barbell',
    ...overrides,
  }
}

describe('uniqueMuskelgruppen', () => {
  it('returns each muscle group once, sorted by the German label', () => {
    const exercises = [
      exercise({ muskelgruppen_primaer: ['triceps'] }),
      exercise({ muskelgruppen_primaer: ['chest'] }),
      exercise({ muskelgruppen_primaer: ['chest'] }),
    ]
    // Brust (chest) sorts before Trizeps (triceps) in German, unlike the raw English values.
    expect(uniqueMuskelgruppen(exercises)).toEqual(['chest', 'triceps'])
  })

  it('ignores exercises with no muscle group', () => {
    expect(uniqueMuskelgruppen([exercise({ muskelgruppen_primaer: null })])).toEqual([])
  })
})

describe('uniqueEquipment', () => {
  it('returns each equipment value once, sorted by the German label', () => {
    const exercises = [exercise({ equipment: 'barbell' }), exercise({ equipment: 'dumbbell' })]
    // Kurzhantel (dumbbell) sorts before Langhantel (barbell) in German.
    expect(uniqueEquipment(exercises)).toEqual(['dumbbell', 'barbell'])
  })

  it('ignores exercises with no equipment', () => {
    expect(uniqueEquipment([exercise({ equipment: null })])).toEqual([])
  })
})

describe('matchesExerciseFilter', () => {
  it('matches the search query against the displayed (German) name', () => {
    const matched = matchesExerciseFilter(exercise({ name: 'Bench Press', name_de: 'Bankdrücken' }), {
      query: 'Bank',
      muskelgruppe: null,
      equipment: null,
    })
    expect(matched).toBe(true)
  })

  it('falls back to the English name when there is no translation', () => {
    const matched = matchesExerciseFilter(exercise({ name: 'Crunch', name_de: null }), {
      query: 'Crunch',
      muskelgruppe: null,
      equipment: null,
    })
    expect(matched).toBe(true)
  })

  it('requires the muscle-group filter to match one of the primary muscle groups', () => {
    const chestExercise = exercise({ muskelgruppen_primaer: ['chest'] })
    expect(matchesExerciseFilter(chestExercise, { query: '', muskelgruppe: 'chest', equipment: null })).toBe(true)
    expect(matchesExerciseFilter(chestExercise, { query: '', muskelgruppe: 'triceps', equipment: null })).toBe(false)
  })

  it('requires the equipment filter to match exactly', () => {
    const barbellExercise = exercise({ equipment: 'barbell' })
    expect(matchesExerciseFilter(barbellExercise, { query: '', muskelgruppe: null, equipment: 'barbell' })).toBe(true)
    expect(matchesExerciseFilter(barbellExercise, { query: '', muskelgruppe: null, equipment: 'dumbbell' })).toBe(
      false,
    )
  })
})

describe('groupByMuskelgruppe', () => {
  it('groups exercises by their first primary muscle group, sorted by the German label', () => {
    const groups = groupByMuskelgruppe([
      exercise({ name: 'Triceps Extension', name_de: null, muskelgruppen_primaer: ['triceps'] }),
      exercise({ name: 'Bench Press', name_de: 'Bankdrücken', muskelgruppen_primaer: ['chest'] }),
    ])

    expect(groups.map((group) => group.gruppe)).toEqual(['Brust', 'Trizeps'])
    expect(groups[0].exercises.map((e) => e.name)).toEqual(['Bench Press'])
  })

  it('sorts exercises within a group by the displayed name', () => {
    const groups = groupByMuskelgruppe([
      exercise({ name: 'Z Press', name_de: null, muskelgruppen_primaer: ['chest'] }),
      exercise({ name: 'Bench Press', name_de: 'Aufwärmdrücken', muskelgruppen_primaer: ['chest'] }),
    ])

    expect(groups[0].exercises.map((e) => e.name)).toEqual(['Bench Press', 'Z Press'])
  })

  it('groups an exercise with no muscle group under a dedicated bucket, sorted last', () => {
    const groups = groupByMuskelgruppe([
      exercise({ name: 'Mystery Move', name_de: null, muskelgruppen_primaer: null }),
      exercise({ name: 'Bench Press', name_de: 'Bankdrücken', muskelgruppen_primaer: ['chest'] }),
    ])

    expect(groups.map((group) => group.gruppe)).toEqual(['Brust', 'Ohne Muskelgruppe'])
  })

  it('uses only the first muscle group as the grouping key for an exercise with several', () => {
    const groups = groupByMuskelgruppe([exercise({ muskelgruppen_primaer: ['chest', 'triceps'] })])
    expect(groups.map((group) => group.gruppe)).toEqual(['Brust'])
  })
})

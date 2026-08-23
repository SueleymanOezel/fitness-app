import { describe, expect, it } from 'vitest'
import { toExerciseRow } from './import-exercises.ts'

describe('toExerciseRow', () => {
  it('maps a raw free-exercise-db entry to an exercises row', () => {
    const raw = {
      name: '3/4 Sit-Up',
      category: 'strength',
      equipment: 'body only',
      primaryMuscles: ['abdominals'],
      secondaryMuscles: [],
      images: ['3_4_Sit-Up/0.jpg', '3_4_Sit-Up/1.jpg'],
    }

    expect(toExerciseRow(raw)).toEqual({
      name: '3/4 Sit-Up',
      kategorie: 'strength',
      equipment: 'body only',
      muskelgruppen_primaer: ['abdominals'],
      muskelgruppen_sekundaer: [],
      bild_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/3_4_Sit-Up/0.jpg',
      met_wert: 5.0,
      created_by: null,
    })
  })

  it('uses the category MET value, not a hardcoded one', () => {
    const raw = {
      name: 'Air Bike',
      category: 'cardio',
      equipment: null,
      primaryMuscles: ['abdominals'],
      secondaryMuscles: [],
      images: [],
    }

    expect(toExerciseRow(raw).met_wert).toBe(8.0)
  })

  it('leaves bild_url null when an entry has no images', () => {
    const raw = {
      name: 'X',
      category: 'strength',
      equipment: null,
      primaryMuscles: [],
      secondaryMuscles: [],
      images: [],
    }

    expect(toExerciseRow(raw).bild_url).toBeNull()
  })
})

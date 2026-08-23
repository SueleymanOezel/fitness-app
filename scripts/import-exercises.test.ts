import { describe, expect, it, vi } from 'vitest'
import { replaceImportedExercises, toExerciseRow } from './import-exercises.ts'

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

function createClient({ insertFails = false, existingIds = [{ id: 'old1' }] } = {}) {
  const calls: string[] = []
  const insert = vi.fn(async () => {
    calls.push('insert')
    return { error: insertFails ? { message: 'boom' } : null }
  })
  const deleteIn = vi.fn(async (column: string, ids: string[]) => {
    calls.push(`delete ${column} ${ids.length}`)
    return { error: null }
  })
  return {
    calls,
    insert,
    deleteIn,
    from: () => ({
      select: () => ({
        is: () => ({
          range: async (from: number, to: number) => ({ data: existingIds.slice(from, to + 1), error: null }),
        }),
      }),
      insert,
      delete: () => ({ in: deleteIn }),
    }),
  }
}

const row = {
  name: 'X',
  kategorie: 'strength',
  equipment: null,
  muskelgruppen_primaer: [],
  muskelgruppen_sekundaer: [],
  bild_url: null,
  met_wert: 5,
  created_by: null,
}

describe('replaceImportedExercises', () => {
  it('inserts the new set before removing the old one', async () => {
    const client = createClient()

    await replaceImportedExercises(client, [row])

    expect(client.calls).toEqual(['insert', 'delete id 1'])
    expect(client.deleteIn).toHaveBeenCalledWith('id', ['old1'])
  })

  it('leaves the old set in place when the insert fails', async () => {
    const client = createClient({ insertFails: true })

    await expect(replaceImportedExercises(client, [row])).rejects.toThrow()
    expect(client.deleteIn).not.toHaveBeenCalled()
  })

  it('deletes in chunks so the request URI stays within limits', async () => {
    const existingIds = Array.from({ length: 873 }, (_, index) => ({ id: `old${index}` }))
    const client = createClient({ existingIds })

    await replaceImportedExercises(client, [row])

    // 873 ids in one in.(...) would be ~32 KB of query string.
    expect(client.deleteIn).toHaveBeenCalledTimes(9)
    for (const call of client.deleteIn.mock.calls) {
      expect(call[1].length).toBeLessThanOrEqual(100)
    }
    expect(client.deleteIn.mock.calls.flatMap((call) => call[1])).toHaveLength(873)
  })

  it('pages the read of the old set instead of stopping at the row cap', async () => {
    const existingIds = Array.from({ length: 700 }, (_, index) => ({ id: `old${index}` }))
    const client = createClient({ existingIds })

    await replaceImportedExercises(client, [row])

    expect(client.deleteIn.mock.calls.flatMap((call) => call[1])).toHaveLength(700)
  })
})

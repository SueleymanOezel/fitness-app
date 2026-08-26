import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTrainingAnalysis } from './use-training-analysis'

const gte = vi.fn()
const order = vi.fn()
const eq = vi.fn()
const select = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => ({ select: (columns: string) => select(table, columns) }) },
}))

type Ergebnis = { data: unknown; error: unknown }
let ergebnis: Ergebnis
let satzErgebnis: Ergebnis
const inFilter = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  ergebnis = { data: [], error: null }
  satzErgebnis = { data: [], error: null }
  select.mockImplementation((table: string) => {
    const antwort = table === 'workout_session_sets' ? () => satzErgebnis : () => ergebnis
    const builder = {
      eq: (...args: unknown[]) => {
        eq(...args)
        return builder
      },
      gte: (...args: unknown[]) => {
        gte(...args)
        return builder
      },
      in: (...args: unknown[]) => {
        inFilter(...args)
        return builder
      },
      order: (...args: unknown[]) => {
        order(...args)
        return Promise.resolve(antwort())
      },
    }
    return builder
  })
})

describe('useTrainingAnalysis', () => {
  it('loads the sessions of the range, oldest first', async () => {
    ergebnis = {
      data: [{ id: 'a', gestartet_am: '2026-08-17T18:00:00Z', beendet_am: null, gesamt_kalorien: 300 }],
      error: null,
    }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.error).toBe(false)
    expect(eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(order).toHaveBeenCalledWith('gestartet_am', { ascending: true })
  })

  it('bounds the query by the range', async () => {
    renderHook(() => useTrainingAnalysis('u1', 30))
    await waitFor(() => expect(gte).toHaveBeenCalled())
    // The whole point of the range switch: without the filter every chart would
    // pull the full history on every view.
    expect(gte).toHaveBeenCalledWith('gestartet_am', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('does not bound the query for the whole history', async () => {
    const { result } = renderHook(() => useTrainingAnalysis('u1', 'alles'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(gte).not.toHaveBeenCalled()
  })

  it('reports a failed load instead of showing an empty chart', async () => {
    // supabase-js resolves on a failed read; an unchecked error would look like
    // "no training yet" and quietly misinform.
    ergebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.sessions).toEqual([])
  })
})

describe('useTrainingAnalysis sets', () => {
  const session = {
    id: 's1',
    gestartet_am: '2026-08-17T18:00:00Z',
    beendet_am: '2026-08-17T19:00:00Z',
    gesamt_kalorien: 300,
  }

  it('loads the sets of the loaded sessions and flattens the exercise', async () => {
    ergebnis = { data: [session], error: null }
    satzErgebnis = {
      data: [
        {
          id: 'x1',
          workout_session_id: 's1',
          exercise_id: 'e1',
          satz_nummer: 1,
          gewicht: 80,
          wiederholungen: 8,
          ist_aufwaermsatz: false,
          exercises: { name: 'Bankdruecken', muskelgruppen_primaer: ['brust'] },
        },
      ],
      error: null,
    }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(inFilter).toHaveBeenCalledWith('workout_session_id', ['s1'])
    expect(result.current.sets).toEqual([
      {
        id: 'x1',
        workout_session_id: 's1',
        exercise_id: 'e1',
        exercise_name: 'Bankdruecken',
        muskelgruppen: ['brust'],
        satz_nummer: 1,
        gewicht: 80,
        wiederholungen: 8,
        ist_aufwaermsatz: false,
      },
    ])
  })

  it('does not query sets when the range holds no session', async () => {
    // Ohne Sessions gibt es keine IDs zu filtern; `in` mit leerer Liste waere
    // eine Abfrage, die garantiert nichts liefert.
    ergebnis = { data: [], error: null }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(inFilter).not.toHaveBeenCalled()
    expect(result.current.sets).toEqual([])
  })

  it('survives a set whose exercise was deleted', async () => {
    // Die Uebungstabelle ist geteilt; eine geloeschte Uebung darf den Graphen
    // nicht mit `undefined.name` zerlegen.
    ergebnis = { data: [session], error: null }
    satzErgebnis = {
      data: [
        {
          id: 'x1',
          workout_session_id: 's1',
          exercise_id: 'e1',
          satz_nummer: 1,
          gewicht: 80,
          wiederholungen: 8,
          ist_aufwaermsatz: false,
          exercises: null,
        },
      ],
      error: null,
    }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sets[0].exercise_name).toBe('Unbekannte Uebung')
    expect(result.current.sets[0].muskelgruppen).toEqual([])
  })

  it('reports a failed set load like a failed session load', async () => {
    ergebnis = { data: [session], error: null }
    satzErgebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTrainingAnalysis } from './use-training-analysis'

const gte = vi.fn()
const order = vi.fn()
const eq = vi.fn()
const select = vi.fn()
const range = vi.fn()
const inFilter = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => ({ select: (columns: string) => select(table, columns) }) },
}))

type Ergebnis = { data: unknown; error: unknown }
let ergebnis: Ergebnis
let satzErgebnis: Ergebnis

/** Baut einen Query-Builder, dessen `.range()` terminal ist und einmalig `antwort()` liefert. */
function einseitigerBuilder(antwort: () => Ergebnis) {
  const builder: Record<string, unknown> = {
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
      return builder
    },
    range: (...args: unknown[]) => {
      range(...args)
      return Promise.resolve(antwort())
    },
  }
  return builder
}

beforeEach(() => {
  vi.clearAllMocks()
  ergebnis = { data: [], error: null }
  satzErgebnis = { data: [], error: null }
  select.mockImplementation((table: string) =>
    einseitigerBuilder(table === 'workout_session_sets' ? () => satzErgebnis : () => ergebnis),
  )
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

  it('paginates the sessions query with a row (id) tiebreaker', async () => {
    // Ohne Tiebreaker koennte eine Zeile an der Seitengrenze doppelt oder gar
    // nicht ankommen, weil `gestartet_am` ueber viele Sessions nicht eindeutig ist.
    renderHook(() => useTrainingAnalysis('u1', 30))
    await waitFor(() => expect(range).toHaveBeenCalled())
    expect(order).toHaveBeenCalledWith('id', { ascending: true })
    expect(range).toHaveBeenCalledWith(0, 499)
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

  it('keeps paging sessions until a short page arrives, so nothing is cut off at the row cap', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      id: `s${index}`,
      gestartet_am: '2026-08-17T18:00:00Z',
      beendet_am: null,
      gesamt_kalorien: null,
    }))
    const secondPage = [
      { id: 's500', gestartet_am: '2026-08-18T18:00:00Z', beendet_am: null, gesamt_kalorien: null },
    ]
    const pages = [firstPage, secondPage]
    let call = 0
    select.mockImplementation((table: string) => {
      if (table === 'workout_session_sets') return einseitigerBuilder(() => satzErgebnis)
      const builder: Record<string, unknown> = {
        eq: (...args: unknown[]) => {
          eq(...args)
          return builder
        },
        gte: (...args: unknown[]) => {
          gte(...args)
          return builder
        },
        order: (...args: unknown[]) => {
          order(...args)
          return builder
        },
        range: (...args: unknown[]) => {
          range(...args)
          return Promise.resolve({ data: pages[call++] ?? [], error: null })
        },
      }
      return builder
    })

    const { result } = renderHook(() => useTrainingAnalysis('u1', 'alles'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.sessions).toHaveLength(501)
    expect(range).toHaveBeenNthCalledWith(1, 0, 499)
    expect(range).toHaveBeenNthCalledWith(2, 500, 999)
  })

  it('reports an error instead of serving half-loaded sessions as complete', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      id: `s${index}`,
      gestartet_am: '2026-08-17T18:00:00Z',
      beendet_am: null,
      gesamt_kalorien: null,
    }))
    const results = [
      { data: firstPage, error: null },
      { data: null, error: { message: 'boom' } },
    ]
    let call = 0
    select.mockImplementation((table: string) => {
      if (table === 'workout_session_sets') return einseitigerBuilder(() => satzErgebnis)
      const builder: Record<string, unknown> = {
        eq: () => builder,
        gte: () => builder,
        order: () => builder,
        range: () => Promise.resolve(results[call++] ?? { data: [], error: null }),
      }
      return builder
    })

    const { result } = renderHook(() => useTrainingAnalysis('u1', 'alles'))
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
    expect(result.current.sets).toEqual([])
  })

  it('chunks session ids into groups of 100 for the sets query, so the url stays bounded', async () => {
    // Genau der Fehler, den Phase 3 schon einmal traf: alle IDs in einem
    // `.in()` waeren bei laenger Historie ein Query-String von zehn kB+.
    const sessions = Array.from({ length: 150 }, (_, index) => ({
      id: `s${index}`,
      gestartet_am: '2026-08-17T18:00:00Z',
      beendet_am: null,
      gesamt_kalorien: null,
    }))
    ergebnis = { data: sessions, error: null }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(inFilter).toHaveBeenCalledTimes(2)
    expect((inFilter.mock.calls[0] as unknown[])[1]).toHaveLength(100)
    expect((inFilter.mock.calls[1] as unknown[])[1]).toHaveLength(50)
  })

  it('keeps paging sets within a chunk until a short page arrives', async () => {
    ergebnis = { data: [session], error: null }
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      id: `x${index}`,
      workout_session_id: 's1',
      exercise_id: 'e1',
      satz_nummer: index + 1,
      gewicht: 80,
      wiederholungen: 8,
      ist_aufwaermsatz: false,
      exercises: { name: 'Bankdruecken', muskelgruppen_primaer: ['brust'] },
    }))
    const secondPage = [
      {
        id: 'x500',
        workout_session_id: 's1',
        exercise_id: 'e1',
        satz_nummer: 501,
        gewicht: 80,
        wiederholungen: 8,
        ist_aufwaermsatz: false,
        exercises: { name: 'Bankdruecken', muskelgruppen_primaer: ['brust'] },
      },
    ]
    const pages = [firstPage, secondPage]
    let call = 0
    select.mockImplementation((table: string) => {
      if (table !== 'workout_session_sets') return einseitigerBuilder(() => ergebnis)
      const builder: Record<string, unknown> = {
        eq: () => builder,
        in: (...args: unknown[]) => {
          inFilter(...args)
          return builder
        },
        order: (...args: unknown[]) => {
          order(...args)
          return builder
        },
        range: (...args: unknown[]) => {
          range(...args)
          return Promise.resolve({ data: pages[call++] ?? [], error: null })
        },
      }
      return builder
    })

    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.sets).toHaveLength(501)
    // Jede Seite baut ihre eigene Abfrage neu auf (wie supabase-js es auch
    // tut) — beide `.in()`-Aufrufe tragen aber denselben, einzigen Chunk: die
    // eine Session-ID passt locker in einen Chunk von 100.
    expect(inFilter).toHaveBeenCalledTimes(2)
    expect(inFilter).toHaveBeenNthCalledWith(1, 'workout_session_id', ['s1'])
    expect(inFilter).toHaveBeenNthCalledWith(2, 'workout_session_id', ['s1'])
  })

  it('reports an error instead of serving half-loaded sets as complete', async () => {
    ergebnis = { data: [session], error: null }
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      id: `x${index}`,
      workout_session_id: 's1',
      exercise_id: 'e1',
      satz_nummer: index + 1,
      gewicht: 80,
      wiederholungen: 8,
      ist_aufwaermsatz: false,
      exercises: null,
    }))
    const results = [
      { data: firstPage, error: null },
      { data: null, error: { message: 'boom' } },
    ]
    let call = 0
    select.mockImplementation((table: string) => {
      if (table !== 'workout_session_sets') return einseitigerBuilder(() => ergebnis)
      const builder: Record<string, unknown> = {
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        range: () => Promise.resolve(results[call++] ?? { data: [], error: null }),
      }
      return builder
    })

    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(true)
    expect(result.current.sets).toEqual([])
  })
})

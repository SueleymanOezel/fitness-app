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
  const satz = (id: string, satzNummer: number, exercises: unknown) => ({
    id,
    exercise_id: 'e1',
    satz_nummer: satzNummer,
    gewicht: 80,
    wiederholungen: 8,
    ist_aufwaermsatz: false,
    exercises,
  })
  const session = (sets: unknown[]) => ({
    id: 's1',
    gestartet_am: '2026-08-17T18:00:00Z',
    beendet_am: '2026-08-17T19:00:00Z',
    gesamt_kalorien: 300,
    workout_session_sets: sets,
  })

  // The training dashboard waited for sessions, then sets: one round trip more than
  // the other areas, felt on the phone ("Training lädt länger", 23.10.2026).
  it('loads the sets embedded in the sessions query, in one round trip', async () => {
    ergebnis = { data: [session([satz('x1', 1, { name: 'Bankdruecken', muskelgruppen_primaer: ['brust'] })])], error: null }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(select).toHaveBeenCalledTimes(1)
    expect(select).toHaveBeenCalledWith('workout_sessions', expect.stringContaining('workout_session_sets('))
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
    expect(result.current.sessions).toEqual([
      { id: 's1', gestartet_am: '2026-08-17T18:00:00Z', beendet_am: '2026-08-17T19:00:00Z', gesamt_kalorien: 300 },
    ])
  })

  it('orders the sets by set number, then id, across sessions', async () => {
    ergebnis = {
      data: [
        session([satz('x3', 2, null), satz('x1', 1, null)]),
        { ...session([satz('x0', 1, null)]), id: 's2' },
      ],
      error: null,
    }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sets.map((s) => s.id)).toEqual(['x0', 'x1', 'x3'])
  })

  it('survives a set whose exercise was deleted', async () => {
    // Die Uebungstabelle ist geteilt; eine geloeschte Uebung darf den Graphen
    // nicht mit `undefined.name` zerlegen.
    ergebnis = { data: [session([satz('x1', 1, null)])], error: null }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sets[0].exercise_name).toBe('Unbekannte Uebung')
    expect(result.current.sets[0].muskelgruppen).toEqual([])
  })

  it('uses the German exercise name when there is one', async () => {
    ergebnis = {
      data: [session([satz('x1', 1, { name: 'Bench Press', name_de: 'Bankdrücken', muskelgruppen_primaer: ['brust'] })])],
      error: null,
    }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sets[0].exercise_name).toBe('Bankdrücken')
  })

  it('selects name_de in the embed so no chart shows the English name', async () => {
    renderHook(() => useTrainingAnalysis('u1', 30))
    await waitFor(() => expect(select).toHaveBeenCalledWith('workout_sessions', expect.stringContaining('name_de')))
  })

  it('treats a session without sets as empty, not as an error', async () => {
    ergebnis = { data: [{ ...session([]), workout_session_sets: null }], error: null }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(false)
    expect(result.current.sets).toEqual([])
    expect(result.current.sessions).toHaveLength(1)
  })
})

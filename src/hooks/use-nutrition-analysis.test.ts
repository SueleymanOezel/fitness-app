import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNutritionAnalysis } from './use-nutrition-analysis'
import { PAGE_SIZE } from '../lib/paged-query'

const gte = vi.fn()
const order = vi.fn()
const eq = vi.fn()
const select = vi.fn()
const range = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => ({ select: (columns: string) => select(table, columns) }) },
}))

type Ergebnis = { data: unknown; error: unknown }
let eintragSeiten: Ergebnis[]
let sessionSeiten: Ergebnis[]

/** Baut einen Query-Builder, dessen `.range()` terminal ist und die naechste Seite liefert. */
function builderFuer(seiten: () => Ergebnis[]) {
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
      return Promise.resolve(seiten().shift() ?? { data: [], error: null })
    },
  }
  return builder
}

beforeEach(() => {
  vi.clearAllMocks()
  eintragSeiten = []
  sessionSeiten = []
  select.mockImplementation((table: string) =>
    builderFuer(() => (table === 'workout_sessions' ? sessionSeiten : eintragSeiten)),
  )
})

const eintrag = {
  zeitpunkt: '2026-08-24T08:00:00Z',
  menge: 100,
  mahlzeit: 1,
  products: { kalorien: 250, eiweiss: 10, fett: 5, kohlenhydrate: 40 },
}

describe('useNutritionAnalysis', () => {
  it('loads entries with the nutritional values the charts need', async () => {
    eintragSeiten = [{ data: [eintrag], error: null }]
    const { result } = renderHook(() => useNutritionAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.entries).toHaveLength(1)
    expect(eq).toHaveBeenCalledWith('user_id', 'u1')
    // The embedded product columns must be part of the one query; a second
    // round-trip per entry would make a 90-day range unusable.
    const [, columns] = select.mock.calls[0]
    expect(columns).toContain('products(')
    expect(columns).toContain('kalorien')
    expect(columns).toContain('eiweiss')
  })

  it('bounds the query by the range and orders oldest first', async () => {
    renderHook(() => useNutritionAnalysis('u1', 90))
    await waitFor(() => expect(order).toHaveBeenCalled())
    expect(gte).toHaveBeenCalledWith('zeitpunkt', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(order).toHaveBeenCalledWith('zeitpunkt', { ascending: true })
  })

  it('does not bound the query for the whole history', async () => {
    const { result } = renderHook(() => useNutritionAnalysis('u1', 'alles'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(gte).not.toHaveBeenCalled()
  })

  it('reports a failed load', async () => {
    eintragSeiten = [{ data: null, error: { message: 'boom' } }]
    const { result } = renderHook(() => useNutritionAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.entries).toEqual([])
  })

  it('pages through the entries instead of stopping at the row cap', async () => {
    // PostgREST deckelt still bei db-max-rows: ohne Blaettern fehlte einem
    // aktiven Nutzer ueber `alles` schlicht ein Teil des Jahres.
    const volleSeite = Array.from({ length: PAGE_SIZE }, () => eintrag)
    eintragSeiten = [
      { data: volleSeite, error: null },
      { data: [eintrag], error: null },
    ]
    const { result } = renderHook(() => useNutritionAnalysis('u1', 'alles'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.entries).toHaveLength(PAGE_SIZE + 1)
    expect(range).toHaveBeenNthCalledWith(1, 0, PAGE_SIZE - 1)
    expect(range).toHaveBeenNthCalledWith(2, PAGE_SIZE, 2 * PAGE_SIZE - 1)
  })

  it('loads the session calories of the same range in a second query', async () => {
    // E6 rechnet Aufnahme minus Trainingsverbrauch; die Sessions liegen in einer
    // anderen Tabelle ohne Beziehung zu food_entries — also eine zweite Abfrage,
    // kein Join.
    eintragSeiten = [{ data: [eintrag], error: null }]
    sessionSeiten = [
      { data: [{ gestartet_am: '2026-08-24T18:00:00Z', gesamt_kalorien: 420 }], error: null },
    ]
    const { result } = renderHook(() => useNutritionAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions).toEqual([
      { gestartet_am: '2026-08-24T18:00:00Z', gesamt_kalorien: 420 },
    ])
    const sessionAufruf = select.mock.calls.find(([table]) => table === 'workout_sessions')
    expect(sessionAufruf).toBeDefined()
    expect(sessionAufruf![1]).toContain('gesamt_kalorien')
    expect(gte).toHaveBeenCalledWith('gestartet_am', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('reports a failed session load like a failed entry load', async () => {
    eintragSeiten = [{ data: [eintrag], error: null }]
    sessionSeiten = [{ data: null, error: { message: 'boom' } }]
    const { result } = renderHook(() => useNutritionAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.sessions).toEqual([])
  })
})

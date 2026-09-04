import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBodyAnalysis } from './use-body-analysis'

const gte = vi.fn()
const order = vi.fn()
const eq = vi.fn()
const range = vi.fn()
const select = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => ({ select: (columns: string) => select(table, columns) }) },
}))

type Ergebnis = { data: unknown; error: unknown }
let metrikErgebnis: Ergebnis
let essenErgebnis: Ergebnis

beforeEach(() => {
  vi.clearAllMocks()
  metrikErgebnis = { data: [], error: null }
  essenErgebnis = { data: [], error: null }
  select.mockImplementation((table: string) => {
    const antwort = () => (table === 'food_entries' ? essenErgebnis : metrikErgebnis)
    const builder = {
      eq: (...args: unknown[]) => {
        eq(table, ...args)
        return builder
      },
      gte: (...args: unknown[]) => {
        gte(table, ...args)
        return builder
      },
      order: (...args: unknown[]) => {
        order(table, ...args)
        return builder
      },
      range: (...args: unknown[]) => {
        range(table, ...args)
        return Promise.resolve(antwort())
      },
    }
    return builder
  })
})

describe('useBodyAnalysis', () => {
  it('loads the measurement columns of the range, oldest first', async () => {
    metrikErgebnis = { data: [{ id: 'a', datum: '2026-08-17', gewicht: 83.3 }], error: null }
    const { result } = renderHook(() => useBodyAnalysis('u1', 90))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rows).toHaveLength(1)
    expect(eq).toHaveBeenCalledWith('body_metrics', 'user_id', 'u1')
    expect(order).toHaveBeenCalledWith('body_metrics', 'datum', { ascending: true })
    const [, columns] = select.mock.calls[0]
    // K2 braucht jeden Umfang, deshalb die geteilte Feldliste statt einer von
    // Hand geschriebenen Teilmenge, die davon abdriften kann.
    expect(columns).toContain('bauchumfang')
    expect(columns).toContain('koerperfettanteil')
  })

  it('bounds both queries by the range', async () => {
    const { result } = renderHook(() => useBodyAnalysis('u1', 30))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(gte).toHaveBeenCalledWith('body_metrics', 'datum', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(gte).toHaveBeenCalledWith('food_entries', 'zeitpunkt', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('does not bound the queries for the whole history', async () => {
    const { result } = renderHook(() => useBodyAnalysis('u1', 'alles'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(gte).not.toHaveBeenCalled()
  })

  it('pages every query', async () => {
    // Ohne .range() schneidet PostgREST bei db-max-rows still ab, und das
    // aufsteigende order() macht daraus einen Verlust genau der juengsten Tage.
    const { result } = renderHook(() => useBodyAnalysis('u1', 'alles'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(range).toHaveBeenCalledWith('body_metrics', 0, 499)
    expect(range).toHaveBeenCalledWith('food_entries', 0, 499)
  })

  it('sums the calories of the range per local day', async () => {
    // Die Tagessumme ist das, was K4 braucht; die Einzeleintraege interessieren
    // den Koerperbereich nicht.
    essenErgebnis = {
      data: [
        { zeitpunkt: new Date(2026, 7, 17, 12, 0).toISOString(), menge: 200, products: { kalorien: 100 } },
        { zeitpunkt: new Date(2026, 7, 17, 19, 0).toISOString(), menge: 100, products: { kalorien: 50 } },
        { zeitpunkt: new Date(2026, 7, 18, 12, 0).toISOString(), menge: 100, products: { kalorien: 300 } },
      ],
      error: null,
    }
    const { result } = renderHook(() => useBodyAnalysis('u1', 90))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.kalorien).toEqual([
      { tag: '2026-08-17', kalorien: 250 },
      { tag: '2026-08-18', kalorien: 300 },
    ])
  })

  it('reports a failed measurement load', async () => {
    metrikErgebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useBodyAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.rows).toEqual([])
  })

  it('reports a failed calorie load like a failed measurement load', async () => {
    // Die Meldung gehoert dem Bereich (Spec 5). Ein halb geladener Bereich, der
    // sich vollstaendig gibt, ist schlimmer als eine sichtbare Fehlermeldung.
    essenErgebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useBodyAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.kalorien).toEqual([])
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNutritionAnalysis } from './use-nutrition-analysis'

const gte = vi.fn()
const order = vi.fn()
const eq = vi.fn()
const select = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => ({ select: (columns: string) => select(table, columns) }) },
}))

let ergebnis: { data: unknown; error: unknown }

beforeEach(() => {
  vi.clearAllMocks()
  ergebnis = { data: [], error: null }
  const builder = {
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
      return Promise.resolve(ergebnis)
    },
  }
  select.mockImplementation(() => builder)
})

describe('useNutritionAnalysis', () => {
  it('loads entries with the nutritional values the charts need', async () => {
    ergebnis = {
      data: [
        {
          zeitpunkt: '2026-08-24T08:00:00Z',
          menge: 100,
          mahlzeit: 1,
          products: { kalorien: 250, eiweiss: 10, fett: 5, kohlenhydrate: 40 },
        },
      ],
      error: null,
    }
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
    ergebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useNutritionAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.entries).toEqual([])
  })
})

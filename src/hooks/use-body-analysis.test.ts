import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBodyAnalysis } from './use-body-analysis'

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

describe('useBodyAnalysis', () => {
  it('loads the measurement columns of the range, oldest first', async () => {
    ergebnis = { data: [{ id: 'a', datum: '2026-08-17', gewicht: 83.3 }], error: null }
    const { result } = renderHook(() => useBodyAnalysis('u1', 90))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rows).toHaveLength(1)
    expect(eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(order).toHaveBeenCalledWith('datum', { ascending: true })
    const [, columns] = select.mock.calls[0]
    // K2 needs every circumference, so the column list is the shared one rather
    // than a hand-written subset that could drift from the field list.
    expect(columns).toContain('bauchumfang')
    expect(columns).toContain('koerperfettanteil')
  })

  it('bounds the query by the range', async () => {
    renderHook(() => useBodyAnalysis('u1', 30))
    await waitFor(() => expect(gte).toHaveBeenCalled())
    expect(gte).toHaveBeenCalledWith('datum', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('does not bound the query for the whole history', async () => {
    const { result } = renderHook(() => useBodyAnalysis('u1', 'alles'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(gte).not.toHaveBeenCalled()
  })

  it('reports a failed load', async () => {
    ergebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useBodyAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.rows).toEqual([])
  })
})

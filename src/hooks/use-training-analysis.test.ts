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

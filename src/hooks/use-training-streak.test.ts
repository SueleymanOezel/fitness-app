import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTrainingStreak } from './use-training-streak'

const eq = vi.fn()
const not = vi.fn()
const order = vi.fn()
const range = vi.fn()
const select = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => ({ select: (columns: string) => select(table, columns) }) },
}))

type Ergebnis = { data: unknown; error: unknown }
let ergebnis: Ergebnis

/** Baut einen Query-Builder, dessen `.range()` terminal ist und einmalig `antwort()` liefert. */
function einseitigerBuilder(antwort: () => Ergebnis) {
  const builder: Record<string, unknown> = {
    eq: (...args: unknown[]) => {
      eq(...args)
      return builder
    },
    not: (...args: unknown[]) => {
      not(...args)
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
  select.mockImplementation(() => einseitigerBuilder(() => ergebnis))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useTrainingStreak', () => {
  it('computes the streak from the loaded sessions', async () => {
    vi.setSystemTime(new Date('2026-08-24T12:00:00Z'))
    ergebnis = {
      data: [{ beendet_am: '2026-08-24T18:00:00Z' }, { beendet_am: '2026-08-23T18:00:00Z' }],
      error: null,
    }
    const { result } = renderHook(() => useTrainingStreak('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.streak).toBe(2)
  })

  it('scopes the query to the given user and only finished sessions', async () => {
    renderHook(() => useTrainingStreak('u1'))
    await waitFor(() => expect(range).toHaveBeenCalled())
    expect(eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(not).toHaveBeenCalledWith('beendet_am', 'is', null)
  })

  it('does not bound the query by any time range', async () => {
    // A streak can be older than every dashboard window (90 days) — see the
    // spec's "Entscheidung 3".
    renderHook(() => useTrainingStreak('u1'))
    await waitFor(() => expect(range).toHaveBeenCalled())
    expect(select).toHaveBeenCalledWith('workout_sessions', 'beendet_am')
  })

  it('reports 0 instead of crashing when the query fails', async () => {
    ergebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useTrainingStreak('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.streak).toBe(0)
  })
})

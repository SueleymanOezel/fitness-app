import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { cacheLesen, cacheSchreiben } from '../lib/stale-cache'

/**
 * The "last-known copy" behaviour shared by the read hooks (src/hooks/use-stale-state.ts):
 * start from the copy, refresh in the background, keep the copy when the refresh fails
 * (offline), and never let a failed refresh without any copy look like an empty result.
 */

function builder(result: { data: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {
    select: vi.fn(() => b),
    eq: vi.fn(() => b),
    gte: vi.fn(() => b),
    lt: vi.fn(() => b),
    order: vi.fn(() => b),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return b
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const sitzung = {
  id: 's1',
  gestartet_am: '2026-10-17T10:00:00.000Z',
  beendet_am: '2026-10-17T11:00:00.000Z',
  gesamt_kalorien: 400,
  workout_plan_days: { name: 'Tag A', workout_plans: { name: 'Plan' } },
}
const sitzungKopie = {
  id: 's1',
  gestartet_am: '2026-10-17T10:00:00.000Z',
  beendet_am: '2026-10-17T11:00:00.000Z',
  gesamt_kalorien: 400,
  tag_name: 'Tag A',
  plan_name: 'Plan',
}

describe('useWorkoutHistory with a last-known copy', () => {
  it('shows the copy at once, without a loading state, and refreshes it', async () => {
    cacheSchreiben('u1', 'workout-history', [{ ...sitzungKopie, id: 'alt' }])
    mockFrom.mockReturnValue(builder({ data: [sitzung] }))

    const { useWorkoutHistory } = await import('./use-workout-history')
    const { result } = renderHook(() => useWorkoutHistory('u1'))

    expect(result.current.loading).toBe(false)
    expect(result.current.sessions.map((s) => s.id)).toEqual(['alt'])

    await waitFor(() => expect(result.current.sessions.map((s) => s.id)).toEqual(['s1']))
    expect(cacheLesen('u1', 'workout-history')).toEqual([sitzungKopie])
  })

  it('keeps the copy and reports no error when the refresh fails (offline)', async () => {
    cacheSchreiben('u1', 'workout-history', [sitzungKopie])
    mockFrom.mockReturnValue(builder({ data: null, error: { message: 'Failed to fetch' } }))

    const { useWorkoutHistory } = await import('./use-workout-history')
    const { result } = renderHook(() => useWorkoutHistory('u1'))

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions).toEqual([sitzungKopie])
    expect(result.current.error).toBe(false)
  })

  it('still reports an error when the refresh fails and there is no copy', async () => {
    mockFrom.mockReturnValue(builder({ data: null, error: { message: 'boom' } }))

    const { useWorkoutHistory } = await import('./use-workout-history')
    const { result } = renderHook(() => useWorkoutHistory('u1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.sessions).toEqual([])
  })

  it('does not show another user\'s copy', async () => {
    cacheSchreiben('u2', 'workout-history', [sitzungKopie])
    mockFrom.mockReturnValue(builder({ data: [] }))

    const { useWorkoutHistory } = await import('./use-workout-history')
    const { result } = renderHook(() => useWorkoutHistory('u1'))

    expect(result.current.loading).toBe(true)
    expect(result.current.sessions).toEqual([])
  })
})

describe('useProfile with a last-known copy', () => {
  it('keeps the copy instead of reporting a missing profile when the refresh fails', async () => {
    const kopie = { id: 'u1', name: 'Test' }
    cacheSchreiben('u1', 'profile', kopie)
    mockFrom.mockReturnValue(builder({ data: null, error: { message: 'Failed to fetch' } }))

    const { useProfile } = await import('./use-profile')
    const { result } = renderHook(() => useProfile('u1'))

    expect(result.current.profile).toEqual(kopie)
    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toEqual(kopie)
    expect(result.current.error).toBe(false)
  })
})

describe('useFoodEntries with a last-known copy', () => {
  it('keeps one copy per day, so yesterday never passes for today', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      vi.setSystemTime(new Date('2026-10-18T12:00:00'))
      cacheSchreiben('u1', 'food-entries@2026-10-17', [{ id: 'gestern' }])
      mockFrom.mockReturnValue(builder({ data: [{ id: 'heute' }] }))

      const { useFoodEntries } = await import('./use-food-entries')
      const { result } = renderHook(() => useFoodEntries('u1'))

      expect(result.current.loading).toBe(true)
      expect(result.current.entries).toEqual([])
      await waitFor(() => expect(result.current.entries).toEqual([{ id: 'heute' }]))
      expect(cacheLesen('u1', 'food-entries@2026-10-18')).toEqual([{ id: 'heute' }])
      expect(cacheLesen('u1', 'food-entries@2026-10-17')).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('useActiveTrainingDay with a last-known copy', () => {
  it('keeps the plan and day when the refresh fails instead of "no active plan"', async () => {
    const kopie = { plan: { id: 'p1', name: 'Ganzkörper' }, day: { id: 'd1', name: 'Tag A', reihenfolge: 1 } }
    cacheSchreiben('u1', 'active-training-day', kopie)
    mockFrom.mockReturnValue(builder({ data: null, error: { message: 'Failed to fetch' } }))

    const { useActiveTrainingDay } = await import('./use-active-training-day')
    const { result } = renderHook(() => useActiveTrainingDay('u1'))

    expect(result.current.loading).toBe(false)
    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    await waitFor(() => expect(result.current.plan).toEqual(kopie.plan))
    expect(result.current.day).toEqual(kopie.day)
    expect(result.current.error).toBe(false)
  })
})

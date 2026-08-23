import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const row = {
  id: 's1',
  gestartet_am: '2026-08-20T10:00:00.000Z',
  beendet_am: '2026-08-20T11:00:00.000Z',
  gesamt_kalorien: 400,
  workout_plan_days: { name: 'Tag A', workout_plans: { name: 'Ganzkörper' } },
}

describe('useWorkoutHistory', () => {
  it('loads past sessions newest first, with plan and day names', async () => {
    const builder = createQueryBuilder({ data: [row] })
    mockFrom.mockReturnValue(builder)

    const { useWorkoutHistory } = await import('./use-workout-history')
    const { result } = renderHook(() => useWorkoutHistory('u1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions).toEqual([
      {
        id: 's1',
        gestartet_am: '2026-08-20T10:00:00.000Z',
        beendet_am: '2026-08-20T11:00:00.000Z',
        gesamt_kalorien: 400,
        tag_name: 'Tag A',
        plan_name: 'Ganzkörper',
      },
    ])
    expect(builder.order).toHaveBeenCalledWith('gestartet_am', { ascending: false })
  })

  it('keeps a session whose day or plan was deleted', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: [{ ...row, workout_plan_days: null }] }))

    const { useWorkoutHistory } = await import('./use-workout-history')
    const { result } = renderHook(() => useWorkoutHistory('u1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions[0].tag_name).toBeNull()
    expect(result.current.sessions[0].plan_name).toBeNull()
  })
})

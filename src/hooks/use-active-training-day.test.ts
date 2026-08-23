import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const plan = { id: 'p1', name: 'Ganzkörper', aktiv: true, user_id: 'u1' }
const dayA = { id: 'a', name: 'Tag A', reihenfolge: 1 }
const dayB = { id: 'b', name: 'Tag B', reihenfolge: 2 }

describe('useActiveTrainingDay', () => {
  it('suggests the first day when the active plan has no prior session', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: [plan] })
      if (table === 'workout_plan_days') return createQueryBuilder({ data: [dayA, dayB] })
      if (table === 'workout_sessions') return createQueryBuilder({ data: [] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useActiveTrainingDay } = await import('./use-active-training-day')
    const { result } = renderHook(() => useActiveTrainingDay('u1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.plan).toEqual(plan)
    expect(result.current.day).toEqual(dayA)
  })

  it('suggests the day after the last completed session', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: [plan] })
      if (table === 'workout_plan_days') return createQueryBuilder({ data: [dayA, dayB] })
      if (table === 'workout_sessions') return createQueryBuilder({ data: [{ workout_plan_day_id: 'a' }] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useActiveTrainingDay } = await import('./use-active-training-day')
    const { result } = renderHook(() => useActiveTrainingDay('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.day).toEqual(dayB)
  })

  it('ignores sessions that were never finished when picking the last one', async () => {
    const sessionBuilder = createQueryBuilder({ data: [{ workout_plan_day_id: 'a' }] })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: [plan] })
      if (table === 'workout_plan_days') return createQueryBuilder({ data: [dayA, dayB] })
      if (table === 'workout_sessions') return sessionBuilder
      throw new Error(`unexpected table ${table}`)
    })

    const { useActiveTrainingDay } = await import('./use-active-training-day')
    const { result } = renderHook(() => useActiveTrainingDay('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(sessionBuilder.not).toHaveBeenCalledWith('beendet_am', 'is', null)
  })

  it('has no plan and no day when nothing is active', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: [] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useActiveTrainingDay } = await import('./use-active-training-day')
    const { result } = renderHook(() => useActiveTrainingDay('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.plan).toBeNull()
    expect(result.current.day).toBeNull()
  })

  it('has a plan but no day when the active plan has no days yet', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: [plan] })
      if (table === 'workout_plan_days') return createQueryBuilder({ data: [] })
      if (table === 'workout_sessions') return createQueryBuilder({ data: [] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useActiveTrainingDay } = await import('./use-active-training-day')
    const { result } = renderHook(() => useActiveTrainingDay('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.plan).toEqual(plan)
    expect(result.current.day).toBeNull()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
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

const plan = { id: 'p1', name: 'Ganzkörper', aktiv: true }

describe('useWorkoutPlans', () => {
  it("loads the user's plans", async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: [plan] }))

    const { useWorkoutPlans } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlans('u1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.plans).toEqual([plan])
  })

  it('creates a plan and reloads', async () => {
    const builder = createQueryBuilder({ data: [plan] })
    mockFrom.mockReturnValue(builder)

    const { useWorkoutPlans } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlans('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.createPlan('Push/Pull/Legs')

    expect(builder.insert).toHaveBeenCalledWith({ user_id: 'u1', name: 'Push/Pull/Legs', aktiv: false })
  })

  it('deletes a plan and reloads', async () => {
    const builder = createQueryBuilder({ data: [plan] })
    mockFrom.mockReturnValue(builder)

    const { useWorkoutPlans } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlans('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.deletePlan('p1')

    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1')
  })

  it('activates a plan by deactivating the others first', async () => {
    const builder = createQueryBuilder({ data: [plan] })
    mockFrom.mockReturnValue(builder)

    const { useWorkoutPlans } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlans('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.activatePlan('p1')

    expect(builder.update).toHaveBeenNthCalledWith(1, { aktiv: false })
    expect(builder.update).toHaveBeenNthCalledWith(2, { aktiv: true })
  })
})

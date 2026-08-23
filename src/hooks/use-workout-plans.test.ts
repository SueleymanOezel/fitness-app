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
    in: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
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

const day = { id: 'd1', workout_plan_id: 'p1', name: 'Tag A', reihenfolge: 1 }
const dayExercise = {
  id: 'de1',
  workout_plan_day_id: 'd1',
  exercise_id: 'ex1',
  reihenfolge: 1,
  ziel_saetze: 3,
  ziel_wiederholungen: 10,
  pausenzeit_sekunden: 90,
  exercises: { id: 'ex1', name: 'Bankdrücken' },
}

describe('useWorkoutPlan', () => {
  it('loads a single plan with its days and their exercises', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: plan })
      if (table === 'workout_plan_days') return createQueryBuilder({ data: [day] })
      if (table === 'workout_plan_day_exercises') return createQueryBuilder({ data: [dayExercise] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useWorkoutPlan } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlan('p1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.plan).toEqual(plan)
    expect(result.current.days).toEqual([
      {
        id: 'd1',
        name: 'Tag A',
        reihenfolge: 1,
        exercises: [
          {
            id: 'de1',
            exercise_id: 'ex1',
            reihenfolge: 1,
            ziel_saetze: 3,
            ziel_wiederholungen: 10,
            pausenzeit_sekunden: 90,
            exercise: { id: 'ex1', name: 'Bankdrücken' },
          },
        ],
      },
    ])
  })

  it('loads only the day exercises belonging to this plan', async () => {
    const exerciseBuilder = createQueryBuilder({ data: [dayExercise] })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: plan })
      if (table === 'workout_plan_days') return createQueryBuilder({ data: [day] })
      if (table === 'workout_plan_day_exercises') return exerciseBuilder
      throw new Error(`unexpected table ${table}`)
    })

    const { useWorkoutPlan } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlan('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(exerciseBuilder.in).toHaveBeenCalledWith('workout_plan_day_id', ['d1'])
  })

  it('adds a day with the next reihenfolge', async () => {
    const dayBuilder = createQueryBuilder({ data: [day] })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: plan })
      if (table === 'workout_plan_days') return dayBuilder
      if (table === 'workout_plan_day_exercises') return createQueryBuilder({ data: [] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useWorkoutPlan } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlan('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.addDay('Tag B')

    expect(dayBuilder.insert).toHaveBeenCalledWith({ workout_plan_id: 'p1', name: 'Tag B', reihenfolge: 2 })
  })

  it('swaps reihenfolge with the next day when moving down', async () => {
    const dayTwo = { ...day, id: 'd2', name: 'Tag B', reihenfolge: 2 }
    const dayBuilder = createQueryBuilder({ data: [day, dayTwo] })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: plan })
      if (table === 'workout_plan_days') return dayBuilder
      if (table === 'workout_plan_day_exercises') return createQueryBuilder({ data: [] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useWorkoutPlan } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlan('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.moveDay('d1', 'down')

    expect(dayBuilder.update).toHaveBeenNthCalledWith(1, { reihenfolge: 2 })
    expect(dayBuilder.update).toHaveBeenNthCalledWith(2, { reihenfolge: 1 })
  })

  it('does not write when the day is already at the edge', async () => {
    const dayBuilder = createQueryBuilder({ data: [day] })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: plan })
      if (table === 'workout_plan_days') return dayBuilder
      if (table === 'workout_plan_day_exercises') return createQueryBuilder({ data: [] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useWorkoutPlan } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlan('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.moveDay('d1', 'up')

    expect(dayBuilder.update).not.toHaveBeenCalled()
  })

  it('adds an exercise to a day with the next reihenfolge', async () => {
    const exerciseBuilder = createQueryBuilder({ data: [dayExercise] })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: plan })
      if (table === 'workout_plan_days') return createQueryBuilder({ data: [day] })
      if (table === 'workout_plan_day_exercises') return exerciseBuilder
      throw new Error(`unexpected table ${table}`)
    })

    const { useWorkoutPlan } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlan('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.addExerciseToDay('d1', 'ex2')

    expect(exerciseBuilder.insert).toHaveBeenCalledWith({
      workout_plan_day_id: 'd1',
      exercise_id: 'ex2',
      reihenfolge: 2,
    })
  })

  it('rejects instead of reporting success when a write fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: plan })
      if (table === 'workout_plan_days') return createQueryBuilder({ data: [day], error: { message: 'boom' } })
      if (table === 'workout_plan_day_exercises') return createQueryBuilder({ data: [] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useWorkoutPlan } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlan('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.addDay('Tag B')).rejects.toThrow()
  })
})

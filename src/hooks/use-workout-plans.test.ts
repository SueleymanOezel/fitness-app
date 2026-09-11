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
type RpcResult = Promise<{ error: { message: string } | null }>
const mockRpc = vi.fn((): RpcResult => Promise.resolve({ error: null }))
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (...args: unknown[]) => mockRpc(...(args as [])),
  },
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

  it('activates a plan in one database statement instead of two writes', async () => {
    const builder = createQueryBuilder({ data: [plan] })
    mockFrom.mockReturnValue(builder)
    mockRpc.mockResolvedValue({ error: null })

    const { useWorkoutPlans } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlans('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.activatePlan('p1')

    expect(mockRpc).toHaveBeenCalledWith('activate_workout_plan', { plan_id: 'p1' })
    // No half-applied state: the hook never clears the flag on its own.
    expect(builder.update).not.toHaveBeenCalled()
  })

  it('rejects instead of reporting success when activating fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: [plan] }))
    mockRpc.mockResolvedValue({ error: { message: 'boom' } })

    const { useWorkoutPlans } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlans('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.activatePlan('p1')).rejects.toThrow()
    mockRpc.mockResolvedValue({ error: null })
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
  exercises: { id: 'ex1', name: 'Bench Press', name_de: 'Bankdrücken', bild_url: 'https://example.com/bank.jpg' },
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
            exercise: {
              id: 'ex1',
              name: 'Bench Press',
              name_de: 'Bankdrücken',
              bild_url: 'https://example.com/bank.jpg',
            },
          },
        ],
      },
    ])
  })

  it('requests the translated name and image alongside the exercise embed', async () => {
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

    expect(exerciseBuilder.select).toHaveBeenCalledWith(
      'id, workout_plan_day_id, exercise_id, reihenfolge, ziel_saetze, ziel_wiederholungen, pausenzeit_sekunden, exercises(id, name, name_de, bild_url)',
    )
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

  it('adds several exercises to a day in one insert with sequential reihenfolge values', async () => {
    // A single snapshot of `days` is read once before any insert — computing
    // it per-item across separate awaited calls would let each one see the
    // same stale state and race to the same reihenfolge (see the picker's
    // onAddSelected comment in TrainingPlanEditPage.tsx for why that matters).
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

    await result.current.addExercisesToDay('d1', ['ex2', 'ex3'])

    expect(exerciseBuilder.insert).toHaveBeenCalledWith([
      { workout_plan_day_id: 'd1', exercise_id: 'ex2', reihenfolge: 2 },
      { workout_plan_day_id: 'd1', exercise_id: 'ex3', reihenfolge: 3 },
    ])
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

  it('skips ids the day already contains, including a duplicate within the same batch', async () => {
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

    // ex1 is already in the day; ex2 is requested twice in the same call.
    await result.current.addExercisesToDay('d1', ['ex1', 'ex2', 'ex2'])

    expect(exerciseBuilder.insert).toHaveBeenCalledWith([
      { workout_plan_day_id: 'd1', exercise_id: 'ex2', reihenfolge: 2 },
    ])
  })

  it('does nothing when every requested id is already in the day', async () => {
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

    await result.current.addExercisesToDay('d1', ['ex1'])

    expect(exerciseBuilder.insert).not.toHaveBeenCalled()
  })

  it('restores the first row when the second half of a swap fails', async () => {
    const dayTwo = { ...day, id: 'd2', name: 'Tag B', reihenfolge: 2 }
    let updateCall = 0
    let pendingError: unknown = null
    const dayBuilder: Record<string, unknown> = {
      select: vi.fn(() => dayBuilder),
      insert: vi.fn(() => dayBuilder),
      // Only the second update fails; the third is the compensating write.
      update: vi.fn(() => {
        updateCall += 1
        pendingError = updateCall === 2 ? { message: 'boom' } : null
        return dayBuilder
      }),
      delete: vi.fn(() => dayBuilder),
      eq: vi.fn(() => dayBuilder),
      order: vi.fn(() => dayBuilder),
      in: vi.fn(() => dayBuilder),
      maybeSingle: vi.fn(() => dayBuilder),
      then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => {
        const error = pendingError
        pendingError = null
        return resolve({ data: [day, dayTwo], error })
      },
    }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: plan })
      if (table === 'workout_plan_days') return dayBuilder
      if (table === 'workout_plan_day_exercises') return createQueryBuilder({ data: [] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useWorkoutPlan } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlan('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.moveDay('d1', 'down')).rejects.toThrow()

    // 1: d1 -> 2 (ok), 2: d2 -> 1 (fails), 3: d1 back to its original 1
    expect(dayBuilder.update).toHaveBeenCalledTimes(3)
    expect(dayBuilder.update).toHaveBeenNthCalledWith(3, { reihenfolge: 1 })
  })

  it('says so when the compensating write also fails and the order stays broken', async () => {
    const dayTwo = { ...day, id: 'd2', name: 'Tag B', reihenfolge: 2 }
    let updateCall = 0
    let pendingError: unknown = null
    const dayBuilder: Record<string, unknown> = {
      select: vi.fn(() => dayBuilder),
      insert: vi.fn(() => dayBuilder),
      // Both the second write and the rollback fail.
      update: vi.fn(() => {
        updateCall += 1
        pendingError = updateCall >= 2 ? { message: 'boom' } : null
        return dayBuilder
      }),
      delete: vi.fn(() => dayBuilder),
      eq: vi.fn(() => dayBuilder),
      order: vi.fn(() => dayBuilder),
      in: vi.fn(() => dayBuilder),
      maybeSingle: vi.fn(() => dayBuilder),
      then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => {
        const error = pendingError
        pendingError = null
        return resolve({ data: [day, dayTwo], error })
      },
    }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: plan })
      if (table === 'workout_plan_days') return dayBuilder
      if (table === 'workout_plan_day_exercises') return createQueryBuilder({ data: [] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useWorkoutPlan } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlan('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.moveDay('d1', 'down')).rejects.toThrow('left the order broken')
  })

  it('restores the first exercise row when the second half of its swap fails', async () => {
    const secondRow = { ...dayExercise, id: 'de2', exercise_id: 'ex2', reihenfolge: 2 }
    let updateCall = 0
    let pendingError: unknown = null
    const exerciseBuilder: Record<string, unknown> = {
      select: vi.fn(() => exerciseBuilder),
      insert: vi.fn(() => exerciseBuilder),
      update: vi.fn(() => {
        updateCall += 1
        pendingError = updateCall === 2 ? { message: 'boom' } : null
        return exerciseBuilder
      }),
      delete: vi.fn(() => exerciseBuilder),
      eq: vi.fn(() => exerciseBuilder),
      order: vi.fn(() => exerciseBuilder),
      in: vi.fn(() => exerciseBuilder),
      maybeSingle: vi.fn(() => exerciseBuilder),
      then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => {
        const error = pendingError
        pendingError = null
        return resolve({ data: [dayExercise, secondRow], error })
      },
    }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_plans') return createQueryBuilder({ data: plan })
      if (table === 'workout_plan_days') return createQueryBuilder({ data: [day] })
      if (table === 'workout_plan_day_exercises') return exerciseBuilder
      throw new Error(`unexpected table ${table}`)
    })

    const { useWorkoutPlan } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlan('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.moveDayExercise('d1', 'de1', 'down')).rejects.toThrow()

    expect(exerciseBuilder.update).toHaveBeenCalledTimes(3)
    expect(exerciseBuilder.update).toHaveBeenNthCalledWith(3, { reihenfolge: 1 })
  })
})

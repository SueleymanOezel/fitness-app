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
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const sessionRow = {
  id: 's1',
  workout_plan_day_id: 'd1',
  gestartet_am: '2026-08-21T10:00:00.000Z',
  beendet_am: null,
  gesamt_kalorien: null,
}

const dayExerciseRow = {
  exercise_id: 'ex1',
  reihenfolge: 1,
  ziel_saetze: 3,
  ziel_wiederholungen: 10,
  pausenzeit_sekunden: 90,
  exercises: { id: 'ex1', name: 'Bankdrücken' },
}

const setRow = {
  id: 'set1',
  exercise_id: 'ex1',
  satz_nummer: 1,
  gewicht: 60,
  wiederholungen: 10,
  abgeschlossen_am: '2026-08-21T10:05:00.000Z',
  exercises: { id: 'ex1', name: 'Bankdrücken', met_wert: 5 },
}

function mockTables(overrides: Record<string, ReturnType<typeof createQueryBuilder>> = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (overrides[table]) return overrides[table]
    if (table === 'workout_sessions') return createQueryBuilder({ data: sessionRow })
    if (table === 'workout_plan_day_exercises') return createQueryBuilder({ data: [dayExerciseRow] })
    if (table === 'workout_session_sets') return createQueryBuilder({ data: [setRow] })
    throw new Error(`unexpected table ${table}`)
  })
}

describe('startWorkoutSession', () => {
  it('inserts a session for the given day and returns its id', async () => {
    const builder = createQueryBuilder({ data: { id: 's1' } })
    mockFrom.mockReturnValue(builder)

    const { startWorkoutSession } = await import('./use-workout-session')
    const id = await startWorkoutSession('u1', 'd1')

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', workout_plan_day_id: 'd1' }),
    )
    expect(id).toBe('s1')
  })

  it('rejects instead of returning an id when the insert fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'boom' } }))

    const { startWorkoutSession } = await import('./use-workout-session')

    await expect(startWorkoutSession('u1', 'd1')).rejects.toThrow()
  })
})

describe('useWorkoutSession', () => {
  it('loads the session, its plan exercises, and its sets', async () => {
    mockTables()

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toEqual(sessionRow)
    expect(result.current.exercises).toEqual([
      {
        exercise_id: 'ex1',
        name: 'Bankdrücken',
        ziel_saetze: 3,
        ziel_wiederholungen: 10,
        pausenzeit_sekunden: 90,
        reihenfolge: 1,
      },
    ])
    expect(result.current.sets).toEqual([
      {
        id: 'set1',
        exercise_id: 'ex1',
        satz_nummer: 1,
        gewicht: 60,
        wiederholungen: 10,
        abgeschlossen_am: '2026-08-21T10:05:00.000Z',
        exercise: { id: 'ex1', name: 'Bankdrücken', met_wert: 5 },
      },
    ])
  })

  it('logs a set immediately', async () => {
    const setsBuilder = createQueryBuilder({ data: [setRow] })
    mockTables({ workout_session_sets: setsBuilder })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.logSet('ex1', 1, 60, 10)

    expect(setsBuilder.insert).toHaveBeenCalledWith({
      workout_session_id: 's1',
      exercise_id: 'ex1',
      satz_nummer: 1,
      gewicht: 60,
      wiederholungen: 10,
      abgeschlossen_am: expect.any(String),
    })
  })

  it('rejects instead of reporting success when logging a set fails', async () => {
    mockTables({ workout_session_sets: createQueryBuilder({ data: [], error: { message: 'boom' } }) })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.logSet('ex1', 1, 60, 10)).rejects.toThrow()
  })

  it('completes the session with the given calories', async () => {
    const sessionBuilder = createQueryBuilder({ data: sessionRow })
    mockTables({ workout_sessions: sessionBuilder })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.completeSession(75)

    expect(sessionBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ beendet_am: expect.any(String), gesamt_kalorien: expect.any(Number) }),
    )
  })

  it('deletes the session', async () => {
    const sessionBuilder = createQueryBuilder({ data: sessionRow })
    mockTables({ workout_sessions: sessionBuilder })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.deleteSession()

    expect(sessionBuilder.delete).toHaveBeenCalled()
  })

  it('reports a missing session instead of loading forever', async () => {
    mockTables({ workout_sessions: createQueryBuilder({ data: null }) })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
    expect(result.current.exercises).toEqual([])
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

afterEach(() => {
  // A failed assertion must not leak a faked clock into the next test.
  vi.useRealTimers()
})

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    is: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

/**
 * Same shape as createQueryBuilder, but `.then()` yields each of `results` in
 * order (repeating the last one after exhaustion) instead of a single canned
 * response — needed where two different queries hit the same table, like
 * ermittleNeueRekorde's history query hitting workout_session_sets right
 * after reload()'s own sets query already did.
 */
function createSequencedQueryBuilder(results: { data: unknown; error?: unknown }[]) {
  let index = 0
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    is: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(results[Math.min(index, results.length - 1)])),
    maybeSingle: vi.fn(() => Promise.resolve(results[Math.min(index, results.length - 1)])),
    then: (resolve: (value: { data: unknown; error?: unknown }) => unknown) => {
      const result = results[Math.min(index, results.length - 1)]
      index += 1
      return resolve(result)
    },
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

const sessionExerciseRow = {
  id: 'se1',
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
    if (table === 'workout_session_exercises') return createQueryBuilder({ data: [sessionExerciseRow] })
    if (table === 'workout_session_sets') return createQueryBuilder({ data: [setRow] })
    throw new Error(`unexpected table ${table}`)
  })
}

describe('startWorkoutSession', () => {
  it('inserts a session for the given day, copies its plan exercises, and returns the new session id', async () => {
    let lookedUp = false
    const sessionsBuilder: Record<string, unknown> = {
      select: vi.fn(() => sessionsBuilder),
      insert: vi.fn(() => sessionsBuilder),
      eq: vi.fn(() => sessionsBuilder),
      is: vi.fn(() => sessionsBuilder),
      gte: vi.fn(() => sessionsBuilder),
      order: vi.fn(() => sessionsBuilder),
      limit: vi.fn(() => sessionsBuilder),
      single: vi.fn(() => Promise.resolve({ data: { id: 's1' }, error: null })),
      then: (resolve: (value: { data: unknown; error: null }) => unknown) => {
        lookedUp = true
        return resolve({ data: [], error: null })
      },
    }
    const dayExercisesBuilder = createQueryBuilder({
      data: [{ exercise_id: 'ex1', reihenfolge: 1, ziel_saetze: 3, ziel_wiederholungen: 10, pausenzeit_sekunden: 90 }],
    })
    const sessionExercisesBuilder = createQueryBuilder({ data: null, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_sessions') return sessionsBuilder
      if (table === 'workout_plan_day_exercises') return dayExercisesBuilder
      if (table === 'workout_session_exercises') return sessionExercisesBuilder
      throw new Error(`unexpected table ${table}`)
    })

    const { startWorkoutSession } = await import('./use-workout-session')
    const id = await startWorkoutSession('u1', 'd1')

    expect(lookedUp).toBe(true)
    expect(sessionsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', workout_plan_day_id: 'd1' }),
    )
    expect(dayExercisesBuilder.eq).toHaveBeenCalledWith('workout_plan_day_id', 'd1')
    expect(sessionExercisesBuilder.insert).toHaveBeenCalledWith([
      {
        workout_session_id: 's1',
        exercise_id: 'ex1',
        reihenfolge: 1,
        ziel_saetze: 3,
        ziel_wiederholungen: 10,
        pausenzeit_sekunden: 90,
      },
    ])
    expect(id).toBe('s1')
  })

  it('resumes an unfinished session for the day instead of opening a second one, without re-copying its exercises', async () => {
    const builder = createQueryBuilder({ data: [{ id: 'open1' }] })
    mockFrom.mockReturnValue(builder)

    const { startWorkoutSession } = await import('./use-workout-session')
    const id = await startWorkoutSession('u1', 'd1')

    expect(id).toBe('open1')
    // Same mock object handles every table here — this proves neither the
    // session row nor a workout_session_exercises copy was ever inserted.
    expect(builder.insert).not.toHaveBeenCalled()
    expect(builder.is).toHaveBeenCalledWith('beendet_am', null)
  })

  it("only resumes a recent session, so an old one cannot swallow today's sets", async () => {
    const builder = createQueryBuilder({ data: [] })
    mockFrom.mockReturnValue(builder)
    vi.setSystemTime(new Date('2026-08-21T12:00:00.000Z'))

    const { startWorkoutSession } = await import('./use-workout-session')
    await startWorkoutSession('u1', 'd1')

    expect(builder.gte).toHaveBeenCalledWith('gestartet_am', '2026-08-21T06:00:00.000Z')
  })

  it('rejects instead of quietly opening a second session when the lookup fails', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'boom' } })
    mockFrom.mockReturnValue(builder)

    const { startWorkoutSession } = await import('./use-workout-session')

    await expect(startWorkoutSession('u1', 'd1')).rejects.toThrow()
    expect(builder.insert).not.toHaveBeenCalled()
  })

  it('rejects instead of returning an id when the insert fails', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'boom' } }))

    const { startWorkoutSession } = await import('./use-workout-session')

    await expect(startWorkoutSession('u1', 'd1')).rejects.toThrow()
  })
})

describe('useWorkoutSession', () => {
  it('loads the session, its session-scoped exercises, and its sets', async () => {
    mockTables()

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toEqual(sessionRow)
    expect(result.current.exercises).toEqual([
      {
        id: 'se1',
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

    await result.current.logSet('ex1', 1, {
      gewicht: 60,
      wiederholungen: 10,
      rir: 2,
      ist_aufwaermsatz: false,
    })

    expect(setsBuilder.insert).toHaveBeenCalledWith({
      workout_session_id: 's1',
      exercise_id: 'ex1',
      satz_nummer: 1,
      gewicht: 60,
      wiederholungen: 10,
      rir: 2,
      ist_aufwaermsatz: false,
      abgeschlossen_am: expect.any(String),
    })
  })

  it('stores a warm-up set under its own running number', async () => {
    const setsBuilder = createQueryBuilder({ data: [setRow] })
    mockTables({ workout_session_sets: setsBuilder })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.logSet('ex1', 3, {
      gewicht: 40,
      wiederholungen: 12,
      rir: null,
      ist_aufwaermsatz: true,
    })

    expect(setsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ satz_nummer: 3, ist_aufwaermsatz: true, rir: null }),
    )
  })

  it('rejects instead of reporting success when logging a set fails', async () => {
    mockTables({ workout_session_sets: createQueryBuilder({ data: [], error: { message: 'boom' } }) })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      result.current.logSet('ex1', 1, {
        gewicht: 60,
        wiederholungen: 10,
        rir: null,
        ist_aufwaermsatz: false,
      }),
    ).rejects.toThrow()
  })

  it('adds exercises to the session in one batch, computing reihenfolge from what is already there', async () => {
    const sessionExercisesBuilder = createQueryBuilder({ data: [], error: null })
    mockTables({ workout_session_exercises: sessionExercisesBuilder })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.exercises).toEqual([])

    await result.current.addExercisesToSession(['ex2', 'ex3'])

    expect(sessionExercisesBuilder.insert).toHaveBeenCalledWith([
      {
        workout_session_id: 's1',
        exercise_id: 'ex2',
        reihenfolge: 1,
        ziel_saetze: null,
        ziel_wiederholungen: null,
        pausenzeit_sekunden: null,
      },
      {
        workout_session_id: 's1',
        exercise_id: 'ex3',
        reihenfolge: 2,
        ziel_saetze: null,
        ziel_wiederholungen: null,
        pausenzeit_sekunden: null,
      },
    ])
  })

  it('rejects instead of reporting success when adding exercises to the session fails', async () => {
    mockTables({ workout_session_exercises: createQueryBuilder({ data: [], error: { message: 'boom' } }) })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.addExercisesToSession(['ex2'])).rejects.toThrow()
  })

  it('removes an exercise from the session', async () => {
    const sessionExercisesBuilder = createQueryBuilder({ data: [sessionExerciseRow], error: null })
    mockTables({ workout_session_exercises: sessionExercisesBuilder })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.removeExerciseFromSession('se1')

    expect(sessionExercisesBuilder.delete).toHaveBeenCalled()
    expect(sessionExercisesBuilder.eq).toHaveBeenCalledWith('id', 'se1')
  })

  it('leaves already-logged sets alone when removing a session exercise', async () => {
    const sessionExercisesBuilder = createQueryBuilder({ data: [sessionExerciseRow], error: null })
    const setsBuilder = createQueryBuilder({ data: [setRow] })
    mockTables({ workout_session_exercises: sessionExercisesBuilder, workout_session_sets: setsBuilder })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.removeExerciseFromSession('se1')

    // removeExerciseFromSession is scoped to workout_session_exercises only —
    // the already-logged workout_session_sets rows for that exercise must survive.
    expect(setsBuilder.delete).not.toHaveBeenCalled()
  })

  it('rejects instead of reporting success when removing a session exercise fails', async () => {
    mockTables({
      workout_session_exercises: createQueryBuilder({ data: [sessionExerciseRow], error: { message: 'boom' } }),
    })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.removeExerciseFromSession('se1')).rejects.toThrow()
  })

  it('completes the session with the given calories and returns the summary', async () => {
    const sessionBuilder = createQueryBuilder({ data: sessionRow })
    mockTables({ workout_sessions: sessionBuilder })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const summary = await result.current.completeSession(75)

    expect(sessionBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ beendet_am: expect.any(String), gesamt_kalorien: expect.any(Number) }),
    )
    expect(summary).toEqual({ beendetAm: expect.any(String), gesamtKalorien: expect.any(Number) })
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
    const exercisesBuilder = createQueryBuilder({ data: [sessionExerciseRow] })
    const setsBuilder = createQueryBuilder({ data: [setRow] })
    mockTables({
      workout_sessions: createQueryBuilder({ data: null }),
      workout_session_exercises: exercisesBuilder,
      workout_session_sets: setsBuilder,
    })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
    expect(result.current.exercises).toEqual([])
    // The early-return guard must skip these queries entirely, not just
    // discard their result after the fact.
    expect(exercisesBuilder.select).not.toHaveBeenCalled()
    expect(setsBuilder.select).not.toHaveBeenCalled()
  })

  it('measures the session up to the last completed set, not up to the button press', async () => {
    const sessionBuilder = createQueryBuilder({ data: sessionRow })
    mockTables({ workout_sessions: sessionBuilder })
    vi.setSystemTime(new Date('2026-08-22T08:00:00.000Z'))

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.completeSession(80)

    const patch = (sessionBuilder.update as unknown as { mock: { calls: [{ gesamt_kalorien: number }][] } }).mock
      .calls[0][0]
    expect(patch.gesamt_kalorien).toBeCloseTo((5 * 80 * 5) / 60, 5)

    vi.useRealTimers()
  })

  describe('ermittleNeueRekorde', () => {
    it('reports a new record when the session beats the best prior set of the same exercise', async () => {
      const setsBuilder = createSequencedQueryBuilder([
        { data: [{ ...setRow, gewicht: 100, wiederholungen: 5 }] }, // reload(): this session's own sets
        { data: [{ exercise_id: 'ex1', gewicht: 90, wiederholungen: 5 }] }, // history query
      ])
      mockTables({ workout_session_sets: setsBuilder })

      const { useWorkoutSession } = await import('./use-workout-session')
      const { result } = renderHook(() => useWorkoutSession('s1'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      const rekorde = await result.current.ermittleNeueRekorde()

      expect(setsBuilder.in).toHaveBeenCalledWith('exercise_id', ['ex1'])
      expect(setsBuilder.eq).toHaveBeenCalledWith('ist_aufwaermsatz', false)
      expect(setsBuilder.neq).toHaveBeenCalledWith('workout_session_id', 's1')
      expect(rekorde).toEqual([{ exercise_id: 'ex1', name: 'Bankdrücken', neuesEinsRM: 116.7, altesEinsRM: 105 }])
    })

    it('reports no record when the session does not beat the historical best', async () => {
      const setsBuilder = createSequencedQueryBuilder([
        { data: [{ ...setRow, gewicht: 90, wiederholungen: 5 }] },
        { data: [{ exercise_id: 'ex1', gewicht: 100, wiederholungen: 5 }] },
      ])
      mockTables({ workout_session_sets: setsBuilder })

      const { useWorkoutSession } = await import('./use-workout-session')
      const { result } = renderHook(() => useWorkoutSession('s1'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(await result.current.ermittleNeueRekorde()).toEqual([])
    })

    it('treats an exercise with no prior history as a record', async () => {
      const setsBuilder = createSequencedQueryBuilder([
        { data: [{ ...setRow, gewicht: 60, wiederholungen: 10 }] },
        { data: [] },
      ])
      mockTables({ workout_session_sets: setsBuilder })

      const { useWorkoutSession } = await import('./use-workout-session')
      const { result } = renderHook(() => useWorkoutSession('s1'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(await result.current.ermittleNeueRekorde()).toEqual([
        { exercise_id: 'ex1', name: 'Bankdrücken', neuesEinsRM: 80, altesEinsRM: null },
      ])
    })

    it('returns an empty list without querying when the session logged no working sets', async () => {
      const setsBuilder = createSequencedQueryBuilder([{ data: [{ ...setRow, ist_aufwaermsatz: true }] }])
      mockTables({ workout_session_sets: setsBuilder })

      const { useWorkoutSession } = await import('./use-workout-session')
      const { result } = renderHook(() => useWorkoutSession('s1'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(await result.current.ermittleNeueRekorde()).toEqual([])
      expect(setsBuilder.in).not.toHaveBeenCalled()
    })

    it('rejects instead of reporting no records when the history query fails', async () => {
      const setsBuilder = createSequencedQueryBuilder([
        { data: [{ ...setRow, gewicht: 60, wiederholungen: 10 }] },
        { data: null, error: { message: 'boom' } },
      ])
      mockTables({ workout_session_sets: setsBuilder })

      const { useWorkoutSession } = await import('./use-workout-session')
      const { result } = renderHook(() => useWorkoutSession('s1'))
      await waitFor(() => expect(result.current.loading).toBe(false))

      await expect(result.current.ermittleNeueRekorde()).rejects.toThrow()
    })
  })
})

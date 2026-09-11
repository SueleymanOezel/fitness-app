# Übungen während des Trainings ändern/einfügen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user add or remove exercises during a live workout session without changing the underlying plan day — the change applies only to this one session.

**Architecture:** A new `workout_session_exercises` table snapshots a plan day's exercises once, when a session is freshly created (never on resume). `useWorkoutSession` reads its exercise list from this new table instead of live-joining `workout_plan_day_exercises`, and gains `addExercisesToSession`/`removeExerciseFromSession`. The existing `ExercisePicker` dialog content (currently private to the plan editor) is extracted into a shared component and reused on the live session page.

**Tech Stack:** React 19, TypeScript, react-router-dom v7, Supabase (Postgres + supabase-js), Vitest + Testing Library, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-11-sitzungs-uebungen-design.md`

## Global Constraints

- No effect on `workout_plan_day_exercises` or any other plan data — session-scoped only, additive/nullable schema, no backfill.
- No loop over single-row inserts for the snapshot copy or for adding several exercises at once — always one array insert (see the spec's "Ausgangslage" section on the closure bug already found and fixed for `addExercisesToDay`).
- The "Entfernen" button for a session exercise is a client-side visibility rule only (hidden once that exercise has ≥1 logged working or warm-up set) — no DB-level protection.
- UI copy in German, matching the exact strings this plan specifies.
- Every task ends with `npm test`, `npm run lint`, and `npx tsc -b --noEmit` all clean.

---

## Task 1: Migration — `workout_session_exercises`

**Files:**
- Create: `supabase/migrations/0011_workout_session_exercises.sql`
- Create: `supabase/migrations/0011_workout_session_exercises.test.ts`
- Modify: `docs/domaenenmodell.md:32-39` (ERD relationships), `:126-133` (insert new ERD block after the `workout_sessions` block), `:196` (insert new prose bullet after this line)

**Interfaces:**
- Produces: table `public.workout_session_exercises(id, workout_session_id, exercise_id, reihenfolge, ziel_saetze, ziel_wiederholungen, pausenzeit_sekunden, created_at)`, RLS-protected through `workout_sessions.user_id`, unique index on `(workout_session_id, exercise_id)`. Task 2 writes to and reads from this table.

- [ ] **Step 1: Write the failing migration test**

```ts
// supabase/migrations/0011_workout_session_exercises.test.ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0011_workout_session_exercises.sql'), 'utf-8')
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0011_workout_session_exercises.sql', () => {
  it('creates workout_session_exercises with the same shape as workout_plan_day_exercises', () => {
    expect(sql).toMatch(/create table public\.workout_session_exercises/)
    expect(statements).toContain(
      'workout_session_id uuid not null references public.workout_sessions (id) on delete cascade',
    )
    expect(statements).toContain('exercise_id uuid not null references public.exercises (id)')
    expect(statements).toContain('reihenfolge integer not null')
    expect(statements).toContain('ziel_saetze integer')
    expect(statements).toContain('ziel_wiederholungen integer')
    expect(statements).toContain('pausenzeit_sekunden integer')
    // Nullable on purpose: exercises added mid-session have no target.
    expect(statements).not.toMatch(/ziel_saetze integer\s+not null/)
    expect(statements).not.toMatch(/ziel_wiederholungen integer\s+not null/)
    expect(statements).not.toMatch(/pausenzeit_sekunden integer\s+not null/)
  })

  it('enables row level security scoped through workout_sessions.user_id, same pattern as workout_session_sets', () => {
    expect(statements).toContain('alter table public.workout_session_exercises enable row level security')
    expect(statements).toMatch(
      /create policy "workout_session_exercises_all_own" on public\.workout_session_exercises/,
    )
    expect(statements).toMatch(/ws\.id = workout_session_id and ws\.user_id = auth\.uid\(\)/)
  })

  it('has a unique index on (workout_session_id, exercise_id), same as the plan-day equivalent', () => {
    expect(statements).toMatch(
      /create unique index workout_session_exercises_session_exercise_unique\s+on public\.workout_session_exercises \(workout_session_id, exercise_id\)/,
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run supabase/migrations/0011_workout_session_exercises.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open '.../0011_workout_session_exercises.sql'`

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/0011_workout_session_exercises.sql
-- Snapshot of a live session's exercises, copied once from
-- workout_plan_day_exercises when the session is created (not on resume,
-- see startWorkoutSession in use-workout-session.ts). Lets a session
-- add/remove exercises without touching the plan template — see
-- docs/superpowers/specs/2026-09-11-sitzungs-uebungen-design.md.
create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  reihenfolge integer not null,
  ziel_saetze integer,
  ziel_wiederholungen integer,
  pausenzeit_sekunden integer,
  created_at timestamptz not null default now()
);

alter table public.workout_session_exercises enable row level security;

create policy "workout_session_exercises_all_own" on public.workout_session_exercises
  for all using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_session_id and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_session_id and ws.user_id = auth.uid()
    )
  );

create unique index workout_session_exercises_session_exercise_unique
  on public.workout_session_exercises (workout_session_id, exercise_id);

create index on public.workout_session_exercises (workout_session_id);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run supabase/migrations/0011_workout_session_exercises.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Update the domain model doc**

In `docs/domaenenmodell.md`, insert a new relationship line right after line 39 (`workout_sessions ||--o{ workout_session_sets : "enthält"`):

```
    workout_sessions ||--o{ workout_session_exercises : "enthält"
```

And right after line 33 (`exercises ||--o{ workout_session_sets : "referenziert"`), add:

```
    exercises ||--o{ workout_session_exercises : "referenziert"
```

Insert a new ERD block right after the closing `}` of the `workout_sessions` block (currently ending at line 133), before the `workout_session_sets` block:

```
    workout_session_exercises {
        uuid id PK
        uuid workout_session_id FK
        uuid exercise_id FK
        int reihenfolge
        int ziel_saetze
        int ziel_wiederholungen
        int pausenzeit_sekunden
    }
```

Add a new prose bullet right after line 196 (the `workout_plan_day_exercises`-unique-index bullet):

```
- `workout_session_exercises` (Migration `0011`) ist eine einmalige Momentaufnahme der Tages-Übungen zum Zeitpunkt der Sitzungserstellung — kopiert nur beim Neuanlegen einer Sitzung, nicht beim Fortsetzen einer bereits offenen (siehe `RESUME_WINDOW_HOURS` in `use-workout-session.ts`). Übungen lassen sich während der Sitzung hinzufügen/entfernen, ohne dass sich das auf `workout_plan_day_exercises` auswirkt; `workout_session_sets.exercise_id` bleibt davon unabhängig, weshalb die Trainingshistorie unverändert bleibt. Gleicher Unique-Index wie beim Plan-Pendant: `(workout_session_id, exercise_id)`.
```

- [ ] **Step 6: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0011_workout_session_exercises.sql supabase/migrations/0011_workout_session_exercises.test.ts docs/domaenenmodell.md
git commit -m "feat: add workout_session_exercises table"
```

---

## Task 2: `use-workout-session.ts` — snapshot, add, remove

**Files:**
- Modify: `src/hooks/use-workout-session.ts:13-20` (`SessionExercise` type), `:43-50` (rename/extend `RawDayExercise`), `:63-85` (`startWorkoutSession`), `:87-149` (`reload()`'s exercises query and mapping), `:217` (return statement) — add two new functions near `logSet`/`updateSet` (after line 173)
- Modify: `src/hooks/use-workout-session.test.ts`

**Interfaces:**
- Consumes: Task 1's `workout_session_exercises` table.
- Produces: `SessionExercise` now includes `id: string` (the `workout_session_exercises` row id). New hook functions `addExercisesToSession(exerciseIds: string[]): Promise<void>` and `removeExerciseFromSession(sessionExerciseId: string): Promise<void>`, both returned from `useWorkoutSession`. Task 4 calls both directly.

- [ ] **Step 1: Write the failing tests**

Replace `src/hooks/use-workout-session.test.ts` in full with:

```ts
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

  it('rejects instead of reporting success when removing a session exercise fails', async () => {
    mockTables({
      workout_session_exercises: createQueryBuilder({ data: [sessionExerciseRow], error: { message: 'boom' } }),
    })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.removeExerciseFromSession('se1')).rejects.toThrow()
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
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/hooks/use-workout-session.test.ts`
Expected: FAIL — the rewritten `startWorkoutSession` "copies its plan exercises" test fails because the current implementation never queries `workout_plan_day_exercises`/inserts into `workout_session_exercises`; the `useWorkoutSession` tests fail because `reload()` still reads `workout_plan_day_exercises` and the returned object has no `addExercisesToSession`/`removeExerciseFromSession`.

- [ ] **Step 3: Implement**

In `src/hooks/use-workout-session.ts`, change the `SessionExercise` type (currently lines 13-20):

```ts
export type SessionExercise = {
  id: string
  exercise_id: string
  name: string
  ziel_saetze: number | null
  ziel_wiederholungen: number | null
  pausenzeit_sekunden: number | null
  reihenfolge: number
}
```

Replace the `RawDayExercise` type (currently lines 43-50) with:

```ts
type RawSessionExercise = {
  id: string
  exercise_id: string
  reihenfolge: number
  ziel_saetze: number | null
  ziel_wiederholungen: number | null
  pausenzeit_sekunden: number | null
  exercises: { id: string; name: string } | null
}
```

Replace `startWorkoutSession` (currently lines 63-85) with:

```ts
export async function startWorkoutSession(userId: string, dayId: string): Promise<string> {
  const resumableFrom = new Date(Date.now() - RESUME_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { data: open, error: openError } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('workout_plan_day_id', dayId)
    .is('beendet_am', null)
    .gte('gestartet_am', resumableFrom)
    .order('gestartet_am', { ascending: false })
    .limit(1)
  if (openError) throw new Error('start session failed')
  const openId = ((open ?? []) as { id: string }[])[0]?.id
  if (openId) return openId

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: userId, workout_plan_day_id: dayId, gestartet_am: new Date().toISOString() })
    .select('id')
    .single()
  if (error || !data) throw new Error('start session failed')
  const sessionId = (data as { id: string }).id

  // A fresh session gets its own one-time copy of the day's exercises — see
  // docs/superpowers/specs/2026-09-11-sitzungs-uebungen-design.md. A resumed
  // session (returned above already) keeps the copy it got when it was first
  // created; this only runs for a session that did not exist yet.
  const { data: dayExerciseRows, error: dayExerciseError } = await supabase
    .from('workout_plan_day_exercises')
    .select('exercise_id, reihenfolge, ziel_saetze, ziel_wiederholungen, pausenzeit_sekunden')
    .eq('workout_plan_day_id', dayId)
  if (dayExerciseError) throw new Error('start session failed')
  const dayExercises = (dayExerciseRows ?? []) as {
    exercise_id: string
    reihenfolge: number
    ziel_saetze: number | null
    ziel_wiederholungen: number | null
    pausenzeit_sekunden: number | null
  }[]
  if (dayExercises.length > 0) {
    const { error: copyError } = await supabase.from('workout_session_exercises').insert(
      dayExercises.map((row) => ({
        workout_session_id: sessionId,
        exercise_id: row.exercise_id,
        reihenfolge: row.reihenfolge,
        ziel_saetze: row.ziel_saetze,
        ziel_wiederholungen: row.ziel_wiederholungen,
        pausenzeit_sekunden: row.pausenzeit_sekunden,
      })),
    )
    if (copyError) throw new Error('start session failed')
  }

  return sessionId
}
```

In `useWorkoutSession`'s `reload()` (currently lines 87-149), replace the day-lookup and exercises query:

```ts
    const { data: sessionData } = await supabase.from('workout_sessions').select('*').eq('id', sessionId).maybeSingle()

    const { data: exerciseRows } = await supabase
      .from('workout_session_exercises')
      .select('id, exercise_id, reihenfolge, ziel_saetze, ziel_wiederholungen, pausenzeit_sekunden, exercises(id, name)')
      .eq('workout_session_id', sessionId)
      .order('reihenfolge', { ascending: true })
```

(This removes the `const dayId = (sessionData as SessionInfo | null)?.workout_plan_day_id ?? null` line and the `dayId ? ... : { data: [] }` ternary entirely — `workout_session_exercises` is queried unconditionally by `sessionId`, which is always known, the same way the `sets` query right below it already is.)

Update the `setExercises` mapping to include `id` and read from `RawSessionExercise`:

```ts
    setExercises(
      ((exerciseRows ?? []) as unknown as RawSessionExercise[]).map((row) => ({
        id: row.id,
        exercise_id: row.exercise_id,
        name: row.exercises?.name ?? '',
        ziel_saetze: row.ziel_saetze,
        ziel_wiederholungen: row.ziel_wiederholungen,
        pausenzeit_sekunden: row.pausenzeit_sekunden,
        reihenfolge: row.reihenfolge,
      })),
    )
```

Add two new functions right after `updateSet` (currently ending at line 182, before `completeSession`):

```ts
  /**
   * Session-scoped only — never touches workout_plan_day_exercises, so the
   * plan itself is unaffected (see the design spec). reihenfolge is computed
   * from the currently loaded exercises in one snapshot, then written in a
   * single array insert — never a loop of single inserts, which would repeat
   * the same closure bug already found and fixed for addExercisesToDay.
   */
  async function addExercisesToSession(exerciseIds: string[]) {
    const nextReihenfolge = exercises.length === 0 ? 1 : Math.max(...exercises.map((entry) => entry.reihenfolge)) + 1
    const rows = exerciseIds.map((exerciseId, index) => ({
      workout_session_id: sessionId,
      exercise_id: exerciseId,
      reihenfolge: nextReihenfolge + index,
      ziel_saetze: null,
      ziel_wiederholungen: null,
      pausenzeit_sekunden: null,
    }))
    const { error } = await supabase.from('workout_session_exercises').insert(rows)
    if (error) throw new Error('add exercises to session failed')
    await reload()
  }

  async function removeExerciseFromSession(sessionExerciseId: string) {
    const { error } = await supabase.from('workout_session_exercises').delete().eq('id', sessionExerciseId)
    if (error) throw new Error('remove exercise from session failed')
    await reload()
  }
```

Update the return statement (currently line 217):

```ts
  return {
    session,
    exercises,
    sets,
    loading,
    logSet,
    updateSet,
    completeSession,
    deleteSession,
    addExercisesToSession,
    removeExerciseFromSession,
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/hooks/use-workout-session.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit`
Expected: `src/hooks/use-workout-session.test.ts` and its own suite are fully clean. `src/pages/WorkoutSessionPage.tsx`/`.test.tsx` and `src/pages/TrainingHistoryDetailPage.tsx` do not read `SessionExercise.id` or the new functions yet, so they keep compiling and passing unchanged (`TrainingHistoryDetailPage.tsx` never destructures `exercises` from this hook at all). This task does not touch those files.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-workout-session.ts src/hooks/use-workout-session.test.ts
git commit -m "feat: snapshot a session's exercises and allow adding/removing them"
```

---

## Task 3: Extract `ExercisePicker` into a shared component

**Files:**
- Create: `src/components/ExercisePicker.tsx`
- Create: `src/components/ExercisePicker.test.tsx`
- Modify: `src/pages/TrainingPlanEditPage.tsx:1-20` (imports), `:262-382` (remove the local `PickableExercise` type and `ExercisePicker` function entirely — nothing replaces these lines, the file's `DayBlock` component below them is unaffected and keeps using `ExercisePicker`/`PickableExercise` via the new import)

**Interfaces:**
- Produces: default export `ExercisePicker` and named export `PickableExercise` from `src/components/ExercisePicker.tsx`, with the exact same props it already has (`exercises: PickableExercise[]`, `alreadyAdded: string[]`, `onAddSelected: (exerciseIds: string[]) => void`) — a verbatim move, no behavior change. Task 4 imports and uses this in `WorkoutSessionPage.tsx`.

- [ ] **Step 1: Write the failing test for the new file**

```tsx
// src/components/ExercisePicker.test.tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ExercisePicker, { type PickableExercise } from './ExercisePicker'

afterEach(() => cleanup())

const benchPress: PickableExercise = {
  id: 'ex1',
  name: 'Bench Press',
  name_de: 'Bankdrücken',
  muskelgruppen_primaer: ['chest'],
  muskelgruppen_sekundaer: null,
  equipment: 'barbell',
  bild_url: null,
}

const squat: PickableExercise = {
  id: 'ex2',
  name: 'Squat',
  name_de: 'Kniebeuge',
  muskelgruppen_primaer: ['quadriceps'],
  muskelgruppen_sekundaer: null,
  equipment: 'barbell',
  bild_url: null,
}

describe('ExercisePicker', () => {
  it('lists the selectable exercises by their German name', () => {
    render(<ExercisePicker exercises={[benchPress, squat]} alreadyAdded={[]} onAddSelected={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Bankdrücken/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kniebeuge/ })).toBeInTheDocument()
  })

  it('excludes exercises already added', () => {
    render(<ExercisePicker exercises={[benchPress, squat]} alreadyAdded={['ex1']} onAddSelected={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /Bankdrücken/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kniebeuge/ })).toBeInTheDocument()
  })

  it('filters by search', () => {
    render(<ExercisePicker exercises={[benchPress, squat]} alreadyAdded={[]} onAddSelected={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Übung suchen'), { target: { value: 'Kniebeuge' } })

    expect(screen.queryByRole('button', { name: /Bankdrücken/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kniebeuge/ })).toBeInTheDocument()
  })

  it('toggles a selection and updates the Hinzufügen count', () => {
    render(<ExercisePicker exercises={[benchPress, squat]} alreadyAdded={[]} onAddSelected={vi.fn()} />)

    const row = screen.getByRole('button', { name: /Bankdrücken/ })
    fireEvent.click(row)

    expect(row).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Hinzufügen (1)' })).toBeEnabled()
  })

  it('calls onAddSelected with every selected exercise id', () => {
    const onAddSelected = vi.fn()
    render(<ExercisePicker exercises={[benchPress, squat]} alreadyAdded={[]} onAddSelected={onAddSelected} />)

    fireEvent.click(screen.getByRole('button', { name: /Bankdrücken/ }))
    fireEvent.click(screen.getByRole('button', { name: /Kniebeuge/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen (2)' }))

    expect(onAddSelected).toHaveBeenCalledWith(['ex1', 'ex2'])
  })

  it('shows a message instead of an empty list when nothing matches', () => {
    render(<ExercisePicker exercises={[benchPress]} alreadyAdded={['ex1']} onAddSelected={vi.fn()} />)

    expect(screen.getByText('Keine Übungen gefunden.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ExercisePicker.test.tsx`
Expected: FAIL — `Failed to resolve import './ExercisePicker'`

- [ ] **Step 3: Create the shared component**

```tsx
// src/components/ExercisePicker.tsx
import { useState } from 'react'
import { cardClass, buttonPrimaryClass, interactiveClass } from '../lib/ui-classes'
import ExerciseFilterChips from './ExerciseFilterChips'
import ExerciseThumbnail from './ExerciseThumbnail'
import { VitaIcon } from './icons/VitaIcon'
import {
  groupByMuskelgruppe,
  matchesExerciseFilter,
  uniqueEquipment,
  uniqueMuskelgruppen,
} from '../lib/exercise-filters'
import { equipmentLabel } from '../lib/equipment-labels'
import { muskelgruppeLabel } from '../lib/muscle-group-labels'

export type PickableExercise = {
  id: string
  name: string
  name_de: string | null
  muskelgruppen_primaer: string[] | null
  muskelgruppen_sekundaer: string[] | null
  equipment: string | null
  bild_url: string | null
}

/**
 * Shared exercise-selection dialog content — used by the plan editor
 * (adding exercises to a training day) and the live workout session
 * (adding exercises to just that session, see use-workout-session.ts).
 * The caller owns the surrounding Dialog and what onAddSelected does with
 * the chosen ids.
 */
export default function ExercisePicker({
  exercises,
  alreadyAdded,
  onAddSelected,
}: {
  exercises: PickableExercise[]
  alreadyAdded: string[]
  onAddSelected: (exerciseIds: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [muskelgruppe, setMuskelgruppe] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])

  // Already-added exercises are filtered out rather than silently rejected by
  // the hook's duplicate guard, which would look like a dead row.
  const selectable = exercises.filter((exercise) => !alreadyAdded.includes(exercise.id))
  const muskelgruppen = uniqueMuskelgruppen(selectable)
  const equipmentWerte = uniqueEquipment(selectable)
  const filtered = selectable.filter((exercise) => matchesExerciseFilter(exercise, { query, muskelgruppe, equipment }))
  // Grouping by muscle group only makes sense while more than one could be
  // showing — a specific muskelgruppe filter already narrows to one section.
  // Grouping only ever uses an exercise's FIRST primary muscle group as the
  // key (see groupByMuskelgruppe) — unlike the muskelgruppe filter chip
  // above, which matches against every one of an exercise's primary muscle
  // groups. A chest+triceps exercise files under "Brust" here but still
  // shows up when the "Trizeps" chip is active; that's deliberate (one row
  // per exercise, not one per muscle group — see the domain-model note on
  // volume being split across groups for charts, which is a different,
  // numeric-conservation concern that doesn't apply to a UI list).
  const groups = muskelgruppe === null ? groupByMuskelgruppe(filtered) : [{ gruppe: '', exercises: filtered }]

  function toggle(exerciseId: string) {
    setSelected((current) =>
      current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId],
    )
  }

  return (
    <div className={cardClass}>
      <label>
        Übung suchen
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ExerciseFilterChips
        muskelgruppen={muskelgruppen}
        muskelgruppe={muskelgruppe}
        onMuskelgruppeChange={setMuskelgruppe}
        equipmentWerte={equipmentWerte}
        equipment={equipment}
        onEquipmentChange={setEquipment}
      />
      {filtered.length === 0 && <p>Keine Übungen gefunden.</p>}
      {groups.map((group) => (
        <div key={group.gruppe || 'gefiltert'}>
          {group.gruppe !== '' && <h3>{group.gruppe}</h3>}
          <ul role="list" className="space-y-2">
            {group.exercises.map((exercise) => {
              const name = exercise.name_de ?? exercise.name
              const isSelected = selected.includes(exercise.id)
              const caption = [
                exercise.equipment ? equipmentLabel(exercise.equipment) : null,
                exercise.muskelgruppen_primaer?.[0] ? muskelgruppeLabel(exercise.muskelgruppen_primaer[0]) : null,
              ]
                .filter((part): part is string => part !== null)
                .join(' · ')

              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(exercise.id)}
                    className={`${cardClass} ${interactiveClass} flex w-full items-center gap-4 text-left`}
                  >
                    <span className="relative shrink-0">
                      <ExerciseThumbnail bildUrl={exercise.bild_url} />
                      {isSelected && (
                        <VitaIcon
                          name="save"
                          tone="brand"
                          size={20}
                          className="absolute -bottom-1 -right-1 rounded-full bg-bg"
                        />
                      )}
                    </span>
                    <span className="flex-1">
                      <span className="block">{name}</span>
                      {caption !== '' && <span className="block text-sm text-text-muted">{caption}</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {/* Sticky so it stays reachable once the (now ungated, potentially
          long) list scrolls inside the dialog's own scroll box. */}
      <div className="sticky bottom-0 bg-surface pt-2">
        <button
          type="button"
          className={buttonPrimaryClass}
          disabled={selected.length === 0}
          onClick={() => onAddSelected(selected)}
        >
          {`Hinzufügen (${selected.length})`}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ExercisePicker.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Point `TrainingPlanEditPage.tsx` at the shared component**

Replace the import block at the top of `src/pages/TrainingPlanEditPage.tsx` (currently lines 1-20):

```tsx
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutPlan, type DayExercisePatch, type WorkoutPlanDay } from '../hooks/use-workout-plans'
import { useExercises } from '../hooks/use-exercises'
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import ExerciseThumbnail from '../components/ExerciseThumbnail'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import { zonenFuerTag } from '../lib/muscle-zones'
import TagMuskelSilhouette from '../components/TagMuskelSilhouette'
import ExercisePicker, { type PickableExercise } from '../components/ExercisePicker'
```

(Dropped: `interactiveClass` from the `ui-classes` import, the whole `ExerciseFilterChips` import, the whole `exercise-filters` import block, the `equipment-labels` import, the `muscle-group-labels` import — every one of those was used only inside the `ExercisePicker` function being removed, verified by grep: none appear anywhere else in this file. Added: the new `ExercisePicker` import.)

Delete the `PickableExercise` type and the `ExercisePicker` function in their entirety (currently lines 262-382, everything from `type PickableExercise = {` through the closing `}` of the `ExercisePicker` function, right before `function ExercisePicker({` — actually: delete from `type PickableExercise = {` down through the end of the `ExercisePicker` function's closing `}`). Nothing replaces these lines — `DayBlock` above them already calls `ExercisePicker`/uses `PickableExercise` exactly as before, now resolved through the import instead of a local definition.

- [ ] **Step 6: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit`
Expected: all clean, including every pre-existing test in `src/pages/TrainingPlanEditPage.test.tsx` (unchanged behavior, pure import swap).

- [ ] **Step 7: Commit**

```bash
git add src/components/ExercisePicker.tsx src/components/ExercisePicker.test.tsx src/pages/TrainingPlanEditPage.tsx
git commit -m "refactor: extract ExercisePicker into a shared component"
```

---

## Task 4: Add/remove exercises on the live session page

**Files:**
- Modify: `src/pages/WorkoutSessionPage.tsx:1-14` (imports), `:33-39` (hook destructuring + new state), `:117-156` (exercises list — add the remove button per row and the "Übung hinzufügen" button + dialog after the list)
- Modify: `src/pages/WorkoutSessionPage.test.tsx`

**Interfaces:**
- Consumes: Task 2's `addExercisesToSession`/`removeExerciseFromSession`/`SessionExercise.id`; Task 3's `ExercisePicker` (default export) and `useExercises` (existing hook, already used elsewhere in this codebase, e.g. `TrainingPlanEditPage.tsx`).

- [ ] **Step 1: Write the failing tests**

In `src/pages/WorkoutSessionPage.test.tsx`, add the `useExercises` mock near the top (after the existing `mockUseProfile` mock):

```ts
const mockUseExercises = vi.fn()
vi.mock('../hooks/use-exercises', () => ({ useExercises: (userId: string) => mockUseExercises(userId) }))
```

Give the `exercise` fixture an `id` (the session-exercise row id, needed by the new remove button — currently it only has `exercise_id`):

```ts
const exercise = {
  exercise_id: 'ex1',
  name: 'Bankdrücken',
  ziel_saetze: 2,
  ziel_wiederholungen: 10,
  pausenzeit_sekunden: 90,
  reihenfolge: 1,
}
```

becomes:

```ts
const exercise = {
  id: 'se1',
  exercise_id: 'ex1',
  name: 'Bankdrücken',
  ziel_saetze: 2,
  ziel_wiederholungen: 10,
  pausenzeit_sekunden: 90,
  reihenfolge: 1,
}
```

Add `addExercisesToSession`/`removeExerciseFromSession` to the default mock in `sessionResult`:

```ts
function sessionResult(overrides: Partial<ReturnType<typeof mockUseWorkoutSession>> = {}) {
  return {
    session: {
      id: 's1',
      workout_plan_day_id: 'd1',
      gestartet_am: '2026-08-21T10:00:00.000Z',
      beendet_am: null,
      gesamt_kalorien: null,
    },
    exercises: [exercise],
    sets: [],
    loading: false,
    logSet: vi.fn().mockResolvedValue(undefined),
    updateSet: vi.fn().mockResolvedValue(undefined),
    completeSession: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    addExercisesToSession: vi.fn().mockResolvedValue(undefined),
    removeExerciseFromSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}
```

Give `signedIn` a default (empty) exercise catalog so every existing test — which calls `signedIn()` and never touches the picker — keeps working unmodified:

```ts
function signedIn(weight: number | null = 80) {
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseProfile.mockReturnValue({ profile: { aktuelles_gewicht: weight }, loading: false, error: false })
  mockUseExercises.mockReturnValue({ exercises: [], loading: false, createExercise: vi.fn() })
}
```

Add these tests inside the `describe('WorkoutSessionPage', ...)` block (anywhere after the existing `'lists the exercises of the day'` test):

```ts
  it('adds an exercise to the session via the picker', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)
    mockUseExercises.mockReturnValue({
      exercises: [
        {
          id: 'ex2',
          name: 'Squat',
          name_de: 'Kniebeuge',
          muskelgruppen_primaer: ['quadriceps'],
          muskelgruppen_sekundaer: null,
          equipment: 'barbell',
          bild_url: null,
        },
      ],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))
    fireEvent.click(screen.getByRole('button', { name: /Kniebeuge/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen (1)' }))

    await waitFor(() => expect(result.addExercisesToSession).toHaveBeenCalledWith(['ex2']))
  })

  it('shows a remove button for an exercise with no logged sets, and removes it', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Entfernen' }))

    await waitFor(() => expect(result.removeExerciseFromSession).toHaveBeenCalledWith('se1'))
  })

  it('hides the remove button once a set has been logged for that exercise', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [loggedSet({ id: 'set1' })] }))

    renderPage()

    expect(screen.queryByRole('button', { name: 'Entfernen' })).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/WorkoutSessionPage.test.tsx`
Expected: FAIL on the three new tests — no "Übung hinzufügen" button, no "Entfernen" button, and `sessionResult()` return values don't yet get consumed for these actions by the page.

- [ ] **Step 3: Implement**

Add two imports to `src/pages/WorkoutSessionPage.tsx` (currently lines 1-14):

```tsx
import { useExercises } from '../hooks/use-exercises'
import Dialog from '../components/Dialog'
import ExercisePicker from '../components/ExercisePicker'
```

Update `LiveSession`'s hook destructuring and add state (currently lines 33-39):

```tsx
function LiveSession({ userId, sessionId }: { userId: string; sessionId: string }) {
  const { profile, loading: profileLoading } = useProfile(userId)
  const {
    session,
    exercises,
    sets,
    loading,
    logSet,
    completeSession,
    addExercisesToSession,
    removeExerciseFromSession,
  } = useWorkoutSession(sessionId)
  const { exercises: katalogUebungen } = useExercises(userId)
  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null)
  const [pause, setPause] = useState<{ until: number; sekunden: number } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const showToast = useToast()
  const navigate = useNavigate()
```

Add two handler functions near `complete()` (right after it, still before the `return (`):

```tsx
  async function addExercises(exerciseIds: string[]) {
    try {
      await addExercisesToSession(exerciseIds)
    } catch {
      showToast('Übung konnte nicht hinzugefügt werden.', 'error')
    }
  }

  async function removeExercise(sessionExerciseId: string) {
    try {
      await removeExerciseFromSession(sessionExerciseId)
    } catch {
      showToast('Übung konnte nicht entfernt werden.', 'error')
    }
  }
```

In the exercises `<ul>` (currently lines 117-156), add the conditional "Entfernen" button right after the existing name-toggle button, still inside the same `<div className={cardClass + ' w-full'}>`:

```tsx
              <button type="button" onClick={() => setOpenExerciseId(entry.exercise_id)}>
                {entry.name}
              </button>
              {workingSetCount(entry.exercise_id) === 0 && (
                <button type="button" onClick={() => removeExercise(entry.id)}>
                  <span className="inline-flex items-center justify-center gap-2">
                    <VitaIcon name="delete" tone="mono" size={20} />
                    Entfernen
                  </span>
                </button>
              )}
```

Right after the closing `</ul>` (currently line 156) and before the weight/`complete()` section, add the "Übung hinzufügen" button and its dialog (same structure as `DayBlock` in `TrainingPlanEditPage.tsx`):

```tsx
      </ul>
      <button type="button" className={buttonPrimaryClass} onClick={() => setPickerOpen(true)}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="add" tone="mono" size={20} />
          Übung hinzufügen
        </span>
      </button>
      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the picker only while open resets the search field each
          time it opens, instead of keeping the last search around. */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)}>
        {pickerOpen && (
          <ExercisePicker
            exercises={katalogUebungen}
            alreadyAdded={exercises.map((entry) => entry.exercise_id)}
            // Same reasoning as the plan editor's picker: close synchronously
            // before the write resolves, since a toast raised while this
            // Dialog is still open would render invisible behind its native
            // top-layer backdrop.
            onAddSelected={(exerciseIds) => {
              void addExercises(exerciseIds)
              setPickerOpen(false)
            }}
          />
        )}
      </Dialog>
      <p>{gewichtKg === null ? '—' : `${gewichtKg} kg`}</p>
```

(The line `<p>{gewichtKg === null ? '—' : ...}</p>` already exists right after the `</ul>` today — this just inserts the new button/dialog between the closing `</ul>` and that existing line, nothing about the weight paragraph itself changes.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/WorkoutSessionPage.test.tsx`
Expected: PASS (all tests in the file, including the three new ones)

- [ ] **Step 5: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit && npm run build`
Expected: all clean, build succeeds. This is the last task, so also run the build once as the final sanity check for the whole feature.

- [ ] **Step 6: Commit**

```bash
git add src/pages/WorkoutSessionPage.tsx src/pages/WorkoutSessionPage.test.tsx
git commit -m "feat: add and remove exercises on the live session page"
```

---

## After all tasks: whole-branch review and live verification

Not a task an implementer picks up mid-plan — the controller (whoever is driving `subagent-driven-development` or `executing-plans`) does this once all four tasks are green:

1. Request a whole-branch code review (`superpowers:requesting-code-review`) against the full diff from the branch's base to `HEAD`, covering all four tasks together — in particular whether the session-scoped exercise list genuinely never affects `workout_plan_day_exercises` anywhere in the diff, and whether `TrainingPlanEditPage.tsx`'s behavior is truly unchanged after the `ExercisePicker` extraction.
2. Fix any Critical/Important findings, scoped re-review.
3. Merge, deploy (`npm run build && firebase deploy --only hosting:vitaloop` — the new migration applies automatically on merge, same as migration `0004`/`0010`), then live-verify in a real, logged-in Chrome tab against production: start a session on a throwaway plan/day, add an exercise mid-session, remove an unbegun one, log a set on one exercise and confirm its remove button disappears, finish or abandon the session, then reopen the same plan day in the editor and confirm it still shows only the originally planned exercises (the session-scoped change never touched it).
4. Update `CLAUDE.md`'s "Status / Fortschritt" section per this project's handoff convention.

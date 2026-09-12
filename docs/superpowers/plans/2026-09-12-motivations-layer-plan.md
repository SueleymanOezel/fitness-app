# Motivations-Layer (PR-Tracking, Streak, Abschluss-Screen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a completion screen after finishing a live workout that reports any new personal records set during the session and the user's current consecutive-training-day streak, and surface the same streak permanently as a fourth Home dashboard card.

**Architecture:** No new schema — both metrics are computed client-side from existing columns. A new pure module `src/lib/streak.ts` counts consecutive calendar days with a finished session (reusing the "Trainingstag" definition already established in `home-charts.ts`), exposed via a new `useTrainingStreak` hook. A new pure function `neuePersoenlicheRekorde` in `training-charts.ts` compares a session's best estimated 1RM per exercise (Epley, same metric as the existing T8 chart) against a targeted history query. `WorkoutSessionPage.tsx`'s `complete()` no longer navigates immediately — it renders a new `SessionCompletionScreen` in place, and only its "Fertig" button navigates to `/training`.

**Tech Stack:** React 19, TypeScript, react-router-dom v7, Supabase (Postgres + supabase-js), Vitest + Testing Library, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-12-motivations-layer-design.md`

## Global Constraints

- No new migration, no schema change — streak and PRs are computed entirely from `workout_sessions.beendet_am` and `workout_session_sets.gewicht`/`wiederholungen`/`ist_aufwaermsatz`, which already exist. Do not touch `docs/domaenenmodell.md`.
- Streak counts consecutive **calendar days** with at least one finished session (`beendet_am` set), not weeks — explicit user decision, and the same "Trainingstag" definition `home-charts.ts`'s `aktivitaetsraster` already uses.
- No live "new PR" notice while a set is being logged — PRs are collected and shown ONLY on the completion screen after the session ends.
- A failure in the PR-detection query must not block the completion screen — duration, calories, and streak still show; the records section is simply omitted.
- UI copy in German, matching the exact strings this plan specifies.
- Every task ends with `npm test`, `npm run lint`, and `npx tsc -b --noEmit` all clean.

---

## Task 1: Pure functions — new personal records and the streak

**Files:**
- Modify: `src/lib/analysis/training-charts.ts` (append after line 328, the closing `}` of `persoenlicheRekorde`)
- Modify: `src/lib/analysis/training-charts.test.ts` (extend the import at lines 2-14; append a new `describe` block after line 490)
- Create: `src/lib/streak.ts`
- Create: `src/lib/streak.test.ts`

**Interfaces:**
- Produces: `training-charts.ts` exports `type NeuerRekord = { exercise_id: string; name: string; neuesEinsRM: number; altesEinsRM: number | null }` and `function neuePersoenlicheRekorde(sessionSets, vorherigeBeste: Map<string, number>): NeuerRekord[]`. `streak.ts` exports `function aktuellerStreak(sessions: { beendet_am: string | null }[], heute: string): number` and `function streakText(streak: number): string`. Task 2 uses `aktuellerStreak`; Task 3 uses `NeuerRekord`/`neuePersoenlicheRekorde`/the already-existing `epley1RM`; Task 4 and Task 5 use `streakText`.

- [ ] **Step 1: Write the failing tests for `neuePersoenlicheRekorde`**

Replace the import block at the top of `src/lib/analysis/training-charts.test.ts` (currently lines 2-14):

```ts
import {
  sessionsJeWoche,
  haeufigsteUebung,
  uebungenImZeitraum,
  epley1RM,
  kraftverlauf,
  volumenJeSession,
  bestesGewichtJeSession,
  wiederholungenJeSatz,
  volumenJeMuskelgruppe,
  dauerUndKalorien,
  persoenlicheRekorde,
  neuePersoenlicheRekorde,
} from './training-charts'
```

Append this at the end of the file (after line 490, the closing `})` of the `persoenlicheRekorde` describe block):

```ts

const sessionSatz = (
  exercise_id: string,
  name: string,
  gewicht: number | null,
  wiederholungen: number | null,
  ist_aufwaermsatz = false,
) => ({ exercise_id, name, gewicht, wiederholungen, ist_aufwaermsatz })

describe('neuePersoenlicheRekorde', () => {
  it('reports a new record when the session beats the previous best', () => {
    const rekorde = neuePersoenlicheRekorde(
      [sessionSatz('e1', 'Bankdruecken', 100, 5)],
      new Map([['e1', 105]]),
    )
    expect(rekorde).toEqual([{ exercise_id: 'e1', name: 'Bankdruecken', neuesEinsRM: 116.7, altesEinsRM: 105 }])
  })

  it('reports nothing when the session does not beat the previous best', () => {
    const rekorde = neuePersoenlicheRekorde(
      [sessionSatz('e1', 'Bankdruecken', 90, 5)],
      new Map([['e1', 105]]),
    )
    expect(rekorde).toEqual([])
  })

  it('treats an exercise with no prior best as a record ("erste Ausfuehrung")', () => {
    const rekorde = neuePersoenlicheRekorde([sessionSatz('e1', 'Bankdruecken', 60, 10)], new Map())
    expect(rekorde).toEqual([{ exercise_id: 'e1', name: 'Bankdruecken', neuesEinsRM: 80, altesEinsRM: null }])
  })

  it('ignores warm-up sets', () => {
    const rekorde = neuePersoenlicheRekorde([sessionSatz('e1', 'Bankdruecken', 200, 5, true)], new Map())
    expect(rekorde).toEqual([])
  })

  it('takes the best set per exercise within the session, not the first', () => {
    const rekorde = neuePersoenlicheRekorde(
      [sessionSatz('e1', 'Bankdruecken', 80, 5), sessionSatz('e1', 'Bankdruecken', 100, 5)],
      new Map(),
    )
    expect(rekorde).toEqual([{ exercise_id: 'e1', name: 'Bankdruecken', neuesEinsRM: 116.7, altesEinsRM: null }])
  })

  it('reports records for multiple exercises, mixed improved and not', () => {
    const rekorde = neuePersoenlicheRekorde(
      [sessionSatz('e1', 'Bankdruecken', 80, 5), sessionSatz('e2', 'Kniebeuge', 90, 5)],
      new Map([
        ['e1', 105],
        ['e2', 80],
      ]),
    )
    expect(rekorde).toEqual([{ exercise_id: 'e2', name: 'Kniebeuge', neuesEinsRM: 105, altesEinsRM: 80 }])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/analysis/training-charts.test.ts`
Expected: FAIL — `neuePersoenlicheRekorde` is not exported from `./training-charts`.

- [ ] **Step 3: Implement `neuePersoenlicheRekorde`**

Append at the end of `src/lib/analysis/training-charts.ts` (after line 328):

```ts

export type NeuerRekord = { exercise_id: string; name: string; neuesEinsRM: number; altesEinsRM: number | null }

/**
 * Neue Rekorde aus den Saetzen EINER gerade abgeschlossenen Session, verglichen
 * mit dem bisher besten 1RM je Uebung (ohne diese Session — siehe
 * ermittleNeueRekorde in use-workout-session.ts, das `vorherigeBeste` per
 * gezielter Abfrage befuellt). Eine Uebung ohne Eintrag in `vorherigeBeste`
 * zaehlt ebenfalls als Rekord — es gibt schlicht keinen alten Wert, der
 * geschlagen werden muesste ("erste Ausfuehrung").
 */
export function neuePersoenlicheRekorde(
  sessionSets: {
    exercise_id: string
    name: string
    gewicht: number | null
    wiederholungen: number | null
    ist_aufwaermsatz: boolean
  }[],
  vorherigeBeste: Map<string, number>,
): NeuerRekord[] {
  const besteJeUebung = new Map<string, { name: string; einsRM: number }>()
  for (const satz of sessionSets) {
    if (satz.ist_aufwaermsatz) continue
    const einsRM = epley1RM(satz.gewicht, satz.wiederholungen)
    if (einsRM == null) continue
    const gerundet = runde(einsRM)
    const bisher = besteJeUebung.get(satz.exercise_id)
    if (!bisher || gerundet > bisher.einsRM) {
      besteJeUebung.set(satz.exercise_id, { name: satz.name, einsRM: gerundet })
    }
  }

  const rekorde: NeuerRekord[] = []
  for (const [exerciseId, { name, einsRM }] of besteJeUebung) {
    const altesEinsRM = vorherigeBeste.get(exerciseId) ?? null
    if (altesEinsRM != null && einsRM <= altesEinsRM) continue
    rekorde.push({ exercise_id: exerciseId, name, neuesEinsRM: einsRM, altesEinsRM })
  }
  return rekorde.sort((a, b) => b.neuesEinsRM - a.neuesEinsRM || a.name.localeCompare(b.name, 'de'))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/analysis/training-charts.test.ts`
Expected: PASS (all tests in the file, including the 6 new ones)

- [ ] **Step 5: Write the failing tests for `streak.ts`**

```ts
// src/lib/streak.test.ts
import { describe, expect, it } from 'vitest'
import { aktuellerStreak, streakText } from './streak'

describe('aktuellerStreak', () => {
  it('counts backward from today while every day has a finished session', () => {
    const sessions = [
      { beendet_am: '2026-08-24T18:00:00Z' },
      { beendet_am: '2026-08-23T18:00:00Z' },
      { beendet_am: '2026-08-22T18:00:00Z' },
    ]
    expect(aktuellerStreak(sessions, '2026-08-24')).toBe(3)
  })

  it('a gap breaks the streak', () => {
    const sessions = [{ beendet_am: '2026-08-24T18:00:00Z' }, { beendet_am: '2026-08-22T18:00:00Z' }]
    expect(aktuellerStreak(sessions, '2026-08-24')).toBe(1)
  })

  it('does not break the streak just because today has no session yet', () => {
    const sessions = [{ beendet_am: '2026-08-23T18:00:00Z' }, { beendet_am: '2026-08-22T18:00:00Z' }]
    expect(aktuellerStreak(sessions, '2026-08-24')).toBe(2)
  })

  it('is 0 for an empty history', () => {
    expect(aktuellerStreak([], '2026-08-24')).toBe(0)
  })

  it('ignores an unfinished session', () => {
    expect(aktuellerStreak([{ beendet_am: null }], '2026-08-24')).toBe(0)
  })
})

describe('streakText', () => {
  it('says no training day yet for 0', () => {
    expect(streakText(0)).toBe('Noch kein Trainingstag.')
  })

  it('uses the singular for exactly one day', () => {
    expect(streakText(1)).toBe('Erster Trainingstag.')
  })

  it('shows the count for more than one day', () => {
    expect(streakText(5)).toBe('5 Tage in Folge')
  })
})
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/lib/streak.test.ts`
Expected: FAIL — `Failed to resolve import './streak'`

- [ ] **Step 7: Implement `streak.ts`**

```ts
// src/lib/streak.ts
import { localDay } from './local-time'

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Vorheriger Kalendertag ueber lokale Kalenderfelder statt Millisekunden-
 * Subtraktion — dieselbe Vorsicht wie home-charts.ts's naechsterTag: ein
 * Millisekunden-Sprung driftet ueber einen Sommerzeitwechsel um eine Stunde.
 */
function vorherigerTag(tag: string): string {
  const [jahr, monat, tagZahl] = tag.split('-').map(Number)
  const vorher = new Date(jahr, monat - 1, tagZahl - 1)
  return `${vorher.getFullYear()}-${pad(vorher.getMonth() + 1)}-${pad(vorher.getDate())}`
}

/**
 * Aufeinanderfolgende Trainingstage bis heute, rueckwaerts gezaehlt. Dieselbe
 * "Trainingstag"-Definition wie in home-charts.ts's aktivitaetsraster:
 * mindestens eine Session mit gesetztem `beendet_am` an diesem Kalendertag.
 *
 * Hat heute noch kein Training stattgefunden, bricht das den Streak nicht
 * sofort — die Zaehlung beginnt dann bei gestern. Ohne diese Ausnahme wuerde
 * die Home-Karte morgens, bevor trainiert wurde, immer "0 Tage" zeigen, obwohl
 * der Streak faktisch noch intakt ist.
 */
export function aktuellerStreak(sessions: { beendet_am: string | null }[], heute: string): number {
  const trainingstage = new Set<string>()
  for (const session of sessions) {
    if (session.beendet_am != null) trainingstage.add(localDay(session.beendet_am))
  }

  let tag = trainingstage.has(heute) ? heute : vorherigerTag(heute)
  let anzahl = 0
  while (trainingstage.has(tag)) {
    anzahl += 1
    tag = vorherigerTag(tag)
  }
  return anzahl
}

/** Einheitlicher Text an beiden Stellen, die den Streak zeigen (Home-Karte, Abschluss-Screen). */
export function streakText(streak: number): string {
  if (streak === 0) return 'Noch kein Trainingstag.'
  if (streak === 1) return 'Erster Trainingstag.'
  return `${streak} Tage in Folge`
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/lib/streak.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 9: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit`
Expected: all clean.

- [ ] **Step 10: Commit**

```bash
git add src/lib/analysis/training-charts.ts src/lib/analysis/training-charts.test.ts src/lib/streak.ts src/lib/streak.test.ts
git commit -m "feat: add pure functions for new personal records and the training streak"
```

---

## Task 2: `useTrainingStreak` hook

**Files:**
- Create: `src/hooks/use-training-streak.ts`
- Create: `src/hooks/use-training-streak.test.ts`

**Interfaces:**
- Consumes: Task 1's `aktuellerStreak`.
- Produces: `function useTrainingStreak(userId: string): { streak: number; loading: boolean }`. Task 4 and Task 5 call this.

- [ ] **Step 1: Write the failing tests**

```ts
// src/hooks/use-training-streak.test.ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/hooks/use-training-streak.test.ts`
Expected: FAIL — `Failed to resolve import './use-training-streak'`

- [ ] **Step 3: Implement the hook**

```ts
// src/hooks/use-training-streak.ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { seitenweiseLaden } from '../lib/paged-query'
import { aktuellerStreak } from '../lib/streak'
import { localDay } from '../lib/local-time'

/**
 * Aktueller Trainings-Streak, ungebunden an einen Zeitraum — ein Streak kann
 * aelter sein als jedes Dashboard-Fenster (90 Tage), siehe aktuellerStreak in
 * src/lib/streak.ts. Verwendet an zwei Stellen: der Home-Statuskarte und dem
 * Abschluss-Screen (WorkoutSessionPage.tsx) — beide rufen diesen Hook auf,
 * damit sie nie unterschiedliche Werte zeigen koennen.
 */
export function useTrainingStreak(userId: string) {
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const ergebnis = await seitenweiseLaden<{ beendet_am: string | null }>((from, to) =>
      supabase
        .from('workout_sessions')
        .select('beendet_am')
        .eq('user_id', userId)
        .not('beendet_am', 'is', null)
        .order('id', { ascending: true })
        .range(from, to),
    )
    if (current !== requestId.current) return
    setStreak(ergebnis.failed ? 0 : aktuellerStreak(ergebnis.rows, localDay(new Date().toISOString())))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { streak, loading }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/hooks/use-training-streak.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-training-streak.ts src/hooks/use-training-streak.test.ts
git commit -m "feat: add useTrainingStreak hook"
```

---

## Task 3: `use-workout-session.ts` — `completeSession` returns a summary, new `ermittleNeueRekorde`

**Files:**
- Modify: `src/hooks/use-workout-session.ts:1-3` (imports), `:252-278` (`completeSession`), add a new function right after it (before `deleteSession`, currently line 280), `:285-297` (return statement)
- Modify: `src/hooks/use-workout-session.test.ts`

**Interfaces:**
- Consumes: Task 1's `epley1RM` (already exported from `training-charts.ts`), `neuePersoenlicheRekorde`, `type NeuerRekord`.
- Produces: `completeSession(gewichtKg: number)` now returns `Promise<{ beendetAm: string; gesamtKalorien: number | null }>` instead of `Promise<void>`. New function `ermittleNeueRekorde(): Promise<NeuerRekord[]>`, returned from `useWorkoutSession`. Task 4 calls both.

- [ ] **Step 1: Write the failing tests**

In `src/hooks/use-workout-session.test.ts`, add `neq` and `in` to `createQueryBuilder` (currently lines 9-25) — replace it in full:

```ts
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
```

Replace the existing `'completes the session with the given calories'` test (currently lines 344-357) with:

```ts
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
```

Add a new `describe('ermittleNeueRekorde', ...)` block at the end of the file (after the `'measures the session up to the last completed set...'` test, still inside the outer `describe('useWorkoutSession', ...)`, right before its closing `})`):

```ts

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/hooks/use-workout-session.test.ts`
Expected: FAIL — the rewritten `completeSession` test fails on the `summary` assertion (current implementation returns `undefined`); every `ermittleNeueRekorde` test fails because `result.current.ermittleNeueRekorde` is not a function.

- [ ] **Step 3: Implement**

Replace the imports at the top of `src/hooks/use-workout-session.ts` (currently lines 1-3):

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sessionKalorien } from '../lib/workout-calories'
import { epley1RM, neuePersoenlicheRekorde, type NeuerRekord } from '../lib/analysis/training-charts'
```

Replace `completeSession` (currently lines 252-278):

```ts
  async function completeSession(gewichtKg: number): Promise<{ beendetAm: string; gesamtKalorien: number | null }> {
    const beendetAm = new Date().toISOString()
    // Trained time runs to the last completed set, not to whenever the user
    // remembers to press the button — a session finished the next morning
    // would otherwise be billed as many hours of exercise.
    // Compared as parsed instants, not as strings: two timestamps with
    // different UTC offsets sort wrongly in lexicographic order.
    const lastSetAt = sets.reduce<number | null>((latest, set) => {
      if (set.abgeschlossen_am == null) return latest
      const at = Date.parse(set.abgeschlossen_am)
      return Number.isNaN(at) || (latest != null && at <= latest) ? latest : at
    }, null)
    const startedAt = new Date(session?.gestartet_am ?? beendetAm).getTime()
    const endedAt = lastSetAt ?? new Date(beendetAm).getTime()
    const dauerStunden = Math.max(0, endedAt - startedAt) / 1000 / 60 / 60
    const kalorienSets = sets.flatMap((set) =>
      set.exercise?.met_wert == null ? [] : [{ exercise: { met_wert: set.exercise.met_wert } }],
    )
    const gesamtKalorien = sessionKalorien(kalorienSets, gewichtKg, dauerStunden)

    const { error } = await supabase
      .from('workout_sessions')
      .update({ beendet_am: beendetAm, gesamt_kalorien: gesamtKalorien })
      .eq('id', sessionId)
    if (error) throw new Error('complete session failed')
    await reload()
    return { beendetAm, gesamtKalorien }
  }

  /**
   * Compares the just-finished session's best estimated 1RM per exercise
   * against the best 1RM from every OTHER session of this user. RLS on
   * workout_session_sets already restricts the query to the user's own rows
   * (see 0001_initial_schema.sql's exists-subquery-against-workout_sessions
   * policy), so no session-id prefetch is needed here.
   */
  async function ermittleNeueRekorde(): Promise<NeuerRekord[]> {
    const betroffeneIds = [...new Set(sets.filter((set) => !set.ist_aufwaermsatz).map((set) => set.exercise_id))]
    if (betroffeneIds.length === 0) return []

    const { data, error } = await supabase
      .from('workout_session_sets')
      .select('exercise_id, gewicht, wiederholungen')
      .in('exercise_id', betroffeneIds)
      .eq('ist_aufwaermsatz', false)
      .neq('workout_session_id', sessionId)
    if (error) throw new Error('determine new records failed')

    const vorherigeBeste = new Map<string, number>()
    for (const row of (data ?? []) as {
      exercise_id: string
      gewicht: number | null
      wiederholungen: number | null
    }[]) {
      const einsRM = epley1RM(row.gewicht, row.wiederholungen)
      if (einsRM == null) continue
      // Rounded the same way neuePersoenlicheRekorde rounds the session's own
      // best — otherwise float noise (e.g. 116.70000000000002 vs 116.7) could
      // report a "new" record that only differs by a rounding artifact.
      const gerundet = Math.round(einsRM * 10) / 10
      const bisher = vorherigeBeste.get(row.exercise_id)
      if (bisher == null || gerundet > bisher) vorherigeBeste.set(row.exercise_id, gerundet)
    }

    const sessionSetsForCheck = sets
      .filter((set) => betroffeneIds.includes(set.exercise_id))
      .map((set) => ({
        exercise_id: set.exercise_id,
        name: set.exercise?.name ?? '',
        gewicht: set.gewicht,
        wiederholungen: set.wiederholungen,
        ist_aufwaermsatz: set.ist_aufwaermsatz,
      }))

    return neuePersoenlicheRekorde(sessionSetsForCheck, vorherigeBeste)
  }
```

Update the return statement (currently lines 285-297):

```ts
  return {
    session,
    exercises,
    sets,
    loading,
    logSet,
    updateSet,
    completeSession,
    ermittleNeueRekorde,
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
Expected: `use-workout-session.ts`/`.test.ts` are clean. `WorkoutSessionPage.tsx`/`.test.tsx` do not yet read `ermittleNeueRekorde` or the new `completeSession` return shape, so they keep compiling and passing unchanged — this task does not touch those files.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-workout-session.ts src/hooks/use-workout-session.test.ts
git commit -m "feat: return a completion summary and detect new personal records"
```

---

## Task 4: Completion screen on the live session page

**Files:**
- Modify: `src/pages/WorkoutSessionPage.tsx:1-17` (imports), `:38-53` (hook destructuring + new state), `:61-69` (insert the completion-screen branch right after this loading guard), `:117-125` (`complete()`), add the new `SessionCompletionScreen` component right after `LiveSession` closes (currently line 230, before `RIR_VALUES` at line 232)
- Modify: `src/pages/WorkoutSessionPage.test.tsx`

**Interfaces:**
- Consumes: Task 1's `streakText` and `type NeuerRekord`; Task 2's `useTrainingStreak`; Task 3's `ermittleNeueRekorde` and the new `completeSession` return shape.

- [ ] **Step 1: Write the failing tests**

In `src/pages/WorkoutSessionPage.test.tsx`, add a mock for `useTrainingStreak` and a partial mock of `react-router-dom` (to observe `navigate` calls) near the top, after the existing `mockUseWorkoutSession` mock:

```ts
const mockUseTrainingStreak = vi.fn()
vi.mock('../hooks/use-training-streak', () => ({
  useTrainingStreak: (userId: string) => mockUseTrainingStreak(userId),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})
```

Replace `sessionResult`'s `completeSession`/add `ermittleNeueRekorde` (currently within the object at lines 50-70):

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
    completeSession: vi.fn().mockResolvedValue({ beendetAm: '2026-08-21T10:20:00.000Z', gesamtKalorien: 187 }),
    ermittleNeueRekorde: vi.fn().mockResolvedValue([]),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    addExercisesToSession: vi.fn().mockResolvedValue(undefined),
    removeExerciseFromSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}
```

Replace `signedIn` (currently lines 79-83) to reset the navigate spy and give the streak hook a safe default:

```ts
function signedIn(weight: number | null = 80) {
  mockNavigate.mockClear()
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseProfile.mockReturnValue({ profile: { aktuelles_gewicht: weight }, loading: false, error: false })
  mockUseExercises.mockReturnValue({ exercises: [], loading: false, createExercise: vi.fn() })
  mockUseTrainingStreak.mockReturnValue({ streak: 0, loading: false })
}
```

Add these tests inside the `describe('WorkoutSessionPage', ...)` block, anywhere after the existing `'shows a dash instead of completing when no weight is on the profile'` test:

```ts
  it('shows the completion screen with duration, calories and streak after finishing', async () => {
    signedIn()
    const result = sessionResult({
      completeSession: vi.fn().mockResolvedValue({ beendetAm: '2026-08-21T10:25:00.000Z', gesamtKalorien: 187.4 }),
    })
    mockUseWorkoutSession.mockReturnValue(result)
    mockUseTrainingStreak.mockReturnValue({ streak: 3, loading: false })

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    expect(await screen.findByText('Training abgeschlossen')).toBeInTheDocument()
    expect(screen.getByText('25 Minuten · 187 kcal')).toBeInTheDocument()
    expect(screen.getByText('3 Tage in Folge')).toBeInTheDocument()
    // The live session view is gone, not just covered.
    expect(screen.queryByRole('button', { name: 'Training abschließen' })).not.toBeInTheDocument()
  })

  it('shows new personal records on the completion screen', async () => {
    signedIn()
    const result = sessionResult({
      ermittleNeueRekorde: vi.fn().mockResolvedValue([
        { exercise_id: 'ex1', name: 'Bankdrücken', neuesEinsRM: 116.7, altesEinsRM: 105 },
        { exercise_id: 'ex2', name: 'Kniebeuge', neuesEinsRM: 80, altesEinsRM: null },
      ]),
    })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    expect(await screen.findByText('Neue Rekorde')).toBeInTheDocument()
    expect(screen.getByText('Bankdrücken — neues 1RM 116,7 kg (vorher: 105,0 kg)')).toBeInTheDocument()
    expect(screen.getByText('Kniebeuge — neues 1RM 80,0 kg (erste Ausführung)')).toBeInTheDocument()
  })

  it('omits the records section instead of showing an empty one', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    expect(await screen.findByText('Training abgeschlossen')).toBeInTheDocument()
    expect(screen.queryByText('Neue Rekorde')).not.toBeInTheDocument()
  })

  it('still shows the completion screen when determining new records fails', async () => {
    signedIn()
    const result = sessionResult({ ermittleNeueRekorde: vi.fn().mockRejectedValue(new Error('boom')) })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    expect(await screen.findByText('Training abgeschlossen')).toBeInTheDocument()
    expect(screen.queryByText('Neue Rekorde')).not.toBeInTheDocument()
  })

  it('does not navigate immediately after completing the session', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    await screen.findByText('Training abgeschlossen')

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('navigates to /training once Fertig is pressed on the completion screen', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    await screen.findByText('Training abgeschlossen')

    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))

    expect(mockNavigate).toHaveBeenCalledWith('/training')
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/WorkoutSessionPage.test.tsx`
Expected: FAIL on the six new tests — no "Training abgeschlossen" heading renders, `complete()` still navigates immediately instead of showing a completion screen.

- [ ] **Step 3: Implement**

Add two imports to `src/pages/WorkoutSessionPage.tsx` (currently lines 1-17, add after the existing `ExercisePicker` import on line 17):

```tsx
import { useTrainingStreak } from '../hooks/use-training-streak'
import { streakText } from '../lib/streak'
import type { NeuerRekord } from '../lib/analysis/training-charts'
```

Update `LiveSession`'s hook destructuring and state (currently lines 38-53):

```tsx
  const {
    session,
    exercises,
    sets,
    loading,
    logSet,
    completeSession,
    ermittleNeueRekorde,
    addExercisesToSession,
    removeExerciseFromSession,
  } = useWorkoutSession(sessionId)
  const { exercises: katalogUebungen } = useExercises(userId)
  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null)
  const [pause, setPause] = useState<{ until: number; sekunden: number } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [abschluss, setAbschluss] = useState<{
    neueRekorde: NeuerRekord[]
    dauerMinuten: number
    kalorien: number | null
  } | null>(null)
  const showToast = useToast()
  const navigate = useNavigate()
```

Insert the completion-screen branch right after the `loading || profileLoading` guard (currently lines 61-68), before `if (!session) {` (currently line 70) — this order matters: once `completeSession()` resolves, `session.beendet_am` becomes non-null on the next render, so the `abschluss` check must win over the "already completed" guard below it:

```tsx
  if (abschluss !== null) {
    return (
      <SessionCompletionScreen
        userId={userId}
        dauerMinuten={abschluss.dauerMinuten}
        kalorien={abschluss.kalorien}
        neueRekorde={abschluss.neueRekorde}
        onFertig={() => navigate('/training')}
      />
    )
  }

  if (!session) {
```

Replace `complete()` (currently lines 117-125):

```tsx
  async function complete() {
    if (gewichtKg === null || session === null) return
    let ergebnis: { beendetAm: string; gesamtKalorien: number | null }
    try {
      ergebnis = await completeSession(gewichtKg)
    } catch {
      showToast('Training konnte nicht abgeschlossen werden.', 'error')
      return
    }
    let neueRekorde: NeuerRekord[] = []
    try {
      neueRekorde = await ermittleNeueRekorde()
    } catch {
      // PR-Ermittlung ist reiner Bonus-Inhalt — ein Fehler hier zeigt den
      // Abschluss-Screen trotzdem, nur ohne Rekord-Sektion.
    }
    const dauerMinuten = Math.round(
      (new Date(ergebnis.beendetAm).getTime() - new Date(session.gestartet_am).getTime()) / 60000,
    )
    setAbschluss({ neueRekorde, dauerMinuten, kalorien: ergebnis.gesamtKalorien })
  }
```

Add the new component right after `LiveSession`'s closing `}` (currently line 230), before `const RIR_VALUES` (currently line 232):

```tsx
/** Eine Zahl mit einer Nachkommastelle, deutsch geschrieben — wie in PersonalRecordsList.tsx. */
function zahl(wert: number) {
  return wert.toFixed(1).replace('.', ',')
}

function SessionCompletionScreen({
  userId,
  dauerMinuten,
  kalorien,
  neueRekorde,
  onFertig,
}: {
  userId: string
  dauerMinuten: number
  kalorien: number | null
  neueRekorde: NeuerRekord[]
  onFertig: () => void
}) {
  const { streak, loading: streakLoading } = useTrainingStreak(userId)

  return (
    <div>
      <h1>Training abgeschlossen</h1>
      <p>{`${dauerMinuten} Minuten${kalorien == null ? '' : ` · ${Math.round(kalorien)} kcal`}`}</p>
      {neueRekorde.length > 0 && (
        <div className={cardClass}>
          <h2>Neue Rekorde</h2>
          <ul role="list" className="space-y-1">
            {neueRekorde.map((rekord) => (
              <li key={rekord.exercise_id}>
                {`${rekord.name} — neues 1RM ${zahl(rekord.neuesEinsRM)} kg (${
                  rekord.altesEinsRM == null ? 'erste Ausführung' : `vorher: ${zahl(rekord.altesEinsRM)} kg`
                })`}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p>{streakLoading ? '…' : streakText(streak)}</p>
      <button type="button" className={buttonPrimaryClass} onClick={onFertig}>
        Fertig
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/WorkoutSessionPage.test.tsx`
Expected: PASS (all tests in the file, including the six new ones)

- [ ] **Step 5: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit && npm run build`
Expected: all clean, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/pages/WorkoutSessionPage.tsx src/pages/WorkoutSessionPage.test.tsx
git commit -m "feat: show a completion screen with new records and streak after finishing"
```

---

## Task 5: Streak status card on the Home dashboard

**Files:**
- Modify: `src/pages/HomePage.tsx:1-16` (imports), `:39-53` (`Dashboard`'s hooks + loading guard), insert the new card after the Gewicht card (currently ending at line 106), before `<DashboardHomeCharts ...>` (currently line 107)
- Modify: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: Task 1's `streakText`; Task 2's `useTrainingStreak`.

- [ ] **Step 1: Write the failing tests**

In `src/pages/HomePage.test.tsx`, add a mock for `useTrainingStreak` after the existing `mockUseHomeAnalysis` mock:

```ts
const mockUseTrainingStreak = vi.fn()
vi.mock('../hooks/use-training-streak', () => ({
  useTrainingStreak: (userId: string) => mockUseTrainingStreak(userId),
}))
```

Add a default to `stubDefaults()` (currently lines 33-50), right after the `mockUseBodyMetrics.mockReturnValue(...)` line:

```ts
  mockUseTrainingStreak.mockReturnValue({ streak: 0, loading: false })
```

Add these tests inside the `describe('HomePage', ...)` block, anywhere after the existing weight-related tests:

```ts
  it('shows the current streak', () => {
    stubDefaults()
    mockUseTrainingStreak.mockReturnValue({ streak: 4, loading: false })
    renderWithProviders(<HomePage />)
    expect(screen.getByText('4 Tage in Folge')).toBeInTheDocument()
  })

  it('shows a message instead of a streak count when there is none yet', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Noch kein Trainingstag.')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL on the two new tests — no streak text renders anywhere on the page.

- [ ] **Step 3: Implement**

Add two imports to `src/pages/HomePage.tsx` (currently lines 1-16, after the `VitaIcon` import on line 16):

```tsx
import { useTrainingStreak } from '../hooks/use-training-streak'
import { streakText } from '../lib/streak'
```

Update `Dashboard`'s hooks and loading guard (currently lines 39-53):

```tsx
function Dashboard({ userId }: { userId: string }) {
  const { profile, loading: profileLoading } = useProfile(userId)
  const { entries, loading: entriesLoading } = useFoodEntries(userId)
  const { plan, day, loading: trainingLoading } = useActiveTrainingDay(userId)
  const { rows, loading: rowsLoading, error: rowsError } = useBodyMetrics(userId)
  const { streak, loading: streakLoading } = useTrainingStreak(userId)
  const auswahl = useChartSelection(userId)

  if (profileLoading || entriesLoading || trainingLoading || rowsLoading || streakLoading) {
    return (
      <div>
        <h1>Home</h1>
        <p>Lädt…</p>
      </div>
    )
  }
```

Insert the new card right after the Gewicht card's closing `</div>` (currently line 106), before `<DashboardHomeCharts userId={userId} auswahl={auswahl.auswahl} />` (currently line 107):

```tsx
      <div className={cardClass}>
        <h2 className="flex items-center justify-center gap-2">
          <VitaIcon name="training" tone="brand" size={28} />
          Streak
        </h2>
        <p>{streakText(streak)}</p>
        <Link to="/training" className="flex items-center justify-center gap-2">
          <VitaIcon name="training" tone="brand" size={20} />
          Zum Trainingsbereich
        </Link>
      </div>
```

(Reuses the `training` icon already used by the Training card above it — there is no dedicated streak/fire icon in the current icon system, and adding one is outside this plan's scope.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: PASS (all tests in the file, including the two new ones)

- [ ] **Step 5: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit && npm run build`
Expected: all clean, build succeeds. This is the last task, so also run the build once as the final sanity check for the whole feature.

- [ ] **Step 6: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "feat: show the training streak on the Home dashboard"
```

---

## After all tasks: whole-branch review and live verification

Not a task an implementer picks up mid-plan — the controller (whoever is driving `subagent-driven-development` or `executing-plans`) does this once all five tasks are green:

1. Request a whole-branch code review (`superpowers:requesting-code-review`) against the full diff from the branch's base to `HEAD`, covering all five tasks together — in particular whether `ermittleNeueRekorde`'s query genuinely only ever returns the user's own rows (RLS reasoning, not just the mock), whether the `abschluss`-state-before-`session.beendet_am`-check ordering in `WorkoutSessionPage.tsx` actually wins in a real render (not just in the mocked test), and whether `useTrainingStreak` being called twice per completed session (once inside the now-mounted `SessionCompletionScreen`, once on the next Home visit) is acceptable or should be optimized.
2. Fix any Critical/Important findings, scoped re-review.
3. Merge, deploy (`npm run build && firebase deploy --only hosting:vitaloop` — no migration to apply, this feature adds no schema), then live-verify in a real, logged-in Chrome tab against production: start a session on a throwaway plan/day with an exercise never trained before, log a set, finish the session — confirm the completion screen shows duration/calories, a "erste Ausführung" record for that exercise, and a streak of at least 1; check the Home dashboard shows the same streak value in its new card; start and finish a second session with a heavier set on the same exercise and confirm it now shows a "vorher: …" record instead of "erste Ausführung". Delete the throwaway data afterward.
4. Update `CLAUDE.md`'s "Status / Fortschritt" section per this project's handoff convention.

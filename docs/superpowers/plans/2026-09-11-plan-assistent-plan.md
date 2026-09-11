# Plan-Erstellungs-Assistent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-field "Neuer Plan" form with a three-step wizard (Name → Häufigkeit → Plandauer) that creates a workout plan and pre-fills it with the chosen number of empty training days, plus a client-side reminder on the training dashboard once a plan has run past its planned duration.

**Architecture:** Two new nullable columns on `workout_plans` (`haeufigkeit_pro_woche`, `dauer_wochen`). `useWorkoutPlans.createPlan` is extended to accept both and, in a single follow-up batch insert, create that many `workout_plan_days` rows (`Tag 1`…`Tag N`) — never a loop over the existing per-day `addDay`, which computes `reihenfolge` from React state and would silently duplicate values across sequential calls in one render (the same bug already found and fixed for `addExerciseToDay`). A new full-page wizard component drives the three steps and navigates to the existing `TrainingPlanEditPage` editor once the plan exists. A pure `wochenAktiv` helper drives a reminder rendered on `TrainingPage` when a plan has run at least `dauer_wochen` weeks.

**Tech Stack:** React 19, TypeScript, react-router-dom v7, Supabase (Postgres + supabase-js), Vitest + Testing Library, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-11-plan-assistent-design.md`

## Global Constraints

- All new schema is additive and nullable — no backfill, no NOT NULL, existing plans keep working unchanged.
- No loop over the existing `addDay(name)` to create multiple days — always a single array insert (see Architecture above).
- No Experteneinstellungen step, no auto-deactivation, no editing of Häufigkeit/Plandauer after creation — explicitly out of scope per the spec.
- UI copy in German, matching the exact strings this plan specifies (existing error/toast copy conventions in this codebase).
- Every task ends with `npm test`, `npm run lint`, and `npx tsc -b --noEmit` all clean before moving on.

---

## Task 1: Migration — `haeufigkeit_pro_woche` and `dauer_wochen`

**Files:**
- Create: `supabase/migrations/0010_plan_assistent.sql`
- Create: `supabase/migrations/0010_plan_assistent.test.ts`
- Modify: `docs/domaenenmodell.md:100-105` (ERD block), `:188` (prose list, insert after this line)

**Interfaces:**
- Produces: two new nullable columns on `public.workout_plans` — `haeufigkeit_pro_woche integer` (check `between 1 and 7`), `dauer_wochen integer` (check `> 0`). Later tasks read/write these through Supabase's `select('*')`/`insert(...)`, no generated types in this codebase to regenerate.

- [ ] **Step 1: Write the failing migration test**

```ts
// supabase/migrations/0010_plan_assistent.test.ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0010_plan_assistent.sql'), 'utf-8')
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0010_plan_assistent.sql', () => {
  it('adds haeufigkeit_pro_woche and dauer_wochen to workout_plans as nullable columns', () => {
    expect(sql).toMatch(/alter table public\.workout_plans/)
    expect(statements).toContain('add column haeufigkeit_pro_woche integer')
    expect(statements).toContain('add column dauer_wochen integer')
    expect(statements).not.toMatch(/haeufigkeit_pro_woche integer\s+not null/)
    expect(statements).not.toMatch(/dauer_wochen integer\s+not null/)
  })

  it('constrains haeufigkeit_pro_woche to 1..7 and dauer_wochen to a positive number', () => {
    expect(statements).toMatch(/check\s*\(\s*haeufigkeit_pro_woche between 1 and 7\s*\)/)
    expect(statements).toMatch(/check\s*\(\s*dauer_wochen > 0\s*\)/)
  })

  it('adds no table or policy — an alter on an existing RLS-protected table', () => {
    expect(sql).not.toMatch(/create table/i)
    expect(sql).not.toMatch(/create policy/i)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run supabase/migrations/0010_plan_assistent.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open '.../0010_plan_assistent.sql'`

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/0010_plan_assistent.sql
-- Der Plan-Erstellungs-Assistent fragt Häufigkeit (Tage pro Woche) und
-- Plandauer ab. Additiv und nullable: bestehende Pläne (auch ohne den
-- Assistenten angelegte) bleiben unverändert funktionsfähig, der Reminder
-- auf dem Trainings-Dashboard zeigt für sie einfach nichts an.
alter table public.workout_plans
  add column haeufigkeit_pro_woche integer check (haeufigkeit_pro_woche between 1 and 7),
  add column dauer_wochen integer check (dauer_wochen > 0);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run supabase/migrations/0010_plan_assistent.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Update the domain model doc**

In `docs/domaenenmodell.md`, find the `workout_plans` block inside the mermaid ERD (currently `id PK`, `user_id FK`, `name`, `aktiv`) and add the two new fields:

```
    workout_plans {
        uuid id PK
        uuid user_id FK
        text name
        boolean aktiv
        int haeufigkeit_pro_woche
        int dauer_wochen
    }
```

Then add a new bullet at the end of the prose list (same file, the list of `-`-bullets below the ERD, right after the existing `workout_plan_days`/rotation bullet):

```
- `workout_plans.haeufigkeit_pro_woche` (1–7) und `dauer_wochen` (Migration `0010`) kommen aus dem Plan-Erstellungs-Assistenten (`TrainingPlanWizardPage.tsx`) und sind beide nullable — ältere oder ohne Assistenten angelegte Pläne haben sie nicht. `haeufigkeit_pro_woche` bestimmt einmalig, wie viele leere `workout_plan_days` beim Erstellen entstehen (`Tag 1`…`Tag N`, ein einziger Array-Insert, siehe `useWorkoutPlans.createPlan`); danach hat die Spalte keine weitere Funktion. `dauer_wochen` treibt einen rein client-seitig berechneten Hinweis auf `TrainingPage` (`wochenAktiv` in `src/lib/plan-alter.ts`), sobald ein Plan mindestens so viele Wochen seit `created_at` aktiv ist — keine Automatik, kein Cron, kein Auto-Deaktivieren.
```

- [ ] **Step 6: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit`
Expected: all clean (the new test file adds 3 passing tests; nothing else changes yet)

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0010_plan_assistent.sql supabase/migrations/0010_plan_assistent.test.ts docs/domaenenmodell.md
git commit -m "feat: add haeufigkeit_pro_woche and dauer_wochen to workout_plans"
```

---

## Task 2: `useWorkoutPlans.createPlan` creates the plan and its days

**Files:**
- Modify: `src/hooks/use-workout-plans.ts:1-63`
- Modify: `src/hooks/use-workout-plans.test.ts`

**Interfaces:**
- Consumes: Task 1's two new columns (only referenced by name in the insert payload — no import needed).
- Produces: `WorkoutPlan` type now includes `created_at: string`, `haeufigkeit_pro_woche: number | null`, `dauer_wochen: number | null`. `createPlan(name: string, haeufigkeitProWoche: number, dauerWochen: number): Promise<string>` — returns the new plan's id. Task 4 (wizard page) and Task 6 (reminder) both depend on these exact shapes.

- [ ] **Step 1: Write the failing test**

Add to `src/hooks/use-workout-plans.test.ts`, right after the existing `'creates a plan and reloads'` test (replace that test entirely — its assertion no longer matches the new signature):

```ts
  it('creates a plan with the chosen frequency and pre-fills that many days', async () => {
    const plansBuilder = createQueryBuilder({ data: [plan] })
    plansBuilder.single = vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null }))
    const daysBuilder = createQueryBuilder({ data: null, error: null })
    mockFrom.mockImplementation((table: string) => (table === 'workout_plan_days' ? daysBuilder : plansBuilder))

    const { useWorkoutPlans } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlans('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const id = await result.current.createPlan('Push/Pull/Legs', 3, 4)

    expect(id).toBe('new-id')
    expect(plansBuilder.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      name: 'Push/Pull/Legs',
      aktiv: false,
      haeufigkeit_pro_woche: 3,
      dauer_wochen: 4,
    })
    expect(daysBuilder.insert).toHaveBeenCalledWith([
      { workout_plan_id: 'new-id', name: 'Tag 1', reihenfolge: 1 },
      { workout_plan_id: 'new-id', name: 'Tag 2', reihenfolge: 2 },
      { workout_plan_id: 'new-id', name: 'Tag 3', reihenfolge: 3 },
    ])
  })

  it('rejects instead of reporting success when the plan insert fails', async () => {
    const plansBuilder = createQueryBuilder({ data: [plan] })
    plansBuilder.single = vi.fn(() => Promise.resolve({ data: null, error: { message: 'boom' } }))
    mockFrom.mockReturnValue(plansBuilder)

    const { useWorkoutPlans } = await import('./use-workout-plans')
    const { result } = renderHook(() => useWorkoutPlans('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.createPlan('X', 1, 4)).rejects.toThrow()
  })
```

Also update `createQueryBuilder` (top of the same file) to add a `single` method next to the existing `maybeSingle` one, so the default (non-overridden) case resolves through the same `then`-based mechanism the other chained methods already use:

```ts
    maybeSingle: vi.fn(() => builder),
    single: vi.fn(() => builder),
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/use-workout-plans.test.ts`
Expected: FAIL — `createPlan` called with 1 argument doesn't match the 3-argument call, or `plansBuilder.insert` not called with the expected payload (current implementation only takes `name` and never touches `workout_plan_days`).

- [ ] **Step 3: Implement**

Replace the `WorkoutPlan` type and `createPlan` function in `src/hooks/use-workout-plans.ts`:

```ts
export type WorkoutPlan = {
  id: string
  name: string
  aktiv: boolean
  created_at: string
  haeufigkeit_pro_woche: number | null
  dauer_wochen: number | null
}
```

```ts
  // supabase-js resolves rather than throws on a rejected write, so an unchecked
  // error would let the UI report success while nothing was stored.
  //
  // Days are created in one array insert, never via a loop over addDay: addDay
  // computes reihenfolge from the current days state of a *different* hook
  // instance and would compute the same stale reihenfolge for every call in a
  // single render (the same closure bug already found and fixed for
  // addExerciseToDay — see the exercise-picker redesign).
  async function createPlan(name: string, haeufigkeitProWoche: number, dauerWochen: number): Promise<string> {
    const { data, error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        name,
        aktiv: false,
        haeufigkeit_pro_woche: haeufigkeitProWoche,
        dauer_wochen: dauerWochen,
      })
      .select('id')
      .single()
    if (error || !data) throw new Error('create plan failed')

    const days = Array.from({ length: haeufigkeitProWoche }, (_, index) => ({
      workout_plan_id: data.id as string,
      name: `Tag ${index + 1}`,
      reihenfolge: index + 1,
    }))
    const { error: daysError } = await supabase.from('workout_plan_days').insert(days)
    if (daysError) throw new Error('create plan days failed')

    await reload()
    return data.id as string
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/hooks/use-workout-plans.test.ts`
Expected: PASS (all tests in the file, including the two new ones)

- [ ] **Step 5: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit`
Expected: all clean. (`TrainingPlansPage.tsx`'s call site now has a type error — `createPlan(trimmed)` with one argument — this is expected and gets fixed in Task 5; if this task is executed standalone, note the error and move on, it is resolved by Task 5.)

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-workout-plans.ts src/hooks/use-workout-plans.test.ts
git commit -m "feat: create plan days in one batch when a plan is created"
```

---

## Task 3: `wochenAktiv` — weeks-elapsed helper

**Files:**
- Create: `src/lib/plan-alter.ts`
- Create: `src/lib/plan-alter.test.ts`

**Interfaces:**
- Produces: `wochenAktiv(createdAt: string, now: Date): number` — full weeks elapsed between `createdAt` (an ISO timestamp, e.g. `workout_plans.created_at`) and `now`, floored. Task 6 depends on this exact name and signature.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/plan-alter.test.ts
import { describe, expect, it } from 'vitest'
import { wochenAktiv } from './plan-alter'

describe('wochenAktiv', () => {
  it('is 0 right after creation', () => {
    const created = '2026-01-01T00:00:00.000Z'
    const now = new Date('2026-01-01T00:00:00.000Z')
    expect(wochenAktiv(created, now)).toBe(0)
  })

  it('is still 0 one day short of a full week', () => {
    const created = '2026-01-01T00:00:00.000Z'
    const now = new Date('2026-01-07T23:59:59.000Z')
    expect(wochenAktiv(created, now)).toBe(0)
  })

  it('becomes 1 exactly one week later', () => {
    const created = '2026-01-01T00:00:00.000Z'
    const now = new Date('2026-01-08T00:00:00.000Z')
    expect(wochenAktiv(created, now)).toBe(1)
  })

  it('counts multiple full weeks', () => {
    const created = '2026-01-01T00:00:00.000Z'
    const now = new Date('2026-01-29T12:00:00.000Z') // 4 weeks + half a day
    expect(wochenAktiv(created, now)).toBe(4)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/plan-alter.test.ts`
Expected: FAIL — `Failed to resolve import './plan-alter'`

- [ ] **Step 3: Implement**

```ts
// src/lib/plan-alter.ts
const MS_PRO_WOCHE = 7 * 24 * 60 * 60 * 1000

/** Full weeks elapsed since createdAt, floored — 6 days in is still week 0. */
export function wochenAktiv(createdAt: string, now: Date): number {
  const vergangeneMs = now.getTime() - new Date(createdAt).getTime()
  return Math.floor(vergangeneMs / MS_PRO_WOCHE)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/plan-alter.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/plan-alter.ts src/lib/plan-alter.test.ts
git commit -m "feat: add wochenAktiv helper for the plan-duration reminder"
```

---

## Task 4: Wizard page and route

**Files:**
- Create: `src/pages/TrainingPlanWizardPage.tsx`
- Create: `src/pages/TrainingPlanWizardPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useWorkoutPlans(userId).createPlan(name, haeufigkeitProWoche, dauerWochen): Promise<string>` (Task 2), `Chip` (`src/components/Chip.tsx`, existing), `buttonPrimaryClass`/`buttonSecondaryClass`/`inputClass` (`src/lib/ui-classes.ts`, existing), `useToast` (`src/components/ToastProvider.tsx`, existing), `VitaIcon` (existing).
- Produces: default export `TrainingPlanWizardPage`, mounted at `/training/plans/new`. Task 5 links to this route.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/TrainingPlanWizardPage.test.tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-render'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseWorkoutPlans = vi.fn()
vi.mock('../hooks/use-workout-plans', () => ({ useWorkoutPlans: (userId: string) => mockUseWorkoutPlans(userId) }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function stelleBereit(createPlan = vi.fn().mockResolvedValue('new-id')) {
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseWorkoutPlans.mockReturnValue({ createPlan })
  return createPlan
}

describe('TrainingPlanWizardPage', () => {
  it('walks through all three steps and creates the plan', async () => {
    const createPlan = stelleBereit()
    const { default: TrainingPlanWizardPage } = await import('./TrainingPlanWizardPage')
    renderWithProviders(<TrainingPlanWizardPage />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Push/Pull/Legs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getByRole('heading', { name: 'Wie oft möchtest du trainieren?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '3× pro Woche' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getByRole('heading', { name: 'Plandauer' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Plan erstellen' }))

    await waitFor(() => expect(createPlan).toHaveBeenCalledWith('Push/Pull/Legs', 3, 4))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/training/plans/new-id'))
  })

  it('refuses to continue without a name', async () => {
    stelleBereit()
    const { default: TrainingPlanWizardPage } = await import('./TrainingPlanWizardPage')
    renderWithProviders(<TrainingPlanWizardPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Wie oft möchtest du trainieren?' })).not.toBeInTheDocument()
  })

  it('requires a frequency before continuing to plan duration', async () => {
    stelleBereit()
    const { default: TrainingPlanWizardPage } = await import('./TrainingPlanWizardPage')
    renderWithProviders(<TrainingPlanWizardPage />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Push/Pull/Legs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled()
  })

  it('goes back a step and keeps the entered name', async () => {
    stelleBereit()
    const { default: TrainingPlanWizardPage } = await import('./TrainingPlanWizardPage')
    renderWithProviders(<TrainingPlanWizardPage />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Push/Pull/Legs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))

    expect(screen.getByLabelText('Name')).toHaveValue('Push/Pull/Legs')
  })

  it('reports a failed creation instead of navigating', async () => {
    stelleBereit(vi.fn().mockRejectedValue(new Error('boom')))
    const { default: TrainingPlanWizardPage } = await import('./TrainingPlanWizardPage')
    renderWithProviders(<TrainingPlanWizardPage />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Push/Pull/Legs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('button', { name: '2× pro Woche' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Plan erstellen' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/TrainingPlanWizardPage.test.tsx`
Expected: FAIL — `Failed to resolve import './TrainingPlanWizardPage'`

- [ ] **Step 3: Implement**

```tsx
// src/pages/TrainingPlanWizardPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutPlans } from '../hooks/use-workout-plans'
import { buttonPrimaryClass, buttonSecondaryClass, inputClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import Chip from '../components/Chip'

const HAEUFIGKEITEN = [1, 2, 3, 4, 5, 6, 7]
const STANDARD_DAUER_WOCHEN = 4

export default function TrainingPlanWizardPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Neuer Plan</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Wizard userId={userId} />
}

function Wizard({ userId }: { userId: string }) {
  const { createPlan } = useWorkoutPlans(userId)
  const navigate = useNavigate()
  const showToast = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [haeufigkeit, setHaeufigkeit] = useState<number | null>(null)
  const [dauer, setDauer] = useState(STANDARD_DAUER_WOCHEN)
  const [submitting, setSubmitting] = useState(false)

  function weiterVonName() {
    if (name.trim() === '') {
      setNameError('Der Plan braucht einen Namen.')
      return
    }
    setNameError('')
    setStep(2)
  }

  async function planErstellen() {
    if (haeufigkeit === null) return
    setSubmitting(true)
    try {
      const id = await createPlan(name.trim(), haeufigkeit, dauer)
      navigate(`/training/plans/${id}`)
    } catch {
      showToast('Plan konnte nicht erstellt werden.', 'error')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1>Neuer Plan</h1>
      {step === 1 && (
        <>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </label>
          {nameError !== '' && <p role="alert">{nameError}</p>}
          <button type="button" className={buttonPrimaryClass} onClick={weiterVonName}>
            Weiter
          </button>
        </>
      )}
      {step === 2 && (
        <>
          <h2>Wie oft möchtest du trainieren?</h2>
          <div className="flex flex-wrap gap-2">
            {HAEUFIGKEITEN.map((wert) => (
              <Chip key={wert} active={haeufigkeit === wert} onClick={() => setHaeufigkeit(wert)}>
                {wert}× pro Woche
              </Chip>
            ))}
          </div>
          <button type="button" className={buttonSecondaryClass} onClick={() => setStep(1)}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="back" tone="mono" size={20} />
              Zurück
            </span>
          </button>
          <button
            type="button"
            className={buttonPrimaryClass}
            disabled={haeufigkeit === null}
            onClick={() => setStep(3)}
          >
            Weiter
          </button>
        </>
      )}
      {step === 3 && (
        <>
          <h2>Plandauer</h2>
          <label>
            Wochen
            <input
              type="number"
              min={1}
              value={dauer}
              onChange={(event) => setDauer(Number(event.target.value))}
              className={inputClass}
            />
          </label>
          <button type="button" className={buttonSecondaryClass} onClick={() => setStep(2)}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="back" tone="mono" size={20} />
              Zurück
            </span>
          </button>
          <button type="button" className={buttonPrimaryClass} disabled={submitting} onClick={planErstellen}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="add" tone="mono" size={20} />
              Plan erstellen
            </span>
          </button>
        </>
      )}
    </div>
  )
}
```

Add the route in `src/App.tsx`: import `TrainingPlanWizardPage` next to the existing `TrainingPlanEditPage` import, and add the route **before** `/training/plans/:planId` (static segments already outrank dynamic ones in react-router v7's ranked matching, but ordering it first keeps the intent obvious to a future reader):

```tsx
import TrainingPlanWizardPage from './pages/TrainingPlanWizardPage'
```

```tsx
          <Route path="/training/plans" element={<TrainingPlansPage />} />
          <Route path="/training/plans/new" element={<TrainingPlanWizardPage />} />
          <Route path="/training/plans/:planId" element={<TrainingPlanEditPage />} />
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/TrainingPlanWizardPage.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add src/pages/TrainingPlanWizardPage.tsx src/pages/TrainingPlanWizardPage.test.tsx src/App.tsx
git commit -m "feat: add the plan-creation wizard page and route"
```

---

## Task 5: `TrainingPlansPage` links to the wizard instead of the inline form

**Files:**
- Modify: `src/pages/TrainingPlansPage.tsx:85-108`
- Modify: `src/pages/TrainingPlansPage.test.tsx`

**Interfaces:**
- Consumes: `/training/plans/new` route (Task 4).

- [ ] **Step 1: Update the tests**

In `src/pages/TrainingPlansPage.test.tsx`:

Remove the `'creates a new plan'` and `'refuses to create a plan without a name'` tests entirely (that behavior now lives in `TrainingPlanWizardPage.test.tsx`, Task 4).

Add in their place:

```ts
  it('links to the plan-creation wizard instead of an inline form', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlans.mockReturnValue(plansResult())

    renderWithProviders(<TrainingPlansPage />)

    expect(screen.getByRole('link', { name: /Neuer Plan/ })).toHaveAttribute('href', '/training/plans/new')
    expect(screen.queryByLabelText('Neuer Plan')).not.toBeInTheDocument()
  })
```

(`TrainingPlansPage` import at the top of the file already covers this — no new import needed. Note `renderWithProviders` needs no `await import(...)` here since the top-of-file dynamic-import pattern in the two removed tests was only there to run after `vi.mock` calls; the remaining tests in this file already import `TrainingPlansPage` the same dynamic way, so match that existing convention exactly rather than a static import.)

Also update the `plansResult()` helper's default `createPlan` mock is no longer called by this page directly — leave the helper as-is (harmless unused field in the returned object for the remaining tests).

- [ ] **Step 2: Run the tests to verify the new one fails**

Run: `npx vitest run src/pages/TrainingPlansPage.test.tsx`
Expected: FAIL on the new test — no link named `/Neuer Plan/` exists yet (the current markup is a text input + submit button).

- [ ] **Step 3: Implement**

In `src/pages/TrainingPlansPage.tsx`, replace the entire `<form>` block (currently lines ~85-108: the `name`/`nameError` state, the `<form onSubmit={...}>`, and the `{nameError !== '' && ...}` line) with a single link, and remove the now-unused `name`/`nameError` state and the `createPlan` destructure (keep `deletePlan`/`activatePlan`):

```tsx
      <Link to="/training/plans/new" className={buttonPrimaryClass}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="add" tone="mono" size={20} />
          Neuer Plan
        </span>
      </Link>
```

The `PlansList` function's destructure becomes:

```tsx
  const { plans, loading, deletePlan, activatePlan } = useWorkoutPlans(userId)
  const showToast = useToast()
```

(drop `createPlan`, `useState`-based `name`/`nameError`, and the now-unused `useState` import if nothing else in the file needs it — check before removing the import, `PlansList` has no other `useState` call, so the `import { useState } from 'react'` line at the top of the file should be removed entirely.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/TrainingPlansPage.test.tsx`
Expected: PASS (all remaining tests, including the new one)

- [ ] **Step 5: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add src/pages/TrainingPlansPage.tsx src/pages/TrainingPlansPage.test.tsx
git commit -m "feat: link to the plan-creation wizard from the plans list"
```

---

## Task 6: Reminder on the training dashboard

**Files:**
- Modify: `src/pages/TrainingPage.tsx:1-13` (import), `:73-74` (insert the reminder block between these two lines)
- Modify: `src/pages/TrainingPage.test.tsx`

**Interfaces:**
- Consumes: `wochenAktiv(createdAt, now)` (Task 3), `plan.dauer_wochen`/`plan.created_at` (Task 2's extended `WorkoutPlan` type, already flows through `useActiveTrainingDay` since it does `select('*')` and casts to `WorkoutPlan[]`).

- [ ] **Step 1: Write the failing tests**

Add to `src/pages/TrainingPage.test.tsx`, inside the main `describe('TrainingPage', ...)` block:

```ts
  it('shows a reminder once a plan has run past its planned duration', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue({
      plan: { id: 'p1', name: 'Ganzkörper', aktiv: true, created_at: '2020-01-01T00:00:00.000Z', dauer_wochen: 4 },
      day: { id: 'd1', name: 'Tag A', reihenfolge: 1 },
      loading: false,
    })

    zeigeDashboard()

    expect(screen.getByRole('link', { name: /Zeit für einen neuen/i })).toHaveAttribute(
      'href',
      '/training/plans/new',
    )
  })

  it('shows no reminder for a plan without a set duration', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue(activeDay) // no dauer_wochen field at all

    zeigeDashboard()

    expect(screen.queryByRole('link', { name: /Zeit für einen neuen/i })).not.toBeInTheDocument()
  })

  it('shows no reminder while a plan is still within its planned duration', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue({
      plan: {
        id: 'p1',
        name: 'Ganzkörper',
        aktiv: true,
        created_at: new Date().toISOString(),
        dauer_wochen: 4,
      },
      day: { id: 'd1', name: 'Tag A', reihenfolge: 1 },
      loading: false,
    })

    zeigeDashboard()

    expect(screen.queryByRole('link', { name: /Zeit für einen neuen/i })).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/pages/TrainingPage.test.tsx`
Expected: FAIL on the first new test — no such link exists yet. (The other two pass vacuously already, since nothing renders the link at all yet — that's expected and fine; the meaningful RED is the first one.)

- [ ] **Step 3: Implement**

In `src/pages/TrainingPage.tsx`, add the import:

```tsx
import { wochenAktiv } from '../lib/plan-alter'
```

Insert a new block right after the `{plan == null && (...)}` block and before the `{plan != null && day == null && (...)}` block (so it renders exactly once whenever a plan exists, regardless of whether it has a day yet):

```tsx
      {plan != null && plan.dauer_wochen != null && wochenAktiv(plan.created_at, new Date()) >= plan.dauer_wochen && (
        <p>
          Dieser Plan läuft seit {wochenAktiv(plan.created_at, new Date())} Wochen —{' '}
          <Link to="/training/plans/new">Zeit für einen neuen?</Link>
        </p>
      )}
```

`Link` is already imported in this file (used further down for `/training/plans`, `/training/exercises`, etc.) — no new import needed for it.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/pages/TrainingPage.test.tsx`
Expected: PASS (all tests in the file, including the three new ones)

- [ ] **Step 5: Run the full check suite**

Run: `npm test && npm run lint && npx tsc -b --noEmit && npm run build`
Expected: all clean, build succeeds. This is the last task, so also run the build once as the final sanity check for the whole feature.

- [ ] **Step 6: Commit**

```bash
git add src/pages/TrainingPage.tsx src/pages/TrainingPage.test.tsx
git commit -m "feat: remind on the dashboard once a plan outlives its planned duration"
```

---

## After all tasks: whole-branch review and live verification

Not a task an implementer picks up mid-plan — the controller (whoever is driving `subagent-driven-development` or `executing-plans`) does this once all six tasks are green:

1. Request a whole-branch code review (`superpowers:requesting-code-review`) against the full diff from the branch's base to `HEAD`, covering all six tasks together (catches cross-task issues no single task's review would see — e.g. whether the wizard's `haeufigkeit`/`dauer` values actually match what Task 2's `createPlan` expects end-to-end).
2. Fix any Critical/Important findings, scoped re-review.
3. Merge, deploy (`npm run build && firebase deploy --only hosting:vitaloop` — no data-migration script to run by hand this time, `supabase/migrations` applies through the normal Supabase migration flow), then live-verify in a real, logged-in Chrome tab against production: walk the full wizard for a throwaway test plan, confirm the right number of days were created with the right names, confirm the plan is immediately editable via the existing exercise picker, and check the reminder by temporarily backdating a throwaway plan's `created_at` (same pattern already used for T6 in the P2 task — created, checked, then deleted; no production data left behind).
4. Update `CLAUDE.md`'s "Status / Fortschritt" section per this project's handoff convention.

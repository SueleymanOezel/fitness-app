# Phase 3 — Trainingsbereich Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Übungsdatenbank importieren, Mehrtages-Trainingspläne verwalten, Training live durchführen (Sätze erfassen, Pausen-Timer, Auto-Sprung), Kalorienverbrauch über MET berechnen, Trainingshistorie mit Korrektur.

**Architecture:** Eine Migration entwickelt die in Phase 1 leer angelegten Trainings-Tabellen weiter (Tage-Ebene für Mehrtages-Pläne). Ein einmaliges Node-Skript importiert `free-exercise-db` mit einer Kategorie→MET-Zuordnung. React-Hooks kapseln je einen fachlichen Bereich (Übungen, Pläne, laufende Session, Historie) nach demselben Muster wie `use-food-entries.ts`; reine Funktionen in `src/lib` übernehmen Rotation und Kalorienberechnung.

**Tech Stack:** React 19 + TypeScript, Vite 8, Vitest 4 mit jsdom + Testing Library, Supabase (postgrest-js), React Router 7, Node 24 (führt `.ts`-Skripte ohne zusätzliches Tooling aus, `erasableSyntaxOnly` im Projekt bereits erzwungen).

**Spec:** `docs/superpowers/specs/2026-08-21-phase3-trainingsbereich-design.md`

## Global Constraints

- Migration `0004_training_days.sql` entwickelt die bestehenden, leeren Phase-1-Tabellen weiter (`workout_plan_exercises` → `workout_plan_day_exercises`, `workout_sessions.workout_plan_id` → `workout_plan_day_id`) — keine Datenmigration nötig, die Tabellen sind leer.
- `exercises` und `workout_session_sets` bleiben unverändert.
- Reihenfolge (Tage, Tages-Übungen) ist eine explizite `reihenfolge`-Spalte, geändert durch Vertauschen zweier benachbarter Werte — nie implizit über Array-/Einfügereihenfolge.
- Jeder abgeschlossene Satz wird sofort geschrieben, kein Sammeln im Client-State bis Session-Ende.
- Der Pausen-Timer speichert einen Zielzeitpunkt (`Date.now() + Sekunden`), keinen reinen Tick-Countdown.
- `sessionKalorien` verlangt ein gesetztes Gewicht (Parametertyp `number`); die aufrufende Seite prüft `profiles.aktuelles_gewicht` vorher und zeigt sonst „—" statt eines falschen Werts.
- `gewichtKg` kommt aus `profiles.aktuelles_gewicht` (bestehendes Feld, kein neues).
- Keine Namen von Drittanbieter-Apps in Code, Kommentaren oder Commit-Messages.
- Code und Bezeichner englisch, Oberflächentexte deutsch. Dateien kebab-case, Komponenten PascalCase.
- Schreibpfade werfen bei Fehlern; supabase-js liefert Fehler als Rückgabewert, nicht als Exception.
- Nie allein auf `Number.isNaN` prüfen: `Number('')` ergibt 0, nicht NaN.
- Vor jedem Commit: `npm test`, `npm run lint`, `npx tsc -b --noEmit` grün.
- TDD: erst der fehlschlagende Test, Fehlschlag beobachten, dann die minimale Implementierung.
- Das Import-Skript läuft mit dem Supabase Service-Role-Key (lokal per Umgebungsvariable, nie committet), nicht mit dem anon key der App — es schreibt `created_by = null`, was die reguläre `exercises_insert_own`-Policy sonst ablehnen würde.
- `scripts/` liegt außerhalb von `tsconfig.app.json`/`tsconfig.node.json` (wie `supabase/migrations/*.ts` bereits heute) — `npx tsc -b --noEmit` prüft diese Dateien nicht mit, `npm run lint` (ESLint läuft auf allen `**/*.{ts,tsx}`, ohne tsconfig-Projektbindung) und `npm test` schon.

---

### Task 1: Migration 0004 — Tage-Ebene für Trainingspläne

**Files:**
- Create: `supabase/migrations/0004_training_days.sql`
- Create: `supabase/migrations/0004_training_days.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: Tabelle `workout_plan_days`; `workout_plan_day_exercises` (umbenannt von `workout_plan_exercises`, Spalte `workout_plan_day_id` statt `workout_plan_id`); `workout_sessions.workout_plan_day_id` (umbenannt von `workout_plan_id`)

- [ ] **Step 1: Write the failing test**

`supabase/migrations/0004_training_days.test.ts` — gleiches Muster wie `0003_meal_sections.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0004_training_days.sql'), 'utf-8')

describe('0004_training_days.sql', () => {
  it('creates workout_plan_days referencing workout_plans', () => {
    expect(sql).toMatch(/create table public\.workout_plan_days/)
    expect(sql).toMatch(/workout_plan_id uuid not null references public\.workout_plans \(id\) on delete cascade/)
    expect(sql).toMatch(/name text not null/)
    expect(sql).toMatch(/reihenfolge integer not null/)
  })

  it('enables RLS on workout_plan_days scoped through workout_plans', () => {
    expect(sql).toMatch(/alter table public\.workout_plan_days enable row level security/)
    expect(sql).toMatch(/create policy "workout_plan_days_all_own" on public\.workout_plan_days/)
  })

  it('renames workout_plan_exercises to workout_plan_day_exercises and rehangs it on the day', () => {
    expect(sql).toMatch(/alter table public\.workout_plan_exercises rename to workout_plan_day_exercises/)
    expect(sql).toMatch(
      /alter table public\.workout_plan_day_exercises rename column workout_plan_id to workout_plan_day_id/,
    )
    expect(sql).toMatch(/references public\.workout_plan_days \(id\) on delete cascade/)
  })

  it('replaces the old ownership policy with one that walks through workout_plan_days', () => {
    expect(sql).toMatch(/drop policy "workout_plan_exercises_all_own" on public\.workout_plan_day_exercises/)
    expect(sql).toMatch(/create policy "workout_plan_day_exercises_all_own" on public\.workout_plan_day_exercises/)
    expect(sql).toMatch(/from public\.workout_plan_days wpd/)
    expect(sql).toMatch(/join public\.workout_plans wp on wp\.id = wpd\.workout_plan_id/)
  })

  it('points workout_sessions at a day instead of a plan', () => {
    expect(sql).toMatch(/alter table public\.workout_sessions rename column workout_plan_id to workout_plan_day_id/)
    expect(sql).toMatch(/references public\.workout_plan_days \(id\)/)
  })

  it('adds indexes on the new and renamed foreign key columns', () => {
    expect(sql).toMatch(/create index on public\.workout_plan_days \(workout_plan_id\)/)
    expect(sql).toMatch(/create index on public\.workout_sessions \(workout_plan_day_id\)/)
  })

  it('leaves exercises and workout_session_sets untouched', () => {
    expect(sql).not.toMatch(/alter table public\.exercises/)
    expect(sql).not.toMatch(/alter table public\.workout_session_sets/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/migrations/0004_training_days.test.ts`
Expected: FAIL — `ENOENT`, die SQL-Datei existiert nicht

- [ ] **Step 3: Write the migration**

`supabase/migrations/0004_training_days.sql`:

```sql
-- Phase 3: a plan can now hold several named days (e.g. Push/Pull/Legs).
-- workout_plan_exercises and workout_sessions were created empty in 0001 and
-- never used (the Training-Dashboard was a placeholder), so this evolves
-- them in place instead of leaving a dead parallel table behind.

create table public.workout_plan_days (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans (id) on delete cascade,
  name text not null,
  reihenfolge integer not null,
  created_at timestamptz not null default now()
);

alter table public.workout_plan_days enable row level security;

create policy "workout_plan_days_all_own" on public.workout_plan_days
  for all using (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = workout_plan_id and wp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = workout_plan_id and wp.user_id = auth.uid()
    )
  );

create index on public.workout_plan_days (workout_plan_id);

-- Rehang workout_plan_exercises on a day instead of directly on a plan.
drop policy "workout_plan_exercises_all_own" on public.workout_plan_exercises;

alter table public.workout_plan_exercises rename to workout_plan_day_exercises;

alter table public.workout_plan_day_exercises
  drop constraint workout_plan_exercises_workout_plan_id_fkey;

alter table public.workout_plan_day_exercises
  rename column workout_plan_id to workout_plan_day_id;

alter table public.workout_plan_day_exercises
  add constraint workout_plan_day_exercises_workout_plan_day_id_fkey
    foreign key (workout_plan_day_id) references public.workout_plan_days (id) on delete cascade;

create policy "workout_plan_day_exercises_all_own" on public.workout_plan_day_exercises
  for all using (
    exists (
      select 1 from public.workout_plan_days wpd
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wpd.id = workout_plan_day_id and wp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_plan_days wpd
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wpd.id = workout_plan_day_id and wp.user_id = auth.uid()
    )
  );

-- A session belongs to a concrete day; the plan follows from the day.
alter table public.workout_sessions
  drop constraint workout_sessions_workout_plan_id_fkey;

alter table public.workout_sessions
  rename column workout_plan_id to workout_plan_day_id;

alter table public.workout_sessions
  add constraint workout_sessions_workout_plan_day_id_fkey
    foreign key (workout_plan_day_id) references public.workout_plan_days (id);

create index on public.workout_sessions (workout_plan_day_id);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/migrations/0004_training_days.test.ts`
Expected: PASS, 7 Tests

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_training_days.sql supabase/migrations/0004_training_days.test.ts
git commit -m "feat: add training-plan days and rehang plan exercises and sessions on them"
```

---

### Task 2: Übungsimport (free-exercise-db)

**Files:**
- Create: `src/lib/met-categories.ts`
- Create: `src/lib/met-categories.test.ts`
- Create: `scripts/free-exercise-db.json`
- Create: `scripts/import-exercises.ts`
- Create: `scripts/import-exercises.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `metForCategory(category: string): number`; `toExerciseRow(raw): { name, kategorie, equipment, muskelgruppen_primaer, muskelgruppen_sekundaer, bild_url, met_wert, created_by }`

- [ ] **Step 1: Write the failing test for met-categories**

`src/lib/met-categories.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { metForCategory } from './met-categories'

describe('metForCategory', () => {
  it('returns the documented value for each known free-exercise-db category', () => {
    expect(metForCategory('strength')).toBe(5.0)
    expect(metForCategory('cardio')).toBe(8.0)
    expect(metForCategory('stretching')).toBe(2.5)
    expect(metForCategory('plyometrics')).toBe(8.0)
    expect(metForCategory('powerlifting')).toBe(6.0)
    expect(metForCategory('strongman')).toBe(6.0)
    expect(metForCategory('olympic weightlifting')).toBe(6.0)
  })

  it('falls back to a documented moderate value for an unknown category', () => {
    expect(metForCategory('unknown-category')).toBe(5.0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/lib/met-categories.test.ts`
Expected: FAIL — `Failed to resolve import "./met-categories"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/met-categories.ts`:

```ts
/**
 * MET values per free-exercise-db `category` (Compendium of Physical
 * Activities, approximate). Per-category, not per-exercise: precise enough
 * for a rough calorie estimate without hand-researching 800+ entries.
 */
const MET_BY_CATEGORY: Record<string, number> = {
  strength: 5.0,
  cardio: 8.0,
  stretching: 2.5,
  plyometrics: 8.0,
  powerlifting: 6.0,
  strongman: 6.0,
  'olympic weightlifting': 6.0,
}

const FALLBACK_MET = 5.0

export function metForCategory(category: string): number {
  return MET_BY_CATEGORY[category] ?? FALLBACK_MET
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/lib/met-categories.test.ts`
Expected: PASS, 2 Tests

- [ ] **Step 5: Download the free-exercise-db fixture**

```bash
curl -s "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json" -o scripts/free-exercise-db.json
```

Verify: die Datei hat 873 Einträge (`node -e "console.log(JSON.parse(require('fs').readFileSync('scripts/free-exercise-db.json','utf-8')).length)"` → `873`). Der Datensatz ist gemeinfrei (Public Domain), unbedenklich zu committen.

- [ ] **Step 6: Write the failing test for the import mapping**

`scripts/import-exercises.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { toExerciseRow } from './import-exercises.ts'

describe('toExerciseRow', () => {
  it('maps a raw free-exercise-db entry to an exercises row', () => {
    const raw = {
      name: '3/4 Sit-Up',
      category: 'strength',
      equipment: 'body only',
      primaryMuscles: ['abdominals'],
      secondaryMuscles: [],
      images: ['3_4_Sit-Up/0.jpg', '3_4_Sit-Up/1.jpg'],
    }

    expect(toExerciseRow(raw)).toEqual({
      name: '3/4 Sit-Up',
      kategorie: 'strength',
      equipment: 'body only',
      muskelgruppen_primaer: ['abdominals'],
      muskelgruppen_sekundaer: [],
      bild_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/3_4_Sit-Up/0.jpg',
      met_wert: 5.0,
      created_by: null,
    })
  })

  it('uses the category MET value, not a hardcoded one', () => {
    const raw = {
      name: 'Air Bike',
      category: 'cardio',
      equipment: null,
      primaryMuscles: ['abdominals'],
      secondaryMuscles: [],
      images: [],
    }

    expect(toExerciseRow(raw).met_wert).toBe(8.0)
  })

  it('leaves bild_url null when an entry has no images', () => {
    const raw = {
      name: 'X',
      category: 'strength',
      equipment: null,
      primaryMuscles: [],
      secondaryMuscles: [],
      images: [],
    }

    expect(toExerciseRow(raw).bild_url).toBeNull()
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run scripts/import-exercises.test.ts`
Expected: FAIL — `Failed to resolve import "./import-exercises.ts"`

- [ ] **Step 8: Write minimal implementation**

`scripts/import-exercises.ts`:

```ts
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { metForCategory } from '../src/lib/met-categories.ts'

const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

type RawExercise = {
  name: string
  category: string
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  images: string[]
}

export function toExerciseRow(raw: RawExercise) {
  return {
    name: raw.name,
    kategorie: raw.category,
    equipment: raw.equipment,
    muskelgruppen_primaer: raw.primaryMuscles,
    muskelgruppen_sekundaer: raw.secondaryMuscles,
    bild_url: raw.images.length > 0 ? `${IMAGE_BASE_URL}${raw.images[0]}` : null,
    met_wert: metForCategory(raw.category),
    created_by: null,
  }
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.')
  }

  const supabase = createClient(url, serviceRoleKey)
  const fixturePath = fileURLToPath(new URL('./free-exercise-db.json', import.meta.url))
  const raw = JSON.parse(readFileSync(fixturePath, 'utf-8')) as RawExercise[]
  const rows = raw.map(toExerciseRow)

  const { error } = await supabase.from('exercises').upsert(rows, { onConflict: 'name' })
  if (error) throw new Error(`import failed: ${error.message}`)

  console.log(`imported ${rows.length} exercises`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run scripts/import-exercises.test.ts`
Expected: PASS, 3 Tests

`import.meta.url === file://${process.argv[1]}` ist beim Testlauf (vitest importiert das Modul, `process.argv[1]` zeigt auf den Testrunner) immer falsch — `main()` läuft nicht mit, kein Netzwerk-/DB-Zugriff im Test.

- [ ] **Step 10: Run the full suite and commit**

Run: `npm test && npm run lint`

```bash
git add src/lib/met-categories.ts src/lib/met-categories.test.ts scripts/free-exercise-db.json scripts/import-exercises.ts scripts/import-exercises.test.ts
git commit -m "feat: add the free-exercise-db import script with category MET values"
```

- [ ] **Step 11: Manual step (Nutzer, nicht Teil dieses Tasks)**

Nach dem Merge einmalig ausführen, mit dem Supabase Service-Role-Key (Projekteinstellungen → API):

```bash
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> VITE_SUPABASE_URL=https://zqliubzvzbnaogqcmypg.supabase.co node scripts/import-exercises.ts
```

---

### Task 3: Übungen suchen und eigene anlegen

**Files:**
- Create: `src/hooks/use-exercises.ts`
- Create: `src/hooks/use-exercises.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `type Exercise = { id, name, kategorie: string | null, equipment: string | null, muskelgruppen_primaer: string[] | null, muskelgruppen_sekundaer: string[] | null, bild_url: string | null, met_wert: number | null, created_by: string | null }`; `useExercises(userId): { exercises, loading, createExercise(input) }`

- [ ] **Step 1: Write the failing test**

`src/hooks/use-exercises.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const exercise = {
  id: 'ex1',
  name: '3/4 Sit-Up',
  kategorie: 'strength',
  equipment: 'body only',
  muskelgruppen_primaer: ['abdominals'],
  muskelgruppen_sekundaer: [],
  bild_url: null,
  met_wert: 5,
  created_by: null,
}

describe('useExercises', () => {
  it('loads all exercises ordered by name', async () => {
    const builder = createQueryBuilder({ data: [exercise] })
    mockFrom.mockReturnValue(builder)

    const { useExercises } = await import('./use-exercises')
    const { result } = renderHook(() => useExercises('u1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.exercises).toEqual([exercise])
    expect(builder.order).toHaveBeenCalledWith('name', { ascending: true })
  })

  it('creates an own exercise and reloads', async () => {
    const builder = createQueryBuilder({ data: [exercise] })
    mockFrom.mockReturnValue(builder)

    const { useExercises } = await import('./use-exercises')
    const { result } = renderHook(() => useExercises('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.createExercise({ name: 'Eigene Übung', kategorie: 'strength', met_wert: 5 })

    expect(builder.insert).toHaveBeenCalledWith({
      created_by: 'u1',
      name: 'Eigene Übung',
      kategorie: 'strength',
      met_wert: 5,
    })
  })

  it('rejects instead of reporting success when creating an exercise fails', async () => {
    const builder = createQueryBuilder({ data: [], error: { message: 'boom' } })
    mockFrom.mockReturnValue(builder)

    const { useExercises } = await import('./use-exercises')
    const { result } = renderHook(() => useExercises('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.createExercise({ name: 'X', kategorie: 'strength', met_wert: 1 })).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/hooks/use-exercises.test.ts`
Expected: FAIL — `Failed to resolve import "./use-exercises"`

- [ ] **Step 3: Write minimal implementation**

`src/hooks/use-exercises.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Exercise = {
  id: string
  name: string
  kategorie: string | null
  equipment: string | null
  muskelgruppen_primaer: string[] | null
  muskelgruppen_sekundaer: string[] | null
  bild_url: string | null
  met_wert: number | null
  created_by: string | null
}

export type NewExercise = {
  name: string
  kategorie: string
  met_wert: number
  equipment?: string
  muskelgruppen_primaer?: string[]
  muskelgruppen_sekundaer?: string[]
}

export function useExercises(userId: string) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const { data } = await supabase.from('exercises').select('*').order('name', { ascending: true })
    setExercises((data ?? []) as Exercise[])
    setLoading(false)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function createExercise(input: NewExercise) {
    const { error } = await supabase.from('exercises').insert({ created_by: userId, ...input })
    if (error) throw new Error('create exercise failed')
    await reload()
  }

  return { exercises, loading, createExercise }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/hooks/use-exercises.test.ts`
Expected: PASS, 3 Tests

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/hooks/use-exercises.ts src/hooks/use-exercises.test.ts
git commit -m "feat: add exercises hook (list and create own)"
```

---

### Task 4: Übungsseite

**Files:**
- Create: `src/pages/ExercisesPage.tsx`
- Create: `src/pages/ExercisesPage.test.tsx`

**Interfaces:**
- Consumes: `useExercises` (Task 3)
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Write the failing test**

`src/pages/ExercisesPage.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseExercises = vi.fn()
vi.mock('../hooks/use-exercises', () => ({ useExercises: (userId: string) => mockUseExercises(userId) }))

afterEach(() => cleanup())

const exercise = {
  id: 'ex1',
  name: 'Bankdrücken',
  kategorie: 'strength',
  equipment: 'barbell',
  muskelgruppen_primaer: ['chest'],
  muskelgruppen_sekundaer: [],
  bild_url: null,
  met_wert: 5,
  created_by: null,
}

function exercisesResult(overrides: Partial<ReturnType<typeof mockUseExercises>> = {}) {
  return { exercises: [exercise], loading: false, createExercise: vi.fn().mockResolvedValue(undefined), ...overrides }
}

describe('ExercisesPage', () => {
  it('lists exercises and filters by name as the user types', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [exercise, { ...exercise, id: 'ex2', name: 'Kniebeuge' }],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    render(<ExercisesPage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.getByText('Kniebeuge')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Bank' } })

    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.queryByText('Kniebeuge')).not.toBeInTheDocument()
  })

  it('creates an own exercise', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = exercisesResult()
    mockUseExercises.mockReturnValue(result)

    const { default: ExercisesPage } = await import('./ExercisesPage')
    render(<ExercisesPage />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: 'Eigene Übung anlegen' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Meine Übung' } })
    fireEvent.change(screen.getByLabelText('Kategorie'), { target: { value: 'strength' } })
    fireEvent.change(screen.getByLabelText('MET-Wert'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(result.createExercise).toHaveBeenCalledWith({
        name: 'Meine Übung',
        kategorie: 'strength',
        met_wert: 4,
      }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/pages/ExercisesPage.test.tsx`
Expected: FAIL — `Failed to resolve import "./ExercisesPage"`

- [ ] **Step 3: Write minimal implementation**

`src/pages/ExercisesPage.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useExercises } from '../hooks/use-exercises'

export default function ExercisesPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Übungen</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <ExercisesList userId={userId} />
}

function ExercisesList({ userId }: { userId: string }) {
  const { exercises, loading, createExercise } = useExercises(userId)
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)

  if (loading) {
    return (
      <div>
        <h1>Übungen</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  const filtered = exercises.filter((exercise) => exercise.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <h1>Übungen</h1>
      <label>
        Suche
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul>
        {filtered.map((exercise) => (
          <li key={exercise.id}>{exercise.name}</li>
        ))}
      </ul>
      {showForm ? (
        <NewExerciseForm
          onSave={async (input) => {
            await createExercise(input)
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button type="button" onClick={() => setShowForm(true)}>
          Eigene Übung anlegen
        </button>
      )}
      <Link to="/training">Zurück zum Training</Link>
    </div>
  )
}

function NewExerciseForm({
  onSave,
  onCancel,
}: {
  onSave: (input: { name: string; kategorie: string; met_wert: number }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [kategorie, setKategorie] = useState('')
  const [metWert, setMetWert] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    // Number('') is 0, not "unset" — an empty MET field must not silently save as 0.
    const met = metWert === '' ? null : Number(metWert)
    if (met === null) return
    await onSave({ name, kategorie, met_wert: met })
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Kategorie
        <input value={kategorie} onChange={(event) => setKategorie(event.target.value)} />
      </label>
      <label>
        MET-Wert
        <input type="number" value={metWert} onChange={(event) => setMetWert(event.target.value)} />
      </label>
      <button type="submit">Speichern</button>
      <button type="button" onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/pages/ExercisesPage.test.tsx`
Expected: PASS, 2 Tests

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/pages/ExercisesPage.tsx src/pages/ExercisesPage.test.tsx
git commit -m "feat: add the exercises search and own-exercise page"
```

---

### Task 5: Trainingspläne — Liste

**Files:**
- Create: `src/hooks/use-workout-plans.ts`
- Create: `src/hooks/use-workout-plans.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `type WorkoutPlan = { id, name, aktiv: boolean }`; `useWorkoutPlans(userId): { plans, loading, createPlan(name), deletePlan(id), activatePlan(id) }`

- [ ] **Step 1: Write the failing test**

`src/hooks/use-workout-plans.test.ts`:

```ts
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
  it('loads the user\'s plans', async () => {
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/hooks/use-workout-plans.test.ts`
Expected: FAIL — `Failed to resolve import "./use-workout-plans"`

- [ ] **Step 3: Write minimal implementation**

`src/hooks/use-workout-plans.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type WorkoutPlan = {
  id: string
  name: string
  aktiv: boolean
}

export function useWorkoutPlans(userId: string) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })
    setPlans((data ?? []) as WorkoutPlan[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  async function createPlan(name: string) {
    const { error } = await supabase.from('workout_plans').insert({ user_id: userId, name, aktiv: false })
    if (error) throw new Error('create plan failed')
    await reload()
  }

  async function deletePlan(planId: string) {
    const { error } = await supabase.from('workout_plans').delete().eq('id', planId)
    if (error) throw new Error('delete plan failed')
    await reload()
  }

  async function activatePlan(planId: string) {
    const { error: deactivateError } = await supabase
      .from('workout_plans')
      .update({ aktiv: false })
      .eq('user_id', userId)
    if (deactivateError) throw new Error('activate plan failed')

    const { error: activateError } = await supabase.from('workout_plans').update({ aktiv: true }).eq('id', planId)
    if (activateError) throw new Error('activate plan failed')

    await reload()
  }

  return { plans, loading, createPlan, deletePlan, activatePlan }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/hooks/use-workout-plans.test.ts`
Expected: PASS, 4 Tests

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/hooks/use-workout-plans.ts src/hooks/use-workout-plans.test.ts
git commit -m "feat: add workout plans hook (list, create, delete, activate)"
```

---

### Task 6: Trainingspläne-Seite

**Files:**
- Create: `src/pages/TrainingPlansPage.tsx`
- Create: `src/pages/TrainingPlansPage.test.tsx`

**Interfaces:**
- Consumes: `useWorkoutPlans` (Task 5)
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Write the failing test**

`src/pages/TrainingPlansPage.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseWorkoutPlans = vi.fn()
vi.mock('../hooks/use-workout-plans', () => ({ useWorkoutPlans: (userId: string) => mockUseWorkoutPlans(userId) }))

afterEach(() => cleanup())

function plansResult(overrides: Partial<ReturnType<typeof mockUseWorkoutPlans>> = {}) {
  return {
    plans: [{ id: 'p1', name: 'Ganzkörper', aktiv: true }],
    loading: false,
    createPlan: vi.fn().mockResolvedValue(undefined),
    deletePlan: vi.fn().mockResolvedValue(undefined),
    activatePlan: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('TrainingPlansPage', () => {
  it('lists plans with a link to edit and an active marker', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlans.mockReturnValue(plansResult())

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    render(<TrainingPlansPage />, { wrapper: MemoryRouter })

    expect(screen.getByRole('link', { name: /Ganzkörper/ })).toHaveAttribute('href', '/training/plans/p1')
    expect(screen.getByText(/aktiv/i)).toBeInTheDocument()
  })

  it('creates a new plan', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = plansResult()
    mockUseWorkoutPlans.mockReturnValue(result)

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    render(<TrainingPlansPage />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Neuer Plan'), { target: { value: 'Push/Pull/Legs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }))

    await waitFor(() => expect(result.createPlan).toHaveBeenCalledWith('Push/Pull/Legs'))
  })

  it('activates and deletes a plan', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = plansResult({
      plans: [{ id: 'p1', name: 'Ganzkörper', aktiv: false }],
    })
    mockUseWorkoutPlans.mockReturnValue(result)

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    render(<TrainingPlansPage />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: 'Aktivieren' }))
    await waitFor(() => expect(result.activatePlan).toHaveBeenCalledWith('p1'))

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    await waitFor(() => expect(result.deletePlan).toHaveBeenCalledWith('p1'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/pages/TrainingPlansPage.test.tsx`
Expected: FAIL — `Failed to resolve import "./TrainingPlansPage"`

- [ ] **Step 3: Write minimal implementation**

`src/pages/TrainingPlansPage.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutPlans } from '../hooks/use-workout-plans'

export default function TrainingPlansPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Meine Pläne</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <PlansList userId={userId} />
}

function PlansList({ userId }: { userId: string }) {
  const { plans, loading, createPlan, deletePlan, activatePlan } = useWorkoutPlans(userId)
  const [name, setName] = useState('')

  if (loading) {
    return (
      <div>
        <h1>Meine Pläne</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Meine Pläne</h1>
      <ul>
        {plans.map((plan) => (
          <li key={plan.id}>
            <Link to={`/training/plans/${plan.id}`}>{plan.name}</Link>
            {plan.aktiv && <span>aktiv</span>}
            {!plan.aktiv && (
              <button type="button" onClick={() => activatePlan(plan.id)}>
                Aktivieren
              </button>
            )}
            <button type="button" onClick={() => deletePlan(plan.id)}>
              Löschen
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          await createPlan(name)
          setName('')
        }}
      >
        <label>
          Neuer Plan
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit">Anlegen</button>
      </form>
      <Link to="/training">Zurück zum Training</Link>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/pages/TrainingPlansPage.test.tsx`
Expected: PASS, 3 Tests

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/pages/TrainingPlansPage.tsx src/pages/TrainingPlansPage.test.tsx
git commit -m "feat: add the training plans list page"
```

---

### Task 7: Rotationslogik

**Files:**
- Create: `src/lib/next-training-day.ts`
- Create: `src/lib/next-training-day.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `type PlanDay = { id: string; reihenfolge: number }`; `nextTrainingDay(days: PlanDay[], lastCompletedDayId: string | null): PlanDay | null`

- [ ] **Step 1: Write the failing test**

`src/lib/next-training-day.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { nextTrainingDay } from './next-training-day'

const dayA = { id: 'a', reihenfolge: 1 }
const dayB = { id: 'b', reihenfolge: 2 }
const dayC = { id: 'c', reihenfolge: 3 }

describe('nextTrainingDay', () => {
  it('returns the first day when there is no previous session', () => {
    expect(nextTrainingDay([dayA, dayB, dayC], null)).toEqual(dayA)
  })

  it('returns the day after the last completed one', () => {
    expect(nextTrainingDay([dayA, dayB, dayC], 'a')).toEqual(dayB)
  })

  it('wraps around from the last day back to the first', () => {
    expect(nextTrainingDay([dayA, dayB, dayC], 'c')).toEqual(dayA)
  })

  it('falls back to the first day when the last completed day no longer exists', () => {
    expect(nextTrainingDay([dayA, dayB], 'deleted-day')).toEqual(dayA)
  })

  it('is independent of the order the days are passed in', () => {
    expect(nextTrainingDay([dayC, dayA, dayB], 'a')).toEqual(dayB)
  })

  it('returns null when the plan has no days', () => {
    expect(nextTrainingDay([], null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/lib/next-training-day.test.ts`
Expected: FAIL — `Failed to resolve import "./next-training-day"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/next-training-day.ts`:

```ts
export type PlanDay = { id: string; reihenfolge: number }

/**
 * No calendar backs this — the day after the one last completed for this
 * plan is the only signal available, so a missing or deleted last day
 * restarts the rotation at the first day rather than guessing.
 */
export function nextTrainingDay(days: PlanDay[], lastCompletedDayId: string | null): PlanDay | null {
  if (days.length === 0) return null

  const sorted = [...days].sort((a, b) => a.reihenfolge - b.reihenfolge)
  if (lastCompletedDayId === null) return sorted[0]

  const index = sorted.findIndex((day) => day.id === lastCompletedDayId)
  if (index === -1) return sorted[0]

  return sorted[(index + 1) % sorted.length]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/lib/next-training-day.test.ts`
Expected: PASS, 6 Tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/next-training-day.ts src/lib/next-training-day.test.ts
git commit -m "feat: add the training-day rotation logic"
```

---

### Task 8: Plan-Editor (Tage und Übungen)

**Files:**
- Modify: `src/hooks/use-workout-plans.ts`
- Modify: `src/hooks/use-workout-plans.test.ts`
- Create: `src/pages/TrainingPlanEditPage.tsx`
- Create: `src/pages/TrainingPlanEditPage.test.tsx`

**Interfaces:**
- Consumes: `useExercises` (Task 3)
- Produces: `type WorkoutPlanDayExercise = { id, exercise_id, reihenfolge, ziel_saetze: number | null, ziel_wiederholungen: number | null, pausenzeit_sekunden: number | null, exercise: { id, name } | null }`; `type WorkoutPlanDay = { id, name, reihenfolge, exercises: WorkoutPlanDayExercise[] }`; `useWorkoutPlan(planId): { plan, days, loading, renamePlan(name), addDay(name), renameDay(dayId, name), deleteDay(dayId), moveDay(dayId, direction), addExerciseToDay(dayId, exerciseId), updateDayExercise(id, patch), removeDayExercise(id), moveDayExercise(dayId, exerciseRowId, direction) }`

- [ ] **Step 1: Write the failing test for the hook extension**

In `src/hooks/use-workout-plans.test.ts` ergänzen:

```ts
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/hooks/use-workout-plans.test.ts`
Expected: FAIL — `useWorkoutPlan is not a function`

- [ ] **Step 3: Extend the hook**

In `src/hooks/use-workout-plans.ts` ergänzen:

```ts
export type WorkoutPlanDayExercise = {
  id: string
  exercise_id: string
  reihenfolge: number
  ziel_saetze: number | null
  ziel_wiederholungen: number | null
  pausenzeit_sekunden: number | null
  exercise: { id: string; name: string } | null
}

export type WorkoutPlanDay = {
  id: string
  name: string
  reihenfolge: number
  exercises: WorkoutPlanDayExercise[]
}

type RawDayExercise = {
  id: string
  exercise_id: string
  reihenfolge: number
  ziel_saetze: number | null
  ziel_wiederholungen: number | null
  pausenzeit_sekunden: number | null
  exercises: { id: string; name: string } | null
}

export function useWorkoutPlan(planId: string) {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [days, setDays] = useState<WorkoutPlanDay[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const { data: planData } = await supabase.from('workout_plans').select('*').eq('id', planId).single()
    const { data: dayRows } = await supabase
      .from('workout_plan_days')
      .select('*')
      .eq('workout_plan_id', planId)
      .order('reihenfolge', { ascending: true })
    const { data: exerciseRows } = await supabase
      .from('workout_plan_day_exercises')
      .select('id, workout_plan_day_id, exercise_id, reihenfolge, ziel_saetze, ziel_wiederholungen, pausenzeit_sekunden, exercises(id, name)')
      .order('reihenfolge', { ascending: true })

    const rawDays = (dayRows ?? []) as { id: string; name: string; reihenfolge: number }[]
    const rawExercises = (exerciseRows ?? []) as (RawDayExercise & { workout_plan_day_id: string })[]

    setPlan(planData as WorkoutPlan)
    setDays(
      rawDays.map((day) => ({
        id: day.id,
        name: day.name,
        reihenfolge: day.reihenfolge,
        exercises: rawExercises
          .filter((row) => row.workout_plan_day_id === day.id)
          .map((row) => ({
            id: row.id,
            exercise_id: row.exercise_id,
            reihenfolge: row.reihenfolge,
            ziel_saetze: row.ziel_saetze,
            ziel_wiederholungen: row.ziel_wiederholungen,
            pausenzeit_sekunden: row.pausenzeit_sekunden,
            exercise: row.exercises,
          })),
      })),
    )
    setLoading(false)
  }, [planId])

  useEffect(() => {
    reload()
  }, [reload])

  async function renamePlan(name: string) {
    const { error } = await supabase.from('workout_plans').update({ name }).eq('id', planId)
    if (error) throw new Error('rename plan failed')
    await reload()
  }

  async function addDay(name: string) {
    const nextReihenfolge = days.length === 0 ? 1 : Math.max(...days.map((day) => day.reihenfolge)) + 1
    const { error } = await supabase
      .from('workout_plan_days')
      .insert({ workout_plan_id: planId, name, reihenfolge: nextReihenfolge })
    if (error) throw new Error('add day failed')
    await reload()
  }

  async function renameDay(dayId: string, name: string) {
    const { error } = await supabase.from('workout_plan_days').update({ name }).eq('id', dayId)
    if (error) throw new Error('rename day failed')
    await reload()
  }

  async function deleteDay(dayId: string) {
    const { error } = await supabase.from('workout_plan_days').delete().eq('id', dayId)
    if (error) throw new Error('delete day failed')
    await reload()
  }

  async function moveDay(dayId: string, direction: 'up' | 'down') {
    const sorted = [...days].sort((a, b) => a.reihenfolge - b.reihenfolge)
    const index = sorted.findIndex((day) => day.id === dayId)
    const neighborIndex = direction === 'up' ? index - 1 : index + 1
    if (index === -1 || neighborIndex < 0 || neighborIndex >= sorted.length) return

    const current = sorted[index]
    const neighbor = sorted[neighborIndex]
    const { error: firstError } = await supabase
      .from('workout_plan_days')
      .update({ reihenfolge: neighbor.reihenfolge })
      .eq('id', current.id)
    if (firstError) throw new Error('move day failed')
    const { error: secondError } = await supabase
      .from('workout_plan_days')
      .update({ reihenfolge: current.reihenfolge })
      .eq('id', neighbor.id)
    if (secondError) throw new Error('move day failed')
    await reload()
  }

  async function addExerciseToDay(dayId: string, exerciseId: string) {
    const day = days.find((day) => day.id === dayId)
    const nextReihenfolge = !day || day.exercises.length === 0 ? 1 : Math.max(...day.exercises.map((e) => e.reihenfolge)) + 1
    const { error } = await supabase
      .from('workout_plan_day_exercises')
      .insert({ workout_plan_day_id: dayId, exercise_id: exerciseId, reihenfolge: nextReihenfolge })
    if (error) throw new Error('add exercise failed')
    await reload()
  }

  async function updateDayExercise(
    id: string,
    patch: Partial<Pick<WorkoutPlanDayExercise, 'ziel_saetze' | 'ziel_wiederholungen' | 'pausenzeit_sekunden'>>,
  ) {
    const { error } = await supabase.from('workout_plan_day_exercises').update(patch).eq('id', id)
    if (error) throw new Error('update exercise failed')
    await reload()
  }

  async function removeDayExercise(id: string) {
    const { error } = await supabase.from('workout_plan_day_exercises').delete().eq('id', id)
    if (error) throw new Error('remove exercise failed')
    await reload()
  }

  async function moveDayExercise(dayId: string, exerciseRowId: string, direction: 'up' | 'down') {
    const day = days.find((day) => day.id === dayId)
    if (!day) return
    const sorted = [...day.exercises].sort((a, b) => a.reihenfolge - b.reihenfolge)
    const index = sorted.findIndex((row) => row.id === exerciseRowId)
    const neighborIndex = direction === 'up' ? index - 1 : index + 1
    if (index === -1 || neighborIndex < 0 || neighborIndex >= sorted.length) return

    const current = sorted[index]
    const neighbor = sorted[neighborIndex]
    const { error: firstError } = await supabase
      .from('workout_plan_day_exercises')
      .update({ reihenfolge: neighbor.reihenfolge })
      .eq('id', current.id)
    if (firstError) throw new Error('move exercise failed')
    const { error: secondError } = await supabase
      .from('workout_plan_day_exercises')
      .update({ reihenfolge: current.reihenfolge })
      .eq('id', neighbor.id)
    if (secondError) throw new Error('move exercise failed')
    await reload()
  }

  return {
    plan,
    days,
    loading,
    renamePlan,
    addDay,
    renameDay,
    deleteDay,
    moveDay,
    addExerciseToDay,
    updateDayExercise,
    removeDayExercise,
    moveDayExercise,
  }
}
```

Der Alias `exercises(id, name)` in der Select-Liste heißt `exercises`, weil das der Tabellenname ist, auf den `exercise_id` verweist — Supabase/postgrest-js benennt eingebettete Relationen nach der referenzierten Tabelle, nicht nach der Fremdschlüssel-Spalte.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/hooks/use-workout-plans.test.ts`
Expected: PASS, 8 Tests

- [ ] **Step 5: Write the failing test for the edit page**

`src/pages/TrainingPlanEditPage.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockUseWorkoutPlan = vi.fn()
vi.mock('../hooks/use-workout-plans', () => ({ useWorkoutPlan: (planId: string) => mockUseWorkoutPlan(planId) }))

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseExercises = vi.fn()
vi.mock('../hooks/use-exercises', () => ({ useExercises: (userId: string) => mockUseExercises(userId) }))

afterEach(() => cleanup())

const exercise = { id: 'ex1', name: 'Bankdrücken' }

function planResult(overrides: Partial<ReturnType<typeof mockUseWorkoutPlan>> = {}) {
  return {
    plan: { id: 'p1', name: 'Ganzkörper', aktiv: false },
    days: [
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
            exercise,
          },
        ],
      },
    ],
    loading: false,
    renamePlan: vi.fn().mockResolvedValue(undefined),
    addDay: vi.fn().mockResolvedValue(undefined),
    renameDay: vi.fn().mockResolvedValue(undefined),
    deleteDay: vi.fn().mockResolvedValue(undefined),
    moveDay: vi.fn().mockResolvedValue(undefined),
    addExerciseToDay: vi.fn().mockResolvedValue(undefined),
    updateDayExercise: vi.fn().mockResolvedValue(undefined),
    removeDayExercise: vi.fn().mockResolvedValue(undefined),
    moveDayExercise: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/training/plans/p1']}>
      <Routes>
        <Route path="/training/plans/:planId" element={<PageUnderTest />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function PageUnderTest() {
  const { default: TrainingPlanEditPage } = await import('./TrainingPlanEditPage')
  return <TrainingPlanEditPage />
}

describe('TrainingPlanEditPage', () => {
  it('shows the day with its exercise and target values', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlan.mockReturnValue(planResult())
    mockUseExercises.mockReturnValue({ exercises: [exercise], loading: false, createExercise: vi.fn() })

    renderPage()

    expect(await screen.findByText('Tag A')).toBeInTheDocument()
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
  })

  it('adds a new day', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({ exercises: [exercise], loading: false, createExercise: vi.fn() })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.change(screen.getByLabelText('Neuer Tag'), { target: { value: 'Tag B' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tag hinzufügen' }))

    await waitFor(() => expect(result.addDay).toHaveBeenCalledWith('Tag B'))
  })

  it('adds an exercise to a day via inline search', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({
      exercises: [exercise, { id: 'ex2', name: 'Kniebeuge' }],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.change(screen.getByLabelText('Übung suchen'), { target: { value: 'Kniebeuge' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kniebeuge hinzufügen' }))

    await waitFor(() => expect(result.addExerciseToDay).toHaveBeenCalledWith('d1', 'ex2'))
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run --dir src src/pages/TrainingPlanEditPage.test.tsx`
Expected: FAIL — `Failed to resolve import "./TrainingPlanEditPage"`

- [ ] **Step 7: Write minimal implementation**

`src/pages/TrainingPlanEditPage.tsx`:

```tsx
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutPlan, type WorkoutPlanDay } from '../hooks/use-workout-plans'
import { useExercises } from '../hooks/use-exercises'

export default function TrainingPlanEditPage() {
  const { session } = useSession()
  const { planId } = useParams<{ planId: string }>()
  const userId = session?.user.id

  if (!userId || !planId) {
    return (
      <div>
        <h1>Plan bearbeiten</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <PlanEditor userId={userId} planId={planId} />
}

function PlanEditor({ userId, planId }: { userId: string; planId: string }) {
  const {
    plan,
    days,
    loading,
    addDay,
    moveDay,
    addExerciseToDay,
    updateDayExercise,
    removeDayExercise,
    moveDayExercise,
  } = useWorkoutPlan(planId)
  const { exercises } = useExercises(userId)
  const [newDayName, setNewDayName] = useState('')

  if (loading || !plan) {
    return (
      <div>
        <h1>Plan bearbeiten</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return (
    <div>
      <h1>{plan.name}</h1>
      {days.map((day, index) => (
        <DayBlock
          key={day.id}
          day={day}
          exercises={exercises}
          canMoveUp={index > 0}
          canMoveDown={index < days.length - 1}
          onMoveDay={(direction) => moveDay(day.id, direction)}
          onAddExercise={(exerciseId) => addExerciseToDay(day.id, exerciseId)}
          onUpdateExercise={updateDayExercise}
          onRemoveExercise={removeDayExercise}
          onMoveExercise={(exerciseRowId, direction) => moveDayExercise(day.id, exerciseRowId, direction)}
        />
      ))}
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          await addDay(newDayName)
          setNewDayName('')
        }}
      >
        <label>
          Neuer Tag
          <input value={newDayName} onChange={(event) => setNewDayName(event.target.value)} />
        </label>
        <button type="submit">Tag hinzufügen</button>
      </form>
      <Link to="/training/plans">Zurück zu meinen Plänen</Link>
    </div>
  )
}

function DayBlock({
  day,
  exercises,
  canMoveUp,
  canMoveDown,
  onMoveDay,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
  onMoveExercise,
}: {
  day: WorkoutPlanDay
  exercises: { id: string; name: string }[]
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveDay: (direction: 'up' | 'down') => void
  onAddExercise: (exerciseId: string) => void
  onUpdateExercise: (
    id: string,
    patch: Partial<{ ziel_saetze: number | null; ziel_wiederholungen: number | null; pausenzeit_sekunden: number | null }>,
  ) => void
  onRemoveExercise: (id: string) => void
  onMoveExercise: (exerciseRowId: string, direction: 'up' | 'down') => void
}) {
  const [query, setQuery] = useState('')
  const matches = query === '' ? [] : exercises.filter((exercise) => exercise.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <section>
      <h2>{day.name}</h2>
      {canMoveUp && (
        <button type="button" onClick={() => onMoveDay('up')}>
          Tag nach oben
        </button>
      )}
      {canMoveDown && (
        <button type="button" onClick={() => onMoveDay('down')}>
          Tag nach unten
        </button>
      )}
      <ul>
        {day.exercises.map((row, index) => (
          <li key={row.id}>
            {row.exercise?.name}
            <label>
              Sätze
              <input
                type="number"
                value={row.ziel_saetze ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  onUpdateExercise(row.id, { ziel_saetze: value === '' ? null : Number(value) })
                }}
              />
            </label>
            <label>
              Wiederholungen
              <input
                type="number"
                value={row.ziel_wiederholungen ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  onUpdateExercise(row.id, { ziel_wiederholungen: value === '' ? null : Number(value) })
                }}
              />
            </label>
            <label>
              Pause (Sekunden)
              <input
                type="number"
                value={row.pausenzeit_sekunden ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  onUpdateExercise(row.id, { pausenzeit_sekunden: value === '' ? null : Number(value) })
                }}
              />
            </label>
            {index > 0 && (
              <button type="button" onClick={() => onMoveExercise(row.id, 'up')}>
                Nach oben
              </button>
            )}
            {index < day.exercises.length - 1 && (
              <button type="button" onClick={() => onMoveExercise(row.id, 'down')}>
                Nach unten
              </button>
            )}
            <button type="button" onClick={() => onRemoveExercise(row.id)}>
              Entfernen
            </button>
          </li>
        ))}
      </ul>
      <label>
        Übung suchen
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul>
        {matches.map((exercise) => (
          <li key={exercise.id}>
            {exercise.name}
            <button
              type="button"
              onClick={() => {
                onAddExercise(exercise.id)
                setQuery('')
              }}
            >
              {`${exercise.name} hinzufügen`}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run --dir src src/pages/TrainingPlanEditPage.test.tsx`
Expected: PASS, 3 Tests

- [ ] **Step 9: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/hooks/use-workout-plans.ts src/hooks/use-workout-plans.test.ts src/pages/TrainingPlanEditPage.tsx src/pages/TrainingPlanEditPage.test.tsx
git commit -m "feat: add the plan editor (days, exercises, reordering)"
```

---

### Task 9: Kalorienberechnung

**Files:**
- Create: `src/lib/workout-calories.ts`
- Create: `src/lib/workout-calories.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `sessionKalorien(sets: { exercise: { met_wert: number } }[], gewichtKg: number, dauerStunden: number): number`

- [ ] **Step 1: Write the failing test**

`src/lib/workout-calories.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sessionKalorien } from './workout-calories'

describe('sessionKalorien', () => {
  it('multiplies the average MET across all sets by weight and duration', () => {
    const sets = [{ exercise: { met_wert: 5 } }, { exercise: { met_wert: 5 } }]
    // avg MET 5 × 80 kg × 1 h = 400
    expect(sessionKalorien(sets, 80, 1)).toBe(400)
  })

  it('weighs an exercise with more sets more heavily in the average', () => {
    const sets = [
      { exercise: { met_wert: 5 } },
      { exercise: { met_wert: 5 } },
      { exercise: { met_wert: 5 } },
      { exercise: { met_wert: 8 } },
    ]
    // avg MET (5+5+5+8)/4 = 5.75 × 80 kg × 1 h = 460
    expect(sessionKalorien(sets, 80, 1)).toBe(460)
  })

  it('returns 0 for an empty set list instead of failing', () => {
    expect(sessionKalorien([], 80, 1)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/lib/workout-calories.test.ts`
Expected: FAIL — `Failed to resolve import "./workout-calories"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/workout-calories.ts`:

```ts
/**
 * MET × Körpergewicht(kg) × Dauer(h), gemittelt über die MET-Werte aller
 * abgeschlossenen Sätze — eine Übung mit mehr Sätzen wiegt entsprechend
 * stärker, ohne eine eigene Gewichtungslogik zu brauchen.
 */
export function sessionKalorien(sets: { exercise: { met_wert: number } }[], gewichtKg: number, dauerStunden: number): number {
  if (sets.length === 0) return 0
  const metDurchschnitt = sets.reduce((sum, set) => sum + set.exercise.met_wert, 0) / sets.length
  return metDurchschnitt * gewichtKg * dauerStunden
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/lib/workout-calories.test.ts`
Expected: PASS, 3 Tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/workout-calories.ts src/lib/workout-calories.test.ts
git commit -m "feat: add MET-based session calorie calculation"
```

---

### Task 10: Live-Session — Hook

**Files:**
- Create: `src/hooks/use-workout-session.ts`
- Create: `src/hooks/use-workout-session.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `type SessionSet = { id, exercise_id, satz_nummer, gewicht: number | null, wiederholungen: number | null, abgeschlossen_am: string | null, exercise: { id, name, met_wert: number | null } | null }`; `type SessionExercise = { exercise_id, name, ziel_saetze: number | null, ziel_wiederholungen: number | null, pausenzeit_sekunden: number | null, reihenfolge: number }`; `startWorkoutSession(userId, dayId): Promise<string>`; `useWorkoutSession(sessionId): { session, exercises, sets, loading, logSet(exerciseId, satzNummer, gewicht, wiederholungen), updateSet(setId, patch), completeSession(gewichtKg), deleteSession() }`

- [ ] **Step 1: Write the failing test**

`src/hooks/use-workout-session.test.ts`:

```ts
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
})

describe('useWorkoutSession', () => {
  it('loads the session, its plan exercises, and its sets', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_sessions') return createQueryBuilder({ data: sessionRow })
      if (table === 'workout_plan_day_exercises') return createQueryBuilder({ data: [dayExerciseRow] })
      if (table === 'workout_session_sets') return createQueryBuilder({ data: [setRow] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toEqual(sessionRow)
    expect(result.current.exercises).toEqual([
      { exercise_id: 'ex1', name: 'Bankdrücken', ziel_saetze: 3, ziel_wiederholungen: 10, pausenzeit_sekunden: 90, reihenfolge: 1 },
    ])
    expect(result.current.sets).toEqual([
      { id: 'set1', exercise_id: 'ex1', satz_nummer: 1, gewicht: 60, wiederholungen: 10, abgeschlossen_am: '2026-08-21T10:05:00.000Z', exercise: { id: 'ex1', name: 'Bankdrücken', met_wert: 5 } },
    ])
  })

  it('logs a set immediately', async () => {
    const setsBuilder = createQueryBuilder({ data: [setRow] })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_sessions') return createQueryBuilder({ data: sessionRow })
      if (table === 'workout_plan_day_exercises') return createQueryBuilder({ data: [dayExerciseRow] })
      if (table === 'workout_session_sets') return setsBuilder
      throw new Error(`unexpected table ${table}`)
    })

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

  it('completes the session with the given calories', async () => {
    const sessionBuilder = createQueryBuilder({ data: sessionRow })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_sessions') return sessionBuilder
      if (table === 'workout_plan_day_exercises') return createQueryBuilder({ data: [dayExerciseRow] })
      if (table === 'workout_session_sets') return createQueryBuilder({ data: [setRow] })
      throw new Error(`unexpected table ${table}`)
    })

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
    mockFrom.mockImplementation((table: string) => {
      if (table === 'workout_sessions') return sessionBuilder
      if (table === 'workout_plan_day_exercises') return createQueryBuilder({ data: [dayExerciseRow] })
      if (table === 'workout_session_sets') return createQueryBuilder({ data: [setRow] })
      throw new Error(`unexpected table ${table}`)
    })

    const { useWorkoutSession } = await import('./use-workout-session')
    const { result } = renderHook(() => useWorkoutSession('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.deleteSession()

    expect(sessionBuilder.delete).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/hooks/use-workout-session.test.ts`
Expected: FAIL — `Failed to resolve import "./use-workout-session"`

- [ ] **Step 3: Write minimal implementation**

`src/hooks/use-workout-session.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sessionKalorien } from '../lib/workout-calories'

export type SessionInfo = {
  id: string
  workout_plan_day_id: string | null
  gestartet_am: string
  beendet_am: string | null
  gesamt_kalorien: number | null
}

export type SessionExercise = {
  exercise_id: string
  name: string
  ziel_saetze: number | null
  ziel_wiederholungen: number | null
  pausenzeit_sekunden: number | null
  reihenfolge: number
}

export type SessionSet = {
  id: string
  exercise_id: string
  satz_nummer: number
  gewicht: number | null
  wiederholungen: number | null
  abgeschlossen_am: string | null
  exercise: { id: string; name: string; met_wert: number | null } | null
}

export async function startWorkoutSession(userId: string, dayId: string): Promise<string> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: userId, workout_plan_day_id: dayId, gestartet_am: new Date().toISOString() })
    .select('id')
    .single()
  if (error || !data) throw new Error('start session failed')
  return (data as { id: string }).id
}

export function useWorkoutSession(sessionId: string) {
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [sets, setSets] = useState<SessionSet[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const { data: sessionData } = await supabase.from('workout_sessions').select('*').eq('id', sessionId).single()
    const dayId = (sessionData as SessionInfo | null)?.workout_plan_day_id ?? null

    const { data: exerciseRows } = dayId
      ? await supabase
          .from('workout_plan_day_exercises')
          .select('exercise_id, reihenfolge, ziel_saetze, ziel_wiederholungen, pausenzeit_sekunden, exercises(id, name)')
          .eq('workout_plan_day_id', dayId)
          .order('reihenfolge', { ascending: true })
      : { data: [] }

    const { data: setRows } = await supabase
      .from('workout_session_sets')
      .select('id, exercise_id, satz_nummer, gewicht, wiederholungen, abgeschlossen_am, exercises(id, name, met_wert)')
      .eq('workout_session_id', sessionId)
      .order('abgeschlossen_am', { ascending: true })

    setSession(sessionData as SessionInfo)
    setExercises(
      ((exerciseRows ?? []) as { exercise_id: string; reihenfolge: number; ziel_saetze: number | null; ziel_wiederholungen: number | null; pausenzeit_sekunden: number | null; exercises: { name: string } | null }[]).map(
        (row) => ({
          exercise_id: row.exercise_id,
          name: row.exercises?.name ?? '',
          ziel_saetze: row.ziel_saetze,
          ziel_wiederholungen: row.ziel_wiederholungen,
          pausenzeit_sekunden: row.pausenzeit_sekunden,
          reihenfolge: row.reihenfolge,
        }),
      ),
    )
    setSets(
      ((setRows ?? []) as (Omit<SessionSet, 'exercise'> & { exercises: SessionSet['exercise'] })[]).map((row) => ({
        id: row.id,
        exercise_id: row.exercise_id,
        satz_nummer: row.satz_nummer,
        gewicht: row.gewicht,
        wiederholungen: row.wiederholungen,
        abgeschlossen_am: row.abgeschlossen_am,
        exercise: row.exercises,
      })),
    )
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    reload()
  }, [reload])

  async function logSet(exerciseId: string, satzNummer: number, gewicht: number | null, wiederholungen: number | null) {
    const { error } = await supabase.from('workout_session_sets').insert({
      workout_session_id: sessionId,
      exercise_id: exerciseId,
      satz_nummer: satzNummer,
      gewicht,
      wiederholungen,
      abgeschlossen_am: new Date().toISOString(),
    })
    if (error) throw new Error('log set failed')
    await reload()
  }

  async function updateSet(setId: string, patch: Partial<Pick<SessionSet, 'gewicht' | 'wiederholungen'>>) {
    const { error } = await supabase.from('workout_session_sets').update(patch).eq('id', setId)
    if (error) throw new Error('update set failed')
    await reload()
  }

  async function completeSession(gewichtKg: number) {
    const beendetAm = new Date().toISOString()
    const dauerStunden =
      (new Date(beendetAm).getTime() - new Date(session?.gestartet_am ?? beendetAm).getTime()) / 1000 / 60 / 60
    const kalorienSets = sets
      .filter((set) => set.exercise?.met_wert != null)
      .map((set) => ({ exercise: { met_wert: set.exercise!.met_wert as number } }))
    const gesamtKalorien = sessionKalorien(kalorienSets, gewichtKg, dauerStunden)

    const { error } = await supabase
      .from('workout_sessions')
      .update({ beendet_am: beendetAm, gesamt_kalorien: gesamtKalorien })
      .eq('id', sessionId)
    if (error) throw new Error('complete session failed')
    await reload()
  }

  async function deleteSession() {
    const { error } = await supabase.from('workout_sessions').delete().eq('id', sessionId)
    if (error) throw new Error('delete session failed')
  }

  return { session, exercises, sets, loading, logSet, updateSet, completeSession, deleteSession }
}
```

`completeSession` importiert `sessionKalorien` aus Task 9 — die Datei `src/lib/workout-calories.ts` existiert an dieser Stelle bereits.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/hooks/use-workout-session.test.ts`
Expected: PASS, 5 Tests

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/hooks/use-workout-session.ts src/hooks/use-workout-session.test.ts
git commit -m "feat: add the workout session hook (start, log sets, complete, delete)"
```

---

### Task 11: Trainingshistorie — Hook und Liste

**Files:**
- Create: `src/hooks/use-workout-history.ts`
- Create: `src/hooks/use-workout-history.test.ts`
- Create: `src/pages/TrainingHistoryPage.tsx`
- Create: `src/pages/TrainingHistoryPage.test.tsx`

**Interfaces:**
- Consumes: nichts
- Produces: `type SessionSummary = { id, gestartet_am, beendet_am: string | null, gesamt_kalorien: number | null, tag_name: string | null, plan_name: string | null }`; `useWorkoutHistory(userId): { sessions, loading }`

- [ ] **Step 1: Write the failing test for the hook**

`src/hooks/use-workout-history.test.ts`:

```ts
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
    mockFrom.mockReturnValue(createQueryBuilder({ data: [row] }))

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
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/hooks/use-workout-history.test.ts`
Expected: FAIL — `Failed to resolve import "./use-workout-history"`

- [ ] **Step 3: Write minimal implementation**

`src/hooks/use-workout-history.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type SessionSummary = {
  id: string
  gestartet_am: string
  beendet_am: string | null
  gesamt_kalorien: number | null
  tag_name: string | null
  plan_name: string | null
}

type RawRow = {
  id: string
  gestartet_am: string
  beendet_am: string | null
  gesamt_kalorien: number | null
  workout_plan_days: { name: string; workout_plans: { name: string } | null } | null
}

export function useWorkoutHistory(userId: string) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('workout_sessions')
      .select('id, gestartet_am, beendet_am, gesamt_kalorien, workout_plan_days(name, workout_plans(name))')
      .eq('user_id', userId)
      .order('gestartet_am', { ascending: false })

    setSessions(
      ((data ?? []) as RawRow[]).map((row) => ({
        id: row.id,
        gestartet_am: row.gestartet_am,
        beendet_am: row.beendet_am,
        gesamt_kalorien: row.gesamt_kalorien,
        tag_name: row.workout_plan_days?.name ?? null,
        plan_name: row.workout_plan_days?.workout_plans?.name ?? null,
      })),
    )
    setLoading(false)
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  return { sessions, loading }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/hooks/use-workout-history.test.ts`
Expected: PASS, 1 Test

- [ ] **Step 5: Write the failing test for the list page**

`src/pages/TrainingHistoryPage.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseWorkoutHistory = vi.fn()
vi.mock('../hooks/use-workout-history', () => ({
  useWorkoutHistory: (userId: string) => mockUseWorkoutHistory(userId),
}))

afterEach(() => cleanup())

describe('TrainingHistoryPage', () => {
  it('lists past sessions newest first with a link to each detail page', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutHistory.mockReturnValue({
      sessions: [
        {
          id: 's1',
          gestartet_am: '2026-08-20T10:00:00.000Z',
          beendet_am: '2026-08-20T11:00:00.000Z',
          gesamt_kalorien: 400,
          tag_name: 'Tag A',
          plan_name: 'Ganzkörper',
        },
      ],
      loading: false,
    })

    const { default: TrainingHistoryPage } = await import('./TrainingHistoryPage')
    render(<TrainingHistoryPage />, { wrapper: MemoryRouter })

    const link = screen.getByRole('link', { name: /Ganzkörper.*Tag A/ })
    expect(link).toHaveAttribute('href', '/training/history/s1')
    expect(link).toHaveTextContent('400 kcal')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run --dir src src/pages/TrainingHistoryPage.test.tsx`
Expected: FAIL — `Failed to resolve import "./TrainingHistoryPage"`

- [ ] **Step 7: Write minimal implementation**

`src/pages/TrainingHistoryPage.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useWorkoutHistory } from '../hooks/use-workout-history'

export default function TrainingHistoryPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Trainingshistorie</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <HistoryList userId={userId} />
}

function HistoryList({ userId }: { userId: string }) {
  const { sessions, loading } = useWorkoutHistory(userId)

  if (loading) {
    return (
      <div>
        <h1>Trainingshistorie</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Trainingshistorie</h1>
      <ul>
        {sessions.map((session) => (
          <li key={session.id}>
            <Link to={`/training/history/${session.id}`}>
              {`${session.plan_name ?? '—'} – ${session.tag_name ?? '—'} – ${new Date(session.gestartet_am).toLocaleDateString('de-DE')} – ${Math.round(session.gesamt_kalorien ?? 0)} kcal`}
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/training">Zurück zum Training</Link>
    </div>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run --dir src src/pages/TrainingHistoryPage.test.tsx`
Expected: PASS, 1 Test

- [ ] **Step 9: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/hooks/use-workout-history.ts src/hooks/use-workout-history.test.ts src/pages/TrainingHistoryPage.tsx src/pages/TrainingHistoryPage.test.tsx
git commit -m "feat: add training history hook and list page"
```

---

### Task 12: Trainings-Dashboard

**Files:**
- Modify: `src/pages/TrainingPage.tsx`
- Create: `src/pages/TrainingPage.test.tsx`
- Create: `src/hooks/use-active-training-day.ts`
- Create: `src/hooks/use-active-training-day.test.ts`

**Interfaces:**
- Consumes: `useWorkoutPlans` (Task 5), `nextTrainingDay` (Task 7), `startWorkoutSession` (Task 10)
- Produces: `useActiveTrainingDay(userId): { plan, day, loading }`

- [ ] **Step 1: Write the failing test for the hook**

`src/hooks/use-active-training-day.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/hooks/use-active-training-day.test.ts`
Expected: FAIL — `Failed to resolve import "./use-active-training-day"`

- [ ] **Step 3: Write minimal implementation**

`src/hooks/use-active-training-day.ts`:

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nextTrainingDay, type PlanDay } from '../lib/next-training-day'
import type { WorkoutPlan } from './use-workout-plans'

export function useActiveTrainingDay(userId: string) {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [day, setDay] = useState<PlanDay & { name: string }>()
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const { data: planRows } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('aktiv', true)
    const activePlan = ((planRows ?? []) as WorkoutPlan[])[0] ?? null

    if (!activePlan) {
      setPlan(null)
      setDay(undefined)
      setLoading(false)
      return
    }

    const { data: dayRows } = await supabase
      .from('workout_plan_days')
      .select('id, name, reihenfolge')
      .eq('workout_plan_id', activePlan.id)
      .order('reihenfolge', { ascending: true })
    const days = (dayRows ?? []) as (PlanDay & { name: string })[]

    const { data: lastSessionRows } = await supabase
      .from('workout_sessions')
      .select('workout_plan_day_id')
      .in('workout_plan_day_id', days.map((day) => day.id))
      .order('beendet_am', { ascending: false })
      .limit(1)
    const lastCompletedDayId = (lastSessionRows ?? [])[0]?.workout_plan_day_id ?? null

    setPlan(activePlan)
    setDay(nextTrainingDay(days, lastCompletedDayId) ?? undefined)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    reload()
  }, [reload])

  return { plan, day: day ?? null, loading }
}
```

Die `in(...)`-Filterung auf `days.map(...)` läuft ins Leere (leeres Array), wenn ein aktiver Plan noch keine Tage hat — `.in('workout_plan_day_id', [])` liefert dann korrekt keine Zeilen, kein Sonderfall nötig.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/hooks/use-active-training-day.test.ts`
Expected: PASS, 3 Tests

- [ ] **Step 5: Write the failing test for the dashboard**

`src/pages/TrainingPage.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseActiveTrainingDay = vi.fn()
vi.mock('../hooks/use-active-training-day', () => ({
  useActiveTrainingDay: (userId: string) => mockUseActiveTrainingDay(userId),
}))

const mockStartWorkoutSession = vi.fn()
const mockNavigate = vi.fn()
vi.mock('../hooks/use-workout-session', () => ({
  startWorkoutSession: (userId: string, dayId: string) => mockStartWorkoutSession(userId, dayId),
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

afterEach(() => cleanup())

describe('TrainingPage', () => {
  it('shows a placeholder while there is no session', async () => {
    mockUseSession.mockReturnValue({ session: null, loading: false })

    const { default: TrainingPage } = await import('./TrainingPage')
    render(<TrainingPage />, { wrapper: MemoryRouter })

    expect(screen.getByRole('heading', { name: 'Training' })).toBeInTheDocument()
  })

  it('shows the active plan, the next day, and a link to manage plans', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue({
      plan: { id: 'p1', name: 'Ganzkörper', aktiv: true },
      day: { id: 'd1', name: 'Tag A', reihenfolge: 1 },
      loading: false,
    })

    const { default: TrainingPage } = await import('./TrainingPage')
    render(<TrainingPage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Ganzkörper')).toBeInTheDocument()
    expect(screen.getByText('Tag A')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Meine Pläne' })).toHaveAttribute('href', '/training/plans')
  })

  it('starts a session for the next day and navigates to it', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue({
      plan: { id: 'p1', name: 'Ganzkörper', aktiv: true },
      day: { id: 'd1', name: 'Tag A', reihenfolge: 1 },
      loading: false,
    })
    mockStartWorkoutSession.mockResolvedValue('s1')

    const { default: TrainingPage } = await import('./TrainingPage')
    render(<TrainingPage />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: 'Training starten' }))

    await waitFor(() => expect(mockStartWorkoutSession).toHaveBeenCalledWith('u1', 'd1'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/training/session/s1'))
  })

  it('shows a message and no start button when no plan is active', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue({ plan: null, day: null, loading: false })

    const { default: TrainingPage } = await import('./TrainingPage')
    render(<TrainingPage />, { wrapper: MemoryRouter })

    expect(screen.queryByRole('button', { name: 'Training starten' })).not.toBeInTheDocument()
    expect(screen.getByText(/kein aktiver Plan/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run --dir src src/pages/TrainingPage.test.tsx`
Expected: FAIL — Platzhalter zeigt nicht die neuen Inhalte, `useActiveTrainingDay` ungenutzt

- [ ] **Step 7: Write minimal implementation**

`src/pages/TrainingPage.tsx` vollständig ersetzen:

```tsx
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useActiveTrainingDay } from '../hooks/use-active-training-day'
import { startWorkoutSession } from '../hooks/use-workout-session'

export default function TrainingPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Training</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Dashboard userId={userId} />
}

function Dashboard({ userId }: { userId: string }) {
  const { plan, day, loading } = useActiveTrainingDay(userId)
  const navigate = useNavigate()

  if (loading) {
    return (
      <div>
        <h1>Training</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Training</h1>
      {plan && day ? (
        <>
          <p>{plan.name}</p>
          <p>{day.name}</p>
          <button
            type="button"
            onClick={async () => {
              const sessionId = await startWorkoutSession(userId, day.id)
              navigate(`/training/session/${sessionId}`)
            }}
          >
            Training starten
          </button>
        </>
      ) : (
        <p>Kein aktiver Plan.</p>
      )}
      <Link to="/training/plans">Meine Pläne</Link>
    </div>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run --dir src src/pages/TrainingPage.test.tsx`
Expected: PASS, 4 Tests

- [ ] **Step 9: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/hooks/use-active-training-day.ts src/hooks/use-active-training-day.test.ts src/pages/TrainingPage.tsx src/pages/TrainingPage.test.tsx
git commit -m "feat: build the training dashboard (active plan, next day, start session)"
```

---

### Task 13: Live-Trainingsmodus — Seite

**Files:**
- Create: `src/pages/WorkoutSessionPage.tsx`
- Create: `src/pages/WorkoutSessionPage.test.tsx`

**Interfaces:**
- Consumes: `useWorkoutSession` (Task 10), `useProfile` (bestehend)
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Write the failing test**

`src/pages/WorkoutSessionPage.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))

const mockUseWorkoutSession = vi.fn()
vi.mock('../hooks/use-workout-session', () => ({
  useWorkoutSession: (sessionId: string) => mockUseWorkoutSession(sessionId),
}))

afterEach(() => cleanup())

const exercise = {
  exercise_id: 'ex1',
  name: 'Bankdrücken',
  ziel_saetze: 2,
  ziel_wiederholungen: 10,
  pausenzeit_sekunden: 90,
  reihenfolge: 1,
}

function sessionResult(overrides: Partial<ReturnType<typeof mockUseWorkoutSession>> = {}) {
  return {
    session: { id: 's1', workout_plan_day_id: 'd1', gestartet_am: '2026-08-21T10:00:00.000Z', beendet_am: null, gesamt_kalorien: null },
    exercises: [exercise],
    sets: [],
    loading: false,
    logSet: vi.fn().mockResolvedValue(undefined),
    updateSet: vi.fn().mockResolvedValue(undefined),
    completeSession: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/training/session/s1']}>
      <Routes>
        <Route path="/training/session/:sessionId" element={<PageUnderTest />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function PageUnderTest() {
  const { default: WorkoutSessionPage } = await import('./WorkoutSessionPage')
  return <WorkoutSessionPage />
}

describe('WorkoutSessionPage', () => {
  it('lists the exercises of the day', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue({ profile: { aktuelles_gewicht: 80 }, loading: false, error: false })
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    expect(await screen.findByText('Bankdrücken')).toBeInTheDocument()
  })

  it('logs a set and starts the pause timer', async () => {
    vi.useFakeTimers()
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue({ profile: { aktuelles_gewicht: 80 }, loading: false, error: false })
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() => expect(result.logSet).toHaveBeenCalledWith('ex1', 1, 60, 10))
    expect(screen.getByText(/Pause/)).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('opens the next exercise once the pause of the last set of the current one runs out', async () => {
    vi.useFakeTimers()
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue({ profile: { aktuelles_gewicht: 80 }, loading: false, error: false })
    const secondExercise = { ...exercise, exercise_id: 'ex2', name: 'Kniebeuge', reihenfolge: 2 }
    // One target set on the first exercise, already logged: its pause ending
    // means the exercise is done, so the next one must open by itself.
    const result = sessionResult({
      exercises: [{ ...exercise, ziel_saetze: 1 }, secondExercise],
      sets: [
        {
          id: 'set1',
          exercise_id: 'ex1',
          satz_nummer: 1,
          gewicht: 60,
          wiederholungen: 10,
          abgeschlossen_am: '2026-08-21T10:05:00.000Z',
          exercise: { id: 'ex1', name: 'Bankdrücken', met_wert: 5 },
        },
      ],
    })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() => expect(screen.getByText(/Pause/)).toBeInTheDocument())

    await act(async () => {
      vi.advanceTimersByTime(90_000)
    })

    // The pause is over and the first exercise has no sets left, so the form
    // now belongs to the second exercise.
    await waitFor(() => expect(screen.queryByText(/Pause/)).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Satz abschließen' })).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('completes the session using the profile weight', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue({ profile: { aktuelles_gewicht: 80 }, loading: false, error: false })
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    await waitFor(() => expect(result.completeSession).toHaveBeenCalledWith(80))
  })

  it('shows a dash instead of completing when no weight is on the profile', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue({ profile: { aktuelles_gewicht: null }, loading: false, error: false })
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    expect(screen.getByText('—')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    await waitFor(() => expect(result.completeSession).not.toHaveBeenCalled())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/pages/WorkoutSessionPage.test.tsx`
Expected: FAIL — `Failed to resolve import "./WorkoutSessionPage"`

- [ ] **Step 3: Write minimal implementation**

`src/pages/WorkoutSessionPage.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useWorkoutSession, type SessionExercise } from '../hooks/use-workout-session'

export default function WorkoutSessionPage() {
  const { session } = useSession()
  const { sessionId } = useParams<{ sessionId: string }>()
  const userId = session?.user.id

  if (!userId || !sessionId) {
    return (
      <div>
        <h1>Training</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <LiveSession userId={userId} sessionId={sessionId} />
}

function LiveSession({ userId, sessionId }: { userId: string; sessionId: string }) {
  const { profile } = useProfile(userId)
  const { exercises, sets, loading, logSet, completeSession } = useWorkoutSession(sessionId)
  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null)
  const [pauseUntil, setPauseUntil] = useState<number | null>(null)
  const navigate = useNavigate()

  if (loading) {
    return (
      <div>
        <h1>Training</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  const gewichtKg = profile?.aktuelles_gewicht ?? null

  return (
    <div>
      <h1>Training</h1>
      {pauseUntil !== null && (
        <PauseTimer
          until={pauseUntil}
          onDone={() => {
            setPauseUntil(null)
            // The pause ends where the next set begins: stay on this exercise
            // while it still has target sets left, otherwise open the next one.
            const current = exercises.find((exercise) => exercise.exercise_id === openExerciseId)
            if (!current) return
            const done = sets.filter((set) => set.exercise_id === current.exercise_id).length
            if (current.ziel_saetze !== null && done >= current.ziel_saetze) {
              const sorted = [...exercises].sort((a, b) => a.reihenfolge - b.reihenfolge)
              const index = sorted.findIndex((exercise) => exercise.exercise_id === current.exercise_id)
              setOpenExerciseId(sorted[index + 1]?.exercise_id ?? null)
            }
          }}
        />
      )}
      <ul>
        {exercises.map((exercise) => (
          <li key={exercise.exercise_id}>
            <button type="button" onClick={() => setOpenExerciseId(exercise.exercise_id)}>
              {exercise.name}
            </button>
            {openExerciseId === exercise.exercise_id && (
              <SetForm
                exercise={exercise}
                completedCount={sets.filter((set) => set.exercise_id === exercise.exercise_id).length}
                onLog={async (satzNummer, gewicht, wiederholungen) => {
                  await logSet(exercise.exercise_id, satzNummer, gewicht, wiederholungen)
                  if (exercise.pausenzeit_sekunden) {
                    setPauseUntil(Date.now() + exercise.pausenzeit_sekunden * 1000)
                  }
                }}
              />
            )}
          </li>
        ))}
      </ul>
      <p>{gewichtKg === null ? '—' : `${gewichtKg} kg`}</p>
      <button
        type="button"
        onClick={async () => {
          if (gewichtKg === null) return
          await completeSession(gewichtKg)
          navigate('/training')
        }}
      >
        Training abschließen
      </button>
    </div>
  )
}

function SetForm({
  exercise,
  completedCount,
  onLog,
}: {
  exercise: SessionExercise
  completedCount: number
  onLog: (satzNummer: number, gewicht: number | null, wiederholungen: number | null) => Promise<void>
}) {
  const [gewicht, setGewicht] = useState('')
  const [wiederholungen, setWiederholungen] = useState('')

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        // Number('') is 0, not "unset" — an empty field must stay null, not become a fake 0.
        const gewichtValue = gewicht === '' ? null : Number(gewicht)
        const wiederholungenValue = wiederholungen === '' ? null : Number(wiederholungen)
        await onLog(completedCount + 1, gewichtValue, wiederholungenValue)
        setGewicht('')
        setWiederholungen('')
      }}
    >
      <label>
        Gewicht (kg)
        <input value={gewicht} onChange={(event) => setGewicht(event.target.value)} />
      </label>
      <label>
        Wiederholungen
        <input value={wiederholungen} onChange={(event) => setWiederholungen(event.target.value)} />
      </label>
      <button type="submit">Satz abschließen</button>
    </form>
  )
}

function PauseTimer({ until, onDone }: { until: number; onDone: () => void }) {
  const [remainingSeconds, setRemainingSeconds] = useState(Math.max(0, Math.ceil((until - Date.now()) / 1000)))

  useEffect(() => {
    // A target timestamp, not a decrementing tick — recomputed from the wall
    // clock on every tick, so a backgrounded tab or a locked screen does not
    // desync the countdown from real elapsed time.
    const interval = setInterval(() => {
      const next = Math.max(0, Math.ceil((until - Date.now()) / 1000))
      setRemainingSeconds(next)
      if (next === 0) {
        clearInterval(interval)
        onDone()
      }
    }, 250)
    return () => clearInterval(interval)
  }, [until, onDone])

  return <p>{`Pause: ${remainingSeconds}s`}</p>
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/pages/WorkoutSessionPage.test.tsx`
Expected: PASS, 4 Tests

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/pages/WorkoutSessionPage.tsx src/pages/WorkoutSessionPage.test.tsx
git commit -m "feat: add the live workout session page with pause timer"
```

---

### Task 14: Trainingshistorie — Detailseite

**Files:**
- Create: `src/pages/TrainingHistoryDetailPage.tsx`
- Create: `src/pages/TrainingHistoryDetailPage.test.tsx`

**Interfaces:**
- Consumes: `useWorkoutSession` (Task 10)
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Write the failing test**

`src/pages/TrainingHistoryDetailPage.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockUseWorkoutSession = vi.fn()
vi.mock('../hooks/use-workout-session', () => ({
  useWorkoutSession: (sessionId: string) => mockUseWorkoutSession(sessionId),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

afterEach(() => cleanup())

const set = {
  id: 'set1',
  exercise_id: 'ex1',
  satz_nummer: 1,
  gewicht: 60,
  wiederholungen: 10,
  abgeschlossen_am: '2026-08-20T10:05:00.000Z',
  exercise: { id: 'ex1', name: 'Bankdrücken', met_wert: 5 },
}

function sessionResult(overrides: Partial<ReturnType<typeof mockUseWorkoutSession>> = {}) {
  return {
    session: {
      id: 's1',
      workout_plan_day_id: 'd1',
      gestartet_am: '2026-08-20T10:00:00.000Z',
      beendet_am: '2026-08-20T11:00:00.000Z',
      gesamt_kalorien: 400,
    },
    exercises: [],
    sets: [set],
    loading: false,
    logSet: vi.fn(),
    updateSet: vi.fn().mockResolvedValue(undefined),
    completeSession: vi.fn(),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/training/history/s1']}>
      <Routes>
        <Route path="/training/history/:sessionId" element={<PageUnderTest />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function PageUnderTest() {
  const { default: TrainingHistoryDetailPage } = await import('./TrainingHistoryDetailPage')
  return <TrainingHistoryDetailPage />
}

describe('TrainingHistoryDetailPage', () => {
  it('shows the sets with exercise, weight and reps', async () => {
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    expect(await screen.findByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.getByDisplayValue('60')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('corrects a set', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.change(screen.getByDisplayValue('60'), { target: { value: '65' } })

    await waitFor(() => expect(result.updateSet).toHaveBeenCalledWith('set1', { gewicht: 65 }))
  })

  it('deletes the session and navigates back to the history list', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Session löschen' }))

    await waitFor(() => expect(result.deleteSession).toHaveBeenCalled())
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/training/history'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/pages/TrainingHistoryDetailPage.test.tsx`
Expected: FAIL — `Failed to resolve import "./TrainingHistoryDetailPage"`

- [ ] **Step 3: Write minimal implementation**

`src/pages/TrainingHistoryDetailPage.tsx`:

```tsx
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useWorkoutSession } from '../hooks/use-workout-session'

export default function TrainingHistoryDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  if (!sessionId) {
    return (
      <div>
        <h1>Trainingseinheit</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Detail sessionId={sessionId} />
}

function Detail({ sessionId }: { sessionId: string }) {
  const { session, sets, loading, updateSet, deleteSession } = useWorkoutSession(sessionId)
  const navigate = useNavigate()

  if (loading || !session) {
    return (
      <div>
        <h1>Trainingseinheit</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Trainingseinheit</h1>
      <p>{`${Math.round(session.gesamt_kalorien ?? 0)} kcal`}</p>
      <ul>
        {sets.map((set) => (
          <li key={set.id}>
            {set.exercise?.name}
            <label>
              Gewicht (kg)
              <input
                value={set.gewicht ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  updateSet(set.id, { gewicht: value === '' ? null : Number(value) })
                }}
              />
            </label>
            <label>
              Wiederholungen
              <input
                value={set.wiederholungen ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  updateSet(set.id, { wiederholungen: value === '' ? null : Number(value) })
                }}
              />
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={async () => {
          await deleteSession()
          navigate('/training/history')
        }}
      >
        Session löschen
      </button>
      <Link to="/training/history">Zurück zur Historie</Link>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/pages/TrainingHistoryDetailPage.test.tsx`
Expected: PASS, 3 Tests

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/pages/TrainingHistoryDetailPage.tsx src/pages/TrainingHistoryDetailPage.test.tsx
git commit -m "feat: add training history detail page with set correction and delete"
```

---

### Task 15: Routing

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `TrainingPage`, `TrainingPlansPage`, `TrainingPlanEditPage`, `ExercisesPage`, `WorkoutSessionPage`, `TrainingHistoryPage`, `TrainingHistoryDetailPage` (Tasks 4, 6, 8, 12, 13, 11, 14)
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Write the failing test**

In `src/App.test.tsx` ergänzen:

```tsx
  it('shows the training plans page at /training/plans with an active session', async () => {
    window.history.pushState({}, '', '/training/plans')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Meine Pläne' })).toBeInTheDocument()
  })

  it('shows the exercises page at /training/exercises with an active session', async () => {
    window.history.pushState({}, '', '/training/exercises')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Übungen' })).toBeInTheDocument()
  })

  it('shows the training history page at /training/history with an active session', async () => {
    window.history.pushState({}, '', '/training/history')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Trainingshistorie' })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/App.test.tsx`
Expected: FAIL — die Routen existieren noch nicht, `AppLayout`/`ProtectedRoute` liefern keine passende Überschrift

- [ ] **Step 3: Write minimal implementation**

In `src/App.tsx` die Importe ergänzen:

```tsx
import TrainingPlansPage from './pages/TrainingPlansPage'
import TrainingPlanEditPage from './pages/TrainingPlanEditPage'
import ExercisesPage from './pages/ExercisesPage'
import WorkoutSessionPage from './pages/WorkoutSessionPage'
import TrainingHistoryPage from './pages/TrainingHistoryPage'
import TrainingHistoryDetailPage from './pages/TrainingHistoryDetailPage'
```

Und die Routen nach `/training`:

```tsx
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/training/plans" element={<TrainingPlansPage />} />
          <Route path="/training/plans/:planId" element={<TrainingPlanEditPage />} />
          <Route path="/training/exercises" element={<ExercisesPage />} />
          <Route path="/training/session/:sessionId" element={<WorkoutSessionPage />} />
          <Route path="/training/history" element={<TrainingHistoryPage />} />
          <Route path="/training/history/:sessionId" element={<TrainingHistoryDetailPage />} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit && npm run build`

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire up the training routes"
```

---

### Task 16: Finale Verifikation

**Files:**
- Modify: `docs/domaenenmodell.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run the full verification**

```bash
npm test
npm run lint
npx tsc -b --noEmit
npm run build
```

Alle vier ohne Fehler und ohne Warnungen.

- [ ] **Step 2: Update the domain model**

In `docs/domaenenmodell.md` im ` ```mermaid `-ERD:

- Neuer Block `workout_plan_days { uuid id PK, uuid workout_plan_id FK, string name, int reihenfolge }` mit Beziehung `workout_plans ||--o{ workout_plan_days`.
- Im bestehenden `workout_plan_exercises`-Block (falls schon dokumentiert) auf `workout_plan_day_exercises` umbenennen, `workout_plan_id` durch `workout_plan_day_id` ersetzen, Beziehung auf `workout_plan_days` statt `workout_plans` ziehen.
- Im `workout_sessions`-Block `workout_plan_id` durch `workout_plan_day_id` ersetzen, Beziehung auf `workout_plan_days` ziehen.

Falls die Trainings-Tabellen dort noch gar nicht dokumentiert sind (Phase 1 hat sie nur angelegt, nicht unbedingt ins ERD aufgenommen — vorher prüfen), alle sechs Tabellen (`exercises`, `workout_plans`, `workout_plan_days`, `workout_plan_day_exercises`, `workout_sessions`, `workout_session_sets`) mit ihren Spalten aus `supabase/migrations/0001_initial_schema.sql` und `0004_training_days.sql` ergänzen.

In „Fachliche Notizen" einen Punkt anfügen:

```
- `workout_plan_days` gibt einem Trainingsplan mehrere benannte Tage (z. B. „Push"/„Pull"/„Legs"); `workout_plan_day_exercises` hängt an einem Tag statt direkt am Plan, `workout_sessions.workout_plan_day_id` verweist auf den konkreten trainierten Tag. Welcher Tag als Nächstes ansteht, ergibt sich zur Laufzeit aus dem zuletzt abgeschlossenen Tag desselben Plans (Rotation, keine eigene Spalte) — kein Kalender beteiligt.
- `gesamt_kalorien` in `workout_sessions` wird einmalig bei „Training abschließen" berechnet (MET-Durchschnitt über alle Sätze × `profiles.aktuelles_gewicht` × Dauer) und danach nicht rückwirkend neu berechnet, auch wenn sich der MET-Wert einer verwendeten Übung später ändert.
```

Die Quellenzeile auf `Stand Phase 2 + Mahlzeiten-Abschnitte + Phase 3 (Trainingsbereich), inkl. 0004_training_days.sql` setzen.

Danach nach `../fitness-app.wiki/Domain-Model.md` kopieren — das Wiki **nicht** committen oder pushen, das bleibt ein eigener Schritt.

- [ ] **Step 3: Update the status section**

In `CLAUDE.md` unter „Status / Fortschritt" festhalten: Trainingsbereich ist umgesetzt — Übungsdatenbank importiert (free-exercise-db, MET-Wert pro Kategorie), Trainingspläne mit mehreren benannten Tagen, automatische Tag-Rotation, Live-Trainingsmodus mit sofort gespeicherten Sätzen und Pausen-Timer, Kalorienberechnung über die MET-Formel bei Session-Abschluss, Trainingshistorie mit nachträglicher Satz-Korrektur. Spec und Plan verlinken. Als offene Folgevorhaben vermerken: Trainingstag/Restday-Kalender (Home-Dashboard-Integration), Kalorienberechnung je Übung mit eigener Dauer, Schwierigkeitsgrad-Import.

- [ ] **Step 4: Commit**

```bash
git add docs/domaenenmodell.md CLAUDE.md
git commit -m "docs: record the training area (Phase 3)"
```

- [ ] **Step 5: Manual verification (Nutzer, nach dem Merge)**

1. Übungsimport ausführen (siehe Task 2, Step 11) und in Supabase prüfen: `exercises` hat ~873 Zeilen mit gesetztem `met_wert`.
2. In Supabase prüfen: `workout_plan_days` existiert, `workout_plan_exercises` heißt jetzt `workout_plan_day_exercises` mit Spalte `workout_plan_day_id`, `workout_sessions` hat `workout_plan_day_id` statt `workout_plan_id`.
3. `/training/plans` öffnen, einen Plan mit zwei Tagen anlegen (z. B. „Push", „Pull"), je Tag über die Inline-Suche eine Übung hinzufügen, Ziel-Sätze/-Wiederholungen/Pause eintragen.
4. Plan aktivieren, auf `/training` prüfen: Plan-Name und „Push" (Tag 1) werden vorgeschlagen.
5. „Training starten", einen Satz mit Gewicht/Wiederholungen erfassen — Pausen-Timer startet und zählt herunter.
6. „Training abschließen" — Kalorienzahl erscheint, zurück auf `/training`.
7. Erneut „Training starten" — diesmal wird „Pull" (Tag 2) vorgeschlagen.
8. Auf `/training/history` prüfen: die abgeschlossene Session erscheint mit Datum, Tag, Kalorien; in der Detailansicht einen Satz korrigieren und die Session danach löschen.
9. Im Profil das Gewicht leeren, eine neue Session abschließen — die App zeigt „—" statt einer Kalorienzahl, kein Fehler.

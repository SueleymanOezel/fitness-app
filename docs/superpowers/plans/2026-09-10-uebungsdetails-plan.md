# Übungsdetails (Bild, Anleitung, Schwierigkeitsgrad) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zeige Bilder in der Übungsliste, öffne per Klick ein Popup mit Beschreibung/Ausführung und Schwierigkeitsgrad, und erlaube dieselben Angaben beim Anlegen eigener Übungen.

**Architecture:** Additive Migration (`anleitung`, `schwierigkeitsgrad` auf `exercises`, `bild_url` existiert bereits), Import-Skript liest die zwei neuen Felder zusätzlich aus der Rohquelle, ein neues `ExerciseDetailDialog`-Präsentationskomponente rendert die Details bedingt (keine leeren Sektionen), `ExercisesPage.tsx` bekommt ein Bild-Thumbnail je Zeile und öffnet den Dialog per Klick, `NewExerciseForm` bekommt drei neue optionale Text-Felder.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest + Testing Library, Supabase (Postgres), Tailwind-Utility-Klassen.

**Spec:** `docs/superpowers/specs/2026-09-10-uebungsdetails-design.md`

## Global Constraints

- Alle UI-Texte auf Deutsch (Projekt-Konvention).
- Keine neue Abhängigkeit einführen — kein Bild-Upload, kein Formular-Framework, kein neuer Eingabe-Typ (Dropdown etc.).
- Bestehende Design-Bausteine wiederverwenden: `cardClass`, `Dialog`, `VitaIcon`, `buttonPrimaryClass`/`buttonSecondaryClass`, `muskelgruppeLabel`/`equipmentLabel`-Muster.
- Neue DB-Spalten additiv und nullable, kein Check-Constraint (gleiches Muster wie `kategorie`/`equipment`).
- Keine Übersetzung von Namen/Instructions (Freitext) — das ist ein eigenes, späteres Vorhaben (siehe Spec, „Bewusst außen vor").
- Keine Änderung an `replaceImportedExercises` (Delete+Reinsert bleibt).
- Keine neue Route — die Detailansicht ist ausschließlich ein Popup (`Dialog`).

---

### Task 1: Migration + Domänenmodell-Dokumentation

**Files:**
- Create: `supabase/migrations/0008_exercise_details.sql`
- Test: `supabase/migrations/0008_exercise_details.test.ts`
- Modify: `docs/domaenenmodell.md`

**Interfaces:**
- Produces: zwei neue nullable Spalten auf `public.exercises`: `anleitung text[]`, `schwierigkeitsgrad text`. Konsumiert von Task 3 (Import-Skript liefert Werte dafür), Task 4 (`Exercise`-Typ), Task 6 (`NewExercise`-Typ).

- [ ] **Step 1: Write the failing test**

`supabase/migrations/0008_exercise_details.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0008_exercise_details.sql'), 'utf-8')
/** Comments explain the columns and name things the statement must not touch. */
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0008_exercise_details.sql', () => {
  it('adds anleitung and schwierigkeitsgrad to exercises as nullable columns', () => {
    expect(sql).toMatch(/alter table public\.exercises/)
    expect(statements).toContain('add column anleitung text[]')
    expect(statements).toContain('add column schwierigkeitsgrad text')
    // Nullable on purpose: existing imported rows only get these values after
    // the import script re-runs, and a manually created exercise may skip them.
    expect(statements).not.toMatch(/anleitung text\[\]\s+not null/)
    expect(statements).not.toMatch(/schwierigkeitsgrad text\s+not null/)
  })

  it('adds no check constraint, table, or policy', () => {
    // No check constraint: translation to German happens in the frontend
    // with a fallback (src/lib/level-labels.ts), the same pattern already
    // used for kategorie/equipment — the schema stays open to any value a
    // future re-import might bring.
    expect(statements).not.toMatch(/check\s*\(/i)
    expect(sql).not.toMatch(/create table/i)
    expect(sql).not.toMatch(/create policy/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run supabase/migrations/0008_exercise_details.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open '.../0008_exercise_details.sql'`

- [ ] **Step 3: Write the migration**

`supabase/migrations/0008_exercise_details.sql`:

```sql
-- Bild pro Übung existiert bereits (bild_url, seit 0001_initial_schema.sql).
-- Diese Migration ergänzt die zwei Felder, die die Detailansicht zusätzlich
-- braucht: eine Schritt-für-Schritt-Anleitung und den Schwierigkeitsgrad.
-- Additiv und nullable wie kategorie/equipment: Übersetzung ins Deutsche
-- passiert im Frontend mit Fallback, nicht als DB-Constraint.
alter table public.exercises
  add column anleitung text[],
  add column schwierigkeitsgrad text;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run supabase/migrations/0008_exercise_details.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Update `docs/domaenenmodell.md`**

In the `exercises` ERD block (around line 84), add the three columns that exist but are missing from the diagram (`bild_url` was never added when it shipped in `0001`) plus the two new ones:

```
    exercises {
        uuid id PK
        text name
        text kategorie
        text equipment
        text_array muskelgruppen_primaer
        text_array muskelgruppen_sekundaer
        text bild_url
        text_array anleitung
        text schwierigkeitsgrad
        numeric met_wert
        uuid created_by FK
    }
```

Add a new bullet under „Fachliche Notizen" (after the existing `exercises.met_wert`-Notiz):

```
- `exercises.anleitung` (Schritt-für-Schritt-Sätze) und `exercises.schwierigkeitsgrad` (`beginner`/`intermediate`/`expert`) kommen seit Migration `0008` ebenfalls aus dem Import; beide sind nullable (5 der 873 importierten Übungen haben keine Instructions in der Quelle). Übersetzung ins Deutsche passiert im Frontend (`src/lib/level-labels.ts` für den Schwierigkeitsgrad, analog zu Muskelgruppen/Geräten) mit Fallback auf den Rohwert — kein DB-Constraint.
```

Update the Quelle-Zeile at the end of the file (append `und 0008_exercise_details.sql`):

```
- Quelle: `supabase/migrations/0001_initial_schema.sql` (Stand Phase 2 + Mahlzeiten-Abschnitte + Phase 3 (Trainingsbereich) + Analysefelder, inkl. `0002_nutrition_profile_fields.sql`, `0003_meal_sections.sql`, `0004_training_days.sql`, `0005_analysis_fields.sql`, `0006_body_photos_bucket.sql`, `0007_analyse_auswahl.sql` und `0008_exercise_details.sql`).
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0008_exercise_details.sql supabase/migrations/0008_exercise_details.test.ts docs/domaenenmodell.md
git commit -m "feat: add anleitung and schwierigkeitsgrad columns to exercises"
```

---

### Task 2: `level-labels.ts` — deutsche Labels für den Schwierigkeitsgrad

**Files:**
- Create: `src/lib/level-labels.ts`
- Test: `src/lib/level-labels.test.ts`

**Interfaces:**
- Produces: `levelLabel(value: string): string`. Konsumiert von Task 4 (`ExerciseDetailDialog`).

- [ ] **Step 1: Write the failing test**

`src/lib/level-labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { levelLabel } from './level-labels'

describe('levelLabel', () => {
  it('translates every one of the 3 known source values', () => {
    const values = ['beginner', 'intermediate', 'expert']
    for (const value of values) {
      const label = levelLabel(value)
      expect(label).not.toBe(value)
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('falls back to the raw value for an unknown level', () => {
    expect(levelLabel('some-future-value')).toBe('some-future-value')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/level-labels.test.ts`
Expected: FAIL — `Failed to resolve import "./level-labels"`

- [ ] **Step 3: Write the implementation**

`src/lib/level-labels.ts`:

```ts
/**
 * German labels for the 3 difficulty-level values that exist in
 * exercises.schwierigkeitsgrad (imported verbatim from free-exercise-db's
 * `level` field). Small, fixed vocabulary, same pattern as
 * muscle-group-labels.ts/equipment-labels.ts.
 */
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Anfänger',
  intermediate: 'Fortgeschritten',
  expert: 'Experte',
}

/** Falls back to the raw value for anything outside the known 3 (e.g. a future re-import with a new level). */
export function levelLabel(value: string): string {
  return LEVEL_LABEL[value] ?? value
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/level-labels.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/level-labels.ts src/lib/level-labels.test.ts
git commit -m "feat: add level-labels module for difficulty translation"
```

---

### Task 3: Import-Skript liest Anleitung und Schwierigkeitsgrad

**Files:**
- Modify: `scripts/import-exercises.ts`
- Modify: `scripts/import-exercises.test.ts`

**Interfaces:**
- Consumes: Spalten aus Task 1 (nur namentlich referenziert, keine Typ-Abhängigkeit).
- Produces: `toExerciseRow` liefert zusätzlich `anleitung: string[] | null` und `schwierigkeitsgrad: string` im Rückgabe-Objekt. `RawExercise` erwartet zusätzlich `instructions: string[]` und `level: string`.

- [ ] **Step 1: Write the failing tests**

In `scripts/import-exercises.test.ts`, ersetze den ersten `toExerciseRow`-Test und ergänze zwei neue direkt danach:

```ts
describe('toExerciseRow', () => {
  it('maps a raw free-exercise-db entry to an exercises row', () => {
    const raw = {
      name: '3/4 Sit-Up',
      category: 'strength',
      equipment: 'body only',
      primaryMuscles: ['abdominals'],
      secondaryMuscles: [],
      images: ['3_4_Sit-Up/0.jpg', '3_4_Sit-Up/1.jpg'],
      instructions: ['Lie down on the floor.', 'Sit up.'],
      level: 'beginner',
    }

    expect(toExerciseRow(raw)).toEqual({
      name: '3/4 Sit-Up',
      kategorie: 'strength',
      equipment: 'body only',
      muskelgruppen_primaer: ['abdominals'],
      muskelgruppen_sekundaer: [],
      bild_url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/3_4_Sit-Up/0.jpg',
      anleitung: ['Lie down on the floor.', 'Sit up.'],
      schwierigkeitsgrad: 'beginner',
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
      instructions: [],
      level: 'intermediate',
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
      instructions: [],
      level: 'beginner',
    }

    expect(toExerciseRow(raw).bild_url).toBeNull()
  })

  it('leaves anleitung null when an entry has no instructions in the source', () => {
    const raw = {
      name: 'X',
      category: 'strength',
      equipment: null,
      primaryMuscles: [],
      secondaryMuscles: [],
      images: [],
      instructions: [],
      level: 'beginner',
    }

    expect(toExerciseRow(raw).anleitung).toBeNull()
  })

  it('passes the level straight through as schwierigkeitsgrad', () => {
    const raw = {
      name: 'X',
      category: 'strength',
      equipment: null,
      primaryMuscles: [],
      secondaryMuscles: [],
      images: [],
      instructions: ['Step 1.'],
      level: 'expert',
    }

    expect(toExerciseRow(raw).schwierigkeitsgrad).toBe('expert')
  })
})
```

Außerdem in `scripts/import-exercises.test.ts`, den module-scope `row`-Fixture (für die `replaceImportedExercises`-Tests) um die zwei neuen Felder ergänzen, sonst weigert sich `tsc` wegen fehlender Pflichtfelder auf `ExerciseRow`:

```ts
const row = {
  name: 'X',
  kategorie: 'strength',
  equipment: null,
  muskelgruppen_primaer: [],
  muskelgruppen_sekundaer: [],
  bild_url: null,
  anleitung: null,
  schwierigkeitsgrad: 'beginner',
  met_wert: 5,
  created_by: null,
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run scripts/import-exercises.test.ts`
Expected: FAIL — `toEqual` mismatch (missing `anleitung`/`schwierigkeitsgrad` keys) on the first test, `anleitung`/`schwierigkeitsgrad` undefined on the two new ones, plus a `tsc`-level type error on `raw`/`row` missing `instructions`/`level`/`anleitung`/`schwierigkeitsgrad` once you run the typecheck (`npx tsc -b --noEmit`) — expected at this point, fixed in the next step.

- [ ] **Step 3: Write the implementation**

In `scripts/import-exercises.ts`, erweitere `RawExercise` und `toExerciseRow`:

```ts
type RawExercise = {
  name: string
  category: string
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  images: string[]
  instructions: string[]
  level: string
}

export function toExerciseRow(raw: RawExercise) {
  return {
    name: raw.name,
    kategorie: raw.category,
    equipment: raw.equipment,
    muskelgruppen_primaer: raw.primaryMuscles,
    muskelgruppen_sekundaer: raw.secondaryMuscles,
    bild_url: raw.images.length > 0 ? `${IMAGE_BASE_URL}${raw.images[0]}` : null,
    anleitung: raw.instructions.length > 0 ? raw.instructions : null,
    schwierigkeitsgrad: raw.level,
    met_wert: metForCategory(raw.category),
    created_by: null,
  }
}
```

- [ ] **Step 4: Run tests and typecheck to verify they pass**

Run: `npm test -- --run scripts/import-exercises.test.ts`
Expected: PASS (all `toExerciseRow` and `replaceImportedExercises` tests)

Run: `npx tsc -b --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add scripts/import-exercises.ts scripts/import-exercises.test.ts
git commit -m "feat: import instructions and level from free-exercise-db"
```

---

### Task 4: `Exercise`-Typ erweitern + `ExerciseDetailDialog`-Komponente

**Files:**
- Modify: `src/hooks/use-exercises.ts`
- Create: `src/components/ExerciseDetailDialog.tsx`
- Test: `src/components/ExerciseDetailDialog.test.tsx`

**Interfaces:**
- Consumes: `muskelgruppeLabel` (`src/lib/muscle-group-labels.ts`), `equipmentLabel` (`src/lib/equipment-labels.ts`), `levelLabel` (Task 2), `cardClass` (`src/lib/ui-classes.ts`).
- Produces: `Exercise` type erweitert um `anleitung: string[] | null`, `schwierigkeitsgrad: string | null`. Default export `ExerciseDetailDialog({ exercise: Exercise }): JSX.Element` — konsumiert von Task 5.

- [ ] **Step 1: Extend the `Exercise` type**

In `src/hooks/use-exercises.ts`, in `export type Exercise`, füge nach `bild_url` zwei Felder ein:

```ts
export type Exercise = {
  id: string
  name: string
  kategorie: string | null
  equipment: string | null
  muskelgruppen_primaer: string[] | null
  muskelgruppen_sekundaer: string[] | null
  bild_url: string | null
  anleitung: string[] | null
  schwierigkeitsgrad: string | null
  met_wert: number | null
  created_by: string | null
}
```

(Kein Test nötig für eine reine Typ-Erweiterung — der Compiler prüft sie über die abhängigen Dateien in den folgenden Schritten.)

- [ ] **Step 2: Write the failing test for `ExerciseDetailDialog`**

`src/components/ExerciseDetailDialog.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ExerciseDetailDialog from './ExerciseDetailDialog'
import type { Exercise } from '../hooks/use-exercises'

afterEach(() => cleanup())

const exercise: Exercise = {
  id: 'ex1',
  name: 'Bankdrücken',
  kategorie: 'strength',
  equipment: 'barbell',
  muskelgruppen_primaer: ['chest'],
  muskelgruppen_sekundaer: [],
  bild_url: 'https://example.com/bankdruecken.jpg',
  anleitung: ['Lege dich auf die Bank.', 'Drücke die Stange nach oben.'],
  schwierigkeitsgrad: 'intermediate',
  met_wert: 5,
  created_by: null,
}

describe('ExerciseDetailDialog', () => {
  it('renders the image with the exercise name as alt text', () => {
    render(<ExerciseDetailDialog exercise={exercise} />)
    expect(screen.getByRole('img', { name: 'Bankdrücken' })).toHaveAttribute(
      'src',
      'https://example.com/bankdruecken.jpg',
    )
  })

  it('renders no image when bild_url is null', () => {
    render(<ExerciseDetailDialog exercise={{ ...exercise, bild_url: null }} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows the translated muscle group, equipment and difficulty level', () => {
    render(<ExerciseDetailDialog exercise={exercise} />)
    expect(screen.getByText('Brust')).toBeInTheDocument()
    expect(screen.getByText('Langhantel')).toBeInTheDocument()
    expect(screen.getByText('Fortgeschritten')).toBeInTheDocument()
  })

  it('shows the instructions as a numbered list', () => {
    render(<ExerciseDetailDialog exercise={exercise} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Lege dich auf die Bank.',
      'Drücke die Stange nach oben.',
    ])
  })

  it('shows a fallback message when there are no instructions', () => {
    render(<ExerciseDetailDialog exercise={{ ...exercise, anleitung: null }} />)
    expect(screen.getByText('Keine Anleitung hinterlegt.')).toBeInTheDocument()
  })

  it('renders a minimal exercise without empty sections', () => {
    const minimal: Exercise = {
      id: 'ex2',
      name: 'Eigene Übung',
      kategorie: 'strength',
      equipment: null,
      muskelgruppen_primaer: null,
      muskelgruppen_sekundaer: null,
      bild_url: null,
      anleitung: null,
      schwierigkeitsgrad: null,
      met_wert: 4,
      created_by: 'u1',
    }
    render(<ExerciseDetailDialog exercise={minimal} />)

    expect(screen.getByText('Eigene Übung')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText('Keine Anleitung hinterlegt.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --run src/components/ExerciseDetailDialog.test.tsx`
Expected: FAIL — `Failed to resolve import "./ExerciseDetailDialog"`

- [ ] **Step 4: Write the implementation**

`src/components/ExerciseDetailDialog.tsx`:

```tsx
import { cardClass } from '../lib/ui-classes'
import { muskelgruppeLabel } from '../lib/muscle-group-labels'
import { equipmentLabel } from '../lib/equipment-labels'
import { levelLabel } from '../lib/level-labels'
import type { Exercise } from '../hooks/use-exercises'

/**
 * Same visual look as an inactive Chip, but a plain span: these tags are
 * read-only facts about the exercise, not toggleable filters, so they must
 * not carry Chip's button/aria-pressed semantics.
 */
const tagClass = 'rounded-full bg-surface px-4 py-2 font-medium text-text-muted'

export default function ExerciseDetailDialog({ exercise }: { exercise: Exercise }) {
  const muskelgruppen = exercise.muskelgruppen_primaer ?? []
  const anleitung = exercise.anleitung ?? []

  return (
    <div className={`${cardClass} flex flex-col gap-4`}>
      {exercise.bild_url && (
        <img src={exercise.bild_url} alt={exercise.name} className="w-full rounded-2xl object-cover" />
      )}
      <h2>{exercise.name}</h2>
      {(muskelgruppen.length > 0 || exercise.equipment) && (
        <div className="flex flex-wrap gap-2">
          {muskelgruppen.map((gruppe) => (
            <span key={gruppe} className={tagClass}>
              {muskelgruppeLabel(gruppe)}
            </span>
          ))}
          {exercise.equipment && <span className={tagClass}>{equipmentLabel(exercise.equipment)}</span>}
        </div>
      )}
      {exercise.schwierigkeitsgrad && <p>{levelLabel(exercise.schwierigkeitsgrad)}</p>}
      {anleitung.length > 0 ? (
        <ol className="list-decimal space-y-2 pl-5">
          {anleitung.map((schritt, index) => (
            <li key={index}>{schritt}</li>
          ))}
        </ol>
      ) : (
        <p>Keine Anleitung hinterlegt.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run src/components/ExerciseDetailDialog.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-exercises.ts src/components/ExerciseDetailDialog.tsx src/components/ExerciseDetailDialog.test.tsx
git commit -m "feat: add ExerciseDetailDialog component"
```

---

### Task 5: Liste — Thumbnail und Klick öffnet den Detail-Dialog

**Files:**
- Modify: `src/pages/ExercisesPage.tsx`
- Modify: `src/pages/ExercisesPage.test.tsx`

**Interfaces:**
- Consumes: `ExerciseDetailDialog` und erweiterten `Exercise`-Typ (Task 4).
- Produces: keine neuen Exporte, nur UI-Verhalten.

- [ ] **Step 1: Write the failing tests**

In `src/pages/ExercisesPage.test.tsx`, den module-scope `exercise`-Fixture um zwei Felder ergänzen (nach `bild_url: null,`):

```ts
const exercise = {
  id: 'ex1',
  name: 'Bankdrücken',
  kategorie: 'strength',
  equipment: 'barbell',
  muskelgruppen_primaer: ['chest'],
  muskelgruppen_sekundaer: [],
  bild_url: null,
  anleitung: ['Schritt eins.', 'Schritt zwei.'],
  schwierigkeitsgrad: 'beginner',
  met_wert: 5,
  created_by: null,
}
```

Drei neue Tests direkt vor `it('hides the filter row when no exercise has a muscle group', ...)` einfügen:

```tsx
  it('shows a thumbnail image for an exercise with a bild_url', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({ exercises: [{ ...exercise, bild_url: 'https://example.com/bankdruecken.jpg' }] }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    const row = screen.getByRole('button', { name: 'Bankdrücken' })
    expect(row.querySelector('img')).toHaveAttribute('src', 'https://example.com/bankdruecken.jpg')
  })

  it('shows a placeholder icon when an exercise has no bild_url', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(exercisesResult({ exercises: [{ ...exercise, bild_url: null }] }))

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    const row = screen.getByRole('button', { name: 'Bankdrücken' })
    expect(row.querySelector('img')).not.toBeInTheDocument()
    expect(row.querySelector('svg')).toBeInTheDocument()
  })

  it('opens the detail dialog with the exercise details when a row is clicked', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(exercisesResult())

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Bankdrücken' }))

    expect(screen.getByText('Schritt eins.')).toBeInTheDocument()
    expect(screen.getByText('Schritt zwei.')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/pages/ExercisesPage.test.tsx`
Expected: FAIL — `getByRole('button', { name: 'Bankdrücken' })` finds nothing (the row is still a `<div>`), and the last test fails because no dialog content ever appears.

- [ ] **Step 3: Write the implementation**

In `src/pages/ExercisesPage.tsx`, Imports ergänzen:

```tsx
import { useExercises, type Exercise } from '../hooks/use-exercises'
import ExerciseDetailDialog from '../components/ExerciseDetailDialog'
```

(ersetzt die bisherige `import { useExercises } from '../hooks/use-exercises'`-Zeile)

Neuen State direkt nach `const [equipment, setEquipment] = useState<string | null>(null)` einfügen:

```tsx
const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
```

Die Listen-Zeile ersetzen:

```tsx
      <ul role="list" className="space-y-4">
        {filtered.map((exercise) => (
          <li key={exercise.id} className="block border-b-0">
            <button
              type="button"
              className={`${cardClass} flex w-full items-center gap-4`}
              onClick={() => setSelectedExercise(exercise)}
            >
              {exercise.bild_url ? (
                <img src={exercise.bild_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <VitaIcon name="exercises" tone="mono" size={48} />
              )}
              {exercise.name}
            </button>
          </li>
        ))}
      </ul>
```

Nach dem bestehenden `<Dialog>`-Block für „Eigene Übung anlegen" (nach dem schließenden `</Dialog>`, vor dem `<Link to="/training" ...>`) einen zweiten `Dialog` einfügen:

```tsx
      <Dialog open={selectedExercise !== null} onClose={() => setSelectedExercise(null)}>
        {selectedExercise && <ExerciseDetailDialog exercise={selectedExercise} />}
      </Dialog>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/pages/ExercisesPage.test.tsx`
Expected: PASS (all tests, including the three new ones)

- [ ] **Step 5: Commit**

```bash
git add src/pages/ExercisesPage.tsx src/pages/ExercisesPage.test.tsx
git commit -m "feat: show exercise thumbnails and open detail dialog on click"
```

---

### Task 6: Formular „Eigene Übung anlegen" um Bild, Anleitung und Schwierigkeitsgrad erweitern

**Files:**
- Modify: `src/hooks/use-exercises.ts`
- Modify: `src/pages/ExercisesPage.tsx`
- Modify: `src/pages/ExercisesPage.test.tsx`

**Interfaces:**
- Produces: `NewExercise` type erweitert um `bild_url?: string`, `anleitung?: string[]`, `schwierigkeitsgrad?: string`.

- [ ] **Step 1: Extend the `NewExercise` type**

In `src/hooks/use-exercises.ts`:

```ts
export type NewExercise = {
  name: string
  kategorie: string
  met_wert: number
  equipment?: string
  muskelgruppen_primaer?: string[]
  muskelgruppen_sekundaer?: string[]
  bild_url?: string
  anleitung?: string[]
  schwierigkeitsgrad?: string
}
```

- [ ] **Step 2: Write the failing test**

In `src/pages/ExercisesPage.test.tsx`, neuen Test direkt nach `it('creates an own exercise', ...)` einfügen:

```tsx
  it('creates an own exercise with bild url, difficulty level and instructions', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = exercisesResult()
    mockUseExercises.mockReturnValue(result)

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Eigene Übung anlegen' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Meine Übung' } })
    fireEvent.change(screen.getByLabelText('Kategorie'), { target: { value: 'strength' } })
    fireEvent.change(screen.getByLabelText('MET-Wert'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Bild-URL'), { target: { value: 'https://example.com/x.jpg' } })
    fireEvent.change(screen.getByLabelText('Schwierigkeitsgrad'), { target: { value: 'beginner' } })
    fireEvent.change(screen.getByLabelText('Anleitung'), {
      target: { value: 'Schritt eins.\n\nSchritt zwei.\n' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(result.createExercise).toHaveBeenCalledWith({
        name: 'Meine Übung',
        kategorie: 'strength',
        met_wert: 4,
        bild_url: 'https://example.com/x.jpg',
        schwierigkeitsgrad: 'beginner',
        anleitung: ['Schritt eins.', 'Schritt zwei.'],
      }),
    )
  })
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --run src/pages/ExercisesPage.test.tsx`
Expected: FAIL — `getByLabelText('Bild-URL')` (and `Schwierigkeitsgrad`, `Anleitung`) find nothing, the fields don't exist yet.

- [ ] **Step 4: Write the implementation**

In `src/pages/ExercisesPage.tsx`, den `NewExerciseForm`-Funktionsblock ersetzen (Import `NewExercise` zum bestehenden `use-exercises`-Import hinzufügen: `import { useExercises, type Exercise, type NewExercise } from '../hooks/use-exercises'`):

```tsx
function NewExerciseForm({
  onSave,
  onCancel,
}: {
  onSave: (input: NewExercise) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [kategorie, setKategorie] = useState('')
  const [metWert, setMetWert] = useState('')
  const [bildUrl, setBildUrl] = useState('')
  const [schwierigkeitsgrad, setSchwierigkeitsgrad] = useState('')
  const [anleitung, setAnleitung] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    // Number('') is 0, not "unset" — an empty MET field must not silently save as 0.
    const met = metWert === '' ? null : Number(metWert)
    if (name.trim() === '' || kategorie.trim() === '' || met === null || !Number.isFinite(met) || met <= 0) {
      setError('Name, Kategorie und ein MET-Wert größer als 0 sind nötig.')
      return
    }
    setSaving(true)
    setError('')
    const bildUrlGetrimmt = bildUrl.trim()
    const schwierigkeitsgradGetrimmt = schwierigkeitsgrad.trim()
    const anleitungSchritte = anleitung
      .split('\n')
      .map((zeile) => zeile.trim())
      .filter((zeile) => zeile !== '')
    try {
      await onSave({
        name: name.trim(),
        kategorie: kategorie.trim(),
        met_wert: met,
        ...(bildUrlGetrimmt !== '' ? { bild_url: bildUrlGetrimmt } : {}),
        ...(schwierigkeitsgradGetrimmt !== '' ? { schwierigkeitsgrad: schwierigkeitsgradGetrimmt } : {}),
        ...(anleitungSchritte.length > 0 ? { anleitung: anleitungSchritte } : {}),
      })
    } catch {
      setError('Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={cardClass}>
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
          <input type="number" step="any" value={metWert} onChange={(event) => setMetWert(event.target.value)} />
        </label>
        <label>
          Bild-URL
          <input value={bildUrl} onChange={(event) => setBildUrl(event.target.value)} />
        </label>
        <label>
          Schwierigkeitsgrad
          <input value={schwierigkeitsgrad} onChange={(event) => setSchwierigkeitsgrad(event.target.value)} />
        </label>
        <label>
          Anleitung
          <textarea value={anleitung} onChange={(event) => setAnleitung(event.target.value)} />
        </label>
      </div>
      {error !== '' && <p role="alert">{error}</p>}
      <button type="submit" className={buttonPrimaryClass} disabled={saving}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="save" tone="mono" size={20} />
          Speichern
        </span>
      </button>
      <button type="button" className={buttonSecondaryClass} onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --run src/pages/ExercisesPage.test.tsx`
Expected: PASS (all tests, including the new one; the pre-existing `creates an own exercise` test must still pass unchanged, confirming blank optional fields stay omitted from the payload)

- [ ] **Step 6: Run the full suite, lint, typecheck and build**

```bash
npm test -- --run
npx eslint .
npx tsc -b --noEmit
npm run build
```

Expected: alle Tests grün, kein Lint-/Typefehler, Build erfolgreich.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-exercises.ts src/pages/ExercisesPage.tsx src/pages/ExercisesPage.test.tsx
git commit -m "feat: extend the own-exercise form with image, level and instructions"
```

---

## Manual Verification (nach dem Merge, gegen die echte Instanz)

Migration `0008` wird beim Merge nach `master` automatisch auf Produktion angewendet (Supabase-GitHub-Integration, siehe `CLAUDE.md`).

1. Im Haupt-Checkout (nicht im Worktree — der hat kein `.env`) einmal `npm run import-exercises` laufen lassen, um die 873 bestehenden Zeilen mit `anleitung`/`schwierigkeitsgrad` nachzuziehen. Voraussetzung: Migration `0008` ist bereits angewendet (nach dem Merge der Fall).
2. `npm ci && npm run build && firebase deploy --only hosting:vitaloop`, danach Hash-Sanity-Check (`curl -s https://vitaloop.web.app/ | grep -o 'index-[A-Za-z0-9_-]*\.js'` gegen `dist/assets/`).
3. `/training/exercises` öffnen: jede Zeile zeigt ein Vorschaubild (oder das Platzhalter-Icon bei eigenen Übungen ohne Bild).
4. Auf eine importierte Übung klicken: Popup zeigt Bild, Name, Muskelgruppen-/Geräte-Tags, Schwierigkeitsgrad und eine nummerierte Anleitung.
5. Eine Übung ohne Instructions in der Quelle anklicken (z. B. eine der 5 betroffenen — vorher per `node -e` gegen `scripts/free-exercise-db.json` identifizieren): Popup zeigt „Keine Anleitung hinterlegt." statt einer leeren Liste.
6. „Eigene Übung anlegen": alle sechs Felder ausfüllen (inkl. Bild-URL, Schwierigkeitsgrad, mehrzeilige Anleitung), speichern, danach die neue Übung anklicken — Popup zeigt die eingegebenen Werte korrekt.
7. Konsole auf Fehler/Warnungen prüfen.

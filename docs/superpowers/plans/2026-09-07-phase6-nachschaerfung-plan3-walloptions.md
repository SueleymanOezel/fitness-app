# Phase-6-Nachschärfung Plan 3: Wall-of-Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Break up the two "wall of equally-weighted options" findings from the impeccable critique — an ungrouped 873-row exercise list, and four identically-styled "+ Hinzufügen" buttons on the nutrition entries page — using only the design-system building blocks that already exist.

**Architecture:** `ExercisesPage.tsx` gets a muscle-group `Chip` filter row, derived from the already-loaded `exercises` data (`muskelgruppen_primaer`) — no new query, no new database column, no hard-coded muscle-group list. `NutritionEntriesPage.tsx`'s per-section "+ Hinzufügen" button switches between `buttonPrimaryClass` and `buttonSecondaryClass` based on the section's position in the rendered list — the first section is primary, the rest are secondary. Both changes are pure frontend, no schema, no new dependency.

**Tech Stack:** React + TypeScript, existing `Chip`/`buttonPrimaryClass`/`buttonSecondaryClass` from `src/lib/ui-classes.ts` and `src/components/Chip.tsx` (built in Phase 6 Plan 1), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-06-phase6-nachschaerfung-design.md` (see "Plan 3: Wall-of-Options" section)

## Global Constraints

- No new dependency, no new design primitive — `Chip`, `buttonPrimaryClass`, `buttonSecondaryClass` already exist and are reused as-is.
- No new Supabase query, no new column — `exercises.muskelgruppen_primaer` is already loaded by `useExercises`.
- Fix depth stays tight to the two findings named in the spec (Nicht-Ziele: "Fix-Tiefe eng am Befund") — no unrelated cleanup on either page.
- Test convention: assert on rendered `className`/`toHaveClass`, never on source text (established since Phase 6).
- Card-in-list hazard: `cardClass` never goes directly on an `<li>` — not touched by this plan (`ExercisesPage.tsx`'s existing `<li className="block border-b-0"><div className={cardClass + ' w-full'}>` pattern is untouched).

---

### Task 1: Muskelgruppen-Chip-Filterreihe auf ExercisesPage

**Files:**
- Modify: `src/pages/ExercisesPage.tsx`
- Test: `src/pages/ExercisesPage.test.tsx`

**Interfaces:**
- Consumes: `Chip` (`src/components/Chip.tsx`, default export, props `{ active: boolean } & ButtonHTMLAttributes<HTMLButtonElement>`), `Exercise.muskelgruppen_primaer: string[] | null` (`src/hooks/use-exercises.ts`, already imported transitively via `useExercises`).
- Produces: nothing new consumed by other tasks — Task 2 touches a different file with no shared interface.

**Current state of the relevant part of `src/pages/ExercisesPage.tsx` (verify this matches before editing — if it doesn't, stop and report the mismatch instead of guessing):**

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useExercises } from '../hooks/use-exercises'
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'

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
  const { exercises, loading, error: loadError, createExercise } = useExercises(userId)
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  if (loading) {
    return (
      <div>
        <h1>Übungen</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (loadError) {
    // A partly loaded library would look complete and quietly hide exercises.
    // This blocks the whole page, so it stays inline rather than a toast
    // that would vanish while the page is still broken.
    return (
      <div>
        <h1>Übungen</h1>
        <p role="alert">Übungen konnten nicht geladen werden.</p>
        <Link to="/training">Zurück zum Training</Link>
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
      <ul role="list" className="space-y-4">
        {filtered.map((exercise) => (
          <li key={exercise.id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>{exercise.name}</div>
          </li>
        ))}
      </ul>
      <button type="button" className={buttonPrimaryClass} onClick={() => setDialogOpen(true)}>
        Eigene Übung anlegen
      </button>
      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the form only while open forces a fresh instance (blank
          fields) each time it opens, instead of showing the last attempt's
          leftover values on reopen. */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        {dialogOpen && (
          <NewExerciseForm
            onSave={async (input) => {
              await createExercise(input)
              setDialogOpen(false)
            }}
            onCancel={() => setDialogOpen(false)}
          />
        )}
      </Dialog>
      <Link to="/training">Zurück zum Training</Link>
    </div>
  )
}
```

`NewExerciseForm` below it is untouched by this task.

- [ ] **Step 1: Write the failing tests**

Add these four tests to `src/pages/ExercisesPage.test.tsx`, right after the existing `'lists exercises and filters by name as the user types'` test (inside the same `describe('ExercisesPage', ...)` block):

```tsx
  it('filters by muscle group when a chip is selected', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [
          exercise,
          { ...exercise, id: 'ex2', name: 'Kniebeuge', muskelgruppen_primaer: ['quadriceps'] },
        ],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.getByText('Kniebeuge')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'chest' }))

    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.queryByText('Kniebeuge')).not.toBeInTheDocument()
  })

  it('resets the muscle-group filter with the Alle chip', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [
          exercise,
          { ...exercise, id: 'ex2', name: 'Kniebeuge', muskelgruppen_primaer: ['quadriceps'] },
        ],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'chest' }))
    expect(screen.queryByText('Kniebeuge')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Alle' }))
    expect(screen.getByText('Kniebeuge')).toBeInTheDocument()
  })

  it('combines the muscle-group filter with the name search', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [
          exercise,
          { ...exercise, id: 'ex2', name: 'Schrägbankdrücken', muskelgruppen_primaer: ['chest'] },
        ],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'chest' }))
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Schräg' } })

    expect(screen.queryByText('Bankdrücken')).not.toBeInTheDocument()
    expect(screen.getByText('Schrägbankdrücken')).toBeInTheDocument()
  })

  it('hides the filter row when no exercise has a muscle group', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [{ ...exercise, muskelgruppen_primaer: null }],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    expect(screen.queryByRole('button', { name: 'Alle' })).not.toBeInTheDocument()
  })
```

The existing `exercise` fixture (top of the file) already has `muskelgruppen_primaer: ['chest']` — do not change it.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/ExercisesPage.test.tsx`
Expected: the four new tests FAIL — `getByRole('button', { name: 'chest' })` / `{ name: 'Alle' }` find nothing, because no chip row exists yet.

- [ ] **Step 3: Implement the muscle-group filter**

In `src/pages/ExercisesPage.tsx`:

1. Add the `Chip` import next to the `Dialog` import:

```tsx
import Dialog from '../components/Dialog'
import Chip from '../components/Chip'
```

2. Inside `ExercisesList`, add a second piece of state right after `query`:

```tsx
  const [query, setQuery] = useState('')
  const [muskelgruppe, setMuskelgruppe] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
```

3. Replace the single `filtered` line with the muscle-group list and the combined filter:

```tsx
  const muskelgruppen = [...new Set(exercises.flatMap((exercise) => exercise.muskelgruppen_primaer ?? []))].sort(
    (a, b) => a.localeCompare(b, 'de'),
  )

  const filtered = exercises.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(query.toLowerCase()) &&
      (muskelgruppe === null || (exercise.muskelgruppen_primaer ?? []).includes(muskelgruppe)),
  )
```

4. Render the chip row between `<h1>Übungen</h1>` and the search `<label>`, only when there is at least one muscle group to filter by:

```tsx
  return (
    <div>
      <h1>Übungen</h1>
      {muskelgruppen.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip active={muskelgruppe === null} onClick={() => setMuskelgruppe(null)}>
            Alle
          </Chip>
          {muskelgruppen.map((gruppe) => (
            <Chip key={gruppe} active={muskelgruppe === gruppe} onClick={() => setMuskelgruppe(gruppe)}>
              {gruppe}
            </Chip>
          ))}
        </div>
      )}
      <label>
        Suche
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
```

Everything else in the file (the `<ul>`, the "Eigene Übung anlegen" button, the `Dialog`, `NewExerciseForm`) is unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/ExercisesPage.test.tsx`
Expected: all tests PASS, including the pre-existing ones (the name-search test still exercises the `filtered` variable, now combined with a `muskelgruppe === null` no-op condition).

- [ ] **Step 5: Full local verification**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ExercisesPage.tsx src/pages/ExercisesPage.test.tsx
git commit -m "feat: Muskelgruppen-Chip-Filterreihe auf der Uebungsliste"
```

---

### Task 2: Button-Rangfolge auf NutritionEntriesPage

**Files:**
- Modify: `src/pages/NutritionEntriesPage.tsx`
- Test: `src/pages/NutritionEntriesPage.test.tsx`

**Interfaces:**
- Consumes: `buttonSecondaryClass` (`src/lib/ui-classes.ts`, already imported by many other pages, not yet by this one).
- Produces: nothing consumed by other tasks.

**Current state of the relevant part of `src/pages/NutritionEntriesPage.tsx` (verify this matches before editing):**

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries, type EntryPatch, type FoodEntry } from '../hooks/use-food-entries'
import { mealSections, visibleSections, type MealSection } from '../lib/meal-sections'
import { sumKalorien } from '../lib/entry-calories'
import FoodEntryList from '../components/FoodEntryList'
import AddEntryFlow from '../components/AddEntryFlow'
import { buttonPrimaryClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
```

```tsx
  return (
    <div>
      <h1>Einträge heute</h1>
      {sections.map((section) => {
        // Bound to a const so the narrowing survives into the callback below —
        // TypeScript does not keep a property narrowing across a closure.
        const slot = section.slot
        const sectionEntries = entries.filter((entry) => entry.mahlzeit === slot)
        return (
          <SectionBlock
            key={slot ?? 'unassigned'}
            slot={slot}
            name={section.name}
            entries={sectionEntries}
            userId={userId}
            assignable={assignable}
            addEntry={addEntry}
            updateEntry={updateEntry}
            deleteEntry={deleteEntry}
          />
        )
      })}
      <Link to="/nutrition">Zurück zur Ernährung</Link>
    </div>
  )
}

function SectionBlock({
  slot,
  name,
  entries,
  userId,
  assignable,
  addEntry,
  updateEntry,
  deleteEntry,
}: {
  slot: number | null
  name: string
  entries: FoodEntry[]
  userId: string
  assignable: MealSection[]
  addEntry: (productId: string, menge: number, mahlzeit: number | null) => Promise<void>
  updateEntry: (entryId: string, patch: EntryPatch) => Promise<void>
  deleteEntry: (entryId: string) => Promise<void>
}) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <section>
      <h2>{`${name} — ${Math.round(sumKalorien(entries))} kcal`}</h2>
      <FoodEntryList
        entries={entries}
        userId={userId}
        sections={assignable}
        onUpdateEntry={updateEntry}
        onDelete={deleteEntry}
      />
      {/* No add button for the unassigned group — nothing new belongs there. */}
      {slot !== null && (
        <>
          <button type="button" className={buttonPrimaryClass} onClick={() => setDialogOpen(true)}>
            + Hinzufügen
          </button>
          {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
              rendering AddEntryFlow only while open resets its product/quantity/error
              state each time it opens, instead of showing the last attempt's leftovers. */}
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            {dialogOpen && (
              <AddEntryFlow
                onAdd={async (productId, menge) => {
                  await addEntry(productId, menge, slot)
                  setDialogOpen(false)
                }}
                onCancel={() => setDialogOpen(false)}
              />
            )}
          </Dialog>
        </>
      )}
    </section>
  )
}
```

`ExercisesPage.tsx` is a different file with no shared state — this task has no interface dependency on Task 1.

- [ ] **Step 1: Write the failing test**

Add this test to `src/pages/NutritionEntriesPage.test.tsx`, right after the existing `'groups the entries by section and sums each one'` test (inside the same `describe('NutritionEntriesPage', ...)` block):

```tsx
  it('gives only the first section a primary add button, the rest secondary', async () => {
    await renderPage(entriesResult({ entries: [] }))

    const fruehstueckHeading = screen.getByRole('heading', { name: /Frühstück/ })
    const fruehstueckButton = within(fruehstueckHeading.closest('section') as HTMLElement).getByRole('button', {
      name: '+ Hinzufügen',
    })
    expect(fruehstueckButton).toHaveClass('bg-accent')

    const mittagessenHeading = screen.getByRole('heading', { name: /Mittagessen/ })
    const mittagessenButton = within(mittagessenHeading.closest('section') as HTMLElement).getByRole('button', {
      name: '+ Hinzufügen',
    })
    expect(mittagessenButton).not.toHaveClass('bg-accent')

    const abendessenHeading = screen.getByRole('heading', { name: /Abendessen/ })
    const abendessenButton = within(abendessenHeading.closest('section') as HTMLElement).getByRole('button', {
      name: '+ Hinzufügen',
    })
    expect(abendessenButton).not.toHaveClass('bg-accent')
  })
```

`within` is already imported at the top of this test file (`import { fireEvent, screen, waitFor, within } from '@testing-library/react'`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/NutritionEntriesPage.test.tsx`
Expected: FAIL — `mittagessenButton`/`abendessenButton` currently also have `bg-accent` (all four buttons use `buttonPrimaryClass` today), so the `not.toHaveClass('bg-accent')` assertions fail.

- [ ] **Step 3: Implement the primary/secondary split**

In `src/pages/NutritionEntriesPage.tsx`:

1. Import `buttonSecondaryClass` alongside `buttonPrimaryClass`:

```tsx
import { buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
```

2. In `EntriesBySection`, add the `index` parameter to the `sections.map` call and pass a new `isPrimaryAdd` prop:

```tsx
      {sections.map((section, index) => {
        // Bound to a const so the narrowing survives into the callback below —
        // TypeScript does not keep a property narrowing across a closure.
        const slot = section.slot
        const sectionEntries = entries.filter((entry) => entry.mahlzeit === slot)
        return (
          <SectionBlock
            key={slot ?? 'unassigned'}
            slot={slot}
            name={section.name}
            entries={sectionEntries}
            userId={userId}
            assignable={assignable}
            addEntry={addEntry}
            updateEntry={updateEntry}
            deleteEntry={deleteEntry}
            isPrimaryAdd={index === 0}
          />
        )
      })}
```

3. Add `isPrimaryAdd: boolean` to `SectionBlock`'s props type and destructure it, then use it to pick the button class:

```tsx
function SectionBlock({
  slot,
  name,
  entries,
  userId,
  assignable,
  addEntry,
  updateEntry,
  deleteEntry,
  isPrimaryAdd,
}: {
  slot: number | null
  name: string
  entries: FoodEntry[]
  userId: string
  assignable: MealSection[]
  addEntry: (productId: string, menge: number, mahlzeit: number | null) => Promise<void>
  updateEntry: (entryId: string, patch: EntryPatch) => Promise<void>
  deleteEntry: (entryId: string) => Promise<void>
  isPrimaryAdd: boolean
}) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <section>
      <h2>{`${name} — ${Math.round(sumKalorien(entries))} kcal`}</h2>
      <FoodEntryList
        entries={entries}
        userId={userId}
        sections={assignable}
        onUpdateEntry={updateEntry}
        onDelete={deleteEntry}
      />
      {/* No add button for the unassigned group — nothing new belongs there. */}
      {slot !== null && (
        <>
          <button
            type="button"
            className={isPrimaryAdd ? buttonPrimaryClass : buttonSecondaryClass}
            onClick={() => setDialogOpen(true)}
          >
            + Hinzufügen
          </button>
          {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
              rendering AddEntryFlow only while open resets its product/quantity/error
              state each time it opens, instead of showing the last attempt's leftovers. */}
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            {dialogOpen && (
              <AddEntryFlow
                onAdd={async (productId, menge) => {
                  await addEntry(productId, menge, slot)
                  setDialogOpen(false)
                }}
                onCancel={() => setDialogOpen(false)}
              />
            )}
          </Dialog>
        </>
      )}
    </section>
  )
}
```

Note: `visibleSections` (in `src/lib/meal-sections.ts`, not modified by this task) always returns named sections in slot order (1–6) with the unassigned group last, so `index === 0` deterministically means "the first named section" — normally Frühstück (slot 1), since that is the first slot with a non-empty name for every existing profile. The unassigned group can never be primary because it has no add button at all (`slot !== null` guard, unchanged).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/NutritionEntriesPage.test.tsx`
Expected: all tests PASS, including this new one and the pre-existing `'collapses the capture flow behind a button and does not offer one for unassigned entries'` test (which only counts buttons, not their class, so it is unaffected).

- [ ] **Step 5: Full local verification**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/pages/NutritionEntriesPage.tsx src/pages/NutritionEntriesPage.test.tsx
git commit -m "feat: Erste Mahlzeiten-Sektion bekommt den primaeren Hinzufuegen-Button"
```

---

### Task 3: Abschluss

**Files:**
- Modify: `docs/domaenenmodell.md` (only if it turns out to need a change — see Step 2)
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: the finished state of Task 1 and Task 2 (docs-only, no code interface).
- Produces: nothing — last task of this plan.

- [ ] **Step 1: Full test suite, lint, typecheck, build**

Run: `npm test -- --run && npm run lint && npx tsc -b --noEmit && npm run build`
Expected: all four green. Note the known cold-start flake documented in `CLAUDE.md` (Phase 5 section, "Fünf Dinge, die beim Weiterbauen gelten"): a first `npm test -- --run` pass can show timeouts in the `React.lazy` chart-list tests on this machine — unrelated to this plan (it touches no chart component). If that happens, re-run once; a clean re-run is the real signal. Record the bundle numbers (no new dependency, no new file beyond the two test files, so the entry chunk should be within a few hundred bytes of the Plan-2 baseline).

- [ ] **Step 2: `docs/domaenenmodell.md` check**

This plan touches no database table, column, or query — `useExercises` and the meal-section hooks are unchanged, only two pages' rendering/filtering logic. Read the last "Quelle:"-line of `docs/domaenenmodell.md` and confirm the last migration is still `0007` (unchanged since Phase 6). Make no edit if that already holds.

- [ ] **Step 3: Manual browser verification**

Both changed pages sit behind `ProtectedRoute` and their real hooks call Supabase — as with Plan 2, verify via a throwaway test page rather than the real app, since the worktree has no `.env`:

1. Create a temporary `.env` with dummy values (not real credentials — only satisfies `src/lib/supabase.ts`'s presence check, no request ever reaches it because the throwaway page bypasses the real hooks):

```bash
printf 'VITE_SUPABASE_URL=https://dummy.supabase.co\nVITE_SUPABASE_ANON_KEY=dummy-anon-key\n' > .env
```

2. Temporarily export the two components that need fixture data to render standalone. In `src/pages/ExercisesPage.tsx`, change `function ExercisesList(` to `export function ExercisesList(` (temporary — revert in Step 5). `NutritionEntriesPage.tsx`'s `EntriesBySection` needs the same temporary `export`.

3. Create `src/pages/TestPlayPage.tsx` (temporary, not committed):

```tsx
import { ExercisesList } from './ExercisesPage'
import { EntriesBySection } from './NutritionEntriesPage'

export default function TestPlayPage() {
  return (
    <div>
      <h1>ExercisesList test</h1>
      <ExercisesList userId="test" />
      <hr />
      <h1>NutritionEntriesPage test</h1>
      <EntriesBySection userId="test" />
    </div>
  )
}
```

Note: `ExercisesList` and `EntriesBySection` both call real Supabase-backed hooks (`useExercises`, `useProfile`, `useFoodEntries`) internally — they will show their loading/error state against the dummy `.env`, not real data. That is enough to verify the two *static* changes in this plan (does the chip row render and space correctly once there's a muscle-group list; does the button-class split apply), but not enough to see real exercise names or meal sections. If this loading/error state makes visual verification impossible, fall back to a pure-fixture throwaway page instead — render `Chip` rows and both button classes directly with hard-coded muscle-group strings and hard-coded section indices, mirroring exactly what `ExercisesList`/`SectionBlock` produce, and verify layout/spacing/color that way instead. Prefer option 1 (real components) if the loading state resolves fast enough to inspect the real render; use option 2 only if it does not.

4. Add a temporary route in `src/App.tsx`, next to `/login`:

```tsx
        <Route path="/login" element={<LoginPage />} />
        <Route path="/testplay" element={<TestPlayPage />} />
```

(plus the matching `import TestPlayPage from './pages/TestPlayPage'` near the top).

5. Start the dev server (`npm run dev`) and open `/testplay` with `playwright-cli` (per the project's browser-verification convention — see CLAUDE.md "Design-Workflow"). Check:
   - The muscle-group chip row renders with visible gaps between chips (`flex flex-wrap gap-2`, same as `ZeitraumSwitch`), an "Alle" chip plus one chip per distinct muscle group, `getComputedStyle` on the active chip shows `background-color` matching `bg-accent` and on an inactive chip shows `bg-surface`.
   - Clicking a muscle-group chip actually filters the rendered exercise list (if using the real-component approach and fixture data is reachable; otherwise confirm this from Task 1's passing tests instead, and note that in the write-up).
   - On the nutrition side, only the first section's "+ Hinzufügen" button has `background-color` matching `bg-accent` (`getComputedStyle`), the rest show `bg-surface` — same computed-style check as Plan 2 used for its buttons.
   - No console errors.

6. Take screenshots for the record if useful, but do not commit them.

- [ ] **Step 4: Revert the throwaway scaffolding**

```bash
rm -f src/pages/TestPlayPage.tsx .env
```

Revert the two temporary `export` keywords in `ExercisesPage.tsx` and `NutritionEntriesPage.tsx` back to unexported, and revert the temporary route/import in `App.tsx`. Confirm with `git status --short` that only the real Task 1/Task 2 files (plus this task's doc files) show as modified — no `TestPlayPage.tsx`, no `.env`, no `App.tsx` diff.

- [ ] **Step 5: Update `CLAUDE.md`**

In the "Status / Fortschritt" section, add a new paragraph "Phase-6-Nachschärfung Plan 3 (Wall-of-Options)": spec path, plan path, short description (muscle-group chip filter on `/training/exercises`, primary/secondary button split on `/nutrition/entries`), the bundle numbers from Step 1, and an honest note on what Step 3's manual verification could and could not confirm (component-level via fixture/throwaway page, not the real authenticated data — matching Plan 2's precedent). State plainly: **code on the branch finished and reviewed, not yet merged.** Update "Genau hier weitermachen" to point at this plan's PR/merge/deploy as the next step, and note that after Plan 3 merges and deploys, the spec's closing step is a `/impeccable critique` re-run against the live app to document the score trend (see spec, "Reihenfolge und Abhängigkeiten") — not part of this plan's own scope, a follow-up for the next chat/step.

- [ ] **Step 6: Commit**

```bash
git add docs/domaenenmodell.md CLAUDE.md
git commit -m "docs: Plan 3 (Wall-of-Options) Abschluss - Status nachziehen"
```

(Only `git add docs/domaenenmodell.md` if Step 2 actually changed it — otherwise commit `CLAUDE.md` alone.)

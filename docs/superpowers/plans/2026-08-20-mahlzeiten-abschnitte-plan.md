# Mahlzeiten-Abschnitte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einträge nach Mahlzeiten gliedern — sechs feste Slots, vier vorbelegt, Namen im Profil, Zuordnung am Eintrag.

**Architecture:** Eine Migration ergänzt sechs Namensspalten auf `profiles` und ein `mahlzeit`-Feld auf `food_entries`. Ein Bibliotheksmodul leitet aus Profil und Einträgen ab, welche Abschnitte anzuzeigen sind. Die Eintragsseite gruppiert danach und gibt jedem Abschnitt einen eigenen Erfassungs-Flow; das Dashboard zeigt die Abschnitte als verlinkte Kalorienzeilen.

**Tech Stack:** React 19 + TypeScript, Vite 8, Vitest 4 mit jsdom + Testing Library, Supabase (postgrest-js), React Router 7.

**Spec:** `docs/superpowers/specs/2026-08-20-mahlzeiten-abschnitte-design.md`

## Global Constraints

- **Migration `0003_meal_sections.sql`** ist die einzige Schemaänderung. Keine neue Tabelle, keine neue RLS-Policy.
- Slots sind **stabile Nummern 1–6**. Niemals über Array-Positionen zuordnen: Beim Entfernen eines Abschnitts würden sonst alle nachfolgenden Einträge still auf den falschen Abschnitt zeigen.
- `food_entries.mahlzeit` ist **nullable**. Bestehende Einträge behalten „keine Zuordnung" und erscheinen in einer Gruppe „Ohne Zuordnung", die nur sichtbar ist, solange sie Einträge enthält.
- Ein belegter Slot ohne Namen bleibt sichtbar (als `Abschnitt <N>`), sonst verschwänden Einträge aus der Ansicht, ohne gelöscht zu sein.
- Abschnittsnamen auf **40 Zeichen** begrenzt. Die vier vorbelegten sind `not null`; leert der Nutzer eines, setzt das Formular den Standardnamen wieder ein.
- Standardnamen: `Frühstück`, `Mittagessen`, `Abendessen`, `Snacks`.
- Keine Namen von Drittanbieter-Apps in Code, Kommentaren oder Commit-Messages.
- Code und Bezeichner englisch, Oberflächentexte deutsch. Dateien kebab-case, Komponenten PascalCase.
- Schreibpfade werfen bei Fehlern; supabase-js liefert Fehler als Rückgabewert, nicht als Exception.
- Nie allein auf `Number.isNaN` prüfen: `Number('')` ergibt 0, nicht NaN.
- Vor jedem Commit: `npm test`, `npm run lint`, `npx tsc -b --noEmit` grün.
- TDD: erst der fehlschlagende Test, Fehlschlag beobachten, dann die minimale Implementierung.

---

### Task 1: Migration 0003

**Files:**
- Create: `supabase/migrations/0003_meal_sections.sql`
- Create: `supabase/migrations/0003_meal_sections.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: Spalten `profiles.mahlzeit_1_name … mahlzeit_6_name`, `food_entries.mahlzeit`

- [ ] **Step 1: Write the failing test**

`supabase/migrations/0003_meal_sections.test.ts` — dasselbe Muster wie `0002_nutrition_profile_fields.test.ts` (liest die SQL-Datei und prüft ihren Text):

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0003_meal_sections.sql'), 'utf-8')

describe('0003_meal_sections.sql', () => {
  it('adds the four preset section names with their defaults', () => {
    expect(sql).toMatch(/add column mahlzeit_1_name text not null default 'Frühstück'/)
    expect(sql).toMatch(/add column mahlzeit_2_name text not null default 'Mittagessen'/)
    expect(sql).toMatch(/add column mahlzeit_3_name text not null default 'Abendessen'/)
    expect(sql).toMatch(/add column mahlzeit_4_name text not null default 'Snacks'/)
  })

  it('adds the two optional section names as nullable', () => {
    expect(sql).toMatch(/add column mahlzeit_5_name text(?!\s+not null)/)
    expect(sql).toMatch(/add column mahlzeit_6_name text(?!\s+not null)/)
  })

  it('adds a nullable slot column to food_entries, constrained to 1-6', () => {
    // Nullable on purpose: entries logged before this migration have no section,
    // and a default would file them under a meal they never belonged to.
    expect(sql).toMatch(/alter table public\.food_entries/)
    expect(sql).toMatch(/add column mahlzeit smallint check \(mahlzeit between 1 and 6\)/)
  })

  it('adds no table and no policy', () => {
    expect(sql).not.toMatch(/create table/i)
    expect(sql).not.toMatch(/create policy/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run supabase/migrations/0003_meal_sections.test.ts`
Expected: FAIL — `ENOENT`, die SQL-Datei existiert nicht

- [ ] **Step 3: Write the migration**

`supabase/migrations/0003_meal_sections.sql`:

```sql
-- Meal sections: fixed slots 1-6. The names live on the profile, the slot on the
-- entry. Stable numbers rather than array positions — removing a section must not
-- silently move every entry after it into a different meal.

alter table public.profiles
  add column mahlzeit_1_name text not null default 'Frühstück',
  add column mahlzeit_2_name text not null default 'Mittagessen',
  add column mahlzeit_3_name text not null default 'Abendessen',
  add column mahlzeit_4_name text not null default 'Snacks',
  add column mahlzeit_5_name text,
  add column mahlzeit_6_name text;

-- Nullable: entries logged before this migration have no section. They show up
-- under "Ohne Zuordnung" until the user files them.
alter table public.food_entries
  add column mahlzeit smallint check (mahlzeit between 1 and 6);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run supabase/migrations/0003_meal_sections.test.ts`
Expected: PASS, 4 Tests

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_meal_sections.sql supabase/migrations/0003_meal_sections.test.ts
git commit -m "feat: add meal section columns"
```

---

### Task 2: Profil kennt die Abschnittsnamen

**Files:**
- Modify: `src/hooks/use-profile.ts`
- Modify: `src/pages/ProfilePage.tsx`
- Modify: `src/pages/ProfilePage.test.tsx`

**Interfaces:**
- Consumes: nichts
- Produces: `Profile` um `mahlzeit_1_name … mahlzeit_4_name: string` und `mahlzeit_5_name`, `mahlzeit_6_name: string | null` erweitert; die Profilseite speichert sie mit.

- [ ] **Step 1: Write the failing test**

In `src/pages/ProfilePage.test.tsx` das `profile`-Objekt um die sechs Felder erweitern:

```tsx
  mahlzeit_1_name: 'Frühstück',
  mahlzeit_2_name: 'Mittagessen',
  mahlzeit_3_name: 'Abendessen',
  mahlzeit_4_name: 'Snacks',
  mahlzeit_5_name: null,
  mahlzeit_6_name: null,
```

Und diese Tests ergänzen:

```tsx
  it('shows the meal section names', async () => {
    await renderPage()

    expect(screen.getByLabelText('Mahlzeit 1')).toHaveValue('Frühstück')
    expect(screen.getByLabelText('Mahlzeit 4')).toHaveValue('Snacks')
    expect(screen.getByLabelText('Mahlzeit 5')).toHaveValue('')
  })

  it('saves renamed and newly added sections', async () => {
    const result = await renderPage()

    fireEvent.change(screen.getByLabelText('Mahlzeit 4'), { target: { value: 'Zwischenmahlzeit' } })
    fireEvent.change(screen.getByLabelText('Mahlzeit 5'), { target: { value: 'Spätmahlzeit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(result.updateProfile).toHaveBeenCalled())
    expect(result.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        mahlzeit_4_name: 'Zwischenmahlzeit',
        mahlzeit_5_name: 'Spätmahlzeit',
        mahlzeit_6_name: null,
      }),
    )
  })

  it('restores the default when a preset section name is cleared', async () => {
    const result = await renderPage()

    // The column is NOT NULL — an empty title would be rejected by the database,
    // and a rejected save is a worse answer than putting the default back.
    fireEvent.change(screen.getByLabelText('Mahlzeit 1'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(result.updateProfile).toHaveBeenCalled())
    expect(result.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ mahlzeit_1_name: 'Frühstück' }),
    )
  })

  it('caps a section name at 40 characters', async () => {
    const result = await renderPage()

    fireEvent.change(screen.getByLabelText('Mahlzeit 5'), { target: { value: 'x'.repeat(60) } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(result.updateProfile).toHaveBeenCalled())
    expect(result.updateProfile.mock.calls[0][0].mahlzeit_5_name).toHaveLength(40)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/pages/ProfilePage.test.tsx`
Expected: FAIL — `Unable to find a label with the text of: Mahlzeit 1`

- [ ] **Step 3: Extend the Profile type**

In `src/hooks/use-profile.ts` den Typ `Profile` ergänzen:

```ts
  mahlzeit_1_name: string
  mahlzeit_2_name: string
  mahlzeit_3_name: string
  mahlzeit_4_name: string
  mahlzeit_5_name: string | null
  mahlzeit_6_name: string | null
```

- [ ] **Step 4: Add the section fields to the profile form**

In `src/pages/ProfilePage.tsx`:

```tsx
export const MAX_SECTION_NAME_LENGTH = 40

const PRESET_SECTION_NAMES = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snacks'] as const
```

Den `Draft`-Typ um sechs Felder erweitern:

```ts
  mahlzeit_1_name: string
  mahlzeit_2_name: string
  mahlzeit_3_name: string
  mahlzeit_4_name: string
  mahlzeit_5_name: string
  mahlzeit_6_name: string
```

In `toDraft` ergänzen:

```ts
    mahlzeit_1_name: profile.mahlzeit_1_name,
    mahlzeit_2_name: profile.mahlzeit_2_name,
    mahlzeit_3_name: profile.mahlzeit_3_name,
    mahlzeit_4_name: profile.mahlzeit_4_name,
    mahlzeit_5_name: profile.mahlzeit_5_name ?? '',
    mahlzeit_6_name: profile.mahlzeit_6_name ?? '',
```

In `toPatch` vor dem `return` einfügen und ins zurückgegebene Objekt aufnehmen:

```ts
  // Slots 1-4 are NOT NULL in the database; an emptied field falls back to its
  // default instead of failing the save. Slots 5 and 6 may stay empty.
  const sectionName = (value: string, slot: number) => {
    const trimmed = value.trim().slice(0, MAX_SECTION_NAME_LENGTH)
    if (trimmed) return trimmed
    return slot <= 4 ? PRESET_SECTION_NAMES[slot - 1] : null
  }
```

```ts
    mahlzeit_1_name: sectionName(draft.mahlzeit_1_name, 1) as string,
    mahlzeit_2_name: sectionName(draft.mahlzeit_2_name, 2) as string,
    mahlzeit_3_name: sectionName(draft.mahlzeit_3_name, 3) as string,
    mahlzeit_4_name: sectionName(draft.mahlzeit_4_name, 4) as string,
    mahlzeit_5_name: sectionName(draft.mahlzeit_5_name, 5),
    mahlzeit_6_name: sectionName(draft.mahlzeit_6_name, 6),
```

Im Formular nach dem Ziel-Delta-Feld:

```tsx
        <fieldset>
          <legend>Mahlzeiten</legend>
          <p>Leere Felder werden nicht angezeigt. Die ersten vier lassen sich nur umbenennen.</p>
          {([1, 2, 3, 4, 5, 6] as const).map((slot) => (
            <label key={slot}>
              {`Mahlzeit ${slot}`}
              <input
                maxLength={MAX_SECTION_NAME_LENGTH}
                value={draft[`mahlzeit_${slot}_name` as const]}
                onChange={(event) => set(`mahlzeit_${slot}_name` as const, event.target.value)}
              />
            </label>
          ))}
        </fieldset>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run --dir src src/pages/ProfilePage.test.tsx`
Expected: PASS

- [ ] **Step 6: Fix the other Profile fixtures**

`npx tsc -b --noEmit` meldet jetzt unvollständige `Profile`-Objekte in `src/pages/NutritionPage.test.tsx`, `src/components/CalorieGoalEditor.test.tsx` und `src/hooks/use-profile.test.ts`. Ergänze dort dieselben sechs Felder wie in Step 1.

- [ ] **Step 7: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/hooks/use-profile.ts src/pages/ProfilePage.tsx src/pages/ProfilePage.test.tsx src/pages/NutritionPage.test.tsx src/components/CalorieGoalEditor.test.tsx src/hooks/use-profile.test.ts
git commit -m "feat: name the meal sections on the profile"
```

---

### Task 3: Abschnitte ableiten

**Files:**
- Create: `src/lib/meal-sections.ts`
- Create: `src/lib/meal-sections.test.ts`

**Interfaces:**
- Consumes: nichts (der Eingabetyp wird lokal definiert, damit die Bibliothek nicht am Hook hängt)
- Produces:
  - `type MealSectionNames = { mahlzeit_1_name: string; mahlzeit_2_name: string; mahlzeit_3_name: string; mahlzeit_4_name: string; mahlzeit_5_name: string | null; mahlzeit_6_name: string | null }`
  - `type MealSection = { slot: number; name: string }`
  - `type VisibleSection = { slot: number | null; name: string }`
  - `mealSections(names: MealSectionNames): MealSection[]`
  - `visibleSections(names: MealSectionNames, entries: { mahlzeit: number | null }[]): VisibleSection[]`
  - `UNASSIGNED_LABEL = 'Ohne Zuordnung'`

- [ ] **Step 1: Write the failing test**

`src/lib/meal-sections.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mealSections, visibleSections } from './meal-sections'

const names = {
  mahlzeit_1_name: 'Frühstück',
  mahlzeit_2_name: 'Mittagessen',
  mahlzeit_3_name: 'Abendessen',
  mahlzeit_4_name: 'Snacks',
  mahlzeit_5_name: null,
  mahlzeit_6_name: null,
}

describe('mealSections', () => {
  it('lists the named slots in order', () => {
    expect(mealSections(names)).toEqual([
      { slot: 1, name: 'Frühstück' },
      { slot: 2, name: 'Mittagessen' },
      { slot: 3, name: 'Abendessen' },
      { slot: 4, name: 'Snacks' },
    ])
  })

  it('includes an added section', () => {
    expect(mealSections({ ...names, mahlzeit_5_name: 'Spätmahlzeit' })).toHaveLength(5)
  })

  it('skips a slot whose name is blank', () => {
    expect(mealSections({ ...names, mahlzeit_5_name: '   ' })).toHaveLength(4)
  })
})

describe('visibleSections', () => {
  it('shows the named sections when every entry is filed', () => {
    const sections = visibleSections(names, [{ mahlzeit: 1 }, { mahlzeit: 4 }])
    expect(sections.map((section) => section.slot)).toEqual([1, 2, 3, 4])
  })

  it('appends the unassigned group only when such entries exist', () => {
    expect(visibleSections(names, [{ mahlzeit: 1 }]).some((s) => s.slot === null)).toBe(false)

    const withUnassigned = visibleSections(names, [{ mahlzeit: 1 }, { mahlzeit: null }])
    expect(withUnassigned[withUnassigned.length - 1]).toEqual({
      slot: null,
      name: 'Ohne Zuordnung',
    })
  })

  it('keeps an unnamed slot visible while it still holds entries', () => {
    // Otherwise those entries vanish from the page while still counting towards
    // the day's total — a number the user cannot trace back to anything.
    const sections = visibleSections(names, [{ mahlzeit: 5 }])
    expect(sections).toContainEqual({ slot: 5, name: 'Abschnitt 5' })
  })

  it('drops an unnamed slot once it is empty', () => {
    expect(visibleSections(names, [{ mahlzeit: 1 }]).some((s) => s.slot === 5)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/lib/meal-sections.test.ts`
Expected: FAIL — `Failed to resolve import "./meal-sections"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/meal-sections.ts`:

```ts
export type MealSectionNames = {
  mahlzeit_1_name: string
  mahlzeit_2_name: string
  mahlzeit_3_name: string
  mahlzeit_4_name: string
  mahlzeit_5_name: string | null
  mahlzeit_6_name: string | null
}

export type MealSection = { slot: number; name: string }
export type VisibleSection = { slot: number | null; name: string }

export const UNASSIGNED_LABEL = 'Ohne Zuordnung'

const SLOTS = [1, 2, 3, 4, 5, 6] as const

/** Read by slot number rather than by array position — the number is the stable key. */
function nameAt(names: MealSectionNames, slot: number): string | null {
  const raw = [
    names.mahlzeit_1_name,
    names.mahlzeit_2_name,
    names.mahlzeit_3_name,
    names.mahlzeit_4_name,
    names.mahlzeit_5_name,
    names.mahlzeit_6_name,
  ][slot - 1]
  const trimmed = raw?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

/** The sections in use: every slot that carries a name. */
export function mealSections(names: MealSectionNames): MealSection[] {
  return SLOTS.flatMap((slot) => {
    const name = nameAt(names, slot)
    return name === null ? [] : [{ slot, name }]
  })
}

/**
 * What the entries page renders. Beyond the named sections this keeps an unnamed
 * slot visible while it still holds entries — otherwise those entries disappear
 * from the page while still counting towards the day's total. The unassigned
 * group comes last and only when it is not empty.
 */
export function visibleSections(
  names: MealSectionNames,
  entries: { mahlzeit: number | null }[],
): VisibleSection[] {
  const used = new Set(entries.map((entry) => entry.mahlzeit))

  const sections: VisibleSection[] = SLOTS.flatMap((slot) => {
    const name = nameAt(names, slot)
    if (name !== null) return [{ slot, name }]
    return used.has(slot) ? [{ slot, name: `Abschnitt ${slot}` }] : []
  })

  if (used.has(null)) sections.push({ slot: null, name: UNASSIGNED_LABEL })
  return sections
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/lib/meal-sections.test.ts`
Expected: PASS, 8 Tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/meal-sections.ts src/lib/meal-sections.test.ts
git commit -m "feat: derive the meal sections to display"
```

---

### Task 4: Eintrag kennt seinen Abschnitt

**Files:**
- Modify: `src/hooks/use-food-entries.ts`
- Modify: `src/hooks/use-food-entries.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: `FoodEntry` um `mahlzeit: number | null` erweitert; `addEntry(productId: string, menge: number, mahlzeit: number | null): Promise<void>`; `EntryPatch` um `mahlzeit?: number | null` erweitert.

- [ ] **Step 1: Write the failing test**

In `src/hooks/use-food-entries.test.ts` ergänzen:

```ts
  it('files a new entry under the given section', async () => {
    const builder = createQueryBuilder({ data: [entry] })
    mockFrom.mockReturnValue(builder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.addEntry('p1', 150, 2)

    expect(builder.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      product_id: 'p1',
      menge: 150,
      mahlzeit: 2,
    })
  })

  it('loads the section of each entry', async () => {
    const builder = createQueryBuilder({ data: [entry] })
    mockFrom.mockReturnValue(builder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.select.mock.calls[0][0] as string).toContain('mahlzeit')
  })

  it('moves an entry to another section', async () => {
    const builder = createQueryBuilder({ data: [entry] })
    mockFrom.mockReturnValue(builder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.updateEntry('e1', { mahlzeit: 3 })

    expect(builder.update).toHaveBeenCalledWith({ mahlzeit: 3 })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/hooks/use-food-entries.test.ts`
Expected: FAIL — `insert` wurde ohne `mahlzeit` aufgerufen

- [ ] **Step 3: Write minimal implementation**

In `src/hooks/use-food-entries.ts`:

```ts
export type FoodEntry = {
  id: string
  menge: number
  zeitpunkt: string
  product_id: string | null
  mahlzeit: number | null
  products: {
```

```ts
export type EntryPatch = {
  menge?: number
  zeitpunkt?: string
  product_id?: string
  mahlzeit?: number | null
}
```

Die Select-Liste erweitern:

```ts
      .select(
        'id, menge, zeitpunkt, product_id, mahlzeit, products(id, name, barcode, created_by, kalorien, eiweiss, fett, kohlenhydrate)',
      )
```

Und `addEntry`:

```ts
  async function addEntry(productId: string, menge: number, mahlzeit: number | null) {
    const { error } = await supabase
      .from('food_entries')
      .insert({ user_id: userId, product_id: productId, menge, mahlzeit })
    if (error) throw new Error('insert failed')
    await reload()
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/hooks/use-food-entries.test.ts`
Expected: PASS

- [ ] **Step 5: Keep the callers compiling**

`npx tsc -b --noEmit` meldet jetzt fehlende `mahlzeit`-Felder in den `FoodEntry`-Fixtures von `src/components/DailySummary.test.tsx`, `src/components/FoodEntryList.test.tsx`, `src/components/FoodEntryEditForm.test.tsx` und `src/pages/NutritionEntriesPage.test.tsx` sowie den fehlenden dritten Parameter von `addEntry` in `src/components/AddEntryFlow.tsx`.

Ergänze in den Fixtures jeweils `mahlzeit: null`.

`AddEntryFlow` bleibt unverändert: Die Komponente erfährt ihren Abschnitt nicht selbst, sondern die aufrufende Seite bindet ihn in `onAdd` ein (so nutzt Task 6 dieselbe Komponente je Abschnitt). In `src/pages/NutritionPage.tsx` genügt daher vorerst:

```tsx
      <AddEntryFlow onAdd={(productId, menge) => addEntry(productId, menge, null)} />
```

- [ ] **Step 6: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/hooks/use-food-entries.ts src/hooks/use-food-entries.test.ts src/components/DailySummary.test.tsx src/components/FoodEntryList.test.tsx src/components/FoodEntryEditForm.test.tsx src/pages/NutritionEntriesPage.test.tsx src/pages/NutritionPage.tsx
git commit -m "feat: store and load the section of an entry"
```

---

### Task 5: Kalorien eines Eintrags an einer Stelle

`DailySummary` rechnet `kalorien × menge / 100` bereits; die Eintragsseite und das Dashboard brauchen dieselbe Rechnung je Abschnitt. Statt einer dritten Kopie bekommt sie ein eigenes Modul.

**Files:**
- Create: `src/lib/entry-calories.ts`
- Create: `src/lib/entry-calories.test.ts`
- Modify: `src/components/DailySummary.tsx`

**Interfaces:**
- Consumes: `FoodEntry` aus `src/hooks/use-food-entries.ts`
- Produces: `entryKalorien(entry: FoodEntry): number`, `sumKalorien(entries: FoodEntry[]): number`

- [ ] **Step 1: Write the failing test**

`src/lib/entry-calories.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { entryKalorien, sumKalorien } from './entry-calories'
import type { FoodEntry } from '../hooks/use-food-entries'

function entry(menge: number, kalorien: number | null): FoodEntry {
  return {
    id: 'e1',
    menge,
    zeitpunkt: '2026-08-20T06:30:00.000Z',
    product_id: kalorien === null ? null : 'p1',
    mahlzeit: null,
    products:
      kalorien === null
        ? null
        : {
            id: 'p1',
            name: 'Testprodukt',
            barcode: null,
            created_by: 'u1',
            kalorien,
            eiweiss: null,
            fett: null,
            kohlenhydrate: null,
          },
  }
}

describe('entryKalorien', () => {
  it('scales the per-100-g value by the amount', () => {
    expect(entryKalorien(entry(150, 100))).toBe(150)
  })

  it('counts a deleted product as zero', () => {
    expect(entryKalorien(entry(150, null))).toBe(0)
  })
})

describe('sumKalorien', () => {
  it('adds the entries up', () => {
    expect(sumKalorien([entry(150, 100), entry(50, 200)])).toBe(250)
  })

  it('is zero for no entries', () => {
    expect(sumKalorien([])).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/lib/entry-calories.test.ts`
Expected: FAIL — `Failed to resolve import "./entry-calories"`

- [ ] **Step 3: Write minimal implementation**

`src/lib/entry-calories.ts`:

```ts
import type { FoodEntry } from '../hooks/use-food-entries'

/** Nutritional values are stored per 100 g; an entry stores its amount in grams. */
export function entryKalorien(entry: FoodEntry): number {
  if (!entry.products) return 0
  return (entry.products.kalorien * entry.menge) / 100
}

export function sumKalorien(entries: FoodEntry[]): number {
  return entries.reduce((total, entry) => total + entryKalorien(entry), 0)
}
```

- [ ] **Step 4: Use it in DailySummary**

In `src/components/DailySummary.tsx` die lokale Funktion `sumKalorien` löschen und stattdessen importieren:

```tsx
import { sumKalorien } from '../lib/entry-calories'
```

`sumMakro` bleibt unverändert in der Komponente — Makros braucht sonst niemand.

- [ ] **Step 5: Run the tests and commit**

Run: `npx vitest run --dir src src/lib/entry-calories.test.ts src/components/DailySummary.test.tsx`
Expected: PASS, `DailySummary.test.tsx` unverändert grün

```bash
git add src/lib/entry-calories.ts src/lib/entry-calories.test.ts src/components/DailySummary.tsx
git commit -m "refactor: compute entry calories in one place"
```

---

### Task 6: Eintragsseite gruppiert nach Abschnitten

**Files:**
- Modify: `src/pages/NutritionEntriesPage.tsx`
- Modify: `src/pages/NutritionEntriesPage.test.tsx`

**Interfaces:**
- Consumes: `visibleSections`, `UNASSIGNED_LABEL` (Task 3), `sumKalorien` (Task 5), `addEntry(productId, menge, mahlzeit)` (Task 4), `useProfile`
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Write the failing test**

`src/pages/NutritionEntriesPage.test.tsx` — das `mockUseProfile` ergänzen (die Datei mockt bisher nur Session und Einträge) und diese Tests hinzufügen:

```tsx
const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))
```

```tsx
  it('groups the entries by section and sums each one', async () => {
    await renderPage(
      entriesResult({
        entries: [
          { ...entry, id: 'e1', mahlzeit: 1, menge: 150 },
          { ...entry, id: 'e2', mahlzeit: 2, menge: 50 },
        ],
      }),
    )

    const fruehstueck = screen.getByRole('heading', { name: /Frühstück/ })
    // 100 kcal per 100 g × 150 g
    expect(fruehstueck).toHaveTextContent('150 kcal')
    expect(screen.getByRole('heading', { name: /Mittagessen/ })).toHaveTextContent('50 kcal')
  })

  it('files a new entry under the section it was added from', async () => {
    const result = await renderPage(entriesResult({ entries: [] }))

    // Two sections, so a hard-coded slot cannot pass.
    const addButtons = screen.getAllByRole('button', { name: 'Barcode scannen' })
    expect(addButtons.length).toBeGreaterThan(1)

    fireEvent.change(screen.getAllByLabelText('Barcode-Nummer eingeben')[1], {
      target: { value: '8076809580144' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Suchen' })[1])

    await waitFor(() => expect(screen.getAllByLabelText('Menge (g)').length).toBeGreaterThan(0))
    fireEvent.click(screen.getAllByRole('button', { name: 'Hinzufügen' })[0])

    await waitFor(() => expect(result.addEntry).toHaveBeenCalled())
    expect(result.addEntry).toHaveBeenCalledWith('p1', 100, 2)
  })

  it('shows unassigned entries in their own group at the end', async () => {
    await renderPage(entriesResult({ entries: [{ ...entry, mahlzeit: null }] }))

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')
    expect(headings[headings.length - 1]).toContain('Ohne Zuordnung')
  })
```

Der Produkt-Lookup muss dafür gemockt sein:

```tsx
vi.mock('../lib/product-lookup', () => ({
  findOrFetchProductByBarcode: () =>
    Promise.resolve({ id: 'p1', name: 'Testprodukt', barcode: '8076809580144', kalorien: 100 }),
}))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/pages/NutritionEntriesPage.test.tsx`
Expected: FAIL — keine Überschrift „Frühstück"

- [ ] **Step 3: Write minimal implementation**

`src/pages/NutritionEntriesPage.tsx` vollständig ersetzen:

```tsx
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries, type FoodEntry } from '../hooks/use-food-entries'
import { visibleSections } from '../lib/meal-sections'
import { sumKalorien } from '../lib/entry-calories'
import FoodEntryList from '../components/FoodEntryList'
import AddEntryFlow from '../components/AddEntryFlow'

export default function NutritionEntriesPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Einträge heute</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <EntriesBySection userId={userId} />
}

function EntriesBySection({ userId }: { userId: string }) {
  const { profile, loading: profileLoading } = useProfile(userId)
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useFoodEntries(userId)

  if (loading || profileLoading || !profile) {
    return (
      <div>
        <h1>Einträge heute</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  const sections = visibleSections(profile, entries)

  return (
    <div>
      <h1>Einträge heute</h1>
      {sections.map((section) => {
        // Bound to a const so the narrowing survives into the callback below —
        // TypeScript does not keep a property narrowing across a closure.
        const slot = section.slot
        const sectionEntries = entries.filter((entry) => entry.mahlzeit === slot)
        return (
          <section key={slot ?? 'unassigned'}>
            <h2>{`${section.name} — ${Math.round(sumKalorien(sectionEntries))} kcal`}</h2>
            <FoodEntryList
              entries={sectionEntries}
              userId={userId}
              onUpdateEntry={updateEntry}
              onDelete={deleteEntry}
            />
            {/* No add button for the unassigned group — nothing new belongs there. */}
            {slot !== null && (
              <AddEntryFlow onAdd={(productId, menge) => addEntry(productId, menge, slot)} />
            )}
          </section>
        )
      })}
      <Link to="/nutrition">Zurück zur Ernährung</Link>
    </div>
  )
}

export type { FoodEntry }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/pages/NutritionEntriesPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/pages/NutritionEntriesPage.tsx src/pages/NutritionEntriesPage.test.tsx
git commit -m "feat: group the entries page by meal section"
```

---

### Task 7: Abschnitt im Bearbeiten-Formular ändern

**Files:**
- Modify: `src/components/FoodEntryEditForm.tsx`
- Modify: `src/components/FoodEntryEditForm.test.tsx`
- Modify: `src/components/FoodEntryList.tsx`
- Modify: `src/components/FoodEntryList.test.tsx`
- Modify: `src/pages/NutritionEntriesPage.tsx`

**Interfaces:**
- Consumes: `mealSections`, `MealSection`, `UNASSIGNED_LABEL` (Task 3)
- Produces: `FoodEntryList` und `FoodEntryEditForm` bekommen beide die Prop `sections: MealSection[]`.

- [ ] **Step 1: Write the failing test**

In `src/components/FoodEntryEditForm.test.tsx`:

```tsx
const sections = [
  { slot: 1, name: 'Frühstück' },
  { slot: 2, name: 'Mittagessen' },
]
```

Alle bestehenden `render(<FoodEntryEditForm … />)`-Aufrufe um `sections={sections}` ergänzen, dann:

```tsx
  it('moves the entry to another section', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(
      <FoodEntryEditForm
        entry={{ ...entry, mahlzeit: 1 }}
        userId="u1"
        sections={sections}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Mahlzeit'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('e1', expect.objectContaining({ mahlzeit: 2 })),
    )
  })

  it('files an unassigned entry into a section', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(
      <FoodEntryEditForm
        entry={{ ...entry, mahlzeit: null }}
        userId="u1"
        sections={sections}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Mahlzeit')).toHaveValue('')
    fireEvent.change(screen.getByLabelText('Mahlzeit'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('e1', expect.objectContaining({ mahlzeit: 1 })),
    )
  })

  it('leaves the section out of the patch when it did not change', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(
      <FoodEntryEditForm
        entry={{ ...entry, mahlzeit: 1 }}
        userId="u1"
        sections={sections}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][1]).not.toHaveProperty('mahlzeit')
  })
```

In `src/components/FoodEntryList.test.tsx` alle `render(<FoodEntryList … />)`-Aufrufe um `sections={[{ slot: 1, name: 'Frühstück' }]}` ergänzen.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/components/FoodEntryEditForm.test.tsx`
Expected: FAIL — `Unable to find a label with the text of: Mahlzeit`

- [ ] **Step 3: Write minimal implementation**

In `src/components/FoodEntryEditForm.tsx` den Import und die Props ergänzen:

```tsx
import { UNASSIGNED_LABEL, type MealSection } from '../lib/meal-sections'
```

```tsx
type Props = {
  entry: FoodEntry
  userId: string
  sections: MealSection[]
  onSave: (entryId: string, patch: EntryPatch) => Promise<void>
  onClose: () => void
}
```

Einen Draft-State neben den übrigen:

```tsx
  const [mahlzeit, setMahlzeit] = useState(entry.mahlzeit === null ? '' : String(entry.mahlzeit))
```

In `handleSubmit`, direkt nachdem `patch` angelegt wurde:

```tsx
    // Only when it actually changed — an unchanged section has no business in the patch.
    const gewaehlt = mahlzeit === '' ? null : Number(mahlzeit)
    if (gewaehlt !== entry.mahlzeit) patch.mahlzeit = gewaehlt
```

Und im Formular, nach dem Zeitpunkt-Feld:

```tsx
      <label>
        Mahlzeit
        <select value={mahlzeit} onChange={(event) => setMahlzeit(event.target.value)}>
          <option value="">{UNASSIGNED_LABEL}</option>
          {sections.map((section) => (
            <option key={section.slot} value={String(section.slot)}>
              {section.name}
            </option>
          ))}
        </select>
      </label>
```

In `src/components/FoodEntryList.tsx` die Prop durchreichen:

```tsx
import type { MealSection } from '../lib/meal-sections'
```

```tsx
type Props = {
  entries: FoodEntry[]
  userId: string
  sections: MealSection[]
  onUpdateEntry: (entryId: string, patch: EntryPatch) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
}
```

`FoodEntryList` gibt `sections` an jede `FoodEntryRow`, und die an `FoodEntryEditForm`.

In `src/pages/NutritionEntriesPage.tsx` die Sektionsliste berechnen und übergeben:

```tsx
import { mealSections, visibleSections } from '../lib/meal-sections'
```

```tsx
  const sections = visibleSections(profile, entries)
  const assignable = mealSections(profile)
```

```tsx
            <FoodEntryList
              entries={sectionEntries}
              userId={userId}
              sections={assignable}
              onUpdateEntry={updateEntry}
              onDelete={deleteEntry}
            />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/components/FoodEntryEditForm.test.tsx src/components/FoodEntryList.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit`

```bash
git add src/components/FoodEntryEditForm.tsx src/components/FoodEntryEditForm.test.tsx src/components/FoodEntryList.tsx src/components/FoodEntryList.test.tsx src/pages/NutritionEntriesPage.tsx
git commit -m "feat: move an entry to another section from the edit form"
```

---

### Task 8: Dashboard zeigt die Abschnitte

**Files:**
- Modify: `src/pages/NutritionPage.tsx`
- Modify: `src/pages/NutritionPage.test.tsx`

**Interfaces:**
- Consumes: `mealSections` (Task 3), `sumKalorien` (Task 5)
- Produces: nichts für spätere Tasks

- [ ] **Step 1: Write the failing test**

In `src/pages/NutritionPage.test.tsx` den bestehenden Test `renders the dashboard sections once profile and entries are loaded` unverändert lassen und ergänzen:

```tsx
  it('lists the sections with their calories and links to the entries page', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(
      entriesResult({
        entries: [
          {
            id: 'e1',
            menge: 150,
            zeitpunkt: '2026-08-20T06:30:00.000Z',
            product_id: 'p1',
            mahlzeit: 1,
            products: {
              id: 'p1',
              name: 'Testprodukt',
              barcode: null,
              created_by: 'u1',
              kalorien: 100,
              eiweiss: null,
              fett: null,
              kohlenhydrate: null,
            },
          },
        ],
      }),
    )

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />, { wrapper: MemoryRouter })

    const fruehstueck = screen.getByRole('link', { name: /Frühstück/ })
    expect(fruehstueck).toHaveTextContent('150 kcal')
    expect(fruehstueck).toHaveAttribute('href', '/nutrition/entries')
    expect(screen.getByRole('link', { name: /Abendessen/ })).toHaveTextContent('0 kcal')
  })

  it('no longer captures entries on the dashboard', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />, { wrapper: MemoryRouter })

    // Capturing needs a section, and the sections live on the entries page.
    expect(screen.queryByRole('button', { name: 'Barcode scannen' })).not.toBeInTheDocument()
  })
```

Den bestehenden Test `renders the dashboard sections once profile and entries are loaded` von `expect(screen.getByRole('button', { name: 'Barcode scannen' })).toBeInTheDocument()` auf `expect(screen.getByRole('link', { name: /Einträge/ })).toBeInTheDocument()` umstellen.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --dir src src/pages/NutritionPage.test.tsx`
Expected: FAIL — kein Link „Frühstück"

- [ ] **Step 3: Write minimal implementation**

In `src/pages/NutritionPage.tsx` den Import von `AddEntryFlow` entfernen und ergänzen:

```tsx
import { mealSections } from '../lib/meal-sections'
import { sumKalorien } from '../lib/entry-calories'
```

Im Rendering `<AddEntryFlow … />` ersetzen durch:

```tsx
      <ul>
        {mealSections(profile).map((section) => {
          const sectionEntries = entries.filter((entry) => entry.mahlzeit === section.slot)
          return (
            <li key={section.slot}>
              <Link to="/nutrition/entries">
                {`${section.name} — ${Math.round(sumKalorien(sectionEntries))} kcal`}
              </Link>
            </li>
          )
        })}
      </ul>
```

Der bestehende Link „Einträge ansehen" bleibt.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --dir src src/pages/NutritionPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test && npm run lint && npx tsc -b --noEmit && npm run build`

```bash
git add src/pages/NutritionPage.tsx src/pages/NutritionPage.test.tsx
git commit -m "feat: show section calories on the nutrition dashboard"
```

---

### Task 9: Finale Verifikation

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

In `docs/domaenenmodell.md` im ` ```mermaid `-ERD den `profiles`-Block um sechs Zeilen nach `numeric taegliches_kalorienziel` ergänzen:

```
        string mahlzeit_1_name
        string mahlzeit_2_name
        string mahlzeit_3_name
        string mahlzeit_4_name
        string mahlzeit_5_name
        string mahlzeit_6_name
```

Im `food_entries`-Block nach der `zeitpunkt`-Zeile ergänzen:

```
        int mahlzeit
```

In „Fachliche Notizen" einen Punkt anfügen:

```
- `profiles.mahlzeit_1_name` bis `_6_name` benennen sechs feste Mahlzeiten-Slots; `food_entries.mahlzeit` verweist als stabile Nummer 1–6 darauf und ist `null`, solange ein Eintrag keinem Abschnitt zugeordnet ist. Bewusst keine Array-Positionen: Beim Entfernen eines Abschnitts würden sonst alle nachfolgenden Einträge still auf den falschen Abschnitt zeigen.
```

Die Quellenzeile auf `Stand Phase 2 + Mahlzeiten-Abschnitte, inkl. 0003_meal_sections.sql` setzen.

Danach nach `../fitness-app.wiki/Domain-Model.md` kopieren — das Wiki **nicht** committen oder pushen, das bleibt ein eigener Schritt.

- [ ] **Step 3: Update the status section**

In `CLAUDE.md` unter „Status / Fortschritt" festhalten: Einträge sind nach Mahlzeiten gegliedert, sechs feste Slots, vier vorbelegt, Namen im Profil unter „Mahlzeiten", Zuordnung ergibt sich aus dem Abschnitt, in dem erfasst wird, Alt-Einträge stehen unter „Ohne Zuordnung" und lassen sich über „Bearbeiten" einsortieren. Spec und Plan verlinken. Als offenes Folgevorhaben Portionen statt Gramm vermerken.

- [ ] **Step 4: Commit**

```bash
git add docs/domaenenmodell.md CLAUDE.md
git commit -m "docs: record the meal sections"
```

- [ ] **Step 5: Manual verification (Nutzer, nach dem Merge)**

1. In Supabase prüfen, dass `profiles` die sechs Namensspalten hat und `food_entries` die Spalte `mahlzeit`.
2. `/nutrition/entries` öffnen — vier Abschnitte, bestehende Einträge unter „Ohne Zuordnung".
3. In „Frühstück" etwas erfassen, danach in „Abendessen" — beide landen im richtigen Abschnitt.
4. Einen Alt-Eintrag über „Bearbeiten" einem Abschnitt zuordnen; „Ohne Zuordnung" verschwindet, sobald der letzte weg ist.
5. Im Profil „Snacks" umbenennen — die Überschrift ändert sich, die Einträge bleiben, wo sie waren.
6. Im Profil Mahlzeit 5 benennen — ein fünfter Abschnitt erscheint. Etwas darin erfassen, dann den Namen wieder leeren: Der Abschnitt bleibt als „Abschnitt 5" sichtbar, solange er Einträge enthält.
7. Auf `/nutrition` prüfen, dass die Kalorien je Abschnitt zur Tagesbilanz summieren.

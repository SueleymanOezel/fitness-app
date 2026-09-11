# Übungs-Übersetzung (Namen + Anleitung ins Deutsche) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Übersetze die 873 importierten Übungsnamen und ihre Anleitungs-Sätze per DeepL API ins Deutsche und zeige die Übersetzung im Frontend mit Fallback auf Englisch, ohne eigene (nutzererstellte) Übungen anzufassen.

**Architecture:** Additive Migration (`name_de`, `anleitung_de` auf `exercises`), ein neues, von `import-exercises.ts` entkoppeltes Kommandozeilen-Skript `scripts/translate-exercises.ts` (native `fetch` gegen die DeepL-REST-API, wiederaufnehmbar über den DB-Zustand), Frontend liest überall `name_de ?? name` / `anleitung_de ?? anleitung`.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest + Testing Library, Supabase (Postgres), native `fetch` gegen die DeepL Free API.

**Spec:** `docs/superpowers/specs/2026-09-11-uebungsuebersetzung-design.md`

## Global Constraints

- Alle UI-Texte auf Deutsch (Projekt-Konvention).
- Keine neue Abhängigkeit — DeepL wird über natives `fetch` angesprochen, kein SDK.
- Neue DB-Spalten additiv und nullable, kein Check-Constraint (gleiches Muster wie `0008`).
- Übersetzung gilt nur für die importierte Bibliothek (`created_by is null`) — eigene Übungen werden nie übersetzt und bekommen keine neuen Formularfelder.
- Kein UI-Trigger für die Übersetzung — reines, manuell ausgeführtes Kommandozeilen-Skript wie `import-exercises`.
- Keine persistente Cache-Datei zwischen Skript-Läufen — Wiederaufnehmbarkeit kommt ausschließlich aus dem DB-Zustand (`name_de`/`anleitung_de is null`).
- Keine Retry-/Backoff-Logik über den sauberen Abbruch bei einem DeepL-Kontingent-Fehler (HTTP 456) hinaus.
- Keine Änderung an `import-exercises.ts`/`replaceImportedExercises`.

---

### Task 1: Migration + Domänenmodell-Dokumentation

**Files:**
- Create: `supabase/migrations/0009_exercise_translations.sql`
- Test: `supabase/migrations/0009_exercise_translations.test.ts`
- Modify: `docs/domaenenmodell.md`

**Interfaces:**
- Produces: zwei neue nullable Spalten auf `public.exercises`: `name_de text`, `anleitung_de text[]`. Konsumiert von Task 2/3 (Skript liest/schreibt sie) und Task 4 (`Exercise`-Typ).

- [ ] **Step 1: Write the failing test**

`supabase/migrations/0009_exercise_translations.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0009_exercise_translations.sql'), 'utf-8')
/** Comments explain the columns and name things the statement must not touch. */
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0009_exercise_translations.sql', () => {
  it('adds name_de and anleitung_de to exercises as nullable columns', () => {
    expect(sql).toMatch(/alter table public\.exercises/)
    expect(statements).toContain('add column name_de text')
    expect(statements).toContain('add column anleitung_de text[]')
    // Nullable on purpose: rows only get a value once translate-exercises.ts
    // runs, and the script is resumable — it may leave rows half-translated.
    expect(statements).not.toMatch(/name_de text\s+not null/)
    expect(statements).not.toMatch(/anleitung_de text\[\]\s+not null/)
  })

  it('adds no check constraint, table, or policy', () => {
    // No check constraint: this is free-text translation output, not a
    // fixed vocabulary like kategorie/equipment/schwierigkeitsgrad.
    expect(statements).not.toMatch(/check\s*\(/i)
    expect(sql).not.toMatch(/create table/i)
    expect(sql).not.toMatch(/create policy/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run supabase/migrations/0009_exercise_translations.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open '.../0009_exercise_translations.sql'`

- [ ] **Step 3: Write the migration**

`supabase/migrations/0009_exercise_translations.sql`:

```sql
-- Name und Anleitung stehen aktuell im rohen Englisch aus free-exercise-db.
-- Diese Migration ergänzt die deutsche Übersetzung, befüllt durch das
-- manuell auszuführende scripts/translate-exercises.ts (DeepL API), nicht
-- durch die App selbst. Additiv und nullable: eine frisch importierte oder
-- eigene Übung hat noch keine/keine Übersetzung, das Frontend fällt in
-- beiden Fällen auf name/anleitung zurück.
alter table public.exercises
  add column name_de text,
  add column anleitung_de text[];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run supabase/migrations/0009_exercise_translations.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Update `docs/domaenenmodell.md`**

In the `exercises` ERD block, add `name_de` directly after `name` and `anleitung_de` directly after `anleitung`:

```
    exercises {
        uuid id PK
        text name
        text name_de
        text kategorie
        text equipment
        text_array muskelgruppen_primaer
        text_array muskelgruppen_sekundaer
        text bild_url
        text_array anleitung
        text_array anleitung_de
        text schwierigkeitsgrad
        numeric met_wert
        uuid created_by FK
    }
```

Add a new bullet under „Fachliche Notizen" (after the existing `exercises.anleitung`/`schwierigkeitsgrad`-Notiz):

```
- `exercises.name_de` und `exercises.anleitung_de` (Migration `0009`) enthalten die deutsche Übersetzung von `name`/`anleitung`, befüllt durch das manuell auszuführende `scripts/translate-exercises.ts` (DeepL API, kein UI-Trigger, wiederaufnehmbar über den DB-Zustand). Beide sind nullable und gelten nur für importierte Übungen (`created_by is null`) — eigene Übungen bleiben unübersetzt. Frontend zeigt `name_de ?? name` / `anleitung_de ?? anleitung` mit Fallback auf Englisch.
```

Update the Quelle-Zeile at the end of the file (append `und 0009_exercise_translations.sql`):

```
- Quelle: `supabase/migrations/0001_initial_schema.sql` (Stand Phase 2 + Mahlzeiten-Abschnitte + Phase 3 (Trainingsbereich) + Analysefelder, inkl. `0002_nutrition_profile_fields.sql`, `0003_meal_sections.sql`, `0004_training_days.sql`, `0005_analysis_fields.sql`, `0006_body_photos_bucket.sql`, `0007_analyse_auswahl.sql`, `0008_exercise_details.sql` und `0009_exercise_translations.sql`).
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0009_exercise_translations.sql supabase/migrations/0009_exercise_translations.test.ts docs/domaenenmodell.md
git commit -m "feat: add name_de and anleitung_de columns to exercises"
```

---

### Task 2: `translate-exercises.ts` — reine Übersetzungs-Funktionen

**Files:**
- Create: `scripts/translate-exercises.ts`
- Test: `scripts/translate-exercises.test.ts`

**Interfaces:**
- Produces: `collectUniqueStrings(exercises: { name: string; anleitung: string[] | null }[]): string[]` und `buildTranslationUpdate(exercise: { id: string; name: string; anleitung: string[] | null }, translations: Map<string, string>): { id: string; name_de: string; anleitung_de: string[] | null } | null`. Konsumiert von Task 3 (I/O-Wiring desselben Skripts).

- [ ] **Step 1: Write the failing tests**

`scripts/translate-exercises.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildTranslationUpdate, collectUniqueStrings } from './translate-exercises.ts'

describe('collectUniqueStrings', () => {
  it('collects each unique name and instruction sentence exactly once', () => {
    const exercises = [
      { name: 'Push Up', anleitung: ['Get in position.', 'Push up and down.'] },
      { name: 'Sit Up', anleitung: ['Get in position.', 'Sit up.'] },
    ]

    const strings = collectUniqueStrings(exercises)

    expect(strings).toHaveLength(5)
    expect(new Set(strings)).toEqual(
      new Set(['Push Up', 'Sit Up', 'Get in position.', 'Push up and down.', 'Sit up.']),
    )
  })

  it('collects only the name when anleitung is null', () => {
    const strings = collectUniqueStrings([{ name: 'X', anleitung: null }])
    expect(strings).toEqual(['X'])
  })

  it('returns an empty array for an empty list', () => {
    expect(collectUniqueStrings([])).toEqual([])
  })
})

describe('buildTranslationUpdate', () => {
  const translations = new Map([
    ['Push Up', 'Liegestütz'],
    ['Get in position.', 'Geh in Position.'],
    ['Push up and down.', 'Drücke hoch und runter.'],
  ])

  it('sets name_de and anleitung_de when every string has a translation', () => {
    const update = buildTranslationUpdate(
      { id: 'e1', name: 'Push Up', anleitung: ['Get in position.', 'Push up and down.'] },
      translations,
    )

    expect(update).toEqual({
      id: 'e1',
      name_de: 'Liegestütz',
      anleitung_de: ['Geh in Position.', 'Drücke hoch und runter.'],
    })
  })

  it('sets anleitung_de to null when the exercise has no anleitung', () => {
    const update = buildTranslationUpdate({ id: 'e1', name: 'Push Up', anleitung: null }, translations)
    expect(update).toEqual({ id: 'e1', name_de: 'Liegestütz', anleitung_de: null })
  })

  it('leaves anleitung_de null when not every sentence has a translation', () => {
    // "Sit up." is missing from the translations map — a resumable run must
    // not write a partly-German, partly-English array.
    const update = buildTranslationUpdate(
      { id: 'e1', name: 'Push Up', anleitung: ['Get in position.', 'Sit up.'] },
      translations,
    )

    expect(update).toEqual({ id: 'e1', name_de: 'Liegestütz', anleitung_de: null })
  })

  it('returns null when the name itself has no translation', () => {
    // Happens only if a batch failed before this name was translated — the
    // row is skipped entirely and retried on the next script run.
    const update = buildTranslationUpdate({ id: 'e1', name: 'Untranslated', anleitung: null }, translations)
    expect(update).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run scripts/translate-exercises.test.ts`
Expected: FAIL — `Failed to resolve import "./translate-exercises.ts"`

- [ ] **Step 3: Write the implementation**

`scripts/translate-exercises.ts`:

```ts
export function collectUniqueStrings(exercises: { name: string; anleitung: string[] | null }[]): string[] {
  const strings = new Set<string>()
  for (const exercise of exercises) {
    strings.add(exercise.name)
    for (const satz of exercise.anleitung ?? []) strings.add(satz)
  }
  return [...strings]
}

export type TranslationUpdate = { id: string; name_de: string; anleitung_de: string[] | null }

export function buildTranslationUpdate(
  exercise: { id: string; name: string; anleitung: string[] | null },
  translations: Map<string, string>,
): TranslationUpdate | null {
  const nameDe = translations.get(exercise.name)
  if (nameDe === undefined) return null

  let anleitungDe: string[] | null = null
  if (exercise.anleitung !== null) {
    const translated = exercise.anleitung.map((satz) => translations.get(satz))
    anleitungDe = translated.every((satz): satz is string => satz !== undefined) ? (translated as string[]) : null
  }

  return { id: exercise.id, name_de: nameDe, anleitung_de: anleitungDe }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run scripts/translate-exercises.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/translate-exercises.ts scripts/translate-exercises.test.ts
git commit -m "feat: add pure translation-matching functions for exercise translation"
```

---

### Task 3: `translate-exercises.ts` — DeepL/Supabase-Wiring, `main()`, npm-Skript

**Files:**
- Modify: `scripts/translate-exercises.ts`
- Modify: `scripts/translate-exercises.test.ts`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `collectUniqueStrings`, `buildTranslationUpdate` aus Task 2 (selbe Datei). Spalten `name_de`/`anleitung_de` aus Task 1 (nur namentlich referenziert).
- Produces: `runTranslation(client, translateBatch): Promise<{ updated: number; total: number; quotaExceeded: boolean }>`, `createDeeplTranslateBatch(apiKey: string)`, `QuotaExceededError`, npm-Skript `translate-exercises` (`node scripts/translate-exercises.ts`), `.env.example`-Zeile `DEEPL_API_KEY=`. Kein Konsument in späteren Tasks — das Skript ist eigenständig.

- [ ] **Step 1: Write the failing tests**

First, change the existing `import { describe, expect, it } from 'vitest'` at the top of `scripts/translate-exercises.test.ts` (from Task 2) to also import `vi`:

```ts
import { describe, expect, it, vi } from 'vitest'
```

Then append to `scripts/translate-exercises.test.ts`:

```ts
import { QuotaExceededError, runTranslation } from './translate-exercises.ts'

type Row = { id: string; name: string; anleitung: string[] | null }

function createClient(rows: Row[]) {
  const updates: { id: string; name_de: string; anleitung_de: string[] | null }[] = []
  let capturedFilter = ''
  return {
    updates,
    get capturedFilter() {
      return capturedFilter
    },
    from: () => ({
      select: () => ({
        is: () => ({
          or: (filter: string) => {
            capturedFilter = filter
            return {
              range: async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }),
            }
          },
        }),
      }),
      update: (values: { name_de: string; anleitung_de: string[] | null }) => ({
        eq: async (_column: string, id: string) => {
          updates.push({ id, ...values })
          return { error: null }
        },
      }),
    }),
  }
}

describe('runTranslation', () => {
  it('reads untranslated rows with the expected filter, translates unique strings once, and writes name_de/anleitung_de back', async () => {
    const rows: Row[] = [
      { id: 'e1', name: 'Push Up', anleitung: ['Get in position.', 'Push up and down.'] },
      { id: 'e2', name: 'Sit Up', anleitung: ['Get in position.', 'Sit up.'] },
    ]
    const client = createClient(rows)
    const translateBatch = vi.fn(async (texts: string[]) => texts.map((text) => `${text} DE`))

    const result = await runTranslation(client, translateBatch)

    expect(client.capturedFilter).toBe('name_de.is.null,and(anleitung.not.is.null,anleitung_de.is.null)')
    // 5 unique strings across the two rows ("Get in position." shared) — one batch.
    expect(translateBatch).toHaveBeenCalledTimes(1)
    expect(translateBatch.mock.calls[0][0]).toHaveLength(5)
    expect(client.updates).toEqual([
      { id: 'e1', name_de: 'Push Up DE', anleitung_de: ['Get in position. DE', 'Push up and down. DE'] },
      { id: 'e2', name_de: 'Sit Up DE', anleitung_de: ['Get in position. DE', 'Sit up. DE'] },
    ])
    expect(result).toEqual({ updated: 2, total: 2, quotaExceeded: false })
  })

  it('stops translating further batches on a quota error, but keeps and writes what was already translated', async () => {
    // 51 unique names split into a 50-item batch and a 1-item batch.
    const rows: Row[] = Array.from({ length: 51 }, (_, index) => ({ id: `e${index}`, name: `Ex${index}`, anleitung: null }))
    const client = createClient(rows)
    const translateBatch = vi
      .fn<(texts: string[]) => Promise<string[]>>()
      .mockImplementationOnce(async (texts) => texts.map((text) => `${text} DE`))
      .mockImplementationOnce(async () => {
        throw new QuotaExceededError('quota exceeded')
      })

    const result = await runTranslation(client, translateBatch)

    expect(translateBatch).toHaveBeenCalledTimes(2)
    expect(client.updates).toHaveLength(50)
    expect(client.updates.map((update) => update.id)).not.toContain('e50')
    expect(result).toEqual({ updated: 50, total: 51, quotaExceeded: true })
  })

  it('re-throws a non-quota translation error instead of treating it as a clean stop', async () => {
    const rows: Row[] = [{ id: 'e1', name: 'Push Up', anleitung: null }]
    const client = createClient(rows)
    const translateBatch = vi.fn(async () => {
      throw new Error('network down')
    })

    await expect(runTranslation(client, translateBatch)).rejects.toThrow('network down')
    expect(client.updates).toHaveLength(0)
  })

  it('pages through more than one page of untranslated rows', async () => {
    const rows: Row[] = Array.from({ length: 700 }, (_, index) => ({ id: `e${index}`, name: `Ex${index}`, anleitung: null }))
    const client = createClient(rows)
    const translateBatch = vi.fn(async (texts: string[]) => texts.map((text) => `${text} DE`))

    const result = await runTranslation(client, translateBatch)

    expect(client.updates).toHaveLength(700)
    expect(result).toEqual({ updated: 700, total: 700, quotaExceeded: false })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run scripts/translate-exercises.test.ts`
Expected: FAIL — `runTranslation`/`QuotaExceededError` not exported

- [ ] **Step 3: Write the implementation**

Append to `scripts/translate-exercises.ts` (imports go at the top of the file, alongside the existing exports from Task 2):

```ts
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate'
const TRANSLATE_BATCH_SIZE = 50
/** Same db-max-rows cap as import-exercises.ts: an unpaged read would silently stop at 1000 rows. */
const READ_PAGE_SIZE = 500
/** Only rows still missing some translation — makes the script resumable across months/quota resets. */
const UNTRANSLATED_FILTER = 'name_de.is.null,and(anleitung.not.is.null,anleitung_de.is.null)'

export class QuotaExceededError extends Error {}

type ExerciseRow = { id: string; name: string; anleitung: string[] | null }

type ReadResult = PromiseLike<{ data: ExerciseRow[] | null; error: { message: string } | null }>
type WriteResult = PromiseLike<{ error: { message: string } | null }>

type TranslateClient = {
  from: (table: string) => {
    select: (columns: string) => {
      is: (column: string, value: null) => {
        or: (filter: string) => { range: (from: number, to: number) => ReadResult }
      }
    }
    update: (values: { name_de: string; anleitung_de: string[] | null }) => {
      eq: (column: string, value: string) => WriteResult
    }
  }
}

export type TranslateBatchFn = (texts: string[]) => Promise<string[]>

async function loadUntranslated(client: TranslateClient): Promise<ExerciseRow[]> {
  const all: ExerciseRow[] = []
  for (let from = 0; ; from += READ_PAGE_SIZE) {
    const { data, error } = await client
      .from('exercises')
      .select('id, name, anleitung')
      .is('created_by', null)
      .or(UNTRANSLATED_FILTER)
      .range(from, from + READ_PAGE_SIZE - 1)
    if (error) throw new Error(`translate failed while reading untranslated rows: ${error.message}`)
    const page = data ?? []
    all.push(...page)
    if (page.length < READ_PAGE_SIZE) break
  }
  return all
}

async function writeTranslation(client: TranslateClient, update: TranslationUpdate) {
  const { error } = await client
    .from('exercises')
    .update({ name_de: update.name_de, anleitung_de: update.anleitung_de })
    .eq('id', update.id)
  if (error) throw new Error(`translate failed while writing row ${update.id}: ${error.message}`)
}

/**
 * Batches are translated in order and stop cleanly on a quota error — rows
 * whose strings were already translated are still written, the rest is
 * simply left null for the next run (see buildTranslationUpdate).
 */
export async function runTranslation(
  client: TranslateClient,
  translateBatch: TranslateBatchFn,
): Promise<{ updated: number; total: number; quotaExceeded: boolean }> {
  const rows = await loadUntranslated(client)
  const strings = collectUniqueStrings(rows)

  const translations = new Map<string, string>()
  let quotaExceeded = false
  for (let from = 0; from < strings.length; from += TRANSLATE_BATCH_SIZE) {
    const batch = strings.slice(from, from + TRANSLATE_BATCH_SIZE)
    try {
      const translated = await translateBatch(batch)
      batch.forEach((text, index) => translations.set(text, translated[index]))
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        quotaExceeded = true
        break
      }
      throw error
    }
  }

  let updated = 0
  for (const row of rows) {
    const update = buildTranslationUpdate(row, translations)
    if (update === null) continue
    await writeTranslation(client, update)
    updated += 1
  }
  return { updated, total: rows.length, quotaExceeded }
}

export function createDeeplTranslateBatch(apiKey: string): TranslateBatchFn {
  return async (texts) => {
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts, target_lang: 'DE' }),
    })
    if (response.status === 456) throw new QuotaExceededError('DeepL monthly character quota exceeded')
    if (!response.ok) throw new Error(`DeepL request failed: ${response.status} ${response.statusText}`)
    const body = (await response.json()) as { translations: { text: string }[] }
    return body.translations.map((translation) => translation.text)
  }
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const deeplApiKey = process.env.DEEPL_API_KEY
  if (!url || !serviceRoleKey || !deeplApiKey) {
    throw new Error('Set VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEEPL_API_KEY before running this script.')
  }

  const supabase = createClient(url, serviceRoleKey)
  const { updated, total, quotaExceeded } = await runTranslation(
    supabase as unknown as TranslateClient,
    createDeeplTranslateBatch(deeplApiKey),
  )

  if (quotaExceeded) {
    console.log(`translated ${updated} of ${total} exercises — DeepL monthly quota exceeded, re-run next month for the rest`)
  } else {
    console.log(`translated ${updated} of ${total} exercises`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}
```

- [ ] **Step 4: Run tests and typecheck to verify they pass**

Run: `npm test -- --run scripts/translate-exercises.test.ts`
Expected: PASS (11 tests total: 7 from Task 2 + 4 new)

Run: `npx tsc -b --noEmit`
Expected: no errors

- [ ] **Step 5: Add the npm script**

In `package.json`, `"scripts"` (directly after `"import-exercises"`):

```json
    "translate-exercises": "node scripts/translate-exercises.ts",
```

- [ ] **Step 6: Add the env placeholder**

In `.env.example`, append:

```
DEEPL_API_KEY=your-deepl-api-key-here
```

- [ ] **Step 7: Commit**

```bash
git add scripts/translate-exercises.ts scripts/translate-exercises.test.ts package.json .env.example
git commit -m "feat: wire translate-exercises script to DeepL and Supabase"
```

---

### Task 4: `Exercise`-Typ erweitern + `ExerciseDetailDialog` zeigt die Übersetzung

**Files:**
- Modify: `src/hooks/use-exercises.ts`
- Modify: `src/components/ExerciseDetailDialog.tsx`
- Modify: `src/components/ExerciseDetailDialog.test.tsx`

**Interfaces:**
- Consumes: Spalten aus Task 1 (nur namentlich referenziert).
- Produces: `Exercise` bekommt `name_de: string | null` und `anleitung_de: string[] | null`. Konsumiert von Task 5.

- [ ] **Step 1: Write the failing tests**

In `src/components/ExerciseDetailDialog.test.tsx`, ergänze `name_de: null` und `anleitung_de: null` in beiden bestehenden Fixtures (`exercise` und `minimal`), damit `tsc` nicht wegen fehlender Pflichtfelder scheitert:

```ts
const exercise: Exercise = {
  id: 'ex1',
  name: 'Bankdrücken',
  name_de: null,
  kategorie: 'strength',
  equipment: 'barbell',
  muskelgruppen_primaer: ['chest'],
  muskelgruppen_sekundaer: [],
  bild_url: 'https://example.com/bankdruecken.jpg',
  anleitung: ['Lege dich auf die Bank.', 'Drücke die Stange nach oben.'],
  anleitung_de: null,
  schwierigkeitsgrad: 'intermediate',
  met_wert: 5,
  created_by: null,
}
```

Und im letzten Test (`minimal`), ebenfalls `name_de: null` und `anleitung_de: null` ergänzen.

Dann zwei neue Tests direkt vor dem letzten (`renders a minimal exercise...`) ergänzen:

```ts
  it('shows the German name and instructions when translations exist', () => {
    render(
      <ExerciseDetailDialog
        exercise={{
          ...exercise,
          name: 'Bench Press',
          name_de: 'Bankdrücken (DE)',
          anleitung: ['Step A.', 'Step B.'],
          anleitung_de: ['Schritt A.', 'Schritt B.'],
        }}
      />,
    )

    expect(screen.getByText('Bankdrücken (DE)')).toBeInTheDocument()
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bankdrücken (DE)' })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual(['Schritt A.', 'Schritt B.'])
  })

  it('falls back to the English anleitung when only the name is translated', () => {
    render(
      <ExerciseDetailDialog
        exercise={{ ...exercise, name: 'Bench Press', name_de: 'Bankdrücken (DE)', anleitung_de: null }}
      />,
    )

    expect(screen.getByText('Bankdrücken (DE)')).toBeInTheDocument()
    expect(screen.getByText('Lege dich auf die Bank.')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/components/ExerciseDetailDialog.test.tsx`
Expected: FAIL — new tests fail (`name_de`/`anleitung_de` not read yet), plus a `tsc`-level type error on the fixtures missing `name_de`/`anleitung_de` once you run the typecheck (expected here, fixed by Step 3).

- [ ] **Step 3: Write the implementation**

In `src/hooks/use-exercises.ts`, erweitere `Exercise`:

```ts
export type Exercise = {
  id: string
  name: string
  name_de: string | null
  kategorie: string | null
  equipment: string | null
  muskelgruppen_primaer: string[] | null
  muskelgruppen_sekundaer: string[] | null
  bild_url: string | null
  anleitung: string[] | null
  anleitung_de: string[] | null
  schwierigkeitsgrad: string | null
  met_wert: number | null
  created_by: string | null
}
```

(`NewExercise` bleibt unverändert — eigene Übungen werden nie übersetzt.)

In `src/components/ExerciseDetailDialog.tsx`:

```tsx
export default function ExerciseDetailDialog({ exercise }: { exercise: Exercise }) {
  const name = exercise.name_de ?? exercise.name
  const muskelgruppen = exercise.muskelgruppen_primaer ?? []
  const anleitung = exercise.anleitung_de ?? exercise.anleitung ?? []

  return (
    <div className={`${cardClass} flex flex-col gap-4`}>
      {exercise.bild_url && (
        <img
          src={exercise.bild_url}
          alt={name}
          referrerPolicy="no-referrer"
          className="w-full rounded-2xl object-cover"
        />
      )}
      <h2>{name}</h2>
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

- [ ] **Step 4: Run tests and typecheck to verify they pass**

Run: `npm test -- --run src/components/ExerciseDetailDialog.test.tsx`
Expected: PASS (all 8 tests)

Run: `npx tsc -b --noEmit`
Expected: no errors (this will surface any other fixture in the repo still missing the two new required fields — fix those the same way, adding `name_de: null, anleitung_de: null`)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-exercises.ts src/components/ExerciseDetailDialog.tsx src/components/ExerciseDetailDialog.test.tsx
git commit -m "feat: show translated exercise name and instructions in the detail dialog"
```

---

### Task 5: `ExercisesPage` — Liste und Suche nutzen die Übersetzung

**Files:**
- Modify: `src/pages/ExercisesPage.tsx`
- Modify: `src/pages/ExercisesPage.test.tsx`

**Interfaces:**
- Consumes: `Exercise.name_de` aus Task 4.

- [ ] **Step 1: Write the failing tests**

In `src/pages/ExercisesPage.test.tsx`, ergänze `name_de: null` und `anleitung_de: null` in der module-scope `exercise`-Fixture:

```ts
const exercise = {
  id: 'ex1',
  name: 'Bankdrücken',
  name_de: null,
  kategorie: 'strength',
  equipment: 'barbell',
  muskelgruppen_primaer: ['chest'],
  muskelgruppen_sekundaer: [],
  bild_url: null,
  anleitung: ['Schritt eins.', 'Schritt zwei.'],
  anleitung_de: null,
  schwierigkeitsgrad: 'beginner',
  met_wert: 5,
  created_by: null,
}
```

Dann einen neuen Test direkt nach dem bestehenden „lists exercises and filters by name as the user types"-Test ergänzen:

```ts
  it('shows the German name and searches by it when a translation exists', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [{ ...exercise, name: 'Bench Press', name_de: 'Bankdrücken' }],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Bank' } })
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/pages/ExercisesPage.test.tsx`
Expected: FAIL — new test fails (list still shows `exercise.name`, search still filters on `exercise.name`), plus a `tsc`-level type error on the fixture missing `name_de`/`anleitung_de` once you run the typecheck (expected here, fixed by Step 3).

- [ ] **Step 3: Write the implementation**

In `src/pages/ExercisesPage.tsx`, in `ExercisesList`, ändere den Filter:

```tsx
  const filtered = exercises.filter(
    (exercise) =>
      (exercise.name_de ?? exercise.name).toLowerCase().includes(query.toLowerCase()) &&
      (muskelgruppe === null || (exercise.muskelgruppen_primaer ?? []).includes(muskelgruppe)) &&
      (equipment === null || exercise.equipment === equipment),
  )
```

Und den Listeneintrag:

```tsx
              <span className="flex-1 text-left">{exercise.name_de ?? exercise.name}</span>
```

- [ ] **Step 4: Run tests and typecheck to verify they pass**

Run: `npm test -- --run src/pages/ExercisesPage.test.tsx`
Expected: PASS (all tests)

Run: `npx tsc -b --noEmit`
Expected: no errors

Run: `npm test`
Expected: full suite green

- [ ] **Step 5: Commit**

```bash
git add src/pages/ExercisesPage.tsx src/pages/ExercisesPage.test.tsx
git commit -m "feat: show and search the translated exercise name in the exercises list"
```

---

## Manual Verification (nach dem Merge, gegen die echte Instanz)

Migration `0009` wird beim Merge nach `master` automatisch auf Produktion angewendet (Supabase-GitHub-Integration).

1. **DeepL-Konto nötig** — falls noch nicht vorhanden: kostenlosen DeepL-API-Account unter deepl.com anlegen (Free-Tarif, 500.000 Zeichen/Monat), API-Key kopieren.
2. Im Haupt-Checkout (nicht im Worktree — der hat kein `.env`) `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` und `DEEPL_API_KEY` als Shell-Env-Variablen setzen, dann `npm run translate-exercises` laufen lassen. Konsolen-Ausgabe zeigt `translated X of 873 exercises` (oder mit Kontingent-Hinweis, falls das Free-Tarif-Limit während des Laufs erreicht wird — dann läuft ein erneuter Aufruf im nächsten Monat den Rest nach).
3. `npm ci && npm run build && firebase deploy --only hosting:vitaloop`, danach Hash-Sanity-Check (`curl -s https://vitaloop.web.app/ | grep -o 'index-[A-Za-z0-9_-]*\.js'` gegen `dist/assets/`).
4. `/training/exercises` öffnen: die Liste zeigt deutsche Übungsnamen statt der englischen Rohwerte.
5. Im Suchfeld einen deutschen Begriff eingeben (z. B. „Bankdrücken"): findet die Übung, obwohl der Rohwert „Bench Press" englisch ist.
6. Auf eine übersetzte Übung klicken: Popup zeigt deutschen Titel und deutsche, nummerierte Anleitung.
7. Eine eigene (per „Eigene Übung anlegen" erstellte) Übung anklicken: zeigt weiterhin unverändert den selbst eingegebenen Namen/Anleitung (nie übersetzt).
8. Falls das Free-Tarif-Kontingent während Schritt 2 erschöpft wurde: einige Übungen zeigen noch den englischen Namen — das ist erwartet, nicht als Bug behandeln.
9. Konsole auf allen geprüften Seiten auf Fehler/Warnungen prüfen.

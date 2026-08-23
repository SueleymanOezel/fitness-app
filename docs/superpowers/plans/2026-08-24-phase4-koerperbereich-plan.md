# Phase 4 – Körperbereich Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dem Körperbereich eine Oberfläche geben — Gewicht, fünf Umfänge, Körperfettanteil und Fortschrittsfotos erfassen, ansehen, korrigieren und löschen.

**Architecture:** Reine Rechenlogik liegt in `src/lib/` und ist ohne React testbar. Datenzugriff liegt in Hooks unter `src/hooks/`, die dem bestehenden Muster folgen (`requestId`-Guard, Fehler aus dem Ergebnis prüfen statt auf einen Wurf zu warten). Seiten unter `src/pages/` setzen nur zusammen. Fotos liegen in einem privaten Supabase-Storage-Bucket und werden ausschließlich über kurzlebige signierte Links angezeigt.

**Tech Stack:** React 19 + Vite + TypeScript, Supabase (Postgres + Storage), Vitest + Testing Library, jsdom.

**Spec:** `docs/superpowers/specs/2026-08-24-phase4-koerperbereich-design.md`

## Global Constraints

- **Keine Drittanbieter-Namen** aus Fitness/Ernährung in Code, Kommentaren, Commit-Messages oder Docs.
- **Keine Graphen.** Verlaufsdarstellung kommt gebündelt in Phase 5 mit Recharts.
- **Keine neue Abhängigkeit.** Das Verkleinern der Bilder erledigt der Browser.
- Sprache im UI: Deutsch. Dateinamen kebab-case, Komponenten PascalCase.
- Alle Zahlenfelder für `numeric`-Spalten tragen `step="any"`. Ohne das Attribut nimmt der Browser `step="1"` und bricht bei `82,5` den kompletten Submit ab.
- `supabase-js` wirft nicht — jeder Schreibvorgang prüft `error` aus dem Ergebnis und meldet sichtbar. Rohe Datenbankmeldungen erscheinen nie im UI.
- Jeder neue Hook trägt den `requestId`-Guard gegen Antworten in falscher Reihenfolge.
- Nach jedem Task: `npm run lint`, `npx tsc -b --noEmit`, `npm test -- --run` müssen grün sein.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `supabase/migrations/0006_body_photos_bucket.sql` | Privater Bucket samt Policies |
| `src/lib/body-metrics.ts` | Feldliste, Grenzwerte, Eingabe-Parsing |
| `src/lib/body-change.ts` | Aktueller Wert und Veränderung je Messwert |
| `src/lib/image-resize.ts` | Größenrechnung (rein) + Canvas-Anbindung |
| `src/hooks/use-body-metrics.ts` | Laden, Upsert, Löschen, Profil-Durchschrieb |
| `src/hooks/use-body-photos.ts` | Laden mit signierten Links, Hochladen, Löschen |
| `src/components/BodyEntryForm.tsx` | Erfassungsformular für einen Tag |
| `src/pages/BodyPage.tsx` | Dashboard (ersetzt den Platzhalter) |
| `src/pages/BodyEntriesPage.tsx` | Verlaufsliste mit Korrigieren und Löschen |
| `src/pages/BodyPhotosPage.tsx` | Foto-Zeitleiste mit Hochladen und Löschen |
| `src/App.tsx` | Zwei neue Routen |

---

### Task 1: Migration für den Foto-Bucket

**Files:**
- Create: `supabase/migrations/0006_body_photos_bucket.sql`
- Test: `supabase/migrations/0006_body_photos_bucket.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces: Bucket-ID `body-photos`, verwendet in Task 9

- [ ] **Step 1: Write the failing test**

`supabase/migrations/0006_body_photos_bucket.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(
  resolve(cwd(), 'supabase/migrations/0006_body_photos_bucket.sql'),
  'utf-8',
)
/** Comments name things the statements must not do. */
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0006_body_photos_bucket.sql', () => {
  it('creates the bucket as private', () => {
    // A public bucket cannot be undone after the fact: anything once reachable
    // through a guessed URL may already have been fetched.
    expect(statements).toContain("insert into storage.buckets")
    expect(statements).toContain("'body-photos'")
    expect(statements).toMatch(/values \('body-photos', 'body-photos', false\)/)
    expect(statements).not.toMatch(/values \([^)]*true\)/)
  })

  it('is safe to run twice', () => {
    expect(statements).toContain('on conflict (id) do nothing')
  })

  it('restricts every policy to the folder named after the user', () => {
    const guard = "(storage.foldername(name))[1] = auth.uid()::text"
    for (const action of ['select', 'insert', 'delete']) {
      expect(statements).toContain(`for ${action}`)
    }
    // Three policies, each carrying the ownership guard.
    expect(statements.split(guard).length - 1).toBeGreaterThanOrEqual(3)
  })

  it('grants no update policy', () => {
    // A photo is replaced by deleting and uploading again.
    expect(statements).not.toMatch(/for update/)
  })

  it('binds the policies to authenticated users only', () => {
    expect(statements.split('to authenticated').length - 1).toBeGreaterThanOrEqual(3)
  })

  it('touches no application table', () => {
    expect(statements).not.toMatch(/alter table public\./)
    expect(statements).not.toMatch(/create table/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run supabase/migrations/0006_body_photos_bucket.test.ts`
Expected: FAIL — `ENOENT`, die SQL-Datei gibt es noch nicht.

- [ ] **Step 3: Write the migration**

`supabase/migrations/0006_body_photos_bucket.sql`:

```sql
-- Progress photos are the most sensitive data in this application. The bucket is
-- private and stays private: a public bucket cannot be undone after the fact,
-- because anything once reachable through a guessed URL may already be copied.
--
-- Layout is {user_id}/{uuid}.{ext}, so the first path segment is the owner and
-- every policy checks it. Reading happens through short-lived signed links that
-- are created on demand and never stored.

insert into storage.buckets (id, name, public)
values ('body-photos', 'body-photos', false)
on conflict (id) do nothing;

create policy "body_photos_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'body-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "body_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'body-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No update policy on purpose: a photo is replaced by deleting and uploading
-- again, which keeps the stored path and the database row in step.
create policy "body_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'body-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run supabase/migrations/0006_body_photos_bucket.test.ts`
Expected: PASS, 6 Tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0006_body_photos_bucket.sql supabase/migrations/0006_body_photos_bucket.test.ts
git commit -m "feat: privaten Bucket fuer Fortschrittsfotos anlegen"
```

---

### Task 2: Eingabe-Parsing für Körperwerte

**Files:**
- Create: `src/lib/body-metrics.ts`
- Test: `src/lib/body-metrics.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `MEASUREMENT_FIELDS: readonly MeasurementField[]`
  - `type MeasurementField = 'gewicht' | 'bauchumfang' | 'beinumfang' | 'armumfang' | 'ruckenumfang' | 'brustumfang' | 'koerperfettanteil'`
  - `type BodyMetricInput = Record<MeasurementField, string>`
  - `type BodyMetricValues = Record<MeasurementField, number | null>`
  - `type BodyMetricRow = { id: string; datum: string } & BodyMetricValues`
  - `FIELD_LABELS: Record<MeasurementField, string>`
  - `parseBodyMetrics(raw: BodyMetricInput): BodyMetricValues | null`
  - `EMPTY_INPUT: BodyMetricInput`

- [ ] **Step 1: Write the failing test**

`src/lib/body-metrics.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { EMPTY_INPUT, parseBodyMetrics, type BodyMetricInput } from './body-metrics'

const input = (overrides: Partial<BodyMetricInput>): BodyMetricInput => ({
  ...EMPTY_INPUT,
  ...overrides,
})

describe('parseBodyMetrics', () => {
  it('parses the values that were given and leaves the rest null', () => {
    expect(parseBodyMetrics(input({ gewicht: '82.5', bauchumfang: '88' }))).toEqual({
      gewicht: 82.5,
      bauchumfang: 88,
      beinumfang: null,
      armumfang: null,
      ruckenumfang: null,
      brustumfang: null,
      koerperfettanteil: null,
    })
  })

  it('rejects an entry in which nothing was measured', () => {
    // An empty row carries no statement and would only clutter the history.
    expect(parseBodyMetrics(EMPTY_INPUT)).toBeNull()
  })

  it('rejects a weight outside the plausible range', () => {
    expect(parseBodyMetrics(input({ gewicht: '5' }))).toBeNull()
    expect(parseBodyMetrics(input({ gewicht: '900' }))).toBeNull()
  })

  it('rejects a circumference outside the plausible range', () => {
    expect(parseBodyMetrics(input({ bauchumfang: '4' }))).toBeNull()
    expect(parseBodyMetrics(input({ bauchumfang: '400' }))).toBeNull()
  })

  it('rejects a body fat percentage above 100', () => {
    expect(parseBodyMetrics(input({ koerperfettanteil: '150' }))).toBeNull()
  })

  it('accepts a body fat percentage of zero as given, not as missing', () => {
    // Number('0') is falsy — a truthiness check here would silently drop it.
    expect(parseBodyMetrics(input({ koerperfettanteil: '0' }))?.koerperfettanteil).toBe(0)
  })

  it('rejects text that is not a number', () => {
    expect(parseBodyMetrics(input({ gewicht: 'schwer' }))).toBeNull()
  })

  it('treats whitespace as not measured', () => {
    expect(parseBodyMetrics(input({ gewicht: '   ' }))).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/body-metrics.test.ts`
Expected: FAIL — `Failed to resolve import './body-metrics'`.

- [ ] **Step 3: Write the implementation**

`src/lib/body-metrics.ts`:

```ts
export const MEASUREMENT_FIELDS = [
  'gewicht',
  'bauchumfang',
  'beinumfang',
  'armumfang',
  'ruckenumfang',
  'brustumfang',
  'koerperfettanteil',
] as const

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number]

export type BodyMetricInput = Record<MeasurementField, string>
export type BodyMetricValues = Record<MeasurementField, number | null>
export type BodyMetricRow = { id: string; datum: string } & BodyMetricValues

/** Column name is `ruckenumfang` without umlaut — the label carries it. */
export const FIELD_LABELS: Record<MeasurementField, string> = {
  gewicht: 'Gewicht (kg)',
  bauchumfang: 'Bauchumfang (cm)',
  beinumfang: 'Beinumfang (cm)',
  armumfang: 'Armumfang (cm)',
  ruckenumfang: 'Rückenumfang (cm)',
  brustumfang: 'Brustumfang (cm)',
  koerperfettanteil: 'Körperfettanteil (%)',
}

/**
 * Checked before writing rather than left to the database: a rejected row would
 * come back as an unreadable constraint error instead of a usable message.
 */
const BOUNDS: Record<MeasurementField, { min: number; max: number }> = {
  gewicht: { min: 20, max: 500 },
  bauchumfang: { min: 10, max: 300 },
  beinumfang: { min: 10, max: 300 },
  armumfang: { min: 10, max: 300 },
  ruckenumfang: { min: 10, max: 300 },
  brustumfang: { min: 10, max: 300 },
  koerperfettanteil: { min: 0, max: 100 },
}

export const EMPTY_INPUT: BodyMetricInput = {
  gewicht: '',
  bauchumfang: '',
  beinumfang: '',
  armumfang: '',
  ruckenumfang: '',
  brustumfang: '',
  koerperfettanteil: '',
}

/**
 * Returns null when a given value is implausible, and also when nothing at all
 * was measured. An empty field means "not measured" and stays null — Number('')
 * is 0, not "unknown".
 */
export function parseBodyMetrics(raw: BodyMetricInput): BodyMetricValues | null {
  const values = {} as BodyMetricValues
  let anyGiven = false

  for (const field of MEASUREMENT_FIELDS) {
    const text = raw[field].trim()
    if (text === '') {
      values[field] = null
      continue
    }
    const value = Number(text)
    const { min, max } = BOUNDS[field]
    if (!Number.isFinite(value) || value < min || value > max) return null
    values[field] = value
    anyGiven = true
  }

  return anyGiven ? values : null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/body-metrics.test.ts`
Expected: PASS, 8 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/body-metrics.ts src/lib/body-metrics.test.ts
git commit -m "feat: Eingabe-Parsing fuer Koerperwerte"
```

---

### Task 3: Aktueller Wert und Veränderung

**Files:**
- Create: `src/lib/body-change.ts`
- Test: `src/lib/body-change.test.ts`

**Interfaces:**
- Consumes: `BodyMetricRow`, `MeasurementField` aus Task 2
- Produces:
  - `latestValue(rows: BodyMetricRow[], field: MeasurementField): { value: number; datum: string } | null`
  - `changeSince(rows: BodyMetricRow[], field: MeasurementField): { delta: number; datum: string } | null`

Beide erwarten `rows` **absteigend nach Datum** sortiert, so wie der Hook aus Task 5 sie liefert.

- [ ] **Step 1: Write the failing test**

`src/lib/body-change.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { changeSince, latestValue } from './body-change'
import type { BodyMetricRow } from './body-metrics'

const row = (id: string, datum: string, overrides: Partial<BodyMetricRow> = {}): BodyMetricRow => ({
  id,
  datum,
  gewicht: null,
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
  ...overrides,
})

// Newest first, the order the hook delivers.
const rows: BodyMetricRow[] = [
  row('c', '2026-08-24', { gewicht: 82.5 }),
  row('b', '2026-08-20', { bauchumfang: 88 }),
  row('a', '2026-08-17', { gewicht: 83.3, bauchumfang: 90 }),
]

describe('latestValue', () => {
  it('returns the newest row that has the value with its date', () => {
    expect(latestValue(rows, 'gewicht')).toEqual({ value: 82.5, datum: '2026-08-24' })
  })

  it('skips rows in which the value was not measured', () => {
    // 24.08. has no circumference, so the newest one is from the 20th.
    expect(latestValue(rows, 'bauchumfang')).toEqual({ value: 88, datum: '2026-08-20' })
  })

  it('returns null when the value was never measured', () => {
    expect(latestValue(rows, 'armumfang')).toBeNull()
  })

  it('returns null for an empty history', () => {
    expect(latestValue([], 'gewicht')).toBeNull()
  })
})

describe('changeSince', () => {
  it('compares against the previous row that carried the same value', () => {
    // Not against 20.08., which has no weight at all.
    expect(changeSince(rows, 'gewicht')).toEqual({ delta: -0.8, datum: '2026-08-17' })
  })

  it('reports a gain as a positive delta', () => {
    expect(changeSince(rows, 'bauchumfang')).toEqual({ delta: -2, datum: '2026-08-17' })
    expect(changeSince([row('y', '2026-08-24', { gewicht: 84 }), row('x', '2026-08-17', { gewicht: 83 })], 'gewicht')).toEqual({
      delta: 1,
      datum: '2026-08-17',
    })
  })

  it('returns null when there is only one measurement to compare', () => {
    expect(changeSince([row('x', '2026-08-24', { gewicht: 82 })], 'gewicht')).toBeNull()
  })

  it('returns null when the value was never measured', () => {
    expect(changeSince(rows, 'beinumfang')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/body-change.test.ts`
Expected: FAIL — `Failed to resolve import './body-change'`.

- [ ] **Step 3: Write the implementation**

`src/lib/body-change.ts`:

```ts
import type { BodyMetricRow, MeasurementField } from './body-metrics'

type Measured = { value: number; datum: string }

/**
 * Both helpers expect rows sorted newest first and skip rows in which the field
 * was not measured. Comparing against the previous *date* instead would report a
 * change against null on every day that only the weight was recorded.
 */
function measured(rows: BodyMetricRow[], field: MeasurementField): Measured[] {
  return rows
    .filter((entry): entry is BodyMetricRow & Record<MeasurementField, number> => entry[field] != null)
    .map((entry) => ({ value: entry[field] as number, datum: entry.datum }))
}

export function latestValue(rows: BodyMetricRow[], field: MeasurementField): Measured | null {
  return measured(rows, field)[0] ?? null
}

export function changeSince(
  rows: BodyMetricRow[],
  field: MeasurementField,
): { delta: number; datum: string } | null {
  const [current, previous] = measured(rows, field)
  if (!current || !previous) return null
  // Rounded to two places: 82.5 - 83.3 is 0.7999999999999972 in binary floats,
  // and "-0,7999999999999972 kg" is not a reading anyone wants.
  return { delta: Math.round((current.value - previous.value) * 100) / 100, datum: previous.datum }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/body-change.test.ts`
Expected: PASS, 8 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/body-change.ts src/lib/body-change.test.ts
git commit -m "feat: aktuellen Wert und Veraenderung je Messwert berechnen"
```

---

### Task 4: Bilder verkleinern

**Files:**
- Create: `src/lib/image-resize.ts`
- Test: `src/lib/image-resize.test.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `MAX_EDGE = 1600`
  - `fitWithin(width: number, height: number, max: number): { width: number; height: number }`
  - `resizeToJpeg(file: File, max?: number, quality?: number): Promise<Blob>`

**Wichtig:** jsdom kennt kein Canvas. Nur `fitWithin` wird getestet; `resizeToJpeg` bleibt eine dünne, ungetestete Anbindung. Das ist eine bewusste Entscheidung aus der Spec, keine vergessene Lücke — deshalb steht die Rechnung getrennt.

- [ ] **Step 1: Write the failing test**

`src/lib/image-resize.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { fitWithin } from './image-resize'

describe('fitWithin', () => {
  it('leaves an image that already fits untouched', () => {
    // No upscaling: a small photo must not be blown up to the maximum.
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('scales a landscape image down by its long edge', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
  })

  it('scales a portrait image down by its long edge', () => {
    // Phone photos are portrait; the height is what has to be capped.
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('returns whole pixels', () => {
    const { width, height } = fitWithin(4032, 3024, 1600)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
  })

  it('never returns a zero edge', () => {
    // A canvas of width 0 throws; an extreme aspect ratio must still produce 1px.
    expect(fitWithin(10000, 3, 1600).height).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/image-resize.test.ts`
Expected: FAIL — `Failed to resolve import './image-resize'`.

- [ ] **Step 3: Write the implementation**

`src/lib/image-resize.ts`:

```ts
/**
 * A phone photo is 3-5 MB and the free storage tier holds 1 GB — unthrottled it
 * would be full after roughly 200 photos. Downscaled, several thousand fit.
 */
export const MAX_EDGE = 1600

/** Pure on purpose: jsdom has no canvas, so this is the part that can be tested. */
export function fitWithin(width: number, height: number, max: number) {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const factor = max / longest
  return {
    // Never zero: a canvas dimension of 0 throws, and an extreme aspect ratio
    // would round the short edge away.
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  }
}

/**
 * Thin glue around the browser APIs, deliberately untested: jsdom implements
 * neither createImageBitmap nor canvas, so a test here would only assert mocks.
 */
export async function resizeToJpeg(file: File, max = MAX_EDGE, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, max)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas unavailable')
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (!blob) throw new Error('encode failed')
    return blob
  } finally {
    // Released either way: an un-closed bitmap holds the decoded frame in memory.
    bitmap.close()
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/image-resize.test.ts`
Expected: PASS, 5 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/image-resize.ts src/lib/image-resize.test.ts
git commit -m "feat: Fotos vor dem Hochladen verkleinern"
```

---

### Task 5: Hook für Körperwerte samt Profil-Durchschrieb

**Files:**
- Create: `src/hooks/use-body-metrics.ts`
- Test: `src/hooks/use-body-metrics.test.ts`

**Interfaces:**
- Consumes: `BodyMetricRow`, `BodyMetricValues`, `MEASUREMENT_FIELDS` aus Task 2
- Produces: `useBodyMetrics(userId: string)` mit
  - `rows: BodyMetricRow[]` — absteigend nach Datum
  - `loading: boolean`, `error: boolean`
  - `saveEntry(datum: string, values: BodyMetricValues): Promise<void>` — Upsert auf `(user_id, datum)`
  - `deleteEntry(id: string): Promise<void>`
  - `reload(): Promise<void>`

**Die Kernregel dieser Phase:** `profiles.aktuelles_gewicht` bekommt das Gewicht des Eintrags mit dem **neuesten Datum**, in dem ein Gewicht steht — nicht das gerade eingetippte. Sonst überschreibt eine Korrektur an einem drei Wochen alten Eintrag das aktuelle Profilgewicht und verstellt still Kalorienziel und Trainings-Kalorienformel.

- [ ] **Step 1: Write the failing test**

`src/hooks/use-body-metrics.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { BodyMetricValues } from '../lib/body-metrics'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const values: BodyMetricValues = {
  gewicht: 82.5,
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

const rows = [
  { id: 'c', datum: '2026-08-24', gewicht: 82.5 },
  { id: 'a', datum: '2026-08-17', gewicht: 83.3 },
]

beforeEach(() => {
  vi.clearAllMocks()
})

/** Routes each table to its own builder so the writes can be told apart. */
function mockTables(builders: Record<string, ReturnType<typeof createQueryBuilder>>) {
  mockFrom.mockImplementation((table: string) => builders[table] ?? createQueryBuilder({ data: [] }))
}

describe('useBodyMetrics', () => {
  it('loads the history newest first', async () => {
    const metrics = createQueryBuilder({ data: rows })
    mockTables({ body_metrics: metrics })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rows).toEqual(rows)
    expect(metrics.order).toHaveBeenCalledWith('datum', { ascending: false })
  })

  it('upserts on the day rather than inserting a second row', async () => {
    // body_metrics has unique (user_id, datum): weighing twice a day must
    // correct the day instead of failing on the constraint.
    const metrics = createQueryBuilder({ data: rows })
    mockTables({ body_metrics: metrics })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.saveEntry('2026-08-24', values)

    expect(metrics.upsert).toHaveBeenCalledWith(
      { user_id: 'u1', datum: '2026-08-24', ...values },
      { onConflict: 'user_id,datum' },
    )
  })

  it('writes the weight of the newest entry into the profile, not the one just typed', async () => {
    // The decisive case: correcting an old entry must leave the profile alone,
    // or the calorie goal silently starts using a stale weight.
    const metrics = createQueryBuilder({ data: rows })
    // The list query and the "newest weight" query hit the same builder, so the
    // single-row lookup gets its own answer: the newest entry, not the list.
    metrics.maybeSingle = vi.fn(() => Promise.resolve({ data: { gewicht: 82.5 } }))
    const profiles = createQueryBuilder({ data: null })
    mockTables({ body_metrics: metrics, profiles })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.saveEntry('2026-08-17', { ...values, gewicht: 83.3 })

    // Not 83.3: the entry just written is older than the newest one.
    expect(profiles.update).toHaveBeenCalledWith({ aktuelles_gewicht: 82.5 })
  })

  it('clears the profile weight when no entry carries one any more', async () => {
    const metrics = createQueryBuilder({ data: [] })
    // No row carries a weight any more.
    metrics.maybeSingle = vi.fn(() => Promise.resolve({ data: null }))
    const profiles = createQueryBuilder({ data: null })
    mockTables({ body_metrics: metrics, profiles })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.deleteEntry('c')

    expect(profiles.update).toHaveBeenCalledWith({ aktuelles_gewicht: null })
  })

  it('rejects instead of reporting success when the write fails', async () => {
    const metrics = createQueryBuilder({ data: null, error: { message: 'boom' } })
    mockTables({ body_metrics: metrics })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.saveEntry('2026-08-24', values)).rejects.toThrow()
  })

  it('rejects instead of reporting success when the delete fails', async () => {
    const metrics = createQueryBuilder({ data: null, error: { message: 'boom' } })
    mockTables({ body_metrics: metrics })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.deleteEntry('c')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/use-body-metrics.test.ts`
Expected: FAIL — `Failed to resolve import './use-body-metrics'`.

- [ ] **Step 3: Write the implementation**

`src/hooks/use-body-metrics.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MEASUREMENT_FIELDS, type BodyMetricRow, type BodyMetricValues } from '../lib/body-metrics'

const COLUMNS = `id, datum, ${MEASUREMENT_FIELDS.join(', ')}`

export function useBodyMetrics(userId: string) {
  const [rows, setRows] = useState<BodyMetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const { data, error: loadError } = await supabase
      .from('body_metrics')
      .select(COLUMNS)
      .eq('user_id', userId)
      .order('datum', { ascending: false })
    if (current !== requestId.current) return
    setRows((data ?? []) as unknown as BodyMetricRow[])
    setError(Boolean(loadError))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  /**
   * profiles.aktuelles_gewicht feeds the calorie goal and the workout calorie
   * formula. It carries the weight of the entry with the NEWEST date, never the
   * one that was just typed: correcting a three-week-old entry must not reset
   * the current weight, and deleting the newest entry has to fall back to the
   * one before it.
   */
  async function syncProfileWeight() {
    const { data } = await supabase
      .from('body_metrics')
      .select('gewicht')
      .eq('user_id', userId)
      .not('gewicht', 'is', null)
      .order('datum', { ascending: false })
      .limit(1)
      .maybeSingle()

    const gewicht = (data as { gewicht: number } | null)?.gewicht ?? null
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ aktuelles_gewicht: gewicht })
      .eq('id', userId)
    if (profileError) throw new Error('profile weight sync failed')
  }

  // supabase-js resolves rather than throws on a rejected write, so an unchecked
  // error would let the UI report success while nothing was stored.
  async function saveEntry(datum: string, values: BodyMetricValues) {
    const { error: saveError } = await supabase
      .from('body_metrics')
      .upsert({ user_id: userId, datum, ...values }, { onConflict: 'user_id,datum' })
    if (saveError) throw new Error('body metric save failed')
    await syncProfileWeight()
    await reload()
  }

  async function deleteEntry(id: string) {
    const { error: deleteError } = await supabase.from('body_metrics').delete().eq('id', id)
    if (deleteError) throw new Error('body metric delete failed')
    await syncProfileWeight()
    await reload()
  }

  return { rows, loading, error, saveEntry, deleteEntry, reload }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/hooks/use-body-metrics.test.ts`
Expected: PASS, 6 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-body-metrics.ts src/hooks/use-body-metrics.test.ts
git commit -m "feat: Koerperwerte laden, speichern und ins Profil durchschreiben"
```

---

### Task 6: Erfassungsformular

**Files:**
- Create: `src/components/BodyEntryForm.tsx`
- Test: `src/components/BodyEntryForm.test.tsx`

**Interfaces:**
- Consumes: `parseBodyMetrics`, `EMPTY_INPUT`, `FIELD_LABELS`, `MEASUREMENT_FIELDS`, `BodyMetricInput`, `BodyMetricRow` aus Task 2
- Produces: Default-Export `BodyEntryForm` mit den Props
  ```ts
  {
    entry?: BodyMetricRow            // gesetzt beim Korrigieren
    onSave: (datum: string, values: BodyMetricValues) => Promise<void>
    onClose: () => void
  }
  ```

- [ ] **Step 1: Write the failing test**

`src/components/BodyEntryForm.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import BodyEntryForm from './BodyEntryForm'

afterEach(cleanup)

describe('BodyEntryForm', () => {
  it('defaults the date to today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 24, 9, 0, 0))
    render(<BodyEntryForm onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByLabelText('Datum')).toHaveValue('2026-08-24')
    vi.useRealTimers()
  })

  it('allows fractional values in every measurement field', () => {
    // Without step="any" the browser treats 82.5 as a stepMismatch and blocks
    // the whole submit with a native tooltip.
    render(<BodyEntryForm onSave={vi.fn()} onClose={vi.fn()} />)

    for (const label of [
      'Gewicht (kg)',
      'Bauchumfang (cm)',
      'Beinumfang (cm)',
      'Armumfang (cm)',
      'Rückenumfang (cm)',
      'Brustumfang (cm)',
      'Körperfettanteil (%)',
    ]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('step', 'any')
    }
  })

  it('saves the values that were entered', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<BodyEntryForm onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Datum'), { target: { value: '2026-08-24' } })
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '82.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        '2026-08-24',
        expect.objectContaining({ gewicht: 82.5, bauchumfang: null }),
      ),
    )
  })

  it('refuses an entry in which nothing was measured', async () => {
    const onSave = vi.fn()
    render(<BodyEntryForm onSave={onSave} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('refuses an implausible value without writing', async () => {
    const onSave = vi.fn()
    render(<BodyEntryForm onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '900' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows a message instead of closing when saving fails', async () => {
    // supabase-js resolves on a rejected write; an unchecked failure would look
    // like success and lose the typed values.
    const onClose = vi.fn()
    render(
      <BodyEntryForm onSave={vi.fn().mockRejectedValue(new Error('boom'))} onClose={onClose} />,
    )

    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '82.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(82.5)
  })

  it('fills the fields from an entry that is being corrected', () => {
    render(
      <BodyEntryForm
        entry={{
          id: 'a',
          datum: '2026-08-17',
          gewicht: 83.3,
          bauchumfang: 90,
          beinumfang: null,
          armumfang: null,
          ruckenumfang: null,
          brustumfang: null,
          koerperfettanteil: null,
        }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Datum')).toHaveValue('2026-08-17')
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(83.3)
    expect(screen.getByLabelText('Beinumfang (cm)')).toHaveValue(null)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/BodyEntryForm.test.tsx`
Expected: FAIL — `Failed to resolve import './BodyEntryForm'`.

- [ ] **Step 3: Write the implementation**

`src/components/BodyEntryForm.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import {
  EMPTY_INPUT,
  FIELD_LABELS,
  MEASUREMENT_FIELDS,
  parseBodyMetrics,
  type BodyMetricInput,
  type BodyMetricRow,
  type BodyMetricValues,
} from '../lib/body-metrics'

/** Local calendar day as yyyy-mm-dd — toISOString would shift the date in the evening. */
function today() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function inputFrom(entry: BodyMetricRow | undefined): BodyMetricInput {
  if (!entry) return EMPTY_INPUT
  const filled = { ...EMPTY_INPUT }
  for (const field of MEASUREMENT_FIELDS) {
    filled[field] = entry[field] == null ? '' : String(entry[field])
  }
  return filled
}

export default function BodyEntryForm({
  entry,
  onSave,
  onClose,
}: {
  entry?: BodyMetricRow
  onSave: (datum: string, values: BodyMetricValues) => Promise<void>
  onClose: () => void
}) {
  const [datum, setDatum] = useState(entry?.datum ?? today())
  const [draft, setDraft] = useState<BodyMetricInput>(() => inputFrom(entry))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const values = parseBodyMetrics(draft)
    if (!values) {
      setError(
        'Bitte mindestens einen plausiblen Wert eintragen (Gewicht 20–500 kg, Umfänge 10–300 cm, Körperfett 0–100 %).',
      )
      return
    }

    setSaving(true)
    try {
      await onSave(datum, values)
      onClose()
    } catch {
      // Nothing is cleared: the typed values are all the user has.
      setError('Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Datum
        <input type="date" value={datum} onChange={(event) => setDatum(event.target.value)} />
      </label>
      {MEASUREMENT_FIELDS.map((field) => (
        <label key={field}>
          {FIELD_LABELS[field]}
          <input
            type="number"
            // Every one of these columns is numeric: without step="any" the
            // browser rejects 82,5 and aborts the submit before we see it.
            step="any"
            value={draft[field]}
            onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
          />
        </label>
      ))}
      {error !== '' && <p role="alert">{error}</p>}
      <button type="submit" disabled={saving}>
        Speichern
      </button>
      <button type="button" onClick={onClose}>
        Abbrechen
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/BodyEntryForm.test.tsx`
Expected: PASS, 7 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/BodyEntryForm.tsx src/components/BodyEntryForm.test.tsx
git commit -m "feat: Erfassungsformular fuer Koerperwerte"
```

---

### Task 7: Körper-Dashboard

**Files:**
- Modify: `src/pages/BodyPage.tsx` (ersetzt den Platzhalter vollständig)
- Test: `src/pages/BodyPage.test.tsx` (neu)

**Interfaces:**
- Consumes: `useBodyMetrics` (Task 5), `latestValue`/`changeSince` (Task 3), `BodyEntryForm` (Task 6), `FIELD_LABELS`/`MEASUREMENT_FIELDS` (Task 2), `useSession` (bestehend)
- Produces: nichts für spätere Tasks

Das Dashboard zeigt **nur** die aktuellen Werte und die Veränderung. Verlauf und Fotos liegen auf den Unterseiten — das ist die Projektregel für Dashboards.

- [ ] **Step 1: Write the failing test**

`src/pages/BodyPage.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BodyPage from './BodyPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseBodyMetrics = vi.fn()
vi.mock('../hooks/use-body-metrics', () => ({
  useBodyMetrics: (userId: string) => mockUseBodyMetrics(userId),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const emptyRow = {
  gewicht: null,
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

function metricsResult(overrides: Record<string, unknown> = {}) {
  return {
    rows: [
      { id: 'c', datum: '2026-08-24', ...emptyRow, gewicht: 82.5 },
      { id: 'a', datum: '2026-08-17', ...emptyRow, gewicht: 83.3, bauchumfang: 90 },
    ],
    loading: false,
    error: false,
    saveEntry: vi.fn().mockResolvedValue(undefined),
    deleteEntry: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn(),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BodyPage />
    </MemoryRouter>,
  )
}

describe('BodyPage', () => {
  it('shows the newest value with its date', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()

    expect(screen.getByText('82,5 kg')).toBeInTheDocument()
    expect(screen.getByText(/24\.08\./)).toBeInTheDocument()
  })

  it('shows the change against the previous entry that carried the value', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()

    expect(screen.getByText(/−0,8 kg seit 17\.08\./)).toBeInTheDocument()
  })

  it('shows a dash for a measurement that was never taken', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()

    // Leg circumference is null in both rows.
    expect(screen.getByTestId('wert-beinumfang')).toHaveTextContent('—')
  })

  it('opens the entry form on the button', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Heute eintragen' }))

    expect(screen.getByLabelText('Datum')).toBeInTheDocument()
  })

  it('reports a failed load instead of showing an empty body area', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult({ error: true, rows: [] }))

    renderPage()

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/BodyPage.test.tsx`
Expected: FAIL — der Platzhalter rendert nur „Inhalt folgt in Phase 4".

- [ ] **Step 3: Write the implementation**

`src/pages/BodyPage.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useBodyMetrics } from '../hooks/use-body-metrics'
import { changeSince, latestValue } from '../lib/body-change'
import { FIELD_LABELS, MEASUREMENT_FIELDS, type MeasurementField } from '../lib/body-metrics'
import BodyEntryForm from '../components/BodyEntryForm'

/** German notation: comma as the decimal mark, at most one place. */
function formatValue(value: number) {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 })
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

/** Unit lives in the label, so it is taken from there rather than duplicated. */
function unitOf(field: MeasurementField) {
  const match = FIELD_LABELS[field].match(/\(([^)]+)\)/)
  return match ? match[1] : ''
}

export default function BodyPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Körper</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Dashboard userId={userId} />
}

function Dashboard({ userId }: { userId: string }) {
  const { rows, loading, error, saveEntry } = useBodyMetrics(userId)
  const [formOpen, setFormOpen] = useState(false)
  const [saveError, setSaveError] = useState('')

  if (loading) {
    return (
      <div>
        <h1>Körper</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Körper</h1>
      {error && <p role="alert">Werte konnten nicht geladen werden.</p>}

      <ul role="list">
        {MEASUREMENT_FIELDS.map((field) => {
          const latest = latestValue(rows, field)
          const change = changeSince(rows, field)
          return (
            <li key={field}>
              <span>{FIELD_LABELS[field]}</span>
              <span data-testid={`wert-${field}`}>
                {latest == null ? '—' : `${formatValue(latest.value)} ${unitOf(field)}`}
              </span>
              {latest != null && <span>{`Stand ${formatDate(latest.datum)}`}</span>}
              {change != null && (
                <span>
                  {/* U+2212 minus, not a hyphen: it lines up with digits. */}
                  {`${change.delta < 0 ? '−' : '+'}${formatValue(Math.abs(change.delta))} ${unitOf(field)} seit ${formatDate(change.datum)}`}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {saveError !== '' && <p role="alert">{saveError}</p>}

      {formOpen ? (
        <BodyEntryForm
          onSave={async (datum, values) => {
            setSaveError('')
            await saveEntry(datum, values)
          }}
          onClose={() => setFormOpen(false)}
        />
      ) : (
        <button type="button" onClick={() => setFormOpen(true)}>
          Heute eintragen
        </button>
      )}

      <Link to="/body/entries">Verlauf</Link>
      <Link to="/body/photos">Fortschrittsfotos</Link>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/BodyPage.test.tsx`
Expected: PASS, 5 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/BodyPage.tsx src/pages/BodyPage.test.tsx
git commit -m "feat: Koerper-Dashboard mit aktuellen Werten und Veraenderung"
```

---

### Task 8: Verlaufsliste

**Files:**
- Create: `src/pages/BodyEntriesPage.tsx`
- Test: `src/pages/BodyEntriesPage.test.tsx`

**Interfaces:**
- Consumes: `useBodyMetrics` (Task 5), `BodyEntryForm` (Task 6), `FIELD_LABELS`/`MEASUREMENT_FIELDS` (Task 2)
- Produces: Default-Export `BodyEntriesPage`, eingehängt in Task 11

- [ ] **Step 1: Write the failing test**

`src/pages/BodyEntriesPage.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BodyEntriesPage from './BodyEntriesPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseBodyMetrics = vi.fn()
vi.mock('../hooks/use-body-metrics', () => ({
  useBodyMetrics: (userId: string) => mockUseBodyMetrics(userId),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const emptyRow = {
  gewicht: null,
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

function metricsResult(overrides: Record<string, unknown> = {}) {
  return {
    rows: [
      { id: 'c', datum: '2026-08-24', ...emptyRow, gewicht: 82.5 },
      { id: 'a', datum: '2026-08-17', ...emptyRow, gewicht: 83.3 },
    ],
    loading: false,
    error: false,
    saveEntry: vi.fn().mockResolvedValue(undefined),
    deleteEntry: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn(),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BodyEntriesPage />
    </MemoryRouter>,
  )
}

describe('BodyEntriesPage', () => {
  it('lists every entry with its date', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()

    expect(screen.getByText('24.08.2026')).toBeInTheDocument()
    expect(screen.getByText('17.08.2026')).toBeInTheDocument()
  })

  it('says so instead of showing an empty list when nothing was recorded', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult({ rows: [] }))

    renderPage()

    expect(screen.getByText('Noch keine Einträge.')).toBeInTheDocument()
  })

  it('opens the form prefilled when correcting an entry', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Bearbeiten' })[1])

    expect(screen.getByLabelText('Datum')).toHaveValue('2026-08-17')
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(83.3)
  })

  it('deletes an entry', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = metricsResult()
    mockUseBodyMetrics.mockReturnValue(result)

    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Löschen' })[0])

    await waitFor(() => expect(result.deleteEntry).toHaveBeenCalledWith('c'))
  })

  it('reports a failed delete instead of swallowing it', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = metricsResult({ deleteEntry: vi.fn().mockRejectedValue(new Error('boom')) })
    mockUseBodyMetrics.mockReturnValue(result)

    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Löschen' })[0])

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/BodyEntriesPage.test.tsx`
Expected: FAIL — `Failed to resolve import './BodyEntriesPage'`.

- [ ] **Step 3: Write the implementation**

`src/pages/BodyEntriesPage.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useBodyMetrics } from '../hooks/use-body-metrics'
import {
  FIELD_LABELS,
  MEASUREMENT_FIELDS,
  type BodyMetricRow,
} from '../lib/body-metrics'
import BodyEntryForm from '../components/BodyEntryForm'

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

/** Only the measurements that were actually taken, so a row stays readable. */
function summarize(entry: BodyMetricRow) {
  return MEASUREMENT_FIELDS.filter((field) => entry[field] != null)
    .map((field) => `${FIELD_LABELS[field]}: ${entry[field]}`)
    .join(' · ')
}

export default function BodyEntriesPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Verlauf</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Entries userId={userId} />
}

function Entries({ userId }: { userId: string }) {
  const { rows, loading, error, saveEntry, deleteEntry } = useBodyMetrics(userId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  if (loading) {
    return (
      <div>
        <h1>Verlauf</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  async function remove(id: string) {
    setActionError('')
    try {
      await deleteEntry(id)
    } catch {
      setActionError('Eintrag konnte nicht gelöscht werden.')
    }
  }

  return (
    <div>
      <h1>Verlauf</h1>
      {error && <p role="alert">Werte konnten nicht geladen werden.</p>}
      {rows.length === 0 && <p>Noch keine Einträge.</p>}

      <ul role="list">
        {rows.map((entry) => (
          <li key={entry.id}>
            {editingId === entry.id ? (
              <BodyEntryForm
                entry={entry}
                onSave={async (datum, values) => {
                  await saveEntry(datum, values)
                }}
                onClose={() => setEditingId(null)}
              />
            ) : (
              <>
                <span>{formatDate(entry.datum)}</span>
                <span>{summarize(entry)}</span>
                <button type="button" onClick={() => setEditingId(entry.id)}>
                  Bearbeiten
                </button>
                <button type="button" onClick={() => remove(entry.id)}>
                  Löschen
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {actionError !== '' && <p role="alert">{actionError}</p>}
      <Link to="/body">Zurück zum Körperbereich</Link>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/BodyEntriesPage.test.tsx`
Expected: PASS, 5 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/BodyEntriesPage.tsx src/pages/BodyEntriesPage.test.tsx
git commit -m "feat: Verlaufsliste fuer Koerperwerte"
```

---

### Task 9: Hook für Fortschrittsfotos

**Files:**
- Create: `src/hooks/use-body-photos.ts`
- Test: `src/hooks/use-body-photos.test.ts`

**Interfaces:**
- Consumes: `resizeToJpeg` (Task 4), Bucket `body-photos` (Task 1)
- Produces: `useBodyPhotos(userId: string)` mit
  - `photos: BodyPhoto[]` — absteigend nach Datum
  - `type BodyPhoto = { id: string; datum: string; pfad: string; url: string | null }`
  - `loading: boolean`, `error: boolean`
  - `uploadPhoto(file: File, datum: string): Promise<void>`
  - `deletePhoto(photo: BodyPhoto): Promise<void>`

**Reihenfolge, beide Richtungen begründet:** Beim Hochladen erst die Datei, dann die Zeile — schlägt die Zeile fehl, wird die Datei wieder entfernt. Beim Löschen erst die Datei, dann die Zeile — so ist ein zweiter Versuch folgenlos, weil das Entfernen einer nicht vorhandenen Datei keinen Fehler meldet.

- [ ] **Step 1: Write the failing test**

`src/hooks/use-body-photos.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

const mockFrom = vi.fn()
const mockUpload = vi.fn()
const mockRemove = vi.fn()
const mockCreateSignedUrls = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
        createSignedUrls: mockCreateSignedUrls,
      }),
    },
  },
}))

// jsdom has no canvas, so the resize step is replaced wholesale.
vi.mock('../lib/image-resize', () => ({
  resizeToJpeg: vi.fn(() => Promise.resolve(new Blob(['x'], { type: 'image/jpeg' }))),
}))

const rows = [{ id: 'p1', datum: '2026-08-24', foto_url: 'u1/abc.jpg' }]

beforeEach(() => {
  vi.clearAllMocks()
  mockUpload.mockResolvedValue({ error: null })
  mockRemove.mockResolvedValue({ error: null })
  mockCreateSignedUrls.mockResolvedValue({
    data: [{ path: 'u1/abc.jpg', signedUrl: 'https://signed.example/abc' }],
    error: null,
  })
})

const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })

describe('useBodyPhotos', () => {
  it('loads the photos and pairs each with a signed link', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: rows }))

    const { useBodyPhotos } = await import('./use-body-photos')
    const { result } = renderHook(() => useBodyPhotos('u1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.photos).toEqual([
      { id: 'p1', datum: '2026-08-24', pfad: 'u1/abc.jpg', url: 'https://signed.example/abc' },
    ])
  })

  it('stores the file under the user folder so the policy accepts it', async () => {
    const builder = createQueryBuilder({ data: rows })
    mockFrom.mockReturnValue(builder)

    const { useBodyPhotos } = await import('./use-body-photos')
    const { result } = renderHook(() => useBodyPhotos('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.uploadPhoto(file, '2026-08-24')

    // The storage policy checks the first path segment against auth.uid().
    expect(mockUpload.mock.calls[0][0]).toMatch(/^u1\//)
  })

  it('removes the uploaded file again when the row cannot be written', async () => {
    // Otherwise a file nobody can see keeps occupying the quota.
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'boom' } }))

    const { useBodyPhotos } = await import('./use-body-photos')
    const { result } = renderHook(() => useBodyPhotos('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.uploadPhoto(file, '2026-08-24')).rejects.toThrow()
    expect(mockRemove).toHaveBeenCalled()
  })

  it('writes no row when the upload itself fails', async () => {
    const builder = createQueryBuilder({ data: rows })
    mockFrom.mockReturnValue(builder)
    mockUpload.mockResolvedValue({ error: { message: 'boom' } })

    const { useBodyPhotos } = await import('./use-body-photos')
    const { result } = renderHook(() => useBodyPhotos('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.uploadPhoto(file, '2026-08-24')).rejects.toThrow()
    expect(builder.insert).not.toHaveBeenCalled()
  })

  it('deletes the file before the row, so a retry is harmless', async () => {
    const builder = createQueryBuilder({ data: [] })
    mockFrom.mockReturnValue(builder)
    const order: string[] = []
    mockRemove.mockImplementation(() => {
      order.push('file')
      return Promise.resolve({ error: null })
    })
    builder.delete = vi.fn(() => {
      order.push('row')
      return builder
    })

    const { useBodyPhotos } = await import('./use-body-photos')
    const { result } = renderHook(() => useBodyPhotos('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.deletePhoto({ id: 'p1', datum: '2026-08-24', pfad: 'u1/abc.jpg', url: null })

    expect(order).toEqual(['file', 'row'])
  })

  it('keeps the row when the file could not be deleted', async () => {
    const builder = createQueryBuilder({ data: [] })
    mockFrom.mockReturnValue(builder)
    mockRemove.mockResolvedValue({ error: { message: 'boom' } })

    const { useBodyPhotos } = await import('./use-body-photos')
    const { result } = renderHook(() => useBodyPhotos('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(
      result.current.deletePhoto({ id: 'p1', datum: '2026-08-24', pfad: 'u1/abc.jpg', url: null }),
    ).rejects.toThrow()
    expect(builder.delete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/use-body-photos.test.ts`
Expected: FAIL — `Failed to resolve import './use-body-photos'`.

- [ ] **Step 3: Write the implementation**

`src/hooks/use-body-photos.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { resizeToJpeg } from '../lib/image-resize'

const BUCKET = 'body-photos'
/** One hour is plenty for a page view, and the link never reaches the database. */
const SIGNED_URL_TTL_SECONDS = 3600

export type BodyPhoto = {
  id: string
  datum: string
  /** Object path in the bucket. The column is named foto_url for historic
   *  reasons, but a URL is never stored — it is signed on demand. */
  pfad: string
  url: string | null
}

export function useBodyPhotos(userId: string) {
  const [photos, setPhotos] = useState<BodyPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const { data, error: loadError } = await supabase
      .from('body_photos')
      .select('id, datum, foto_url')
      .eq('user_id', userId)
      .order('datum', { ascending: false })
    if (current !== requestId.current) return

    const stored = (data ?? []) as { id: string; datum: string; foto_url: string }[]
    let urls = new Map<string, string>()
    if (stored.length > 0) {
      // Signed in one call rather than per row: one request instead of N.
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(stored.map((row) => row.foto_url), SIGNED_URL_TTL_SECONDS)
      urls = new Map((signed ?? []).map((item) => [item.path ?? '', item.signedUrl]))
    }
    if (current !== requestId.current) return

    setPhotos(
      stored.map((row) => ({
        id: row.id,
        datum: row.datum,
        pfad: row.foto_url,
        url: urls.get(row.foto_url) ?? null,
      })),
    )
    setError(Boolean(loadError))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  /**
   * File first, row second: a row pointing at a missing file would show as a
   * broken image, so the row is only written once the file is really there. If
   * the row then fails, the file is removed again — an orphan nobody can see
   * would keep occupying the quota forever.
   */
  async function uploadPhoto(file: File, datum: string) {
    const blob = await resizeToJpeg(file)
    // First path segment is the owner; the storage policy checks exactly that.
    const pfad = `${userId}/${crypto.randomUUID()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(pfad, blob, { contentType: 'image/jpeg' })
    if (uploadError) throw new Error('photo upload failed')

    const { error: rowError } = await supabase
      .from('body_photos')
      .insert({ user_id: userId, datum, foto_url: pfad })
    if (rowError) {
      await supabase.storage.from(BUCKET).remove([pfad])
      throw new Error('photo row failed')
    }

    await reload()
  }

  /**
   * File first here too, for the opposite reason: removing a file that is
   * already gone reports no error, so a retry after a half-failed delete simply
   * works. The reverse order would leave a row without a file behind.
   */
  async function deletePhoto(photo: BodyPhoto) {
    const { error: fileError } = await supabase.storage.from(BUCKET).remove([photo.pfad])
    if (fileError) throw new Error('photo file delete failed')

    const { error: rowError } = await supabase.from('body_photos').delete().eq('id', photo.id)
    if (rowError) throw new Error('photo row delete failed')

    await reload()
  }

  return { photos, loading, error, uploadPhoto, deletePhoto, reload }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/hooks/use-body-photos.test.ts`
Expected: PASS, 6 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-body-photos.ts src/hooks/use-body-photos.test.ts
git commit -m "feat: Fortschrittsfotos laden, hochladen und loeschen"
```

---

### Task 10: Foto-Zeitleiste

**Files:**
- Create: `src/pages/BodyPhotosPage.tsx`
- Test: `src/pages/BodyPhotosPage.test.tsx`

**Interfaces:**
- Consumes: `useBodyPhotos` (Task 9), `useSession` (bestehend)
- Produces: Default-Export `BodyPhotosPage`, eingehängt in Task 11

- [ ] **Step 1: Write the failing test**

`src/pages/BodyPhotosPage.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BodyPhotosPage from './BodyPhotosPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseBodyPhotos = vi.fn()
vi.mock('../hooks/use-body-photos', () => ({
  useBodyPhotos: (userId: string) => mockUseBodyPhotos(userId),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function photosResult(overrides: Record<string, unknown> = {}) {
  return {
    photos: [
      { id: 'p1', datum: '2026-08-24', pfad: 'u1/a.jpg', url: 'https://signed.example/a' },
      { id: 'p2', datum: '2026-08-17', pfad: 'u1/b.jpg', url: null },
    ],
    loading: false,
    error: false,
    uploadPhoto: vi.fn().mockResolvedValue(undefined),
    deletePhoto: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn(),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BodyPhotosPage />
    </MemoryRouter>,
  )
}

const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })

describe('BodyPhotosPage', () => {
  it('shows a photo through its signed link', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyPhotos.mockReturnValue(photosResult())

    renderPage()

    expect(screen.getByAltText('Fortschrittsfoto vom 24.08.2026')).toHaveAttribute(
      'src',
      'https://signed.example/a',
    )
  })

  it('says so instead of showing a broken image when no link could be signed', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyPhotos.mockReturnValue(photosResult())

    renderPage()

    expect(screen.getByText('Bild nicht verfügbar')).toBeInTheDocument()
  })

  it('uploads a chosen file for the given date', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = photosResult()
    mockUseBodyPhotos.mockReturnValue(result)

    renderPage()
    fireEvent.change(screen.getByLabelText('Datum'), { target: { value: '2026-08-24' } })
    fireEvent.change(screen.getByLabelText('Foto'), { target: { files: [file] } })

    await waitFor(() => expect(result.uploadPhoto).toHaveBeenCalledWith(file, '2026-08-24'))
  })

  it('reports a failed upload instead of swallowing it', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyPhotos.mockReturnValue(
      photosResult({ uploadPhoto: vi.fn().mockRejectedValue(new Error('boom')) }),
    )

    renderPage()
    fireEvent.change(screen.getByLabelText('Foto'), { target: { files: [file] } })

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('deletes a photo', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = photosResult()
    mockUseBodyPhotos.mockReturnValue(result)

    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Löschen' })[0])

    await waitFor(() =>
      expect(result.deletePhoto).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
      ),
    )
  })

  it('says so instead of showing an empty page when there are no photos', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyPhotos.mockReturnValue(photosResult({ photos: [] }))

    renderPage()

    expect(screen.getByText('Noch keine Fotos.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/BodyPhotosPage.test.tsx`
Expected: FAIL — `Failed to resolve import './BodyPhotosPage'`.

- [ ] **Step 3: Write the implementation**

`src/pages/BodyPhotosPage.tsx`:

```tsx
import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useBodyPhotos } from '../hooks/use-body-photos'
import type { BodyPhoto } from '../hooks/use-body-photos'

function today() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

export default function BodyPhotosPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Fortschrittsfotos</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Photos userId={userId} />
}

function Photos({ userId }: { userId: string }) {
  const { photos, loading, error, uploadPhoto, deletePhoto } = useBodyPhotos(userId)
  const [datum, setDatum] = useState(today())
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div>
        <h1>Fortschrittsfotos</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset first: picking the same file twice would otherwise fire no change.
    event.target.value = ''
    if (!file) return

    setActionError('')
    setBusy(true)
    try {
      await uploadPhoto(file, datum)
    } catch {
      setActionError('Foto konnte nicht hochgeladen werden.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(photo: BodyPhoto) {
    setActionError('')
    try {
      await deletePhoto(photo)
    } catch {
      setActionError('Foto konnte nicht gelöscht werden.')
    }
  }

  return (
    <div>
      <h1>Fortschrittsfotos</h1>
      {error && <p role="alert">Fotos konnten nicht geladen werden.</p>}

      <label>
        Datum
        <input type="date" value={datum} onChange={(event) => setDatum(event.target.value)} />
      </label>
      <label>
        Foto
        <input type="file" accept="image/*" disabled={busy} onChange={choose} />
      </label>

      {actionError !== '' && <p role="alert">{actionError}</p>}
      {photos.length === 0 && <p>Noch keine Fotos.</p>}

      <ul role="list">
        {photos.map((photo) => (
          <li key={photo.id}>
            <span>{formatDate(photo.datum)}</span>
            {photo.url == null ? (
              // A signed link can fail on its own; a bare <img> would just show
              // a broken image and say nothing about why.
              <span>Bild nicht verfügbar</span>
            ) : (
              <img src={photo.url} alt={`Fortschrittsfoto vom ${formatDate(photo.datum)}`} />
            )}
            <button type="button" onClick={() => remove(photo)}>
              Löschen
            </button>
          </li>
        ))}
      </ul>

      <Link to="/body">Zurück zum Körperbereich</Link>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/BodyPhotosPage.test.tsx`
Expected: PASS, 6 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/BodyPhotosPage.tsx src/pages/BodyPhotosPage.test.tsx
git commit -m "feat: Zeitleiste fuer Fortschrittsfotos"
```

---

### Task 11: Routen einhängen und Gesamtprüfung

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx` (bestehend, erweitern)

**Interfaces:**
- Consumes: `BodyEntriesPage` (Task 8), `BodyPhotosPage` (Task 10)
- Produces: Routen `/body/entries` und `/body/photos`

- [ ] **Step 1: Write the failing test**

An `src/App.test.tsx` anhängen. Die Datei mockt `useSession` bereits oben und schaltet die Route über `window.history.pushState` — dieses Muster wird übernommen, nicht ersetzt:

```tsx
it('shows the body history at /body/entries', async () => {
  window.history.pushState({}, '', '/body/entries')
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

  const { default: App } = await import('./App')
  render(<App />)

  expect(await screen.findByRole('heading', { name: 'Verlauf' })).toBeInTheDocument()
})

it('shows the photo timeline at /body/photos', async () => {
  window.history.pushState({}, '', '/body/photos')
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

  const { default: App } = await import('./App')
  render(<App />)

  expect(await screen.findByRole('heading', { name: 'Fortschrittsfotos' })).toBeInTheDocument()
})
```

Beide Seiten laden über ihre Hooks echte Daten. Damit der Test nicht am Supabase-Client hängt, in dieser Datei zusätzlich mocken:

```tsx
vi.mock('./hooks/use-body-metrics', () => ({
  useBodyMetrics: () => ({
    rows: [],
    loading: false,
    error: false,
    saveEntry: vi.fn(),
    deleteEntry: vi.fn(),
    reload: vi.fn(),
  }),
}))

vi.mock('./hooks/use-body-photos', () => ({
  useBodyPhotos: () => ({
    photos: [],
    loading: false,
    error: false,
    uploadPhoto: vi.fn(),
    deletePhoto: vi.fn(),
    reload: vi.fn(),
  }),
}))
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/App.test.tsx`
Expected: FAIL — die Routen gibt es noch nicht.

- [ ] **Step 3: Add the routes**

In `src/App.tsx` die Importe ergänzen:

```tsx
import BodyEntriesPage from './pages/BodyEntriesPage'
import BodyPhotosPage from './pages/BodyPhotosPage'
```

Und innerhalb der geschützten Route, direkt nach `<Route path="/body" element={<BodyPage />} />`:

```tsx
<Route path="/body/entries" element={<BodyEntriesPage />} />
<Route path="/body/photos" element={<BodyPhotosPage />} />
```

- [ ] **Step 4: Run the full verification**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
npm run build
```

Expected: Lint ohne Fehler und ohne Warnungen, keine Typfehler, alle Tests grün, Build erfolgreich. Die Warnung zur Bundle-Größe ist bekannt und gehört zu Phase 5.

- [ ] **Step 5: Update the domain model**

`docs/domaenenmodell.md` ergänzen — der Bucket ist neu und gehört dokumentiert:

- Unter „Fachliche Notizen": `body_photos.foto_url` speichert den Objektpfad im privaten Bucket `body-photos`, nicht eine URL. Angezeigt wird über kurzlebige signierte Links; der Bucket ist nicht öffentlich, die Policies prüfen den ersten Pfadabschnitt gegen `auth.uid()`.
- Ebenfalls dort: `profiles.aktuelles_gewicht` trägt das Gewicht des `body_metrics`-Eintrags mit dem neuesten Datum und wird nach jedem Schreiben und Löschen dort nachgezogen.
- Die Quellenzeile am Ende um `0006_body_photos_bucket.sql` erweitern.

Danach nach `../fitness-app.wiki/Domain-Model.md` spiegeln (Push erst nach dem Merge).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx docs/domaenenmodell.md ../fitness-app.wiki/Domain-Model.md
git commit -m "feat: Koerperbereich einhaengen und Domaenenmodell nachziehen"
```

---

## Manual Verification (nach dem Merge, gegen die echte Instanz)

Die Migration legt einen Storage-Bucket an — das lässt sich lokal nicht prüfen, weil es keine lokale Supabase-Instanz gibt.

1. In Supabase unter Storage prüfen: Bucket `body-photos` existiert und ist **nicht** öffentlich.
2. `/body` öffnen, „Heute eintragen", Gewicht `82,5` und einen Umfang eintragen, speichern. Wert erscheint mit Datum.
3. Profil öffnen: `aktuelles_gewicht` steht auf `82,5`. Das Kalorienziel im Ernährungsbereich hat sich entsprechend geändert.
4. Zweiten Eintrag mit einem früheren Datum und anderem Gewicht anlegen. Profil bleibt auf `82,5` — **das ist der wichtigste Schritt der ganzen Prüfung.**
5. Den neuesten Eintrag löschen. Profil fällt auf das Gewicht des verbliebenen Eintrags zurück.
6. Ein Foto vom Handy hochladen. Es erscheint in der Zeitleiste.
7. In Supabase unter Storage prüfen: Datei liegt unter `{deine-user-id}/…jpg` und ist deutlich kleiner als das Original.
8. Die signierte URL aus dem Seitenquelltext kopieren, in einem privaten Fenster öffnen — sie funktioniert. Danach den Pfad ohne Signatur aufrufen — er wird abgewiesen.
9. Foto löschen. Es verschwindet aus der Liste **und** aus dem Bucket.
10. Konsole auf Fehler und Warnungen prüfen. Testdaten wieder entfernen.

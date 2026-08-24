# Phase 5, Plan 1 – Fundament und drei Graphen

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Analysebereich steht: Registry, Zeitraum, gespeicherte Auswahl, drei Analyse-Unterseiten und die drei Standard-Graphen T1, E1, K1.

**Architecture:** Reine Rechenfunktionen unter `src/lib/analysis/`, je Bereich ein zeitraum-bezogener Hook, Graph-Komponenten ohne eigenen Datenzugriff. Eine Registry verbindet beides mit den Seiten und dem Picker. Die Auswahl liegt als ID-Liste in `profiles.analyse_auswahl`.

**Tech Stack:** React + Vite + TypeScript, Supabase, Recharts (neu), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-24-phase5-analysebereich-design.md`

## Global Constraints

- **Keine Drittanbieter-Namen** aus Fitness/Ernährung in Code, Kommentaren, Commit-Messages oder Docs.
- **Genau eine neue Abhängigkeit: `recharts`.** Sonst keine.
- Sprache im UI: Deutsch. Dateinamen kebab-case, Komponenten PascalCase.
- Alle Zahlenfelder für `numeric`-Spalten tragen `step="any"`.
- `supabase-js` wirft nicht — jeder Schreib- und Lesevorgang prüft `error` aus dem Ergebnis und meldet sichtbar. Rohe Datenbankmeldungen erscheinen nie im UI.
- Jeder neue Hook trägt den `requestId`-Guard gegen Antworten in falscher Reihenfolge.
- Tage sind **lokale** Tage, nie UTC.
- **Aufwärmsätze** (`ist_aufwaermsatz = true`) zählen in keiner Volumen- oder Kraftrechnung mit.
- Zeitraum-Vorgabe auf den Analyse-Seiten: **90 Tage**. Dashboards: **fest 90 Tage, ohne Umschalter**.
- Vorgabe-Auswahl: `["T1","E1","K1"]`.
- Nach jedem Task: `npm run lint`, `npx tsc -b --noEmit`, `npm test -- --run` müssen grün sein.
- Commit-Messages auf Deutsch **ohne Umlaute**, im Stil der bestehenden Historie.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `supabase/migrations/0007_analyse_auswahl.sql` | Spalte für die gespeicherte Auswahl |
| `supabase/migrations/0007_analyse_auswahl.test.ts` | Textprüfung der Migration |
| `src/lib/local-time.ts` | erweitert um `localDay` |
| `src/lib/analysis/zeitraum.ts` | Zeitraum-Typ, Beschriftungen, Startdatum |
| `src/lib/analysis/auswahl.ts` | Lesen und Umschalten der Auswahl-Liste |
| `src/lib/analysis/training-charts.ts` | `sessionsJeWoche` |
| `src/lib/analysis/nutrition-charts.ts` | `kalorienJeTag` |
| `src/lib/analysis/body-charts.ts` | `gewichtsTrend` |
| `src/lib/entry-calories.ts` | Signatur auf das strukturelle Minimum verbreitert |
| `src/hooks/use-training-analysis.ts` | Sessions samt Sätzen im Zeitraum |
| `src/hooks/use-nutrition-analysis.ts` | Einträge samt Nährwerten im Zeitraum |
| `src/hooks/use-body-analysis.ts` | Körperwerte im Zeitraum |
| `src/components/charts/ChartFrame.tsx` | gemeinsamer Rahmen: Titel, Häkchen, Leerzustand |
| `src/components/charts/TrainingFrequencyChart.tsx` | T1 |
| `src/components/charts/CaloriesPerDayChart.tsx` | E1 |
| `src/components/charts/WeightTrendChart.tsx` | K1 |
| `src/lib/analysis/registry.ts` | Anmeldung aller Graphen |
| `src/components/AnalysisPage.tsx` | gemeinsamer Aufbau der drei Analyse-Seiten |
| `src/pages/TrainingAnalysisPage.tsx` | `/training/analyse` |
| `src/pages/NutritionAnalysisPage.tsx` | `/nutrition/analyse` |
| `src/pages/BodyAnalysisPage.tsx` | `/body/analyse` |
| `src/components/ZeitraumSwitch.tsx` | Zeitraum-Umschalter der Analyse-Seiten |
| `src/App.tsx` | drei neue Routen, per `React.lazy` |
| `src/test-setup.ts` | Größenangaben, damit Recharts in jsdom zeichnet |

---

## Task 1: Migration für die gespeicherte Auswahl

**Files:**
- Create: `supabase/migrations/0007_analyse_auswahl.sql`
- Test: `supabase/migrations/0007_analyse_auswahl.test.ts`

**Interfaces:**
- Produces: Spalte `profiles.analyse_auswahl jsonb not null default '["T1","E1","K1"]'::jsonb`

Die Migration läuft beim Merge automatisch auf Produktion, und es gibt keine lokale Supabase-Instanz. Der Textvergleich ist die einzige Prüfung, die sie je bekommt — deshalb prüft er jede Zusicherung einzeln, nicht die Datei als Ganzes.

- [ ] **Step 1: Write the failing test**

`supabase/migrations/0007_analyse_auswahl.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(
  resolve(cwd(), 'supabase/migrations/0007_analyse_auswahl.sql'),
  'utf-8',
)
/** Comments name things the statements must not do. */
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0007_analyse_auswahl.sql', () => {
  it('adds the column to profiles as jsonb', () => {
    expect(statements).toMatch(/alter table public\.profiles/)
    expect(statements).toMatch(/add column .*analyse_auswahl jsonb/)
  })

  it('gives every existing row the three default charts', () => {
    // Without a default, every profile created before this migration reads as
    // null and the dashboards would come up empty for existing users.
    expect(statements).toMatch(/default '\["T1","E1","K1"\]'::jsonb/)
    expect(statements).toMatch(/not null/)
  })

  it('does not touch the existing policies', () => {
    // profiles_update_own has no `with check` — a known finding, deliberately
    // left to the hardening phase. This migration must not silently change it.
    expect(statements).not.toMatch(/create policy/)
    expect(statements).not.toMatch(/drop policy/)
    expect(statements).not.toMatch(/alter policy/)
  })

  it('adds nothing but this one column', () => {
    expect(statements).not.toMatch(/create table/)
    expect(statements.match(/add column/g)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run supabase/migrations/0007_analyse_auswahl.test.ts`
Expected: FAIL — die SQL-Datei gibt es noch nicht (`ENOENT`).

- [ ] **Step 3: Write the migration**

`supabase/migrations/0007_analyse_auswahl.sql`:

```sql
-- Which charts the user pinned to their dashboards, as a list of registry IDs.
--
-- A jsonb column on profiles rather than a new table: the value is a short list
-- that is always read and written as a whole, never queried across users.
--
-- The default is the three charts the design names as the starting view. It is
-- not null so that reading the column never needs a null branch; an empty list
-- is the honest way to say "no charts pinned".
alter table public.profiles
  add column analyse_auswahl jsonb not null default '["T1","E1","K1"]'::jsonb;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run supabase/migrations/0007_analyse_auswahl.test.ts`
Expected: PASS, 4 Tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0007_analyse_auswahl.sql supabase/migrations/0007_analyse_auswahl.test.ts
git commit -m "feat: Spalte fuer die Graphen-Auswahl im Profil"
```

---

## Task 2: Zeitraum

**Files:**
- Modify: `src/lib/local-time.ts` (ergänzen)
- Create: `src/lib/analysis/zeitraum.ts`
- Test: `src/lib/analysis/zeitraum.test.ts`
- Test: `src/lib/local-time.test.ts` (ergänzen)

**Interfaces:**
- Produces:
  ```ts
  // src/lib/local-time.ts
  export function localDay(iso: string): string          // '2026-08-24'
  // src/lib/analysis/zeitraum.ts
  export type Zeitraum = 30 | 90 | 365 | 'alles'
  export const ZEITRAEUME: { wert: Zeitraum; label: string }[]
  export const STANDARD_ZEITRAUM: Zeitraum                // 90
  export function rangeStart(zeitraum: Zeitraum, jetzt?: Date): string | null
  ```

- [ ] **Step 1: Write the failing tests**

`src/lib/local-time.test.ts` — an die bestehende Datei anhängen:

```ts
describe('localDay', () => {
  it('takes the local calendar day, not the UTC one', () => {
    // 23:50 local on the 24th is already the 25th in UTC for any positive
    // offset. An entry logged before bed belongs to that evening.
    const abends = new Date(2026, 7, 24, 23, 50).toISOString()
    expect(localDay(abends)).toBe('2026-08-24')
  })

  it('pads month and day', () => {
    expect(localDay(new Date(2026, 0, 5, 12, 0).toISOString())).toBe('2026-01-05')
  })
})
```

`src/lib/analysis/zeitraum.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { rangeStart, STANDARD_ZEITRAUM, ZEITRAEUME } from './zeitraum'

describe('rangeStart', () => {
  it('counts back whole local days', () => {
    const jetzt = new Date(2026, 7, 24, 15, 0)
    expect(rangeStart(30, jetzt)).toBe('2026-07-25')
  })

  it('crosses a year boundary', () => {
    const jetzt = new Date(2026, 0, 10, 8, 0)
    expect(rangeStart(30, jetzt)).toBe('2025-12-11')
  })

  it('returns null for the whole history', () => {
    // null means "no lower bound" — a fixed early date would silently cut off
    // anyone who imported older data.
    expect(rangeStart('alles', new Date(2026, 7, 24))).toBeNull()
  })

  it('offers exactly the four documented ranges, 90 days as the default', () => {
    expect(ZEITRAEUME.map((z) => z.wert)).toEqual([30, 90, 365, 'alles'])
    expect(STANDARD_ZEITRAUM).toBe(90)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/lib/analysis/zeitraum.test.ts src/lib/local-time.test.ts`
Expected: FAIL — `zeitraum.ts` fehlt, `localDay` ist kein Export.

- [ ] **Step 3: Write the implementation**

An `src/lib/local-time.ts` anhängen:

```ts
/** `timestamptz` → the local calendar day it falls on, as `YYYY-MM-DD`. */
export function localDay(iso: string): string {
  const date = new Date(iso)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
```

`src/lib/analysis/zeitraum.ts`:

```ts
/** Days back, or the whole history. */
export type Zeitraum = 30 | 90 | 365 | 'alles'

export const ZEITRAEUME: { wert: Zeitraum; label: string }[] = [
  { wert: 30, label: '30 Tage' },
  { wert: 90, label: '90 Tage' },
  { wert: 365, label: '1 Jahr' },
  { wert: 'alles', label: 'alles' },
]

export const STANDARD_ZEITRAUM: Zeitraum = 90

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * First day the range covers, as `YYYY-MM-DD`, or null for the whole history.
 *
 * Built from local calendar parts and not from a millisecond subtraction: the
 * latter drifts by an hour across a daylight-saving change and would drop or
 * duplicate a day at the edge of the range.
 */
export function rangeStart(zeitraum: Zeitraum, jetzt: Date = new Date()): string | null {
  if (zeitraum === 'alles') return null
  const start = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() - zeitraum)
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/lib/analysis/zeitraum.test.ts src/lib/local-time.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/zeitraum.ts src/lib/analysis/zeitraum.test.ts src/lib/local-time.ts src/lib/local-time.test.ts
git commit -m "feat: Zeitraum-Auswahl und lokaler Kalendertag"
```

---

## Task 3: Auswahl lesen und umschalten

**Files:**
- Create: `src/lib/analysis/auswahl.ts`
- Test: `src/lib/analysis/auswahl.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function parseAuswahl(gespeichert: unknown, gueltigeIds: string[]): string[]
  export function toggleAuswahl(auswahl: string[], id: string): string[]
  ```

- [ ] **Step 1: Write the failing test**

`src/lib/analysis/auswahl.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseAuswahl, toggleAuswahl } from './auswahl'

const GUELTIG = ['T1', 'E1', 'K1', 'T3']

describe('parseAuswahl', () => {
  it('keeps the stored ids that still exist', () => {
    expect(parseAuswahl(['T1', 'K1'], GUELTIG)).toEqual(['T1', 'K1'])
  })

  it('drops ids no chart answers to any more', () => {
    // A chart removed in a later version must not break the dashboard of
    // someone who had pinned it.
    expect(parseAuswahl(['T1', 'T99'], GUELTIG)).toEqual(['T1'])
  })

  it('treats anything that is not a list of strings as an empty selection', () => {
    // The column is jsonb: nothing stops a hand-edit in the table editor from
    // putting an object or a number in there.
    expect(parseAuswahl(null, GUELTIG)).toEqual([])
    expect(parseAuswahl({ T1: true }, GUELTIG)).toEqual([])
    expect(parseAuswahl([1, 2], GUELTIG)).toEqual([])
    expect(parseAuswahl('T1', GUELTIG)).toEqual([])
  })

  it('removes duplicates', () => {
    expect(parseAuswahl(['T1', 'T1'], GUELTIG)).toEqual(['T1'])
  })
})

describe('toggleAuswahl', () => {
  it('adds an id that is not selected', () => {
    expect(toggleAuswahl(['T1'], 'K1')).toEqual(['T1', 'K1'])
  })

  it('removes an id that is selected', () => {
    expect(toggleAuswahl(['T1', 'K1'], 'T1')).toEqual(['K1'])
  })

  it('does not change the list it was given', () => {
    // The caller holds this array in React state; mutating it in place would
    // skip the re-render.
    const vorher = ['T1']
    toggleAuswahl(vorher, 'K1')
    expect(vorher).toEqual(['T1'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/auswahl.test.ts`
Expected: FAIL — `auswahl.ts` fehlt.

- [ ] **Step 3: Write the implementation**

`src/lib/analysis/auswahl.ts`:

```ts
/**
 * The stored selection, reduced to the ids that still answer to a chart.
 *
 * `gespeichert` comes from a jsonb column and is therefore whatever is in the
 * database, not necessarily what we last wrote: a hand-edit or a chart removed
 * in a later version must degrade to "nothing pinned", never to a crash.
 */
export function parseAuswahl(gespeichert: unknown, gueltigeIds: string[]): string[] {
  if (!Array.isArray(gespeichert)) return []
  if (!gespeichert.every((eintrag) => typeof eintrag === 'string')) return []
  const bekannt = new Set(gueltigeIds)
  return [...new Set(gespeichert as string[])].filter((id) => bekannt.has(id))
}

/** Adds or removes one id, always as a new array. */
export function toggleAuswahl(auswahl: string[], id: string): string[] {
  return auswahl.includes(id) ? auswahl.filter((eintrag) => eintrag !== id) : [...auswahl, id]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/auswahl.test.ts`
Expected: PASS, 7 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/auswahl.ts src/lib/analysis/auswahl.test.ts
git commit -m "feat: Graphen-Auswahl lesen und umschalten"
```

---

## Task 4: Die drei Rechnungen

**Files:**
- Create: `src/lib/analysis/training-charts.ts`, `src/lib/analysis/nutrition-charts.ts`, `src/lib/analysis/body-charts.ts`
- Test: je eine `.test.ts` daneben
- Modify: `src/lib/entry-calories.ts` (Signatur verbreitern)

**Interfaces:**
- Consumes: `localDay` aus Task 2
- Produces:
  ```ts
  export type WochenPunkt = { woche: string; anzahl: number }
  export function sessionsJeWoche(sessions: { gestartet_am: string | null }[]): WochenPunkt[]

  export type TagesPunkt = { tag: string; kalorien: number }
  export function kalorienJeTag(
    entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[],
  ): TagesPunkt[]

  export type TrendPunkt = { datum: string; gewicht: number; trend: number }
  export function gewichtsTrend(
    rows: { datum: string; gewicht: number | null }[],
    halbwertszeitTage?: number,
  ): TrendPunkt[]
  ```

`entry-calories.ts` bekommt das strukturelle Minimum als Parametertyp, damit die Analyse-Abfrage nicht die ganze `FoodEntry`-Form laden muss, nur um Kalorien zu rechnen. `FoodEntry` erfüllt den schmaleren Typ weiterhin.

- [ ] **Step 1: Write the failing tests**

`src/lib/analysis/training-charts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sessionsJeWoche } from './training-charts'

const am = (jahr: number, monat: number, tag: number) =>
  new Date(jahr, monat - 1, tag, 18, 0).toISOString()

describe('sessionsJeWoche', () => {
  it('counts sessions per ISO week, oldest first', () => {
    const punkte = sessionsJeWoche([
      { gestartet_am: am(2026, 8, 17) }, // Mo, KW34
      { gestartet_am: am(2026, 8, 19) }, // Mi, KW34
      { gestartet_am: am(2026, 8, 24) }, // Mo, KW35
    ])
    expect(punkte).toEqual([
      { woche: '2026-KW34', anzahl: 2 },
      { woche: '2026-KW35', anzahl: 1 },
    ])
  })

  it('puts Sunday in the week that started on Monday', () => {
    // Sunday is day 0 in JavaScript. A naive week calculation moves it into the
    // following week and splits every weekend across two bars.
    expect(sessionsJeWoche([{ gestartet_am: am(2026, 8, 23) }])).toEqual([
      { woche: '2026-KW34', anzahl: 1 },
    ])
  })

  it('reports weeks without a session as zero', () => {
    // Without the gap the line would join two distant weeks and read as
    // continuous training.
    const punkte = sessionsJeWoche([
      { gestartet_am: am(2026, 8, 3) }, // KW32
      { gestartet_am: am(2026, 8, 24) }, // KW35
    ])
    expect(punkte.map((p) => p.anzahl)).toEqual([1, 0, 0, 1])
  })

  it('ignores a session that was never started', () => {
    expect(sessionsJeWoche([{ gestartet_am: null }])).toEqual([])
  })

  it('returns nothing for no sessions', () => {
    expect(sessionsJeWoche([])).toEqual([])
  })
})
```

`src/lib/analysis/nutrition-charts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { kalorienJeTag } from './nutrition-charts'

const um = (tag: number, stunde: number) => new Date(2026, 7, tag, stunde, 0).toISOString()

describe('kalorienJeTag', () => {
  it('sums a day and scales by the amount, oldest first', () => {
    // Nutritional values are per 100 g.
    const punkte = kalorienJeTag([
      { zeitpunkt: um(24, 8), menge: 200, products: { kalorien: 100 } },
      { zeitpunkt: um(24, 19), menge: 50, products: { kalorien: 400 } },
      { zeitpunkt: um(23, 12), menge: 100, products: { kalorien: 250 } },
    ])
    expect(punkte).toEqual([
      { tag: '2026-08-23', kalorien: 250 },
      { tag: '2026-08-24', kalorien: 400 },
    ])
  })

  it('keeps a late entry on its own local day', () => {
    const punkte = kalorienJeTag([
      { zeitpunkt: um(24, 23), menge: 100, products: { kalorien: 100 } },
    ])
    expect(punkte[0].tag).toBe('2026-08-24')
  })

  it('skips an entry whose product is gone', () => {
    // The product row can be deleted; the entry stays. Counting it as 0 would
    // be a silent lie about that day's intake, so the entry drops out entirely.
    expect(kalorienJeTag([{ zeitpunkt: um(24, 8), menge: 100, products: null }])).toEqual([])
  })

  it('omits days without entries rather than inventing zeros', () => {
    // A day with no entry means "not logged", not "ate nothing" — a zero bar
    // would read as a fasting day.
    const punkte = kalorienJeTag([
      { zeitpunkt: um(20, 8), menge: 100, products: { kalorien: 100 } },
      { zeitpunkt: um(24, 8), menge: 100, products: { kalorien: 100 } },
    ])
    expect(punkte.map((p) => p.tag)).toEqual(['2026-08-20', '2026-08-24'])
  })
})
```

`src/lib/analysis/body-charts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { gewichtsTrend } from './body-charts'

describe('gewichtsTrend', () => {
  it('starts the trend at the first value', () => {
    const punkte = gewichtsTrend([{ datum: '2026-08-01', gewicht: 83 }])
    expect(punkte).toEqual([{ datum: '2026-08-01', gewicht: 83, trend: 83 }])
  })

  it('smooths a single outlier instead of following it', () => {
    // Daily weight swings by a kilo or two through water. Unsmoothed, the noise
    // reads as progress.
    const punkte = gewichtsTrend([
      { datum: '2026-08-01', gewicht: 83 },
      { datum: '2026-08-02', gewicht: 83 },
      { datum: '2026-08-03', gewicht: 86 },
    ])
    expect(punkte[2].gewicht).toBe(86)
    expect(punkte[2].trend).toBeGreaterThan(83)
    expect(punkte[2].trend).toBeLessThan(84)
  })

  it('weights by elapsed time, not by position in the list', () => {
    // Weighing daily and weighing fortnightly must not give the same weight to
    // the previous entry. After two half-lives the old trend counts a quarter.
    const dicht = gewichtsTrend([
      { datum: '2026-08-01', gewicht: 80 },
      { datum: '2026-08-02', gewicht: 90 },
    ])
    const weit = gewichtsTrend([
      { datum: '2026-08-01', gewicht: 80 },
      { datum: '2026-08-29', gewicht: 90 },
    ])
    expect(weit[1].trend).toBeGreaterThan(dicht[1].trend)
    expect(weit[1].trend).toBeGreaterThan(89)
  })

  it('skips entries without a weight', () => {
    // A body entry may record only circumferences.
    const punkte = gewichtsTrend([
      { datum: '2026-08-01', gewicht: 83 },
      { datum: '2026-08-02', gewicht: null },
    ])
    expect(punkte).toHaveLength(1)
  })

  it('sorts oldest first even if the rows arrive newest first', () => {
    // useBodyMetrics orders by datum descending; feeding that in unsorted would
    // run the smoothing backwards through time.
    const punkte = gewichtsTrend([
      { datum: '2026-08-03', gewicht: 82 },
      { datum: '2026-08-01', gewicht: 83 },
    ])
    expect(punkte.map((p) => p.datum)).toEqual(['2026-08-01', '2026-08-03'])
    expect(punkte[0].trend).toBe(83)
  })

  it('returns nothing for no rows', () => {
    expect(gewichtsTrend([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/lib/analysis`
Expected: FAIL — die drei Module fehlen.

- [ ] **Step 3: Write the implementations**

`src/lib/analysis/training-charts.ts`:

```ts
import { localDay } from '../local-time'

export type WochenPunkt = { woche: string; anzahl: number }

/** Monday of the week `iso` falls in, as a local `YYYY-MM-DD`. */
function wochenStart(iso: string): string {
  const date = new Date(iso)
  // getDay() is 0 for Sunday; shifting by 6 keeps Sunday in the week that
  // started the previous Monday.
  const versatz = (date.getDay() + 6) % 7
  const montag = new Date(date.getFullYear(), date.getMonth(), date.getDate() - versatz)
  return localDay(montag.toISOString())
}

/** ISO week number of a Monday given as `YYYY-MM-DD`. */
function wochenLabel(montag: string): string {
  const [jahr, monat, tag] = montag.split('-').map(Number)
  const donnerstag = new Date(jahr, monat - 1, tag + 3) // ISO weeks belong to their Thursday
  const jahresStart = new Date(donnerstag.getFullYear(), 0, 1)
  const tageSeitJahresStart = Math.round(
    (donnerstag.getTime() - jahresStart.getTime()) / 86_400_000,
  )
  const woche = Math.floor(tageSeitJahresStart / 7) + 1
  return `${donnerstag.getFullYear()}-KW${woche}`
}

/**
 * Sessions per calendar week, oldest first, with empty weeks kept as zero.
 *
 * The gaps matter: without them the line joins two distant weeks and reads as
 * uninterrupted training.
 */
export function sessionsJeWoche(sessions: { gestartet_am: string | null }[]): WochenPunkt[] {
  const montage = sessions
    .filter((session): session is { gestartet_am: string } => session.gestartet_am != null)
    .map((session) => wochenStart(session.gestartet_am))
  if (montage.length === 0) return []

  const anzahlJeMontag = new Map<string, number>()
  for (const montag of montage) {
    anzahlJeMontag.set(montag, (anzahlJeMontag.get(montag) ?? 0) + 1)
  }

  const sortiert = [...anzahlJeMontag.keys()].sort()
  const [jahr, monat, tag] = sortiert[0].split('-').map(Number)
  const letzter = sortiert[sortiert.length - 1]

  const punkte: WochenPunkt[] = []
  const lauf = new Date(jahr, monat - 1, tag)
  for (;;) {
    const montag = localDay(lauf.toISOString())
    punkte.push({ woche: wochenLabel(montag), anzahl: anzahlJeMontag.get(montag) ?? 0 })
    if (montag === letzter) break
    lauf.setDate(lauf.getDate() + 7)
  }
  return punkte
}
```

`src/lib/analysis/nutrition-charts.ts`:

```ts
import { entryKalorien } from '../entry-calories'
import { localDay } from '../local-time'

export type TagesPunkt = { tag: string; kalorien: number }

/**
 * Calories per local day, oldest first.
 *
 * Days without entries are left out rather than filled with zero: no entry
 * means "not logged", and a zero bar would read as a fasting day.
 */
export function kalorienJeTag(
  entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[],
): TagesPunkt[] {
  const summeJeTag = new Map<string, number>()
  for (const entry of entries) {
    if (!entry.products) continue
    const tag = localDay(entry.zeitpunkt)
    summeJeTag.set(tag, (summeJeTag.get(tag) ?? 0) + entryKalorien(entry))
  }
  return [...summeJeTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, kalorien]) => ({ tag, kalorien: Math.round(kalorien) }))
}
```

`src/lib/analysis/body-charts.ts`:

```ts
export type TrendPunkt = { datum: string; gewicht: number; trend: number }

const TAG_MS = 86_400_000

/**
 * Weights with an exponentially weighted moving average, weighted by elapsed
 * time rather than by position in the list.
 *
 * One weighs daily in one month and fortnightly in the next; a fortnight-old
 * value must not carry the same weight as yesterday's. With a seven-day
 * half-life the previous trend counts half after a week, a quarter after two.
 */
export function gewichtsTrend(
  rows: { datum: string; gewicht: number | null }[],
  halbwertszeitTage = 7,
): TrendPunkt[] {
  const gewogen = rows
    .filter((row): row is { datum: string; gewicht: number } => row.gewicht != null)
    .sort((a, b) => a.datum.localeCompare(b.datum))

  const punkte: TrendPunkt[] = []
  let trend = 0
  let vorherigesDatum = 0

  for (const row of gewogen) {
    const jetzt = new Date(`${row.datum}T00:00:00`).getTime()
    if (punkte.length === 0) {
      trend = row.gewicht
    } else {
      const tage = (jetzt - vorherigesDatum) / TAG_MS
      // 0.5 ** (tage / halbwertszeit): how much of the old trend survives.
      const rest = 0.5 ** (tage / halbwertszeitTage)
      trend = trend * rest + row.gewicht * (1 - rest)
    }
    vorherigesDatum = jetzt
    punkte.push({ datum: row.datum, gewicht: row.gewicht, trend: Math.round(trend * 10) / 10 })
  }
  return punkte
}
```

`src/lib/entry-calories.ts` — nur die beiden Signaturen ändern, die Rechnung bleibt:

```ts
import type { FoodEntry } from '../hooks/use-food-entries'

/**
 * The structural minimum a calorie calculation needs. Stated as its own type so
 * an analysis query can select two columns instead of the whole entry shape;
 * `FoodEntry` satisfies it.
 */
export type KalorienEintrag = { menge: number; products: { kalorien: number } | null }

/** Nutritional values are stored per 100 g; an entry stores its amount in grams. */
export function entryKalorien(entry: KalorienEintrag): number {
  if (!entry.products) return 0
  return (entry.products.kalorien * entry.menge) / 100
}

export function sumKalorien(entries: FoodEntry[]): number {
  return entries.reduce((total, entry) => total + entryKalorien(entry), 0)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run src/lib/analysis src/lib/entry-calories.test.ts`
Expected: PASS. `entry-calories.test.ts` muss unverändert grün bleiben — der Typ wird weiter, nicht enger.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis src/lib/entry-calories.ts
git commit -m "feat: Rechnungen fuer Trainingsfrequenz, Tageskalorien und Gewichtstrend"
```

---

## Task 5: Hook für die Trainingsanalyse

**Files:**
- Create: `src/hooks/use-training-analysis.ts`
- Test: `src/hooks/use-training-analysis.test.ts`

**Interfaces:**
- Consumes: `rangeStart` aus Task 2
- Produces:
  ```ts
  export type AnalysisSession = {
    id: string
    gestartet_am: string | null
    beendet_am: string | null
    gesamt_kalorien: number | null
  }
  export function useTrainingAnalysis(userId: string, zeitraum: Zeitraum): {
    sessions: AnalysisSession[]
    loading: boolean
    error: boolean
  }
  ```

Plan 1 lädt nur, was T1 braucht. Die Abfrage ist so gebaut, dass Plan 2 die Sätze über einen eingebetteten `workout_session_sets(...)`-Teil ergänzen kann, ohne den Hook umzubauen.

- [ ] **Step 1: Write the failing test**

`src/hooks/use-training-analysis.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const gte = vi.fn()
const order = vi.fn()
const eq = vi.fn()
const select = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => ({ select: (columns: string) => select(table, columns) }) },
}))

type Ergebnis = { data: unknown; error: unknown }
let ergebnis: Ergebnis

beforeEach(() => {
  vi.clearAllMocks()
  ergebnis = { data: [], error: null }
  const builder = {
    eq: (...args: unknown[]) => {
      eq(...args)
      return builder
    },
    gte: (...args: unknown[]) => {
      gte(...args)
      return builder
    },
    order: (...args: unknown[]) => {
      order(...args)
      return Promise.resolve(ergebnis)
    },
  }
  select.mockImplementation(() => builder)
})

describe('useTrainingAnalysis', () => {
  it('loads the sessions of the range, oldest first', async () => {
    ergebnis = {
      data: [{ id: 'a', gestartet_am: '2026-08-17T18:00:00Z', beendet_am: null, gesamt_kalorien: 300 }],
      error: null,
    }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.error).toBe(false)
    expect(eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(order).toHaveBeenCalledWith('gestartet_am', { ascending: true })
  })

  it('bounds the query by the range', async () => {
    renderHook(() => useTrainingAnalysis('u1', 30))
    await waitFor(() => expect(gte).toHaveBeenCalled())
    // The whole point of the range switch: without the filter every chart would
    // pull the full history on every view.
    expect(gte).toHaveBeenCalledWith('gestartet_am', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('does not bound the query for the whole history', async () => {
    const { result } = renderHook(() => useTrainingAnalysis('u1', 'alles'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(gte).not.toHaveBeenCalled()
  })

  it('reports a failed load instead of showing an empty chart', async () => {
    // supabase-js resolves on a failed read; an unchecked error would look like
    // "no training yet" and quietly misinform.
    ergebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.sessions).toEqual([])
  })
})
```

Der Import gehört zu den übrigen oben in der Datei:

```ts
import { useTrainingAnalysis } from './use-training-analysis'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/use-training-analysis.test.ts`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Write the implementation**

`src/hooks/use-training-analysis.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rangeStart, type Zeitraum } from '../lib/analysis/zeitraum'

export type AnalysisSession = {
  id: string
  gestartet_am: string | null
  beendet_am: string | null
  gesamt_kalorien: number | null
}

const COLUMNS = 'id, gestartet_am, beendet_am, gesamt_kalorien'

/**
 * One query per area, not one per chart: a page shows up to eight training
 * charts, and each of them would otherwise fetch the same rows again.
 */
export function useTrainingAnalysis(userId: string, zeitraum: Zeitraum) {
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    setLoading(true)
    let query = supabase.from('workout_sessions').select(COLUMNS).eq('user_id', userId)
    const start = rangeStart(zeitraum)
    if (start) query = query.gte('gestartet_am', start)
    const { data, error: loadError } = await query.order('gestartet_am', { ascending: true })
    if (current !== requestId.current) return
    setSessions((data ?? []) as unknown as AnalysisSession[])
    setError(Boolean(loadError))
    setLoading(false)
  }, [userId, zeitraum])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { sessions, loading, error }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/hooks/use-training-analysis.test.ts`
Expected: PASS, 4 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-training-analysis.ts src/hooks/use-training-analysis.test.ts
git commit -m "feat: Hook fuer die Trainingsanalyse"
```

---

## Task 6: Hook für die Ernährungsanalyse

**Files:**
- Create: `src/hooks/use-nutrition-analysis.ts`
- Test: `src/hooks/use-nutrition-analysis.test.ts`

**Interfaces:**
- Consumes: `rangeStart` aus Task 2
- Produces:
  ```ts
  export type AnalysisFoodEntry = {
    zeitpunkt: string
    menge: number
    mahlzeit: number | null
    products: { kalorien: number; eiweiss: number; fett: number; kohlenhydrate: number } | null
  }
  export function useNutritionAnalysis(userId: string, zeitraum: Zeitraum): {
    entries: AnalysisFoodEntry[]
    loading: boolean
    error: boolean
  }
  ```

Die Makro-Spalten werden schon hier mitgeladen, obwohl E1 nur Kalorien braucht: E2 und E3 in Plan 2 lesen dieselbe Abfrage, und eine zweite Runde am Hook wäre eine Änderung an geprüftem Code.

`zeitpunkt` ist `timestamptz`, `rangeStart` liefert `YYYY-MM-DD`. Postgres vergleicht das als Mitternacht des Tages — das ist genau die gewünschte Untergrenze.

- [ ] **Step 1: Write the failing test**

`src/hooks/use-nutrition-analysis.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNutritionAnalysis } from './use-nutrition-analysis'

const gte = vi.fn()
const order = vi.fn()
const eq = vi.fn()
const select = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => ({ select: (columns: string) => select(table, columns) }) },
}))

let ergebnis: { data: unknown; error: unknown }

beforeEach(() => {
  vi.clearAllMocks()
  ergebnis = { data: [], error: null }
  const builder = {
    eq: (...args: unknown[]) => {
      eq(...args)
      return builder
    },
    gte: (...args: unknown[]) => {
      gte(...args)
      return builder
    },
    order: (...args: unknown[]) => {
      order(...args)
      return Promise.resolve(ergebnis)
    },
  }
  select.mockImplementation(() => builder)
})

describe('useNutritionAnalysis', () => {
  it('loads entries with the nutritional values the charts need', async () => {
    ergebnis = {
      data: [
        {
          zeitpunkt: '2026-08-24T08:00:00Z',
          menge: 100,
          mahlzeit: 1,
          products: { kalorien: 250, eiweiss: 10, fett: 5, kohlenhydrate: 40 },
        },
      ],
      error: null,
    }
    const { result } = renderHook(() => useNutritionAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.entries).toHaveLength(1)
    expect(eq).toHaveBeenCalledWith('user_id', 'u1')
    // The embedded product columns must be part of the one query; a second
    // round-trip per entry would make a 90-day range unusable.
    const [, columns] = select.mock.calls[0]
    expect(columns).toContain('products(')
    expect(columns).toContain('kalorien')
    expect(columns).toContain('eiweiss')
  })

  it('bounds the query by the range and orders oldest first', async () => {
    renderHook(() => useNutritionAnalysis('u1', 90))
    await waitFor(() => expect(order).toHaveBeenCalled())
    expect(gte).toHaveBeenCalledWith('zeitpunkt', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(order).toHaveBeenCalledWith('zeitpunkt', { ascending: true })
  })

  it('does not bound the query for the whole history', async () => {
    const { result } = renderHook(() => useNutritionAnalysis('u1', 'alles'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(gte).not.toHaveBeenCalled()
  })

  it('reports a failed load', async () => {
    ergebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useNutritionAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.entries).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/use-nutrition-analysis.test.ts`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Write the implementation**

`src/hooks/use-nutrition-analysis.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rangeStart, type Zeitraum } from '../lib/analysis/zeitraum'

export type AnalysisFoodEntry = {
  zeitpunkt: string
  menge: number
  mahlzeit: number | null
  products: { kalorien: number; eiweiss: number; fett: number; kohlenhydrate: number } | null
}

// The macro columns come along although E1 only needs calories: E2 and E3 read
// the same query later, and widening it then would mean changing reviewed code.
const COLUMNS = 'zeitpunkt, menge, mahlzeit, products(kalorien, eiweiss, fett, kohlenhydrate)'

export function useNutritionAnalysis(userId: string, zeitraum: Zeitraum) {
  const [entries, setEntries] = useState<AnalysisFoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    setLoading(true)
    let query = supabase.from('food_entries').select(COLUMNS).eq('user_id', userId)
    const start = rangeStart(zeitraum)
    // `zeitpunkt` is timestamptz and the bound is a date: Postgres reads it as
    // midnight of that day, which is the lower bound we want.
    if (start) query = query.gte('zeitpunkt', start)
    const { data, error: loadError } = await query.order('zeitpunkt', { ascending: true })
    if (current !== requestId.current) return
    setEntries((data ?? []) as unknown as AnalysisFoodEntry[])
    setError(Boolean(loadError))
    setLoading(false)
  }, [userId, zeitraum])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++
    }
  }, [reload])

  return { entries, loading, error }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/hooks/use-nutrition-analysis.test.ts`
Expected: PASS, 4 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-nutrition-analysis.ts src/hooks/use-nutrition-analysis.test.ts
git commit -m "feat: Hook fuer die Ernaehrungsanalyse"
```

---

## Task 7: Hook für die Körperanalyse

**Files:**
- Create: `src/hooks/use-body-analysis.ts`
- Test: `src/hooks/use-body-analysis.test.ts`

**Interfaces:**
- Consumes: `rangeStart` aus Task 2, `MEASUREMENT_FIELDS` aus `src/lib/body-metrics.ts`
- Produces:
  ```ts
  export function useBodyAnalysis(userId: string, zeitraum: Zeitraum): {
    rows: BodyMetricRow[]
    loading: boolean
    error: boolean
  }
  ```

`BodyMetricRow` ist der bestehende Typ aus `src/lib/body-metrics.ts` und wird nicht neu definiert.

- [ ] **Step 1: Write the failing test**

`src/hooks/use-body-analysis.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBodyAnalysis } from './use-body-analysis'

const gte = vi.fn()
const order = vi.fn()
const eq = vi.fn()
const select = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => ({ select: (columns: string) => select(table, columns) }) },
}))

let ergebnis: { data: unknown; error: unknown }

beforeEach(() => {
  vi.clearAllMocks()
  ergebnis = { data: [], error: null }
  const builder = {
    eq: (...args: unknown[]) => {
      eq(...args)
      return builder
    },
    gte: (...args: unknown[]) => {
      gte(...args)
      return builder
    },
    order: (...args: unknown[]) => {
      order(...args)
      return Promise.resolve(ergebnis)
    },
  }
  select.mockImplementation(() => builder)
})

describe('useBodyAnalysis', () => {
  it('loads the measurement columns of the range, oldest first', async () => {
    ergebnis = { data: [{ id: 'a', datum: '2026-08-17', gewicht: 83.3 }], error: null }
    const { result } = renderHook(() => useBodyAnalysis('u1', 90))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rows).toHaveLength(1)
    expect(eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(order).toHaveBeenCalledWith('datum', { ascending: true })
    const [, columns] = select.mock.calls[0]
    // K2 needs every circumference, so the column list is the shared one rather
    // than a hand-written subset that could drift from the field list.
    expect(columns).toContain('bauchumfang')
    expect(columns).toContain('koerperfettanteil')
  })

  it('bounds the query by the range', async () => {
    renderHook(() => useBodyAnalysis('u1', 30))
    await waitFor(() => expect(gte).toHaveBeenCalled())
    expect(gte).toHaveBeenCalledWith('datum', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('does not bound the query for the whole history', async () => {
    const { result } = renderHook(() => useBodyAnalysis('u1', 'alles'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(gte).not.toHaveBeenCalled()
  })

  it('reports a failed load', async () => {
    ergebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useBodyAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.rows).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/use-body-analysis.test.ts`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Write the implementation**

`src/hooks/use-body-analysis.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rangeStart, type Zeitraum } from '../lib/analysis/zeitraum'
import { MEASUREMENT_FIELDS, type BodyMetricRow } from '../lib/body-metrics'

// Derived from the shared field list rather than written out: a measurement
// added later must not silently miss the charts.
const COLUMNS = `id, datum, ${MEASUREMENT_FIELDS.join(', ')}`

/** Ascending, unlike useBodyMetrics: a chart reads left to right through time. */
export function useBodyAnalysis(userId: string, zeitraum: Zeitraum) {
  const [rows, setRows] = useState<BodyMetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    setLoading(true)
    let query = supabase.from('body_metrics').select(COLUMNS).eq('user_id', userId)
    const start = rangeStart(zeitraum)
    if (start) query = query.gte('datum', start)
    const { data, error: loadError } = await query.order('datum', { ascending: true })
    if (current !== requestId.current) return
    setRows((data ?? []) as unknown as BodyMetricRow[])
    setError(Boolean(loadError))
    setLoading(false)
  }, [userId, zeitraum])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++
    }
  }, [reload])

  return { rows, loading, error }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/hooks/use-body-analysis.test.ts`
Expected: PASS, 4 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-body-analysis.ts src/hooks/use-body-analysis.test.ts
git commit -m "feat: Hook fuer die Koerperanalyse"
```

---

## Task 8: Recharts einbinden, Rahmen und T1

**Files:**
- Modify: `package.json` (Abhängigkeit), `src/test-setup.ts`
- Create: `src/components/charts/ChartFrame.tsx`, `src/components/charts/TrainingFrequencyChart.tsx`
- Test: `src/components/charts/ChartFrame.test.tsx`, `src/components/charts/TrainingFrequencyChart.test.tsx`

**Interfaces:**
- Consumes: `sessionsJeWoche` aus Task 4, `AnalysisSession` aus Task 5
- Produces:
  ```ts
  // ChartFrame
  { titel: string; leer: boolean; picker?: ReactNode; children: ReactNode }
  // TrainingFrequencyChart
  { sessions: AnalysisSession[]; picker?: ReactNode }
  export const TITEL = 'Trainingsfrequenz'
  ```

Es gibt bewusst **keinen** gemeinsamen `ChartProps`-Typ: jeder Bereich reicht seine eigenen Daten durch, und ein gemeinsamer Typ über `unknown` würde die Typprüfung genau dort abschalten, wo sie zählt.

**Recharts in jsdom:** `ResponsiveContainer` misst seinen Elternknoten. In jsdom ist jede Breite 0, also zeichnet Recharts gar nichts und jeder Graph-Test liefe ins Leere. `src/test-setup.ts` bekommt deshalb feste Maße und einen `ResizeObserver`-Ersatz. Ohne diesen Schritt sind alle folgenden Graph-Tests wertlos.

- [ ] **Step 1: Install the dependency**

```bash
npm install recharts
```

Die aufgelöste Version im Bericht festhalten.

- [ ] **Step 2: Write the failing tests**

`src/components/charts/ChartFrame.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChartFrame from './ChartFrame'

describe('ChartFrame', () => {
  it('shows the chart when there is data', () => {
    render(
      <ChartFrame titel="Trainingsfrequenz" leer={false}>
        <div data-testid="inhalt" />
      </ChartFrame>,
    )
    expect(screen.getByRole('heading', { name: 'Trainingsfrequenz' })).toBeInTheDocument()
    expect(screen.getByTestId('inhalt')).toBeInTheDocument()
  })

  it('writes a sentence instead of drawing empty axes', () => {
    // An empty coordinate system looks like a failure. A sentence says which it
    // is: nothing recorded yet.
    render(
      <ChartFrame titel="Trainingsfrequenz" leer>
        <div data-testid="inhalt" />
      </ChartFrame>,
    )
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
    expect(screen.queryByTestId('inhalt')).not.toBeInTheDocument()
  })

  it('shows the picker even when empty', () => {
    // Un-pinning a chart that has no data yet must stay possible.
    render(
      <ChartFrame titel="Trainingsfrequenz" leer picker={<button type="button">Haken</button>}>
        <div />
      </ChartFrame>,
    )
    expect(screen.getByRole('button', { name: 'Haken' })).toBeInTheDocument()
  })
})
```

`src/components/charts/TrainingFrequencyChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TrainingFrequencyChart from './TrainingFrequencyChart'

const am = (monat: number, tag: number) => new Date(2026, monat - 1, tag, 18, 0).toISOString()

describe('TrainingFrequencyChart', () => {
  it('labels every week of the range', () => {
    render(
      <TrainingFrequencyChart
        sessions={[
          { id: 'a', gestartet_am: am(8, 17), beendet_am: null, gesamt_kalorien: null },
          { id: 'b', gestartet_am: am(8, 24), beendet_am: null, gesamt_kalorien: null },
        ]}
      />,
    )
    expect(screen.getByText('2026-KW34')).toBeInTheDocument()
    expect(screen.getByText('2026-KW35')).toBeInTheDocument()
  })

  it('says so instead of drawing a single bar', () => {
    // One week is a dot, not a trend.
    render(
      <TrainingFrequencyChart
        sessions={[{ id: 'a', gestartet_am: am(8, 24), beendet_am: null, gesamt_kalorien: null }]}
      />,
    )
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('says so when nothing was trained at all', () => {
    render(<TrainingFrequencyChart sessions={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --run src/components/charts`
Expected: FAIL — beide Komponenten fehlen.

- [ ] **Step 4: Make Recharts measurable in jsdom**

An `src/test-setup.ts` anhängen:

```ts
// Recharts measures its parent through ResizeObserver and offsetWidth. jsdom
// implements neither, so every chart would render an empty SVG and every chart
// test would pass without asserting anything. Fixed sizes make the charts draw.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

for (const [name, wert] of [
  ['offsetWidth', 800],
  ['offsetHeight', 400],
] as const) {
  Object.defineProperty(HTMLElement.prototype, name, { configurable: true, value: wert })
}
```

- [ ] **Step 5: Write the implementations**

`src/components/charts/ChartFrame.tsx`:

```tsx
import type { ReactNode } from 'react'

/**
 * Shared shell for every chart: title, the dashboard checkbox, and the empty
 * state. Kept in one place so a chart cannot invent its own wording for
 * "nothing to show yet".
 */
export default function ChartFrame({
  titel,
  leer,
  picker,
  children,
}: {
  titel: string
  leer: boolean
  picker?: ReactNode
  children: ReactNode
}) {
  return (
    <section>
      <h2>{titel}</h2>
      {picker}
      {leer ? <p>Noch nicht genug Daten für diesen Graphen.</p> : children}
    </section>
  )
}
```

`src/components/charts/TrainingFrequencyChart.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { sessionsJeWoche } from '../../lib/analysis/training-charts'
import type { AnalysisSession } from '../../hooks/use-training-analysis'
import ChartFrame from './ChartFrame'

export const TITEL = 'Trainingsfrequenz'

export default function TrainingFrequencyChart({
  sessions,
  picker,
}: {
  sessions: AnalysisSession[]
  picker?: ReactNode
}) {
  const punkte = sessionsJeWoche(sessions)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="woche" />
          {/* allowDecimals: half a session does not exist. */}
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(wert: number) => [`${wert}`, 'Einheiten']} />
          <Bar dataKey="anzahl" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- --run src/components/charts`
Expected: PASS, 6 Tests.

- [ ] **Step 7: Prove the setup change is load-bearing**

Kommentiere die beiden `Object.defineProperty`-Zeilen in `src/test-setup.ts` vorübergehend aus und lasse `TrainingFrequencyChart.test.tsx` erneut laufen. Der Test `labels every week of the range` muss **rot** werden. Danach wieder einkommentieren. Ergebnis beider Läufe im Bericht festhalten — ohne diesen Nachweis ist unbekannt, ob die Graph-Tests überhaupt etwas sehen.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/test-setup.ts src/components/charts
git commit -m "feat: Graphen-Rahmen und Trainingsfrequenz"
```

---

## Task 9: E1 – Kalorien pro Tag gegen Ziel

**Files:**
- Create: `src/components/charts/CaloriesPerDayChart.tsx`
- Test: `src/components/charts/CaloriesPerDayChart.test.tsx`

**Interfaces:**
- Consumes: `kalorienJeTag` aus Task 4, `AnalysisFoodEntry` aus Task 6
- Produces: `{ entries: AnalysisFoodEntry[]; ziel: number | null; picker?: ReactNode }`, Export `TITEL = 'Kalorien pro Tag'`

Das Ziel kommt als Prop, nicht aus dem Profil-Hook: die Komponente bleibt ohne Datenzugriff, und `null` (unvollständiges Profil) muss ohne Referenzlinie funktionieren.

- [ ] **Step 1: Write the failing test**

`src/components/charts/CaloriesPerDayChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CaloriesPerDayChart from './CaloriesPerDayChart'

const eintrag = (tag: number, kalorien: number) => ({
  zeitpunkt: new Date(2026, 7, tag, 12, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
})

describe('CaloriesPerDayChart', () => {
  it('draws a point per logged day', () => {
    render(
      <CaloriesPerDayChart entries={[eintrag(23, 1800), eintrag(24, 2100)]} ziel={1672} />,
    )
    expect(screen.getByText('23.08.')).toBeInTheDocument()
    expect(screen.getByText('24.08.')).toBeInTheDocument()
  })

  it('shows the goal as a reference line', () => {
    render(<CaloriesPerDayChart entries={[eintrag(23, 1800), eintrag(24, 2100)]} ziel={1672} />)
    expect(screen.getByText('Ziel 1672 kcal')).toBeInTheDocument()
  })

  it('draws without a reference line when the profile has no goal', () => {
    // An incomplete profile yields no goal. The intake is still worth seeing.
    render(<CaloriesPerDayChart entries={[eintrag(23, 1800), eintrag(24, 2100)]} ziel={null} />)
    expect(screen.queryByText(/^Ziel /)).not.toBeInTheDocument()
    expect(screen.getByText('23.08.')).toBeInTheDocument()
  })

  it('says so with fewer than two logged days', () => {
    render(<CaloriesPerDayChart entries={[eintrag(24, 2100)]} ziel={1672} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/CaloriesPerDayChart.test.tsx`
Expected: FAIL — Komponente fehlt.

- [ ] **Step 3: Write the implementation**

`src/components/charts/CaloriesPerDayChart.tsx`:

```tsx
import type { ReactNode } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { kalorienJeTag } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import ChartFrame from './ChartFrame'

export const TITEL = 'Kalorien pro Tag'

/** `2026-08-24` → `24.08.` — the year is already implied by the range. */
function tagesLabel(tag: string) {
  const [, monat, tagesZahl] = tag.split('-')
  return `${tagesZahl}.${monat}.`
}

export default function CaloriesPerDayChart({
  entries,
  ziel,
  picker,
}: {
  entries: AnalysisFoodEntry[]
  ziel: number | null
  picker?: ReactNode
}) {
  const punkte = kalorienJeTag(entries).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.tag),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip formatter={(wert: number) => [`${wert} kcal`, 'Aufnahme']} />
          {ziel != null && (
            <ReferenceLine y={ziel} stroke="#82ca9d" label={`Ziel ${ziel} kcal`} />
          )}
          <Line type="monotone" dataKey="kalorien" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/charts/CaloriesPerDayChart.test.tsx`
Expected: PASS, 4 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/CaloriesPerDayChart.tsx src/components/charts/CaloriesPerDayChart.test.tsx
git commit -m "feat: Graph Kalorien pro Tag gegen Ziel"
```

---

## Task 10: K1 – Gewichtsverlauf mit Trendlinie

**Files:**
- Create: `src/components/charts/WeightTrendChart.tsx`
- Test: `src/components/charts/WeightTrendChart.test.tsx`

**Interfaces:**
- Consumes: `gewichtsTrend` aus Task 4, `BodyMetricRow` aus `src/lib/body-metrics.ts`
- Produces: `{ rows: BodyMetricRow[]; picker?: ReactNode }`, Export `TITEL = 'Gewichtsverlauf'`

- [ ] **Step 1: Write the failing test**

`src/components/charts/WeightTrendChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import WeightTrendChart from './WeightTrendChart'

const leer = {
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

const zeile = (id: string, datum: string, gewicht: number | null) => ({
  id,
  datum,
  gewicht,
  ...leer,
})

describe('WeightTrendChart', () => {
  it('labels the days it has weights for', () => {
    render(
      <WeightTrendChart
        rows={[zeile('a', '2026-08-17', 83.3), zeile('b', '2026-08-24', 82.5)]}
      />,
    )
    expect(screen.getByText('17.08.')).toBeInTheDocument()
    expect(screen.getByText('24.08.')).toBeInTheDocument()
  })

  it('names both lines so the trend is not mistaken for the measurement', () => {
    render(
      <WeightTrendChart
        rows={[zeile('a', '2026-08-17', 83.3), zeile('b', '2026-08-24', 82.5)]}
      />,
    )
    expect(screen.getByText('Gewicht')).toBeInTheDocument()
    expect(screen.getByText('Trend')).toBeInTheDocument()
  })

  it('ignores entries that recorded only circumferences', () => {
    render(
      <WeightTrendChart
        rows={[
          zeile('a', '2026-08-17', 83.3),
          zeile('b', '2026-08-20', null),
          zeile('c', '2026-08-24', 82.5),
        ]}
      />,
    )
    expect(screen.queryByText('20.08.')).not.toBeInTheDocument()
  })

  it('says so with a single weight', () => {
    render(<WeightTrendChart rows={[zeile('a', '2026-08-24', 82.5)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/WeightTrendChart.test.tsx`
Expected: FAIL — Komponente fehlt.

- [ ] **Step 3: Write the implementation**

`src/components/charts/WeightTrendChart.tsx`:

```tsx
import type { ReactNode } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { gewichtsTrend } from '../../lib/analysis/body-charts'
import type { BodyMetricRow } from '../../lib/body-metrics'
import ChartFrame from './ChartFrame'

export const TITEL = 'Gewichtsverlauf'

function tagesLabel(datum: string) {
  const [, monat, tag] = datum.split('-')
  return `${tag}.${monat}.`
}

export default function WeightTrendChart({
  rows,
  picker,
}: {
  rows: BodyMetricRow[]
  picker?: ReactNode
}) {
  const punkte = gewichtsTrend(rows).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.datum),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          {/* The interesting range is a few kilos wide; a zero-based axis would
              flatten every change into a straight line. */}
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(wert: number) => wert.toFixed(1)} />
          <Tooltip formatter={(wert: number) => [`${wert} kg`, '']} />
          <Legend />
          <Line type="monotone" dataKey="gewicht" name="Gewicht" stroke="#8884d8" dot={false} />
          <Line type="monotone" dataKey="trend" name="Trend" stroke="#82ca9d" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/charts/WeightTrendChart.test.tsx`
Expected: PASS, 4 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/WeightTrendChart.tsx src/components/charts/WeightTrendChart.test.tsx
git commit -m "feat: Graph Gewichtsverlauf mit Trendlinie"
```

---

## Task 11: Registry

**Files:**
- Create: `src/lib/analysis/registry.ts`
- Test: `src/lib/analysis/registry.test.ts`

**Interfaces:**
- Consumes: die drei Chart-Komponenten und ihre `TITEL`-Exporte aus Task 8–10
- Produces:
  ```ts
  export type Bereich = 'training' | 'nutrition' | 'body'
  export type ChartDef = { id: string; bereich: Bereich; titel: string }
  export const CHARTS: ChartDef[]
  export const CHART_IDS: string[]
  export function chartsFor(bereich: Bereich): ChartDef[]
  ```

Die Registry hält bewusst **keine** Komponente, sondern nur die Beschreibung. Grund: Seiten und Dashboards binden die Komponenten je Bereich direkt ein und brauchen dabei unterschiedliche Props (`sessions`, `entries` und `ziel`, `rows`). Eine Registry, die Komponenten führt, müsste diese Props über einen gemeinsamen `unknown`-Typ schleusen und in jeder Komponente wieder aufdröseln — mehr Bauwerk, weniger Typsicherheit. Was die Registry leistet, ist die eine Wahrheit darüber, **welche IDs es gibt und wie sie heißen**; genau das brauchen Picker und Auswahl-Prüfung.

- [ ] **Step 1: Write the failing test**

`src/lib/analysis/registry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CHARTS, CHART_IDS, chartsFor } from './registry'
import { TITEL as T1_TITEL } from '../../components/charts/TrainingFrequencyChart'
import { TITEL as E1_TITEL } from '../../components/charts/CaloriesPerDayChart'
import { TITEL as K1_TITEL } from '../../components/charts/WeightTrendChart'

describe('registry', () => {
  it('registers the three charts of plan 1', () => {
    expect(CHART_IDS).toEqual(['T1', 'E1', 'K1'])
  })

  it('takes each title from its component instead of restating it', () => {
    // Two places for one title drift apart; the page would then label a chart
    // differently from the picker.
    expect(CHARTS.find((chart) => chart.id === 'T1')?.titel).toBe(T1_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'E1')?.titel).toBe(E1_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'K1')?.titel).toBe(K1_TITEL)
  })

  it('filters by area', () => {
    expect(chartsFor('training').map((chart) => chart.id)).toEqual(['T1'])
    expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1'])
    expect(chartsFor('body').map((chart) => chart.id)).toEqual(['K1'])
  })

  it('has no duplicate ids', () => {
    // The selection is a list of ids; a duplicate would make un-pinning
    // ambiguous.
    expect(new Set(CHART_IDS).size).toBe(CHART_IDS.length)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/registry.test.ts`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Write the implementation**

`src/lib/analysis/registry.ts`:

```ts
import { TITEL as TRAINING_FREQUENCY } from '../../components/charts/TrainingFrequencyChart'
import { TITEL as CALORIES_PER_DAY } from '../../components/charts/CaloriesPerDayChart'
import { TITEL as WEIGHT_TREND } from '../../components/charts/WeightTrendChart'

export type Bereich = 'training' | 'nutrition' | 'body'

export type ChartDef = { id: string; bereich: Bereich; titel: string }

/**
 * The one truth about which charts exist and what they are called.
 *
 * It deliberately carries no component: the areas hand their charts different
 * props, and routing those through a shared `unknown` would cost type safety
 * for nothing. Pages embed the components; the registry answers "which ids
 * exist" for the picker and for validating the stored selection.
 */
export const CHARTS: ChartDef[] = [
  { id: 'T1', bereich: 'training', titel: TRAINING_FREQUENCY },
  { id: 'E1', bereich: 'nutrition', titel: CALORIES_PER_DAY },
  { id: 'K1', bereich: 'body', titel: WEIGHT_TREND },
]

export const CHART_IDS = CHARTS.map((chart) => chart.id)

export function chartsFor(bereich: Bereich): ChartDef[] {
  return CHARTS.filter((chart) => chart.bereich === bereich)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/registry.test.ts`
Expected: PASS, 4 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/registry.ts src/lib/analysis/registry.test.ts
git commit -m "feat: Registry der Analyse-Graphen"
```

---

## Task 12: Der Picker

**Files:**
- Create: `src/components/charts/ChartPicker.tsx`
- Test: `src/components/charts/ChartPicker.test.tsx`

**Interfaces:**
- Consumes: `parseAuswahl`, `toggleAuswahl` aus Task 3, `CHART_IDS` aus Task 11, `useProfile` (bestehend)
- Produces:
  ```ts
  export function useChartSelection(userId: string): {
    auswahl: string[]
    istGewaehlt: (id: string) => boolean
    umschalten: (id: string) => Promise<void>
    fehler: string
  }
  export default function ChartPicker(props: { id: string; auswahl: ReturnType<typeof useChartSelection> }): JSX.Element
  ```

`useProfile.updateProfile` serialisiert Schreibvorgänge bereits und wirft bei Misserfolg — genau das braucht der Picker.

- [ ] **Step 1: Write the failing test**

`src/components/charts/ChartPicker.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import ChartPicker, { useChartSelection } from './ChartPicker'

const updateProfile = vi.fn()
const profil = { analyse_auswahl: ['T1'] }

vi.mock('../../hooks/use-profile', () => ({
  useProfile: () => ({ profile: profil, loading: false, error: false, updateProfile }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  updateProfile.mockResolvedValue(undefined)
  profil.analyse_auswahl = ['T1']
})

describe('useChartSelection', () => {
  it('reads the stored selection', () => {
    const { result } = renderHook(() => useChartSelection('u1'))
    expect(result.current.istGewaehlt('T1')).toBe(true)
    expect(result.current.istGewaehlt('K1')).toBe(false)
  })

  it('drops ids that no longer answer to a chart', () => {
    profil.analyse_auswahl = ['T1', 'T99']
    const { result } = renderHook(() => useChartSelection('u1'))
    expect(result.current.auswahl).toEqual(['T1'])
  })

  it('writes the new list to the profile', async () => {
    const { result } = renderHook(() => useChartSelection('u1'))
    await result.current.umschalten('K1')
    expect(updateProfile).toHaveBeenCalledWith({ analyse_auswahl: ['T1', 'K1'] })
  })

  it('reports a failed write instead of pretending it stuck', async () => {
    // Without this the checkbox would flip back on the next load with no
    // explanation.
    updateProfile.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useChartSelection('u1'))
    await result.current.umschalten('K1')
    await waitFor(() => expect(result.current.fehler).not.toBe(''))
  })
})

describe('ChartPicker', () => {
  it('renders a checked box for a pinned chart', () => {
    const { result } = renderHook(() => useChartSelection('u1'))
    render(<ChartPicker id="T1" auswahl={result.current} />)
    expect(screen.getByRole('checkbox', { name: 'Auf dem Dashboard zeigen' })).toBeChecked()
  })

  it('toggles on click', async () => {
    const { result } = renderHook(() => useChartSelection('u1'))
    render(<ChartPicker id="K1" auswahl={result.current} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Auf dem Dashboard zeigen' }))
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ analyse_auswahl: ['T1', 'K1'] }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/ChartPicker.test.tsx`
Expected: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Write the implementation**

`src/components/charts/ChartPicker.tsx`:

```tsx
import { useState } from 'react'
import { useProfile } from '../../hooks/use-profile'
import { parseAuswahl, toggleAuswahl } from '../../lib/analysis/auswahl'
import { CHART_IDS } from '../../lib/analysis/registry'

/**
 * The pinned charts, read from and written back to `profiles.analyse_auswahl`.
 *
 * updateProfile serializes its writes: two boxes ticked in quick succession
 * would otherwise race, and the losing PATCH would silently become the stored
 * value.
 */
export function useChartSelection(userId: string) {
  const { profile, updateProfile } = useProfile(userId)
  const [fehler, setFehler] = useState('')

  const auswahl = parseAuswahl(profile?.analyse_auswahl, CHART_IDS)

  async function umschalten(id: string) {
    setFehler('')
    try {
      await updateProfile({ analyse_auswahl: toggleAuswahl(auswahl, id) })
    } catch {
      setFehler('Auswahl konnte nicht gespeichert werden.')
    }
  }

  return { auswahl, istGewaehlt: (id: string) => auswahl.includes(id), umschalten, fehler }
}

export default function ChartPicker({
  id,
  auswahl,
}: {
  id: string
  auswahl: ReturnType<typeof useChartSelection>
}) {
  return (
    <label>
      <input
        type="checkbox"
        checked={auswahl.istGewaehlt(id)}
        onChange={() => auswahl.umschalten(id)}
      />
      Auf dem Dashboard zeigen
    </label>
  )
}
```

`Profile` in `src/hooks/use-profile.ts` um das Feld ergänzen:

```ts
  analyse_auswahl: unknown
```

`unknown`, nicht `string[]`: die Spalte ist `jsonb` und kann alles enthalten, was von Hand hineingeschrieben wurde. `parseAuswahl` ist die einzige Stelle, die daraus eine Liste macht.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/charts/ChartPicker.test.tsx`
Expected: PASS, 6 Tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/ChartPicker.tsx src/components/charts/ChartPicker.test.tsx src/hooks/use-profile.ts
git commit -m "feat: Picker fuer die Dashboard-Auswahl"
```

---

## Task 13: Die drei Analyse-Seiten

**Files:**
- Create: `src/components/ZeitraumSwitch.tsx`, `src/pages/TrainingAnalysisPage.tsx`, `src/pages/NutritionAnalysisPage.tsx`, `src/pages/BodyAnalysisPage.tsx`
- Test: `src/pages/TrainingAnalysisPage.test.tsx`, `src/pages/NutritionAnalysisPage.test.tsx`, `src/pages/BodyAnalysisPage.test.tsx`

**Interfaces:**
- Consumes: alle drei Hooks, alle drei Charts, `ChartPicker`/`useChartSelection`, `ZEITRAEUME`/`STANDARD_ZEITRAUM`
- Produces: drei Default-Exporte, eingehängt in Task 15

Alle drei Seiten haben denselben Aufbau: Session-Gate, Überschrift „Analyse", Zeitraum-Umschalter, Ladezustand, Fehlermeldung **einmal oben**, dann die Graphen des Bereichs, Rücklink.

- [ ] **Step 1: Write the failing tests**

`src/pages/TrainingAnalysisPage.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TrainingAnalysisPage from './TrainingAnalysisPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseTrainingAnalysis = vi.fn()
vi.mock('../hooks/use-training-analysis', () => ({
  useTrainingAnalysis: (userId: string, zeitraum: unknown) =>
    mockUseTrainingAnalysis(userId, zeitraum),
}))

vi.mock('../components/charts/ChartPicker', async () => {
  const actual = await vi.importActual<typeof import('../components/charts/ChartPicker')>(
    '../components/charts/ChartPicker',
  )
  return {
    ...actual,
    default: () => <span data-testid="picker" />,
    useChartSelection: () => ({
      auswahl: [],
      istGewaehlt: () => false,
      umschalten: vi.fn(),
      fehler: '',
    }),
  }
})

const am = (monat: number, tag: number) => new Date(2026, monat - 1, tag, 18, 0).toISOString()

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseTrainingAnalysis.mockReturnValue({
    sessions: [
      { id: 'a', gestartet_am: am(8, 17), beendet_am: null, gesamt_kalorien: null },
      { id: 'b', gestartet_am: am(8, 24), beendet_am: null, gesamt_kalorien: null },
    ],
    loading: false,
    error: false,
  })
})

const zeige = () =>
  render(
    <MemoryRouter>
      <TrainingAnalysisPage />
    </MemoryRouter>,
  )

describe('TrainingAnalysisPage', () => {
  it('shows the area charts with their picker', () => {
    zeige()
    expect(screen.getByRole('heading', { name: 'Analyse' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Trainingsfrequenz' })).toBeInTheDocument()
    expect(screen.getByTestId('picker')).toBeInTheDocument()
  })

  it('asks for 90 days by default', () => {
    zeige()
    expect(mockUseTrainingAnalysis).toHaveBeenCalledWith('u1', 90)
  })

  it('reloads with the chosen range', () => {
    zeige()
    fireEvent.click(screen.getByRole('button', { name: '30 Tage' }))
    expect(mockUseTrainingAnalysis).toHaveBeenLastCalledWith('u1', 30)
  })

  it('shows one message for a failed load, not one per chart', () => {
    mockUseTrainingAnalysis.mockReturnValue({ sessions: [], loading: false, error: true })
    zeige()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('shows a loading state', () => {
    mockUseTrainingAnalysis.mockReturnValue({ sessions: [], loading: true, error: false })
    zeige()
    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })
})
```

`src/pages/NutritionAnalysisPage.test.tsx` — dieselbe Form. Zusätzlich wird `useProfile` gemockt, weil E1 das Kalorienziel braucht:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NutritionAnalysisPage from './NutritionAnalysisPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseNutritionAnalysis = vi.fn()
vi.mock('../hooks/use-nutrition-analysis', () => ({
  useNutritionAnalysis: (userId: string, zeitraum: unknown) =>
    mockUseNutritionAnalysis(userId, zeitraum),
}))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: () => mockUseProfile() }))

vi.mock('../components/charts/ChartPicker', async () => {
  const actual = await vi.importActual<typeof import('../components/charts/ChartPicker')>(
    '../components/charts/ChartPicker',
  )
  return {
    ...actual,
    default: () => <span data-testid="picker" />,
    useChartSelection: () => ({
      auswahl: [],
      istGewaehlt: () => false,
      umschalten: vi.fn(),
      fehler: '',
    }),
  }
})

const eintrag = (tag: number, kalorien: number) => ({
  zeitpunkt: new Date(2026, 7, tag, 12, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
})

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseNutritionAnalysis.mockReturnValue({
    entries: [eintrag(23, 1800), eintrag(24, 2100)],
    loading: false,
    error: false,
  })
  mockUseProfile.mockReturnValue({
    profile: { taegliches_kalorienziel: 1672 },
    loading: false,
    error: false,
    updateProfile: vi.fn(),
  })
})

const zeige = () =>
  render(
    <MemoryRouter>
      <NutritionAnalysisPage />
    </MemoryRouter>,
  )

describe('NutritionAnalysisPage', () => {
  it('shows the area chart with the goal from the profile', () => {
    zeige()
    expect(screen.getByRole('heading', { name: 'Kalorien pro Tag' })).toBeInTheDocument()
    expect(screen.getByText('Ziel 1672 kcal')).toBeInTheDocument()
  })

  it('draws without a goal when the profile is incomplete', () => {
    mockUseProfile.mockReturnValue({
      profile: { taegliches_kalorienziel: null },
      loading: false,
      error: false,
      updateProfile: vi.fn(),
    })
    zeige()
    expect(screen.queryByText(/^Ziel /)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kalorien pro Tag' })).toBeInTheDocument()
  })

  it('asks for 90 days by default and reloads with the chosen range', () => {
    zeige()
    expect(mockUseNutritionAnalysis).toHaveBeenCalledWith('u1', 90)
    fireEvent.click(screen.getByRole('button', { name: '1 Jahr' }))
    expect(mockUseNutritionAnalysis).toHaveBeenLastCalledWith('u1', 365)
  })

  it('shows one message for a failed load', () => {
    mockUseNutritionAnalysis.mockReturnValue({ entries: [], loading: false, error: true })
    zeige()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })
})
```

`src/pages/BodyAnalysisPage.test.tsx` — dieselbe Form wie die Trainingsseite, mit `useBodyAnalysis` und `WeightTrendChart`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BodyAnalysisPage from './BodyAnalysisPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseBodyAnalysis = vi.fn()
vi.mock('../hooks/use-body-analysis', () => ({
  useBodyAnalysis: (userId: string, zeitraum: unknown) => mockUseBodyAnalysis(userId, zeitraum),
}))

vi.mock('../components/charts/ChartPicker', async () => {
  const actual = await vi.importActual<typeof import('../components/charts/ChartPicker')>(
    '../components/charts/ChartPicker',
  )
  return {
    ...actual,
    default: () => <span data-testid="picker" />,
    useChartSelection: () => ({
      auswahl: [],
      istGewaehlt: () => false,
      umschalten: vi.fn(),
      fehler: '',
    }),
  }
})

const leer = {
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseBodyAnalysis.mockReturnValue({
    rows: [
      { id: 'a', datum: '2026-08-17', gewicht: 83.3, ...leer },
      { id: 'b', datum: '2026-08-24', gewicht: 82.5, ...leer },
    ],
    loading: false,
    error: false,
  })
})

const zeige = () =>
  render(
    <MemoryRouter>
      <BodyAnalysisPage />
    </MemoryRouter>,
  )

describe('BodyAnalysisPage', () => {
  it('shows the area chart with its picker', () => {
    zeige()
    expect(screen.getByRole('heading', { name: 'Gewichtsverlauf' })).toBeInTheDocument()
    expect(screen.getByTestId('picker')).toBeInTheDocument()
  })

  it('asks for 90 days by default and reloads with the chosen range', () => {
    zeige()
    expect(mockUseBodyAnalysis).toHaveBeenCalledWith('u1', 90)
    fireEvent.click(screen.getByRole('button', { name: 'alles' }))
    expect(mockUseBodyAnalysis).toHaveBeenLastCalledWith('u1', 'alles')
  })

  it('shows one message for a failed load', () => {
    mockUseBodyAnalysis.mockReturnValue({ rows: [], loading: false, error: true })
    zeige()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/pages/TrainingAnalysisPage.test.tsx src/pages/NutritionAnalysisPage.test.tsx src/pages/BodyAnalysisPage.test.tsx`
Expected: FAIL — die drei Seiten fehlen.

- [ ] **Step 3: Write the shared switch**

`src/components/ZeitraumSwitch.tsx`:

```tsx
import { ZEITRAEUME, type Zeitraum } from '../lib/analysis/zeitraum'

/** Buttons rather than a select: four options, and one tap instead of two. */
export default function ZeitraumSwitch({
  wert,
  onChange,
}: {
  wert: Zeitraum
  onChange: (zeitraum: Zeitraum) => void
}) {
  return (
    <div>
      {ZEITRAEUME.map((zeitraum) => (
        <button
          key={String(zeitraum.wert)}
          type="button"
          aria-pressed={zeitraum.wert === wert}
          onClick={() => onChange(zeitraum.wert)}
        >
          {zeitraum.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Write the three pages**

`src/pages/TrainingAnalysisPage.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useTrainingAnalysis } from '../hooks/use-training-analysis'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import ChartPicker, { useChartSelection } from '../components/charts/ChartPicker'
import TrainingFrequencyChart from '../components/charts/TrainingFrequencyChart'
import { STANDARD_ZEITRAUM, type Zeitraum } from '../lib/analysis/zeitraum'

export default function TrainingAnalysisPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Analyse</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Analyse userId={userId} />
}

function Analyse({ userId }: { userId: string }) {
  const [zeitraum, setZeitraum] = useState<Zeitraum>(STANDARD_ZEITRAUM)
  const { sessions, loading, error } = useTrainingAnalysis(userId, zeitraum)
  const auswahl = useChartSelection(userId)

  return (
    <div>
      <h1>Analyse</h1>
      <ZeitraumSwitch wert={zeitraum} onChange={setZeitraum} />
      {/* One message for the area, not one per chart: eight identical alerts
          between the charts would be noise, not information. */}
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <p>Lädt…</p>
      ) : (
        <TrainingFrequencyChart sessions={sessions} picker={<ChartPicker id="T1" auswahl={auswahl} />} />
      )}
      <Link to="/training">Zurück zum Trainingsbereich</Link>
    </div>
  )
}
```

`src/pages/NutritionAnalysisPage.tsx` — gleiche Form, mit dem Kalorienziel aus dem Profil:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useNutritionAnalysis } from '../hooks/use-nutrition-analysis'
import { useProfile } from '../hooks/use-profile'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import ChartPicker, { useChartSelection } from '../components/charts/ChartPicker'
import CaloriesPerDayChart from '../components/charts/CaloriesPerDayChart'
import { STANDARD_ZEITRAUM, type Zeitraum } from '../lib/analysis/zeitraum'

export default function NutritionAnalysisPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Analyse</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Analyse userId={userId} />
}

function Analyse({ userId }: { userId: string }) {
  const [zeitraum, setZeitraum] = useState<Zeitraum>(STANDARD_ZEITRAUM)
  const { entries, loading, error } = useNutritionAnalysis(userId, zeitraum)
  const { profile } = useProfile(userId)
  const auswahl = useChartSelection(userId)

  return (
    <div>
      <h1>Analyse</h1>
      <ZeitraumSwitch wert={zeitraum} onChange={setZeitraum} />
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <p>Lädt…</p>
      ) : (
        <CaloriesPerDayChart
          entries={entries}
          ziel={profile?.taegliches_kalorienziel ?? null}
          picker={<ChartPicker id="E1" auswahl={auswahl} />}
        />
      )}
      <Link to="/nutrition">Zurück zum Ernährungsbereich</Link>
    </div>
  )
}
```

`src/pages/BodyAnalysisPage.tsx`:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useBodyAnalysis } from '../hooks/use-body-analysis'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import ChartPicker, { useChartSelection } from '../components/charts/ChartPicker'
import WeightTrendChart from '../components/charts/WeightTrendChart'
import { STANDARD_ZEITRAUM, type Zeitraum } from '../lib/analysis/zeitraum'

export default function BodyAnalysisPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Analyse</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Analyse userId={userId} />
}

function Analyse({ userId }: { userId: string }) {
  const [zeitraum, setZeitraum] = useState<Zeitraum>(STANDARD_ZEITRAUM)
  const { rows, loading, error } = useBodyAnalysis(userId, zeitraum)
  const auswahl = useChartSelection(userId)

  return (
    <div>
      <h1>Analyse</h1>
      <ZeitraumSwitch wert={zeitraum} onChange={setZeitraum} />
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <p>Lädt…</p>
      ) : (
        <WeightTrendChart rows={rows} picker={<ChartPicker id="K1" auswahl={auswahl} />} />
      )}
      <Link to="/body">Zurück zum Körperbereich</Link>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --run src/pages/TrainingAnalysisPage.test.tsx src/pages/NutritionAnalysisPage.test.tsx src/pages/BodyAnalysisPage.test.tsx`
Expected: PASS, 12 Tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/ZeitraumSwitch.tsx src/pages/TrainingAnalysisPage.tsx src/pages/NutritionAnalysisPage.tsx src/pages/BodyAnalysisPage.tsx src/pages/TrainingAnalysisPage.test.tsx src/pages/NutritionAnalysisPage.test.tsx src/pages/BodyAnalysisPage.test.tsx
git commit -m "feat: Analyse-Seiten fuer Training, Ernaehrung und Koerper"
```

---

## Task 14: Die Dashboards zeigen die ausgewählten Graphen

**Files:**
- Modify: `src/pages/TrainingPage.tsx`, `src/pages/NutritionPage.tsx`, `src/pages/BodyPage.tsx`
- Test: `src/pages/TrainingPage.test.tsx`, `src/pages/NutritionPage.test.tsx`, `src/pages/BodyPage.test.tsx` (jeweils ergänzen)

**Interfaces:**
- Consumes: `useChartSelection` aus Task 12, die Bereichs-Hooks, die Charts
- Produces: `DASHBOARD_ZEITRAUM` in `src/lib/analysis/zeitraum.ts`

Auf dem Dashboard gilt **fest 90 Tage**, kein Umschalter, **kein Picker** am Graphen — abwählen geschieht auf der Analyse-Seite. Dazu je ein Link „Analyse".

Zeigt die Auswahl für diesen Bereich nichts, wird auch nichts gerendert und der Bereichs-Hook gar nicht erst aufgerufen: ein Dashboard ohne angehakten Graphen darf keine Abfrage auslösen. Genau deshalb steht jeder Dashboard-Graph in einer eigenen kleinen Komponente — Hooks lassen sich nicht bedingt aufrufen.

Es gibt **keine** gemeinsame `DashboardCharts`-Komponente. In Plan 1 hat jeder Bereich genau einen Graphen; eine Sammelkomponente hätte nichts zu sammeln.

- [ ] **Step 1: Write the failing test for the body dashboard**

An `src/pages/BodyPage.test.tsx` anhängen:

```tsx
const mockUseBodyAnalysis = vi.fn()
vi.mock('../hooks/use-body-analysis', () => ({
  useBodyAnalysis: (userId: string, zeitraum: unknown) => mockUseBodyAnalysis(userId, zeitraum),
}))

const mockUseChartSelection = vi.fn()
vi.mock('../components/charts/ChartPicker', async () => {
  const actual = await vi.importActual<typeof import('../components/charts/ChartPicker')>(
    '../components/charts/ChartPicker',
  )
  return { ...actual, useChartSelection: () => mockUseChartSelection() }
})

describe('BodyPage – ausgewaehlte Graphen', () => {
  const leerZeile = {
    bauchumfang: null,
    beinumfang: null,
    armumfang: null,
    ruckenumfang: null,
    brustumfang: null,
    koerperfettanteil: null,
  }

  beforeEach(() => {
    mockUseBodyAnalysis.mockReturnValue({
      rows: [
        { id: 'a', datum: '2026-08-17', gewicht: 83.3, ...leerZeile },
        { id: 'b', datum: '2026-08-24', gewicht: 82.5, ...leerZeile },
      ],
      loading: false,
      error: false,
    })
    mockUseChartSelection.mockReturnValue({
      auswahl: ['K1'],
      istGewaehlt: (id: string) => id === 'K1',
      umschalten: vi.fn(),
      fehler: '',
    })
  })

  it('shows a pinned chart with the fixed 90-day range', () => {
    // No range switch on a dashboard: a dashboard with controls is not a
    // dashboard any more.
    zeigeDashboard()
    expect(screen.getByRole('heading', { name: 'Gewichtsverlauf' })).toBeInTheDocument()
    expect(mockUseBodyAnalysis).toHaveBeenCalledWith('u1', 90)
    expect(screen.queryByRole('button', { name: '30 Tage' })).not.toBeInTheDocument()
  })

  it('offers no picker on the dashboard', () => {
    zeigeDashboard()
    expect(
      screen.queryByRole('checkbox', { name: 'Auf dem Dashboard zeigen' }),
    ).not.toBeInTheDocument()
  })

  it('shows nothing and asks for nothing when no chart is pinned', () => {
    mockUseChartSelection.mockReturnValue({
      auswahl: [],
      istGewaehlt: () => false,
      umschalten: vi.fn(),
      fehler: '',
    })
    zeigeDashboard()
    expect(screen.queryByRole('heading', { name: 'Gewichtsverlauf' })).not.toBeInTheDocument()
    expect(mockUseBodyAnalysis).not.toHaveBeenCalled()
  })

  it('links to the analysis page', () => {
    zeigeDashboard()
    expect(screen.getByRole('link', { name: 'Analyse' })).toHaveAttribute('href', '/body/analyse')
  })
})
```

`zeigeDashboard()` ist der bereits in der Datei vorhandene Render-Helfer; falls keiner existiert, den bestehenden `render(...)`-Aufruf der Datei in eine solche Funktion ziehen und die vorhandenen Tests darauf umstellen, ohne ihre Zusicherungen zu ändern.

- [ ] **Step 1b: Write the failing test for the training dashboard**

An `src/pages/TrainingPage.test.tsx` anhängen:

```tsx
const mockUseTrainingAnalysis = vi.fn()
vi.mock('../hooks/use-training-analysis', () => ({
  useTrainingAnalysis: (userId: string, zeitraum: unknown) =>
    mockUseTrainingAnalysis(userId, zeitraum),
}))

const mockUseChartSelection = vi.fn()
vi.mock('../components/charts/ChartPicker', async () => {
  const actual = await vi.importActual<typeof import('../components/charts/ChartPicker')>(
    '../components/charts/ChartPicker',
  )
  return { ...actual, useChartSelection: () => mockUseChartSelection() }
})

describe('TrainingPage – ausgewaehlte Graphen', () => {
  const am = (monat: number, tag: number) => new Date(2026, monat - 1, tag, 18, 0).toISOString()

  beforeEach(() => {
    mockUseTrainingAnalysis.mockReturnValue({
      sessions: [
        { id: 'a', gestartet_am: am(8, 17), beendet_am: null, gesamt_kalorien: null },
        { id: 'b', gestartet_am: am(8, 24), beendet_am: null, gesamt_kalorien: null },
      ],
      loading: false,
      error: false,
    })
    mockUseChartSelection.mockReturnValue({
      auswahl: ['T1'],
      istGewaehlt: (id: string) => id === 'T1',
      umschalten: vi.fn(),
      fehler: '',
    })
  })

  it('shows a pinned chart with the fixed 90-day range', () => {
    zeigeDashboard()
    expect(screen.getByRole('heading', { name: 'Trainingsfrequenz' })).toBeInTheDocument()
    expect(mockUseTrainingAnalysis).toHaveBeenCalledWith('u1', 90)
    expect(screen.queryByRole('button', { name: '30 Tage' })).not.toBeInTheDocument()
  })

  it('offers no picker on the dashboard', () => {
    zeigeDashboard()
    expect(
      screen.queryByRole('checkbox', { name: 'Auf dem Dashboard zeigen' }),
    ).not.toBeInTheDocument()
  })

  it('shows nothing and asks for nothing when no chart is pinned', () => {
    mockUseChartSelection.mockReturnValue({
      auswahl: [],
      istGewaehlt: () => false,
      umschalten: vi.fn(),
      fehler: '',
    })
    zeigeDashboard()
    expect(screen.queryByRole('heading', { name: 'Trainingsfrequenz' })).not.toBeInTheDocument()
    expect(mockUseTrainingAnalysis).not.toHaveBeenCalled()
  })

  it('links to the analysis page', () => {
    zeigeDashboard()
    expect(screen.getByRole('link', { name: 'Analyse' })).toHaveAttribute(
      'href',
      '/training/analyse',
    )
  })
})
```

- [ ] **Step 1c: Write the failing test for the nutrition dashboard**

An `src/pages/NutritionPage.test.tsx` anhängen. Diese Datei mockt `useProfile` bereits für das Kalorienziel — den bestehenden Mock verwenden, keinen zweiten anlegen:

```tsx
const mockUseNutritionAnalysis = vi.fn()
vi.mock('../hooks/use-nutrition-analysis', () => ({
  useNutritionAnalysis: (userId: string, zeitraum: unknown) =>
    mockUseNutritionAnalysis(userId, zeitraum),
}))

const mockUseChartSelection = vi.fn()
vi.mock('../components/charts/ChartPicker', async () => {
  const actual = await vi.importActual<typeof import('../components/charts/ChartPicker')>(
    '../components/charts/ChartPicker',
  )
  return { ...actual, useChartSelection: () => mockUseChartSelection() }
})

describe('NutritionPage – ausgewaehlte Graphen', () => {
  const eintrag = (tag: number, kalorien: number) => ({
    zeitpunkt: new Date(2026, 7, tag, 12, 0).toISOString(),
    menge: 100,
    mahlzeit: 1,
    products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
  })

  beforeEach(() => {
    mockUseNutritionAnalysis.mockReturnValue({
      entries: [eintrag(23, 1800), eintrag(24, 2100)],
      loading: false,
      error: false,
    })
    mockUseChartSelection.mockReturnValue({
      auswahl: ['E1'],
      istGewaehlt: (id: string) => id === 'E1',
      umschalten: vi.fn(),
      fehler: '',
    })
  })

  it('shows a pinned chart with the fixed 90-day range', () => {
    zeigeDashboard()
    expect(screen.getByRole('heading', { name: 'Kalorien pro Tag' })).toBeInTheDocument()
    expect(mockUseNutritionAnalysis).toHaveBeenCalledWith('u1', 90)
    expect(screen.queryByRole('button', { name: '30 Tage' })).not.toBeInTheDocument()
  })

  it('offers no picker on the dashboard', () => {
    zeigeDashboard()
    expect(
      screen.queryByRole('checkbox', { name: 'Auf dem Dashboard zeigen' }),
    ).not.toBeInTheDocument()
  })

  it('shows nothing and asks for nothing when no chart is pinned', () => {
    mockUseChartSelection.mockReturnValue({
      auswahl: [],
      istGewaehlt: () => false,
      umschalten: vi.fn(),
      fehler: '',
    })
    zeigeDashboard()
    expect(screen.queryByRole('heading', { name: 'Kalorien pro Tag' })).not.toBeInTheDocument()
    expect(mockUseNutritionAnalysis).not.toHaveBeenCalled()
  })

  it('links to the analysis page', () => {
    zeigeDashboard()
    expect(screen.getByRole('link', { name: 'Analyse' })).toHaveAttribute(
      'href',
      '/nutrition/analyse',
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/pages/BodyPage.test.tsx src/pages/TrainingPage.test.tsx src/pages/NutritionPage.test.tsx`
Expected: FAIL — die Dashboards zeigen noch keine Graphen.

- [ ] **Step 3: Add the fixed dashboard range**

An `src/lib/analysis/zeitraum.ts` anhängen:

```ts
/** Dashboards show a fixed window; the switch lives on the analysis page. */
export const DASHBOARD_ZEITRAUM: Zeitraum = 90
```

- [ ] **Step 4: Wire up the body dashboard**

In `src/pages/BodyPage.tsx` die Importe ergänzen:

```tsx
import { useChartSelection } from '../components/charts/ChartPicker'
import WeightTrendChart from '../components/charts/WeightTrendChart'
import { useBodyAnalysis } from '../hooks/use-body-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
```

In `Dashboard`, neben den vorhandenen Zustandsvariablen:

```tsx
  const auswahl = useChartSelection(userId)
```

Im JSX, vor dem `Verlauf`-Link:

```tsx
      {auswahl.istGewaehlt('K1') && <DashboardWeightTrend userId={userId} />}
      <Link to="/body/analyse">Analyse</Link>
```

Am Dateiende:

```tsx
/**
 * Own component so the query only runs when the chart is actually pinned:
 * hooks cannot be called conditionally, and an unpinned chart must not cost a
 * request.
 */
function DashboardWeightTrend({ userId }: { userId: string }) {
  const { rows, loading, error } = useBodyAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return <WeightTrendChart rows={rows} />
}
```

- [ ] **Step 4b: Wire up the training dashboard**

In `src/pages/TrainingPage.tsx` die Importe ergänzen:

```tsx
import { useChartSelection } from '../components/charts/ChartPicker'
import TrainingFrequencyChart from '../components/charts/TrainingFrequencyChart'
import { useTrainingAnalysis } from '../hooks/use-training-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
```

In der Komponente, die den eingeloggten Bereich rendert:

```tsx
  const auswahl = useChartSelection(userId)
```

Im JSX, unter dem bestehenden Inhalt:

```tsx
      {auswahl.istGewaehlt('T1') && <DashboardTrainingFrequency userId={userId} />}
      <Link to="/training/analyse">Analyse</Link>
```

Am Dateiende:

```tsx
function DashboardTrainingFrequency({ userId }: { userId: string }) {
  const { sessions, loading, error } = useTrainingAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return <TrainingFrequencyChart sessions={sessions} />
}
```

Trägt `TrainingPage.tsx` den `userId` noch nicht als Variable, dann ihn wie in `BodyPage.tsx` aus `useSession()` ziehen und den eingeloggten Teil in eine innere Komponente heben — dasselbe Session-Gate, das die anderen Seiten dieses Projekts verwenden.

- [ ] **Step 4c: Wire up the nutrition dashboard**

In `src/pages/NutritionPage.tsx` die Importe ergänzen:

```tsx
import { useChartSelection } from '../components/charts/ChartPicker'
import CaloriesPerDayChart from '../components/charts/CaloriesPerDayChart'
import { useNutritionAnalysis } from '../hooks/use-nutrition-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
```

In der Komponente, die den eingeloggten Bereich rendert:

```tsx
  const auswahl = useChartSelection(userId)
```

Im JSX, unter dem bestehenden Inhalt:

```tsx
      {auswahl.istGewaehlt('E1') && <DashboardCaloriesPerDay userId={userId} />}
      <Link to="/nutrition/analyse">Analyse</Link>
```

Am Dateiende:

```tsx
function DashboardCaloriesPerDay({ userId }: { userId: string }) {
  const { entries, loading, error } = useNutritionAnalysis(userId, DASHBOARD_ZEITRAUM)
  const { profile } = useProfile(userId)
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return <CaloriesPerDayChart entries={entries} ziel={profile?.taegliches_kalorienziel ?? null} />
}
```

`useProfile` ist in dieser Datei bereits importiert — der Import wird nicht doppelt gesetzt.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- --run src/pages`
Expected: PASS, alle Dashboard-Tests grün, die bestehenden unverändert.

- [ ] **Step 6: Commit**

```bash
git add src/pages/BodyPage.tsx src/pages/TrainingPage.tsx src/pages/NutritionPage.tsx src/pages/BodyPage.test.tsx src/pages/TrainingPage.test.tsx src/pages/NutritionPage.test.tsx src/lib/analysis/zeitraum.ts
git commit -m "feat: Dashboards zeigen die ausgewaehlten Graphen"
```

---

## Task 15: Routen, Code-Splitting, Doku und Gesamtprüfung

**Files:**
- Modify: `src/App.tsx`, `src/App.test.tsx`, `docs/domaenenmodell.md`
- Mirror: `../fitness-app.wiki/Domain-Model.md` (**nicht** committen — eigenes Repo)

**Interfaces:**
- Consumes: die drei Analyse-Seiten aus Task 13
- Produces: Routen `/training/analyse`, `/nutrition/analyse`, `/body/analyse`

- [ ] **Step 1: Write the failing test**

An `src/App.test.tsx` anhängen. Die Datei mockt `useSession` bereits und schaltet die Route über `window.history.pushState` — dieses Muster wird übernommen. Zusätzlich müssen die drei Analyse-Hooks gemockt werden, damit der Test nicht am Supabase-Client hängt:

```tsx
vi.mock('./hooks/use-training-analysis', () => ({
  useTrainingAnalysis: () => ({ sessions: [], loading: false, error: false }),
}))
vi.mock('./hooks/use-nutrition-analysis', () => ({
  useNutritionAnalysis: () => ({ entries: [], loading: false, error: false }),
}))
vi.mock('./hooks/use-body-analysis', () => ({
  useBodyAnalysis: () => ({ rows: [], loading: false, error: false }),
}))
```

```tsx
it.each([
  ['/training/analyse'],
  ['/nutrition/analyse'],
  ['/body/analyse'],
])('shows the analysis page at %s', async (pfad) => {
  window.history.pushState({}, '', pfad)
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

  const { default: App } = await import('./App')
  render(<App />)

  // findByRole, not getByRole: the analysis pages are loaded lazily, so the
  // first render is the Suspense fallback.
  expect(await screen.findByRole('heading', { name: 'Analyse' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/App.test.tsx`
Expected: FAIL — die Routen gibt es noch nicht.

- [ ] **Step 3: Add the lazy routes**

In `src/App.tsx` die Importe ergänzen:

```tsx
import { lazy, Suspense } from 'react'

// Lazy on purpose: recharts is about 136 kB gzipped and nothing on the login
// or home screen needs it. The dashboards pull it in on their first visit
// anyway, so the win is the cold start, not the navigation after it.
const TrainingAnalysisPage = lazy(() => import('./pages/TrainingAnalysisPage'))
const NutritionAnalysisPage = lazy(() => import('./pages/NutritionAnalysisPage'))
const BodyAnalysisPage = lazy(() => import('./pages/BodyAnalysisPage'))
```

und innerhalb der geschützten Route, jeweils direkt nach der Bereichsroute:

```tsx
          <Route
            path="/training/analyse"
            element={
              <Suspense fallback={<p>Lädt…</p>}>
                <TrainingAnalysisPage />
              </Suspense>
            }
          />
```

analog für `/nutrition/analyse` und `/body/analyse`.

- [ ] **Step 4: Run the full verification**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
npm run build
```

Erwartet: Lint ohne Fehler und ohne Warnungen, keine Typfehler, alle Tests grün, Build erfolgreich.

**Die Bundle-Ausgabe von `npm run build` gehört wörtlich in den Bericht** — Größe des Start-Chunks und der ausgelagerten Analyse-Chunks. Bleibt der Start-Chunk über der Warnschwelle, ist das ein Befund für die Härtungsphase und **kein Grund, diesen Task aufzuhalten**.

- [ ] **Step 5: Update the domain model**

`docs/domaenenmodell.md` ergänzen:

- Unter „Fachliche Notizen": `profiles.analyse_auswahl` ist eine Liste von Graph-IDs aus der Registry (`src/lib/analysis/registry.ts`), nicht von Fremdschlüsseln. Unbekannte IDs werden beim Lesen verworfen, damit ein später entfernter Graph kein Dashboard zerlegt.
- Die Quellenzeile am Ende um `0007_analyse_auswahl.sql` erweitern.

Danach nach `../fitness-app.wiki/Domain-Model.md` spiegeln. **Nur die Datei schreiben, nichts im Wiki-Repo committen oder pushen** — das ist ein eigenes Git-Repo und passiert nach dem Merge.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx docs/domaenenmodell.md
git commit -m "feat: Analyse-Seiten einhaengen und Domaenenmodell nachziehen"
```

---

## Manual Verification (nach dem Merge, gegen die echte Instanz)

Die Migration ändert eine Tabelle auf Produktion; ohne lokale Supabase-Instanz ist das vorher nicht prüfbar.

1. In Supabase unter Table Editor: `profiles` hat die Spalte `analyse_auswahl`, deine Zeile trägt `["T1","E1","K1"]`.
2. `/body` öffnen — der Gewichtsverlauf steht unter den Werten, ohne Zeitraum-Knöpfe. Mit weniger als zwei Gewichtseinträgen steht dort der Satz statt eines leeren Koordinatensystems.
3. „Analyse" antippen. Die Seite zeigt denselben Graphen, dazu die vier Zeitraum-Knöpfe und das Häkchen.
4. Zeitraum auf „30 Tage" stellen — die Kurve wird kürzer. Auf „alles" — sie wird länger.
5. Das Häkchen **abwählen**, zurück auf `/body`: der Graph ist weg. Seite neu laden — er bleibt weg. **Das ist der wichtigste Schritt: er beweist, dass die Auswahl wirklich im Profil liegt und nicht nur im Speicher des Browsers.**
6. Wieder anhaken, prüfen dass er zurückkommt.
7. Dasselbe je einmal unter `/training/analyse` und `/nutrition/analyse`. Beim Ernährungsgraphen prüfen, dass die Ziel-Linie auf deinem Kalorienziel liegt.
8. Netzwerkanalyse öffnen und `/login` neu laden: der Recharts-Chunk darf dort **nicht** geladen werden. Beim Wechsel auf ein Dashboard erscheint er.
9. Konsole auf Fehler und Warnungen prüfen.

# Phase 5, Plan 2b – Ernährungsgraphen E2 bis E6

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Ernährungsbereich bekommt seine restlichen fünf Graphen (E2–E6), und Analyse-Seite wie Dashboard rendern sie aus der Registry über eine Liste statt einzeln verdrahtet — mit genau zwei Datenabfragen je Seite.

**Architecture:** Wie in Plan 1 und Plan 2a: reine Rechenfunktionen unter `src/lib/analysis/`, ein zeitraum-bezogener Hook je Bereich, Graph-Komponenten ohne eigenen Datenzugriff. Neu ist, dass `useNutritionAnalysis` neben den Einträgen auch die Trainingskalorien des Zeitraums lädt (für E6) und beide Abfragen seitenweise paginiert, und dass eine Liste (`NutritionChartList`) die Graphen anhand ihrer IDs rendert — dieselbe Liste bedient Analyse-Seite (alle IDs des Bereichs, mit Häkchen) und Dashboard (nur die angehakten IDs, ohne Bedienelemente).

**Tech Stack:** React + Vite + TypeScript, Supabase, Recharts, Vitest + Testing Library. Keine neue Abhängigkeit.

**Spec:** `docs/superpowers/specs/2026-08-24-phase5-analysebereich-design.md`

**Vorgänger:** `docs/superpowers/plans/2026-08-24-phase5-plan1-fundament.md` (gemerged, PR #27) und `docs/superpowers/plans/2026-08-27-phase5-plan2a-training-graphen.md` (gemerged, PR #33, manuell verifiziert am 29.08.2026)

**Geschwisterplan:** Plan 2c (Körper, K2–K5) wird parallel geschrieben. **Dieser Plan fasst keine Körper-Datei an** (`use-body-analysis.ts`, `WeightTrendChart.tsx`, `BodyPage.tsx`, `BodyAnalysisPage.tsx`, `body-charts.ts`).

## Global Constraints

- **Keine Drittanbieter-Namen** aus Fitness/Ernährung in Code, Kommentaren, Commit-Messages oder Docs.
- **Keine neue Abhängigkeit.** Alles wird mit React, Recharts und der Standardbibliothek gebaut.
- Sprache im UI: Deutsch. Dateinamen kebab-case, Komponenten PascalCase.
- `supabase-js` wirft nicht — jeder Lesevorgang prüft `error` aus dem Ergebnis und meldet sichtbar. Rohe Datenbankmeldungen erscheinen nie im UI.
- Jeder neue oder geänderte Hook trägt den `requestId`-Guard gegen Antworten in falscher Reihenfolge.
- Tage sind **lokale** Tage, nie UTC (`localDay` aus `src/lib/local-time.ts`).
- **Nährwerte stehen je 100 g**, ein Eintrag trägt seine Menge in Gramm: jeder Wert wird als `wert × menge / 100` gerechnet (`entryKalorien` in `src/lib/entry-calories.ts` ist die Vorlage).
- Leerzustand: Linien ab **zwei** Punkten, Balken und Listen ab **einem**. Sonst der Satz aus `ChartFrame`, nie leere Achsen.
- Zeitraum-Vorgabe auf den Analyse-Seiten: **90 Tage**. Dashboards: **fest 90 Tage, ohne Umschalter**.
- **Ein Dashboard ohne angehakten Graphen feuert keine Analyseabfrage.** Diese Eigenschaft wurde am 27.08. und 29.08.2026 gegen Produktion verifiziert und darf nicht verloren gehen.
- Graph-Tests prüfen **gezeichnete Marken**, nie Achsentexte (Recharts überspringt Ticks je nach Layout, in jsdom anders als im Browser). Balken: Anzahl der Rechtecke (`.recharts-bar-rectangle`). Linien: `M`/`L`/`C`-Befehle im `d` der Kurve (`.recharts-line-curve`).
- **Achtung bei der Linienzählung:** `type="monotone"` liefert bei genau **zwei** Punkten `M…L…`, ab drei Punkten `M…C…C…`. Die Zählung von `[ML]` ergibt die Punktzahl deshalb nur bei genau zwei Punkten; alle Linien-Fixtures in diesem Plan haben genau zwei.
- **Recharts zeichnet für einen Nullwert gar keine Marke.** Fixtures, die Balken zählen, tragen ausschließlich Werte größer null.
- Jedes `findBy*` hinter einer `React.lazy`-Grenze braucht `{ timeout: 5000 }`.
- Nach jedem Task: `npm run lint`, `npx tsc -b --noEmit`, `npm test -- --run` müssen grün sein.
- Commit-Messages auf Deutsch **ohne Umlaute**, im Stil der bestehenden Historie.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `src/lib/paged-query.ts` | **neu:** `seitenweiseLaden` — die Seitenschleife, die bisher nur in `use-training-analysis.ts` stand |
| `src/hooks/use-training-analysis.ts` | geändert: importiert `seitenweiseLaden` statt einer eigenen Kopie |
| `src/hooks/use-nutrition-analysis.ts` | erweitert: paginiert, und lädt zusätzlich die Trainingskalorien des Zeitraums (E6) |
| `src/lib/entry-calories.ts` | erweitert: `entryMakro`/`sumMakro` — die Makro-Rechnung, die bisher nur in `DailySummary.tsx` stand |
| `src/components/DailySummary.tsx` | geändert: nutzt `sumMakro` aus `entry-calories` statt einer eigenen Kopie |
| `src/lib/analysis/wochen.ts` | **neu:** `wochenStart`, `wochenLabel` — bisher privat in `training-charts.ts` |
| `src/lib/analysis/training-charts.ts` | geändert: importiert die beiden Wochenhelfer statt einer eigenen Kopie |
| `src/lib/analysis/nutrition-charts.ts` | erweitert: alle Rechenfunktionen der Ernährungsgraphen |
| `src/lib/analysis/chart-titles.ts` | erweitert: fünf neue Titel |
| `src/lib/analysis/registry.ts` | erweitert: E2–E6 angemeldet |
| `src/components/charts/NutritionChartList.tsx` | rendert die Graphen eines ID-Satzes, lazy, mit oder ohne Häkchen |
| `src/components/charts/MacroDistributionChart.tsx` | E2 Makro-Verteilung heute |
| `src/components/charts/MacroTrendChart.tsx` | E3 Makro-Verlauf |
| `src/components/charts/MealSectionCaloriesChart.tsx` | E4 Kalorien je Mahlzeiten-Abschnitt |
| `src/components/charts/WeeklyAverageChart.tsx` | E5 Wochenschnitt |
| `src/components/charts/CalorieBalanceChart.tsx` | E6 Kalorienbilanz |
| `src/pages/NutritionAnalysisPage.tsx` | rendert alle Ernährungsgraphen über die Liste |
| `src/pages/NutritionPage.tsx` | rendert die angehakten Ernährungsgraphen über die Liste, ohne Häkchen |
| `docs/domaenenmodell.md` | fachliche Notiz zur Ernährungsanalyse |

### Drei Entscheidungen, die vor den Tasks feststehen

**1. Paginierung: ja, für beide Abfragen des Ernährungs-Hooks.** Der Whole-Branch-Review von Plan 2a stufte genau diese Lücke als Critical ein, und `food_entries` hat keine natürliche Obergrenze: wer drei Mahlzeiten mit je zwei Produkten erfasst, schreibt ~2200 Zeilen im Jahr, und `alles` liest sie alle. PostgREST deckelt eine Antwort still bei `db-max-rows` (Vorgabe 1000) — der Graph zeigte dann einfach ein falsches Jahr. Die Schleife ist dieselbe wie in `use-exercises.ts` und `use-training-analysis.ts`; damit sie nicht ein drittes Mal abgeschrieben wird, zieht Task 1 sie nach `src/lib/paged-query.ts` und lässt den Trainings-Hook von dort importieren. `use-exercises.ts` bleibt unangetastet: seine Schleife hängt an seinem eigenen Fehler- und Ladezustand, und ein Umbau dort gehört nicht in einen Ernährungsplan.

**2. Die Makro-Rechnung wird geteilt, nicht kopiert.** `DailySummary.tsx` rechnet `wert × menge / 100` je Makro bereits richtig. E2 und E3 brauchen dieselbe Rechnung. Sie wandert deshalb nach `src/lib/entry-calories.ts` — dort steht `entryKalorien` schon, es ist die neutrale Stelle, die beide Seiten ohnehin importieren, und `DailySummary` verliert nur seine private Kopie (seine Tests bleiben unverändert grün). Eine dritte Variante in `nutrition-charts.ts` wäre die Sorte Duplikat, die später auseinanderläuft.

**3. E2 zeigt Energie-Anteile in Prozent, nicht Gramm-Anteile.** Die Spec sagt „Eiweiß/Fett/Kohlenhydrate als Anteile". Anteile am Gramm-Gewicht wären irreführend: Fett trägt je Gramm mehr als das Doppelte an Energie, ein Tag mit 20 % Fett-Gramm ist ein Tag mit ~40 % Fett-Kalorien. Gerechnet wird mit den üblichen Faktoren 4 / 9 / 4 kcal je Gramm; die Gramm-Zahl steht als Achsenbeschriftung am Balken, damit sie gegen `DailySummary` prüfbar bleibt.

---

## Task 1: Trainingskalorien in den Ernährungs-Hook, und beide Abfragen paginieren

**Files:**
- Create: `src/lib/paged-query.ts`
- Create: `src/lib/paged-query.test.ts`
- Modify: `src/hooks/use-training-analysis.ts`
- Modify: `src/hooks/use-nutrition-analysis.ts`
- Modify: `src/hooks/use-nutrition-analysis.test.ts` (vollständig ersetzt)
- Modify: `src/App.test.tsx`, `src/pages/NutritionPage.test.tsx`, `src/pages/NutritionAnalysisPage.test.tsx` (Mocks um `sessions` erweitern)

**Interfaces:**
- Consumes: `rangeStart`, `Zeitraum` aus `src/lib/analysis/zeitraum.ts`
- Produces:
  ```ts
  // src/lib/paged-query.ts
  export const PAGE_SIZE = 500
  export const MAX_PAGES = 40
  export function seitenweiseLaden<T>(
    seite: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
  ): Promise<{ rows: T[]; failed: boolean }>

  // src/hooks/use-nutrition-analysis.ts
  export type AnalysisSessionKalorien = {
    gestartet_am: string | null
    gesamt_kalorien: number | null
  }
  // useNutritionAnalysis(userId, zeitraum)
  //   -> { entries: AnalysisFoodEntry[], sessions: AnalysisSessionKalorien[], loading, error }
  ```

E6 (Kalorienbilanz) ist der einzige Ernährungsgraph, der über seinen Bereich hinausgreift. Die Spec (Abschnitt 3, „Datenfluss") legt fest, wo das passiert: „E6 (Kalorienbilanz) braucht zusätzlich `gesamt_kalorien` der Sessions im Zeitraum — `useNutritionAnalysis` lädt sie mit." Es ist eine **zweite Abfrage**, kein Join: `workout_sessions` und `food_entries` haben keine Beziehung, über die PostgREST sie verbinden könnte.

**Der Mock in `use-nutrition-analysis.test.ts` wird umgebaut**, weil `.range()` jetzt der terminale Aufruf ist (vorher `.order()`) und weil je Tabelle eine eigene Antwortfolge nötig ist.

- [ ] **Step 1: Write the failing test for the paging helper**

Create `src/lib/paged-query.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { PAGE_SIZE, seitenweiseLaden } from './paged-query'

describe('seitenweiseLaden', () => {
  it('keeps asking until a short page comes back', async () => {
    const erste = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: String(i) }))
    const seite = vi
      .fn()
      .mockResolvedValueOnce({ data: erste, error: null })
      .mockResolvedValueOnce({ data: [{ id: 'letzte' }], error: null })

    const ergebnis = await seitenweiseLaden<{ id: string }>(seite)

    expect(ergebnis.failed).toBe(false)
    expect(ergebnis.rows).toHaveLength(PAGE_SIZE + 1)
    expect(seite).toHaveBeenNthCalledWith(1, 0, PAGE_SIZE - 1)
    expect(seite).toHaveBeenNthCalledWith(2, PAGE_SIZE, 2 * PAGE_SIZE - 1)
  })

  it('stops after one page when it is not full', async () => {
    const seite = vi.fn().mockResolvedValue({ data: [{ id: 'a' }], error: null })
    const ergebnis = await seitenweiseLaden<{ id: string }>(seite)
    expect(seite).toHaveBeenCalledTimes(1)
    expect(ergebnis.rows).toHaveLength(1)
  })

  it('reports a failed page instead of serving a partial result', async () => {
    // Sonst sieht ein halb geladener Zeitraum aus wie ein magerer Monat.
    const erste = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: String(i) }))
    const seite = vi
      .fn()
      .mockResolvedValueOnce({ data: erste, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

    const ergebnis = await seitenweiseLaden<{ id: string }>(seite)

    expect(ergebnis.failed).toBe(true)
    expect(ergebnis.rows).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- --run src/lib/paged-query.test.ts`
Expected: FAIL — Modul `./paged-query` existiert nicht.

- [ ] **Step 3: Write the paging helper**

Create `src/lib/paged-query.ts`:

```ts
/**
 * Die Seitenschleife hinter jeder Analyseabfrage.
 *
 * PostgREST deckelt eine Antwort bei `db-max-rows` (Vorgabe 1000) und sagt es
 * nicht dazu — eine ungeblätterte Abfrage liefert dann still einen Ausschnitt,
 * der wie ein vollstaendiges Ergebnis aussieht. Dieselbe Schleife stand vorher
 * in `use-training-analysis.ts`; sie liegt hier, damit sie nicht ein drittes
 * Mal abgeschrieben wird.
 */
export const PAGE_SIZE = 500
/** Stops a misconfigured db-max-rows from turning the loop into an endless one. */
export const MAX_PAGES = 40

/** Seitenweise laden, bis eine kurze Seite kommt — sonst schneidet db-max-rows still ab. */
export async function seitenweiseLaden<T>(
  seite: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<{ rows: T[]; failed: boolean }> {
  const rows: T[] = []
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE
    const { data, error } = await seite(from, from + PAGE_SIZE - 1)
    // Eine fehlgeschlagene Seite wird gemeldet, nicht als vollstaendiges
    // Ergebnis ausgeliefert.
    if (error) return { rows: [], failed: true }
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return { rows, failed: false }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- --run src/lib/paged-query.test.ts`
Expected: PASS

- [ ] **Step 5: Den Trainings-Hook auf den geteilten Helfer umstellen**

In `src/hooks/use-training-analysis.ts` die drei lokalen Definitionen `PAGE_SIZE`, `MAX_PAGES` und `seitenweiseLaden` **löschen** (samt ihrer Kommentare) und stattdessen oben importieren:

```ts
import { seitenweiseLaden } from '../lib/paged-query'
```

`ID_CHUNK_SIZE` und `inChunks` bleiben, wo sie sind — sie gehören zur Satz-Abfrage und zu keiner anderen.

Run: `npm test -- --run src/hooks/use-training-analysis.test.ts`
Expected: PASS, unverändert — es ist ein reiner Umzug.

- [ ] **Step 6: Write the failing test for the nutrition hook**

`src/hooks/use-nutrition-analysis.test.ts` **vollständig ersetzen**:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNutritionAnalysis } from './use-nutrition-analysis'
import { PAGE_SIZE } from '../lib/paged-query'

const gte = vi.fn()
const order = vi.fn()
const eq = vi.fn()
const select = vi.fn()
const range = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => ({ select: (columns: string) => select(table, columns) }) },
}))

type Ergebnis = { data: unknown; error: unknown }
let eintragSeiten: Ergebnis[]
let sessionSeiten: Ergebnis[]

/** Baut einen Query-Builder, dessen `.range()` terminal ist und die naechste Seite liefert. */
function builderFuer(seiten: () => Ergebnis[]) {
  const builder: Record<string, unknown> = {
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
      return builder
    },
    range: (...args: unknown[]) => {
      range(...args)
      return Promise.resolve(seiten().shift() ?? { data: [], error: null })
    },
  }
  return builder
}

beforeEach(() => {
  vi.clearAllMocks()
  eintragSeiten = []
  sessionSeiten = []
  select.mockImplementation((table: string) =>
    builderFuer(() => (table === 'workout_sessions' ? sessionSeiten : eintragSeiten)),
  )
})

const eintrag = {
  zeitpunkt: '2026-08-24T08:00:00Z',
  menge: 100,
  mahlzeit: 1,
  products: { kalorien: 250, eiweiss: 10, fett: 5, kohlenhydrate: 40 },
}

describe('useNutritionAnalysis', () => {
  it('loads entries with the nutritional values the charts need', async () => {
    eintragSeiten = [{ data: [eintrag], error: null }]
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
    eintragSeiten = [{ data: null, error: { message: 'boom' } }]
    const { result } = renderHook(() => useNutritionAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.entries).toEqual([])
  })

  it('pages through the entries instead of stopping at the row cap', async () => {
    // PostgREST deckelt still bei db-max-rows: ohne Blaettern fehlte einem
    // aktiven Nutzer ueber `alles` schlicht ein Teil des Jahres.
    const volleSeite = Array.from({ length: PAGE_SIZE }, () => eintrag)
    eintragSeiten = [
      { data: volleSeite, error: null },
      { data: [eintrag], error: null },
    ]
    const { result } = renderHook(() => useNutritionAnalysis('u1', 'alles'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.entries).toHaveLength(PAGE_SIZE + 1)
    expect(range).toHaveBeenNthCalledWith(1, 0, PAGE_SIZE - 1)
    expect(range).toHaveBeenNthCalledWith(2, PAGE_SIZE, 2 * PAGE_SIZE - 1)
  })

  it('loads the session calories of the same range in a second query', async () => {
    // E6 rechnet Aufnahme minus Trainingsverbrauch; die Sessions liegen in einer
    // anderen Tabelle ohne Beziehung zu food_entries — also eine zweite Abfrage,
    // kein Join.
    eintragSeiten = [{ data: [eintrag], error: null }]
    sessionSeiten = [
      { data: [{ gestartet_am: '2026-08-24T18:00:00Z', gesamt_kalorien: 420 }], error: null },
    ]
    const { result } = renderHook(() => useNutritionAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions).toEqual([
      { gestartet_am: '2026-08-24T18:00:00Z', gesamt_kalorien: 420 },
    ])
    const sessionAufruf = select.mock.calls.find(([table]) => table === 'workout_sessions')
    expect(sessionAufruf).toBeDefined()
    expect(sessionAufruf![1]).toContain('gesamt_kalorien')
    expect(gte).toHaveBeenCalledWith('gestartet_am', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('reports a failed session load like a failed entry load', async () => {
    eintragSeiten = [{ data: [eintrag], error: null }]
    sessionSeiten = [{ data: null, error: { message: 'boom' } }]
    const { result } = renderHook(() => useNutritionAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.sessions).toEqual([])
  })
})
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npm test -- --run src/hooks/use-nutrition-analysis.test.ts`
Expected: FAIL — `result.current.sessions` ist `undefined`, und die Paginierungsfälle laufen ins Leere, weil `.range()` nicht aufgerufen wird.

- [ ] **Step 8: Write the implementation**

`src/hooks/use-nutrition-analysis.ts` vollständig ersetzen:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { seitenweiseLaden } from '../lib/paged-query'
import { rangeStart, type Zeitraum } from '../lib/analysis/zeitraum'

export type AnalysisFoodEntry = {
  zeitpunkt: string
  menge: number
  mahlzeit: number | null
  products: { kalorien: number; eiweiss: number; fett: number; kohlenhydrate: number } | null
}

/** Was E6 von einer Trainingseinheit braucht — mehr liest diese Abfrage nicht. */
export type AnalysisSessionKalorien = {
  gestartet_am: string | null
  gesamt_kalorien: number | null
}

// The macro columns come along although E1 only needs calories: E2 and E3 read
// the same query later, and widening it then would mean changing reviewed code.
const COLUMNS = 'zeitpunkt, menge, mahlzeit, products(kalorien, eiweiss, fett, kohlenhydrate)'
const SESSION_COLUMNS = 'gestartet_am, gesamt_kalorien'

/**
 * One query per area, not one per chart — plus die Trainingskalorien, die E6
 * ueber den Bereich hinaus braucht (Spec, Abschnitt 3).
 *
 * Beide Abfragen blaettern (`seitenweiseLaden`): `food_entries` hat keine
 * natuerliche Obergrenze, und PostgREST deckelt still bei db-max-rows.
 */
export function useNutritionAnalysis(userId: string, zeitraum: Zeitraum) {
  const [entries, setEntries] = useState<AnalysisFoodEntry[]>([])
  const [sessions, setSessions] = useState<AnalysisSessionKalorien[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const start = rangeStart(zeitraum)

    const eintragErgebnis = await seitenweiseLaden<AnalysisFoodEntry>((from, to) => {
      let query = supabase.from('food_entries').select(COLUMNS).eq('user_id', userId)
      // `zeitpunkt` is timestamptz and the bound is a date: Postgres reads it as
      // midnight of that day, which is the lower bound we want.
      if (start) query = query.gte('zeitpunkt', start)
      return (
        query
          .order('zeitpunkt', { ascending: true })
          // id als Tiebreaker: `zeitpunkt` ist nicht eindeutig, und ohne totale
          // Ordnung kann eine Zeile an der Seitengrenze doppelt oder gar nicht
          // ankommen. Die Spalte wird nur sortiert, nicht gelesen.
          .order('id', { ascending: true })
          .range(from, to)
      )
    })
    if (current !== requestId.current) return

    const sessionErgebnis = await seitenweiseLaden<AnalysisSessionKalorien>((from, to) => {
      let query = supabase.from('workout_sessions').select(SESSION_COLUMNS).eq('user_id', userId)
      if (start) query = query.gte('gestartet_am', start)
      return query
        .order('gestartet_am', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    })
    if (current !== requestId.current) return

    setEntries(eintragErgebnis.failed ? [] : eintragErgebnis.rows)
    setSessions(sessionErgebnis.failed ? [] : sessionErgebnis.rows)
    // Ein Ladefehler gehoert dem Bereich: eine Meldung oben auf der Seite, egal
    // welche der beiden Abfragen gescheitert ist.
    setError(eintragErgebnis.failed || sessionErgebnis.failed)
    setLoading(false)
  }, [userId, zeitraum])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { entries, sessions, loading, error }
}
```

- [ ] **Step 9: Run it to verify it passes**

Run: `npm test -- --run src/hooks/use-nutrition-analysis.test.ts`
Expected: PASS

- [ ] **Step 10: Die Mocks der Seitentests nachziehen**

Genau dieser Schritt fehlte in Plan 2a und ließ CI auf PR #33 rot werden: ein Seitentest mockte den Hook noch mit der alten Rückgabe, und der neue Graph stürzte mit „sets is not iterable" ab. Drei Stellen:

`src/App.test.tsx`:

```tsx
vi.mock('./hooks/use-nutrition-analysis', () => ({
  useNutritionAnalysis: () => ({ entries: [], sessions: [], loading: false, error: false }),
}))
```

`src/pages/NutritionPage.test.tsx` — im `beforeEach` des Blocks „NutritionPage – ausgewaehlte Graphen":

```tsx
    mockUseNutritionAnalysis.mockReturnValue({
      entries: [eintrag(23, 1800), eintrag(24, 2100)],
      sessions: [],
      loading: false,
      error: false,
    })
```

`src/pages/NutritionAnalysisPage.test.tsx` — im `beforeEach` und in den beiden Fällen, die `mockUseNutritionAnalysis.mockReturnValue` überschreiben, jeweils `sessions: []` ergänzen:

```tsx
  mockUseNutritionAnalysis.mockReturnValue({
    entries: [eintrag(23, 1800), eintrag(24, 2100)],
    sessions: [],
    loading: false,
    error: false,
  })
```

```tsx
    mockUseNutritionAnalysis.mockReturnValue({ entries: [], sessions: [], loading: false, error: true })
```

```tsx
    mockUseNutritionAnalysis.mockReturnValue({ entries: [], sessions: [], loading: true, error: false })
```

- [ ] **Step 11: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/lib/paged-query.ts src/lib/paged-query.test.ts src/hooks/use-training-analysis.ts src/hooks/use-nutrition-analysis.ts src/hooks/use-nutrition-analysis.test.ts src/App.test.tsx src/pages/NutritionPage.test.tsx src/pages/NutritionAnalysisPage.test.tsx
git commit -m "feat: Ernaehrungsanalyse laedt Trainingskalorien mit und blaettert beide Abfragen"
```

---

## Task 2: Ernährungsgraphen aus der Registry rendern

**Files:**
- Create: `src/components/charts/NutritionChartList.tsx`
- Create: `src/components/charts/NutritionChartList.test.tsx`
- Modify: `src/pages/NutritionAnalysisPage.tsx` (vollständig ersetzt)
- Modify: `src/pages/NutritionPage.tsx` (vollständig ersetzt)
- Test: `src/pages/NutritionAnalysisPage.test.tsx` (drei Fälle auf die lazy-Grenze umgestellt)

**Interfaces:**
- Consumes: `useNutritionAnalysis` → `{ entries, sessions, loading, error }` (Task 1), `AnalysisFoodEntry`, `AnalysisSessionKalorien`, `E1`, `chartsFor`, `useChartSelection`, `ChartPicker`, `effectiveCalorieGoal`, `useProfile`, `Profile`
- Produces:
  ```ts
  // src/components/charts/NutritionChartList.tsx
  export type NutritionChartListProps = {
    ids: string[]
    entries: AnalysisFoodEntry[]
    sessions: AnalysisSessionKalorien[]
    ziel: number | null
    profile: MealSectionNames | null
    /** Gesetzt auf der Analyse-Seite: zeigt die Haekchen. */
    auswahl?: ReturnType<typeof useChartSelection>
  }
  export default function NutritionChartList(props: NutritionChartListProps): JSX.Element
  ```

Der Ernährungsbereich steht noch auf dem Muster vor Plan 2a: beide Seiten binden `CaloriesPerDayChart` direkt ein, das Dashboard mit einem eigenen `lazy()`-Aufruf. Mit sechs Graphen wären das sechs Einbindungsstellen je Seite. Die Liste dreht es um, genau wie im Training: der Hook läuft einmal auf der Seite, die Liste bekommt die Daten und rendert die Graphen zu den IDs, die sie bekommt.

**`React.lazy` liegt ab hier nur noch in der Liste.** `NutritionPage.tsx` verliert seinen seitenlokalen `lazy()`-Aufruf ersatzlos; `NutritionChartList.tsx` hält künftig jeden Ernährungsgraphen als eigenen `lazy()`-Aufruf. Die Liste selbst zieht kein Recharts in den Start-Chunk — sie importiert nur `ChartPicker` und die Registry.

**`sessions` und `profile` werden erst ab Task 7 (E6) beziehungsweise Task 5 (E4) wirklich gebraucht.** Sie stehen in den Props schon jetzt, damit spätere Tasks die Signatur der Liste nicht mehr ändern müssen — bis dahin reicht dieser Task sie nur durch (`void sessions; void profile`), genau wie `BodyChartList` es in Plan 2c mit `kalorien`/`fotos` vorgemacht hat.

**Die Eigenschaft „Dashboard ohne Häkchen fragt nichts ab" bleibt erhalten**, weil das Dashboard die Datenkomponente nur rendert, wenn mindestens eine Ernährungs-ID angehakt ist.

- [ ] **Step 1: Write the failing test**

Create `src/components/charts/NutritionChartList.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NutritionChartList from './NutritionChartList'
import { E1 } from '../../lib/analysis/registry'

const eintrag = (tag: number, kalorien: number) => ({
  zeitpunkt: new Date(2026, 7, tag, 12, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
})

const entries = [eintrag(23, 1800), eintrag(24, 2100)]

const auswahl = {
  auswahl: [E1],
  istGewaehlt: (id: string) => id === E1,
  umschalten: vi.fn(),
  fehler: '',
}

describe('NutritionChartList', () => {
  it('renders the charts of the given ids', async () => {
    render(
      <NutritionChartList ids={[E1]} entries={entries} sessions={[]} ziel={2000} profile={null} />,
    )
    // timeout: die Graphen haengen hinter React.lazy.
    expect(await screen.findByText('Kalorien pro Tag', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('renders no chart for an id it does not know', () => {
    // parseAuswahl verwirft unbekannte IDs bereits, aber die Liste darf an einer
    // durchgerutschten ID nicht abstuerzen.
    const { container } = render(
      <NutritionChartList ids={['E99']} entries={[]} sessions={[]} ziel={null} profile={null} />,
    )
    expect(container.querySelector('section')).toBeNull()
  })

  it('shows the checkbox only when a selection is passed', async () => {
    const { rerender } = render(
      <NutritionChartList ids={[E1]} entries={entries} sessions={[]} ziel={2000} profile={null} />,
    )
    await screen.findByText('Kalorien pro Tag', {}, { timeout: 5000 })
    expect(screen.queryByRole('checkbox')).toBeNull()

    rerender(
      <NutritionChartList
        ids={[E1]}
        entries={entries}
        sessions={[]}
        ziel={2000}
        profile={null}
        auswahl={auswahl}
      />,
    )
    expect(await screen.findByRole('checkbox', {}, { timeout: 5000 })).toBeChecked()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/NutritionChartList.test.tsx`
Expected: FAIL — Modul `./NutritionChartList` existiert nicht.

- [ ] **Step 3: Write the implementation**

Create `src/components/charts/NutritionChartList.tsx`:

```tsx
import { lazy, Suspense, type ReactNode } from 'react'
import type { AnalysisFoodEntry, AnalysisSessionKalorien } from '../../hooks/use-nutrition-analysis'
import type { MealSectionNames } from '../../lib/meal-sections'
import ChartPicker, { type useChartSelection } from './ChartPicker'
import { E1 } from '../../lib/analysis/registry'

// Lazy an dieser einen Stelle: die Liste ist der einzige Ort, an dem ein
// Ernaehrungsgraph noch eingebunden wird — Dashboard wie Analyse-Seite gehen
// hierdurch. Recharts bleibt damit aus dem Start-Chunk.
const CaloriesPerDayChart = lazy(() => import('./CaloriesPerDayChart'))

export type NutritionChartListProps = {
  ids: string[]
  entries: AnalysisFoodEntry[]
  sessions: AnalysisSessionKalorien[]
  ziel: number | null
  profile: MealSectionNames | null
  /** Gesetzt auf der Analyse-Seite: zeigt die Haekchen. */
  auswahl?: ReturnType<typeof useChartSelection>
}

export default function NutritionChartList({
  ids,
  entries,
  sessions,
  ziel,
  profile,
  auswahl,
}: NutritionChartListProps) {
  function graph(id: string): ReactNode {
    const picker = auswahl ? <ChartPicker id={id} auswahl={auswahl} /> : undefined
    switch (id) {
      case E1:
        return <CaloriesPerDayChart entries={entries} ziel={ziel} picker={picker} />
      default:
        // Eine ID ohne Komponente ist kein Fehler, den der Nutzer sehen muss:
        // parseAuswahl haelt Unbekanntes schon fern, hier bleibt nur die Luecke.
        return null
    }
  }

  // sessions wird ab Task 7 (E6), profile ab Task 5 (E4) gebraucht; bis dahin
  // reicht die Liste sie nur durch.
  void sessions
  void profile

  return (
    <>
      {ids.map((id) => (
        <Suspense key={id} fallback={<p>Lädt…</p>}>
          {graph(id)}
        </Suspense>
      ))}
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/charts/NutritionChartList.test.tsx`
Expected: PASS

- [ ] **Step 5: Analyse-Seite auf die Liste umstellen**

`src/pages/NutritionAnalysisPage.tsx` vollständig ersetzen:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useNutritionAnalysis } from '../hooks/use-nutrition-analysis'
import { useProfile } from '../hooks/use-profile'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import { useChartSelection } from '../components/charts/ChartPicker'
import NutritionChartList from '../components/charts/NutritionChartList'
import { chartsFor } from '../lib/analysis/registry'
import { STANDARD_ZEITRAUM, type Zeitraum } from '../lib/analysis/zeitraum'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'

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
  const { entries, sessions, loading, error } = useNutritionAnalysis(userId, zeitraum)
  const { profile } = useProfile(userId)
  const auswahl = useChartSelection(userId)
  // Reihenfolge ist die der Registry — kein Umsortieren, wie in der Spec.
  const ids = chartsFor('nutrition').map((chart) => chart.id)

  return (
    <div>
      <h1>Analyse</h1>
      <ZeitraumSwitch wert={zeitraum} onChange={setZeitraum} />
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <p>Lädt…</p>
      ) : (
        <NutritionChartList
          ids={ids}
          entries={entries}
          sessions={sessions}
          // effectiveCalorieGoal, not the raw column: the manual field is null
          // for everyone who never typed a goal, and the fallback calculation is
          // what the rest of the app shows.
          ziel={profile ? effectiveCalorieGoal(profile) : null}
          profile={profile}
          auswahl={auswahl}
        />
      )}
      <Link to="/nutrition">Zurück zum Ernährungsbereich</Link>
    </div>
  )
}
```

- [ ] **Step 6: Dashboard auf die Liste umstellen**

`src/pages/NutritionPage.tsx` vollständig ersetzen:

```tsx
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile, type Profile } from '../hooks/use-profile'
import { useFoodEntries } from '../hooks/use-food-entries'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'
import { visibleSections } from '../lib/meal-sections'
import { sumKalorien } from '../lib/entry-calories'
import DailySummary from '../components/DailySummary'
import { useChartSelection } from '../components/charts/ChartPicker'
import NutritionChartList from '../components/charts/NutritionChartList'
import { chartsFor } from '../lib/analysis/registry'
import { useNutritionAnalysis } from '../hooks/use-nutrition-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'

export default function NutritionPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <NutritionDashboard userId={userId} />
}

function NutritionDashboard({ userId }: { userId: string }) {
  const { profile, loading: profileLoading, error: profileError, reload } = useProfile(userId)
  const { entries, loading: entriesLoading } = useFoodEntries(userId)
  const auswahl = useChartSelection(userId)

  if (profileLoading || entriesLoading) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p role="alert">Profil konnte nicht geladen werden.</p>
        <button type="button" onClick={() => reload()}>
          Erneut versuchen
        </button>
      </div>
    )
  }

  const goal = effectiveCalorieGoal(profile)

  return (
    <div>
      <h1>Ernährung</h1>
      <DailySummary entries={entries} goal={goal} />
      {goal == null && (
        <p>
          Für ein Tagesziel <Link to="/profile">Profil vervollständigen</Link>.
        </p>
      )}
      <Link to="/profile">Ziel im Profil anpassen</Link>
      <ul role="list">
        {visibleSections(profile, entries).map((section) => {
          const sectionEntries = entries.filter((entry) => entry.mahlzeit === section.slot)
          return (
            <li key={section.slot ?? 'unassigned'}>
              <Link to="/nutrition/entries">
                {`${section.name} — ${Math.round(sumKalorien(sectionEntries))} kcal`}
              </Link>
            </li>
          )
        })}
      </ul>
      <Link to="/nutrition/entries">Einträge ansehen</Link>
      <DashboardNutritionCharts userId={userId} auswahl={auswahl.auswahl} ziel={goal} profile={profile} />
      <Link to="/nutrition/analyse">Analyse</Link>
    </div>
  )
}

/**
 * Rendert die angehakten Ernaehrungsgraphen — und faellt vorher komplett aus,
 * wenn keiner angehakt ist: der Hook steckt in der Kindkomponente, ein leeres
 * Dashboard soll keine Abfrage ausloesen.
 */
function DashboardNutritionCharts({
  userId,
  auswahl,
  ziel,
  profile,
}: {
  userId: string
  auswahl: string[]
  ziel: number | null
  profile: Profile
}) {
  const bereichsIds = new Set(chartsFor('nutrition').map((chart) => chart.id))
  const ids = auswahl.filter((id) => bereichsIds.has(id))
  if (ids.length === 0) return null
  return <DashboardNutritionChartsData userId={userId} ids={ids} ziel={ziel} profile={profile} />
}

function DashboardNutritionChartsData({
  userId,
  ids,
  ziel,
  profile,
}: {
  userId: string
  ids: string[]
  ziel: number | null
  profile: Profile
}) {
  const { entries, sessions, loading, error } = useNutritionAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return (
    <NutritionChartList ids={ids} entries={entries} sessions={sessions} ziel={ziel} profile={profile} />
  )
}
```

`NutritionPage.test.tsx` braucht **keine** Anpassung: es benutzt bereits `findByRole` mit Timeout für den Dashboard-Graphen (der lag schon vor diesem Task hinter `React.lazy`) und mockt `useNutritionAnalysis`/`useChartSelection` unabhängig von der internen Struktur der Seite.

- [ ] **Step 7: Den Analyse-Seitentest an die lazy-Grenze anpassen**

`CaloriesPerDayChart` hing auf `NutritionAnalysisPage` bisher **nicht** hinter `React.lazy` (nur das Dashboard hatte einen eigenen `lazy()`-Aufruf) — das ändert sich mit `NutritionChartList`. Drei Fälle in `src/pages/NutritionAnalysisPage.test.tsx` ersetzen:

```tsx
  it('shows the area chart with the goal from the profile', async () => {
    zeige()
    // findByRole, not getByRole: NutritionChartList loads the chart behind
    // React.lazy, so the first render is the Suspense fallback.
    expect(
      await screen.findByRole('heading', { name: 'Kalorien pro Tag' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Ziel 1672 kcal', {}, { timeout: 5000 })).toBeInTheDocument()
  })
```

```tsx
  it('falls back to the calculated goal when none was typed', async () => {
    // The manual field is null for everyone who never typed a goal — the
    // normal state. The rest of the app reads effectiveCalorieGoal, which
    // falls back to Mifflin-St-Jeor; reading the raw column here would drop
    // the reference line for exactly those users.
    mockUseProfile.mockReturnValue({
      profile: { ...vollstaendigesProfil, taegliches_kalorienziel: null },
      loading: false,
      error: false,
      updateProfile: vi.fn(),
    })
    zeige()
    // 10*82.5 + 6.25*180 - 5*30 + 5 = 1805 kcal BMR, x 1.55 (moderat) = 2798 —
    // above both logged days, which is the normal case for someone cutting.
    expect(await screen.findByText('Ziel 2798 kcal', {}, { timeout: 5000 })).toBeInTheDocument()
  })
```

```tsx
  it('draws without a goal when the profile is incomplete', async () => {
    mockUseProfile.mockReturnValue({
      profile: {
        ...vollstaendigesProfil,
        taegliches_kalorienziel: null,
        geschlecht: null,
        groesse: null,
        alter: null,
      },
      loading: false,
      error: false,
      updateProfile: vi.fn(),
    })
    zeige()
    // Erst den Graphen abwarten, sonst waere "kein Ziel-Text" auch dann wahr,
    // wenn der Graph gleich noch hinter der Suspense-Huelle steckt.
    expect(
      await screen.findByRole('heading', { name: 'Kalorien pro Tag' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^Ziel /)).not.toBeInTheDocument()
  })
```

Die übrigen drei Fälle (Zeitraum-Umschalter, fehlgeschlagener Ladevorgang, Ladezustand) rendern den Graphen nicht oder prüfen ihn nicht — unverändert lassen.

- [ ] **Step 8: Run the full suite and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/components/charts/NutritionChartList.tsx src/components/charts/NutritionChartList.test.tsx src/pages/NutritionAnalysisPage.tsx src/pages/NutritionPage.tsx src/pages/NutritionAnalysisPage.test.tsx
git commit -m "refactor: Ernaehrungsgraphen aus einer Liste rendern, ein Hook je Seite"
```

---

## Task 3: E2 Makro-Verteilung heute

**Files:**
- Modify: `src/lib/entry-calories.ts`, `src/lib/entry-calories.test.ts`
- Modify: `src/components/DailySummary.tsx`
- Modify: `src/lib/analysis/nutrition-charts.ts`, `src/lib/analysis/nutrition-charts.test.ts`
- Modify: `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/lib/analysis/registry.test.ts`
- Modify: `src/components/charts/NutritionChartList.tsx`
- Create: `src/components/charts/MacroDistributionChart.tsx`, `src/components/charts/MacroDistributionChart.test.tsx`
- Test: `src/components/DailySummary.test.tsx` (muss unverändert grün bleiben)

**Interfaces:**
- Consumes: `AnalysisFoodEntry`, `localDay`, `ChartFrame`, `NutritionChartListProps` (Task 2)
- Produces:
  ```ts
  // src/lib/entry-calories.ts
  export type MakroEintrag = {
    menge: number
    products: { eiweiss: number | null; fett: number | null; kohlenhydrate: number | null } | null
  }
  export function entryMakro(entry: MakroEintrag, makro: 'eiweiss' | 'fett' | 'kohlenhydrate'): number
  export function sumMakro(entries: MakroEintrag[], makro: 'eiweiss' | 'fett' | 'kohlenhydrate'): number

  // src/lib/analysis/nutrition-charts.ts
  export type MakroTagEintrag = MakroEintrag & { zeitpunkt: string }
  export type MakroAnteil = { makro: string; anteil: number; gramm: number }
  export function makroAnteileHeute(entries: MakroTagEintrag[], heute: string): MakroAnteil[]

  // src/lib/analysis/registry.ts
  export const E2 = 'E2'
  ```

**Die Makro-Rechnung wird geteilt, nicht kopiert** (Entscheidung #2 oben): `DailySummary.tsx` hat sie schon richtig, nur privat. Sie wandert nach `entry-calories.ts`, `DailySummary` importiert sie von dort — sein eigener Test bleibt unverändert grün, weil sich das sichtbare Verhalten nicht ändert.

**E2 rechnet mit Energie-Anteilen, nicht mit Gramm-Anteilen** (Entscheidung #3): Fett trägt 9 kcal/g, Eiweiß und Kohlenhydrate je 4 — ein Gramm-Anteil würde einen fettreichen Tag als ausgewogen ausweisen. Die Gramm-Zahl bleibt als Beschriftung am Balken stehen, damit sie gegen `DailySummary` prüfbar bleibt.

**„Heute" ist ein expliziter Parameter, kein `Date.now()` in der Rechenfunktion.** Die Komponente füllt ihn mit `localDay(new Date().toISOString())` vor, wie `rangeStart` es mit seinem `jetzt`-Parameter vormacht — die reine Funktion bleibt damit deterministisch testbar.

- [ ] **Step 1: Write the failing tests for the shared macro helpers**

Ans Ende von `src/lib/entry-calories.test.ts`:

```ts
import { entryMakro, sumMakro } from './entry-calories'

describe('entryMakro', () => {
  it('scales the per-100-g value by the amount', () => {
    expect(
      entryMakro({ menge: 200, products: { eiweiss: 10, fett: 5, kohlenhydrate: 20 } }, 'eiweiss'),
    ).toBe(20)
  })

  it('counts a deleted product as zero', () => {
    expect(entryMakro({ menge: 200, products: null }, 'eiweiss')).toBe(0)
  })

  it('counts a missing macro value as zero', () => {
    expect(
      entryMakro({ menge: 200, products: { eiweiss: null, fett: 5, kohlenhydrate: 20 } }, 'eiweiss'),
    ).toBe(0)
  })
})

describe('sumMakro', () => {
  it('adds the entries up', () => {
    expect(
      sumMakro(
        [
          { menge: 200, products: { eiweiss: 10, fett: 5, kohlenhydrate: 20 } },
          { menge: 50, products: { eiweiss: 4, fett: 40, kohlenhydrate: 0 } },
        ],
        'eiweiss',
      ),
    ).toBe(22)
  })

  it('is zero for no entries', () => {
    expect(sumMakro([], 'eiweiss')).toBe(0)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- --run src/lib/entry-calories.test.ts`
Expected: FAIL — `entryMakro`/`sumMakro` sind kein Export von `./entry-calories`.

- [ ] **Step 3: Write the shared macro helpers**

Ans Ende von `src/lib/entry-calories.ts`:

```ts
/** Wie `KalorienEintrag`, aber fuer die drei Makros statt fuer Kalorien. */
export type MakroEintrag = {
  menge: number
  products: { eiweiss: number | null; fett: number | null; kohlenhydrate: number | null } | null
}

/** Nutritional values are stored per 100 g; an entry stores its amount in grams. */
export function entryMakro(entry: MakroEintrag, makro: 'eiweiss' | 'fett' | 'kohlenhydrate'): number {
  const value = entry.products?.[makro]
  if (value == null) return 0
  return (value * entry.menge) / 100
}

export function sumMakro(entries: MakroEintrag[], makro: 'eiweiss' | 'fett' | 'kohlenhydrate'): number {
  return entries.reduce((total, entry) => total + entryMakro(entry, makro), 0)
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- --run src/lib/entry-calories.test.ts`
Expected: PASS

- [ ] **Step 5: DailySummary auf die geteilte Rechnung umstellen**

In `src/components/DailySummary.tsx` die private Funktion

```ts
function sumMakro(entries: FoodEntry[], makro: 'eiweiss' | 'fett' | 'kohlenhydrate'): number {
  return entries.reduce((total, entry) => {
    const value = entry.products?.[makro]
    if (value == null) return total
    return total + (value * entry.menge) / 100
  }, 0)
}
```

**löschen** und die erste Zeile ersetzen durch:

```ts
import { sumKalorien, sumMakro } from '../lib/entry-calories'
```

Run: `npm test -- --run src/components/DailySummary.test.tsx`
Expected: PASS, unverändert — es ist ein reiner Umzug.

- [ ] **Step 6: Write the failing test for the compute function**

Ans Ende von `src/lib/analysis/nutrition-charts.test.ts`:

```ts
import { makroAnteileHeute } from './nutrition-charts'

describe('makroAnteileHeute', () => {
  it('splits by energy share, not by gram share', () => {
    // 20g protein = 80 kcal, 20g fat = 180 kcal, 20g carbs = 80 kcal (total 340 kcal).
    // By gram all three would tie at 33%; fat carries more than twice the energy
    // per gram (9 vs 4 kcal/g), so its energy share must come out far higher.
    const anteile = makroAnteileHeute(
      [{ zeitpunkt: um(24, 8), menge: 100, products: { eiweiss: 20, fett: 20, kohlenhydrate: 20 } }],
      '2026-08-24',
    )
    expect(anteile).toEqual([
      { makro: 'Eiweiß', anteil: 24, gramm: 20 },
      { makro: 'Fett', anteil: 53, gramm: 20 },
      { makro: 'Kohlenhydrate', anteil: 24, gramm: 20 },
    ])
  })

  it('keeps only entries from the given day', () => {
    const anteile = makroAnteileHeute(
      [
        { zeitpunkt: um(24, 8), menge: 100, products: { eiweiss: 20, fett: 0, kohlenhydrate: 0 } },
        { zeitpunkt: um(23, 8), menge: 100, products: { eiweiss: 100, fett: 0, kohlenhydrate: 0 } },
      ],
      '2026-08-24',
    )
    expect(anteile).toEqual([
      { makro: 'Eiweiß', anteil: 100, gramm: 20 },
      { makro: 'Fett', anteil: 0, gramm: 0 },
      { makro: 'Kohlenhydrate', anteil: 0, gramm: 0 },
    ])
  })

  it('returns nothing without any macros today', () => {
    expect(makroAnteileHeute([], '2026-08-24')).toEqual([])
    expect(
      makroAnteileHeute(
        [{ zeitpunkt: um(24, 8), menge: 0, products: { eiweiss: 0, fett: 0, kohlenhydrate: 0 } }],
        '2026-08-24',
      ),
    ).toEqual([])
  })

  it('skips an entry whose product is gone', () => {
    expect(makroAnteileHeute([{ zeitpunkt: um(24, 8), menge: 100, products: null }], '2026-08-24')).toEqual(
      [],
    )
  })
})
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npm test -- --run src/lib/analysis/nutrition-charts.test.ts`
Expected: FAIL — `makroAnteileHeute is not a function`.

- [ ] **Step 8: Write the implementation**

Am Anfang von `src/lib/analysis/nutrition-charts.ts` den Import erweitern:

```ts
import { entryMakro, sumMakro, type MakroEintrag } from '../entry-calories'
```

Ans Ende der Datei:

```ts
export type MakroTagEintrag = MakroEintrag & { zeitpunkt: string }
export type MakroAnteil = { makro: string; anteil: number; gramm: number }

const KCAL_JE_GRAMM = { eiweiss: 4, fett: 9, kohlenhydrate: 4 } as const
const MAKRO_LABEL = { eiweiss: 'Eiweiß', fett: 'Fett', kohlenhydrate: 'Kohlenhydrate' } as const

/**
 * E2: heutige Makro-Anteile an der Energie, nicht am Gramm-Gewicht.
 *
 * Fett traegt je Gramm mehr als doppelt so viel Energie wie Eiweiss oder
 * Kohlenhydrate (9 vs. 4 kcal/g) — ein Anteil nach Gramm wuerde einen fetten
 * Tag als ausgewogen ausweisen. Die Gramm-Zahl bleibt als Beschriftung stehen,
 * damit sie gegen DailySummary pruefbar ist.
 */
export function makroAnteileHeute(entries: MakroTagEintrag[], heute: string): MakroAnteil[] {
  const heutige = entries.filter((entry) => localDay(entry.zeitpunkt) === heute)
  const gramm = {
    eiweiss: sumMakro(heutige, 'eiweiss'),
    fett: sumMakro(heutige, 'fett'),
    kohlenhydrate: sumMakro(heutige, 'kohlenhydrate'),
  }
  const kcal = {
    eiweiss: gramm.eiweiss * KCAL_JE_GRAMM.eiweiss,
    fett: gramm.fett * KCAL_JE_GRAMM.fett,
    kohlenhydrate: gramm.kohlenhydrate * KCAL_JE_GRAMM.kohlenhydrate,
  }
  const gesamtKcal = kcal.eiweiss + kcal.fett + kcal.kohlenhydrate
  if (gesamtKcal === 0) return []
  return (['eiweiss', 'fett', 'kohlenhydrate'] as const).map((makro) => ({
    makro: MAKRO_LABEL[makro],
    anteil: Math.round((kcal[makro] / gesamtKcal) * 100),
    gramm: Math.round(gramm[makro]),
  }))
}
```

`entryMakro` wird hier nicht direkt aufgerufen (nur importiert, damit `sumMakro` verfügbar ist) — der Import steht dennoch so, weil `entryMakro` in Task 4 (E3) aus derselben Datei gebraucht wird und der Import sonst zweimal einträfe.

- [ ] **Step 9: Run it to verify it passes**

Run: `npm test -- --run src/lib/analysis/nutrition-charts.test.ts`
Expected: PASS

- [ ] **Step 10: Write the failing chart test**

Create `src/components/charts/MacroDistributionChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MacroDistributionChart from './MacroDistributionChart'

const eintrag = (tag: number, eiweiss: number, fett: number, kohlenhydrate: number) => ({
  zeitpunkt: new Date(2026, 7, tag, 8, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien: 0, eiweiss, fett, kohlenhydrate },
})

describe('MacroDistributionChart', () => {
  it('draws one bar per macro, labelled with its gram amount', () => {
    const { container } = render(
      <MacroDistributionChart entries={[eintrag(24, 30, 20, 50)]} heute="2026-08-24" />,
    )
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(3)
    expect(screen.getByText('30 g')).toBeInTheDocument()
    expect(screen.getByText('20 g')).toBeInTheDocument()
    expect(screen.getByText('50 g')).toBeInTheDocument()
  })

  it('names every bar so the three macros are distinguishable', () => {
    render(<MacroDistributionChart entries={[eintrag(24, 30, 20, 50)]} heute="2026-08-24" />)
    expect(screen.getByText('Eiweiß')).toBeInTheDocument()
    expect(screen.getByText('Fett')).toBeInTheDocument()
    expect(screen.getByText('Kohlenhydrate')).toBeInTheDocument()
  })

  it('states the empty case without any logged macro today', () => {
    render(<MacroDistributionChart entries={[]} heute="2026-08-24" />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('ignores entries from other days', () => {
    render(<MacroDistributionChart entries={[eintrag(23, 30, 20, 50)]} heute="2026-08-24" />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 11: Run it to verify it fails**

Run: `npm test -- --run src/components/charts/MacroDistributionChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 12: Write the chart**

Create `src/components/charts/MacroDistributionChart.tsx`:

```tsx
import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { makroAnteileHeute } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import { MAKRO_VERTEILUNG_HEUTE_TITEL } from '../../lib/analysis/chart-titles'
import { localDay } from '../../lib/local-time'
import ChartFrame from './ChartFrame'

export const TITEL = MAKRO_VERTEILUNG_HEUTE_TITEL

export default function MacroDistributionChart({
  entries,
  heute = localDay(new Date().toISOString()),
  picker,
}: {
  entries: AnalysisFoodEntry[]
  /** Ueberschreibbar fuer Tests; im echten Betrieb immer der heutige Tag. */
  heute?: string
  picker?: ReactNode
}) {
  const anteile = makroAnteileHeute(entries, heute)

  return (
    <ChartFrame titel={TITEL} leer={anteile.length < 1} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={anteile}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="makro" />
          <YAxis unit="%" />
          <Tooltip formatter={(wert?: ValueType) => [`${wert}%`, 'Anteil']} />
          <Bar dataKey="anteil" fill="#8884d8">
            {/* Der Gramm-Wert, nicht der Energie-Anteil: die Balkenhoehe ist
                Energie, die Beschriftung bleibt in der vertrauten Einheit aus
                DailySummary. */}
            <LabelList dataKey="gramm" formatter={(value: number) => `${value} g`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 13: Run it to verify it passes**

Run: `npm test -- --run src/components/charts/MacroDistributionChart.test.tsx`
Expected: PASS

- [ ] **Step 14: Titel, Registry, Liste, Registry-Test**

In `src/lib/analysis/chart-titles.ts` ergänzen:

```ts
export const MAKRO_VERTEILUNG_HEUTE_TITEL = 'Makro-Verteilung heute'
```

In `src/lib/analysis/registry.ts` den Import erweitern (`MAKRO_VERTEILUNG_HEUTE_TITEL as MACRO_DISTRIBUTION_TODAY`), `export const E2 = 'E2'` hinter `E1` ergänzen und den Eintrag hinter E1 einfügen:

```ts
  { id: E2, bereich: 'nutrition', titel: MACRO_DISTRIBUTION_TODAY },
```

In `src/components/charts/NutritionChartList.tsx`: `E2` mit importieren, `const MacroDistributionChart = lazy(() => import('./MacroDistributionChart'))` ergänzen und den Fall einhängen:

```tsx
      case E2:
        return <MacroDistributionChart entries={entries} picker={picker} />
```

In `src/lib/analysis/registry.test.ts`: Import ergänzen (`import { TITEL as E2_TITEL } from '../../components/charts/MacroDistributionChart'`) und drei Erwartungen fortschreiben:

- `expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'E2', 'K1'])`
- `expect(CHARTS.find((chart) => chart.id === 'E2')?.titel).toBe(E2_TITEL)`
- `expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1', 'E2'])`

- [ ] **Step 15: Run the full suite and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/lib/entry-calories.ts src/lib/entry-calories.test.ts src/components/DailySummary.tsx src/lib/analysis src/components/charts/MacroDistributionChart.tsx src/components/charts/MacroDistributionChart.test.tsx src/components/charts/NutritionChartList.tsx
git commit -m "feat: E2 Makro-Verteilung heute"
```

---

## Task 4: E3 Makro-Verlauf

**Files:**
- Modify: `src/lib/analysis/nutrition-charts.ts`, `src/lib/analysis/nutrition-charts.test.ts`
- Modify: `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/lib/analysis/registry.test.ts`
- Modify: `src/components/charts/NutritionChartList.tsx`
- Create: `src/components/charts/MacroTrendChart.tsx`, `src/components/charts/MacroTrendChart.test.tsx`

**Interfaces:**
- Consumes: `MakroTagEintrag`, `entryMakro` (Task 3), `localDay`, `tagesLabel`, `ChartFrame`
- Produces:
  ```ts
  export type MakroTagPunkt = { tag: string; eiweiss: number; fett: number; kohlenhydrate: number }
  export function makroVerlauf(entries: MakroTagEintrag[]): MakroTagPunkt[]
  export const E3 = 'E3'
  ```

E3 zeigt dieselben drei Makros wie E2, aber die Gramm-Menge selbst über die Zeit statt ihren Energie-Anteil an einem einzelnen Tag — deshalb eine eigene Rechenfunktion, keine Wiederverwendung von `makroAnteileHeute`.

- [ ] **Step 1: Write the failing test**

Ans Ende von `src/lib/analysis/nutrition-charts.test.ts`:

```ts
import { makroVerlauf } from './nutrition-charts'

describe('makroVerlauf', () => {
  it('sums each macro per day, oldest first', () => {
    const punkte = makroVerlauf([
      { zeitpunkt: um(24, 8), menge: 200, products: { eiweiss: 10, fett: 5, kohlenhydrate: 20 } },
      { zeitpunkt: um(24, 19), menge: 50, products: { eiweiss: 4, fett: 40, kohlenhydrate: 0 } },
      { zeitpunkt: um(23, 12), menge: 100, products: { eiweiss: 8, fett: 2, kohlenhydrate: 30 } },
    ])
    expect(punkte).toEqual([
      { tag: '2026-08-23', eiweiss: 8, fett: 2, kohlenhydrate: 30 },
      { tag: '2026-08-24', eiweiss: 22, fett: 30, kohlenhydrate: 40 },
    ])
  })

  it('counts a missing macro as zero, not as a missing entry', () => {
    const punkte = makroVerlauf([
      { zeitpunkt: um(24, 8), menge: 100, products: { eiweiss: null, fett: 5, kohlenhydrate: 20 } },
    ])
    expect(punkte).toEqual([{ tag: '2026-08-24', eiweiss: 0, fett: 5, kohlenhydrate: 20 }])
  })

  it('returns nothing without entries', () => {
    expect(makroVerlauf([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- --run src/lib/analysis/nutrition-charts.test.ts`
Expected: FAIL — `makroVerlauf is not a function`.

- [ ] **Step 3: Write the implementation**

Ans Ende von `src/lib/analysis/nutrition-charts.ts`:

```ts
export type MakroTagPunkt = { tag: string; eiweiss: number; fett: number; kohlenhydrate: number }

/**
 * E3: dieselben drei Makros wie E2, aber die Gramm-Menge ueber die Zeit statt
 * ihr Energie-Anteil an einem einzelnen Tag.
 */
export function makroVerlauf(entries: MakroTagEintrag[]): MakroTagPunkt[] {
  const jeTag = new Map<string, { eiweiss: number; fett: number; kohlenhydrate: number }>()
  for (const entry of entries) {
    const tag = localDay(entry.zeitpunkt)
    const bisher = jeTag.get(tag) ?? { eiweiss: 0, fett: 0, kohlenhydrate: 0 }
    jeTag.set(tag, {
      eiweiss: bisher.eiweiss + entryMakro(entry, 'eiweiss'),
      fett: bisher.fett + entryMakro(entry, 'fett'),
      kohlenhydrate: bisher.kohlenhydrate + entryMakro(entry, 'kohlenhydrate'),
    })
  }
  return [...jeTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, werte]) => ({
      tag,
      eiweiss: Math.round(werte.eiweiss),
      fett: Math.round(werte.fett),
      kohlenhydrate: Math.round(werte.kohlenhydrate),
    }))
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- --run src/lib/analysis/nutrition-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing chart test**

Create `src/components/charts/MacroTrendChart.test.tsx`:

```tsx
import { describe, expect, it, screen } from 'vitest'
import { render } from '@testing-library/react'
import MacroTrendChart from './MacroTrendChart'

const eintrag = (tag: number, eiweiss: number, fett: number, kohlenhydrate: number) => ({
  zeitpunkt: new Date(2026, 7, tag, 12, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien: 0, eiweiss, fett, kohlenhydrate },
})

describe('MacroTrendChart', () => {
  it('draws one line per macro with a point per day', () => {
    const { container } = render(
      <MacroTrendChart entries={[eintrag(23, 100, 50, 200), eintrag(24, 120, 40, 180)]} />,
    )
    const kurven = container.querySelectorAll('.recharts-line-curve')
    expect(kurven).toHaveLength(3)
    for (const kurve of kurven) {
      expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
    }
  })

  it('names every line so the three macros are distinguishable', () => {
    render(<MacroTrendChart entries={[eintrag(23, 100, 50, 200), eintrag(24, 120, 40, 180)]} />)
    expect(screen.getByText('Eiweiß (g)')).toBeInTheDocument()
    expect(screen.getByText('Fett (g)')).toBeInTheDocument()
    expect(screen.getByText('Kohlenhydrate (g)')).toBeInTheDocument()
  })

  it('states the empty case with a single day', () => {
    render(<MacroTrendChart entries={[eintrag(24, 120, 40, 180)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

**Import-Hinweis:** `screen` kommt aus `@testing-library/react`, nicht aus `vitest` — der Import oben ist zur Übersicht zusammengefasst; beim Einfügen `import { describe, expect, it } from 'vitest'` und `import { render, screen } from '@testing-library/react'` als zwei Zeilen schreiben, wie in jeder anderen Chart-Testdatei dieses Projekts.

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test -- --run src/components/charts/MacroTrendChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the chart**

Create `src/components/charts/MacroTrendChart.tsx`:

```tsx
import type { ReactNode } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { makroVerlauf } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import { MAKRO_VERLAUF_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'

export const TITEL = MAKRO_VERLAUF_TITEL

export default function MacroTrendChart({
  entries,
  picker,
}: {
  entries: AnalysisFoodEntry[]
  picker?: ReactNode
}) {
  const punkte = makroVerlauf(entries).map((punkt) => ({ ...punkt, label: tagesLabel(punkt.tag) }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis unit=" g" />
          <Tooltip />
          <Line type="monotone" dataKey="eiweiss" name="Eiweiß (g)" stroke="#8884d8" dot={false} />
          <Line type="monotone" dataKey="fett" name="Fett (g)" stroke="#ff7300" dot={false} />
          <Line
            type="monotone"
            dataKey="kohlenhydrate"
            name="Kohlenhydrate (g)"
            stroke="#82ca9d"
            dot={false}
          />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npm test -- --run src/components/charts/MacroTrendChart.test.tsx`
Expected: PASS

- [ ] **Step 9: Titel, Registry, Liste, Registry-Test**

In `src/lib/analysis/chart-titles.ts` ergänzen:

```ts
export const MAKRO_VERLAUF_TITEL = 'Makro-Verlauf'
```

In `src/lib/analysis/registry.ts`: Import erweitern (`MAKRO_VERLAUF_TITEL as MACRO_TREND`), `export const E3 = 'E3'` hinter `E2` ergänzen, Eintrag hinter E2 einfügen:

```ts
  { id: E3, bereich: 'nutrition', titel: MACRO_TREND },
```

In `src/components/charts/NutritionChartList.tsx`: `E3` importieren, `const MacroTrendChart = lazy(() => import('./MacroTrendChart'))` ergänzen, Fall einhängen:

```tsx
      case E3:
        return <MacroTrendChart entries={entries} picker={picker} />
```

In `src/lib/analysis/registry.test.ts`: Import ergänzen (`import { TITEL as E3_TITEL } from '../../components/charts/MacroTrendChart'`), Erwartungen fortschreiben:

- `expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'E2', 'E3', 'K1'])`
- `expect(CHARTS.find((chart) => chart.id === 'E3')?.titel).toBe(E3_TITEL)`
- `expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1', 'E2', 'E3'])`

- [ ] **Step 10: Run the full suite and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/lib/analysis src/components/charts/MacroTrendChart.tsx src/components/charts/MacroTrendChart.test.tsx src/components/charts/NutritionChartList.tsx
git commit -m "feat: E3 Makro-Verlauf"
```

---

## Task 5: E4 Kalorien je Mahlzeiten-Abschnitt

**Files:**
- Modify: `src/lib/analysis/nutrition-charts.ts`, `src/lib/analysis/nutrition-charts.test.ts`
- Modify: `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/lib/analysis/registry.test.ts`
- Modify: `src/components/charts/NutritionChartList.tsx`
- Create: `src/components/charts/MealSectionCaloriesChart.tsx`, `src/components/charts/MealSectionCaloriesChart.test.tsx`

**Interfaces:**
- Consumes: `KalorienEintrag`, `entryKalorien` (bestehend), `visibleSections`, `MealSectionNames` (`src/lib/meal-sections.ts`), `ChartFrame`
- Produces:
  ```ts
  export type AbschnittPunkt = { name: string; kalorien: number }
  export function kalorienJeAbschnitt(
    entries: (KalorienEintrag & { mahlzeit: number | null })[],
    namen: MealSectionNames,
  ): AbschnittPunkt[]
  export const E4 = 'E4'
  ```

**Dieselbe Abschnitts-Logik wie die Eintragsliste.** `visibleSections` (aus `src/lib/meal-sections.ts`, Phase 2) entscheidet bereits, welche Abschnitte sichtbar sind: benannte Slots immer, ein besetzter aber unbenannter Slot als „Abschnitt N", unzugeordnete Einträge unter „Ohne Zuordnung". `kalorienJeAbschnitt` nutzt genau diese Funktion für die Namen, statt sie zweitzuschreiben, und summiert nur die Kalorien pro Slot dazu.

**Der Leerzustand ist ein Sonderfall gegenüber E1–E3, E5, E6.** Diese Funktion liefert immer einen Eintrag je sichtbarem Abschnitt — auch mit null Kalorien, wenn der Abschnitt benannt, aber leer ist. Ein Balkendiagramm mit vier Nullwerten sieht für Recharts nach vier Balken aus (es zeichnet nur keine Marke für sie), zählt aber nicht als „leer" nach der `punkte.length < 1`-Regel. Die Komponente prüft deshalb nicht die Länge, sondern ob irgendein Abschnitt Kalorien größer null trägt.

- [ ] **Step 1: Write the failing test**

Ans Ende von `src/lib/analysis/nutrition-charts.test.ts`:

```ts
import { kalorienJeAbschnitt } from './nutrition-charts'
import type { MealSectionNames } from '../meal-sections'

const namen: MealSectionNames = {
  mahlzeit_1_name: 'Frühstück',
  mahlzeit_2_name: 'Mittagessen',
  mahlzeit_3_name: 'Abendessen',
  mahlzeit_4_name: 'Snacks',
  mahlzeit_5_name: null,
  mahlzeit_6_name: null,
}

describe('kalorienJeAbschnitt', () => {
  it('sums calories per named section over the whole range', () => {
    const punkte = kalorienJeAbschnitt(
      [
        { menge: 200, products: { kalorien: 100 }, mahlzeit: 1 }, // 200 kcal, Fruehstueck
        { menge: 100, products: { kalorien: 100 }, mahlzeit: 1 }, // 100 kcal, Fruehstueck
        { menge: 100, products: { kalorien: 300 }, mahlzeit: 2 }, // 300 kcal, Mittagessen
      ],
      namen,
    )
    expect(punkte).toEqual([
      { name: 'Frühstück', kalorien: 300 },
      { name: 'Mittagessen', kalorien: 300 },
      { name: 'Abendessen', kalorien: 0 },
      { name: 'Snacks', kalorien: 0 },
    ])
  })

  it('keeps an occupied but unnamed slot as "Abschnitt N"', () => {
    const punkte = kalorienJeAbschnitt([{ menge: 100, products: { kalorien: 200 }, mahlzeit: 5 }], namen)
    expect(punkte.find((p) => p.name === 'Abschnitt 5')).toEqual({ name: 'Abschnitt 5', kalorien: 200 })
  })

  it('groups unassigned entries under "Ohne Zuordnung"', () => {
    const punkte = kalorienJeAbschnitt([{ menge: 100, products: { kalorien: 150 }, mahlzeit: null }], namen)
    expect(punkte.find((p) => p.name === 'Ohne Zuordnung')).toEqual({
      name: 'Ohne Zuordnung',
      kalorien: 150,
    })
  })

  it('returns the four named sections with zero calories when there are no entries', () => {
    expect(kalorienJeAbschnitt([], namen)).toEqual([
      { name: 'Frühstück', kalorien: 0 },
      { name: 'Mittagessen', kalorien: 0 },
      { name: 'Abendessen', kalorien: 0 },
      { name: 'Snacks', kalorien: 0 },
    ])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- --run src/lib/analysis/nutrition-charts.test.ts`
Expected: FAIL — `kalorienJeAbschnitt is not a function`.

- [ ] **Step 3: Write the implementation**

Am Anfang von `src/lib/analysis/nutrition-charts.ts` den Import erweitern:

```ts
import { entryKalorien, type KalorienEintrag } from '../entry-calories'
import { visibleSections, type MealSectionNames } from '../meal-sections'
```

Ans Ende der Datei:

```ts
export type AbschnittPunkt = { name: string; kalorien: number }

/**
 * E4: Kalorien je Mahlzeiten-Abschnitt ueber den ganzen Zeitraum.
 *
 * Nutzt dieselbe Abschnitts-Logik wie die Eintragsliste (`visibleSections`):
 * ein besetzter, aber unbenannter Slot bleibt als "Abschnitt N" sichtbar, ein
 * unzugeordneter Eintrag landet unter "Ohne Zuordnung" statt zu verschwinden.
 */
export function kalorienJeAbschnitt(
  entries: (KalorienEintrag & { mahlzeit: number | null })[],
  namen: MealSectionNames,
): AbschnittPunkt[] {
  return visibleSections(namen, entries).map((section) => ({
    name: section.name,
    kalorien: Math.round(
      entries
        .filter((entry) => entry.mahlzeit === section.slot)
        .reduce((summe, entry) => summe + entryKalorien(entry), 0),
    ),
  }))
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- --run src/lib/analysis/nutrition-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing chart test**

Create `src/components/charts/MealSectionCaloriesChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MealSectionCaloriesChart from './MealSectionCaloriesChart'
import type { MealSectionNames } from '../../lib/meal-sections'

const namen: MealSectionNames = {
  mahlzeit_1_name: 'Frühstück',
  mahlzeit_2_name: 'Mittagessen',
  mahlzeit_3_name: 'Abendessen',
  mahlzeit_4_name: 'Snacks',
  mahlzeit_5_name: null,
  mahlzeit_6_name: null,
}

const eintrag = (mahlzeit: number, kalorien: number) => ({
  zeitpunkt: new Date(2026, 7, 24, 8, 0).toISOString(),
  menge: 100,
  mahlzeit,
  products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
})

describe('MealSectionCaloriesChart', () => {
  it('draws one bar per section that actually has calories', () => {
    const { container } = render(
      <MealSectionCaloriesChart entries={[eintrag(1, 300), eintrag(2, 200)]} profile={namen} />,
    )
    // Vier benannte Abschnitte, aber nur zwei mit Kalorien groesser null:
    // Abendessen und Snacks blieben leer, und Recharts zeichnet fuer einen
    // Nullwert keine Marke.
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
  })

  it('states the empty case without a profile yet', () => {
    render(<MealSectionCaloriesChart entries={[eintrag(1, 300)]} profile={null} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('states the empty case without any calories in range', () => {
    render(<MealSectionCaloriesChart entries={[]} profile={namen} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test -- --run src/components/charts/MealSectionCaloriesChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the chart**

Create `src/components/charts/MealSectionCaloriesChart.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { kalorienJeAbschnitt } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import type { MealSectionNames } from '../../lib/meal-sections'
import { KALORIEN_JE_ABSCHNITT_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = KALORIEN_JE_ABSCHNITT_TITEL

export default function MealSectionCaloriesChart({
  entries,
  profile,
  picker,
}: {
  entries: AnalysisFoodEntry[]
  profile: MealSectionNames | null
  picker?: ReactNode
}) {
  const punkte = profile ? kalorienJeAbschnitt(entries, profile) : []
  // Nicht punkte.length: die Funktion liefert immer einen Eintrag je
  // sichtbarem Abschnitt, auch mit 0 kcal. "Leer" heisst hier "kein
  // Abschnitt hat ueberhaupt etwas geloggt", nicht "kein Abschnitt existiert".
  const hatDaten = punkte.some((punkt) => punkt.kalorien > 0)

  return (
    <ChartFrame titel={TITEL} leer={!hatDaten} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kcal`, 'Kalorien']} />
          <Bar dataKey="kalorien" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npm test -- --run src/components/charts/MealSectionCaloriesChart.test.tsx`
Expected: PASS

- [ ] **Step 9: Titel, Registry, Liste, Registry-Test**

In `src/lib/analysis/chart-titles.ts` ergänzen:

```ts
export const KALORIEN_JE_ABSCHNITT_TITEL = 'Kalorien je Mahlzeiten-Abschnitt'
```

In `src/lib/analysis/registry.ts`: Import erweitern (`KALORIEN_JE_ABSCHNITT_TITEL as MEAL_SECTION_CALORIES`), `export const E4 = 'E4'` hinter `E3` ergänzen, Eintrag hinter E3 einfügen:

```ts
  { id: E4, bereich: 'nutrition', titel: MEAL_SECTION_CALORIES },
```

In `src/components/charts/NutritionChartList.tsx`: `E4` importieren, `const MealSectionCaloriesChart = lazy(() => import('./MealSectionCaloriesChart'))` ergänzen, Fall einhängen und die bisherige `void profile`-Zeile **löschen** (jetzt gebraucht):

```tsx
      case E4:
        return <MealSectionCaloriesChart entries={entries} profile={profile} picker={picker} />
```

In `src/lib/analysis/registry.test.ts`: Import ergänzen (`import { TITEL as E4_TITEL } from '../../components/charts/MealSectionCaloriesChart'`), Erwartungen fortschreiben:

- `expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'E2', 'E3', 'E4', 'K1'])`
- `expect(CHARTS.find((chart) => chart.id === 'E4')?.titel).toBe(E4_TITEL)`
- `expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1', 'E2', 'E3', 'E4'])`

- [ ] **Step 10: Run the full suite and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/lib/analysis src/components/charts/MealSectionCaloriesChart.tsx src/components/charts/MealSectionCaloriesChart.test.tsx src/components/charts/NutritionChartList.tsx
git commit -m "feat: E4 Kalorien je Mahlzeiten-Abschnitt"
```

---

## Task 6: E5 Wochenschnitt

**Files:**
- Create: `src/lib/analysis/wochen.ts`, `src/lib/analysis/wochen.test.ts`
- Modify: `src/lib/analysis/training-charts.ts` (importiert die Wochenhelfer statt einer eigenen Kopie)
- Modify: `src/lib/analysis/nutrition-charts.ts`, `src/lib/analysis/nutrition-charts.test.ts`
- Modify: `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/lib/analysis/registry.test.ts`
- Modify: `src/components/charts/NutritionChartList.tsx`
- Create: `src/components/charts/WeeklyAverageChart.tsx`, `src/components/charts/WeeklyAverageChart.test.tsx`

**Interfaces:**
- Consumes: `kalorienJeTag` (bestehend), `ChartFrame`
- Produces:
  ```ts
  // src/lib/analysis/wochen.ts
  export function wochenStart(iso: string): string
  export function wochenLabel(montag: string): string

  // src/lib/analysis/nutrition-charts.ts
  export type WochenSchnittPunkt = { woche: string; schnitt: number }
  export function wochenschnitt(
    entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[],
  ): WochenSchnittPunkt[]
  export const E5 = 'E5'
  ```

**Vorab-Aufräumen, das dieser Task mit erledigt:** `wochenStart`/`wochenLabel` stehen bisher privat (nicht exportiert) in `training-charts.ts` — nur dort gebraucht von T1. E5 braucht dieselbe Wochenrechnung. Statt einer zweiten Kopie ziehen sie nach `src/lib/analysis/wochen.ts` um, `training-charts.ts` importiert sie von dort. Reiner Umzug: `training-charts.test.ts` bleibt unverändert grün, das ist der Regressionsnachweis.

**„Gemittelt über Tage mit Einträgen, nicht über sieben"** (Spec): `wochenschnitt` baut auf `kalorienJeTag` auf, das bereits nur Tage mit Einträgen liefert — eine Woche mit zwei getrackten Tagen teilt ihre Summe durch zwei, nicht durch sieben. Sonst würde eine kaum getrackte Woche wie eine strenge Diätwoche aussehen.

- [ ] **Step 1: Write the failing test for the extracted helpers**

Create `src/lib/analysis/wochen.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { wochenStart, wochenLabel } from './wochen'

describe('wochenStart', () => {
  it('returns the Monday of the week', () => {
    expect(wochenStart(new Date(2026, 7, 19, 10, 0).toISOString())).toBe('2026-08-17')
  })

  it('keeps Sunday in the week that started the Monday before', () => {
    expect(wochenStart(new Date(2026, 7, 23, 10, 0).toISOString())).toBe('2026-08-17')
  })
})

describe('wochenLabel', () => {
  it('names the ISO week of a Monday', () => {
    expect(wochenLabel('2026-08-17')).toBe('2026-KW34')
    expect(wochenLabel('2026-08-24')).toBe('2026-KW35')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- --run src/lib/analysis/wochen.test.ts`
Expected: FAIL — Modul `./wochen` existiert nicht.

- [ ] **Step 3: Move the helpers**

In `src/lib/analysis/training-charts.ts` die beiden Funktionen

```ts
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
```

**löschen** (samt ihrer Kommentare) und stattdessen oben importieren:

```ts
import { wochenStart, wochenLabel } from './wochen'
```

Create `src/lib/analysis/wochen.ts` mit genau diesem Inhalt, exportiert statt privat:

```ts
import { localDay } from '../local-time'

/** Monday of the week `iso` falls in, as a local `YYYY-MM-DD`. */
export function wochenStart(iso: string): string {
  const date = new Date(iso)
  // getDay() is 0 for Sunday; shifting by 6 keeps Sunday in the week that
  // started the previous Monday.
  const versatz = (date.getDay() + 6) % 7
  const montag = new Date(date.getFullYear(), date.getMonth(), date.getDate() - versatz)
  return localDay(montag.toISOString())
}

/** ISO week number of a Monday given as `YYYY-MM-DD`. */
export function wochenLabel(montag: string): string {
  const [jahr, monat, tag] = montag.split('-').map(Number)
  const donnerstag = new Date(jahr, monat - 1, tag + 3) // ISO weeks belong to their Thursday
  const jahresStart = new Date(donnerstag.getFullYear(), 0, 1)
  const tageSeitJahresStart = Math.round(
    (donnerstag.getTime() - jahresStart.getTime()) / 86_400_000,
  )
  const woche = Math.floor(tageSeitJahresStart / 7) + 1
  return `${donnerstag.getFullYear()}-KW${woche}`
}
```

- [ ] **Step 4: Run both test files to verify the move is clean**

Run: `npm test -- --run src/lib/analysis/wochen.test.ts src/lib/analysis/training-charts.test.ts`
Expected: PASS — beide grün, `training-charts.test.ts` unverändert (reiner Umzug, kein Verhaltensunterschied).

- [ ] **Step 5: Write the failing test for the compute function**

Ans Ende von `src/lib/analysis/nutrition-charts.test.ts`:

```ts
import { wochenschnitt } from './nutrition-charts'

const kalorienEintrag = (jahr: number, monat: number, tag: number, kalorien: number) => ({
  zeitpunkt: new Date(jahr, monat - 1, tag, 12, 0).toISOString(),
  menge: 100,
  products: { kalorien },
})

describe('wochenschnitt', () => {
  it('averages over days with entries, not over seven', () => {
    const punkte = wochenschnitt([
      kalorienEintrag(2026, 8, 17, 1000), // Mo, KW34
      kalorienEintrag(2026, 8, 19, 2000), // Mi, KW34
      kalorienEintrag(2026, 8, 24, 1800), // Mo, KW35
    ])
    expect(punkte).toEqual([
      { woche: '2026-KW34', schnitt: 1500 },
      { woche: '2026-KW35', schnitt: 1800 },
    ])
  })

  it('returns nothing without entries', () => {
    expect(wochenschnitt([])).toEqual([])
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test -- --run src/lib/analysis/nutrition-charts.test.ts`
Expected: FAIL — `wochenschnitt is not a function`.

- [ ] **Step 7: Write the implementation**

Am Anfang von `src/lib/analysis/nutrition-charts.ts` den Import erweitern:

```ts
import { wochenStart, wochenLabel } from './wochen'
```

Ans Ende der Datei:

```ts
export type WochenSchnittPunkt = { woche: string; schnitt: number }

/**
 * E5: mittlere Tageskalorien je Kalenderwoche, gemittelt ueber Tage **mit
 * Eintraegen** — nicht ueber alle sieben. `kalorienJeTag` liefert bereits nur
 * solche Tage; zwei getrackte Tage in einer Woche teilen die Summe durch
 * zwei, nicht durch sieben, sonst saehe eine kaum getrackte Woche wie eine
 * strenge Diaetwoche aus.
 */
export function wochenschnitt(
  entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[],
): WochenSchnittPunkt[] {
  const tage = kalorienJeTag(entries)
  const summeJeWoche = new Map<string, number>()
  const tageJeWoche = new Map<string, number>()
  for (const tag of tage) {
    const woche = wochenStart(`${tag.tag}T00:00:00`)
    summeJeWoche.set(woche, (summeJeWoche.get(woche) ?? 0) + tag.kalorien)
    tageJeWoche.set(woche, (tageJeWoche.get(woche) ?? 0) + 1)
  }
  return [...summeJeWoche.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([woche, summe]) => ({
      woche: wochenLabel(woche),
      schnitt: Math.round(summe / (tageJeWoche.get(woche) ?? 1)),
    }))
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npm test -- --run src/lib/analysis/nutrition-charts.test.ts`
Expected: PASS

- [ ] **Step 9: Write the failing chart test**

Create `src/components/charts/WeeklyAverageChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import WeeklyAverageChart from './WeeklyAverageChart'

const eintrag = (jahr: number, monat: number, tag: number, kalorien: number) => ({
  zeitpunkt: new Date(jahr, monat - 1, tag, 12, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
})

describe('WeeklyAverageChart', () => {
  it('draws one bar per week', () => {
    const { container } = render(
      <WeeklyAverageChart
        entries={[eintrag(2026, 8, 17, 1000), eintrag(2026, 8, 24, 1800)]}
      />,
    )
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
  })

  it('states the empty case without any entries', () => {
    render(<WeeklyAverageChart entries={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Run it to verify it fails**

Run: `npm test -- --run src/components/charts/WeeklyAverageChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 11: Write the chart**

Create `src/components/charts/WeeklyAverageChart.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { wochenschnitt } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import { WOCHENSCHNITT_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = WOCHENSCHNITT_TITEL

export default function WeeklyAverageChart({
  entries,
  picker,
}: {
  entries: AnalysisFoodEntry[]
  picker?: ReactNode
}) {
  const punkte = wochenschnitt(entries)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="woche" />
          <YAxis />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kcal`, 'Schnitt je Tag']} />
          <Bar dataKey="schnitt" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 12: Run it to verify it passes**

Run: `npm test -- --run src/components/charts/WeeklyAverageChart.test.tsx`
Expected: PASS

- [ ] **Step 13: Titel, Registry, Liste, Registry-Test**

In `src/lib/analysis/chart-titles.ts` ergänzen:

```ts
export const WOCHENSCHNITT_TITEL = 'Wochenschnitt'
```

In `src/lib/analysis/registry.ts`: Import erweitern (`WOCHENSCHNITT_TITEL as WEEKLY_AVERAGE`), `export const E5 = 'E5'` hinter `E4` ergänzen, Eintrag hinter E4 einfügen:

```ts
  { id: E5, bereich: 'nutrition', titel: WEEKLY_AVERAGE },
```

In `src/components/charts/NutritionChartList.tsx`: `E5` importieren, `const WeeklyAverageChart = lazy(() => import('./WeeklyAverageChart'))` ergänzen, Fall einhängen:

```tsx
      case E5:
        return <WeeklyAverageChart entries={entries} picker={picker} />
```

In `src/lib/analysis/registry.test.ts`: Import ergänzen (`import { TITEL as E5_TITEL } from '../../components/charts/WeeklyAverageChart'`), Erwartungen fortschreiben:

- `expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'E2', 'E3', 'E4', 'E5', 'K1'])`
- `expect(CHARTS.find((chart) => chart.id === 'E5')?.titel).toBe(E5_TITEL)`
- `expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5'])`

- [ ] **Step 14: Run the full suite and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/lib/analysis src/components/charts/WeeklyAverageChart.tsx src/components/charts/WeeklyAverageChart.test.tsx src/components/charts/NutritionChartList.tsx
git commit -m "feat: E5 Wochenschnitt, Wochenhelfer geteilt statt kopiert"
```

---

## Task 7: E6 Kalorienbilanz

**Files:**
- Modify: `src/lib/analysis/nutrition-charts.ts`, `src/lib/analysis/nutrition-charts.test.ts`
- Modify: `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/lib/analysis/registry.test.ts`
- Modify: `src/components/charts/NutritionChartList.tsx`
- Create: `src/components/charts/CalorieBalanceChart.tsx`, `src/components/charts/CalorieBalanceChart.test.tsx`

**Interfaces:**
- Consumes: `kalorienJeTag` (bestehend), `localDay`, `tagesLabel`, `AnalysisSessionKalorien` (Task 1), `ChartFrame`
- Produces:
  ```ts
  export type BilanzPunkt = { tag: string; bilanz: number }
  export function kalorienbilanz(
    entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[],
    sessions: { gestartet_am: string | null; gesamt_kalorien: number | null }[],
  ): BilanzPunkt[]
  export const E6 = 'E6'
  ```

E6 ist der einzige Ernährungsgraph, der über seinen Bereich hinausgreift (Spec, Abschnitt 3) — die Trainingskalorien holt `useNutritionAnalysis` bereits seit Task 1 mit (`sessions`). Dieser Task ist der erste, der sie tatsächlich konsumiert.

**Ein Tag mit Eintrag aber ohne Session zählt trotzdem** (Verbrauch dann 0), **ein Tag mit Session aber ohne Eintrag fällt weg** — dieselbe Regel wie bei `kalorienJeTag`: kein Eintrag heißt nicht erfasst, nicht "nichts gegessen".

- [ ] **Step 1: Write the failing test**

Ans Ende von `src/lib/analysis/nutrition-charts.test.ts`:

```ts
import { kalorienbilanz } from './nutrition-charts'

describe('kalorienbilanz', () => {
  it('subtracts the training burn of the same day from intake', () => {
    const punkte = kalorienbilanz(
      [{ zeitpunkt: um(24, 8), menge: 100, products: { kalorien: 2000 } }],
      [{ gestartet_am: um(24, 18), gesamt_kalorien: 300 }],
    )
    expect(punkte).toEqual([{ tag: '2026-08-24', bilanz: 1700 }])
  })

  it('counts a day with no session as zero burn, not as no day', () => {
    const punkte = kalorienbilanz(
      [{ zeitpunkt: um(24, 8), menge: 100, products: { kalorien: 2000 } }],
      [],
    )
    expect(punkte).toEqual([{ tag: '2026-08-24', bilanz: 2000 }])
  })

  it('drops a day with a session but no food entry', () => {
    // Same rule as kalorienJeTag: no entry means "not logged", not "ate nothing".
    const punkte = kalorienbilanz([], [{ gestartet_am: um(24, 18), gesamt_kalorien: 300 }])
    expect(punkte).toEqual([])
  })

  it('ignores an unfinished session (no gesamt_kalorien yet)', () => {
    const punkte = kalorienbilanz(
      [{ zeitpunkt: um(24, 8), menge: 100, products: { kalorien: 2000 } }],
      [{ gestartet_am: um(24, 18), gesamt_kalorien: null }],
    )
    expect(punkte).toEqual([{ tag: '2026-08-24', bilanz: 2000 }])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- --run src/lib/analysis/nutrition-charts.test.ts`
Expected: FAIL — `kalorienbilanz is not a function`.

- [ ] **Step 3: Write the implementation**

Ans Ende von `src/lib/analysis/nutrition-charts.ts`:

```ts
export type BilanzPunkt = { tag: string; bilanz: number }

/**
 * E6: Kalorienaufnahme minus Trainingsverbrauch je Tag.
 *
 * Ein Tag mit Eintraegen aber ohne Session zaehlt trotzdem: der Verbrauch ist
 * dann schlicht 0, nicht "kein Tag". Ein Tag mit Session aber ohne Eintrag
 * bleibt aussen vor — dieselbe Regel wie bei kalorienJeTag: kein Eintrag
 * heisst nicht erfasst, nicht "nichts gegessen".
 */
export function kalorienbilanz(
  entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[],
  sessions: { gestartet_am: string | null; gesamt_kalorien: number | null }[],
): BilanzPunkt[] {
  const verbrauchJeTag = new Map<string, number>()
  for (const session of sessions) {
    if (session.gestartet_am == null || session.gesamt_kalorien == null) continue
    const tag = localDay(session.gestartet_am)
    verbrauchJeTag.set(tag, (verbrauchJeTag.get(tag) ?? 0) + session.gesamt_kalorien)
  }
  return kalorienJeTag(entries).map((punkt) => ({
    tag: punkt.tag,
    bilanz: Math.round(punkt.kalorien - (verbrauchJeTag.get(punkt.tag) ?? 0)),
  }))
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- --run src/lib/analysis/nutrition-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing chart test**

Create `src/components/charts/CalorieBalanceChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CalorieBalanceChart from './CalorieBalanceChart'

const eintrag = (tag: number, kalorien: number) => ({
  zeitpunkt: new Date(2026, 7, tag, 8, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
})

const session = (tag: number, kalorien: number) => ({
  gestartet_am: new Date(2026, 7, tag, 18, 0).toISOString(),
  gesamt_kalorien: kalorien,
})

describe('CalorieBalanceChart', () => {
  it('draws a point per day with entries', () => {
    const { container } = render(
      <CalorieBalanceChart
        entries={[eintrag(23, 1800), eintrag(24, 2200)]}
        sessions={[session(24, 300)]}
      />,
    )
    const kurve = container.querySelector('.recharts-line-curve')!
    expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
  })

  it('states the empty case with a single day', () => {
    render(<CalorieBalanceChart entries={[eintrag(24, 2200)]} sessions={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test -- --run src/components/charts/CalorieBalanceChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the chart**

Create `src/components/charts/CalorieBalanceChart.tsx`:

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
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { kalorienbilanz } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry, AnalysisSessionKalorien } from '../../hooks/use-nutrition-analysis'
import { KALORIENBILANZ_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'

export const TITEL = KALORIENBILANZ_TITEL

export default function CalorieBalanceChart({
  entries,
  sessions,
  picker,
}: {
  entries: AnalysisFoodEntry[]
  sessions: AnalysisSessionKalorien[]
  picker?: ReactNode
}) {
  const punkte = kalorienbilanz(entries, sessions).map((punkt) => ({
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
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kcal`, 'Bilanz']} />
          <ReferenceLine y={0} stroke="#999" />
          <Line type="monotone" dataKey="bilanz" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npm test -- --run src/components/charts/CalorieBalanceChart.test.tsx`
Expected: PASS

- [ ] **Step 9: Titel, Registry, Liste, Registry-Test**

In `src/lib/analysis/chart-titles.ts` ergänzen:

```ts
export const KALORIENBILANZ_TITEL = 'Kalorienbilanz'
```

In `src/lib/analysis/registry.ts`: Import erweitern (`KALORIENBILANZ_TITEL as CALORIE_BALANCE`), `export const E6 = 'E6'` hinter `E5` ergänzen, Eintrag hinter E5 einfügen:

```ts
  { id: E6, bereich: 'nutrition', titel: CALORIE_BALANCE },
```

In `src/components/charts/NutritionChartList.tsx`: `E6` importieren, `const CalorieBalanceChart = lazy(() => import('./CalorieBalanceChart'))` ergänzen, Fall einhängen und die bisherige `void sessions`-Zeile **löschen** (jetzt gebraucht):

```tsx
      case E6:
        return <CalorieBalanceChart entries={entries} sessions={sessions} picker={picker} />
```

In `src/lib/analysis/registry.test.ts`: Import ergänzen (`import { TITEL as E6_TITEL } from '../../components/charts/CalorieBalanceChart'`), Erwartungen fortschreiben:

- `expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'K1'])`
- `expect(CHARTS.find((chart) => chart.id === 'E6')?.titel).toBe(E6_TITEL)`
- `expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6'])`

- [ ] **Step 10: Run the full suite and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/lib/analysis src/components/charts/CalorieBalanceChart.tsx src/components/charts/CalorieBalanceChart.test.tsx src/components/charts/NutritionChartList.tsx
git commit -m "feat: E6 Kalorienbilanz"
```

---

## Task 8: Abschluss — Seitentest, Doku, Bundle, Gesamtlauf

**Files:**
- Modify: `src/pages/NutritionAnalysisPage.test.tsx`
- Modify: `docs/domaenenmodell.md`
- Modify: `CLAUDE.md` (Abschnitt „Phase 5")

**Interfaces:**
- Consumes: alles Vorherige
- Produces: keine Codeschnittstelle

- [ ] **Step 1: Seitentest über die volle Analyse-Seite**

Ans Ende von `src/pages/NutritionAnalysisPage.test.tsx` — prüft, dass wirklich alle sechs Graphen der Registry gerendert werden und nicht nur die verdrahteten. `chartsFor` oben importieren (`import { chartsFor } from '../lib/analysis/registry'`). Der bestehende `mockUseNutritionAnalysis`-Rückgabewert aus `beforeEach` (zwei Einträge über zwei Tage, keine Sessions) reicht für E1–E3 und E5; für E4 braucht es benannte Abschnitte im Profil-Mock und für E6 mindestens zwei Tage, die schon vorhanden sind:

```tsx
it('renders every registered nutrition chart', async () => {
  // Der Fall, den die Registry verhindern soll: ein Graph ist angemeldet, aber
  // die Seite kennt ihn nicht — er waere im Picker sichtbar und nirgends sonst.
  mockUseProfile.mockReturnValue({
    profile: {
      ...vollstaendigesProfil,
      taegliches_kalorienziel: 1672,
      mahlzeit_1_name: 'Frühstück',
      mahlzeit_2_name: 'Mittagessen',
      mahlzeit_3_name: 'Abendessen',
      mahlzeit_4_name: 'Snacks',
      mahlzeit_5_name: null,
      mahlzeit_6_name: null,
    },
    loading: false,
    error: false,
    updateProfile: vi.fn(),
  })
  zeige()
  for (const chart of chartsFor('nutrition')) {
    expect(await screen.findByText(chart.titel, {}, { timeout: 5000 })).toBeInTheDocument()
  }
})
```

- [ ] **Step 2: Run it**

Run: `npm test -- --run src/pages/NutritionAnalysisPage.test.tsx`
Expected: PASS. Schlägt er fehl, fehlt ein `case` in `NutritionChartList` — genau der Fund, für den der Test da ist.

- [ ] **Step 3: Bundle messen**

Run: `npm run build`

Die Ausgabe gehört wörtlich in den Abschlussbericht: Größe des Start-Chunks und der ausgelagerten Chart-Chunks. Erwartung: der Start-Chunk wächst kaum, weil alle neuen Graphen hinter `React.lazy` in `NutritionChartList` liegen — Vergleichswert aus Plan 2a ist `984,53 kB (268,30 kB gzip)`. Wächst er deutlich, hat ein Import Recharts in den Start gezogen; dann ist die Ursache zu suchen, bevor der Task schließt (üblicher Verdächtiger: ein Titel oder Typ, der aus einer Chart-Komponente statt aus `chart-titles.ts` importiert wird). Die bekannte Überschreitung der Warnschwelle von 500 kB bleibt ein Befund für die Härtungsphase und hält diesen Task nicht auf.

- [ ] **Step 4: Domänenmodell nachziehen**

In `docs/domaenenmodell.md` unter „Fachliche Notizen" ergänzen:

- Die Ernährungsanalyse liest zwei Tabellen in einem Hook: `food_entries` mit eingebettetem `products(kalorien, eiweiss, fett, kohlenhydrate)` und, für E6, `workout_sessions(gestartet_am, gesamt_kalorien)`. Beide sind auf den Zeitraum begrenzt und seitenweise paginiert; `food_entries` und `workout_sessions` haben keine Beziehung, über die PostgREST sie verbinden könnte, deshalb sind es zwei Abfragen, kein Join.
- E2 rechnet Makro-Anteile über die Energie (4/9/4 kcal/g je Eiweiß/Kohlenhydrate/Fett), nicht über das Gramm-Gewicht — sonst sähe ein fettreicher Tag ausgeglichen aus, weil Fett je Gramm mehr als doppelt so viel Energie trägt wie die anderen beiden.
- E4 gruppiert nach derselben Abschnitts-Logik wie die Eintragsliste (`visibleSections`): ein besetzter, aber unbenannter Slot bleibt als „Abschnitt N" sichtbar, unzugeordnete Einträge laufen unter „Ohne Zuordnung".
- E5 mittelt über Tage **mit** Einträgen, nicht über alle sieben Tage einer Woche — sonst läse eine kaum getrackte Woche wie eine strenge Diätwoche.
- E6 lässt einen Tag mit Session aber ohne Ernährungseintrag aus (dieselbe Regel wie E1: kein Eintrag heißt nicht erfasst), zählt aber einen Tag mit Eintrag ohne Session mit Verbrauch 0.
- `seitenweiseLaden` liegt seit Plan 2b in `src/lib/analysis/paged-query.ts` (vorher nur in `use-training-analysis.ts`), die Wochenhilfsfunktionen `wochenStart`/`wochenLabel` in `src/lib/analysis/wochen.ts` (vorher privat in `training-charts.ts`) — beide jetzt von Training und Ernährung geteilt.

Danach nach `../fitness-app.wiki/Domain-Model.md` spiegeln. **Nur die Datei schreiben, nichts im Wiki-Repo committen oder pushen** — das ist ein eigenes Git-Repo und passiert nach dem Merge.

- [ ] **Step 5: Status in CLAUDE.md nachziehen**

Im Abschnitt „Phase 5" festhalten: Plan 2b umgesetzt, welche Ernährungsgraphen es jetzt gibt (E1–E6), dass `useNutritionAnalysis` neben den Einträgen auch die Trainingskalorien lädt (zwei Abfragen, beide paginiert), dass `NutritionChartList` der einzige Ort ist, an dem ein Ernährungsgraph eingebunden wird, dass `seitenweiseLaden` jetzt in `src/lib/analysis/paged-query.ts` und die Wochenfunktionen in `src/lib/analysis/wochen.ts` liegen (von Training und Ernährung geteilt), dass die Makro-Rechnung (`entryMakro`/`sumMakro`) jetzt in `src/lib/entry-calories.ts` liegt und von `DailySummary` und E2/E3 geteilt wird, und dass das Ernährungs-Dashboard mit mindestens einem angehakten Graphen **zwei** Abfragen feuert statt einer. Die Testzahl und die Bundle-Zahlen aus Step 3 mit aufnehmen. Den Satz „Plan 2b/2c noch zu schreiben" auf den neuen Stand bringen (Plan 2b umgesetzt, Plan 2c weiterhin offen beziehungsweise dessen eigenen Stand vermerken, falls der zwischenzeitlich ebenfalls läuft).

- [ ] **Step 6: Vollständige Prüfung**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
npm run build
```

Erwartet: Lint ohne Fehler und Warnungen, keine Typfehler, alle Tests grün, Build erfolgreich.

- [ ] **Step 7: Commit**

```bash
git add docs/domaenenmodell.md CLAUDE.md src/pages/NutritionAnalysisPage.test.tsx
git commit -m "docs: Domaenenmodell und Status fuer Plan 2b nachziehen"
```

---

## Manual Verification (nach dem Merge, gegen die echte Instanz)

Keine Migration in diesem Plan — geprüft wird gegen `npm run dev`, das an derselben Produktions-Supabase hängt.

**Vorbereitung.** Die synthetischen Zeilen aus der Plan-1-Verifikation (30 `food_entries` vom 18.–27.08. auf ein einziges Produkt) decken E1 und teilweise E5 ab, enthalten aber keine unterschiedlichen Mahlzeiten-Abschnitte und keine Trainingssessions im selben Zeitraum wie Ernährungseinträge. Für E2–E4 und E6 zusätzliche Einträge über `/nutrition/entries` mit unterschiedlichen Mahlzeiten-Zuordnungen und mindestens einer Trainingssession am selben Tag anlegen, danach **wieder löschen**.

1. `/nutrition/analyse` öffnen: **sechs** Graphen stehen untereinander — Kalorien pro Tag, Makro-Verteilung heute, Makro-Verlauf, Kalorien je Mahlzeiten-Abschnitt, Wochenschnitt, Kalorienbilanz — jeder mit Titel und Häkchen „Auf dem Dashboard zeigen". Zeitraum-Umschalter vorbelegt auf 90 Tage.
2. **E2 im Detail:** heutige Einträge mit bekannten Makros erfassen, die drei Balken gegen `DailySummary` auf `/nutrition` gegenrechnen — die Gramm-Beschriftung muss exakt übereinstimmen, der Anteil in Prozent weicht vom Gramm-Anteil ab, sobald Fett beteiligt ist.
3. **E4 im Detail:** Einträge in mindestens zwei benannten Abschnitten erfassen, dazu einen Eintrag ohne Zuordnung (über die alte „Ohne Zuordnung"-Gruppe, falls vorhanden, oder einen frischen unzugeordneten Eintrag). Alle angelegten Abschnitte erscheinen als eigener Balken, die Summe je Balken stimmt mit der Eintragsliste überein.
4. **E6 im Detail:** an einem Tag mit Ernährungseinträgen eine Trainingseinheit abschließen. Die Bilanz dieses Tages muss um genau die `gesamt_kalorien` der Session niedriger liegen als die reine Tagesaufnahme aus E1.
5. Zeitraum auf „30 Tage" und „alles" stellen: alle sechs Graphen reagieren, im Netzwerk-Log stehen weiterhin genau zwei Abfragen (`food_entries`, `workout_sessions`) mit angepasstem `gte`-Filter.
6. **Abfragezahl auf dem Dashboard.** Zwei Graphen anhaken (etwa E2 und E5), `/nutrition` öffnen: beide stehen dort, **ohne** Zeitraum-Umschalter. Netzwerkanalyse: **zwei** Tabellenabfragen (`food_entries`, `workout_sessions`), beide paginiert mit `.range()`. Auch mit nur einem Ernährungsgraphen angehakt sind es dieselben zwei — die Zahl hängt nicht davon ab, welcher Ernährungsgraph angehakt ist, weil der Hook immer beide Quellen holt (E6 braucht die Sessions). Im Dev-Modus erscheint jede Abfrage doppelt (React-StrictMode); kein Produktionsverhalten.
7. **Die harte Eigenschaft:** alle Ernährungs-Häkchen abwählen, `/nutrition` neu laden. Kein Graph, und **keine** Abfrage auf `food_entries` oder `workout_sessions` aus der Analyse. Die reguläre `food_entries`-Abfrage des Dashboards (`useFoodEntries`, für die Tagesübersicht) läuft weiter — sie gehört nicht zur Analyse.
8. Ein Häkchen abwählen, Seite voll neu laden: der Graph bleibt weg (die Auswahl liegt in `profiles.analyse_auswahl`). Wieder anhaken bringt ihn zurück.
9. Netzwerkanalyse auf `/login`: kein Recharts-Chunk. Danach `/nutrition/analyse` öffnen: die Chart-Chunks kommen mit 200. Konsole auf Fehler und Warnungen prüfen.
10. Testdaten danach vollständig löschen.

---

## Self-Review

**Spec-Abdeckung.** Der Umfang dieses Plans ist die Ernährungs-Tabelle in Spec 2. E2 „Makro-Verteilung heute, Eiweiß/Fett/Kohlenhydrate als Anteile" → Task 3 (`makroAnteileHeute` rechnet Energie-Anteile, nicht Gramm-Anteile, per Entscheidung #3). E3 „dieselben drei über die Zeit" → Task 4 (`makroVerlauf`, Gramm statt Prozent, weil es hier um die Menge selbst geht). E4 „Kalorien je Mahlzeiten-Abschnitt, Summe je Abschnitt über den Zeitraum" → Task 5 (`kalorienJeAbschnitt`, nutzt `visibleSections` für die Namen). E5 „Wochenschnitt, Kalorien je Kalenderwoche, gemittelt über Tage mit Einträgen" → Task 6 (`wochenschnitt`, baut auf `kalorienJeTag` auf, das schon nur Tage mit Einträgen liefert). E6 „Kalorienbilanz, Aufnahme minus Trainingsverbrauch je Tag" → Task 7 (`kalorienbilanz`, subtrahiert `gesamt_kalorien` der Sessions).

Aus Spec 3 („Datenfluss"): ein Hook je Bereich, der auch über den Bereich hinausgreifende Daten mitlädt → Task 1 (bereits umgesetzt) lädt die Trainingskalorien für E6 mit; „Rechnen getrennt von Zeichnen" → jede Rechnung liegt in `nutrition-charts.ts` beziehungsweise `entry-calories.ts`, jede Komponente bekommt nur Daten. Registry als einzige Wahrheit → jeder Chart-Task meldet sich dort an, Task 8 Step 1 prüft, dass Anmeldung und Rendern nicht auseinanderlaufen. **Bei der Registry-Vorbereitung (Task 2) gefunden:** die ursprüngliche Planfassung dieses Dokuments sah in ihrer File-Structure-Tabelle eine Extraktion von `wochenStart`/`wochenLabel` nach `src/lib/analysis/wochen.ts` vor, hatte dafür aber keinen Task — Ruling: die Extraktion gehört zu E5 (Task 6), dem einzigen neuen Graphen, der sie braucht, statt einen eigenen Mini-Task dafür zu eröffnen (Task Right-Sizing: Setup gehört zum Task, dessen Deliverable es braucht).

Aus Spec 4: Analyse-Seite mit allen Graphen des Bereichs, Häkchen am Graphen, Dashboard fest 90 Tage ohne Umschalter, Reihenfolge der Registry → Task 2. **Die Übungsauswahl aus Spec 4 gilt ausdrücklich nur T2–T5**; kein Ernährungsgraph braucht ein Analogon.

Aus Spec 5: Leerzustände über `ChartFrame` in jeder Komponente, Linien ab zwei Punkten (E3, E6), Balken ab einem (E2, E4, E5) — mit der dokumentierten Ausnahme E4, deren Leer-Check auf "irgendein Abschnitt hat Kalorien größer null" statt auf die Punktezahl prüft, weil die Funktion strukturell immer einen Punkt je benanntem Abschnitt liefert. Ladefehler gehören dem Bereich → unverändert aus Task 1. Lokale Tage → `localDay` in `makroAnteileHeute`, `makroVerlauf`, `wochenschnitt`, `kalorienbilanz`.

Aus Spec 6: die reinen Funktionen tragen die Testlast, mit Fixtures, bei denen eine naive Umsetzung anders herauskäme — Energie- statt Gramm-Anteil (E2 Test 1), fehlender Tag ohne Eintrag trotz Session (E6 Test 3), Wochenmittel über Tage-mit-Eintrag statt über sieben (E5 Test 1), unbenannter aber besetzter Abschnitt (E4 Test 2).

**Nicht in diesem Plan:** K1–K5 (Plan 2c) und alles unter `body-charts.ts` beziehungsweise `use-body-analysis.ts`.

**Platzhalter-Durchgang.** Kein „TBD", kein „analog zu Task N", kein „Fehlerbehandlung ergänzen". Jeder Code-Schritt trägt seinen Code; die drei Umbauten an bestehenden Dateien (`DailySummary.tsx` in Task 3, `training-charts.ts` in Task 6, `NutritionPage.tsx`/`NutritionAnalysisPage.tsx` in Task 2) nennen die zu löschenden Stellen wörtlich und den Test, der die Verschiebung absichert.

**Typkonsistenz.** `NutritionChartListProps` wird in Task 2 vollständig definiert (`ids`, `entries`, `sessions`, `ziel`, `profile`, `auswahl`) und danach nur noch befüllt, nie umbenannt: `sessions` bleibt bis Task 7 mit `void sessions` durchgereicht, `profile` bis Task 5 mit `void profile` — genau das Muster, das `BodyChartList` in Plan 2c mit `kalorien`/`fotos` vorgemacht hat. `MakroEintrag` entsteht in Task 3 (`entry-calories.ts`) und wird in Task 4 über `MakroTagEintrag = MakroEintrag & { zeitpunkt: string }` erweitert, nicht neu definiert. `KalorienEintrag` ist die bestehende Definition aus Phase 2 und wird in Task 5 unverändert wiederverwendet. `AnalysisSessionKalorien` entsteht in Task 1 und wird in Task 7 unter demselben Namen konsumiert. `wochenStart`/`wochenLabel` entstehen (als Umzug) in Task 6 und werden von `training-charts.ts` und `nutrition-charts.ts` gleichermaßen importiert, keine zweite Definition. Jede der fünf neuen `case`-Verzweigungen in `NutritionChartList` reicht genau die Props durch, die die jeweilige Komponente deklariert: E2 `entries`, E3 `entries`, E4 `entries`+`profile`, E5 `entries`, E6 `entries`+`sessions` — passend zu den `void`-Zeilen, die in Task 5 und Task 7 gezielt entfernt werden.

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

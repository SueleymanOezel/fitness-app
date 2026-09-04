# Phase 5, Plan 2c – Körpergraphen K2 bis K5

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Körperbereich bekommt seine restlichen vier Graphen (K2–K5), und Analyse-Seite wie Dashboard rendern die Körpergraphen über eine Liste aus der Registry statt K1 einzeln verdrahtet — mit genau einem Datenzugriff je Seite.

**Architecture:** Wie in Plan 1 und 2a: reine Rechenfunktionen unter `src/lib/analysis/`, ein zeitraum-bezogener Hook je Bereich, Graph-Komponenten ohne eigenen Datenzugriff. Neu ist, dass `useBodyAnalysis` über die Körperdaten hinaus zwei weitere Quellen mitlädt — die Tagessummen der Ernährung für K4 und die Fotozeilen samt signierten Links für K5 — und dass eine Liste (`BodyChartList`) die Graphen anhand ihrer IDs rendert: dieselbe Liste bedient Analyse-Seite (alle IDs des Bereichs, mit Häkchen) und Dashboard (nur die angehakten IDs, ohne Bedienelemente).

**Tech Stack:** React + Vite + TypeScript, Supabase, Recharts, Vitest + Testing Library. Keine neue Abhängigkeit.

**Spec:** `docs/superpowers/specs/2026-08-24-phase5-analysebereich-design.md`

**Vorgänger:** `docs/superpowers/plans/2026-08-24-phase5-plan1-fundament.md` (gemerged, PR #27) und `docs/superpowers/plans/2026-08-27-phase5-plan2a-training-graphen.md` (gemerged, PR #33, manuell verifiziert am 29.08.2026)

**Geschwisterplan:** Plan 2b (Ernährung, E2–E6) entsteht parallel. Er fasst dieselben Dateien an drei Stellen an — `registry.ts`, `chart-titles.ts` und `src/lib/analysis/registry.test.ts`. Das sind reine Anfüge-Konflikte; wer zweiter merged, löst sie in einer Minute. **Nichts unter `src/lib/analysis/nutrition-charts.ts`, `src/hooks/use-nutrition-analysis.ts` oder `src/pages/Nutrition*` verändern** — `kalorienJeTag` wird hier nur *importiert*, nie angepasst.

## Global Constraints

- **Keine Drittanbieter-Namen** aus Fitness/Ernährung in Code, Kommentaren, Commit-Messages oder Docs.
- **Keine neue Abhängigkeit.** Alles wird mit React, Recharts und der Standardbibliothek gebaut.
- Sprache im UI: Deutsch. Dateinamen kebab-case, Komponenten PascalCase.
- `supabase-js` wirft nicht — jeder Lesevorgang prüft `error` aus dem Ergebnis und meldet sichtbar. Rohe Datenbankmeldungen erscheinen nie im UI.
- Jeder neue oder geänderte Hook trägt den `requestId`-Guard gegen Antworten in falscher Reihenfolge.
- Tage sind **lokale** Tage, nie UTC (`localDay` aus `src/lib/local-time.ts`). Ein `date`-Wert aus der Datenbank (`YYYY-MM-DD`) wird als `` new Date(`${datum}T00:00:00`) `` gelesen, nie als `new Date(datum)` — letzteres ist UTC-Mitternacht und rutscht westlich von Greenwich auf den Vortag.
- Leerzustand: Linien ab **zwei** Punkten, Balken und Listen ab **einem**. Sonst der Satz aus `ChartFrame`, nie leere Achsen.
- Zeitraum-Vorgabe auf den Analyse-Seiten: **90 Tage**. Dashboards: **fest 90 Tage, ohne Umschalter**.
- **Ein Dashboard ohne angehakten Graphen feuert keine Analyseabfrage.** Diese Eigenschaft wurde am 27.08.2026 gegen Produktion verifiziert und darf nicht verloren gehen.
- Graph-Tests prüfen **gezeichnete Marken**, nie Achsentexte (Recharts überspringt Ticks je nach Layout, in jsdom anders als im Browser). Balken: Anzahl der Rechtecke (`.recharts-bar-rectangle`). Linien: `M`/`L`/`C`-Befehle im `d` der Kurve (`.recharts-line-curve`). Punktwolken: Anzahl der Symbole (`.recharts-scatter-symbol`). **Achtung:** `type="monotone"` liefert bei genau zwei Punkten `M…L…` und ab drei Punkten `M…C…C…` — die Zählung von `[ML]` ist nur bei exakt zwei Punkten eine Punktzählung. Fixtures deshalb auf zwei Punkte auslegen oder auf `[MLC]` zählen.
- **Recharts verwirft eine `ReferenceLine` außerhalb des Wertebereichs der Achse** — jede Nulllinie trägt `ifOverflow="extendDomain"`.
- Jedes `findBy*` hinter einer `React.lazy`-Grenze braucht `{ timeout: 5000 }`.
- Nach jedem Task: `npm run lint`, `npx tsc -b --noEmit`, `npm test -- --run` müssen grün sein.
- Commit-Messages auf Deutsch **ohne Umlaute**, im Stil der bestehenden Historie.

---

## Vorüberlegungen, die in den Tasks nicht mehr begründet werden

### Paginierung: ja, für alle drei Abfragen

Plan 2a hat als Critical gefunden, dass eine ungedeckelte Supabase-Abfrage bei `db-max-rows` (Vorgabe 1000) still abschneidet, und dass ein `order()` diesen Schnitt systematisch verzerrt. Die Frage stellt sich hier für drei Abfragen, und die Antwort ist dreimal ja, aber aus unterschiedlich starken Gründen:

- **`food_entries` (K4): zwingend.** Diese Tabelle ist strukturell **nicht** gedeckelt — wer fünf bis zehn Einträge am Tag erfasst, überschreitet 1000 Zeilen im Zeitraum `alles` nach wenigen Monaten. Mit `order('zeitpunkt', ascending)` behält der Schnitt die **ältesten** Tage; K4 verlöre stillschweigend genau die jüngsten Wochen, also die, wegen derer man hinsieht. Das ist derselbe Fehler wie in Plan 2a, nur schlimmer.
- **`body_metrics` und `body_photos`: strukturell schwach gedeckelt, aber nicht sicher genug.** Ein Eintrag je Tag (`unique (user_id, datum)`) heißt 1000 Zeilen nach etwa 2 Jahren und 9 Monaten — bei `alles` also erreichbar, nicht theoretisch. Fotos sind seltener, aber ungedeckelt (mehrere je Tag sind erlaubt).

Da die Seitenlogik nach dem Auslagern (Task 1) drei Zeilen je Aufrufstelle kostet, wird sie überall verwendet. „Wahrscheinlich reicht es" ist kein Argument gegen drei Zeilen, wenn der Fehlerfall stilles Datenverschwinden ist.

### Ein Hook lädt für alle Körpergraphen, auch wenn nur einer angeheftet ist

`useBodyAnalysis` holt ab Task 2 immer alle drei Quellen. Ein Dashboard mit nur K1 zahlt damit zwei Abfragen, die es nicht braucht. Die Alternative — der Hook bekommt die angehakten IDs und entscheidet daraus, was er lädt — hieße, dass der Hook weiß, welcher Graph welche Tabelle braucht; genau diese Kopplung will die Spec mit „ein Hook je Bereich" vermeiden, und sie bräche bei jedem neuen Graphen erneut auf. Bezahlt werden zwei zusätzliche `select`-Anfragen auf einem 90-Tage-Fenster; die harte Eigenschaft („**kein** angehakter Graph = **keine** Abfrage") bleibt unangetastet, weil der Hook weiterhin in einer Kindkomponente steckt, die nur bei mindestens einer angehakten Körper-ID gerendert wird.

### K3 ist eine Zeitreihe, keine einzelne Zahl

„kg pro Woche aus der Trendlinie" könnte eine Kennzahl sein („aktuell −0,4 kg/Woche"). Der Graph soll aber beantworten, ob sich der Trend gerade bewegt und ob er sich **verändert** — eine einzelne Zahl kann nicht zeigen, dass ein Defizit vor drei Wochen wirkte und seitdem einschläft. K3 ist deshalb eine Linie: je Messpunkt die Steigung der Trendlinie über die vorangegangene Woche, auf kg/Woche normiert, mit einer Nulllinie. Über der Null wird zugenommen, darunter abgenommen; das Vorzeichen ist die eigentliche Aussage.

### K4 ist eine Punktwolke, kein Verlauf

„Gewichtsänderung gegen mittlere Kalorienaufnahme je Woche" stellt zwei Größen gegeneinander, nicht gegen die Zeit. Auf einer Zeitachse wären das zwei Linien, deren Zusammenhang man raten muss; als Punktwolke (x = mittlere Tageskalorien der Woche, y = Gewichtsänderung dieser Woche in kg) liest man ihn direkt ab. Die Nulllinie auf der y-Achse trennt Zu- von Abnahme; wo sie die Punktwolke schneidet, liegt die ungefähre Erhaltungskalorienzahl.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `src/lib/analysis/paged-query.ts` | **neu:** `seitenweiseLaden`, ausgelagert aus `use-training-analysis.ts` — eine Seitenlogik für alle Analyse-Abfragen |
| `src/lib/analysis/woche.ts` | **neu:** `wochenStart`, `wochenLabel`, ausgelagert aus `training-charts.ts` — Kalenderwochen für T1 und K4 |
| `src/lib/body-photo-urls.ts` | **neu:** Bucketname, TTL und das gebündelte Signieren von Foto-Pfaden |
| `src/hooks/use-training-analysis.ts` | geändert: nutzt `seitenweiseLaden` aus dem neuen Modul statt der eigenen Kopie |
| `src/hooks/use-body-photos.ts` | geändert: nutzt `src/lib/body-photo-urls.ts` statt der eigenen Signierlogik |
| `src/hooks/use-body-analysis.ts` | erweitert: Körperwerte **und** Tageskalorien **und** Fotos samt signierten Links, alle paginiert |
| `src/lib/analysis/tages-label.ts` | erweitert: `datumsLabel` (`17.08.2026`) neben `tagesLabel` (`17.08.`) |
| `src/lib/analysis/body-charts.ts` | erweitert: alle Rechenfunktionen der Körpergraphen |
| `src/lib/analysis/chart-titles.ts` | erweitert: vier neue Titel |
| `src/lib/analysis/registry.ts` | erweitert: K2–K5 angemeldet |
| `src/components/charts/BodyChartList.tsx` | **neu:** rendert die Körpergraphen eines ID-Satzes, lazy, mit oder ohne Häkchen |
| `src/components/charts/BodyMeasurementsChart.tsx` | **neu:** K2 Umfänge im Verlauf |
| `src/components/charts/WeightChangeRateChart.tsx` | **neu:** K3 Änderungsrate |
| `src/components/charts/WeightVsCaloriesChart.tsx` | **neu:** K4 Gewicht über Kalorien |
| `src/components/charts/PhotoTimeline.tsx` | **neu:** K5 Fortschrittsfotos (Liste, ohne Recharts) |
| `src/components/charts/PersonalRecordsList.tsx` | geändert: `datumsLabel` importiert statt selbst definiert |
| `src/pages/BodyAnalysisPage.tsx` | rendert alle Körpergraphen über die Liste |
| `src/pages/BodyPage.tsx` | rendert die angehakten Körpergraphen über die Liste, ein Hook |
| `docs/domaenenmodell.md` | fachliche Notiz zur bereichsübergreifenden Körper-Abfrage |

---

## Task 1: Seitenlogik auslagern und die Tageskalorien in den Körper-Hook holen

**Files:**
- Create: `src/lib/analysis/paged-query.ts`
- Modify: `src/hooks/use-training-analysis.ts` (die lokale Kopie von `seitenweiseLaden` entfällt)
- Modify: `src/hooks/use-body-analysis.ts`
- Test: `src/hooks/use-body-analysis.test.ts` (Mock wird ersetzt, neue Fälle kommen dazu)
- Modify: `src/pages/BodyPage.test.tsx`, `src/pages/BodyAnalysisPage.test.tsx`, `src/App.test.tsx` (Hook-Mocks um das neue Feld ergänzen)

**Interfaces:**
- Consumes: `rangeStart`, `Zeitraum` aus `src/lib/analysis/zeitraum.ts`; `MEASUREMENT_FIELDS`, `BodyMetricRow` aus `src/lib/body-metrics.ts`; `kalorienJeTag`, `TagesPunkt` aus `src/lib/analysis/nutrition-charts.ts`
- Produces:
  ```ts
  // src/lib/analysis/paged-query.ts
  export const PAGE_SIZE: 500
  export const MAX_PAGES: 40
  export async function seitenweiseLaden<T>(
    seite: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
  ): Promise<{ rows: T[]; failed: boolean }>

  // src/hooks/use-body-analysis.ts
  // useBodyAnalysis(userId, zeitraum) -> { rows: BodyMetricRow[], kalorien: TagesPunkt[], loading, error }
  ```

K4 braucht die Tagessummen der Ernährung im selben Zeitraum (Spec 3, „Datenfluss"). Sie werden **hier** geladen, nicht in der Komponente: ein Graph mit eigenem Datenzugriff wäre eine zweite Abfrage neben der des Bereichs und würde beim nächsten Graphen zur dritten. Gerechnet wird mit `kalorienJeTag` aus `nutrition-charts.ts` — dieselbe Funktion, die E1 benutzt. Eine zweite Implementierung derselben Summe wäre eine zweite Stelle, an der „Nährwerte gelten je 100 g" stehen kann und irgendwann auseinanderläuft.

- [ ] **Step 1: Die Seitenlogik in ein eigenes Modul heben**

Create `src/lib/analysis/paged-query.ts`:

```ts
/**
 * Seitenweises Lesen fuer alle Analyse-Abfragen.
 *
 * PostgREST deckelt eine Antwort bei `db-max-rows` (Vorgabe 1000) und meldet das
 * nicht. Eine ungedeckelte Abfrage liefert dann eine plausibel aussehende, aber
 * abgeschnittene Liste — und weil jede unserer Abfragen ein `order()` traegt,
 * ist der Schnitt nicht zufaellig, sondern systematisch an einem Ende.
 *
 * Lag vorher als private Funktion in `use-training-analysis.ts`; sie wird ab
 * Plan 2c von drei weiteren Abfragen gebraucht.
 */
export const PAGE_SIZE = 500
/** Verhindert, dass ein falsch konfiguriertes db-max-rows die Schleife endlos macht. */
export const MAX_PAGES = 40

/** Seitenweise laden, bis eine kurze Seite kommt — sonst schneidet db-max-rows still ab. */
export async function seitenweiseLaden<T>(
  seite: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<{ rows: T[]; failed: boolean }> {
  const rows: T[] = []
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE
    const { data, error } = await seite(from, from + PAGE_SIZE - 1)
    // Eine fehlgeschlagene Seite muss gemeldet werden, nicht als vollstaendige
    // Liste durchgereicht.
    if (error) return { rows: [], failed: true }
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return { rows, failed: false }
}
```

In `src/hooks/use-training-analysis.ts` die Konstanten `PAGE_SIZE`, `MAX_PAGES` und die Funktion `seitenweiseLaden` **ersatzlos löschen** (Zeilen mit den Kommentaren „Mirrors `use-exercises.ts`…", „Stops a misconfigured…" und „Seitenweise laden, bis eine kurze Seite kommt…") und stattdessen oben importieren:

```ts
import { seitenweiseLaden } from '../lib/analysis/paged-query'
```

`ID_CHUNK_SIZE` und `inChunks` bleiben dort, wo sie sind — sie gehören zur Satz-Abfrage, nicht zur Seitenlogik.

- [ ] **Step 2: Die Trainingstests laufen lassen**

Run: `npm test -- --run src/hooks/use-training-analysis.test.ts`
Expected: PASS, unverändert. Der Umzug ist eine reine Verschiebung; schlägt hier etwas fehl, wurde beim Ausschneiden zu viel entfernt.

- [ ] **Step 3: Write the failing test**

`src/hooks/use-body-analysis.test.ts` **vollständig ersetzen**. Der bisherige Mock kennt nur einen Builder ohne `range` und ohne Tabellenunterscheidung; beides braucht die neue Fassung.

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useBodyAnalysis } from './use-body-analysis'

const gte = vi.fn()
const order = vi.fn()
const eq = vi.fn()
const range = vi.fn()
const select = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => ({ select: (columns: string) => select(table, columns) }) },
}))

type Ergebnis = { data: unknown; error: unknown }
let metrikErgebnis: Ergebnis
let essenErgebnis: Ergebnis

beforeEach(() => {
  vi.clearAllMocks()
  metrikErgebnis = { data: [], error: null }
  essenErgebnis = { data: [], error: null }
  select.mockImplementation((table: string) => {
    const antwort = () => (table === 'food_entries' ? essenErgebnis : metrikErgebnis)
    const builder = {
      eq: (...args: unknown[]) => {
        eq(table, ...args)
        return builder
      },
      gte: (...args: unknown[]) => {
        gte(table, ...args)
        return builder
      },
      order: (...args: unknown[]) => {
        order(table, ...args)
        return builder
      },
      range: (...args: unknown[]) => {
        range(table, ...args)
        return Promise.resolve(antwort())
      },
    }
    return builder
  })
})

describe('useBodyAnalysis', () => {
  it('loads the measurement columns of the range, oldest first', async () => {
    metrikErgebnis = { data: [{ id: 'a', datum: '2026-08-17', gewicht: 83.3 }], error: null }
    const { result } = renderHook(() => useBodyAnalysis('u1', 90))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rows).toHaveLength(1)
    expect(eq).toHaveBeenCalledWith('body_metrics', 'user_id', 'u1')
    expect(order).toHaveBeenCalledWith('body_metrics', 'datum', { ascending: true })
    const [, columns] = select.mock.calls[0]
    // K2 braucht jeden Umfang, deshalb die geteilte Feldliste statt einer von
    // Hand geschriebenen Teilmenge, die davon abdriften kann.
    expect(columns).toContain('bauchumfang')
    expect(columns).toContain('koerperfettanteil')
  })

  it('bounds both queries by the range', async () => {
    const { result } = renderHook(() => useBodyAnalysis('u1', 30))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(gte).toHaveBeenCalledWith('body_metrics', 'datum', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(gte).toHaveBeenCalledWith('food_entries', 'zeitpunkt', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('does not bound the queries for the whole history', async () => {
    const { result } = renderHook(() => useBodyAnalysis('u1', 'alles'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(gte).not.toHaveBeenCalled()
  })

  it('pages every query', async () => {
    // Ohne .range() schneidet PostgREST bei db-max-rows still ab, und das
    // aufsteigende order() macht daraus einen Verlust genau der juengsten Tage.
    const { result } = renderHook(() => useBodyAnalysis('u1', 'alles'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(range).toHaveBeenCalledWith('body_metrics', 0, 499)
    expect(range).toHaveBeenCalledWith('food_entries', 0, 499)
  })

  it('sums the calories of the range per local day', async () => {
    // Die Tagessumme ist das, was K4 braucht; die Einzeleintraege interessieren
    // den Koerperbereich nicht.
    essenErgebnis = {
      data: [
        { zeitpunkt: new Date(2026, 7, 17, 12, 0).toISOString(), menge: 200, products: { kalorien: 100 } },
        { zeitpunkt: new Date(2026, 7, 17, 19, 0).toISOString(), menge: 100, products: { kalorien: 50 } },
        { zeitpunkt: new Date(2026, 7, 18, 12, 0).toISOString(), menge: 100, products: { kalorien: 300 } },
      ],
      error: null,
    }
    const { result } = renderHook(() => useBodyAnalysis('u1', 90))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.kalorien).toEqual([
      { tag: '2026-08-17', kalorien: 250 },
      { tag: '2026-08-18', kalorien: 300 },
    ])
  })

  it('reports a failed measurement load', async () => {
    metrikErgebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useBodyAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.rows).toEqual([])
  })

  it('reports a failed calorie load like a failed measurement load', async () => {
    // Die Meldung gehoert dem Bereich (Spec 5). Ein halb geladener Bereich, der
    // sich vollstaendig gibt, ist schlimmer als eine sichtbare Fehlermeldung.
    essenErgebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useBodyAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.kalorien).toEqual([])
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- --run src/hooks/use-body-analysis.test.ts`
Expected: FAIL — `range` wird nie aufgerufen und `result.current.kalorien` ist `undefined`.

- [ ] **Step 5: Write the implementation**

`src/hooks/use-body-analysis.ts` vollständig ersetzen:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rangeStart, type Zeitraum } from '../lib/analysis/zeitraum'
import { seitenweiseLaden } from '../lib/analysis/paged-query'
import { kalorienJeTag, type TagesPunkt } from '../lib/analysis/nutrition-charts'
import { MEASUREMENT_FIELDS, type BodyMetricRow } from '../lib/body-metrics'

// Derived from the shared field list rather than written out: a measurement
// added later must not silently miss the charts.
const COLUMNS = `id, datum, ${MEASUREMENT_FIELDS.join(', ')}`

/**
 * K4 rechnet auf Tagessummen, nicht auf Eintraegen — deshalb genau die zwei
 * Spalten, die `kalorienJeTag` liest, und kein Makro mehr.
 */
const FOOD_COLUMNS = 'zeitpunkt, menge, products(kalorien)'

type RawFoodEntry = {
  zeitpunkt: string
  menge: number
  products: { kalorien: number } | null
}

/**
 * Ascending, unlike useBodyMetrics: a chart reads left to right through time.
 *
 * Der Hook greift ueber den Bereich hinaus: K4 („Gewicht ueber Kalorien")
 * braucht die Tagessummen der Ernaehrung im selben Zeitraum (Spec 3,
 * „Datenfluss"). Sie werden hier geholt und nicht im Graphen — ein Graph mit
 * eigenem Datenzugriff waere eine zweite Abfrage neben der des Bereichs.
 *
 * Beide Abfragen sind seitenweise paginiert: `food_entries` ist strukturell
 * ungedeckelt (mehrere Eintraege je Tag), und mit `order('zeitpunkt')` haette
 * db-max-rows genau die juengsten Tage abgeschnitten. `body_metrics` ist mit
 * einer Zeile je Tag zwar traege, erreicht 1000 Zeilen aber nach knapp drei
 * Jahren — bei `alles` also erreichbar.
 */
export function useBodyAnalysis(userId: string, zeitraum: Zeitraum) {
  const [rows, setRows] = useState<BodyMetricRow[]>([])
  const [kalorien, setKalorien] = useState<TagesPunkt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const start = rangeStart(zeitraum)

    const metrik = await seitenweiseLaden<BodyMetricRow>((from, to) => {
      let query = supabase.from('body_metrics').select(COLUMNS).eq('user_id', userId)
      if (start) query = query.gte('datum', start)
      return query
        .order('datum', { ascending: true })
        // id als Tiebreaker: ohne totale Ordnung kann eine Zeile an der
        // Seitengrenze doppelt oder gar nicht ankommen.
        .order('id', { ascending: true })
        .range(from, to)
    })
    if (current !== requestId.current) return

    const essen = await seitenweiseLaden<RawFoodEntry>((from, to) => {
      let query = supabase.from('food_entries').select(FOOD_COLUMNS).eq('user_id', userId)
      // `zeitpunkt` ist timestamptz und die Grenze ein Datum: Postgres liest sie
      // als Mitternacht dieses Tages, genau die gewuenschte Untergrenze.
      if (start) query = query.gte('zeitpunkt', start)
      return query
        .order('zeitpunkt', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    })
    if (current !== requestId.current) return

    setRows(metrik.failed ? [] : metrik.rows)
    setKalorien(essen.failed ? [] : kalorienJeTag(essen.rows))
    setError(metrik.failed || essen.failed)
    setLoading(false)
  }, [userId, zeitraum])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { rows, kalorien, loading, error }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --run src/hooks/use-body-analysis.test.ts`
Expected: PASS

- [ ] **Step 7: Die Hook-Mocks der Seitentests nachziehen**

Die Rückgabe des Hooks ist gewachsen; drei Testdateien mocken sie und geben `kalorien` noch nicht zurück. **Genau dieser Fehler hat in Plan 2a die CI rot gemacht** (`App.test.tsx` mockte `useTrainingAnalysis` ohne `sets`), deshalb steht er hier als eigener Schritt.

In `src/App.test.tsx`:

```ts
vi.mock('./hooks/use-body-analysis', () => ({
  useBodyAnalysis: () => ({ rows: [], kalorien: [], loading: false, error: false }),
}))
```

In `src/pages/BodyAnalysisPage.test.tsx` und `src/pages/BodyPage.test.tsx` bei **jedem** `mockUseBodyAnalysis.mockReturnValue({ … })` das Feld `kalorien: []` ergänzen (in `BodyAnalysisPage.test.tsx` sind das vier Stellen, in `BodyPage.test.tsx` eine).

- [ ] **Step 8: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/lib/analysis/paged-query.ts src/hooks/use-training-analysis.ts src/hooks/use-body-analysis.ts src/hooks/use-body-analysis.test.ts src/App.test.tsx src/pages/BodyAnalysisPage.test.tsx src/pages/BodyPage.test.tsx
git commit -m "feat: Koerperanalyse laedt die Tageskalorien des Zeitraums mit"
```

---

## Task 2: Fotos samt signierten Links in den Körper-Hook holen

**Files:**
- Create: `src/lib/body-photo-urls.ts`
- Modify: `src/hooks/use-body-photos.ts`
- Modify: `src/hooks/use-body-analysis.ts`
- Test: `src/hooks/use-body-analysis.test.ts` (neue Fälle ans Ende), `src/hooks/use-body-photos.test.ts` (muss unverändert grün bleiben)
- Modify: `src/pages/BodyPage.test.tsx`, `src/pages/BodyAnalysisPage.test.tsx`, `src/App.test.tsx` (Hook-Mocks um `fotos: []`)

**Interfaces:**
- Consumes: `seitenweiseLaden` (Task 1)
- Produces:
  ```ts
  // src/lib/body-photo-urls.ts
  export const BODY_PHOTO_BUCKET = 'body-photos'
  export const SIGNED_URL_TTL_SECONDS = 3600
  export async function signierteFotoLinks(pfade: string[]): Promise<Map<string, string>>

  // src/hooks/use-body-analysis.ts
  export type AnalysisPhoto = { id: string; datum: string; pfad: string; url: string | null }
  // useBodyAnalysis(userId, zeitraum)
  //   -> { rows: BodyMetricRow[], kalorien: TagesPunkt[], fotos: AnalysisPhoto[], loading, error }
  ```

K5 braucht die Fotozeilen samt signierten Links, und die Spec sagt ausdrücklich: „`useBodyAnalysis` nutzt dafür dieselbe Signierung wie `useBodyPhotos`".

**Entschieden: gemeinsamer Helfer statt gespiegeltem Muster.** Das Signieren ist nicht ein Aufruf, sondern vier Schritte — ein gebündelter `createSignedUrls`-Aufruf, das Aussortieren fehlgeschlagener Einträge, der Aufbau der Pfad-zu-Link-Map, der Umgang mit einem `path`, der `null` sein kann. Zweimal geschrieben driftet genau der Filter auseinander (`signedUrl !== null`), und die Folge wäre ein `undefined` als `src`, also ein kaputtes Bild ohne Fehlermeldung. Der Helfer liegt unter `src/lib/`, nicht unter `src/lib/analysis/`: er gehört zum Foto-Bucket, nicht zur Analyse. TTL und Bucketname wandern mit, damit es sie nur einmal gibt.

- [ ] **Step 1: Den Signier-Helfer anlegen**

Create `src/lib/body-photo-urls.ts`:

```ts
import { supabase } from './supabase'

export const BODY_PHOTO_BUCKET = 'body-photos'
/** One hour is plenty for a page view, and the link never reaches the database. */
export const SIGNED_URL_TTL_SECONDS = 3600

/**
 * Kurzlebige Links zu Foto-Pfaden, gebuendelt in einem Aufruf statt je Zeile.
 *
 * Zwei Hooks brauchen das: die Fotoseite und die Koerperanalyse (K5). Das
 * Aussortieren nicht signierter Eintraege ist der Grund fuer den gemeinsamen
 * Helfer — faellt es an einer Stelle weg, landet `undefined` als `src` im
 * `img`, und das Bild bleibt ohne jede Meldung leer.
 */
export async function signierteFotoLinks(pfade: string[]): Promise<Map<string, string>> {
  if (pfade.length === 0) return new Map()
  const { data } = await supabase.storage
    .from(BODY_PHOTO_BUCKET)
    .createSignedUrls(pfade, SIGNED_URL_TTL_SECONDS)
  return new Map(
    (data ?? [])
      .filter((item): item is typeof item & { signedUrl: string } => item.signedUrl !== null)
      .map((item) => [item.path ?? '', item.signedUrl]),
  )
}
```

- [ ] **Step 2: `use-body-photos.ts` auf den Helfer umstellen**

In `src/hooks/use-body-photos.ts` die Zeilen `const BUCKET = 'body-photos'` und den `SIGNED_URL_TTL_SECONDS`-Block samt Kommentar löschen und stattdessen importieren:

```ts
import { BODY_PHOTO_BUCKET, signierteFotoLinks } from '../lib/body-photo-urls'
```

Den Signier-Abschnitt in `reload` ersetzen:

```ts
    const stored = (data ?? []) as { id: string; datum: string; foto_url: string }[]
    // Signed in one call rather than per row: one request instead of N.
    const urls = await signierteFotoLinks(stored.map((row) => row.foto_url))
    if (current !== requestId.current) return
```

Alle verbliebenen Vorkommen von `BUCKET` in `uploadPhoto` und `deletePhoto` durch `BODY_PHOTO_BUCKET` ersetzen (drei Stellen: `upload`, das kompensierende `remove`, das `remove` beim Löschen).

- [ ] **Step 3: Die Fotoseiten-Tests laufen lassen**

Run: `npm test -- --run src/hooks/use-body-photos.test.ts`
Expected: PASS, unverändert. Der Test mockt `../lib/supabase` als Ganzes, und der Helfer geht durch denselben Mock — deshalb braucht er keine Anpassung. Schlägt er fehl, wurde eine `BUCKET`-Stelle übersehen.

- [ ] **Step 4: Write the failing test**

Ans Ende von `src/hooks/use-body-analysis.test.ts`. Zuerst den Supabase-Mock oben in der Datei um den Storage-Zweig erweitern — der bisherige Mock hat nur `from`:

```ts
const createSignedUrls = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({ select: (columns: string) => select(table, columns) }),
    storage: { from: () => ({ createSignedUrls }) },
  },
}))
```

Im `beforeEach` zwei Zeilen ergänzen (nach `essenErgebnis = { data: [], error: null }`):

```ts
  fotoErgebnis = { data: [], error: null }
  createSignedUrls.mockResolvedValue({ data: [], error: null })
```

und die Deklaration `let fotoErgebnis: Ergebnis` neben die anderen setzen. Im `select.mockImplementation` die Antwortwahl auf drei Tabellen erweitern:

```ts
    const antwort = () => {
      if (table === 'food_entries') return essenErgebnis
      if (table === 'body_photos') return fotoErgebnis
      return metrikErgebnis
    }
```

Dann die neuen Fälle:

```ts
describe('useBodyAnalysis photos', () => {
  const zeile = { id: 'p1', datum: '2026-08-24', foto_url: 'u1/abc.jpg' }

  it('loads the photos of the range and pairs each with a signed link', async () => {
    fotoErgebnis = { data: [zeile], error: null }
    createSignedUrls.mockResolvedValue({
      data: [{ path: 'u1/abc.jpg', signedUrl: 'https://signed.example/abc' }],
      error: null,
    })
    const { result } = renderHook(() => useBodyAnalysis('u1', 90))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.fotos).toEqual([
      { id: 'p1', datum: '2026-08-24', pfad: 'u1/abc.jpg', url: 'https://signed.example/abc' },
    ])
    // Ein Aufruf fuer alle Pfade, nicht einer je Zeile.
    expect(createSignedUrls).toHaveBeenCalledTimes(1)
    expect(createSignedUrls).toHaveBeenCalledWith(['u1/abc.jpg'], 3600)
  })

  it('does not sign anything when the range holds no photo', async () => {
    fotoErgebnis = { data: [], error: null }
    const { result } = renderHook(() => useBodyAnalysis('u1', 90))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(createSignedUrls).not.toHaveBeenCalled()
    expect(result.current.fotos).toEqual([])
  })

  it('keeps a photo whose link could not be signed', async () => {
    // Der Graph soll das Datum weiter zeigen und daneben sagen, dass das Bild
    // fehlt — nicht das Foto verschweigen.
    fotoErgebnis = { data: [zeile], error: null }
    createSignedUrls.mockResolvedValue({ data: [{ path: 'u1/abc.jpg', signedUrl: null }], error: null })
    const { result } = renderHook(() => useBodyAnalysis('u1', 90))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.fotos[0].url).toBeNull()
  })

  it('bounds the photo query by the range', async () => {
    const { result } = renderHook(() => useBodyAnalysis('u1', 30))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(gte).toHaveBeenCalledWith('body_photos', 'datum', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(range).toHaveBeenCalledWith('body_photos', 0, 499)
  })

  it('reports a failed photo load like a failed measurement load', async () => {
    fotoErgebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useBodyAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.fotos).toEqual([])
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- --run src/hooks/use-body-analysis.test.ts`
Expected: FAIL — `result.current.fotos` ist `undefined`.

- [ ] **Step 6: Write the implementation**

In `src/hooks/use-body-analysis.ts` ergänzen. Import und Typ oben:

```ts
import { signierteFotoLinks } from '../lib/body-photo-urls'

export type AnalysisPhoto = {
  id: string
  datum: string
  /** Objektpfad im Bucket. Die Spalte heisst historisch `foto_url`, gespeichert
   *  wird aber nie eine URL — sie wird bei Bedarf signiert. */
  pfad: string
  url: string | null
}

type RawPhoto = { id: string; datum: string; foto_url: string }

const PHOTO_COLUMNS = 'id, datum, foto_url'
```

Den Zustand ergänzen:

```ts
  const [fotos, setFotos] = useState<AnalysisPhoto[]>([])
```

In `reload`, nach dem `essen`-Block und vor den `set…`-Aufrufen:

```ts
    const fotoZeilen = await seitenweiseLaden<RawPhoto>((from, to) => {
      let query = supabase.from('body_photos').select(PHOTO_COLUMNS).eq('user_id', userId)
      if (start) query = query.gte('datum', start)
      return query
        .order('datum', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    })
    if (current !== requestId.current) return

    // Ein gebuendelter Signieraufruf fuer alle Pfade, wie auf der Fotoseite.
    const links = fotoZeilen.failed
      ? new Map<string, string>()
      : await signierteFotoLinks(fotoZeilen.rows.map((row) => row.foto_url))
    if (current !== requestId.current) return
```

und die Schreibaufrufe am Ende erweitern:

```ts
    setRows(metrik.failed ? [] : metrik.rows)
    setKalorien(essen.failed ? [] : kalorienJeTag(essen.rows))
    setFotos(
      fotoZeilen.failed
        ? []
        : fotoZeilen.rows.map((row) => ({
            id: row.id,
            datum: row.datum,
            pfad: row.foto_url,
            url: links.get(row.foto_url) ?? null,
          })),
    )
    setError(metrik.failed || essen.failed || fotoZeilen.failed)
    setLoading(false)
```

Die Rückgabe:

```ts
  return { rows, kalorien, fotos, loading, error }
```

Im Doc-Kommentar der Funktion den Absatz zu K5 ergänzen:

```
 * K5 („Fortschrittsfotos") braucht zusaetzlich die Fotozeilen samt signierten
 * Links; die Signierung ist dieselbe wie in `useBodyPhotos` (Spec 3), sie liegt
 * dafuer in `src/lib/body-photo-urls.ts`.
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- --run src/hooks/use-body-analysis.test.ts`
Expected: PASS

- [ ] **Step 8: Die Hook-Mocks der Seitentests erneut nachziehen**

In `src/App.test.tsx`:

```ts
vi.mock('./hooks/use-body-analysis', () => ({
  useBodyAnalysis: () => ({ rows: [], kalorien: [], fotos: [], loading: false, error: false }),
}))
```

In `src/pages/BodyAnalysisPage.test.tsx` und `src/pages/BodyPage.test.tsx` bei jedem `mockUseBodyAnalysis.mockReturnValue({ … })` zusätzlich `fotos: []` ergänzen.

- [ ] **Step 9: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/lib/body-photo-urls.ts src/hooks/use-body-photos.ts src/hooks/use-body-analysis.ts src/hooks/use-body-analysis.test.ts src/App.test.tsx src/pages/BodyAnalysisPage.test.tsx src/pages/BodyPage.test.tsx
git commit -m "feat: Koerperanalyse laedt die Fortschrittsfotos samt signierten Links"
```

---

## Task 3: Körpergraphen aus der Registry rendern

**Files:**
- Create: `src/components/charts/BodyChartList.tsx`
- Create: `src/components/charts/BodyChartList.test.tsx`
- Modify: `src/pages/BodyAnalysisPage.tsx`
- Modify: `src/pages/BodyPage.tsx`
- Test: `src/pages/BodyAnalysisPage.test.tsx`, `src/pages/BodyPage.test.tsx` (bestehende Fälle müssen grün bleiben)

**Interfaces:**
- Consumes: `useBodyAnalysis` mit `{ rows, kalorien, fotos, loading, error }` (Tasks 1–2), `AnalysisPhoto`, `TagesPunkt`, `BodyMetricRow`, `chartsFor`, `K1`, `useChartSelection`, `ChartPicker`
- Produces:
  ```ts
  export type BodyChartListProps = {
    ids: string[]
    rows: BodyMetricRow[]
    kalorien: TagesPunkt[]
    fotos: AnalysisPhoto[]
    /** Gesetzt auf der Analyse-Seite: zeigt die Haekchen. */
    auswahl?: ReturnType<typeof useChartSelection>
  }
  export default function BodyChartList(props: BodyChartListProps): JSX.Element
  ```

Der Körperbereich steht noch auf dem Muster vor Plan 2a: beide Seiten binden `WeightTrendChart` direkt ein, das Dashboard mit einem eigenen `lazy()`-Aufruf. Mit fünf Graphen wären das fünf Einbindungsstellen je Seite. Die Liste dreht es um, genau wie im Training: der Hook läuft einmal auf der Seite, die Liste bekommt die Daten und rendert die Graphen zu den IDs, die sie bekommt.

**`React.lazy` liegt ab hier nur noch in der Liste.** Das Training hat den seitenlokalen `lazy()`-Aufruf beim Umbau ersatzlos entfernt (`TrainingPage.tsx` importiert `TrainingChartList` normal, `TrainingChartList.tsx` hält alle acht `lazy()`-Aufrufe); der Körperbereich zieht nach. Die Liste selbst zieht kein Recharts in den Start-Chunk — sie importiert nur `ChartPicker` und die Registry.

**Die Eigenschaft „Dashboard ohne Häkchen fragt nichts ab" bleibt erhalten**, weil das Dashboard die Datenkomponente nur rendert, wenn mindestens eine Körper-ID angehakt ist.

- [ ] **Step 1: Write the failing test**

Create `src/components/charts/BodyChartList.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import BodyChartList from './BodyChartList'
import { K1 } from '../../lib/analysis/registry'

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

const rows = [zeile('a', '2026-08-17', 83.3), zeile('b', '2026-08-24', 82.5)]

const auswahl = {
  auswahl: [K1],
  istGewaehlt: (id: string) => id === K1,
  umschalten: vi.fn(),
  fehler: '',
}

describe('BodyChartList', () => {
  it('renders the charts of the given ids', async () => {
    render(<BodyChartList ids={[K1]} rows={rows} kalorien={[]} fotos={[]} />)
    // timeout: die Graphen haengen hinter React.lazy.
    expect(await screen.findByText('Gewichtsverlauf', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('renders no chart for an id it does not know', () => {
    // parseAuswahl verwirft unbekannte IDs bereits, aber die Liste darf an einer
    // durchgerutschten ID nicht abstuerzen.
    const { container } = render(
      <BodyChartList ids={['K99']} rows={rows} kalorien={[]} fotos={[]} />,
    )
    expect(container.querySelector('section')).toBeNull()
  })

  it('shows the checkbox only when a selection is passed', async () => {
    const { rerender } = render(<BodyChartList ids={[K1]} rows={rows} kalorien={[]} fotos={[]} />)
    await screen.findByText('Gewichtsverlauf', {}, { timeout: 5000 })
    expect(screen.queryByRole('checkbox')).toBeNull()

    rerender(<BodyChartList ids={[K1]} rows={rows} kalorien={[]} fotos={[]} auswahl={auswahl} />)
    expect(await screen.findByRole('checkbox', {}, { timeout: 5000 })).toBeChecked()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/BodyChartList.test.tsx`
Expected: FAIL — Modul `./BodyChartList` existiert nicht.

- [ ] **Step 3: Write the implementation**

Create `src/components/charts/BodyChartList.tsx`:

```tsx
import { lazy, Suspense, type ReactNode } from 'react'
import type { AnalysisPhoto } from '../../hooks/use-body-analysis'
import type { TagesPunkt } from '../../lib/analysis/nutrition-charts'
import type { BodyMetricRow } from '../../lib/body-metrics'
import ChartPicker, { type useChartSelection } from './ChartPicker'
import { K1 } from '../../lib/analysis/registry'

// Lazy an dieser einen Stelle: die Liste ist der einzige Ort, an dem ein
// Koerpergraph noch eingebunden wird — Dashboard wie Analyse-Seite gehen
// hierdurch. Recharts bleibt damit aus dem Start-Chunk.
const WeightTrendChart = lazy(() => import('./WeightTrendChart'))

export type BodyChartListProps = {
  ids: string[]
  rows: BodyMetricRow[]
  kalorien: TagesPunkt[]
  fotos: AnalysisPhoto[]
  /** Gesetzt auf der Analyse-Seite: zeigt die Haekchen. */
  auswahl?: ReturnType<typeof useChartSelection>
}

export default function BodyChartList({ ids, rows, kalorien, fotos, auswahl }: BodyChartListProps) {
  function graph(id: string): ReactNode {
    const picker = auswahl ? <ChartPicker id={id} auswahl={auswahl} /> : undefined
    switch (id) {
      case K1:
        return <WeightTrendChart rows={rows} picker={picker} />
      default:
        // Eine ID ohne Komponente ist kein Fehler, den der Nutzer sehen muss:
        // parseAuswahl haelt Unbekanntes schon fern, hier bleibt nur die Luecke.
        return null
    }
  }

  // `kalorien` und `fotos` werden ab Task 6 und 7 gebraucht; bis dahin reicht
  // die Liste sie nur durch.
  void kalorien
  void fotos

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

Run: `npm test -- --run src/components/charts/BodyChartList.test.tsx`
Expected: PASS

- [ ] **Step 5: Analyse-Seite auf die Liste umstellen**

`src/pages/BodyAnalysisPage.tsx` vollständig ersetzen:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useBodyAnalysis } from '../hooks/use-body-analysis'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import { useChartSelection } from '../components/charts/ChartPicker'
import BodyChartList from '../components/charts/BodyChartList'
import { chartsFor } from '../lib/analysis/registry'
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
  const { rows, kalorien, fotos, loading, error } = useBodyAnalysis(userId, zeitraum)
  const auswahl = useChartSelection(userId)
  // Reihenfolge ist die der Registry — kein Umsortieren, wie in der Spec.
  const ids = chartsFor('body').map((chart) => chart.id)

  return (
    <div>
      <h1>Analyse</h1>
      <ZeitraumSwitch wert={zeitraum} onChange={setZeitraum} />
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <p>Lädt…</p>
      ) : (
        <BodyChartList ids={ids} rows={rows} kalorien={kalorien} fotos={fotos} auswahl={auswahl} />
      )}
      <Link to="/body">Zurück zum Körperbereich</Link>
    </div>
  )
}
```

- [ ] **Step 6: Dashboard auf die Liste umstellen**

In `src/pages/BodyPage.tsx`:

Den `lazy`-Import samt seinem vierzeiligen Kommentar (`// Lazy at this use site too, …` und `const WeightTrendChart = lazy(…)`) **löschen** und `lazy, Suspense` aus dem React-Import entfernen — übrig bleibt `import { useState } from 'react'`. Die Importe von `K1` und `useBodyAnalysis` bleiben zunächst; `K1` entfällt (siehe unten), `useBodyAnalysis` wird weiter gebraucht. Neue Importe:

```tsx
import BodyChartList from '../components/charts/BodyChartList'
import { chartsFor } from '../lib/analysis/registry'
```

Die Zeile

```tsx
      {auswahl.istGewaehlt(K1) && <DashboardWeightTrend userId={userId} />}
```

ersetzen durch:

```tsx
      <DashboardBodyCharts userId={userId} auswahl={auswahl.auswahl} />
```

Die Komponente `DashboardWeightTrend` samt ihrem Doc-Kommentar durch diese beiden ersetzen:

```tsx
/**
 * Rendert die angehakten Koerpergraphen — und faellt vorher komplett aus, wenn
 * keiner angehakt ist: der Hook steckt in der Kindkomponente, ein leeres
 * Dashboard soll keine Abfrage ausloesen.
 */
function DashboardBodyCharts({ userId, auswahl }: { userId: string; auswahl: string[] }) {
  const bereichsIds = new Set(chartsFor('body').map((chart) => chart.id))
  const ids = auswahl.filter((id) => bereichsIds.has(id))
  if (ids.length === 0) return null
  return <DashboardBodyChartsData userId={userId} ids={ids} />
}

function DashboardBodyChartsData({ userId, ids }: { userId: string; ids: string[] }) {
  const { rows, kalorien, fotos, loading, error } = useBodyAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return <BodyChartList ids={ids} rows={rows} kalorien={kalorien} fotos={fotos} />
}
```

Der Import von `K1` in `BodyPage.tsx` entfällt, sofern er sonst nirgends benutzt wird — der Lint-Lauf zeigt es.

- [ ] **Step 7: Den Seitentest an die lazy-Grenze anpassen**

In `src/pages/BodyAnalysisPage.test.tsx` steht der erste Fall noch auf `getByRole`. `WeightTrendChart` hängt jetzt hinter `React.lazy`, also ist der erste Render die Suspense-Hülle. Den Fall ersetzen:

```tsx
  it('shows the area chart with its picker', async () => {
    zeige()
    // findByRole, not getByRole: BodyChartList loads the chart behind
    // React.lazy, so the first render is the Suspense fallback.
    expect(
      await screen.findByRole('heading', { name: 'Gewichtsverlauf' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('picker')).toBeInTheDocument()
  })
```

`src/pages/BodyPage.test.tsx` benutzt bereits `findByRole` mit Timeout und braucht keine Anpassung.

- [ ] **Step 8: Run the full suite**

Run: `npm test -- --run`
Expected: PASS. Zeigt ein bestehender Fall auf die entfernte Komponente `DashboardWeightTrend`, wird er auf die Liste umgeschrieben, nicht gelöscht.

- [ ] **Step 9: Commit**

```bash
npm run lint
npx tsc -b --noEmit
git add src/components/charts/BodyChartList.tsx src/components/charts/BodyChartList.test.tsx src/pages/BodyAnalysisPage.tsx src/pages/BodyPage.tsx src/pages/BodyAnalysisPage.test.tsx src/pages/BodyPage.test.tsx
git commit -m "refactor: Koerpergraphen aus einer Liste rendern, ein Hook je Seite"
```

---

## Task 4: K2 Umfänge im Verlauf

**Files:**
- Modify: `src/lib/analysis/body-charts.ts`, `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/components/charts/BodyChartList.tsx`
- Create: `src/components/charts/BodyMeasurementsChart.tsx`, `src/components/charts/BodyMeasurementsChart.test.tsx`
- Test: `src/lib/analysis/body-charts.test.ts`, `src/lib/analysis/registry.test.ts`

**Interfaces:**
- Consumes: `MEASUREMENT_FIELDS`, `FIELD_LABELS`, `MeasurementField`, `BodyMetricRow` aus `src/lib/body-metrics.ts`; `tagesLabel`; `ChartFrame`
- Produces:
  ```ts
  export type UmfangFeld = Extract<MeasurementField, `${string}umfang`>
  export const UMFANG_FIELDS: UmfangFeld[]
  export type UmfangZeile = { datum: string } & Record<UmfangFeld, number | null>
  export type UmfangPunkt = UmfangZeile
  export function umfaengeVerlauf(rows: UmfangZeile[]): UmfangPunkt[]
  export const UMFAENGE_TITEL = 'Umfänge im Verlauf'
  export const K2 = 'K2'
  ```

Das Gewicht allein verschweigt die Umverteilung: wer den Bauchumfang verliert und am Arm zunimmt, sieht auf der Waage nichts. Fünf Linien in einem Koordinatensystem, weil alle fünf in Zentimetern und in derselben Größenordnung liegen — getrennte Graphen wären fünfmal dieselbe Achse.

**Die Feldliste wird abgeleitet, nicht abgeschrieben:** `UMFANG_FIELDS` filtert `MEASUREMENT_FIELDS`. Ein später ergänzter Umfang landet dadurch automatisch im Graphen; eine von Hand gepflegte zweite Liste würde ihn stillschweigend auslassen. `koerperfettanteil` und `gewicht` fallen durch den Filter — sie sind keine Umfänge und hätten auf einer Zentimeter-Achse nichts zu suchen.

- [ ] **Step 1: Write the failing test**

Ans Ende von `src/lib/analysis/body-charts.test.ts`:

```ts
import { UMFANG_FIELDS, umfaengeVerlauf } from './body-charts'

const umfaenge = (bauch: number | null, rest: number | null = bauch) => ({
  bauchumfang: bauch,
  beinumfang: rest,
  armumfang: rest,
  ruckenumfang: rest,
  brustumfang: rest,
})

describe('UMFANG_FIELDS', () => {
  it('holds exactly the five circumferences', () => {
    // Abgeleitet aus MEASUREMENT_FIELDS: Gewicht und Koerperfettanteil sind
    // keine Umfaenge und gehoeren nicht auf eine Zentimeter-Achse.
    expect(UMFANG_FIELDS).toEqual([
      'bauchumfang',
      'beinumfang',
      'armumfang',
      'ruckenumfang',
      'brustumfang',
    ])
  })
})

describe('umfaengeVerlauf', () => {
  it('keeps one point per day, oldest first', () => {
    expect(
      umfaengeVerlauf([
        { datum: '2026-08-24', ...umfaenge(90) },
        { datum: '2026-08-17', ...umfaenge(92) },
      ]),
    ).toEqual([
      { datum: '2026-08-17', ...umfaenge(92) },
      { datum: '2026-08-24', ...umfaenge(90) },
    ])
  })

  it('drops a day that measured no circumference at all', () => {
    // Ein Tag, an dem nur gewogen wurde, ist kein Punkt auf einer Umfangslinie.
    expect(
      umfaengeVerlauf([
        { datum: '2026-08-17', ...umfaenge(92) },
        { datum: '2026-08-20', ...umfaenge(null) },
        { datum: '2026-08-24', ...umfaenge(90) },
      ]).map((punkt) => punkt.datum),
    ).toEqual(['2026-08-17', '2026-08-24'])
  })

  it('keeps a day that measured only one circumference', () => {
    // Die Luecken der anderen vier bleiben null; die Linie ueberbrueckt sie im
    // Graphen (connectNulls), statt den ganzen Tag zu verwerfen.
    const punkte = umfaengeVerlauf([{ datum: '2026-08-17', ...umfaenge(92, null) }])
    expect(punkte).toHaveLength(1)
    expect(punkte[0].bauchumfang).toBe(92)
    expect(punkte[0].armumfang).toBeNull()
  })

  it('returns nothing without rows', () => {
    expect(umfaengeVerlauf([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/body-charts.test.ts`
Expected: FAIL — `umfaengeVerlauf is not a function`.

- [ ] **Step 3: Write the implementation**

Ans Ende von `src/lib/analysis/body-charts.ts`, mit dem Import oben in der Datei:

```ts
import { MEASUREMENT_FIELDS, type MeasurementField } from '../body-metrics'
```

```ts
/** Die Umfangsfelder unter den Messwerten — Gewicht und Koerperfettanteil sind keine. */
export type UmfangFeld = Extract<MeasurementField, `${string}umfang`>

/**
 * Abgeleitet statt abgeschrieben: ein spaeter ergaenzter Umfang landet damit von
 * selbst in K2. Eine zweite, handgepflegte Liste wuerde ihn verschweigen.
 */
export const UMFANG_FIELDS = MEASUREMENT_FIELDS.filter((feld): feld is UmfangFeld =>
  feld.endsWith('umfang'),
)

export type UmfangZeile = { datum: string } & Record<UmfangFeld, number | null>
export type UmfangPunkt = UmfangZeile

/**
 * K2: je Tag ein Punkt mit allen fuenf Umfaengen, aeltester zuerst.
 *
 * Ein Tag ohne jeden Umfang faellt raus — auf einer Umfangslinie ist er kein
 * Punkt, sondern nur ein Tag, an dem gewogen wurde. Ein Tag mit einem einzigen
 * gemessenen Umfang bleibt dagegen stehen: die uebrigen vier bleiben `null` und
 * werden im Graphen ueberbrueckt.
 */
export function umfaengeVerlauf(rows: UmfangZeile[]): UmfangPunkt[] {
  return rows
    .filter((row) => UMFANG_FIELDS.some((feld) => row[feld] != null))
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .map((row) => {
      const punkt = { datum: row.datum } as UmfangPunkt
      for (const feld of UMFANG_FIELDS) punkt[feld] = row[feld]
      return punkt
    })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/body-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing chart test**

Create `src/components/charts/BodyMeasurementsChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import BodyMeasurementsChart from './BodyMeasurementsChart'

const zeile = (datum: string, bauch: number | null, rest: number | null = bauch) => ({
  id: datum,
  datum,
  gewicht: 82.5,
  koerperfettanteil: null,
  bauchumfang: bauch,
  beinumfang: rest,
  armumfang: rest,
  ruckenumfang: rest,
  brustumfang: rest,
})

describe('BodyMeasurementsChart', () => {
  it('draws one line per circumference with a point per measured day', () => {
    // Marken statt Achsentexte: Recharts ueberspringt Ticks je nach Layout.
    // type="monotone" liefert bei genau zwei Punkten M…L…, daher zaehlt [ML].
    const { container } = render(
      <BodyMeasurementsChart rows={[zeile('2026-08-17', 92), zeile('2026-08-24', 90)]} />,
    )
    const kurven = container.querySelectorAll('.recharts-line-curve')
    expect(kurven).toHaveLength(5)
    for (const kurve of kurven) {
      expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
    }
  })

  it('ignores a day that measured only the weight', () => {
    const { container } = render(
      <BodyMeasurementsChart
        rows={[zeile('2026-08-17', 92), zeile('2026-08-20', null), zeile('2026-08-24', 90)]}
      />,
    )
    for (const kurve of container.querySelectorAll('.recharts-line-curve')) {
      expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
    }
  })

  it('names every line so the five are distinguishable', () => {
    render(<BodyMeasurementsChart rows={[zeile('2026-08-17', 92), zeile('2026-08-24', 90)]} />)
    expect(screen.getByText('Bauchumfang (cm)')).toBeInTheDocument()
    expect(screen.getByText('Brustumfang (cm)')).toBeInTheDocument()
  })

  it('states the empty case with a single measured day', () => {
    render(<BodyMeasurementsChart rows={[zeile('2026-08-24', 90)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/BodyMeasurementsChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the chart**

Create `src/components/charts/BodyMeasurementsChart.tsx`:

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
import { UMFANG_FIELDS, umfaengeVerlauf, type UmfangFeld } from '../../lib/analysis/body-charts'
import { FIELD_LABELS, type BodyMetricRow } from '../../lib/body-metrics'
import { UMFAENGE_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'

export const TITEL = UMFAENGE_TITEL

/** Feste Farbe je Umfang: eine wechselnde Zuordnung waere zwischen zwei
 *  Zeitraeumen nicht wiedererkennbar. */
const FARBEN: Record<UmfangFeld, string> = {
  bauchumfang: '#8884d8',
  beinumfang: '#82ca9d',
  armumfang: '#ff7300',
  ruckenumfang: '#0088fe',
  brustumfang: '#d0468c',
}

export default function BodyMeasurementsChart({
  rows,
  picker,
}: {
  rows: BodyMetricRow[]
  picker?: ReactNode
}) {
  const punkte = umfaengeVerlauf(rows).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.datum),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          {/* Nicht bei null beginnen: die interessante Spanne sind wenige
              Zentimeter, eine Achse ab 0 macht daraus fuenf Geraden. */}
          <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
          <Tooltip />
          {UMFANG_FIELDS.map((feld) => (
            <Line
              key={feld}
              type="monotone"
              dataKey={feld}
              name={FIELD_LABELS[feld]}
              stroke={FARBEN[feld]}
              dot={false}
              // Wer den Bauch jede Woche misst und den Arm jeden Monat, hat
              // Luecken in vier von fuenf Linien; ohne das zerfaellt jede
              // Linie in unverbundene Stuecke.
              connectNulls
            />
          ))}
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Titel, Registry, Liste, Registry-Test**

In `src/lib/analysis/chart-titles.ts` ergänzen:

```ts
export const UMFAENGE_TITEL = 'Umfänge im Verlauf'
```

In `src/lib/analysis/registry.ts` den Import erweitern (`UMFAENGE_TITEL as BODY_MEASUREMENTS`), die ID-Konstante `export const K2 = 'K2'` hinter `K1` ergänzen und den Eintrag hinter K1 einfügen:

```ts
  { id: K2, bereich: 'body', titel: BODY_MEASUREMENTS },
```

In `src/components/charts/BodyChartList.tsx`: `K2` mit importieren, `const BodyMeasurementsChart = lazy(() => import('./BodyMeasurementsChart'))` ergänzen und den Fall einhängen:

```tsx
      case K2:
        return <BodyMeasurementsChart rows={rows} picker={picker} />
```

In `src/lib/analysis/registry.test.ts`: Import ergänzen und drei Erwartungen fortschreiben.

```ts
import { TITEL as K2_TITEL } from '../../components/charts/BodyMeasurementsChart'
```

- Name des ersten Falls auf `'registers the charts of plan 1, 2a and 2c'` ändern und die Liste erweitern:
  ```ts
    expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'K1', 'K2'])
  ```
- Im Titel-Fall ergänzen: `expect(CHARTS.find((chart) => chart.id === 'K2')?.titel).toBe(K2_TITEL)`
- Im Bereichs-Fall: `expect(chartsFor('body').map((chart) => chart.id)).toEqual(['K1', 'K2'])`

- [ ] **Step 9: Run the full suite and commit**

```bash
npm test -- --run
npm run lint
npx tsc -b --noEmit
git add src/lib/analysis src/components/charts/BodyMeasurementsChart.tsx src/components/charts/BodyMeasurementsChart.test.tsx src/components/charts/BodyChartList.tsx
git commit -m "feat: K2 Umfaenge im Verlauf"
```

---

## Task 5: K3 Änderungsrate

**Files:**
- Modify: `src/lib/analysis/body-charts.ts`, `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/components/charts/BodyChartList.tsx`
- Create: `src/components/charts/WeightChangeRateChart.tsx`, `src/components/charts/WeightChangeRateChart.test.tsx`
- Test: `src/lib/analysis/body-charts.test.ts`, `src/lib/analysis/registry.test.ts`

**Interfaces:**
- Consumes: `gewichtsTrend` (bereits vorhanden, aus Plan 1), `tagesLabel`, `ChartFrame`
- Produces:
  ```ts
  export type RatenPunkt = { datum: string; rate: number }
  export function aenderungsrate(
    rows: { datum: string; gewicht: number | null }[],
    halbwertszeitTage?: number,
  ): RatenPunkt[]
  export const AENDERUNGSRATE_TITEL = 'Änderungsrate'
  export const K3 = 'K3'
  ```

K3 wird **aus derselben Trendlinie abgeleitet, die K1 zeichnet** — `gewichtsTrend` wird importiert, nicht nachgebaut. Die Rohgewichte taugen dafür nicht: zwei aufeinanderfolgende Tage können sich durch Wasser um ein Kilo unterscheiden, das wären hochgerechnet sieben Kilo pro Woche.

Je Messpunkt wird der zuletzt liegende Punkt gesucht, der **mindestens** sieben Tage zurückliegt, und die Trenddifferenz zu ihm auf kg/Woche normiert. Nicht die Differenz zum direkten Vorgänger: wer täglich wiegt, bekäme dann eine Rate über einen einzigen Tag hochgerechnet, und die schwankt wieder. Normiert wird über den **tatsächlichen** Abstand, nicht über sieben Tage — nach einer dreiwöchigen Lücke ist die Differenz sonst dreifach zu hoch. Punkte ohne eine Woche Vorlauf entfallen; eine Rate braucht eine Strecke.

- [ ] **Step 1: Write the failing test**

Ans Ende von `src/lib/analysis/body-charts.test.ts`:

```ts
import { aenderungsrate } from './body-charts'

const wiegung = (datum: string, gewicht: number | null) => ({ datum, gewicht })

describe('aenderungsrate', () => {
  it('derives kg per week from the trend line', () => {
    // Trend bei 7 Tagen Abstand und 7 Tagen Halbwertszeit: die Haelfte bleibt.
    // 85 → 85*0,5 + 84*0,5 = 84,5 → 84,5*0,5 + 83*0,5 = 83,75 → gerundet 83,8.
    expect(
      aenderungsrate([
        wiegung('2026-08-01', 85),
        wiegung('2026-08-08', 84),
        wiegung('2026-08-15', 83),
      ]),
    ).toEqual([
      { datum: '2026-08-08', rate: -0.5 },
      { datum: '2026-08-15', rate: -0.7 },
    ])
  })

  it('normalises a gap to one week instead of reading it as one step', () => {
    // 21 Tage Abstand: Halbwertszeit dreimal, es bleiben 0,125 vom alten Trend.
    // 85*0,125 + 82*0,875 = 82,375 → 82,4. (82,4 − 85) / 21 × 7 = −0,87.
    expect(aenderungsrate([wiegung('2026-08-01', 85), wiegung('2026-08-22', 82)])).toEqual([
      { datum: '2026-08-22', rate: -0.87 },
    ])
  })

  it('shows a rising trend as a positive rate', () => {
    // Das Vorzeichen ist die eigentliche Aussage des Graphen.
    const punkte = aenderungsrate([wiegung('2026-08-01', 80), wiegung('2026-08-08', 81)])
    expect(punkte[0].rate).toBeGreaterThan(0)
  })

  it('drops points without a full week of history behind them', () => {
    // Zwei Wiegungen im Abstand von drei Tagen ergeben keine Wochenrate.
    expect(aenderungsrate([wiegung('2026-08-01', 85), wiegung('2026-08-04', 84)])).toEqual([])
  })

  it('ignores entries that recorded no weight', () => {
    expect(
      aenderungsrate([
        wiegung('2026-08-01', 85),
        wiegung('2026-08-05', null),
        wiegung('2026-08-08', 84),
      ]),
    ).toEqual([{ datum: '2026-08-08', rate: -0.5 }])
  })

  it('returns nothing without rows', () => {
    expect(aenderungsrate([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/body-charts.test.ts`
Expected: FAIL — `aenderungsrate is not a function`.

- [ ] **Step 3: Write the implementation**

Ans Ende von `src/lib/analysis/body-charts.ts`:

```ts
export type RatenPunkt = { datum: string; rate: number }

/** Wie weit ein Punkt mindestens zurueckliegen muss, um als Vergleich zu taugen. */
const FENSTER_TAGE = 7

/**
 * K3: Steigung der Trendlinie ueber die vorangegangene Woche, in kg pro Woche.
 *
 * Gerechnet wird auf `gewichtsTrend` — derselben Linie, die K1 zeichnet — und
 * nicht auf den Rohgewichten: zwei aufeinanderfolgende Tage koennen sich durch
 * Wasser um ein Kilo unterscheiden, hochgerechnet waeren das sieben Kilo Woche.
 *
 * Verglichen wird mit dem juengsten Punkt, der mindestens eine Woche
 * zurueckliegt, und die Differenz wird ueber den **tatsaechlichen** Abstand
 * normiert. Nach einer dreiwoechigen Luecke waere sie sonst dreifach zu hoch.
 * Punkte ohne eine Woche Vorlauf entfallen — eine Rate braucht eine Strecke.
 */
export function aenderungsrate(
  rows: { datum: string; gewicht: number | null }[],
  halbwertszeitTage = 7,
): RatenPunkt[] {
  const trend = gewichtsTrend(rows, halbwertszeitTage)
  const zeit = trend.map((punkt) => new Date(`${punkt.datum}T00:00:00`).getTime())

  const punkte: RatenPunkt[] = []
  for (let i = 0; i < trend.length; i += 1) {
    let vergleich = -1
    for (let j = i - 1; j >= 0; j -= 1) {
      if (zeit[i] - zeit[j] >= FENSTER_TAGE * TAG_MS) {
        vergleich = j
        break
      }
    }
    if (vergleich === -1) continue
    const tage = (zeit[i] - zeit[vergleich]) / TAG_MS
    const rate = ((trend[i].trend - trend[vergleich].trend) / tage) * 7
    // Zwei Nachkommastellen: eine Rate von −0,05 kg/Woche waere auf eine Stelle
    // gerundet eine glatte Null und der Graph eine Gerade auf der Achse.
    punkte.push({ datum: trend[i].datum, rate: Math.round(rate * 100) / 100 })
  }
  return punkte
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/body-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing chart test**

Create `src/components/charts/WeightChangeRateChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import WeightChangeRateChart from './WeightChangeRateChart'

const leer = {
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

const zeile = (datum: string, gewicht: number | null) => ({
  id: datum,
  datum,
  gewicht,
  ...leer,
})

describe('WeightChangeRateChart', () => {
  it('draws a point per week-over-week rate', () => {
    // type="monotone" liefert bei genau zwei Punkten M…L…, daher zaehlt [ML].
    const { container } = render(
      <WeightChangeRateChart
        rows={[zeile('2026-08-01', 85), zeile('2026-08-08', 84), zeile('2026-08-15', 83)]}
      />,
    )
    const kurve = container.querySelector('.recharts-line-curve')!
    expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
  })

  it('draws the zero line that separates gain from loss', () => {
    const { container } = render(
      <WeightChangeRateChart
        rows={[zeile('2026-08-01', 85), zeile('2026-08-08', 84), zeile('2026-08-15', 83)]}
      />,
    )
    // ifOverflow="extendDomain": ohne das verwirft Recharts eine Referenzlinie
    // ausserhalb des Wertebereichs — bei durchweg negativen Raten waere die
    // Nulllinie also genau dann weg, wenn sie am meisten sagt.
    expect(container.querySelector('.recharts-reference-line')).not.toBeNull()
  })

  it('states the empty case with a single rate', () => {
    render(<WeightChangeRateChart rows={[zeile('2026-08-01', 85), zeile('2026-08-08', 84)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('states the empty case without a full week of history', () => {
    render(<WeightChangeRateChart rows={[zeile('2026-08-01', 85), zeile('2026-08-04', 84)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/WeightChangeRateChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the chart**

Create `src/components/charts/WeightChangeRateChart.tsx`:

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
import { aenderungsrate } from '../../lib/analysis/body-charts'
import type { BodyMetricRow } from '../../lib/body-metrics'
import { AENDERUNGSRATE_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'

export const TITEL = AENDERUNGSRATE_TITEL

export default function WeightChangeRateChart({
  rows,
  picker,
}: {
  rows: BodyMetricRow[]
  picker?: ReactNode
}) {
  const punkte = aenderungsrate(rows).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.datum),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={(wert: number) => wert.toFixed(1)} />
          {/* extendDomain: sonst verwirft Recharts die Linie, sobald alle Raten
              auf derselben Seite der Null liegen — also genau dann, wenn die
              Null die Aussage des Graphen traegt. */}
          <ReferenceLine y={0} stroke="#888" ifOverflow="extendDomain" />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg/Woche`, '']} />
          <Line type="monotone" dataKey="rate" name="kg/Woche" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Titel, Registry, Liste, Registry-Test**

`chart-titles.ts`: `export const AENDERUNGSRATE_TITEL = 'Änderungsrate'`

`registry.ts`: Import `AENDERUNGSRATE_TITEL as CHANGE_RATE`, `export const K3 = 'K3'`, Eintrag hinter K2:

```ts
  { id: K3, bereich: 'body', titel: CHANGE_RATE },
```

`BodyChartList.tsx`: `K3` mit importieren, `const WeightChangeRateChart = lazy(() => import('./WeightChangeRateChart'))` und

```tsx
      case K3:
        return <WeightChangeRateChart rows={rows} picker={picker} />
```

`registry.test.ts`: `import { TITEL as K3_TITEL } from '../../components/charts/WeightChangeRateChart'`, `CHART_IDS`-Liste um `'K3'` erweitern, `expect(CHARTS.find((chart) => chart.id === 'K3')?.titel).toBe(K3_TITEL)` ergänzen und `chartsFor('body')` auf `['K1', 'K2', 'K3']` setzen.

- [ ] **Step 9: Run the full suite and commit**

```bash
npm test -- --run
npm run lint
npx tsc -b --noEmit
git add src/lib/analysis src/components/charts/WeightChangeRateChart.tsx src/components/charts/WeightChangeRateChart.test.tsx src/components/charts/BodyChartList.tsx
git commit -m "feat: K3 Aenderungsrate aus der Trendlinie"
```

---

## Task 6: K4 Gewicht über Kalorien

**Files:**
- Create: `src/lib/analysis/woche.ts`
- Modify: `src/lib/analysis/training-charts.ts` (die privaten Wochenfunktionen entfallen)
- Modify: `src/lib/analysis/body-charts.ts`, `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/components/charts/BodyChartList.tsx`
- Create: `src/components/charts/WeightVsCaloriesChart.tsx`, `src/components/charts/WeightVsCaloriesChart.test.tsx`
- Test: `src/lib/analysis/body-charts.test.ts`, `src/lib/analysis/training-charts.test.ts` (muss unverändert grün bleiben), `src/lib/analysis/registry.test.ts`

**Interfaces:**
- Consumes: `TagesPunkt` aus `nutrition-charts.ts`, `localDay`
- Produces:
  ```ts
  // src/lib/analysis/woche.ts
  export function wochenStart(iso: string): string        // Montag der Woche, `YYYY-MM-DD`
  export function wochenLabel(montag: string): string     // `2026-KW34`

  // src/lib/analysis/body-charts.ts
  export type KalorienPunkt = { woche: string; kalorien: number; aenderung: number }
  export function gewichtGegenKalorien(
    rows: { datum: string; gewicht: number | null }[],
    kalorien: TagesPunkt[],
  ): KalorienPunkt[]
  export const GEWICHT_UEBER_KALORIEN_TITEL = 'Gewicht über Kalorien'
  export const K4 = 'K4'
  ```

Die Woche ist die richtige Auflösung: Tagesgewicht schwankt durch Wasser stärker als durch jede Kalorienbilanz, und ein einzelner Tag mit 3000 kcal steht nicht neben einer messbaren Gewichtsänderung. Über eine Woche gemittelt bleibt der Zusammenhang übrig.

**Vergleich ist die letzte Woche mit Wiegungen, nicht die Kalenderwoche davor.** Wer eine Woche nicht auf der Waage steht, bekäme sonst eine Lücke statt eines Punktes. Die Differenz wird durch den Wochenabstand geteilt, damit zwei Wochen Abstand nicht als doppelte Änderung dastehen. Eine Woche ohne Ernährungseinträge liefert keinen Punkt — eine x-Koordinate von null hieße „nichts gegessen", nicht „nichts erfasst".

- [ ] **Step 1: Die Wochenfunktionen in ein eigenes Modul heben**

Create `src/lib/analysis/woche.ts` — die beiden Funktionen wortgleich aus `src/lib/analysis/training-charts.ts` übernehmen, nur `export` davor:

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

In `src/lib/analysis/training-charts.ts` beide Funktionsdefinitionen **löschen** und stattdessen importieren:

```ts
import { wochenLabel, wochenStart } from './woche'
```

- [ ] **Step 2: Die Trainingstests laufen lassen**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: PASS, unverändert. T1 rechnet mit denselben Funktionen an einem anderen Ort.

- [ ] **Step 3: Write the failing test**

Ans Ende von `src/lib/analysis/body-charts.test.ts`:

```ts
import { gewichtGegenKalorien } from './body-charts'

// 2026-08-03, -10, -17 sind Montage (KW32, KW33, KW34).
describe('gewichtGegenKalorien', () => {
  it('pairs each week with its mean intake and its change against the week before', () => {
    expect(
      gewichtGegenKalorien(
        [
          { datum: '2026-08-03', gewicht: 85 },
          { datum: '2026-08-10', gewicht: 84 },
          { datum: '2026-08-17', gewicht: 83.5 },
        ],
        [
          { tag: '2026-08-04', kalorien: 2000 },
          { tag: '2026-08-06', kalorien: 2200 },
          { tag: '2026-08-11', kalorien: 2500 },
          { tag: '2026-08-18', kalorien: 1800 },
        ],
      ),
    ).toEqual([
      { woche: '2026-KW33', kalorien: 2500, aenderung: -1 },
      { woche: '2026-KW34', kalorien: 1800, aenderung: -0.5 },
    ])
  })

  it('averages several weighings of one week instead of taking the last', () => {
    // Ein einzelner Wassertag darf die Wochenaenderung nicht bestimmen.
    expect(
      gewichtGegenKalorien(
        [
          { datum: '2026-08-03', gewicht: 85 },
          { datum: '2026-08-10', gewicht: 85 },
          { datum: '2026-08-12', gewicht: 83 },
        ],
        [
          { tag: '2026-08-04', kalorien: 2000 },
          { tag: '2026-08-11', kalorien: 2000 },
        ],
      ),
    ).toEqual([{ woche: '2026-KW33', kalorien: 2000, aenderung: -1 }])
  })

  it('spreads a skipped week over its real distance', () => {
    // Zwei Wochen ohne Wiegung sind nicht die doppelte Wochenaenderung.
    expect(
      gewichtGegenKalorien(
        [
          { datum: '2026-08-03', gewicht: 85 },
          { datum: '2026-08-17', gewicht: 83 },
        ],
        [{ tag: '2026-08-18', kalorien: 1800 }],
      ),
    ).toEqual([{ woche: '2026-KW34', kalorien: 1800, aenderung: -1 }])
  })

  it('drops a week without logged food', () => {
    // Keine Eintraege heisst nicht null Kalorien; ein Punkt bei x = 0 waere eine
    // erfundene Nulldiaet.
    expect(
      gewichtGegenKalorien(
        [
          { datum: '2026-08-03', gewicht: 85 },
          { datum: '2026-08-10', gewicht: 84 },
        ],
        [],
      ),
    ).toEqual([])
  })

  it('ignores entries without a weight and needs no first week', () => {
    // Die erste Woche hat keine Vorwoche und liefert deshalb keinen Punkt.
    expect(
      gewichtGegenKalorien(
        [{ datum: '2026-08-03', gewicht: 85 }, { datum: '2026-08-05', gewicht: null }],
        [{ tag: '2026-08-04', kalorien: 2000 }],
      ),
    ).toEqual([])
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/body-charts.test.ts`
Expected: FAIL — `gewichtGegenKalorien is not a function`.

- [ ] **Step 5: Write the implementation**

Ans Ende von `src/lib/analysis/body-charts.ts`, mit den Importen oben in der Datei:

```ts
import { wochenLabel, wochenStart } from './woche'
import type { TagesPunkt } from './nutrition-charts'
```

```ts
export type KalorienPunkt = { woche: string; kalorien: number; aenderung: number }

/** Mittelwert je Kalenderwoche, Schluessel ist der Montag als `YYYY-MM-DD`. */
function mittelJeWoche(werte: { tag: string; wert: number }[]): Map<string, number> {
  const summen = new Map<string, { summe: number; anzahl: number }>()
  for (const eintrag of werte) {
    // `T00:00:00` angehaengt: `new Date('2026-08-17')` waere UTC-Mitternacht und
    // faellt westlich von Greenwich auf den Vortag, also womoeglich in die
    // Vorwoche.
    const montag = wochenStart(`${eintrag.tag}T00:00:00`)
    const bisher = summen.get(montag) ?? { summe: 0, anzahl: 0 }
    summen.set(montag, { summe: bisher.summe + eintrag.wert, anzahl: bisher.anzahl + 1 })
  }
  return new Map([...summen].map(([montag, { summe, anzahl }]) => [montag, summe / anzahl]))
}

const WOCHE_MS = 7 * TAG_MS

/**
 * K4: je Woche ein Punkt aus mittlerer Tagesaufnahme und Gewichtsaenderung.
 *
 * Die Woche ist die richtige Aufloesung: Tagesgewicht schwankt durch Wasser
 * staerker als durch jede Tagesbilanz. Verglichen wird mit der letzten Woche,
 * in der ueberhaupt gewogen wurde — nicht stur mit der Kalenderwoche davor —,
 * und die Differenz wird durch den Wochenabstand geteilt, damit zwei Wochen
 * Pause nicht als doppelte Aenderung dastehen.
 *
 * Eine Woche ohne Ernaehrungseintraege liefert keinen Punkt: null Kalorien
 * hiesse „nichts gegessen", gemeint ist aber „nichts erfasst".
 */
export function gewichtGegenKalorien(
  rows: { datum: string; gewicht: number | null }[],
  kalorien: TagesPunkt[],
): KalorienPunkt[] {
  const gewichtJeWoche = mittelJeWoche(
    rows
      .filter((row): row is { datum: string; gewicht: number } => row.gewicht != null)
      .map((row) => ({ tag: row.datum, wert: row.gewicht })),
  )
  const kalorienJeWoche = mittelJeWoche(
    kalorien.map((punkt) => ({ tag: punkt.tag, wert: punkt.kalorien })),
  )

  const wochen = [...gewichtJeWoche.keys()].sort()
  const punkte: KalorienPunkt[] = []
  for (let i = 1; i < wochen.length; i += 1) {
    const montag = wochen[i]
    const mittlereKalorien = kalorienJeWoche.get(montag)
    if (mittlereKalorien == null) continue
    const abstand =
      (new Date(`${montag}T00:00:00`).getTime() -
        new Date(`${wochen[i - 1]}T00:00:00`).getTime()) /
      WOCHE_MS
    const aenderung = (gewichtJeWoche.get(montag)! - gewichtJeWoche.get(wochen[i - 1])!) / abstand
    punkte.push({
      woche: wochenLabel(montag),
      kalorien: Math.round(mittlereKalorien),
      aenderung: Math.round(aenderung * 10) / 10,
    })
  }
  return punkte
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/body-charts.test.ts`
Expected: PASS

- [ ] **Step 7: Write the failing chart test**

Create `src/components/charts/WeightVsCaloriesChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import WeightVsCaloriesChart from './WeightVsCaloriesChart'

const leer = {
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

const zeile = (datum: string, gewicht: number) => ({ id: datum, datum, gewicht, ...leer })

const rows = [
  zeile('2026-08-03', 85),
  zeile('2026-08-10', 84),
  zeile('2026-08-17', 83.5),
]

const kalorien = [
  { tag: '2026-08-04', kalorien: 2100 },
  { tag: '2026-08-11', kalorien: 2500 },
  { tag: '2026-08-18', kalorien: 1800 },
]

describe('WeightVsCaloriesChart', () => {
  it('draws one symbol per week', () => {
    // Marken statt Achsentexte; eine Punktwolke zeichnet je Punkt ein Symbol.
    const { container } = render(<WeightVsCaloriesChart rows={rows} kalorien={kalorien} />)
    expect(container.querySelectorAll('.recharts-scatter-symbol')).toHaveLength(2)
  })

  it('draws the zero line that separates gain from loss', () => {
    const { container } = render(<WeightVsCaloriesChart rows={rows} kalorien={kalorien} />)
    expect(container.querySelector('.recharts-reference-line')).not.toBeNull()
  })

  it('states the empty case with a single week', () => {
    // Ein einzelner Punkt zeigt keinen Zusammenhang, nur einen Punkt.
    render(
      <WeightVsCaloriesChart
        rows={[zeile('2026-08-03', 85), zeile('2026-08-10', 84)]}
        kalorien={[{ tag: '2026-08-11', kalorien: 2500 }]}
      />,
    )
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('states the empty case without logged food', () => {
    render(<WeightVsCaloriesChart rows={rows} kalorien={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 8: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/WeightVsCaloriesChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 9: Write the chart**

Create `src/components/charts/WeightVsCaloriesChart.tsx`:

```tsx
import type { ReactNode } from 'react'
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { gewichtGegenKalorien } from '../../lib/analysis/body-charts'
import type { TagesPunkt } from '../../lib/analysis/nutrition-charts'
import type { BodyMetricRow } from '../../lib/body-metrics'
import { GEWICHT_UEBER_KALORIEN_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = GEWICHT_UEBER_KALORIEN_TITEL

/**
 * K4 traegt zwei Groessen gegeneinander auf, nicht gegen die Zeit: auf einer
 * Zeitachse waeren das zwei Linien, deren Zusammenhang man raten muss. In der
 * Punktwolke liest man ihn ab — und dort, wo sie die Nulllinie schneidet, liegt
 * ungefaehr der Erhaltungsbedarf.
 */
export default function WeightVsCaloriesChart({
  rows,
  kalorien,
  picker,
}: {
  rows: BodyMetricRow[]
  kalorien: TagesPunkt[]
  picker?: ReactNode
}) {
  const punkte = gewichtGegenKalorien(rows, kalorien)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="kalorien"
            name="kcal je Tag"
            unit=" kcal"
            domain={['dataMin - 100', 'dataMax + 100']}
          />
          <YAxis type="number" dataKey="aenderung" name="kg je Woche" unit=" kg" />
          {/* extendDomain: sonst verwirft Recharts die Linie, sobald alle Wochen
              auf derselben Seite der Null liegen. */}
          <ReferenceLine y={0} stroke="#888" ifOverflow="extendDomain" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Woche" data={punkte} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 10: Titel, Registry, Liste, Registry-Test**

`chart-titles.ts`: `export const GEWICHT_UEBER_KALORIEN_TITEL = 'Gewicht über Kalorien'`

`registry.ts`: Import `GEWICHT_UEBER_KALORIEN_TITEL as WEIGHT_VS_CALORIES`, `export const K4 = 'K4'`, Eintrag hinter K3:

```ts
  { id: K4, bereich: 'body', titel: WEIGHT_VS_CALORIES },
```

`BodyChartList.tsx`: `K4` mit importieren, `const WeightVsCaloriesChart = lazy(() => import('./WeightVsCaloriesChart'))`, den Fall einhängen und das `void kalorien` **entfernen** — der Wert wird jetzt benutzt:

```tsx
      case K4:
        return <WeightVsCaloriesChart rows={rows} kalorien={kalorien} picker={picker} />
```

`registry.test.ts`: `import { TITEL as K4_TITEL } from '../../components/charts/WeightVsCaloriesChart'`, `CHART_IDS` um `'K4'`, `expect(CHARTS.find((chart) => chart.id === 'K4')?.titel).toBe(K4_TITEL)`, `chartsFor('body')` auf `['K1', 'K2', 'K3', 'K4']`.

- [ ] **Step 11: Run the full suite and commit**

```bash
npm test -- --run
npm run lint
npx tsc -b --noEmit
git add src/lib/analysis src/components/charts/WeightVsCaloriesChart.tsx src/components/charts/WeightVsCaloriesChart.test.tsx src/components/charts/BodyChartList.tsx
git commit -m "feat: K4 Gewicht ueber Kalorien je Woche"
```

---

## Task 7: K5 Fortschrittsfotos als Zeitleiste

**Files:**
- Modify: `src/lib/analysis/tages-label.ts`, `src/components/charts/PersonalRecordsList.tsx`
- Modify: `src/lib/analysis/body-charts.ts`, `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/components/charts/BodyChartList.tsx`
- Create: `src/components/charts/PhotoTimeline.tsx`, `src/components/charts/PhotoTimeline.test.tsx`
- Test: `src/lib/analysis/body-charts.test.ts`, `src/lib/analysis/tages-label.test.ts`, `src/lib/analysis/registry.test.ts`, `src/components/charts/PersonalRecordsList.test.tsx` (muss unverändert grün bleiben)

**Interfaces:**
- Consumes: `AnalysisPhoto` (Task 2), `BodyMetricRow`, `ChartFrame`
- Produces:
  ```ts
  // src/lib/analysis/tages-label.ts
  export function datumsLabel(tag: string): string   // `2026-08-17` → `17.08.2026`

  // src/lib/analysis/body-charts.ts
  export type FotoPunkt = { id: string; datum: string; url: string | null; gewicht: number | null }
  export function fotoZeitleiste(
    fotos: { id: string; datum: string; url: string | null }[],
    rows: { datum: string; gewicht: number | null }[],
  ): FotoPunkt[]
  export const FOTOS_TITEL = 'Fortschrittsfotos'
  export const K5 = 'K5'
  ```

K5 ist wie T8 **kein Diagramm**, sondern eine Liste: Fotos sind das eine Maß, das keine Achse braucht. Die Komponente importiert deshalb kein Recharts.

**Was zu rechnen bleibt, ist eine Verknüpfung**, kein Aggregat: die Spec verlangt „mit Gewicht beschriftet", also das Gewicht **desselben Tages**. `body_metrics` hat je Nutzer und Tag höchstens eine Zeile (`unique (user_id, datum)`), die Zuordnung ist damit eindeutig. Ein Foto ohne passende Zeile behält `gewicht: null` und wird trotzdem gezeigt — es weglassen hieße, ein vorhandenes Foto zu verschweigen, weil an dem Tag die Waage fehlte.

Sortiert wird **absteigend**, neuestes zuerst, wie auf `/body/photos`: die Zeitleiste beantwortet „wie sieht es jetzt aus, verglichen mit vorher", nicht umgekehrt.

**Nur das Darstellungsmuster** wird von `BodyPhotosPage` übernommen (img mit `alt` und `loading="lazy"`, der Ersatztext bei fehlendem Link). Hochladen und Löschen gehören dorthin, nicht in einen Analysegraphen.

- [ ] **Step 1: `datumsLabel` an eine Stelle holen**

`PersonalRecordsList.tsx` hat eine private Funktion `datumsLabel`; K5 braucht dieselbe. Sie wandert zu `tagesLabel`, wo das Gegenstück schon liegt.

Ans Ende von `src/lib/analysis/tages-label.ts`:

```ts
/** `2026-08-17` → `17.08.2026` — mit Jahr, wo der Zeitraum es nicht mitliefert. */
export function datumsLabel(tag: string) {
  const [jahr, monat, tagesZahl] = tag.split('-')
  return `${tagesZahl}.${monat}.${jahr}`
}
```

In `src/components/charts/PersonalRecordsList.tsx` die lokale Funktion `datumsLabel` samt ihrem Kommentar löschen und den bestehenden Import erweitern beziehungsweise anlegen:

```ts
import { datumsLabel } from '../../lib/analysis/tages-label'
```

Ans Ende von `src/lib/analysis/tages-label.test.ts` (falls die Datei nicht existiert, wird sie mit den beiden Importen und diesem `describe` angelegt):

```ts
describe('datumsLabel', () => {
  it('writes a day German, with its year', () => {
    expect(datumsLabel('2026-08-17')).toBe('17.08.2026')
  })
})
```

Run: `npm test -- --run src/lib/analysis/tages-label.test.ts src/components/charts/PersonalRecordsList.test.tsx`
Expected: PASS — der Rekordlisten-Test prüft weiter `'116,7 kg (100 kg × 5) am 17.08.2026'`, also unverändertes Verhalten.

- [ ] **Step 2: Write the failing test**

Ans Ende von `src/lib/analysis/body-charts.test.ts`:

```ts
import { fotoZeitleiste } from './body-charts'

const foto = (id: string, datum: string, url: string | null = `https://signed/${id}`) => ({
  id,
  datum,
  url,
})

describe('fotoZeitleiste', () => {
  it('labels each photo with the weight of the same day, newest first', () => {
    expect(
      fotoZeitleiste(
        [foto('p1', '2026-08-17'), foto('p2', '2026-08-24')],
        [
          { datum: '2026-08-17', gewicht: 83.3 },
          { datum: '2026-08-24', gewicht: 82.5 },
        ],
      ),
    ).toEqual([
      { id: 'p2', datum: '2026-08-24', url: 'https://signed/p2', gewicht: 82.5 },
      { id: 'p1', datum: '2026-08-17', url: 'https://signed/p1', gewicht: 83.3 },
    ])
  })

  it('keeps a photo taken on a day without a weighing', () => {
    // Ein Foto verschweigen, weil an dem Tag die Waage fehlte, waere der
    // teurere der beiden Fehler.
    expect(fotoZeitleiste([foto('p1', '2026-08-17')], [])).toEqual([
      { id: 'p1', datum: '2026-08-17', url: 'https://signed/p1', gewicht: null },
    ])
  })

  it('does not label a photo with a weight from a neighbouring day', () => {
    // „mit Gewicht beschriftet" heisst das Gewicht dieses Tages, nicht das
    // naechstgelegene — sonst steht unter dem Foto eine Zahl von vorgestern.
    expect(
      fotoZeitleiste([foto('p1', '2026-08-17')], [{ datum: '2026-08-16', gewicht: 83.3 }])[0]
        .gewicht,
    ).toBeNull()
  })

  it('ignores a day whose entry recorded no weight', () => {
    expect(
      fotoZeitleiste([foto('p1', '2026-08-17')], [{ datum: '2026-08-17', gewicht: null }])[0]
        .gewicht,
    ).toBeNull()
  })

  it('keeps a photo whose link could not be signed', () => {
    expect(fotoZeitleiste([foto('p1', '2026-08-17', null)], [])[0].url).toBeNull()
  })

  it('returns nothing without photos', () => {
    expect(fotoZeitleiste([], [{ datum: '2026-08-17', gewicht: 83.3 }])).toEqual([])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/body-charts.test.ts`
Expected: FAIL — `fotoZeitleiste is not a function`.

- [ ] **Step 4: Write the implementation**

Ans Ende von `src/lib/analysis/body-charts.ts`:

```ts
export type FotoPunkt = { id: string; datum: string; url: string | null; gewicht: number | null }

/**
 * K5: die Fotos des Zeitraums, neuestes zuerst, jedes mit dem Gewicht seines
 * Tages.
 *
 * Verknuepft wird auf exakte Tagesgleichheit — `body_metrics` hat je Nutzer und
 * Tag hoechstens eine Zeile, die Zuordnung ist also eindeutig. Kein Suchen nach
 * dem naechstgelegenen Tag: unter dem Foto stuende sonst eine Zahl von
 * vorgestern, ohne dass man es sieht. Ein Foto ohne Wiegung bleibt stehen und
 * traegt `null`.
 */
export function fotoZeitleiste(
  fotos: { id: string; datum: string; url: string | null }[],
  rows: { datum: string; gewicht: number | null }[],
): FotoPunkt[] {
  const gewichtJeTag = new Map<string, number>()
  for (const row of rows) {
    if (row.gewicht != null) gewichtJeTag.set(row.datum, row.gewicht)
  }

  return [...fotos]
    // id als Tiebreaker: zwei Fotos desselben Tages brauchen eine feste
    // Reihenfolge, sonst springen sie zwischen zwei Renderdurchlaeufen.
    .sort((a, b) => b.datum.localeCompare(a.datum) || a.id.localeCompare(b.id))
    .map((foto) => ({
      id: foto.id,
      datum: foto.datum,
      url: foto.url,
      gewicht: gewichtJeTag.get(foto.datum) ?? null,
    }))
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/body-charts.test.ts`
Expected: PASS

- [ ] **Step 6: Write the failing component test**

Create `src/components/charts/PhotoTimeline.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import PhotoTimeline from './PhotoTimeline'

const leer = {
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

const zeile = (datum: string, gewicht: number | null) => ({ id: datum, datum, gewicht, ...leer })

const foto = (id: string, datum: string, url: string | null = `https://signed/${id}`) => ({
  id,
  datum,
  pfad: `u1/${id}.jpg`,
  url,
})

describe('PhotoTimeline', () => {
  it('shows each photo with its date and the weight of that day', () => {
    render(
      <PhotoTimeline
        fotos={[foto('p1', '2026-08-24')]}
        rows={[zeile('2026-08-24', 82.5)]}
      />,
    )
    expect(screen.getByText('24.08.2026')).toBeInTheDocument()
    expect(screen.getByText('82,5 kg')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Fortschrittsfoto vom 24.08.2026' })).toHaveAttribute(
      'src',
      'https://signed/p1',
    )
  })

  it('says so when no weight was recorded that day', () => {
    // Kein Absturz und keine leere Zeile: das Foto bleibt sichtbar.
    render(<PhotoTimeline fotos={[foto('p1', '2026-08-24')]} rows={[]} />)
    expect(screen.getByText('kein Gewicht erfasst')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Fortschrittsfoto vom 24.08.2026' })).toBeInTheDocument()
  })

  it('says so when the signed link is missing instead of showing a broken image', () => {
    render(<PhotoTimeline fotos={[foto('p1', '2026-08-24', null)]} rows={[]} />)
    expect(screen.getByText('Bild nicht verfügbar')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('states the empty case without photos', () => {
    render(<PhotoTimeline fotos={[]} rows={[zeile('2026-08-24', 82.5)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/PhotoTimeline.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 8: Write the component**

Create `src/components/charts/PhotoTimeline.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { AnalysisPhoto } from '../../hooks/use-body-analysis'
import type { BodyMetricRow } from '../../lib/body-metrics'
import { fotoZeitleiste } from '../../lib/analysis/body-charts'
import { FOTOS_TITEL } from '../../lib/analysis/chart-titles'
import { datumsLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'

export const TITEL = FOTOS_TITEL

/** German notation: comma as the decimal mark, at most one place. */
function formatGewicht(wert: number) {
  return wert.toLocaleString('de-DE', { maximumFractionDigits: 1 })
}

/**
 * K5 ist wie T8 bewusst kein Diagramm: Fotos brauchen keine Achse. Diese
 * Komponente importiert deshalb kein Recharts.
 *
 * Nur das Darstellungsmuster stammt von `/body/photos` — Hochladen und Loeschen
 * gehoeren dorthin, nicht in einen Analysegraphen.
 */
export default function PhotoTimeline({
  fotos,
  rows,
  picker,
}: {
  fotos: AnalysisPhoto[]
  rows: BodyMetricRow[]
  picker?: ReactNode
}) {
  const punkte = fotoZeitleiste(fotos, rows)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker}>
      <ul role="list">
        {punkte.map((punkt) => (
          <li key={punkt.id}>
            <span>{datumsLabel(punkt.datum)}</span>
            <span>
              {punkt.gewicht == null
                ? 'kein Gewicht erfasst'
                : `${formatGewicht(punkt.gewicht)} kg`}
            </span>
            {punkt.url == null ? (
              // Ein signierter Link kann fuer sich scheitern; ein blankes <img>
              // zeigte nur ein kaputtes Bild und saegte nichts dazu.
              <span>Bild nicht verfügbar</span>
            ) : (
              <img
                src={punkt.url}
                alt={`Fortschrittsfoto vom ${datumsLabel(punkt.datum)}`}
                loading="lazy"
              />
            )}
          </li>
        ))}
      </ul>
    </ChartFrame>
  )
}
```

Im Kommentar oben steht ein Tippfehler-Risiko: der Satz muss „sagte nichts dazu" heißen. Beim Schreiben korrigieren.

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- --run src/components/charts/PhotoTimeline.test.tsx`
Expected: PASS

- [ ] **Step 10: Titel, Registry, Liste, Registry-Test**

`chart-titles.ts`: `export const FOTOS_TITEL = 'Fortschrittsfotos'`

`registry.ts`: Import `FOTOS_TITEL as PHOTOS`, `export const K5 = 'K5'`, Eintrag hinter K4:

```ts
  { id: K5, bereich: 'body', titel: PHOTOS },
```

`BodyChartList.tsx`: `K5` mit importieren, `const PhotoTimeline = lazy(() => import('./PhotoTimeline'))`, den Fall einhängen und das `void fotos` **entfernen**:

```tsx
      case K5:
        return <PhotoTimeline fotos={fotos} rows={rows} picker={picker} />
```

`registry.test.ts`: `import { TITEL as K5_TITEL } from '../../components/charts/PhotoTimeline'`, `CHART_IDS` um `'K5'`, `expect(CHARTS.find((chart) => chart.id === 'K5')?.titel).toBe(K5_TITEL)`, `chartsFor('body')` auf `['K1', 'K2', 'K3', 'K4', 'K5']`.

- [ ] **Step 11: Run the full suite and commit**

```bash
npm test -- --run
npm run lint
npx tsc -b --noEmit
git add src/lib/analysis src/components/charts/PhotoTimeline.tsx src/components/charts/PhotoTimeline.test.tsx src/components/charts/PersonalRecordsList.tsx src/components/charts/BodyChartList.tsx
git commit -m "feat: K5 Fortschrittsfotos als Zeitleiste"
```

---

## Task 8: Abschluss — Seitentest, Doku, Bundle, Gesamtlauf

**Files:**
- Modify: `src/pages/BodyAnalysisPage.test.tsx`
- Modify: `docs/domaenenmodell.md`
- Modify: `CLAUDE.md` (Abschnitt „Phase 5")

**Interfaces:**
- Consumes: alles Vorherige
- Produces: keine Codeschnittstelle

- [ ] **Step 1: Seitentest über die volle Analyse-Seite**

Ans Ende von `src/pages/BodyAnalysisPage.test.tsx` — prüft, dass wirklich alle fünf Graphen der Registry gerendert werden und nicht nur die verdrahteten. `chartsFor` oben importieren (`import { chartsFor } from '../lib/analysis/registry'`):

```tsx
it('renders every registered body chart', async () => {
  // Der Fall, den die Registry verhindern soll: ein Graph ist angemeldet, aber
  // die Seite kennt ihn nicht — er waere im Picker sichtbar und nirgends sonst.
  zeige() // die in dieser Datei vorhandene Hilfsfunktion
  for (const chart of chartsFor('body')) {
    expect(await screen.findByText(chart.titel, {}, { timeout: 5000 })).toBeInTheDocument()
  }
})
```

- [ ] **Step 2: Run it**

Run: `npm test -- --run src/pages/BodyAnalysisPage.test.tsx`
Expected: PASS. Schlägt er fehl, fehlt ein `case` in `BodyChartList` — genau der Fund, für den der Test da ist.

- [ ] **Step 3: Bundle messen**

Run: `npm run build`

Die Ausgabe gehört wörtlich in den Abschlussbericht: Größe des Start-Chunks und der ausgelagerten Chart-Chunks. Erwartung: der Start-Chunk wächst kaum, weil alle neuen Graphen hinter `React.lazy` in `BodyChartList` liegen — Vergleichswert aus Plan 2a ist `984,53 kB (268,30 kB gzip)`. Wächst er deutlich, hat ein Import Recharts in den Start gezogen; dann ist die Ursache zu suchen, bevor der Task schließt (üblicher Verdächtiger: ein Titel oder Typ, der aus einer Chart-Komponente statt aus `chart-titles.ts` importiert wird). Die bekannte Überschreitung der Warnschwelle von 500 kB bleibt ein Befund für die Härtungsphase und hält diesen Task nicht auf.

- [ ] **Step 4: Domänenmodell nachziehen**

In `docs/domaenenmodell.md` unter „Fachliche Notizen" ergänzen:

- Die Körperanalyse liest drei Tabellen in einem Hook: `body_metrics` (die Messwerte), `food_entries` mit eingebettetem `products(kalorien)` (die Tagessummen für K4) und `body_photos` (die Zeitleiste K5). Alle drei sind auf den Zeitraum begrenzt und seitenweise paginiert.
- Fotolinks werden nie gespeichert. `body_photos.foto_url` hält den Objektpfad im privaten Bucket; die Analyse signiert ihn beim Laden gebündelt für eine Stunde, wie die Fotoseite.
- K5 beschriftet ein Foto mit dem Gewicht **desselben** Tages. `body_metrics` hat je Nutzer und Tag höchstens eine Zeile (`unique (user_id, datum)`), die Zuordnung ist damit eindeutig; ein Foto ohne Wiegung an diesem Tag bleibt sichtbar und trägt kein Gewicht.
- K3 leitet die Änderungsrate aus derselben Trendlinie ab, die K1 zeichnet (zeitgewichteter EWMA, Halbwertszeit sieben Tage), nicht aus den Rohgewichten.

Danach nach `../fitness-app.wiki/Domain-Model.md` spiegeln. **Nur die Datei schreiben, nichts im Wiki-Repo committen oder pushen** — das ist ein eigenes Git-Repo und passiert nach dem Merge.

- [ ] **Step 5: Status in CLAUDE.md nachziehen**

Im Abschnitt „Phase 5" festhalten: Plan 2c umgesetzt, welche Körpergraphen es jetzt gibt (K1–K5), dass `useBodyAnalysis` neben den Messwerten auch die Tageskalorien und die Fotos samt signierten Links lädt (drei Abfragen, alle paginiert), dass `BodyChartList` der einzige Ort ist, an dem ein Körpergraph eingebunden wird, dass `seitenweiseLaden` jetzt in `src/lib/analysis/paged-query.ts` und die Wochenfunktionen in `src/lib/analysis/woche.ts` liegen, und dass das Körper-Dashboard mit mindestens einem angehakten Graphen **drei** Abfragen feuert statt einer. Die Testzahl und die Bundle-Zahlen aus Step 3 mit aufnehmen. Den Satz „Plan 2b/2c noch zu schreiben" auf den neuen Stand bringen.

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
git add docs/domaenenmodell.md CLAUDE.md src/pages/BodyAnalysisPage.test.tsx
git commit -m "docs: Domaenenmodell und Status fuer Plan 2c nachziehen"
```

---

## Manual Verification (nach dem Merge, gegen die echte Instanz)

Keine Migration in diesem Plan — geprüft wird gegen `npm run dev`, das an derselben Produktions-Supabase hängt.

**Vorbereitung.** Für die Schritte 4, 5 und 7 braucht der Account eine Datenlage, die ein frisches Konto nicht hat: mindestens drei Wiegungen über drei Kalenderwochen, davon eine Woche mit Zunahme und eine mit Abnahme, Ernährungseinträge in mindestens zwei dieser Wochen und mindestens zwei Fotos, eines davon an einem Tag **ohne** Körpereintrag. Die synthetischen Zeilen aus der Plan-1-Verifikation (7 `body_metrics` vom 05.05.–27.08., 30 `food_entries` vom 18.–27.08.) decken K2, K3 und K4 teilweise ab, enthalten aber keinen Vorzeichenwechsel und keine Umfänge. Fehlende Fälle über `/body/entries` und `/body/photos` von Hand anlegen und **hinterher wieder löschen**.

1. `/body/analyse` öffnen: **fünf** Graphen stehen untereinander — Gewichtsverlauf, Umfänge im Verlauf, Änderungsrate, Gewicht über Kalorien, Fortschrittsfotos — jeder mit Titel und Häkchen „Auf dem Dashboard zeigen". Über den Graphen steht der Zeitraum-Umschalter, vorbelegt auf 90 Tage.
2. Zeitraum auf „30 Tage" und auf „alles" stellen: die Kurven werden kürzer beziehungsweise länger, die Fotoliste wird kürzer beziehungsweise länger. Im Netzwerk-Log stehen bei jedem Umschalten wieder alle drei Abfragen mit angepasstem `gte`-Filter (bei „alles" ohne Filter).
3. **K2 im Detail:** die fünf Linien sind einzeln unterscheidbar (fünf Farben, fünf Legendeneinträge mit „(cm)"). Mindestens einen sichtbaren Punkt per Hover gegen die Rohwerte auf `/body/entries` prüfen — Datum und Zentimeterwert müssen exakt übereinstimmen. Ein Tag, an dem nur gewogen wurde, darf keinen Knick erzeugen; er fehlt in K2 vollständig.
4. **K3 im Detail:** Über eine Woche mit Zunahme muss die Linie **über** der Nulllinie liegen, über einer Woche mit Abnahme darunter. Der Vorzeichenwechsel ist der eigentliche Prüfpunkt; hat der Account keine solche Woche, wird sie über `/body/entries` synthetisch angelegt (etwa 84,0 → 85,0 → 83,5 im Wochenabstand) und danach wieder gelöscht. Gegenrechnen: die Rate zwischen zwei Punkten muss ungefähr der Differenz der geglätteten Werte in K1 über dieselben sieben Tage entsprechen — nicht der Differenz der Rohgewichte.
5. **K4 im Detail:** eine Woche mit erkennbar niedrig erfasster Aufnahme suchen und prüfen, dass ihr Punkt weiter links (niedrigere kcal) und tiefer (negativere Änderung) liegt als der einer Woche mit hoher Aufnahme. Der Tooltip nennt kcal und kg. Eine Woche ganz ohne Ernährungseinträge darf **keinen** Punkt bei 0 kcal erzeugen — sie fehlt.
6. **K5 im Detail:** jedes Foto erscheint mit Datum und dem Gewicht **genau dieses Tages**, gegengeprüft an `/body/entries`. Das absichtlich an einem eintragslosen Tag hochgeladene Foto zeigt „kein Gewicht erfasst" und trotzdem das Bild — kein Absturz, keine leere Zeile. Neuestes Foto steht oben.
7. **Abfragezahl auf dem Dashboard.** Zwei Graphen anhaken (etwa K2 und K5), `/body` öffnen: beide stehen dort, **ohne** Zeitraum-Umschalter. Netzwerkanalyse: **drei** Tabellenabfragen (`body_metrics`, `food_entries`, `body_photos`) plus **einen** Storage-Aufruf `createSignedUrls`, sofern Fotos im Fenster liegen. **Das unterscheidet sich vom Training**, wo zwei Graphen zwei Abfragen bedeuten: der Körper-Hook holt immer alle drei Quellen, weil K4 die Ernährung und K5 die Fotos braucht — die Zahl hängt also nicht davon ab, *welche* Körpergraphen angehakt sind, sondern nur davon, *ob* einer angehakt ist. Auch mit nur K1 angehakt sind es dieselben drei plus gegebenenfalls die Signierung. Im Dev-Modus erscheint jede Abfrage doppelt (React-StrictMode); das ist kein Produktionsverhalten.
8. **Die harte Eigenschaft:** alle Körper-Häkchen abwählen, `/body` neu laden. Kein Graph, und **keine** Abfrage auf `body_metrics` aus der Analyse, keine auf `food_entries`, keine auf `body_photos`, kein `createSignedUrls`. Die reguläre `body_metrics`-Abfrage des Dashboards (`useBodyMetrics`, für die Werteliste oben) läuft weiter — sie gehört nicht zur Analyse und ist an ihrer absteigenden Sortierung erkennbar.
9. Ein Häkchen abwählen, Seite voll neu laden: der Graph bleibt weg (die Auswahl liegt in `profiles.analyse_auswahl`). Wieder anhaken bringt ihn zurück.
10. Netzwerkanalyse auf `/login`: kein Recharts-Chunk. Danach `/body/analyse` öffnen: die Chart-Chunks kommen mit 200. Konsole auf Fehler und Warnungen prüfen.

---

## Self-Review

**Spec-Abdeckung.** Der Umfang dieses Plans ist die Körper-Tabelle in Spec 2. K2 „Umfänge im Verlauf, die fünf Umfänge, je eine Linie" → Task 4 (`umfaengeVerlauf` liefert genau die fünf aus `MEASUREMENT_FIELDS` abgeleiteten Felder, die Komponente zeichnet je Feld eine `Line`). K3 „Änderungsrate, kg pro Woche aus der Trendlinie" → Task 5 (rechnet auf `gewichtsTrend`, dem Ausgang von K1, und normiert auf kg/Woche). K4 „Gewichtsänderung gegen mittlere Kalorienaufnahme je Woche" → Task 6 (beide Achsen sind Wochenaggregate: mittlere Tagesaufnahme der Woche gegen Änderung des Wochenmittelgewichts). K5 „vorhandene Fotos nach Datum, mit Gewicht beschriftet" → Task 7.

Aus Spec 3 („Datenfluss"): ein Hook je Bereich → Tasks 1–3; „K4 braucht die Tagessummen der Ernährung — `useBodyAnalysis` lädt sie mit" → Task 1; „K5 braucht die Fotozeilen samt signierten Links; `useBodyAnalysis` nutzt dafür dieselbe Signierung wie `useBodyPhotos`" → Task 2, gelöst über einen gemeinsamen Helfer. „Rechnen getrennt von Zeichnen" → jede Rechnung liegt in `body-charts.ts`, jede Komponente bekommt nur Daten. Registry als einzige Wahrheit → jeder Chart-Task meldet sich dort an, Task 8 Step 1 prüft, dass Anmeldung und Rendern nicht auseinanderlaufen.

Aus Spec 4: Analyse-Seite mit allen Graphen des Bereichs, Häkchen am Graphen, Dashboard fest 90 Tage ohne Umschalter, Reihenfolge der Registry → Task 3. **Die Übungsauswahl aus Spec 4 gilt ausdrücklich nur T2–T5** („T2 bis T5 beziehen sich auf je eine Übung"); K2–K5 brauchen kein Analogon und bekommen keins — geprüft, nicht angenommen. Deshalb nutzt kein Körpergraph den `vorspann`-Slot von `ChartFrame`.

Aus Spec 5: Leerzustände über `ChartFrame` in jeder Komponente, Linien ab zwei Punkten (K2, K3, K4 als Punktwolke mit derselben Begründung: ein Punkt zeigt keinen Zusammenhang), Listen ab einem (K5). Ladefehler gehören dem Bereich → die Meldung steht einmal oben auf der Seite; Tasks 1 und 2 ziehen den Kalorien- und den Foto-Ladefehler in dasselbe `error`, je mit eigenem Testfall. Lokale Tage → Global Constraint plus die `T00:00:00`-Regel, angewendet in Task 5 und 6. Aufwärmsätze und Epley betreffen den Körper nicht.

Aus Spec 6: die reinen Funktionen tragen die Testlast, mit Fixtures, bei denen eine naive Umsetzung anders herauskäme — Lücken in der Historie (K3 Test 2, K4 Test 3), ein einzelner Datenpunkt (K3 Test 4, K4 Test 5), ein Tag ohne Wert innerhalb des Zeitraums (K2 Test 2, K5 Test 2/4).

**Nicht in diesem Plan:** E2–E6 (Plan 2b) und alles unter `nutrition-charts.ts` beziehungsweise `use-nutrition-analysis.ts`; `kalorienJeTag` wird nur importiert.

**Platzhalter-Durchgang.** Kein „TBD", kein „analog zu Task N", kein „Fehlerbehandlung ergänzen". Jeder Code-Schritt trägt seinen Code; die drei Umbauten an bestehenden Dateien (`use-training-analysis.ts` in Task 1, `training-charts.ts` in Task 6, `PersonalRecordsList.tsx` in Task 7) nennen die zu löschenden Stellen wörtlich und den Test, der die Verschiebung absichert. Beim Durchgang korrigiert: Task 3 Step 6 verwies zunächst nur auf „den lazy-Import entfernen", ohne zu sagen, dass dann auch `lazy, Suspense` aus dem React-Import fällt und `K1` ungenutzt wird — beides steht jetzt da. Task 7 Step 1 hatte den Umzug von `datumsLabel` ohne Testlauf; der Lauf gegen `PersonalRecordsList.test.tsx` ist ergänzt.

**Typkonsistenz.** `seitenweiseLaden<T>` hat in `paged-query.ts`, in `use-training-analysis.ts` und in `use-body-analysis.ts` dieselbe Signatur. `TagesPunkt` (`{ tag, kalorien }`) kommt aus `nutrition-charts.ts` und heißt im Hook, in `BodyChartList` und in `WeightVsCaloriesChart` gleich. `AnalysisPhoto` (`{ id, datum, pfad, url }`) wird in Task 2 eingeführt und in Task 3 und 7 unter demselben Namen konsumiert; die reine Funktion `fotoZeitleiste` nimmt bewusst die schmalere Strukturform (`{ id, datum, url }`), die `AnalysisPhoto` erfüllt. `UmfangFeld`/`UMFANG_FIELDS` entstehen in Task 4 und werden nur dort benutzt. `BodyChartListProps` heißt in Definition (Task 3) und in allen vier Erweiterungen gleich, und die vier `case`-Zweige reichen genau die Props, die die jeweilige Komponente deklariert: K2 `rows`, K3 `rows`, K4 `rows`+`kalorien`, K5 `fotos`+`rows`. `TAG_MS` liegt bereits als Modulkonstante in `body-charts.ts` (aus Plan 1) und wird von `aenderungsrate` und `WOCHE_MS` mitbenutzt — keine zweite Definition. Beim Durchgang korrigiert: `WOCHE_MS` stand zuerst in Task 6 als eigene `86_400_000 * 7`-Zahl, jetzt aus `TAG_MS` abgeleitet.

**Offene Entscheidung für den Reviewer.** `useBodyAnalysis` lädt alle drei Quellen, sobald **irgendein** Körpergraph angeheftet ist — ein Dashboard mit nur K1 zahlt zwei überflüssige Abfragen. Begründet oben unter „Vorüberlegungen"; wer das anders sieht, müsste dem Hook die angehakten IDs geben, und damit wüsste er, welcher Graph welche Tabelle braucht. Die Manual Verification (Schritt 7) hält die Zahl ausdrücklich fest, damit sie nicht unbemerkt wächst.

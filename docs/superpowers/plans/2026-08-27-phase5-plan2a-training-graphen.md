# Phase 5, Plan 2a – Trainingsgraphen T2 bis T8

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Trainingsbereich bekommt seine restlichen sieben Graphen (T2–T8), und die Analyse-Seite wie das Dashboard rendern die Graphen aus der Registry statt einzeln verdrahtet — mit genau einer Datenabfrage je Seite.

**Architecture:** Wie in Plan 1: reine Rechenfunktionen unter `src/lib/analysis/`, ein zeitraum-bezogener Hook je Bereich, Graph-Komponenten ohne eigenen Datenzugriff. Neu ist, dass `useTrainingAnalysis` neben den Sessions auch deren Sätze samt Übung und Muskelgruppen lädt, und dass eine Liste (`TrainingChartList`) die Graphen anhand ihrer IDs rendert — dieselbe Liste bedient Analyse-Seite (alle IDs des Bereichs, mit Häkchen und Übungsauswahl) und Dashboard (nur die angehakten IDs, ohne Bedienelemente).

**Tech Stack:** React + Vite + TypeScript, Supabase, Recharts, Vitest + Testing Library. Keine neue Abhängigkeit.

**Spec:** `docs/superpowers/specs/2026-08-24-phase5-analysebereich-design.md`

**Vorgänger:** `docs/superpowers/plans/2026-08-24-phase5-plan1-fundament.md` (gemerged, PR #27, manuell verifiziert am 27.08.2026)

**Geschwisterpläne:** Plan 2b (Ernährung, E2–E6) und Plan 2c (Körper, K2–K5) folgen und übernehmen das Listen-Muster aus Task 2 für ihren Bereich.

## Global Constraints

- **Keine Drittanbieter-Namen** aus Fitness/Ernährung in Code, Kommentaren, Commit-Messages oder Docs.
- **Keine neue Abhängigkeit.** Alles wird mit React, Recharts und der Standardbibliothek gebaut.
- Sprache im UI: Deutsch. Dateinamen kebab-case, Komponenten PascalCase.
- `supabase-js` wirft nicht — jeder Lesevorgang prüft `error` aus dem Ergebnis und meldet sichtbar. Rohe Datenbankmeldungen erscheinen nie im UI.
- Jeder neue oder geänderte Hook trägt den `requestId`-Guard gegen Antworten in falscher Reihenfolge.
- Tage sind **lokale** Tage, nie UTC (`localDay` aus `src/lib/local-time.ts`).
- **Aufwärmsätze** (`ist_aufwaermsatz = true`) zählen in keiner Volumen-, Kraft- oder Rekordrechnung mit.
- **Epley:** `1RM = Gewicht × (1 + Wiederholungen / 30)`. Sätze ohne Gewicht oder ohne Wiederholungen fallen aus der Rechnung, nicht als 0.
- Leerzustand: Linien ab **zwei** Punkten, Balken und Listen ab **einem**. Sonst der Satz aus `ChartFrame`, nie leere Achsen.
- Zeitraum-Vorgabe auf den Analyse-Seiten: **90 Tage**. Dashboards: **fest 90 Tage, ohne Umschalter**.
- **Ein Dashboard ohne angehakten Graphen feuert keine Analyseabfrage.** Diese Eigenschaft wurde am 27.08.2026 gegen Produktion verifiziert und darf nicht verloren gehen.
- Graph-Tests prüfen **gezeichnete Marken**, nie Achsentexte (Recharts überspringt Ticks je nach Layout, in jsdom anders als im Browser). Balken: Anzahl der Rechtecke. Linien: `M`/`L`/`C`-Befehle im `d` der Kurve.
- Jedes `findBy*` hinter einer `React.lazy`-Grenze braucht `{ timeout: 5000 }`.
- Nach jedem Task: `npm run lint`, `npx tsc -b --noEmit`, `npm test -- --run` müssen grün sein.
- Commit-Messages auf Deutsch **ohne Umlaute**, im Stil der bestehenden Historie.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `src/hooks/use-training-analysis.ts` | erweitert: Sessions **und** deren Sätze samt Übung im Zeitraum |
| `src/lib/analysis/chart-titles.ts` | erweitert: sieben neue Titel |
| `src/lib/analysis/registry.ts` | erweitert: T2–T8 angemeldet |
| `src/lib/analysis/training-charts.ts` | erweitert: alle Rechenfunktionen der Trainingsgraphen |
| `src/components/charts/TrainingChartList.tsx` | rendert die Graphen eines ID-Satzes, lazy, mit oder ohne Bedienelemente |
| `src/components/charts/ExerciseSelect.tsx` | Übungsauswahl über T2–T5 |
| `src/components/charts/StrengthChart.tsx` | T2 Kraftverlauf (1RM) |
| `src/components/charts/ExerciseVolumeChart.tsx` | T3 Volumen je Übung |
| `src/components/charts/BestSetWeightChart.tsx` | T4 bestes Satzgewicht |
| `src/components/charts/RepsPerSetChart.tsx` | T5 Wiederholungen je Satz |
| `src/components/charts/MuscleVolumeChart.tsx` | T6 Volumen je Muskelgruppe |
| `src/components/charts/SessionLoadChart.tsx` | T7 Dauer und Kalorien je Session |
| `src/components/charts/PersonalRecordsList.tsx` | T8 persönliche Rekorde (Liste, ohne Recharts) |
| `src/pages/TrainingAnalysisPage.tsx` | rendert alle Trainingsgraphen über die Liste |
| `src/pages/TrainingPage.tsx` | rendert die angehakten Trainingsgraphen über die Liste, eine Abfrage |
| `docs/domaenenmodell.md` | fachliche Notiz zur Satz-Abfrage der Analyse |

---

## Task 1: Sätze in den Trainings-Hook holen

**Files:**
- Modify: `src/hooks/use-training-analysis.ts`
- Test: `src/hooks/use-training-analysis.test.ts`

**Interfaces:**
- Consumes: `rangeStart`, `Zeitraum` aus `src/lib/analysis/zeitraum.ts`; `AnalysisSession` (bereits vorhanden)
- Produces:
  ```ts
  export type AnalysisSet = {
    id: string
    workout_session_id: string
    exercise_id: string
    exercise_name: string
    muskelgruppen: string[]
    satz_nummer: number
    gewicht: number | null
    wiederholungen: number | null
    ist_aufwaermsatz: boolean
  }
  // useTrainingAnalysis(userId, zeitraum) -> { sessions, sets, loading, error }
  ```

Sechs der sieben neuen Graphen rechnen auf Sätzen. Sie werden **hier** geladen, in einer zweiten Abfrage nach den Sessions, nicht je Graph: acht Graphen mit eigenem Zugriff wären acht Abfragen für dieselben Zeilen.

Die Sätze werden über `workout_session_id in (…)` geholt statt über einen `!inner`-Join mit Filter auf der Session — die IDs liegen nach der ersten Abfrage ohnehin vor, und ein eingebetteter Filter ist in PostgREST leicht falsch zu schreiben und im Test kaum zu prüfen. Ohne Sessions im Zeitraum entfällt die zweite Abfrage ganz.

- [ ] **Step 1: Write the failing test**

Ans Ende von `src/hooks/use-training-analysis.test.ts` einfügen. Der bestehende Mock kennt nur einen Builder für alle Tabellen; er wird um `in` erweitert und liefert je Tabelle ein eigenes Ergebnis.

Zuerst den `beforeEach`-Block der Datei ersetzen:

```ts
type Ergebnis = { data: unknown; error: unknown }
let ergebnis: Ergebnis
let satzErgebnis: Ergebnis
const inFilter = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  ergebnis = { data: [], error: null }
  satzErgebnis = { data: [], error: null }
  select.mockImplementation((table: string) => {
    const antwort = table === 'workout_session_sets' ? () => satzErgebnis : () => ergebnis
    const builder = {
      eq: (...args: unknown[]) => {
        eq(...args)
        return builder
      },
      gte: (...args: unknown[]) => {
        gte(...args)
        return builder
      },
      in: (...args: unknown[]) => {
        inFilter(...args)
        return builder
      },
      order: (...args: unknown[]) => {
        order(...args)
        return Promise.resolve(antwort())
      },
    }
    return builder
  })
})
```

Dann die neuen Fälle:

```ts
describe('useTrainingAnalysis sets', () => {
  const session = {
    id: 's1',
    gestartet_am: '2026-08-17T18:00:00Z',
    beendet_am: '2026-08-17T19:00:00Z',
    gesamt_kalorien: 300,
  }

  it('loads the sets of the loaded sessions and flattens the exercise', async () => {
    ergebnis = { data: [session], error: null }
    satzErgebnis = {
      data: [
        {
          id: 'x1',
          workout_session_id: 's1',
          exercise_id: 'e1',
          satz_nummer: 1,
          gewicht: 80,
          wiederholungen: 8,
          ist_aufwaermsatz: false,
          exercises: { name: 'Bankdruecken', muskelgruppen_primaer: ['brust'] },
        },
      ],
      error: null,
    }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(inFilter).toHaveBeenCalledWith('workout_session_id', ['s1'])
    expect(result.current.sets).toEqual([
      {
        id: 'x1',
        workout_session_id: 's1',
        exercise_id: 'e1',
        exercise_name: 'Bankdruecken',
        muskelgruppen: ['brust'],
        satz_nummer: 1,
        gewicht: 80,
        wiederholungen: 8,
        ist_aufwaermsatz: false,
      },
    ])
  })

  it('does not query sets when the range holds no session', async () => {
    // Ohne Sessions gibt es keine IDs zu filtern; `in` mit leerer Liste waere
    // eine Abfrage, die garantiert nichts liefert.
    ergebnis = { data: [], error: null }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(inFilter).not.toHaveBeenCalled()
    expect(result.current.sets).toEqual([])
  })

  it('survives a set whose exercise was deleted', async () => {
    // Die Uebungstabelle ist geteilt; eine geloeschte Uebung darf den Graphen
    // nicht mit `undefined.name` zerlegen.
    ergebnis = { data: [session], error: null }
    satzErgebnis = {
      data: [
        {
          id: 'x1',
          workout_session_id: 's1',
          exercise_id: 'e1',
          satz_nummer: 1,
          gewicht: 80,
          wiederholungen: 8,
          ist_aufwaermsatz: false,
          exercises: null,
        },
      ],
      error: null,
    }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sets[0].exercise_name).toBe('Unbekannte Uebung')
    expect(result.current.sets[0].muskelgruppen).toEqual([])
  })

  it('reports a failed set load like a failed session load', async () => {
    ergebnis = { data: [session], error: null }
    satzErgebnis = { data: null, error: { message: 'boom' } }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/hooks/use-training-analysis.test.ts`
Expected: FAIL — `result.current.sets` ist `undefined`.

- [ ] **Step 3: Write the implementation**

`src/hooks/use-training-analysis.ts` vollständig ersetzen:

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

export type AnalysisSet = {
  id: string
  workout_session_id: string
  exercise_id: string
  exercise_name: string
  muskelgruppen: string[]
  satz_nummer: number
  gewicht: number | null
  wiederholungen: number | null
  ist_aufwaermsatz: boolean
}

type RawSet = {
  id: string
  workout_session_id: string
  exercise_id: string
  satz_nummer: number
  gewicht: number | null
  wiederholungen: number | null
  ist_aufwaermsatz: boolean
  exercises: { name: string; muskelgruppen_primaer: string[] | null } | null
}

const COLUMNS = 'id, gestartet_am, beendet_am, gesamt_kalorien'
const SET_COLUMNS =
  'id, workout_session_id, exercise_id, satz_nummer, gewicht, wiederholungen, ist_aufwaermsatz, exercises(name, muskelgruppen_primaer)'

/** Ein geloeschter Uebungseintrag laesst den Satz stehen; er verliert nur seinen Namen. */
const UNBEKANNTE_UEBUNG = 'Unbekannte Uebung'

/**
 * One query per area, not one per chart: a page shows up to eight training
 * charts, and each of them would otherwise fetch the same rows again.
 *
 * Die Saetze kommen in einer zweiten Abfrage ueber die IDs der geladenen
 * Sessions. Das ist ein Roundtrip mehr als ein eingebetteter Join, dafuer eine
 * Abfrage, deren Filter man lesen und pruefen kann — und sie entfaellt, wenn im
 * Zeitraum gar nicht trainiert wurde.
 */
export function useTrainingAnalysis(userId: string, zeitraum: Zeitraum) {
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [sets, setSets] = useState<AnalysisSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    let query = supabase.from('workout_sessions').select(COLUMNS).eq('user_id', userId)
    const start = rangeStart(zeitraum)
    if (start) query = query.gte('gestartet_am', start)
    const { data, error: loadError } = await query.order('gestartet_am', { ascending: true })
    if (current !== requestId.current) return

    const geladen = (data ?? []) as unknown as AnalysisSession[]
    let satzFehler = false
    let geladeneSaetze: AnalysisSet[] = []

    if (geladen.length > 0) {
      const { data: satzDaten, error: satzLadeFehler } = await supabase
        .from('workout_session_sets')
        .select(SET_COLUMNS)
        .in(
          'workout_session_id',
          geladen.map((session) => session.id),
        )
        .order('satz_nummer', { ascending: true })
      if (current !== requestId.current) return
      satzFehler = Boolean(satzLadeFehler)
      geladeneSaetze = ((satzDaten ?? []) as unknown as RawSet[]).map((row) => ({
        id: row.id,
        workout_session_id: row.workout_session_id,
        exercise_id: row.exercise_id,
        exercise_name: row.exercises?.name ?? UNBEKANNTE_UEBUNG,
        muskelgruppen: row.exercises?.muskelgruppen_primaer ?? [],
        satz_nummer: row.satz_nummer,
        gewicht: row.gewicht,
        wiederholungen: row.wiederholungen,
        ist_aufwaermsatz: row.ist_aufwaermsatz,
      }))
    }

    setSessions(geladen)
    setSets(geladeneSaetze)
    setError(Boolean(loadError) || satzFehler)
    setLoading(false)
  }, [userId, zeitraum])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { sessions, sets, loading, error }
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test -- --run src/hooks/use-training-analysis.test.ts`
Expected: PASS, alle bisherigen Fälle inklusive.

- [ ] **Step 5: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/hooks/use-training-analysis.ts src/hooks/use-training-analysis.test.ts
git commit -m "feat: Trainingsanalyse laedt die Saetze des Zeitraums mit"
```

---

## Task 2: Graphen aus der Registry rendern

**Files:**
- Create: `src/components/charts/TrainingChartList.tsx`
- Create: `src/components/charts/TrainingChartList.test.tsx`
- Modify: `src/pages/TrainingAnalysisPage.tsx`
- Modify: `src/pages/TrainingPage.tsx`
- Test: `src/pages/TrainingPage.test.tsx` (bestehende Fälle müssen grün bleiben)

**Interfaces:**
- Consumes: `useTrainingAnalysis` (Task 1), `chartsFor`, `T1` aus der Registry, `useChartSelection`, `ChartPicker`
- Produces:
  ```ts
  export type TrainingChartListProps = {
    ids: string[]
    sessions: AnalysisSession[]
    sets: AnalysisSet[]
    /** Gesetzt auf der Analyse-Seite: zeigt Haekchen und Uebungsauswahl. */
    auswahl?: ReturnType<typeof useChartSelection>
  }
  export default function TrainingChartList(props: TrainingChartListProps): JSX.Element
  ```

Heute verdrahtet jede Seite jeden Graphen einzeln, und jeder Dashboard-Graph ruft den Bereichs-Hook selbst auf. Mit acht Graphen wären das acht identische Abfragen auf einer Seite — genau das, was die Spec mit „ein Hook je Bereich" verhindern will. Die Liste dreht das um: der Hook läuft einmal auf der Seite, die Liste bekommt die Daten und rendert die Graphen zu den IDs, die sie bekommt.

**Die Eigenschaft „Dashboard ohne Häkchen fragt nichts ab" bleibt erhalten**, weil das Dashboard die Datenkomponente nur rendert, wenn mindestens eine Trainings-ID angehakt ist.

- [ ] **Step 1: Write the failing test**

Create `src/components/charts/TrainingChartList.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TrainingChartList from './TrainingChartList'
import { T1 } from '../../lib/analysis/registry'

const session = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00Z`,
  beendet_am: `${tag}T19:00:00Z`,
  gesamt_kalorien: 300,
})

const auswahl = {
  auswahl: [T1],
  istGewaehlt: (id: string) => id === T1,
  umschalten: vi.fn(),
  fehler: '',
}

describe('TrainingChartList', () => {
  it('renders the charts of the given ids', async () => {
    render(
      <TrainingChartList
        ids={[T1]}
        sessions={[session('s1', '2026-08-17'), session('s2', '2026-08-24')]}
        sets={[]}
      />,
    )
    // timeout: die Graphen haengen hinter React.lazy.
    expect(await screen.findByText('Trainingsfrequenz', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('renders no chart for an id it does not know', async () => {
    // parseAuswahl verwirft unbekannte IDs bereits, aber die Liste darf an einer
    // durchgerutschten ID nicht abstuerzen.
    const { container } = render(
      <TrainingChartList ids={['T99']} sessions={[session('s1', '2026-08-17')]} sets={[]} />,
    )
    expect(container.querySelector('section')).toBeNull()
  })

  it('shows the checkbox only when a selection is passed', async () => {
    const { rerender } = render(
      <TrainingChartList ids={[T1]} sessions={[session('s1', '2026-08-17')]} sets={[]} />,
    )
    await screen.findByText('Trainingsfrequenz', {}, { timeout: 5000 })
    expect(screen.queryByRole('checkbox')).toBeNull()

    rerender(
      <TrainingChartList
        ids={[T1]}
        sessions={[session('s1', '2026-08-17')]}
        sets={[]}
        auswahl={auswahl}
      />,
    )
    expect(await screen.findByRole('checkbox', {}, { timeout: 5000 })).toBeChecked()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/TrainingChartList.test.tsx`
Expected: FAIL — Modul `./TrainingChartList` existiert nicht.

- [ ] **Step 3: Write the implementation**

Create `src/components/charts/TrainingChartList.tsx`:

```tsx
import { lazy, Suspense, type ReactNode } from 'react'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import ChartPicker, { type useChartSelection } from './ChartPicker'
import { T1 } from '../../lib/analysis/registry'

// Lazy an dieser einen Stelle: die Liste ist der einzige Ort, an dem ein
// Trainingsgraph noch eingebunden wird — Dashboard wie Analyse-Seite gehen
// hierdurch. Recharts bleibt damit aus dem Start-Chunk.
const TrainingFrequencyChart = lazy(() => import('./TrainingFrequencyChart'))

export type TrainingChartListProps = {
  ids: string[]
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  /** Gesetzt auf der Analyse-Seite: zeigt Haekchen und Uebungsauswahl. */
  auswahl?: ReturnType<typeof useChartSelection>
}

export default function TrainingChartList({
  ids,
  sessions,
  sets,
  auswahl,
}: TrainingChartListProps) {
  const analyse = auswahl != null

  function graph(id: string): ReactNode {
    const picker = auswahl ? <ChartPicker id={id} auswahl={auswahl} /> : undefined
    switch (id) {
      case T1:
        return <TrainingFrequencyChart sessions={sessions} picker={picker} />
      default:
        // Eine ID ohne Komponente ist kein Fehler, den der Nutzer sehen muss:
        // parseAuswahl haelt Unbekanntes schon fern, hier bleibt nur die Luecke.
        return null
    }
  }

  // `analyse` steuert spaeter die Uebungsauswahl ueber T2 bis T5; bis Task 3
  // wird der Wert nur weitergereicht.
  void analyse

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

Run: `npm test -- --run src/components/charts/TrainingChartList.test.tsx`
Expected: PASS

- [ ] **Step 5: Analyse-Seite auf die Liste umstellen**

`src/pages/TrainingAnalysisPage.tsx` — die Funktion `Analyse` ersetzen und die Importe anpassen:

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useTrainingAnalysis } from '../hooks/use-training-analysis'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import { useChartSelection } from '../components/charts/ChartPicker'
import TrainingChartList from '../components/charts/TrainingChartList'
import { chartsFor } from '../lib/analysis/registry'
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
  const { sessions, sets, loading, error } = useTrainingAnalysis(userId, zeitraum)
  const auswahl = useChartSelection(userId)
  // Reihenfolge ist die der Registry — kein Umsortieren, wie in der Spec.
  const ids = chartsFor('training').map((chart) => chart.id)

  return (
    <div>
      <h1>Analyse</h1>
      <ZeitraumSwitch wert={zeitraum} onChange={setZeitraum} />
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <p>Lädt…</p>
      ) : (
        <TrainingChartList ids={ids} sessions={sessions} sets={sets} auswahl={auswahl} />
      )}
      <Link to="/training">Zurück zum Trainingsbereich</Link>
    </div>
  )
}
```

- [ ] **Step 6: Dashboard auf die Liste umstellen**

In `src/pages/TrainingPage.tsx` den `lazy`-Import von `TrainingFrequencyChart` und die Komponente `DashboardTrainingFrequency` entfernen, den bedingten Aufruf ersetzen. Neue Fassung der beiden Stellen:

```tsx
// oben, statt des lazy-Imports:
import TrainingChartList from '../components/charts/TrainingChartList'
import { chartsFor } from '../lib/analysis/registry'
```

```tsx
// im Dashboard, statt {auswahl.istGewaehlt(T1) && <DashboardTrainingFrequency … />}:
      <DashboardTrainingCharts userId={userId} auswahl={auswahl.auswahl} />
```

```tsx
/**
 * Rendert die angehakten Trainingsgraphen — und faellt vorher komplett aus,
 * wenn keiner angehakt ist: der Hook steckt in der Kindkomponente, ein leeres
 * Dashboard soll keine Abfrage ausloesen.
 */
function DashboardTrainingCharts({ userId, auswahl }: { userId: string; auswahl: string[] }) {
  const bereichsIds = new Set(chartsFor('training').map((chart) => chart.id))
  const ids = auswahl.filter((id) => bereichsIds.has(id))
  if (ids.length === 0) return null
  return <DashboardTrainingChartsData userId={userId} ids={ids} />
}

function DashboardTrainingChartsData({ userId, ids }: { userId: string; ids: string[] }) {
  const { sessions, sets, loading, error } = useTrainingAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return <TrainingChartList ids={ids} sessions={sessions} sets={sets} />
}
```

Der Import von `T1` in `TrainingPage.tsx` entfällt, falls er sonst nirgends benutzt wird — der Lint-Lauf zeigt es.

- [ ] **Step 7: Run the full suite**

Run: `npm test -- --run`
Expected: PASS. Die bestehenden Fälle in `TrainingPage.test.tsx` und `TrainingAnalysisPage.test.tsx` prüfen weiter dasselbe Verhalten; wenn einer davon auf die entfernte Komponente zeigt, wird er auf die Liste umgeschrieben, nicht gelöscht.

- [ ] **Step 8: Commit**

```bash
npm run lint
npx tsc -b --noEmit
git add src/components/charts/TrainingChartList.tsx src/components/charts/TrainingChartList.test.tsx src/pages/TrainingAnalysisPage.tsx src/pages/TrainingPage.tsx src/pages/TrainingPage.test.tsx src/pages/TrainingAnalysisPage.test.tsx
git commit -m "refactor: Trainingsgraphen aus einer Liste rendern, eine Abfrage je Seite"
```

---

## Task 3: Übungsauswahl

**Files:**
- Modify: `src/lib/analysis/training-charts.ts`
- Test: `src/lib/analysis/training-charts.test.ts`
- Create: `src/components/charts/ExerciseSelect.tsx`
- Create: `src/components/charts/ExerciseSelect.test.tsx`

**Interfaces:**
- Consumes: `AnalysisSet` (Task 1)
- Produces:
  ```ts
  export type UebungsOption = { exercise_id: string; name: string }
  export function uebungenImZeitraum(sets: AnalysisSet[]): UebungsOption[]
  export function haeufigsteUebung(sets: AnalysisSet[]): string | null
  export default function ExerciseSelect(props: {
    optionen: UebungsOption[]
    wert: string | null
    onChange: (exerciseId: string) => void
  }): JSX.Element | null
  ```

T2 bis T5 zeigen je eine Übung. Vorbelegt ist die im Zeitraum am häufigsten trainierte — gezählt über **Arbeitssätze**, weil sonst eine Übung gewinnen kann, die nur oft aufgewärmt wurde.

- [ ] **Step 1: Write the failing test**

Ans Ende von `src/lib/analysis/training-charts.test.ts`:

```ts
import { haeufigsteUebung, uebungenImZeitraum } from './training-charts'

const satz = (
  exercise_id: string,
  name: string,
  extra: Partial<{ ist_aufwaermsatz: boolean; gewicht: number | null; wiederholungen: number | null }> = {},
) => ({
  id: `${exercise_id}-${Math.random()}`,
  workout_session_id: 's1',
  exercise_id,
  exercise_name: name,
  muskelgruppen: [],
  satz_nummer: 1,
  gewicht: 80,
  wiederholungen: 8,
  ist_aufwaermsatz: false,
  ...extra,
})

describe('uebungenImZeitraum', () => {
  it('lists every trained exercise once, alphabetically', () => {
    expect(
      uebungenImZeitraum([
        satz('e2', 'Kniebeuge'),
        satz('e1', 'Bankdruecken'),
        satz('e2', 'Kniebeuge'),
      ]),
    ).toEqual([
      { exercise_id: 'e1', name: 'Bankdruecken' },
      { exercise_id: 'e2', name: 'Kniebeuge' },
    ])
  })

  it('keeps an exercise that was only warmed up', () => {
    // Fuer die Auswahlliste zaehlt, dass die Uebung vorkam.
    expect(uebungenImZeitraum([satz('e1', 'Bankdruecken', { ist_aufwaermsatz: true })])).toEqual([
      { exercise_id: 'e1', name: 'Bankdruecken' },
    ])
  })
})

describe('haeufigsteUebung', () => {
  it('picks the exercise with the most working sets', () => {
    expect(
      haeufigsteUebung([
        satz('e1', 'Bankdruecken'),
        satz('e2', 'Kniebeuge'),
        satz('e2', 'Kniebeuge'),
      ]),
    ).toBe('e2')
  })

  it('does not let warm-up sets decide', () => {
    // Sonst gewinnt die Uebung, die man am laengsten aufwaermt.
    expect(
      haeufigsteUebung([
        satz('e1', 'Bankdruecken'),
        satz('e1', 'Bankdruecken'),
        satz('e2', 'Kniebeuge', { ist_aufwaermsatz: true }),
        satz('e2', 'Kniebeuge', { ist_aufwaermsatz: true }),
        satz('e2', 'Kniebeuge', { ist_aufwaermsatz: true }),
      ]),
    ).toBe('e1')
  })

  it('returns null without sets', () => {
    expect(haeufigsteUebung([])).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: FAIL — `uebungenImZeitraum is not a function`.

- [ ] **Step 3: Write the implementation**

Ans Ende von `src/lib/analysis/training-charts.ts`:

```ts
import type { AnalysisSet } from '../../hooks/use-training-analysis'

export type UebungsOption = { exercise_id: string; name: string }

/** Jede im Zeitraum vorkommende Uebung, alphabetisch — die Auswahlliste ueber T2 bis T5. */
export function uebungenImZeitraum(sets: AnalysisSet[]): UebungsOption[] {
  const nameJeId = new Map<string, string>()
  for (const satz of sets) nameJeId.set(satz.exercise_id, satz.exercise_name)
  return [...nameJeId.entries()]
    .map(([exercise_id, name]) => ({ exercise_id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

/**
 * Die Uebung mit den meisten **Arbeitssaetzen** — die Vorbelegung der Auswahl.
 *
 * Aufwaermsaetze zaehlen nicht mit: sonst steht der Graph beim Aufwaermen der
 * Kniebeuge statt bei der Uebung, um die es ging.
 */
export function haeufigsteUebung(sets: AnalysisSet[]): string | null {
  const anzahl = new Map<string, number>()
  for (const satz of sets) {
    if (satz.ist_aufwaermsatz) continue
    anzahl.set(satz.exercise_id, (anzahl.get(satz.exercise_id) ?? 0) + 1)
  }
  let beste: string | null = null
  let hoechste = 0
  for (const [id, zahl] of anzahl) {
    if (zahl > hoechste) {
      hoechste = zahl
      beste = id
    }
  }
  return beste
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for the select**

Create `src/components/charts/ExerciseSelect.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExerciseSelect from './ExerciseSelect'

const optionen = [
  { exercise_id: 'e1', name: 'Bankdruecken' },
  { exercise_id: 'e2', name: 'Kniebeuge' },
]

describe('ExerciseSelect', () => {
  it('shows the chosen exercise and reports a change', async () => {
    const onChange = vi.fn()
    render(<ExerciseSelect optionen={optionen} wert="e1" onChange={onChange} />)

    const feld = screen.getByLabelText('Übung')
    expect(feld).toHaveValue('e1')
    await userEvent.selectOptions(feld, 'e2')
    expect(onChange).toHaveBeenCalledWith('e2')
  })

  it('renders nothing for a single exercise', () => {
    // Eine Auswahl mit genau einem Eintrag ist kein Bedienelement, sondern Zierrat.
    const { container } = render(
      <ExerciseSelect optionen={[optionen[0]]} wert="e1" onChange={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/ExerciseSelect.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the select**

Create `src/components/charts/ExerciseSelect.tsx`:

```tsx
import { useId } from 'react'
import type { UebungsOption } from '../../lib/analysis/training-charts'

/** Uebungsauswahl ueber den uebungsbezogenen Graphen T2 bis T5. */
export default function ExerciseSelect({
  optionen,
  wert,
  onChange,
}: {
  optionen: UebungsOption[]
  wert: string | null
  onChange: (exerciseId: string) => void
}) {
  // useId: die Seite zeigt vier dieser Felder, feste IDs waeren vierfach vergeben.
  const id = useId()
  if (optionen.length < 2) return null
  return (
    <p>
      <label htmlFor={id}>Übung</label>
      <select id={id} value={wert ?? ''} onChange={(event) => onChange(event.target.value)}>
        {optionen.map((option) => (
          <option key={option.exercise_id} value={option.exercise_id}>
            {option.name}
          </option>
        ))}
      </select>
    </p>
  )
}
```

- [ ] **Step 8: Run test to verify it passes and commit**

```bash
npm test -- --run src/components/charts/ExerciseSelect.test.tsx
npm run lint
npx tsc -b --noEmit
git add src/lib/analysis/training-charts.ts src/lib/analysis/training-charts.test.ts src/components/charts/ExerciseSelect.tsx src/components/charts/ExerciseSelect.test.tsx
git commit -m "feat: Uebungsauswahl fuer die uebungsbezogenen Graphen"
```

---

## Task 4: T2 Kraftverlauf je Übung

**Files:**
- Modify: `src/lib/analysis/training-charts.ts`, `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/components/charts/TrainingChartList.tsx`
- Create: `src/components/charts/StrengthChart.tsx`, `src/components/charts/StrengthChart.test.tsx`
- Test: `src/lib/analysis/training-charts.test.ts`

**Interfaces:**
- Consumes: `AnalysisSession`, `AnalysisSet`, `uebungenImZeitraum`, `haeufigsteUebung`, `ExerciseSelect`, `localDay`
- Produces:
  ```ts
  export function epley1RM(gewicht: number | null, wiederholungen: number | null): number | null
  export type UebungsPunkt = { tag: string; wert: number }
  export function kraftverlauf(
    sessions: AnalysisSession[], sets: AnalysisSet[], exerciseId: string,
  ): UebungsPunkt[]
  export const KRAFTVERLAUF_TITEL = 'Kraftverlauf'
  export const T2 = 'T2'
  ```

Ein steigendes 1RM ist der eigentliche Fortschrittsbeleg im Krafttraining: mal fünf schwere, mal zehn leichte Wiederholungen sind ohne Umrechnung nicht vergleichbar. Epley normiert beides auf dieselbe Zahl.

- [ ] **Step 1: Write the failing test**

Ans Ende von `src/lib/analysis/training-charts.test.ts`:

```ts
import { epley1RM, kraftverlauf } from './training-charts'

const sitzung = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00+02:00`,
  beendet_am: `${tag}T19:00:00+02:00`,
  gesamt_kalorien: 300,
})

const satzIn = (
  sessionId: string,
  exercise_id: string,
  gewicht: number | null,
  wiederholungen: number | null,
  ist_aufwaermsatz = false,
) => ({
  id: `${sessionId}-${exercise_id}-${gewicht}-${wiederholungen}-${ist_aufwaermsatz}`,
  workout_session_id: sessionId,
  exercise_id,
  exercise_name: 'Bankdruecken',
  muskelgruppen: ['brust'],
  satz_nummer: 1,
  gewicht,
  wiederholungen,
  ist_aufwaermsatz,
})

describe('epley1RM', () => {
  it('computes weight x (1 + reps / 30)', () => {
    expect(epley1RM(100, 0)).toBe(100)
    expect(epley1RM(100, 30)).toBe(200)
  })

  it('returns null for a set without weight or without reps', () => {
    // Nicht 0: ein unvollstaendiger Satz ist keine Leistung von null, sondern
    // keine Angabe. Als 0 wuerde er die Bestleistung der Session verschweigen.
    expect(epley1RM(null, 8)).toBeNull()
    expect(epley1RM(80, null)).toBeNull()
  })
})

describe('kraftverlauf', () => {
  it('takes the best estimated 1RM per session', () => {
    const punkte = kraftverlauf(
      [sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')],
      [
        satzIn('s1', 'e1', 80, 8), // 101,3
        satzIn('s1', 'e1', 90, 5), // 105,0 -> bester Satz
        satzIn('s2', 'e1', 95, 5), // 110,8
      ],
      'e1',
    )
    expect(punkte).toEqual([
      { tag: '2026-08-17', wert: 105 },
      { tag: '2026-08-24', wert: 110.8 },
    ])
  })

  it('ignores warm-up sets', () => {
    // Ein Aufwaermsatz mit hoher Wiederholungszahl kann das geschaetzte 1RM
    // ueber den schweren Arbeitssatz heben — der Graph zeigte dann Fortschritt,
    // wo nur laenger aufgewaermt wurde.
    const punkte = kraftverlauf(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 60, 30, true), satzIn('s1', 'e1', 90, 5)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 105 }])
  })

  it('ignores other exercises and sessions without a usable set', () => {
    const punkte = kraftverlauf(
      [sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')],
      [satzIn('s1', 'e1', 90, 5), satzIn('s2', 'e2', 120, 5), satzIn('s2', 'e1', null, 5)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 105 }])
  })

  it('uses the local day of the session start', () => {
    // 23:50 Ortszeit gehoert zu diesem Tag, nicht per UTC zum naechsten.
    const spaet = {
      id: 's3',
      gestartet_am: new Date(2026, 7, 24, 23, 50).toISOString(),
      beendet_am: null,
      gesamt_kalorien: null,
    }
    const punkte = kraftverlauf([spaet], [satzIn('s3', 'e1', 90, 5)], 'e1')
    expect(punkte[0].tag).toBe('2026-08-24')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: FAIL — `epley1RM is not a function`.

- [ ] **Step 3: Write the implementation**

Ans Ende von `src/lib/analysis/training-charts.ts`:

```ts
import type { AnalysisSession } from '../../hooks/use-training-analysis'

export type UebungsPunkt = { tag: string; wert: number }

/**
 * Geschaetztes Einwiederholungsmaximum nach Epley.
 *
 * `null` statt 0 fuer unvollstaendige Saetze: ein Satz ohne Gewicht ist keine
 * Leistung von null, sondern keine Angabe.
 */
export function epley1RM(gewicht: number | null, wiederholungen: number | null): number | null {
  if (gewicht == null || wiederholungen == null) return null
  return gewicht * (1 + wiederholungen / 30)
}

const runde = (wert: number) => Math.round(wert * 10) / 10

/**
 * Baut je Session einen Punkt aus deren Arbeitssaetzen einer Uebung.
 *
 * Gemeinsame Grundlage von T2, T3 und T4: alle drei unterscheiden sich nur
 * darin, was sie aus den Saetzen einer Session machen.
 */
function punkteJeSession(
  sessions: AnalysisSession[],
  sets: AnalysisSet[],
  exerciseId: string,
  ausSaetzen: (saetze: AnalysisSet[]) => number | null,
): UebungsPunkt[] {
  const saetzeJeSession = new Map<string, AnalysisSet[]>()
  for (const satz of sets) {
    if (satz.exercise_id !== exerciseId || satz.ist_aufwaermsatz) continue
    const liste = saetzeJeSession.get(satz.workout_session_id) ?? []
    liste.push(satz)
    saetzeJeSession.set(satz.workout_session_id, liste)
  }

  const punkte: UebungsPunkt[] = []
  for (const session of sessions) {
    if (session.gestartet_am == null) continue
    const saetze = saetzeJeSession.get(session.id)
    if (!saetze || saetze.length === 0) continue
    const wert = ausSaetzen(saetze)
    if (wert == null) continue
    punkte.push({ tag: localDay(session.gestartet_am), wert: runde(wert) })
  }
  return punkte.sort((a, b) => a.tag.localeCompare(b.tag))
}

/** T2: bestes geschaetztes 1RM je Session. */
export function kraftverlauf(
  sessions: AnalysisSession[],
  sets: AnalysisSet[],
  exerciseId: string,
): UebungsPunkt[] {
  return punkteJeSession(sessions, sets, exerciseId, (saetze) => {
    const werte = saetze
      .map((satz) => epley1RM(satz.gewicht, satz.wiederholungen))
      .filter((wert): wert is number => wert != null)
    return werte.length === 0 ? null : Math.max(...werte)
  })
}
```

`localDay` oben in der Datei importieren, falls noch nicht geschehen:

```ts
import { localDay } from '../local-time'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing chart test**

Create `src/components/charts/StrengthChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StrengthChart from './StrengthChart'

const sitzung = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00+02:00`,
  beendet_am: `${tag}T19:00:00+02:00`,
  gesamt_kalorien: 300,
})

const satz = (sessionId: string, exercise_id: string, name: string, gewicht: number) => ({
  id: `${sessionId}-${exercise_id}-${gewicht}`,
  workout_session_id: sessionId,
  exercise_id,
  exercise_name: name,
  muskelgruppen: ['brust'],
  satz_nummer: 1,
  gewicht,
  wiederholungen: 5,
  ist_aufwaermsatz: false,
})

const sessions = [sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')]

describe('StrengthChart', () => {
  it('draws one point per session for the chosen exercise', () => {
    // Marken statt Achsentexte: Recharts ueberspringt Ticks je nach Layout.
    // type="monotone" liefert bei genau zwei Punkten M…L…, daher zaehlt [ML].
    const { container } = render(
      <StrengthChart
        sessions={sessions}
        sets={[satz('s1', 'e1', 'Bankdruecken', 90), satz('s2', 'e1', 'Bankdruecken', 95)]}
      />,
    )
    const kurve = container.querySelector('.recharts-line-curve')!
    expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
  })

  it('states the empty case instead of drawing one lonely point', () => {
    render(
      <StrengthChart sessions={[sessions[0]]} sets={[satz('s1', 'e1', 'Bankdruecken', 90)]} />,
    )
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('switches the exercise', async () => {
    const { container } = render(
      <StrengthChart
        sessions={sessions}
        sets={[
          satz('s1', 'e1', 'Bankdruecken', 90),
          satz('s2', 'e1', 'Bankdruecken', 95),
          satz('s1', 'e2', 'Kniebeuge', 120),
        ]}
      />,
    )
    // Vorbelegt ist die haeufigste Uebung (e1, zwei Arbeitssaetze).
    expect(container.querySelector('.recharts-line-curve')).not.toBeNull()

    await userEvent.selectOptions(screen.getByLabelText('Übung'), 'e2')
    // Kniebeuge hat nur eine Session — zu wenig fuer eine Linie.
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('hides the exercise select on the dashboard', () => {
    render(
      <StrengthChart
        sessions={sessions}
        sets={[
          satz('s1', 'e1', 'Bankdruecken', 90),
          satz('s2', 'e1', 'Bankdruecken', 95),
          satz('s1', 'e2', 'Kniebeuge', 120),
        ]}
        mitUebungsauswahl={false}
      />,
    )
    expect(screen.queryByLabelText('Übung')).toBeNull()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/StrengthChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the chart**

Create `src/components/charts/StrengthChart.tsx`:

```tsx
import { useState, type ReactNode } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import { haeufigsteUebung, kraftverlauf, uebungenImZeitraum } from '../../lib/analysis/training-charts'
import { KRAFTVERLAUF_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'
import ExerciseSelect from './ExerciseSelect'

export const TITEL = KRAFTVERLAUF_TITEL

/** `2026-08-24` → `24.08.` — das Jahr steht schon im Zeitraum. */
export function tagesLabel(tag: string) {
  const [, monat, tagesZahl] = tag.split('-')
  return `${tagesZahl}.${monat}.`
}

export default function StrengthChart({
  sessions,
  sets,
  picker,
  mitUebungsauswahl = true,
}: {
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  picker?: ReactNode
  mitUebungsauswahl?: boolean
}) {
  const optionen = uebungenImZeitraum(sets)
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  // Die Vorbelegung wird nicht in den State geschrieben: der Zeitraumwechsel
  // laedt andere Saetze, und ein festgehaltener alter Wert zeigte dann einen
  // leeren Graphen zu einer Uebung, die im Zeitraum nicht vorkommt.
  const exerciseId = gewaehlt ?? haeufigsteUebung(sets)
  const punkte = exerciseId
    ? kraftverlauf(sessions, sets, exerciseId).map((punkt) => ({
        ...punkt,
        label: tagesLabel(punkt.tag),
      }))
    : []

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      {mitUebungsauswahl && (
        <ExerciseSelect optionen={optionen} wert={exerciseId} onChange={setGewaehlt} />
      )}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          {/* Nicht bei null beginnen: die interessante Spanne sind ein paar
              Kilo, eine Achse ab 0 macht daraus eine Gerade. */}
          <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg`, 'geschätztes 1RM']} />
          <Line type="monotone" dataKey="wert" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

**Achtung:** `ChartFrame` zeigt bei `leer` nur den Satz und blendet `children` aus — die Übungsauswahl verschwindet dann mit. Das ist gewollt: eine Auswahl über einem Hinweistext, der sich nicht ändert, verwirrt mehr, als sie nützt. Der Test „switches the exercise" prüft genau diesen Ablauf.

Wenn ein Reviewer das anders sieht, gehört die Auswahl in den `picker`-Slot von `ChartFrame`, der über dem Leerzustand steht — dann aber in allen vier Graphen gleich.

- [ ] **Step 8: Titel und Registry ergänzen**

In `src/lib/analysis/chart-titles.ts`:

```ts
export const KRAFTVERLAUF_TITEL = 'Kraftverlauf'
```

In `src/lib/analysis/registry.ts` — Import erweitern, ID und Eintrag ergänzen:

```ts
import {
  TRAININGSFREQUENZ_TITEL as TRAINING_FREQUENCY,
  KRAFTVERLAUF_TITEL as STRENGTH,
  KALORIEN_PRO_TAG_TITEL as CALORIES_PER_DAY,
  GEWICHTSVERLAUF_TITEL as WEIGHT_TREND,
} from './chart-titles'

export const T2 = 'T2'

export const CHARTS: ChartDef[] = [
  { id: T1, bereich: 'training', titel: TRAINING_FREQUENCY },
  { id: T2, bereich: 'training', titel: STRENGTH },
  { id: E1, bereich: 'nutrition', titel: CALORIES_PER_DAY },
  { id: K1, bereich: 'body', titel: WEIGHT_TREND },
]
```

In `src/components/charts/TrainingChartList.tsx` den Graphen einhängen:

```tsx
const StrengthChart = lazy(() => import('./StrengthChart'))
```

```tsx
      case T2:
        return (
          <StrengthChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            mitUebungsauswahl={analyse}
          />
        )
```

Die Zeile `void analyse` aus Task 2 entfällt jetzt.

- [ ] **Step 9: Run the full suite and commit**

```bash
npm test -- --run
npm run lint
npx tsc -b --noEmit
git add src/lib/analysis/training-charts.ts src/lib/analysis/training-charts.test.ts src/lib/analysis/chart-titles.ts src/lib/analysis/registry.ts src/lib/analysis/registry.test.ts src/components/charts/StrengthChart.tsx src/components/charts/StrengthChart.test.tsx src/components/charts/TrainingChartList.tsx
git commit -m "feat: T2 Kraftverlauf je Uebung"
```

Falls `registry.test.ts` die Anzahl der Graphen prüft, wird die Erwartung dort mitgezogen — das gilt für jeden folgenden Task ebenso.

---

## Task 5: T3 Volumen je Übung

**Files:**
- Modify: `src/lib/analysis/training-charts.ts`, `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/components/charts/TrainingChartList.tsx`
- Create: `src/components/charts/ExerciseVolumeChart.tsx`, `src/components/charts/ExerciseVolumeChart.test.tsx`
- Test: `src/lib/analysis/training-charts.test.ts`

**Interfaces:**
- Consumes: `punkteJeSession` (intern, Task 4), `UebungsPunkt`
- Produces:
  ```ts
  export function volumenJeSession(
    sessions: AnalysisSession[], sets: AnalysisSet[], exerciseId: string,
  ): UebungsPunkt[]
  export const VOLUMEN_JE_UEBUNG_TITEL = 'Volumen je Übung'
  export const T3 = 'T3'
  ```

Volumen ist Σ Gewicht × Wiederholungen über die Arbeitssätze einer Session. Es steigt auch dann, wenn das 1RM steht — mehr Sätze bei gleichem Gewicht ist Fortschritt, den T2 nicht zeigt.

- [ ] **Step 1: Write the failing test**

Ans Ende von `src/lib/analysis/training-charts.test.ts` (nutzt `sitzung` und `satzIn` aus Task 4):

```ts
import { volumenJeSession } from './training-charts'

describe('volumenJeSession', () => {
  it('sums weight times reps over the working sets', () => {
    const punkte = volumenJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 80, 8), satzIn('s1', 'e1', 80, 6)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 1120 }])
  })

  it('leaves warm-up sets out', () => {
    // Ohne diesen Filter ist jeder Volumengraph systematisch zu hoch — genau
    // dafuer wurde ist_aufwaermsatz erfasst.
    const punkte = volumenJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 20, 15, true), satzIn('s1', 'e1', 80, 8)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 640 }])
  })

  it('skips a set without weight or reps rather than counting it as zero', () => {
    const punkte = volumenJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 80, 8), satzIn('s1', 'e1', null, 8), satzIn('s1', 'e1', 80, null)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 640 }])
  })

  it('gives a session without any usable set no point at all', () => {
    // Ein Punkt bei 0 laese sich als Trainingstag ohne Leistung lesen; es gab
    // an dem Tag aber keine verwertbare Angabe.
    const punkte = volumenJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', null, null)],
      'e1',
    )
    expect(punkte).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: FAIL — `volumenJeSession is not a function`.

- [ ] **Step 3: Write the implementation**

Ans Ende von `src/lib/analysis/training-charts.ts`:

```ts
/** Σ Gewicht × Wiederholungen eines Satzes, oder null bei fehlender Angabe. */
function satzVolumen(satz: AnalysisSet): number | null {
  if (satz.gewicht == null || satz.wiederholungen == null) return null
  return satz.gewicht * satz.wiederholungen
}

/** T3: Volumen der Arbeitssaetze einer Uebung je Session. */
export function volumenJeSession(
  sessions: AnalysisSession[],
  sets: AnalysisSet[],
  exerciseId: string,
): UebungsPunkt[] {
  return punkteJeSession(sessions, sets, exerciseId, (saetze) => {
    const werte = saetze.map(satzVolumen).filter((wert): wert is number => wert != null)
    return werte.length === 0 ? null : werte.reduce((summe, wert) => summe + wert, 0)
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing chart test**

Create `src/components/charts/ExerciseVolumeChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ExerciseVolumeChart from './ExerciseVolumeChart'

const sitzung = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00+02:00`,
  beendet_am: `${tag}T19:00:00+02:00`,
  gesamt_kalorien: 300,
})

const satz = (sessionId: string, gewicht: number) => ({
  id: `${sessionId}-${gewicht}`,
  workout_session_id: sessionId,
  exercise_id: 'e1',
  exercise_name: 'Bankdruecken',
  muskelgruppen: ['brust'],
  satz_nummer: 1,
  gewicht,
  wiederholungen: 8,
  ist_aufwaermsatz: false,
})

describe('ExerciseVolumeChart', () => {
  it('draws one bar per session', () => {
    // Balken statt Linie: Volumen ist eine Menge je Trainingstag, keine Kurve.
    // Eine Marke reicht hier, Balken brauchen keinen zweiten Punkt.
    const { container } = render(
      <ExerciseVolumeChart
        sessions={[sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')]}
        sets={[satz('s1', 80), satz('s2', 85)]}
      />,
    )
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
  })

  it('states the empty case without any usable set', () => {
    render(<ExerciseVolumeChart sessions={[sitzung('s1', '2026-08-17')]} sets={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/ExerciseVolumeChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the chart**

Create `src/components/charts/ExerciseVolumeChart.tsx`:

```tsx
import { useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import {
  haeufigsteUebung,
  uebungenImZeitraum,
  volumenJeSession,
} from '../../lib/analysis/training-charts'
import { VOLUMEN_JE_UEBUNG_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'
import ExerciseSelect from './ExerciseSelect'
import { tagesLabel } from './StrengthChart'

export const TITEL = VOLUMEN_JE_UEBUNG_TITEL

export default function ExerciseVolumeChart({
  sessions,
  sets,
  picker,
  mitUebungsauswahl = true,
}: {
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  picker?: ReactNode
  mitUebungsauswahl?: boolean
}) {
  const optionen = uebungenImZeitraum(sets)
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const exerciseId = gewaehlt ?? haeufigsteUebung(sets)
  const punkte = exerciseId
    ? volumenJeSession(sessions, sets, exerciseId).map((punkt) => ({
        ...punkt,
        label: tagesLabel(punkt.tag),
      }))
    : []

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker}>
      {mitUebungsauswahl && (
        <ExerciseSelect optionen={optionen} wert={exerciseId} onChange={setGewaehlt} />
      )}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg`, 'Volumen']} />
          <Bar dataKey="wert" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Titel, Registry, Liste**

`chart-titles.ts`:

```ts
export const VOLUMEN_JE_UEBUNG_TITEL = 'Volumen je Übung'
```

`registry.ts`: Import um `VOLUMEN_JE_UEBUNG_TITEL as EXERCISE_VOLUME` erweitern, `export const T3 = 'T3'`, Eintrag `{ id: T3, bereich: 'training', titel: EXERCISE_VOLUME }` **hinter** T2 einfügen.

`TrainingChartList.tsx`:

```tsx
const ExerciseVolumeChart = lazy(() => import('./ExerciseVolumeChart'))
```

```tsx
      case T3:
        return (
          <ExerciseVolumeChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            mitUebungsauswahl={analyse}
          />
        )
```

- [ ] **Step 9: Run the full suite and commit**

```bash
npm test -- --run
npm run lint
npx tsc -b --noEmit
git add src/lib/analysis src/components/charts/ExerciseVolumeChart.tsx src/components/charts/ExerciseVolumeChart.test.tsx src/components/charts/TrainingChartList.tsx
git commit -m "feat: T3 Volumen je Uebung"
```

---

## Task 6: T4 Bestes Satzgewicht

**Files:**
- Modify: `src/lib/analysis/training-charts.ts`, `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/components/charts/TrainingChartList.tsx`
- Create: `src/components/charts/BestSetWeightChart.tsx`, `src/components/charts/BestSetWeightChart.test.tsx`
- Test: `src/lib/analysis/training-charts.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function bestesGewichtJeSession(
    sessions: AnalysisSession[], sets: AnalysisSet[], exerciseId: string,
  ): UebungsPunkt[]
  export const BESTES_SATZGEWICHT_TITEL = 'Bestes Satzgewicht'
  export const T4 = 'T4'
  ```

T2 rechnet Wiederholungen in Gewicht um, T4 zeigt die Zahl, die tatsächlich auf der Stange lag. Beide nebeneinander machen sichtbar, ob ein steigendes 1RM von mehr Gewicht oder von mehr Wiederholungen kommt.

- [ ] **Step 1: Write the failing test**

```ts
import { bestesGewichtJeSession } from './training-charts'

describe('bestesGewichtJeSession', () => {
  it('takes the heaviest working set of the session', () => {
    const punkte = bestesGewichtJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 80, 8), satzIn('s1', 'e1', 92.5, 3)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 92.5 }])
  })

  it('does not let a warm-up set count', () => {
    const punkte = bestesGewichtJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 100, 1, true), satzIn('s1', 'e1', 80, 8)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 80 }])
  })

  it('counts a set without reps, unlike the 1RM estimate', () => {
    // Fuer T4 reicht das Gewicht: die Wiederholungen gehen in die Zahl nicht ein.
    const punkte = bestesGewichtJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 85, null)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 85 }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: FAIL — `bestesGewichtJeSession is not a function`.

- [ ] **Step 3: Write the implementation**

```ts
/** T4: schwerster Arbeitssatz einer Uebung je Session. */
export function bestesGewichtJeSession(
  sessions: AnalysisSession[],
  sets: AnalysisSet[],
  exerciseId: string,
): UebungsPunkt[] {
  return punkteJeSession(sessions, sets, exerciseId, (saetze) => {
    const werte = saetze
      .map((satz) => satz.gewicht)
      .filter((wert): wert is number => wert != null)
    return werte.length === 0 ? null : Math.max(...werte)
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing chart test**

Create `src/components/charts/BestSetWeightChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import BestSetWeightChart from './BestSetWeightChart'

const sitzung = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00+02:00`,
  beendet_am: `${tag}T19:00:00+02:00`,
  gesamt_kalorien: 300,
})

const satz = (sessionId: string, gewicht: number) => ({
  id: `${sessionId}-${gewicht}`,
  workout_session_id: sessionId,
  exercise_id: 'e1',
  exercise_name: 'Bankdruecken',
  muskelgruppen: ['brust'],
  satz_nummer: 1,
  gewicht,
  wiederholungen: 5,
  ist_aufwaermsatz: false,
})

describe('BestSetWeightChart', () => {
  it('draws a point per session', () => {
    const { container } = render(
      <BestSetWeightChart
        sessions={[sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')]}
        sets={[satz('s1', 80), satz('s2', 85)]}
      />,
    )
    const kurve = container.querySelector('.recharts-line-curve')!
    expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
  })

  it('states the empty case for a single session', () => {
    render(<BestSetWeightChart sessions={[sitzung('s1', '2026-08-17')]} sets={[satz('s1', 80)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/BestSetWeightChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the chart**

Create `src/components/charts/BestSetWeightChart.tsx` — identisch zu `StrengthChart.tsx` bis auf Rechenfunktion, Titel und Tooltip:

```tsx
import { useState, type ReactNode } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import {
  bestesGewichtJeSession,
  haeufigsteUebung,
  uebungenImZeitraum,
} from '../../lib/analysis/training-charts'
import { BESTES_SATZGEWICHT_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'
import ExerciseSelect from './ExerciseSelect'
import { tagesLabel } from './StrengthChart'

export const TITEL = BESTES_SATZGEWICHT_TITEL

export default function BestSetWeightChart({
  sessions,
  sets,
  picker,
  mitUebungsauswahl = true,
}: {
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  picker?: ReactNode
  mitUebungsauswahl?: boolean
}) {
  const optionen = uebungenImZeitraum(sets)
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const exerciseId = gewaehlt ?? haeufigsteUebung(sets)
  const punkte = exerciseId
    ? bestesGewichtJeSession(sessions, sets, exerciseId).map((punkt) => ({
        ...punkt,
        label: tagesLabel(punkt.tag),
      }))
    : []

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      {mitUebungsauswahl && (
        <ExerciseSelect optionen={optionen} wert={exerciseId} onChange={setGewaehlt} />
      )}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg`, 'bestes Satzgewicht']} />
          <Line type="monotone" dataKey="wert" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

**Hinweis an den Reviewer:** Das ist die dritte Komponente mit derselben Hülle (Auswahl, Punkte, Rahmen). Wenn nach T5 vier davon stehen, ist ein gemeinsamer `ExerciseLineChart` mit `berechne`-Prop die naheliegende Zusammenfassung — bewusst **nicht** vorweggenommen, solange erst zwei Fälle existieren. Task 7 entscheidet das mit der vierten Kopie.

- [ ] **Step 8: Titel, Registry, Liste**

`chart-titles.ts`: `export const BESTES_SATZGEWICHT_TITEL = 'Bestes Satzgewicht'`

`registry.ts`: `export const T4 = 'T4'`, Import `BESTES_SATZGEWICHT_TITEL as BEST_SET_WEIGHT`, Eintrag hinter T3.

`TrainingChartList.tsx`: `const BestSetWeightChart = lazy(() => import('./BestSetWeightChart'))` und

```tsx
      case T4:
        return (
          <BestSetWeightChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            mitUebungsauswahl={analyse}
          />
        )
```

- [ ] **Step 9: Run the full suite and commit**

```bash
npm test -- --run
npm run lint
npx tsc -b --noEmit
git add src/lib/analysis src/components/charts/BestSetWeightChart.tsx src/components/charts/BestSetWeightChart.test.tsx src/components/charts/TrainingChartList.tsx
git commit -m "feat: T4 bestes Satzgewicht je Uebung"
```

---

## Task 7: T5 Wiederholungen je Satz

**Files:**
- Modify: `src/lib/analysis/training-charts.ts`, `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/components/charts/TrainingChartList.tsx`
- Create: `src/components/charts/RepsPerSetChart.tsx`, `src/components/charts/RepsPerSetChart.test.tsx`
- Test: `src/lib/analysis/training-charts.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SatzReihen = {
    punkte: (Record<string, number | string> & { tag: string })[]
    satzNummern: number[]
  }
  export function wiederholungenJeSatz(
    sessions: AnalysisSession[], sets: AnalysisSet[], exerciseId: string,
  ): SatzReihen
  export const WIEDERHOLUNGEN_JE_SATZ_TITEL = 'Wiederholungen je Satz'
  export const T5 = 'T5'
  ```

Der Graph zeigt je Arbeitssatz eine Linie: fällt der dritte Satz über Wochen von zehn auf sechs Wiederholungen, während der erste steht, ist das Ermüdung und keine Formschwäche. **Die Satznummer ist die Position unter den Arbeitssätzen**, nicht die rohe `satz_nummer` — die zählt laut Migration `0005` alle Sätze inklusive Aufwärmen durch, und dann hieße dieselbe Linie an einem Tag „Satz 2" und am nächsten „Satz 4".

- [ ] **Step 1: Write the failing test**

```ts
import { wiederholungenJeSatz } from './training-charts'

describe('wiederholungenJeSatz', () => {
  it('numbers the working sets from one, ignoring warm-ups in between', () => {
    // satz_nummer zaehlt alle Saetze durch. Ohne Umnummerierung hiesse derselbe
    // Arbeitssatz an einem Tag "Satz 2" und am naechsten "Satz 4".
    const reihen = wiederholungenJeSatz(
      [sitzung('s1', '2026-08-17')],
      [
        { ...satzIn('s1', 'e1', 40, 12, true), satz_nummer: 1 },
        { ...satzIn('s1', 'e1', 80, 10), satz_nummer: 2 },
        { ...satzIn('s1', 'e1', 80, 8), satz_nummer: 3 },
      ],
      'e1',
    )
    expect(reihen.satzNummern).toEqual([1, 2])
    expect(reihen.punkte).toEqual([{ tag: '2026-08-17', satz1: 10, satz2: 8 }])
  })

  it('keeps a missing set as a gap instead of zero', () => {
    // Wer an einem Tag nur zwei Saetze schafft, hat keine null Wiederholungen
    // im dritten — die Linie soll dort aussetzen.
    const reihen = wiederholungenJeSatz(
      [sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')],
      [
        { ...satzIn('s1', 'e1', 80, 10), satz_nummer: 1 },
        { ...satzIn('s1', 'e1', 80, 8), satz_nummer: 2 },
        { ...satzIn('s2', 'e1', 80, 9), satz_nummer: 1 },
      ],
      'e1',
    )
    expect(reihen.satzNummern).toEqual([1, 2])
    expect(reihen.punkte[1]).toEqual({ tag: '2026-08-24', satz1: 9 })
  })

  it('is empty for an exercise without working sets', () => {
    const reihen = wiederholungenJeSatz(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 40, 12, true)],
      'e1',
    )
    expect(reihen).toEqual({ punkte: [], satzNummern: [] })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: FAIL — `wiederholungenJeSatz is not a function`.

- [ ] **Step 3: Write the implementation**

```ts
export type SatzReihen = {
  punkte: (Record<string, number | string> & { tag: string })[]
  satzNummern: number[]
}

/**
 * T5: je Arbeitssatz eine Reihe, Schluessel `satz1`, `satz2`, …
 *
 * Fehlende Saetze bleiben Luecken statt Nullen: wer an einem Tag nur zwei
 * Saetze geschafft hat, hat im dritten keine null Wiederholungen gemacht.
 */
export function wiederholungenJeSatz(
  sessions: AnalysisSession[],
  sets: AnalysisSet[],
  exerciseId: string,
): SatzReihen {
  const arbeitsSaetze = sets.filter(
    (satz) => satz.exercise_id === exerciseId && !satz.ist_aufwaermsatz,
  )
  const jeSession = new Map<string, AnalysisSet[]>()
  for (const satz of arbeitsSaetze) {
    const liste = jeSession.get(satz.workout_session_id) ?? []
    liste.push(satz)
    jeSession.set(satz.workout_session_id, liste)
  }

  const punkte: SatzReihen['punkte'] = []
  const nummern = new Set<number>()

  for (const session of sessions) {
    if (session.gestartet_am == null) continue
    const saetze = (jeSession.get(session.id) ?? []).sort((a, b) => a.satz_nummer - b.satz_nummer)
    if (saetze.length === 0) continue
    const punkt: Record<string, number | string> & { tag: string } = {
      tag: localDay(session.gestartet_am),
    }
    saetze.forEach((satz, index) => {
      if (satz.wiederholungen == null) return
      const nummer = index + 1
      nummern.add(nummer)
      punkt[`satz${nummer}`] = satz.wiederholungen
    })
    punkte.push(punkt)
  }

  return {
    punkte: punkte.sort((a, b) => a.tag.localeCompare(b.tag)),
    satzNummern: [...nummern].sort((a, b) => a - b),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing chart test**

Create `src/components/charts/RepsPerSetChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import RepsPerSetChart from './RepsPerSetChart'

const sitzung = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00+02:00`,
  beendet_am: `${tag}T19:00:00+02:00`,
  gesamt_kalorien: 300,
})

const satz = (sessionId: string, satz_nummer: number, wiederholungen: number) => ({
  id: `${sessionId}-${satz_nummer}`,
  workout_session_id: sessionId,
  exercise_id: 'e1',
  exercise_name: 'Bankdruecken',
  muskelgruppen: ['brust'],
  satz_nummer,
  gewicht: 80,
  wiederholungen,
  ist_aufwaermsatz: false,
})

describe('RepsPerSetChart', () => {
  it('draws one line per working set', () => {
    const { container } = render(
      <RepsPerSetChart
        sessions={[sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')]}
        sets={[
          satz('s1', 1, 10),
          satz('s1', 2, 8),
          satz('s2', 1, 10),
          satz('s2', 2, 9),
        ]}
      />,
    )
    expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(2)
  })

  it('names the lines so the sets are told apart', () => {
    render(
      <RepsPerSetChart
        sessions={[sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')]}
        sets={[satz('s1', 1, 10), satz('s2', 1, 10)]}
      />,
    )
    expect(screen.getByText('Satz 1')).toBeInTheDocument()
  })

  it('states the empty case for a single session', () => {
    render(<RepsPerSetChart sessions={[sitzung('s1', '2026-08-17')]} sets={[satz('s1', 1, 10)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/RepsPerSetChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the chart**

Create `src/components/charts/RepsPerSetChart.tsx`:

```tsx
import { useState, type ReactNode } from 'react'
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
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import {
  haeufigsteUebung,
  uebungenImZeitraum,
  wiederholungenJeSatz,
} from '../../lib/analysis/training-charts'
import { WIEDERHOLUNGEN_JE_SATZ_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'
import ExerciseSelect from './ExerciseSelect'
import { tagesLabel } from './StrengthChart'

export const TITEL = WIEDERHOLUNGEN_JE_SATZ_TITEL

// Sechs Farben reichen: mehr als sechs Arbeitssaetze je Uebung ist selten, und
// danach wiederholt sich die Reihe, statt dass eine Linie unsichtbar wird.
const FARBEN = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f7f', '#8dd1e1', '#a4de6c']

export default function RepsPerSetChart({
  sessions,
  sets,
  picker,
  mitUebungsauswahl = true,
}: {
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  picker?: ReactNode
  mitUebungsauswahl?: boolean
}) {
  const optionen = uebungenImZeitraum(sets)
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const exerciseId = gewaehlt ?? haeufigsteUebung(sets)
  const reihen = exerciseId
    ? wiederholungenJeSatz(sessions, sets, exerciseId)
    : { punkte: [], satzNummern: [] }
  const punkte = reihen.punkte.map((punkt) => ({ ...punkt, label: tagesLabel(punkt.tag) }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      {mitUebungsauswahl && (
        <ExerciseSelect optionen={optionen} wert={exerciseId} onChange={setGewaehlt} />
      )}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          {/* allowDecimals: halbe Wiederholungen gibt es nicht. */}
          <YAxis allowDecimals={false} />
          <Tooltip />
          {reihen.satzNummern.map((nummer, index) => (
            <Line
              key={nummer}
              type="monotone"
              dataKey={`satz${nummer}`}
              name={`Satz ${nummer}`}
              stroke={FARBEN[index % FARBEN.length]}
              // connectNulls bleibt aus: eine Luecke ist ein nicht gemachter
              // Satz und soll als Luecke sichtbar bleiben.
              dot={false}
            />
          ))}
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Titel, Registry, Liste**

`chart-titles.ts`: `export const WIEDERHOLUNGEN_JE_SATZ_TITEL = 'Wiederholungen je Satz'`

`registry.ts`: `export const T5 = 'T5'`, Import `WIEDERHOLUNGEN_JE_SATZ_TITEL as REPS_PER_SET`, Eintrag hinter T4.

`TrainingChartList.tsx`: `const RepsPerSetChart = lazy(() => import('./RepsPerSetChart'))` und

```tsx
      case T5:
        return (
          <RepsPerSetChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            mitUebungsauswahl={analyse}
          />
        )
```

- [ ] **Step 9: Die vierte Kopie zusammenfassen**

Jetzt stehen vier Komponenten mit derselben Hülle: Optionen holen, `gewaehlt`-State, Vorbelegung über `haeufigsteUebung`, `ExerciseSelect` unter dem Rahmen. Das ist der Punkt, an dem das Zusammenfassen fällig ist — vorher war es Spekulation.

Create `src/components/charts/useUebungsauswahl.ts`:

```ts
import { useState } from 'react'
import type { AnalysisSet } from '../../hooks/use-training-analysis'
import { haeufigsteUebung, uebungenImZeitraum } from '../../lib/analysis/training-charts'

/**
 * Gewaehlte Uebung eines uebungsbezogenen Graphen.
 *
 * Die Vorbelegung wird bewusst nicht in den State geschrieben: bei einem
 * Zeitraumwechsel kaeme sonst ein Graph zu einer Uebung heraus, die im neuen
 * Zeitraum gar nicht trainiert wurde.
 */
export function useUebungsauswahl(sets: AnalysisSet[]) {
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  return {
    optionen: uebungenImZeitraum(sets),
    exerciseId: gewaehlt ?? haeufigsteUebung(sets),
    waehlen: setGewaehlt,
  }
}
```

In allen vier Komponenten (`StrengthChart`, `ExerciseVolumeChart`, `BestSetWeightChart`, `RepsPerSetChart`) die drei Zeilen

```tsx
  const optionen = uebungenImZeitraum(sets)
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const exerciseId = gewaehlt ?? haeufigsteUebung(sets)
```

ersetzen durch

```tsx
  const { optionen, exerciseId, waehlen } = useUebungsauswahl(sets)
```

und `onChange={setGewaehlt}` durch `onChange={waehlen}`. Nicht mehr benötigte Importe entfernen — der Lint-Lauf zeigt sie.

- [ ] **Step 10: Run the full suite and commit**

```bash
npm test -- --run
npm run lint
npx tsc -b --noEmit
git add src/lib/analysis src/components/charts
git commit -m "feat: T5 Wiederholungen je Satz, Uebungsauswahl in einem Hook"
```

Erwartung: die Tests der drei älteren Graphen laufen unverändert durch — sie prüfen Verhalten, nicht die interne Aufteilung.

---

## Task 8: T6 Volumen je Muskelgruppe

**Files:**
- Modify: `src/lib/analysis/training-charts.ts`, `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/components/charts/TrainingChartList.tsx`
- Create: `src/components/charts/MuscleVolumeChart.tsx`, `src/components/charts/MuscleVolumeChart.test.tsx`
- Test: `src/lib/analysis/training-charts.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type MuskelPunkt = { muskelgruppe: string; volumen: number }
  export function volumenJeMuskelgruppe(sets: AnalysisSet[]): MuskelPunkt[]
  export const VOLUMEN_JE_MUSKELGRUPPE_TITEL = 'Volumen je Muskelgruppe'
  export const T6 = 'T6'
  ```

Der Graph beantwortet die Frage nach der Schwachstelle: welcher Bereich bekommt über den Zeitraum am wenigsten Arbeit. Balken über den ganzen Zeitraum, keine Zeitachse.

**Verteilt, nicht vervielfacht:** Eine Übung mit zwei primären Muskelgruppen gibt jeder die Hälfte ihres Volumens. Volle Anrechnung an beide würde die Summe über alle Balken größer machen als das tatsächlich bewegte Volumen, und Verbundübungen sähen doppelt so wichtig aus, wie sie sind.

- [ ] **Step 1: Write the failing test**

```ts
import { volumenJeMuskelgruppe } from './training-charts'

describe('volumenJeMuskelgruppe', () => {
  const mitGruppen = (gruppen: string[], gewicht: number, wiederholungen: number, warm = false) => ({
    ...satzIn('s1', 'e1', gewicht, wiederholungen, warm),
    id: `${gruppen.join('-')}-${gewicht}-${wiederholungen}-${warm}`,
    muskelgruppen: gruppen,
  })

  it('sums the volume per muscle group, largest first', () => {
    expect(
      volumenJeMuskelgruppe([mitGruppen(['brust'], 80, 10), mitGruppen(['ruecken'], 60, 10)]),
    ).toEqual([
      { muskelgruppe: 'brust', volumen: 800 },
      { muskelgruppe: 'ruecken', volumen: 600 },
    ])
  })

  it('splits an exercise with two primary groups instead of counting it twice', () => {
    // Volle Anrechnung an beide liesse die Summe aller Balken groesser werden
    // als das bewegte Volumen.
    expect(volumenJeMuskelgruppe([mitGruppen(['brust', 'trizeps'], 100, 10)])).toEqual([
      { muskelgruppe: 'brust', volumen: 500 },
      { muskelgruppe: 'trizeps', volumen: 500 },
    ])
  })

  it('leaves warm-up sets out', () => {
    expect(volumenJeMuskelgruppe([mitGruppen(['brust'], 100, 10, true)])).toEqual([])
  })

  it('drops sets whose exercise has no primary group', () => {
    // Ohne Zuordnung gibt es keinen Balken, auf den das Volumen gehoert; eine
    // Sammelgruppe "sonstiges" waere eine erfundene Aussage.
    expect(volumenJeMuskelgruppe([mitGruppen([], 100, 10)])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: FAIL — `volumenJeMuskelgruppe is not a function`.

- [ ] **Step 3: Write the implementation**

```ts
export type MuskelPunkt = { muskelgruppe: string; volumen: number }

/**
 * T6: Volumen der Arbeitssaetze ueber den ganzen Zeitraum, auf die primaeren
 * Muskelgruppen **verteilt**.
 *
 * Zwei Gruppen bekommen je die Haelfte. Volle Anrechnung an beide waere die
 * bequemere Rechnung, machte die Summe aller Balken aber groesser als das
 * bewegte Volumen und liesse Verbundeuebungen doppelt so wichtig aussehen.
 */
export function volumenJeMuskelgruppe(sets: AnalysisSet[]): MuskelPunkt[] {
  const summe = new Map<string, number>()
  for (const satz of sets) {
    if (satz.ist_aufwaermsatz) continue
    const volumen = satzVolumen(satz)
    if (volumen == null || satz.muskelgruppen.length === 0) continue
    const anteil = volumen / satz.muskelgruppen.length
    for (const gruppe of satz.muskelgruppen) {
      summe.set(gruppe, (summe.get(gruppe) ?? 0) + anteil)
    }
  }
  return [...summe.entries()]
    .map(([muskelgruppe, volumen]) => ({ muskelgruppe, volumen: Math.round(volumen) }))
    .sort((a, b) => b.volumen - a.volumen || a.muskelgruppe.localeCompare(b.muskelgruppe, 'de'))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing chart test**

Create `src/components/charts/MuscleVolumeChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MuscleVolumeChart from './MuscleVolumeChart'

const satz = (muskelgruppen: string[], gewicht: number) => ({
  id: `${muskelgruppen.join('-')}-${gewicht}`,
  workout_session_id: 's1',
  exercise_id: 'e1',
  exercise_name: 'Bankdruecken',
  muskelgruppen,
  satz_nummer: 1,
  gewicht,
  wiederholungen: 10,
  ist_aufwaermsatz: false,
})

describe('MuscleVolumeChart', () => {
  it('draws one bar per muscle group', () => {
    const { container } = render(
      <MuscleVolumeChart sets={[satz(['brust'], 80), satz(['ruecken'], 60)]} />,
    )
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
  })

  it('states the empty case without any assignable set', () => {
    render(<MuscleVolumeChart sets={[satz([], 80)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/MuscleVolumeChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the chart**

Create `src/components/charts/MuscleVolumeChart.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnalysisSet } from '../../hooks/use-training-analysis'
import { volumenJeMuskelgruppe } from '../../lib/analysis/training-charts'
import { VOLUMEN_JE_MUSKELGRUPPE_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = VOLUMEN_JE_MUSKELGRUPPE_TITEL

export default function MuscleVolumeChart({
  sets,
  picker,
}: {
  sets: AnalysisSet[]
  picker?: ReactNode
}) {
  const punkte = volumenJeMuskelgruppe(sets)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="muskelgruppe" />
          <YAxis />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg`, 'Volumen']} />
          <Bar dataKey="volumen" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Titel, Registry, Liste**

`chart-titles.ts`: `export const VOLUMEN_JE_MUSKELGRUPPE_TITEL = 'Volumen je Muskelgruppe'`

`registry.ts`: `export const T6 = 'T6'`, Import `VOLUMEN_JE_MUSKELGRUPPE_TITEL as MUSCLE_VOLUME`, Eintrag hinter T5.

`TrainingChartList.tsx`: `const MuscleVolumeChart = lazy(() => import('./MuscleVolumeChart'))` und

```tsx
      case T6:
        return <MuscleVolumeChart sets={sets} picker={picker} />
```

- [ ] **Step 9: Run the full suite and commit**

```bash
npm test -- --run
npm run lint
npx tsc -b --noEmit
git add src/lib/analysis src/components/charts/MuscleVolumeChart.tsx src/components/charts/MuscleVolumeChart.test.tsx src/components/charts/TrainingChartList.tsx
git commit -m "feat: T6 Volumen je Muskelgruppe"
```

---

## Task 9: T7 Dauer und Kalorien je Session

**Files:**
- Modify: `src/lib/analysis/training-charts.ts`, `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/components/charts/TrainingChartList.tsx`
- Create: `src/components/charts/SessionLoadChart.tsx`, `src/components/charts/SessionLoadChart.test.tsx`
- Test: `src/lib/analysis/training-charts.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SessionPunkt = { tag: string; minuten: number; kalorien: number | null }
  export function dauerUndKalorien(sessions: AnalysisSession[]): SessionPunkt[]
  export const DAUER_UND_KALORIEN_TITEL = 'Dauer und Kalorien'
  export const T7 = 'T7'
  ```

Nur beendete Sessions: eine offen gelassene hat kein Ende und damit keine Dauer — aus `beendet_am = null` eine Dauer bis „jetzt" zu rechnen ergäbe Balken von mehreren Tagen.

- [ ] **Step 1: Write the failing test**

```ts
import { dauerUndKalorien } from './training-charts'

describe('dauerUndKalorien', () => {
  it('computes the minutes between start and end', () => {
    expect(
      dauerUndKalorien([
        {
          id: 's1',
          gestartet_am: '2026-08-17T17:30:00+02:00',
          beendet_am: '2026-08-17T18:35:00+02:00',
          gesamt_kalorien: 420,
        },
      ]),
    ).toEqual([{ tag: '2026-08-17', minuten: 65, kalorien: 420 }])
  })

  it('leaves an unfinished session out', () => {
    // Ohne beendet_am gibt es keine Dauer. Bis "jetzt" zu rechnen ergaebe
    // Balken von mehreren Tagen fuer eine vergessene Session.
    expect(
      dauerUndKalorien([
        {
          id: 's1',
          gestartet_am: '2026-08-17T17:30:00+02:00',
          beendet_am: null,
          gesamt_kalorien: 420,
        },
      ]),
    ).toEqual([])
  })

  it('keeps a finished session without calories', () => {
    // gesamt_kalorien ist optional; die Dauer steht trotzdem.
    expect(
      dauerUndKalorien([
        {
          id: 's1',
          gestartet_am: '2026-08-17T17:30:00+02:00',
          beendet_am: '2026-08-17T18:00:00+02:00',
          gesamt_kalorien: null,
        },
      ]),
    ).toEqual([{ tag: '2026-08-17', minuten: 30, kalorien: null }])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: FAIL — `dauerUndKalorien is not a function`.

- [ ] **Step 3: Write the implementation**

```ts
export type SessionPunkt = { tag: string; minuten: number; kalorien: number | null }

/** T7: Dauer und Verbrauch je beendeter Session. */
export function dauerUndKalorien(sessions: AnalysisSession[]): SessionPunkt[] {
  const punkte: SessionPunkt[] = []
  for (const session of sessions) {
    if (session.gestartet_am == null || session.beendet_am == null) continue
    const minuten = Math.round(
      (new Date(session.beendet_am).getTime() - new Date(session.gestartet_am).getTime()) / 60_000,
    )
    if (minuten <= 0) continue
    punkte.push({
      tag: localDay(session.gestartet_am),
      minuten,
      kalorien: session.gesamt_kalorien,
    })
  }
  return punkte.sort((a, b) => a.tag.localeCompare(b.tag))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing chart test**

Create `src/components/charts/SessionLoadChart.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import SessionLoadChart from './SessionLoadChart'

const sitzung = (id: string, tag: string, kalorien: number | null) => ({
  id,
  gestartet_am: `${tag}T17:30:00+02:00`,
  beendet_am: `${tag}T18:30:00+02:00`,
  gesamt_kalorien: kalorien,
})

describe('SessionLoadChart', () => {
  it('draws a bar per session and a line for the calories', () => {
    const { container } = render(
      <SessionLoadChart
        sessions={[sitzung('s1', '2026-08-17', 400), sitzung('s2', '2026-08-24', 420)]}
      />,
    )
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
    expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(1)
  })

  it('names both series so the two axes are readable', () => {
    render(
      <SessionLoadChart
        sessions={[sitzung('s1', '2026-08-17', 400), sitzung('s2', '2026-08-24', 420)]}
      />,
    )
    expect(screen.getByText('Minuten')).toBeInTheDocument()
    expect(screen.getByText('kcal')).toBeInTheDocument()
  })

  it('states the empty case without a finished session', () => {
    render(
      <SessionLoadChart
        sessions={[
          { id: 's1', gestartet_am: '2026-08-17T17:30:00+02:00', beendet_am: null, gesamt_kalorien: null },
        ]}
      />,
    )
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/SessionLoadChart.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the chart**

Create `src/components/charts/SessionLoadChart.tsx`:

```tsx
import type { ReactNode } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalysisSession } from '../../hooks/use-training-analysis'
import { dauerUndKalorien } from '../../lib/analysis/training-charts'
import { DAUER_UND_KALORIEN_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'
import { tagesLabel } from './StrengthChart'

export const TITEL = DAUER_UND_KALORIEN_TITEL

export default function SessionLoadChart({
  sessions,
  picker,
}: {
  sessions: AnalysisSession[]
  picker?: ReactNode
}) {
  const punkte = dauerUndKalorien(sessions).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.tag),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          {/* Zwei Achsen: Minuten und Kilokalorien liegen um eine Zehnerpotenz
              auseinander, auf einer Achse waere die Dauer ein flacher Strich. */}
          <YAxis yAxisId="minuten" />
          <YAxis yAxisId="kalorien" orientation="right" />
          <Tooltip />
          <Bar yAxisId="minuten" dataKey="minuten" name="Minuten" fill="#8884d8" />
          <Line
            yAxisId="kalorien"
            type="monotone"
            dataKey="kalorien"
            name="kcal"
            stroke="#82ca9d"
            dot={false}
          />
          <Legend />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Titel, Registry, Liste**

`chart-titles.ts`: `export const DAUER_UND_KALORIEN_TITEL = 'Dauer und Kalorien'`

`registry.ts`: `export const T7 = 'T7'`, Import `DAUER_UND_KALORIEN_TITEL as SESSION_LOAD`, Eintrag hinter T6.

`TrainingChartList.tsx`: `const SessionLoadChart = lazy(() => import('./SessionLoadChart'))` und

```tsx
      case T7:
        return <SessionLoadChart sessions={sessions} picker={picker} />
```

- [ ] **Step 9: Run the full suite and commit**

```bash
npm test -- --run
npm run lint
npx tsc -b --noEmit
git add src/lib/analysis src/components/charts/SessionLoadChart.tsx src/components/charts/SessionLoadChart.test.tsx src/components/charts/TrainingChartList.tsx
git commit -m "feat: T7 Dauer und Kalorien je Session"
```

---

## Task 10: T8 Persönliche Rekorde

**Files:**
- Modify: `src/lib/analysis/training-charts.ts`, `src/lib/analysis/chart-titles.ts`, `src/lib/analysis/registry.ts`, `src/components/charts/TrainingChartList.tsx`
- Create: `src/components/charts/PersonalRecordsList.tsx`, `src/components/charts/PersonalRecordsList.test.tsx`
- Test: `src/lib/analysis/training-charts.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Rekord = {
    exercise_id: string
    name: string
    einsRM: number
    gewicht: number
    wiederholungen: number
    tag: string
  }
  export function persoenlicheRekorde(sessions: AnalysisSession[], sets: AnalysisSet[]): Rekord[]
  export const REKORDE_TITEL = 'Persönliche Rekorde'
  export const T8 = 'T8'
  ```

T8 ist bewusst **kein** Diagramm, sondern eine Liste: acht Übungen mit je einer Zahl sind eine Tabelle, kein Verlauf. Die Komponente importiert deshalb kein Recharts.

- [ ] **Step 1: Write the failing test**

```ts
import { persoenlicheRekorde } from './training-charts'

describe('persoenlicheRekorde', () => {
  it('takes the best estimated 1RM per exercise with its date', () => {
    const rekorde = persoenlicheRekorde(
      [sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')],
      [satzIn('s1', 'e1', 90, 5), satzIn('s2', 'e1', 100, 5)],
    )
    expect(rekorde).toEqual([
      {
        exercise_id: 'e1',
        name: 'Bankdruecken',
        einsRM: 116.7,
        gewicht: 100,
        wiederholungen: 5,
        tag: '2026-08-24',
      },
    ])
  })

  it('keeps the earlier date when a later set only matches the record', () => {
    // Der Rekord gehoert dem Tag, an dem er zuerst stand.
    const rekorde = persoenlicheRekorde(
      [sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')],
      [satzIn('s1', 'e1', 90, 5), satzIn('s2', 'e1', 90, 5)],
    )
    expect(rekorde[0].tag).toBe('2026-08-17')
  })

  it('ignores warm-up sets and sets without a usable estimate', () => {
    expect(
      persoenlicheRekorde(
        [sitzung('s1', '2026-08-17')],
        [satzIn('s1', 'e1', 200, 5, true), satzIn('s1', 'e1', null, 5)],
      ),
    ).toEqual([])
  })

  it('sorts by estimated 1RM, heaviest first', () => {
    const rekorde = persoenlicheRekorde(
      [sitzung('s1', '2026-08-17')],
      [
        satzIn('s1', 'e1', 90, 5),
        { ...satzIn('s1', 'e2', 140, 5), exercise_name: 'Kniebeuge' },
      ],
    )
    expect(rekorde.map((rekord) => rekord.exercise_id)).toEqual(['e2', 'e1'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: FAIL — `persoenlicheRekorde is not a function`.

- [ ] **Step 3: Write the implementation**

```ts
export type Rekord = {
  exercise_id: string
  name: string
  einsRM: number
  gewicht: number
  wiederholungen: number
  tag: string
}

/**
 * T8: bestes geschaetztes 1RM je Uebung im Zeitraum, mit dem Tag, an dem es
 * zuerst stand.
 *
 * Nur echte Verbesserungen setzen den Tag neu (`>` statt `>=`): ein spaeterer
 * Satz mit demselben Wert wiederholt den Rekord, er stellt ihn nicht auf.
 */
export function persoenlicheRekorde(
  sessions: AnalysisSession[],
  sets: AnalysisSet[],
): Rekord[] {
  const tagJeSession = new Map<string, string>()
  for (const session of sessions) {
    if (session.gestartet_am != null) tagJeSession.set(session.id, localDay(session.gestartet_am))
  }

  const beste = new Map<string, Rekord>()
  for (const satz of sets) {
    if (satz.ist_aufwaermsatz) continue
    const einsRM = epley1RM(satz.gewicht, satz.wiederholungen)
    const tag = tagJeSession.get(satz.workout_session_id)
    if (einsRM == null || tag == null) continue
    const gerundet = runde(einsRM)
    const bisher = beste.get(satz.exercise_id)
    if (bisher && bisher.einsRM >= gerundet) continue
    beste.set(satz.exercise_id, {
      exercise_id: satz.exercise_id,
      name: satz.exercise_name,
      einsRM: gerundet,
      gewicht: satz.gewicht as number,
      wiederholungen: satz.wiederholungen as number,
      tag,
    })
  }

  return [...beste.values()].sort(
    (a, b) => b.einsRM - a.einsRM || a.name.localeCompare(b.name, 'de'),
  )
}
```

**Achtung Reihenfolge:** Die Sätze kommen aus dem Hook nach `satz_nummer` sortiert, nicht nach Datum. Damit „der frühere Tag gewinnt" stimmt, müssen gleich hohe Werte den bestehenden Eintrag stehen lassen (`>=` im `continue`) **und** die Sätze in Sessionreihenfolge durchlaufen werden. Deshalb wird vor der Schleife sortiert:

```ts
  const reihenfolge = new Map(sessions.map((session, index) => [session.id, index]))
  const sortierteSaetze = [...sets].sort(
    (a, b) =>
      (reihenfolge.get(a.workout_session_id) ?? 0) - (reihenfolge.get(b.workout_session_id) ?? 0),
  )
```

und die Schleife läuft über `sortierteSaetze`. `sessions` kommt aus dem Hook aufsteigend nach `gestartet_am`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/analysis/training-charts.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing list test**

Create `src/components/charts/PersonalRecordsList.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import PersonalRecordsList from './PersonalRecordsList'

const sitzung = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00+02:00`,
  beendet_am: `${tag}T19:00:00+02:00`,
  gesamt_kalorien: 300,
})

const satz = (sessionId: string, gewicht: number) => ({
  id: `${sessionId}-${gewicht}`,
  workout_session_id: sessionId,
  exercise_id: 'e1',
  exercise_name: 'Bankdruecken',
  muskelgruppen: ['brust'],
  satz_nummer: 1,
  gewicht,
  wiederholungen: 5,
  ist_aufwaermsatz: false,
})

describe('PersonalRecordsList', () => {
  it('shows the record with the set behind it and the date', () => {
    render(
      <PersonalRecordsList sessions={[sitzung('s1', '2026-08-17')]} sets={[satz('s1', 100)]} />,
    )
    expect(screen.getByText('Bankdruecken')).toBeInTheDocument()
    expect(screen.getByText('116,7 kg (100 kg × 5) am 17.08.2026')).toBeInTheDocument()
  })

  it('states the empty case without records', () => {
    render(<PersonalRecordsList sessions={[]} sets={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/PersonalRecordsList.test.tsx`
Expected: FAIL — Modul existiert nicht.

- [ ] **Step 7: Write the list**

Create `src/components/charts/PersonalRecordsList.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import { persoenlicheRekorde } from '../../lib/analysis/training-charts'
import { REKORDE_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = REKORDE_TITEL

/** `2026-08-17` → `17.08.2026`. */
function datumsLabel(tag: string) {
  const [jahr, monat, tagesZahl] = tag.split('-')
  return `${tagesZahl}.${monat}.${jahr}`
}

/** Eine Zahl mit einer Nachkommastelle, deutsch geschrieben. */
function zahl(wert: number) {
  return wert.toFixed(1).replace('.', ',')
}

/**
 * T8 ist bewusst kein Diagramm: acht Uebungen mit je einer Zahl sind eine
 * Liste. Diese Komponente importiert deshalb kein Recharts.
 */
export default function PersonalRecordsList({
  sessions,
  sets,
  picker,
}: {
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  picker?: ReactNode
}) {
  const rekorde = persoenlicheRekorde(sessions, sets)

  return (
    <ChartFrame titel={TITEL} leer={rekorde.length < 1} picker={picker}>
      <ul role="list">
        {rekorde.map((rekord) => (
          <li key={rekord.exercise_id}>
            <strong>{rekord.name}</strong>{' '}
            {`${zahl(rekord.einsRM)} kg (${rekord.gewicht} kg × ${rekord.wiederholungen}) am ${datumsLabel(rekord.tag)}`}
          </li>
        ))}
      </ul>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Titel, Registry, Liste**

`chart-titles.ts`: `export const REKORDE_TITEL = 'Persönliche Rekorde'`

`registry.ts`: `export const T8 = 'T8'`, Import `REKORDE_TITEL as RECORDS`, Eintrag hinter T7.

`TrainingChartList.tsx`: `const PersonalRecordsList = lazy(() => import('./PersonalRecordsList'))` und

```tsx
      case T8:
        return <PersonalRecordsList sessions={sessions} sets={sets} picker={picker} />
```

- [ ] **Step 9: Run the full suite and commit**

```bash
npm test -- --run
npm run lint
npx tsc -b --noEmit
git add src/lib/analysis src/components/charts/PersonalRecordsList.tsx src/components/charts/PersonalRecordsList.test.tsx src/components/charts/TrainingChartList.tsx
git commit -m "feat: T8 persoenliche Rekorde"
```

---

## Task 11: Abschluss — Doku, Bundle, Gesamtlauf

**Files:**
- Modify: `docs/domaenenmodell.md`
- Modify: `CLAUDE.md` (Abschnitt „Phase 5")

**Interfaces:**
- Consumes: alles Vorherige
- Produces: keine Codeschnittstelle

- [ ] **Step 1: Seitentest über die volle Analyse-Seite**

Ans Ende von `src/pages/TrainingAnalysisPage.test.tsx` — prüft, dass wirklich alle acht Graphen der Registry gerendert werden und nicht nur die verdrahteten:

```tsx
it('renders every registered training chart', async () => {
  // Der Fall, den die Registry verhindern soll: ein Graph ist angemeldet, aber
  // die Seite kennt ihn nicht — er waere im Picker sichtbar und nirgends sonst.
  renderPage() // die in dieser Datei bereits vorhandene Hilfsfunktion
  for (const chart of chartsFor('training')) {
    expect(await screen.findByText(chart.titel, {}, { timeout: 5000 })).toBeInTheDocument()
  }
})
```

`chartsFor` importieren. Falls die Datei keine Hilfsfunktion `renderPage` hat, wird der Aufbau des bestehenden Falls in dieser Datei übernommen.

- [ ] **Step 2: Run it**

Run: `npm test -- --run src/pages/TrainingAnalysisPage.test.tsx`
Expected: PASS. Schlägt er fehl, fehlt ein `case` in `TrainingChartList` — das ist genau der Fund, für den der Test da ist.

- [ ] **Step 3: Bundle messen**

Run: `npm run build`

Die Ausgabe gehört wörtlich in den Abschlussbericht: Größe des Start-Chunks und der ausgelagerten Chart-Chunks. Erwartung: der Start-Chunk wächst kaum, weil alle neuen Graphen hinter `React.lazy` in `TrainingChartList` liegen. Wächst er deutlich, hat ein Import Recharts in den Start gezogen — dann ist die Ursache zu suchen, bevor der Task schließt. Die bekannte Überschreitung der Warnschwelle bleibt ein Befund für die Härtungsphase und hält diesen Task nicht auf.

- [ ] **Step 4: Domänenmodell nachziehen**

In `docs/domaenenmodell.md` unter „Fachliche Notizen" ergänzen:

- Die Trainingsanalyse liest `workout_session_sets` über die IDs der Sessions im Zeitraum (zwei Abfragen, keine je Graph). `exercises` wird mitgelesen; eine gelöschte Übung lässt den Satz stehen und er erscheint als „Unbekannte Uebung".
- `satz_nummer` bleibt die rohe Reihenfolge über **alle** Sätze. Die Satznummern in T5 sind die Position unter den **Arbeitssätzen** und werden in der Oberfläche abgeleitet.
- Volumen wird auf `muskelgruppen_primaer` **verteilt** (zwei Gruppen bekommen je die Hälfte), nicht jeder Gruppe voll angerechnet.

Danach nach `../fitness-app.wiki/Domain-Model.md` spiegeln. **Nur die Datei schreiben, nichts im Wiki-Repo committen oder pushen** — das ist ein eigenes Git-Repo und passiert nach dem Merge.

- [ ] **Step 5: Status in CLAUDE.md nachziehen**

Im Abschnitt „Phase 5" festhalten: Plan 2a umgesetzt, welche Graphen es jetzt gibt, dass `useTrainingAnalysis` die Sätze mitlädt, dass `TrainingChartList` der einzige Ort ist, an dem ein Trainingsgraph eingebunden wird, und dass Plan 2b (Ernährung) und 2c (Körper) folgen. Die Testzahl und die Bundle-Zahlen aus Step 3 mit aufnehmen.

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
git add docs/domaenenmodell.md CLAUDE.md src/pages/TrainingAnalysisPage.test.tsx
git commit -m "docs: Domaenenmodell und Status fuer Plan 2a nachziehen"
```

---

## Manual Verification (nach dem Merge, gegen die echte Instanz)

Keine Migration in diesem Plan — geprüft wird gegen `npm run dev`, das an derselben Produktions-Supabase hängt.

1. `/training/analyse` öffnen: **acht** Graphen stehen untereinander, jeder mit Titel und Häkchen.
2. Über T2 bis T5 steht die Übungsauswahl, vorbelegt mit der am häufigsten trainierten Übung. Umschalten ändert alle vier unabhängig voneinander.
3. Zeitraum auf „30 Tage" stellen: die Kurven werden kürzer, die Übungsauswahl enthält nur noch Übungen aus diesem Fenster.
4. T2 gegen die Trainingshistorie prüfen: der höchste Wert eines Tages muss zum schwersten Arbeitssatz dieses Tages passen (`Gewicht × (1 + Wdh / 30)`).
5. Ein Aufwärmsatz mit hohem Gewicht darf in T2, T3, T4, T6 und T8 **nicht** auftauchen. Dafür in der Historie einen Satz als Aufwärmsatz markieren und die Graphen vergleichen.
6. T6 gegen die Summe prüfen: die Balken zusammen ergeben das Volumen aller Arbeitssätze mit zugeordneter Muskelgruppe, nicht mehr.
7. T8 zeigt je Übung genau eine Zeile mit Datum; das Datum ist der Tag, an dem der Rekord zuerst stand.
8. Zwei Graphen anhaken, `/training` öffnen: beide stehen dort, **ohne** Zeitraum-Knöpfe und **ohne** Übungsauswahl. Netzwerkanalyse: genau **zwei** Abfragen (`workout_sessions`, `workout_session_sets`), nicht je Graph eine.
9. Alle Trainings-Häkchen abwählen, `/training` neu laden: kein Graph, und **keine** Abfrage auf `workout_sessions` oder `workout_session_sets`.
10. Netzwerkanalyse auf `/login`: kein Recharts-Chunk. Konsole auf Fehler und Warnungen prüfen.

---

## Self-Review

**Spec-Abdeckung.** T2 Task 4, T3 Task 5, T4 Task 6, T5 Task 7, T6 Task 8, T7 Task 9, T8 Task 10. Übungsauswahl mit Vorbelegung (Spec 4, „Übungsauswahl") Task 3, auf dem Dashboard ausgeblendet über `mitUebungsauswahl={analyse}`. Ein Hook je Bereich (Spec 3, „Datenfluss") Task 1 und Task 2. Registry als einzige Wahrheit (Spec 3) — jeder Chart-Task meldet sich dort an, Task 11 Step 1 prüft, dass Anmeldung und Rendern nicht auseinanderlaufen. Leerzustände (Spec 5) in jeder Komponente über `ChartFrame`. Aufwärmsätze (Spec 5) in Task 4, 5, 6, 7, 8, 10 je mit eigenem Testfall. Epley (Spec 5) Task 4. Lokale Tage (Spec 5) Task 4 mit Testfall, danach über `punkteJeSession` und `localDay` überall gleich. Ladefehler gehören dem Bereich (Spec 5) — bleibt wie in Plan 1 die Meldung oben auf der Seite, Task 1 zieht den Satz-Ladefehler in dasselbe `error`.

**Nicht in diesem Plan:** E2–E6 und K2–K5 — Plan 2b und 2c. K5 braucht zusätzlich signierte Foto-Links, K4 die Tagessummen der Ernährung, E6 die Session-Kalorien; diese Hook-Erweiterungen gehören in den jeweiligen Plan, nicht hierher.

**Typkonsistenz.** `UebungsPunkt` (`{ tag, wert }`) tragen T2, T3 und T4; `punkteJeSession` ist ihre gemeinsame Grundlage und wird in Task 4 eingeführt, bevor Task 5 und 6 sie benutzen. `satzVolumen` entsteht in Task 5 und wird in Task 8 wiederverwendet. `tagesLabel` wird in Task 4 exportiert und von Task 5, 6, 7 und 9 importiert — eine Stelle, keine Kopie. `AnalysisSet` heißt in Hook, Rechenfunktionen und Komponenten gleich.

**Offene Entscheidung für den Reviewer.** In `StrengthChart` (Task 4, Step 7) steht die Übungsauswahl innerhalb von `ChartFrame` und verschwindet damit im Leerzustand. Wenn das stört, gehört sie in den `picker`-Slot — dann in allen vier Komponenten gleich.

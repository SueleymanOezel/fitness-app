# Home-Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `HomePage.tsx` bekommt echten Inhalt statt eines Platzhalters — eine feste Statusübersicht (Kalorien heute, nächster Trainingstag, letzte Gewichtsänderung) plus drei neue, optionale Graphen (H1 Aktivitätsraster, H2 Wochen-Kurzform, H3 Trends), gebaut mit denselben Phase-6-Design-Bausteinen wie Training/Ernährung/Körper.

**Architecture:** Ein neuer Bereich `'home'` in der bestehenden Analyse-Registry (`src/lib/analysis/registry.ts`), ein Hook `useHomeAnalysis`, der die drei bestehenden Bereichs-Hooks komponiert statt eigener Supabase-Abfragen, und eine `HomeChartList` nach demselben `switch`-über-Registry-IDs-Muster wie `TrainingChartList`/`NutritionChartList`/`BodyChartList`. `day_status`/`health_sync_data` bleiben ungenutzt — Trainingstag/Restday wird live aus `workout_sessions.beendet_am` abgeleitet.

**Tech Stack:** React 19, TypeScript, Vite, Supabase, Recharts (nur H3), Tailwind CSS v4, Vitest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-06-home-dashboard-design.md`

## Global Constraints

- Keine neue Migration — `profiles.analyse_auswahl` ist bereits generisch, `day_status`/`health_sync_data` bleiben unangetastet.
- Design-Farben für H3 (das einzige Recharts-Element) ausschließlich als literale Hex-Strings aus `src/lib/analysis/chart-colors.ts` — nie `var(...)`.
- Karten-in-Liste-Muster, falls eine `<li>` einen `cardClass`-`<div>` umschließt: `<li className="block border-b-0">` außen, `<div className={`${cardClass} w-full`}>` innen — niemals `cardClass` direkt auf `<li>`.
- Chart-Tests prüfen gezeichnete Marken (Zellen, Listenzeilen, Linienpunkte), nie Farbwerte oder Achsentexte.
- "Kein Häkchen → keine Abfrage": `useHomeAnalysis` mountet nur, wenn mindestens ein Home-Graph angehakt ist (Dashboard) bzw. immer auf der Analyse-Seite (wie bei den drei bestehenden Bereichen).
- Kein Formular, kein Dialog, kein Toast auf Home — rein lesend, jede Aktion verlinkt in den jeweiligen Bereich.

---

### Task 1: Grundfunktionen — `home-charts.ts` und `use-home-analysis.ts`

**Files:**
- Create: `src/lib/analysis/home-charts.ts`
- Create: `src/lib/analysis/home-charts.test.ts`
- Create: `src/hooks/use-home-analysis.ts`
- Create: `src/hooks/use-home-analysis.test.ts`

**Interfaces:**
- Consumes: `wochenStart`/`wochenLabel` aus `src/lib/analysis/wochen.ts` (bereits vorhanden: `wochenStart(iso: string): string`, `wochenLabel(montag: string): string`), `localDay` aus `src/lib/local-time.ts` (`localDay(iso: string): string`), `kalorienJeTag`/`TagesPunkt` aus `src/lib/analysis/nutrition-charts.ts` (`kalorienJeTag(entries): TagesPunkt[]`, `TagesPunkt = { tag: string; kalorien: number }`), `useTrainingAnalysis` aus `src/hooks/use-training-analysis.ts` (gibt `{ sessions: AnalysisSession[], sets, loading, error }`, `AnalysisSession = { id, gestartet_am, beendet_am, gesamt_kalorien }`), `useNutritionAnalysis` aus `src/hooks/use-nutrition-analysis.ts` (gibt `{ entries: AnalysisFoodEntry[], sessions, loading, error }`, `AnalysisFoodEntry = { zeitpunkt, menge, mahlzeit, products }`), `useBodyAnalysis` aus `src/hooks/use-body-analysis.ts` (gibt `{ rows: BodyMetricRow[], kalorien, fotos, loading, error }`), `Zeitraum` aus `src/lib/analysis/zeitraum.ts`.
- Produces: `export type RasterTag = { datum: string; status: 'trainingstag' | 'restday' }`, `export function aktivitaetsraster(sessions: { beendet_am: string | null }[], start: string | null, heute: string): RasterTag[]`, `export type WochenZeile = { woche: string; trainingseinheiten: number; kalorienschnitt: number | null; gewichtsAenderung: number | null }`, `export function wochenKurzform(sessions: { beendet_am: string | null }[], tagesKalorien: TagesPunkt[], gewichte: { datum: string; gewicht: number | null }[]): WochenZeile[]`, `export function useHomeAnalysis(userId: string, zeitraum: Zeitraum): { sessions: AnalysisSession[]; entries: AnalysisFoodEntry[]; rows: BodyMetricRow[]; loading: boolean; error: boolean }` — spätere Tasks (H1/H2/H3, `HomeChartList`, `HomePage`, `HomeAnalysisPage`) importieren genau diese Namen und Typen.

- [ ] **Step 1: Schreibe die fehlschlagenden Tests für `aktivitaetsraster`**

```ts
// src/lib/analysis/home-charts.test.ts
import { describe, expect, it } from 'vitest'
import { aktivitaetsraster, wochenKurzform } from './home-charts'

describe('aktivitaetsraster', () => {
  it('marks a day with a completed session as a training day', () => {
    const sessions = [{ beendet_am: '2026-08-24T18:00:00Z' }]
    const raster = aktivitaetsraster(sessions, '2026-08-24', '2026-08-25')
    expect(raster).toEqual([
      { datum: '2026-08-24', status: 'trainingstag' },
      { datum: '2026-08-25', status: 'restday' },
    ])
  })

  it('ignores an unfinished session', () => {
    const sessions = [{ beendet_am: null }]
    const raster = aktivitaetsraster(sessions, '2026-08-24', '2026-08-24')
    expect(raster).toEqual([{ datum: '2026-08-24', status: 'restday' }])
  })

  it('starts at the first training day when the range is "alles" (start=null) and there are sessions', () => {
    const sessions = [{ beendet_am: '2026-08-20T10:00:00Z' }]
    const raster = aktivitaetsraster(sessions, null, '2026-08-22')
    expect(raster.map((tag) => tag.datum)).toEqual(['2026-08-20', '2026-08-21', '2026-08-22'])
  })

  it('produces a single restday for a brand-new account with no sessions and no start', () => {
    const raster = aktivitaetsraster([], null, '2026-08-24')
    expect(raster).toEqual([{ datum: '2026-08-24', status: 'restday' }])
  })
})

describe('wochenKurzform', () => {
  it('combines training count, calorie average and weight change per week', () => {
    // Montag 2026-08-17 - Sonntag 2026-08-23
    const sessions = [{ beendet_am: '2026-08-18T10:00:00Z' }, { beendet_am: '2026-08-20T10:00:00Z' }]
    const tagesKalorien = [
      { tag: '2026-08-17', kalorien: 2000 },
      { tag: '2026-08-19', kalorien: 2200 },
    ]
    const gewichte = [
      { datum: '2026-08-17', gewicht: 83.0 },
      { datum: '2026-08-21', gewicht: 82.5 },
    ]
    const zeilen = wochenKurzform(sessions, tagesKalorien, gewichte)
    expect(zeilen).toEqual([
      {
        woche: '2026-KW34',
        trainingseinheiten: 2,
        kalorienschnitt: 2100,
        gewichtsAenderung: -0.5,
      },
    ])
  })

  it('leaves kalorienschnitt and gewichtsAenderung null without matching data', () => {
    const sessions = [{ beendet_am: '2026-08-18T10:00:00Z' }]
    const zeilen = wochenKurzform(sessions, [], [])
    expect(zeilen).toEqual([
      { woche: '2026-KW34', trainingseinheiten: 1, kalorienschnitt: null, gewichtsAenderung: null },
    ])
  })

  it('needs at least two weight measurements in the week for a change', () => {
    const gewichte = [{ datum: '2026-08-17', gewicht: 83.0 }]
    const zeilen = wochenKurzform([], [], gewichte)
    expect(zeilen[0].gewichtsAenderung).toBeNull()
  })

  it('omits a week with no signal from any of the three sources', () => {
    const zeilen = wochenKurzform([], [], [])
    expect(zeilen).toEqual([])
  })
})
```

- [ ] **Step 2: Lauf die Tests, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/lib/analysis/home-charts.test.ts`
Expected: FAIL mit "Cannot find module './home-charts'"

- [ ] **Step 3: Implementiere `home-charts.ts`**

```ts
// src/lib/analysis/home-charts.ts
import { wochenLabel, wochenStart } from './wochen'
import { localDay } from '../local-time'
import type { TagesPunkt } from './nutrition-charts'

export type RasterTag = { datum: string; status: 'trainingstag' | 'restday' }

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Naechster Kalendertag ueber lokale Kalenderfelder statt Millisekunden-
 * Addition — dieselbe Vorsicht wie in `rangeStart` (zeitraum.ts): ein
 * Millisekunden-Sprung driftet ueber einen Sommerzeitwechsel um eine Stunde.
 */
function naechsterTag(iso: string): string {
  const [jahr, monat, tag] = iso.split('-').map(Number)
  const naechster = new Date(jahr, monat - 1, tag + 1)
  return `${naechster.getFullYear()}-${pad(naechster.getMonth() + 1)}-${pad(naechster.getDate())}`
}

/**
 * H1: ein Eintrag je Kalendertag von `start` bis `heute`, aeltester zuerst.
 * Trainingstag: mindestens eine Session mit `beendet_am` an diesem Tag.
 *
 * `start === null` (Zeitraum "alles") beginnt am ersten Trainingstag, nicht an
 * einem beliebig fruehen Datum — sonst rendert das Raster tausende leere
 * Restday-Felder vor dem ersten echten Eintrag. Ohne jede Session und ohne
 * `start` bleibt nur der heutige Tag als einzelner Restday.
 */
export function aktivitaetsraster(
  sessions: { beendet_am: string | null }[],
  start: string | null,
  heute: string,
): RasterTag[] {
  const trainingstage = new Set<string>()
  for (const session of sessions) {
    if (session.beendet_am != null) trainingstage.add(localDay(session.beendet_am))
  }

  const ersterTag = start ?? [...trainingstage].sort()[0] ?? heute
  const raster: RasterTag[] = []
  let tag = ersterTag
  while (tag <= heute) {
    raster.push({ datum: tag, status: trainingstage.has(tag) ? 'trainingstag' : 'restday' })
    tag = naechsterTag(tag)
  }
  return raster
}

export type WochenZeile = {
  woche: string
  trainingseinheiten: number
  kalorienschnitt: number | null
  gewichtsAenderung: number | null
}

type WochenEintrag = { einheiten: number; kalorien: number[]; gewichte: { datum: string; wert: number }[] }

/**
 * H2: eine Zeile je Kalenderwoche mit mindestens einem Signal aus den drei
 * Quellen — eine Woche ohne jede Session, jeden Kalorieneintrag und jede
 * Messung erscheint nicht (dieselbe Regel wie bei E5/T1: nur Wochen mit
 * Daten, keine mit Nullen aufgefuellten).
 *
 * Kalorienschnitt: Mittelwert ueber `tagesKalorien` (schon nur Tage **mit**
 * Eintrag, wie E5). Gewichtsaenderung: letzter minus erster gemessener Wert
 * der Woche, auf zwei Nachkommastellen gerundet wie in `body-change.ts`,
 * `null` bei weniger als zwei Messungen in der Woche.
 */
export function wochenKurzform(
  sessions: { beendet_am: string | null }[],
  tagesKalorien: TagesPunkt[],
  gewichte: { datum: string; gewicht: number | null }[],
): WochenZeile[] {
  const wochen = new Map<string, WochenEintrag>()

  function eintrag(montag: string): WochenEintrag {
    let zeile = wochen.get(montag)
    if (!zeile) {
      zeile = { einheiten: 0, kalorien: [], gewichte: [] }
      wochen.set(montag, zeile)
    }
    return zeile
  }

  for (const session of sessions) {
    if (session.beendet_am == null) continue
    eintrag(wochenStart(session.beendet_am)).einheiten += 1
  }
  for (const punkt of tagesKalorien) {
    eintrag(wochenStart(`${punkt.tag}T00:00:00`)).kalorien.push(punkt.kalorien)
  }
  for (const zeile of gewichte) {
    if (zeile.gewicht == null) continue
    eintrag(wochenStart(`${zeile.datum}T00:00:00`)).gewichte.push({ datum: zeile.datum, wert: zeile.gewicht })
  }

  return [...wochen.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([montag, zeile]) => {
      const gewogen = [...zeile.gewichte].sort((a, b) => a.datum.localeCompare(b.datum))
      const gewichtsAenderung =
        gewogen.length >= 2
          ? Math.round((gewogen[gewogen.length - 1].wert - gewogen[0].wert) * 100) / 100
          : null
      return {
        woche: wochenLabel(montag),
        trainingseinheiten: zeile.einheiten,
        kalorienschnitt:
          zeile.kalorien.length > 0
            ? Math.round(zeile.kalorien.reduce((summe, wert) => summe + wert, 0) / zeile.kalorien.length)
            : null,
        gewichtsAenderung,
      }
    })
}
```

- [ ] **Step 4: Lauf die Tests erneut, um das Bestehen zu bestätigen**

Run: `npx vitest run src/lib/analysis/home-charts.test.ts`
Expected: PASS (8 Tests)

- [ ] **Step 5: Schreibe den fehlschlagenden Test für `useHomeAnalysis`**

```ts
// src/hooks/use-home-analysis.test.ts
import { describe, expect, it, vi } from 'vitest'
import { useHomeAnalysis } from './use-home-analysis'

const mockTraining = vi.fn()
vi.mock('./use-training-analysis', () => ({ useTrainingAnalysis: (...args: unknown[]) => mockTraining(...args) }))
const mockNutrition = vi.fn()
vi.mock('./use-nutrition-analysis', () => ({ useNutritionAnalysis: (...args: unknown[]) => mockNutrition(...args) }))
const mockBody = vi.fn()
vi.mock('./use-body-analysis', () => ({ useBodyAnalysis: (...args: unknown[]) => mockBody(...args) }))

function stub(overrides: Record<string, unknown> = {}) {
  return { loading: false, error: false, ...overrides }
}

describe('useHomeAnalysis', () => {
  it('composes sessions, entries and rows from the three area hooks', () => {
    mockTraining.mockReturnValue(stub({ sessions: ['s1'], sets: [] }))
    mockNutrition.mockReturnValue(stub({ entries: ['e1'], sessions: [] }))
    mockBody.mockReturnValue(stub({ rows: ['r1'], kalorien: [], fotos: [] }))

    const result = useHomeAnalysis('u1', 90)

    expect(result).toEqual({ sessions: ['s1'], entries: ['e1'], rows: ['r1'], loading: false, error: false })
    expect(mockTraining).toHaveBeenCalledWith('u1', 90)
    expect(mockNutrition).toHaveBeenCalledWith('u1', 90)
    expect(mockBody).toHaveBeenCalledWith('u1', 90)
  })

  it('is loading while any of the three sources is loading', () => {
    mockTraining.mockReturnValue(stub({ sessions: [], sets: [], loading: true }))
    mockNutrition.mockReturnValue(stub({ entries: [], sessions: [] }))
    mockBody.mockReturnValue(stub({ rows: [], kalorien: [], fotos: [] }))

    expect(useHomeAnalysis('u1', 90).loading).toBe(true)
  })

  it('is an error if any of the three sources failed', () => {
    mockTraining.mockReturnValue(stub({ sessions: [], sets: [] }))
    mockNutrition.mockReturnValue(stub({ entries: [], sessions: [] }))
    mockBody.mockReturnValue(stub({ rows: [], kalorien: [], fotos: [], error: true }))

    expect(useHomeAnalysis('u1', 90).error).toBe(true)
  })
})
```

Note für den Implementierer: `useHomeAnalysis` ruft drei andere Hooks direkt auf (Hooks-Komposition, keine React-Komponente) — das ist in diesem Testaufbau unproblematisch, weil alle drei gemockt sind und keine echten React-Hook-Regeln (State/Effects) durchlaufen. Kein `renderHook` nötig.

- [ ] **Step 6: Lauf den Test, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/hooks/use-home-analysis.test.ts`
Expected: FAIL mit "Cannot find module './use-home-analysis'"

- [ ] **Step 7: Implementiere `use-home-analysis.ts`**

```ts
// src/hooks/use-home-analysis.ts
import { useTrainingAnalysis } from './use-training-analysis'
import { useNutritionAnalysis } from './use-nutrition-analysis'
import { useBodyAnalysis } from './use-body-analysis'
import type { Zeitraum } from '../lib/analysis/zeitraum'

/**
 * Komponiert die drei bestehenden Bereichs-Hooks statt eigener Supabase-
 * Abfragen zu schreiben — Pagination, Chunking und Fehlerbehandlung
 * existieren dort bereits. Bewusste Konsequenz: sobald ein Home-Graph
 * angehakt ist, feuern alle Abfragen, die Training (2), Ernaehrung (2) und
 * Koerper (3) je einzeln schon ausloesen (Spec, Abschnitt "Datenfluss").
 */
export function useHomeAnalysis(userId: string, zeitraum: Zeitraum) {
  const training = useTrainingAnalysis(userId, zeitraum)
  const nutrition = useNutritionAnalysis(userId, zeitraum)
  const body = useBodyAnalysis(userId, zeitraum)
  return {
    sessions: training.sessions,
    entries: nutrition.entries,
    rows: body.rows,
    loading: training.loading || nutrition.loading || body.loading,
    error: training.error || nutrition.error || body.error,
  }
}
```

- [ ] **Step 8: Lauf den Test, um das Bestehen zu bestätigen**

Run: `npx vitest run src/hooks/use-home-analysis.test.ts`
Expected: PASS (3 Tests)

- [ ] **Step 9: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 10: Commit**

```bash
git add src/lib/analysis/home-charts.ts src/lib/analysis/home-charts.test.ts src/hooks/use-home-analysis.ts src/hooks/use-home-analysis.test.ts
git commit -m "feat: Grundfunktionen fuer Home-Graphen (Raster, Wochen-Kurzform, Hook)"
```

---

### Task 2: H1 — Aktivitätsraster

**Files:**
- Modify: `src/lib/analysis/chart-titles.ts`
- Modify: `src/lib/analysis/registry.ts`
- Modify: `src/lib/analysis/registry.test.ts`
- Create: `src/components/charts/ActivityGridChart.tsx`
- Create: `src/components/charts/ActivityGridChart.test.tsx`

**Interfaces:**
- Consumes: `aktivitaetsraster`/`RasterTag` aus Task 1 (`src/lib/analysis/home-charts.ts`), `rangeStart`/`Zeitraum` aus `src/lib/analysis/zeitraum.ts` (`rangeStart(zeitraum: Zeitraum, jetzt?: Date): string | null`), `localDay` aus `src/lib/local-time.ts`, `cardClass` aus `src/lib/ui-classes.ts` (über `ChartFrame`), `ChartFrame` aus `src/components/charts/ChartFrame.tsx` (`{ titel, leer, picker, children }`).
- Produces: `export const TITEL` (String `'Aktivitätsraster'`) und `export default function ActivityGridChart({ sessions, zeitraum, picker }: { sessions: { beendet_am: string | null }[]; zeitraum: Zeitraum; picker?: ReactNode })` — Task 5 (`HomeChartList`) importiert genau diese Komponente und Props. `registry.ts` exportiert ab dieser Task `H1 = 'H1'` und `Bereich = 'training' | 'nutrition' | 'body' | 'home'`.

- [ ] **Step 1: Ergänze den Titel**

In `src/lib/analysis/chart-titles.ts`, ans Ende der Datei anfügen:

```ts
export const AKTIVITAETSRASTER_TITEL = 'Aktivitätsraster'
```

- [ ] **Step 2: Erweitere die Registry**

In `src/lib/analysis/registry.ts`:

Ändere:
```ts
  GEWICHT_UEBER_KALORIEN_TITEL as WEIGHT_VS_CALORIES,
  FOTOS_TITEL as PHOTOS,
} from './chart-titles'

export type Bereich = 'training' | 'nutrition' | 'body'
```
zu:
```ts
  GEWICHT_UEBER_KALORIEN_TITEL as WEIGHT_VS_CALORIES,
  FOTOS_TITEL as PHOTOS,
  AKTIVITAETSRASTER_TITEL as ACTIVITY_GRID,
} from './chart-titles'

export type Bereich = 'training' | 'nutrition' | 'body' | 'home'
```

Ändere:
```ts
export const K5 = 'K5'

export const CHARTS: ChartDef[] = [
```
zu:
```ts
export const K5 = 'K5'
export const H1 = 'H1'

export const CHARTS: ChartDef[] = [
```

Ändere:
```ts
  { id: K5, bereich: 'body', titel: PHOTOS },
]
```
zu:
```ts
  { id: K5, bereich: 'body', titel: PHOTOS },
  { id: H1, bereich: 'home', titel: ACTIVITY_GRID },
]
```

- [ ] **Step 3: Aktualisiere `registry.test.ts` für H1**

Ändere:
```ts
import { TITEL as K5_TITEL } from '../../components/charts/PhotoTimeline'
```
zu:
```ts
import { TITEL as K5_TITEL } from '../../components/charts/PhotoTimeline'
import { TITEL as H1_TITEL } from '../../components/charts/ActivityGridChart'
```

Ändere:
```ts
    expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'K1', 'K2', 'K3', 'K4', 'K5'])
```
zu:
```ts
    expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'K1', 'K2', 'K3', 'K4', 'K5', 'H1'])
```

Ändere:
```ts
    expect(CHARTS.find((chart) => chart.id === 'K5')?.titel).toBe(K5_TITEL)
  })

  it('filters by area', () => {
    expect(chartsFor('training').map((chart) => chart.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'])
    expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6'])
    expect(chartsFor('body').map((chart) => chart.id)).toEqual(['K1', 'K2', 'K3', 'K4', 'K5'])
  })
```
zu:
```ts
    expect(CHARTS.find((chart) => chart.id === 'K5')?.titel).toBe(K5_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'H1')?.titel).toBe(H1_TITEL)
  })

  it('filters by area', () => {
    expect(chartsFor('training').map((chart) => chart.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'])
    expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6'])
    expect(chartsFor('body').map((chart) => chart.id)).toEqual(['K1', 'K2', 'K3', 'K4', 'K5'])
    expect(chartsFor('home').map((chart) => chart.id)).toEqual(['H1'])
  })
```

(Die übrigen zwei Tests — `'exports an id constant for every registered chart'` und `'has no duplicate ids'` — brauchen keine Änderung, sie leiten alles aus `registry`/`CHART_IDS` ab.)

- [ ] **Step 4: Lauf die Registry-Tests, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/lib/analysis/registry.test.ts`
Expected: FAIL — Importfehler, weil `./ActivityGridChart` noch nicht existiert

- [ ] **Step 5: Schreibe den fehlschlagenden Test für `ActivityGridChart`**

```tsx
// src/components/charts/ActivityGridChart.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ActivityGridChart from './ActivityGridChart'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 25, 12, 0, 0))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('ActivityGridChart', () => {
  it('renders one cell per day in the window, marking training days', () => {
    const sessions = [{ beendet_am: '2026-08-24T18:00:00Z' }]
    render(<ActivityGridChart sessions={sessions} zeitraum={30} />)
    const zellen = screen.getByTestId('aktivitaetsraster').querySelectorAll('[data-status]')
    // rangeStart(30, 2026-08-25) beginnt am 2026-07-26, bis heute (2026-08-25) sind das 31 Tage
    expect(zellen.length).toBe(31)
    const trainingszellen = [...zellen].filter((zelle) => zelle.getAttribute('data-status') === 'trainingstag')
    expect(trainingszellen).toHaveLength(1)
    expect(trainingszellen[0]).toHaveAttribute('title', '2026-08-24')
  })

  it('shows the empty state without any day in range', () => {
    render(<ActivityGridChart sessions={[]} zeitraum={30} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Lauf den Test, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/components/charts/ActivityGridChart.test.tsx`
Expected: FAIL mit "Cannot find module './ActivityGridChart'"

- [ ] **Step 7: Implementiere `ActivityGridChart.tsx`**

```tsx
// src/components/charts/ActivityGridChart.tsx
import type { ReactNode } from 'react'
import { aktivitaetsraster } from '../../lib/analysis/home-charts'
import { AKTIVITAETSRASTER_TITEL } from '../../lib/analysis/chart-titles'
import { rangeStart, type Zeitraum } from '../../lib/analysis/zeitraum'
import { localDay } from '../../lib/local-time'
import ChartFrame from './ChartFrame'

export const TITEL = AKTIVITAETSRASTER_TITEL

/**
 * H1 ist bewusst kein Recharts-Graph: ein Feld je Kalendertag ist ein
 * CSS-Grid, kein Koordinatensystem — genauso wie T8/K5 schon ohne Recharts
 * auskommen. `zeitraum` kommt als eigener Prop (nicht nur `sessions`), weil
 * das Raster auch Tage ohne jede Session als Restday zeichnen muss — die
 * gefilterten `sessions` allein verraten nicht, wo das Fenster beginnt.
 */
export default function ActivityGridChart({
  sessions,
  zeitraum,
  picker,
}: {
  sessions: { beendet_am: string | null }[]
  zeitraum: Zeitraum
  picker?: ReactNode
}) {
  const heute = localDay(new Date().toISOString())
  const raster = aktivitaetsraster(sessions, rangeStart(zeitraum), heute)

  return (
    <ChartFrame titel={TITEL} leer={raster.length < 1} picker={picker}>
      <ul role="list" className="grid grid-cols-7 gap-1" data-testid="aktivitaetsraster">
        {raster.map((tag) => (
          <li key={tag.datum} className="block border-b-0">
            <div
              className={`aspect-square rounded ${
                tag.status === 'trainingstag' ? 'bg-accent' : 'bg-surface border border-text-muted'
              }`}
              title={tag.datum}
              data-status={tag.status}
            />
          </li>
        ))}
      </ul>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Lauf die Tests, um das Bestehen zu bestätigen**

Run: `npx vitest run src/components/charts/ActivityGridChart.test.tsx src/lib/analysis/registry.test.ts`
Expected: PASS (beide Dateien)

- [ ] **Step 9: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 10: Commit**

```bash
git add src/lib/analysis/chart-titles.ts src/lib/analysis/registry.ts src/lib/analysis/registry.test.ts src/components/charts/ActivityGridChart.tsx src/components/charts/ActivityGridChart.test.tsx
git commit -m "feat: H1 Aktivitaetsraster"
```

---

### Task 3: H2 — Wochen-Kurzform

**Files:**
- Modify: `src/lib/analysis/chart-titles.ts`
- Modify: `src/lib/analysis/registry.ts`
- Modify: `src/lib/analysis/registry.test.ts`
- Create: `src/components/charts/WeeklySummaryList.tsx`
- Create: `src/components/charts/WeeklySummaryList.test.tsx`

**Interfaces:**
- Consumes: `wochenKurzform` aus Task 1, `kalorienJeTag`/`TagesPunkt` aus `src/lib/analysis/nutrition-charts.ts`, `ChartFrame`.
- Produces: `export const TITEL` (`'Wochen-Kurzform'`), `export default function WeeklySummaryList({ sessions, entries, rows, picker }: { sessions: { beendet_am: string | null }[]; entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[]; rows: { datum: string; gewicht: number | null }[]; picker?: ReactNode })`. `registry.ts` exportiert ab dieser Task zusätzlich `H2 = 'H2'`.

- [ ] **Step 1: Ergänze den Titel**

In `src/lib/analysis/chart-titles.ts`, ans Ende anfügen:

```ts
export const WOCHEN_KURZFORM_TITEL = 'Wochen-Kurzform'
```

- [ ] **Step 2: Erweitere die Registry**

In `src/lib/analysis/registry.ts`:

Ändere:
```ts
  AKTIVITAETSRASTER_TITEL as ACTIVITY_GRID,
} from './chart-titles'
```
zu:
```ts
  AKTIVITAETSRASTER_TITEL as ACTIVITY_GRID,
  WOCHEN_KURZFORM_TITEL as WEEKLY_SUMMARY,
} from './chart-titles'
```

Ändere:
```ts
export const H1 = 'H1'

export const CHARTS: ChartDef[] = [
```
zu:
```ts
export const H1 = 'H1'
export const H2 = 'H2'

export const CHARTS: ChartDef[] = [
```

Ändere:
```ts
  { id: H1, bereich: 'home', titel: ACTIVITY_GRID },
]
```
zu:
```ts
  { id: H1, bereich: 'home', titel: ACTIVITY_GRID },
  { id: H2, bereich: 'home', titel: WEEKLY_SUMMARY },
]
```

- [ ] **Step 3: Aktualisiere `registry.test.ts` für H2**

Ändere:
```ts
import { TITEL as H1_TITEL } from '../../components/charts/ActivityGridChart'
```
zu:
```ts
import { TITEL as H1_TITEL } from '../../components/charts/ActivityGridChart'
import { TITEL as H2_TITEL } from '../../components/charts/WeeklySummaryList'
```

Ändere:
```ts
    expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'K1', 'K2', 'K3', 'K4', 'K5', 'H1'])
```
zu:
```ts
    expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'K1', 'K2', 'K3', 'K4', 'K5', 'H1', 'H2'])
```

Ändere:
```ts
    expect(CHARTS.find((chart) => chart.id === 'H1')?.titel).toBe(H1_TITEL)
  })

  it('filters by area', () => {
    expect(chartsFor('training').map((chart) => chart.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'])
    expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6'])
    expect(chartsFor('body').map((chart) => chart.id)).toEqual(['K1', 'K2', 'K3', 'K4', 'K5'])
    expect(chartsFor('home').map((chart) => chart.id)).toEqual(['H1'])
  })
```
zu:
```ts
    expect(CHARTS.find((chart) => chart.id === 'H1')?.titel).toBe(H1_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'H2')?.titel).toBe(H2_TITEL)
  })

  it('filters by area', () => {
    expect(chartsFor('training').map((chart) => chart.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'])
    expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6'])
    expect(chartsFor('body').map((chart) => chart.id)).toEqual(['K1', 'K2', 'K3', 'K4', 'K5'])
    expect(chartsFor('home').map((chart) => chart.id)).toEqual(['H1', 'H2'])
  })
```

- [ ] **Step 4: Lauf die Registry-Tests, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/lib/analysis/registry.test.ts`
Expected: FAIL — Importfehler, weil `./WeeklySummaryList` noch nicht existiert

- [ ] **Step 5: Schreibe den fehlschlagenden Test für `WeeklySummaryList`**

```tsx
// src/components/charts/WeeklySummaryList.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import WeeklySummaryList from './WeeklySummaryList'

describe('WeeklySummaryList', () => {
  it('renders one row per week with all three metrics', () => {
    const sessions = [{ beendet_am: '2026-08-18T10:00:00Z' }]
    const entries = [{ zeitpunkt: '2026-08-17T08:00:00Z', menge: 100, products: { kalorien: 200 } }]
    const rows = [
      { datum: '2026-08-17', gewicht: 83.0 },
      { datum: '2026-08-21', gewicht: 82.5 },
    ]
    render(<WeeklySummaryList sessions={sessions} entries={entries} rows={rows} />)
    const zeile = screen.getByRole('listitem')
    expect(zeile).toHaveTextContent('2026-KW34')
    expect(zeile).toHaveTextContent('1 Trainingseinheiten')
    expect(zeile).toHaveTextContent('200 kcal')
    expect(zeile).toHaveTextContent('−0.5 kg')
  })

  it('shows the empty state without any signal', () => {
    render(<WeeklySummaryList sessions={[]} entries={[]} rows={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Lauf den Test, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/components/charts/WeeklySummaryList.test.tsx`
Expected: FAIL mit "Cannot find module './WeeklySummaryList'"

- [ ] **Step 7: Implementiere `WeeklySummaryList.tsx`**

```tsx
// src/components/charts/WeeklySummaryList.tsx
import type { ReactNode } from 'react'
import { wochenKurzform } from '../../lib/analysis/home-charts'
import { kalorienJeTag } from '../../lib/analysis/nutrition-charts'
import { WOCHEN_KURZFORM_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = WOCHEN_KURZFORM_TITEL

/** U+2212 Minuszeichen statt Bindestrich, wie auf BodyPage — laeuft mit Ziffern fluchtend. */
function vorzeichen(wert: number) {
  return `${wert < 0 ? '−' : '+'}${Math.abs(wert)}`
}

/**
 * H2 ist bewusst kein Recharts-Graph: drei Kennzahlen je Woche als Zeile sind
 * eine Liste, genau wie T8 (Persoenliche Rekorde) schon ohne Recharts
 * auskommt.
 */
export default function WeeklySummaryList({
  sessions,
  entries,
  rows,
  picker,
}: {
  sessions: { beendet_am: string | null }[]
  entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[]
  rows: { datum: string; gewicht: number | null }[]
  picker?: ReactNode
}) {
  const zeilen = wochenKurzform(sessions, kalorienJeTag(entries), rows)

  return (
    <ChartFrame titel={TITEL} leer={zeilen.length < 1} picker={picker}>
      <ul role="list">
        {zeilen.map((zeile) => (
          <li key={zeile.woche}>
            <strong>{zeile.woche}</strong>{' '}
            {`${zeile.trainingseinheiten} Trainingseinheiten`}
            {zeile.kalorienschnitt != null && ` · Ø ${zeile.kalorienschnitt} kcal`}
            {zeile.gewichtsAenderung != null && ` · ${vorzeichen(zeile.gewichtsAenderung)} kg`}
          </li>
        ))}
      </ul>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Lauf die Tests, um das Bestehen zu bestätigen**

Run: `npx vitest run src/components/charts/WeeklySummaryList.test.tsx src/lib/analysis/registry.test.ts`
Expected: PASS (beide Dateien)

- [ ] **Step 9: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 10: Commit**

```bash
git add src/lib/analysis/chart-titles.ts src/lib/analysis/registry.ts src/lib/analysis/registry.test.ts src/components/charts/WeeklySummaryList.tsx src/components/charts/WeeklySummaryList.test.tsx
git commit -m "feat: H2 Wochen-Kurzform"
```

---

### Task 4: H3 — Trends (Sparklines)

**Files:**
- Modify: `src/lib/analysis/chart-titles.ts`
- Modify: `src/lib/analysis/registry.ts`
- Modify: `src/lib/analysis/registry.test.ts`
- Create: `src/components/charts/HomeSparklines.tsx`
- Create: `src/components/charts/HomeSparklines.test.tsx`

**Interfaces:**
- Consumes: `gewichtsTrend` aus `src/lib/analysis/body-charts.ts` (`gewichtsTrend(rows: { datum: string; gewicht: number | null }[]): { datum: string; gewicht: number; trend: number }[]`), `kalorienJeTag` aus `src/lib/analysis/nutrition-charts.ts`, `CHART_BLUE`/`CHART_MINT` aus `src/lib/analysis/chart-colors.ts`, `ChartFrame`.
- Produces: `export const TITEL` (`'Trends'`), `export default function HomeSparklines({ rows, entries, picker }: { rows: { datum: string; gewicht: number | null }[]; entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[]; picker?: ReactNode })`. `registry.ts` exportiert ab dieser Task zusätzlich `H3 = 'H3'` — damit ist die `home`-Registry komplett (`['H1', 'H2', 'H3']`).

- [ ] **Step 1: Ergänze den Titel**

In `src/lib/analysis/chart-titles.ts`, ans Ende anfügen:

```ts
export const TRENDS_TITEL = 'Trends'
```

- [ ] **Step 2: Erweitere die Registry**

In `src/lib/analysis/registry.ts`:

Ändere:
```ts
  WOCHEN_KURZFORM_TITEL as WEEKLY_SUMMARY,
} from './chart-titles'
```
zu:
```ts
  WOCHEN_KURZFORM_TITEL as WEEKLY_SUMMARY,
  TRENDS_TITEL as TRENDS,
} from './chart-titles'
```

Ändere:
```ts
export const H2 = 'H2'

export const CHARTS: ChartDef[] = [
```
zu:
```ts
export const H2 = 'H2'
export const H3 = 'H3'

export const CHARTS: ChartDef[] = [
```

Ändere:
```ts
  { id: H2, bereich: 'home', titel: WEEKLY_SUMMARY },
]
```
zu:
```ts
  { id: H2, bereich: 'home', titel: WEEKLY_SUMMARY },
  { id: H3, bereich: 'home', titel: TRENDS },
]
```

- [ ] **Step 3: Aktualisiere `registry.test.ts` für H3**

Ändere:
```ts
import { TITEL as H2_TITEL } from '../../components/charts/WeeklySummaryList'
```
zu:
```ts
import { TITEL as H2_TITEL } from '../../components/charts/WeeklySummaryList'
import { TITEL as H3_TITEL } from '../../components/charts/HomeSparklines'
```

Ändere:
```ts
    expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'K1', 'K2', 'K3', 'K4', 'K5', 'H1', 'H2'])
```
zu:
```ts
    expect(CHART_IDS).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'K1', 'K2', 'K3', 'K4', 'K5', 'H1', 'H2', 'H3'])
```

Ändere:
```ts
    expect(CHARTS.find((chart) => chart.id === 'H2')?.titel).toBe(H2_TITEL)
  })

  it('filters by area', () => {
    expect(chartsFor('training').map((chart) => chart.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'])
    expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6'])
    expect(chartsFor('body').map((chart) => chart.id)).toEqual(['K1', 'K2', 'K3', 'K4', 'K5'])
    expect(chartsFor('home').map((chart) => chart.id)).toEqual(['H1', 'H2'])
  })
```
zu:
```ts
    expect(CHARTS.find((chart) => chart.id === 'H2')?.titel).toBe(H2_TITEL)
    expect(CHARTS.find((chart) => chart.id === 'H3')?.titel).toBe(H3_TITEL)
  })

  it('filters by area', () => {
    expect(chartsFor('training').map((chart) => chart.id)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'])
    expect(chartsFor('nutrition').map((chart) => chart.id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6'])
    expect(chartsFor('body').map((chart) => chart.id)).toEqual(['K1', 'K2', 'K3', 'K4', 'K5'])
    expect(chartsFor('home').map((chart) => chart.id)).toEqual(['H1', 'H2', 'H3'])
  })
```

- [ ] **Step 4: Lauf die Registry-Tests, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/lib/analysis/registry.test.ts`
Expected: FAIL — Importfehler, weil `./HomeSparklines` noch nicht existiert

- [ ] **Step 5: Schreibe den fehlschlagenden Test für `HomeSparklines`**

Projekt-Konvention (siehe `Ein Ding, das beim Weiterbauen gilt` in CLAUDE.md): Linientests zählen `M`/`L`-Befehle im `d`-Attribut des `path`, nie Farben. `type="monotone"` erzeugt ab drei Punkten `M…C…C…` statt `M…L…` — deshalb wird hier nur die Existenz eines gezeichneten Pfads je Sparkline geprüft, nicht die Punktanzahl im Detail.

```tsx
// src/components/charts/HomeSparklines.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomeSparklines from './HomeSparklines'

describe('HomeSparklines', () => {
  it('draws both sparklines with at least two points each', () => {
    const rows = [
      { datum: '2026-08-17', gewicht: 83.0 },
      { datum: '2026-08-18', gewicht: 82.8 },
    ]
    const entries = [
      { zeitpunkt: '2026-08-17T08:00:00Z', menge: 100, products: { kalorien: 200 } },
      { zeitpunkt: '2026-08-18T08:00:00Z', menge: 100, products: { kalorien: 210 } },
    ]
    const { container } = render(<HomeSparklines rows={rows} entries={entries} />)
    const linien = container.querySelectorAll('.recharts-line-curve')
    expect(linien).toHaveLength(2)
    for (const linie of linien) {
      expect(linie.getAttribute('d')).toMatch(/^M/)
    }
  })

  it('shows the empty state without enough points in either source', () => {
    render(<HomeSparklines rows={[]} entries={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Lauf den Test, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/components/charts/HomeSparklines.test.tsx`
Expected: FAIL mit "Cannot find module './HomeSparklines'"

- [ ] **Step 7: Implementiere `HomeSparklines.tsx`**

```tsx
// src/components/charts/HomeSparklines.tsx
import type { ReactNode } from 'react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { gewichtsTrend } from '../../lib/analysis/body-charts'
import { kalorienJeTag } from '../../lib/analysis/nutrition-charts'
import { TRENDS_TITEL } from '../../lib/analysis/chart-titles'
import { CHART_BLUE, CHART_MINT } from '../../lib/analysis/chart-colors'
import ChartFrame from './ChartFrame'

export const TITEL = TRENDS_TITEL

/**
 * H3 ist der einzige Home-Graph mit Recharts: zwei minimale Linien ohne
 * Achsen, Gitter oder Tooltip — rein "auf einen Blick", deshalb auch der
 * einzige mit Design-Farben (Gewicht Blau, Kalorien Mint — dieselbe
 * Zuordnung wie K1, hier zwei gleichrangige Metriken statt Haupt-/
 * Vergleichslinie).
 */
export default function HomeSparklines({
  rows,
  entries,
  picker,
}: {
  rows: { datum: string; gewicht: number | null }[]
  entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[]
  picker?: ReactNode
}) {
  const gewicht = gewichtsTrend(rows)
  const kalorien = kalorienJeTag(entries)

  return (
    <ChartFrame titel={TITEL} leer={gewicht.length < 2 && kalorien.length < 2} picker={picker}>
      <div className="grid grid-cols-2 gap-2">
        <ResponsiveContainer width="100%" height={60}>
          <LineChart data={gewicht}>
            <Line
              type="monotone"
              dataKey="trend"
              stroke={CHART_BLUE}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={60}>
          <LineChart data={kalorien}>
            <Line
              type="monotone"
              dataKey="kalorien"
              stroke={CHART_MINT}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}
```

- [ ] **Step 8: Lauf die Tests, um das Bestehen zu bestätigen**

Run: `npx vitest run src/components/charts/HomeSparklines.test.tsx src/lib/analysis/registry.test.ts`
Expected: PASS (beide Dateien)

- [ ] **Step 9: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 10: Commit**

```bash
git add src/lib/analysis/chart-titles.ts src/lib/analysis/registry.ts src/lib/analysis/registry.test.ts src/components/charts/HomeSparklines.tsx src/components/charts/HomeSparklines.test.tsx
git commit -m "feat: H3 Trends (Sparklines)"
```

---

### Task 5: `HomeChartList`

**Files:**
- Create: `src/components/charts/HomeChartList.tsx`
- Create: `src/components/charts/HomeChartList.test.tsx`

**Interfaces:**
- Consumes: `AnalysisSession` aus `src/hooks/use-training-analysis.ts`, `AnalysisFoodEntry` aus `src/hooks/use-nutrition-analysis.ts`, `BodyMetricRow` aus `src/lib/body-metrics.ts`, `Zeitraum` aus `src/lib/analysis/zeitraum.ts`, `H1`/`H2`/`H3` aus `src/lib/analysis/registry.ts`, `ChartPicker`/`useChartSelection` aus `src/components/charts/ChartPicker.tsx`, `ActivityGridChart`/`WeeklySummaryList`/`HomeSparklines` aus den Tasks 2–4.
- Produces: `export type HomeChartListProps = { ids: string[]; sessions: AnalysisSession[]; entries: AnalysisFoodEntry[]; rows: BodyMetricRow[]; zeitraum: Zeitraum; auswahl?: ReturnType<typeof useChartSelection> }`, `export default function HomeChartList(props: HomeChartListProps)` — Tasks 6 und 7 (`HomePage`, `HomeAnalysisPage`) rendern genau diese Komponente mit genau diesen Props.

- [ ] **Step 1: Schreibe den fehlschlagenden Test**

```tsx
// src/components/charts/HomeChartList.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomeChartList from './HomeChartList'
import { H1, H2, H3 } from '../../lib/analysis/registry'

describe('HomeChartList', () => {
  it('renders the requested charts by id, in the given order', async () => {
    render(
      <HomeChartList
        ids={[H2, H1]}
        sessions={[]}
        entries={[]}
        rows={[]}
        zeitraum={90}
      />,
    )
    expect(await screen.findByText('Wochen-Kurzform')).toBeInTheDocument()
    expect(await screen.findByText('Aktivitätsraster')).toBeInTheDocument()
  })

  it('renders nothing for an unknown id', () => {
    const { container } = render(<HomeChartList ids={['unbekannt']} sessions={[]} entries={[]} rows={[]} zeitraum={90} />)
    expect(container.querySelector('section')).toBeNull()
  })

  it('renders H3 by id too', async () => {
    render(<HomeChartList ids={[H3]} sessions={[]} entries={[]} rows={[]} zeitraum={90} />)
    expect(await screen.findByText('Trends')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Lauf den Test, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/components/charts/HomeChartList.test.tsx`
Expected: FAIL mit "Cannot find module './HomeChartList'"

- [ ] **Step 3: Implementiere `HomeChartList.tsx`**

```tsx
// src/components/charts/HomeChartList.tsx
import { lazy, Suspense, type ReactNode } from 'react'
import type { AnalysisSession } from '../../hooks/use-training-analysis'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import type { BodyMetricRow } from '../../lib/body-metrics'
import ChartPicker, { type useChartSelection } from './ChartPicker'
import { H1, H2, H3 } from '../../lib/analysis/registry'
import type { Zeitraum } from '../../lib/analysis/zeitraum'

// Lazy an dieser einen Stelle: die Liste ist der einzige Ort, an dem ein
// Home-Graph noch eingebunden wird — Dashboard wie Analyse-Seite gehen
// hierdurch. Recharts (nur H3 braucht es) bleibt damit aus dem Start-Chunk.
const ActivityGridChart = lazy(() => import('./ActivityGridChart'))
const WeeklySummaryList = lazy(() => import('./WeeklySummaryList'))
const HomeSparklines = lazy(() => import('./HomeSparklines'))

export type HomeChartListProps = {
  ids: string[]
  sessions: AnalysisSession[]
  entries: AnalysisFoodEntry[]
  rows: BodyMetricRow[]
  /** H1 braucht das Fenster selbst, nicht nur die schon gefilterten Sessions. */
  zeitraum: Zeitraum
  auswahl?: ReturnType<typeof useChartSelection>
}

export default function HomeChartList({ ids, sessions, entries, rows, zeitraum, auswahl }: HomeChartListProps) {
  function graph(id: string): ReactNode {
    const picker = auswahl ? <ChartPicker id={id} auswahl={auswahl} /> : undefined
    switch (id) {
      case H1:
        return <ActivityGridChart sessions={sessions} zeitraum={zeitraum} picker={picker} />
      case H2:
        return <WeeklySummaryList sessions={sessions} entries={entries} rows={rows} picker={picker} />
      case H3:
        return <HomeSparklines rows={rows} entries={entries} picker={picker} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {ids.map((id) => (
        <Suspense key={id} fallback={<p>Lädt…</p>}>
          {graph(id)}
        </Suspense>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Lauf den Test, um das Bestehen zu bestätigen**

Run: `npx vitest run src/components/charts/HomeChartList.test.tsx`
Expected: PASS (3 Tests)

- [ ] **Step 5: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 6: Commit**

```bash
git add src/components/charts/HomeChartList.tsx src/components/charts/HomeChartList.test.tsx
git commit -m "feat: HomeChartList"
```

---

### Task 6: `HomePage.tsx` — Status-Übersicht und Dashboard

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Create: `src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `useSession` aus `src/hooks/use-session.ts`, `useProfile` aus `src/hooks/use-profile.ts` (`{ profile, loading, error, reload, updateProfile }`), `useFoodEntries` aus `src/hooks/use-food-entries.ts` (`{ entries, loading, addEntry, updateEntry, deleteEntry }`), `effectiveCalorieGoal` aus `src/lib/nutrition-goal.ts`, `DailySummary` aus `src/components/DailySummary.tsx` (`{ entries, goal }`), `useActiveTrainingDay` aus `src/hooks/use-active-training-day.ts` (`{ plan, day, loading }`), `useBodyMetrics` aus `src/hooks/use-body-metrics.ts` (`{ rows, loading, error, saveEntry, deleteEntry, reload }`), `changeSince` aus `src/lib/body-change.ts`, `useChartSelection`/`ChartPicker` aus `src/components/charts/ChartPicker.tsx`, `HomeChartList` aus Task 5, `chartsFor` aus `src/lib/analysis/registry.ts`, `useHomeAnalysis` aus Task 1, `DASHBOARD_ZEITRAUM` aus `src/lib/analysis/zeitraum.ts`, `cardClass` aus `src/lib/ui-classes.ts`.
- Produces: `export default function HomePage()` — bleibt die Route `/` in `src/App.tsx` (unverändert, keine Änderung an `App.tsx` in dieser Task nötig, `HomePage` wird schon importiert).

Aktueller Stand von `src/pages/HomePage.tsx` (wird komplett ersetzt):
```tsx
export default function HomePage() {
  return (
    <div>
      <h1>Home</h1>
      <p>Platzhalter – Inhalt folgt in Phase 2/3.</p>
    </div>
  )
}
```

- [ ] **Step 1: Schreibe die fehlschlagenden Tests**

```tsx
// src/pages/HomePage.test.tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import HomePage from './HomePage'
import { renderWithProviders } from '../test-render'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))

const mockUseFoodEntries = vi.fn()
vi.mock('../hooks/use-food-entries', () => ({ useFoodEntries: (userId: string) => mockUseFoodEntries(userId) }))

const mockUseActiveTrainingDay = vi.fn()
vi.mock('../hooks/use-active-training-day', () => ({
  useActiveTrainingDay: (userId: string) => mockUseActiveTrainingDay(userId),
}))

const mockUseBodyMetrics = vi.fn()
vi.mock('../hooks/use-body-metrics', () => ({ useBodyMetrics: (userId: string) => mockUseBodyMetrics(userId) }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function stubDefaults() {
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseProfile.mockReturnValue({
    profile: { taegliches_kalorienziel: 2000, geschlecht: null, alter: null, groesse: null, aktuelles_gewicht: null, aktivitaetslevel: null, ziel: null, ziel_delta_kcal: 500, analyse_auswahl: [] },
    loading: false,
    error: false,
    reload: vi.fn(),
    updateProfile: vi.fn(),
  })
  mockUseFoodEntries.mockReturnValue({ entries: [], loading: false, addEntry: vi.fn(), updateEntry: vi.fn(), deleteEntry: vi.fn() })
  mockUseActiveTrainingDay.mockReturnValue({ plan: null, day: null, loading: false })
  mockUseBodyMetrics.mockReturnValue({ rows: [], loading: false, error: false, saveEntry: vi.fn(), deleteEntry: vi.fn(), reload: vi.fn() })
}

describe('HomePage', () => {
  it('shows todays calories via DailySummary', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Heute')).toBeInTheDocument()
  })

  it('shows the active training day when there is one', () => {
    stubDefaults()
    mockUseActiveTrainingDay.mockReturnValue({
      plan: { id: 'p1', name: 'Push/Pull/Legs', aktiv: true, user_id: 'u1' },
      day: { id: 'd1', name: 'Push', reihenfolge: 1 },
      loading: false,
    })
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Push/Pull/Legs — Push')).toBeInTheDocument()
  })

  it('shows "Kein aktiver Plan" without an active plan', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Kein aktiver Plan.')).toBeInTheDocument()
  })

  it('shows the latest weight change', () => {
    stubDefaults()
    mockUseBodyMetrics.mockReturnValue({
      rows: [
        { id: 'c', datum: '2026-08-24', gewicht: 82.5, bauchumfang: null, beinumfang: null, armumfang: null, ruckenumfang: null, brustumfang: null, koerperfettanteil: null },
        { id: 'a', datum: '2026-08-17', gewicht: 83.3, bauchumfang: null, beinumfang: null, armumfang: null, ruckenumfang: null, brustumfang: null, koerperfettanteil: null },
      ],
      loading: false,
      error: false,
      saveEntry: vi.fn(),
      deleteEntry: vi.fn(),
      reload: vi.fn(),
    })
    renderWithProviders(<HomePage />)
    expect(screen.getByText(/−0,8 kg seit dem letzten Eintrag/)).toBeInTheDocument()
  })

  it('shows "Keine Messwerte." without any weight entry', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Keine Messwerte.')).toBeInTheDocument()
  })

  it('renders no Home chart and no analysis query without a pinned selection', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.queryByText('Aktivitätsraster')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Lauf die Tests, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: FAIL — die bisherige `HomePage` zeigt weder "Heute" noch "Kein aktiver Plan." noch "Keine Messwerte."

- [ ] **Step 3: Implementiere `HomePage.tsx`**

```tsx
// src/pages/HomePage.tsx
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries } from '../hooks/use-food-entries'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'
import DailySummary from '../components/DailySummary'
import { useActiveTrainingDay } from '../hooks/use-active-training-day'
import { useBodyMetrics } from '../hooks/use-body-metrics'
import { changeSince } from '../lib/body-change'
import { useChartSelection } from '../components/charts/ChartPicker'
import HomeChartList from '../components/charts/HomeChartList'
import { chartsFor } from '../lib/analysis/registry'
import { useHomeAnalysis } from '../hooks/use-home-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
import { cardClass } from '../lib/ui-classes'

/** German notation: comma as the decimal mark, at most one place. */
function formatValue(value: number) {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 })
}

export default function HomePage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Home</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Dashboard userId={userId} />
}

function Dashboard({ userId }: { userId: string }) {
  const { profile, loading: profileLoading } = useProfile(userId)
  const { entries, loading: entriesLoading } = useFoodEntries(userId)
  const { plan, day, loading: trainingLoading } = useActiveTrainingDay(userId)
  const { rows, loading: rowsLoading, error: rowsError } = useBodyMetrics(userId)
  const auswahl = useChartSelection(userId)

  if (profileLoading || entriesLoading || trainingLoading || rowsLoading) {
    return (
      <div>
        <h1>Home</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  // goal bleibt null, wenn das Profil nicht geladen werden konnte — DailySummary
  // zeigt die Kalorien dann trotzdem an, nur ohne Restwert gegen ein Ziel. Ein
  // Bereich, der nicht laedt, soll die anderen zwei nicht mit sperren.
  const goal = profile ? effectiveCalorieGoal(profile) : null
  const gewichtsAenderung = changeSince(rows, 'gewicht')

  return (
    <div>
      <h1>Home</h1>
      <DailySummary entries={entries} goal={goal} />
      <div className={cardClass}>
        <h2>Training</h2>
        {plan == null && <p>Kein aktiver Plan.</p>}
        {plan != null && day != null && <p>{`${plan.name} — ${day.name}`}</p>}
        <Link to="/training">Zum Trainingsbereich</Link>
      </div>
      <div className={cardClass}>
        <h2>Gewicht</h2>
        {rowsError && <p role="alert">Gewichtsdaten konnten nicht geladen werden.</p>}
        <p>
          {gewichtsAenderung == null
            ? 'Keine Messwerte.'
            : `${gewichtsAenderung.delta < 0 ? '−' : '+'}${formatValue(Math.abs(gewichtsAenderung.delta))} kg seit dem letzten Eintrag`}
        </p>
        <Link to="/body">Zum Körperbereich</Link>
      </div>
      <DashboardHomeCharts userId={userId} auswahl={auswahl.auswahl} />
      <Link to="/home/analyse">Analyse</Link>
    </div>
  )
}

/**
 * Rendert die angehakten Home-Graphen — und faellt vorher komplett aus, wenn
 * keiner angehakt ist: der Hook steckt in der Kindkomponente, ein leeres
 * Dashboard soll keine Abfrage ausloesen.
 */
function DashboardHomeCharts({ userId, auswahl }: { userId: string; auswahl: string[] }) {
  const bereichsIds = new Set(chartsFor('home').map((chart) => chart.id))
  const ids = auswahl.filter((id) => bereichsIds.has(id))
  if (ids.length === 0) return null
  return <DashboardHomeChartsData userId={userId} ids={ids} />
}

function DashboardHomeChartsData({ userId, ids }: { userId: string; ids: string[] }) {
  const { sessions, entries, rows, loading, error } = useHomeAnalysis(userId, DASHBOARD_ZEITRAUM)
  if (loading) return <p>Lädt…</p>
  if (error) return <p role="alert">Graph konnte nicht geladen werden.</p>
  return <HomeChartList ids={ids} sessions={sessions} entries={entries} rows={rows} zeitraum={DASHBOARD_ZEITRAUM} />
}
```

- [ ] **Step 4: Lauf die Tests, um das Bestehen zu bestätigen**

Run: `npx vitest run src/pages/HomePage.test.tsx`
Expected: PASS (6 Tests)

- [ ] **Step 5: Lauf die volle Testsuite (Regressionscheck)**

Run: `npm test -- --run`
Expected: alle Tests grün — insbesondere keine Regression in `App.test.tsx` oder Navigationstests, die bislang den Platzhaltertext von `HomePage` erwartet haben könnten

- [ ] **Step 6: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 7: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.test.tsx
git commit -m "feat: Home-Dashboard mit Statuskarten und Home-Graphen"
```

---

### Task 7: `HomeAnalysisPage` und Routing

**Files:**
- Create: `src/pages/HomeAnalysisPage.tsx`
- Create: `src/pages/HomeAnalysisPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useSession`, `useHomeAnalysis` (Task 1), `ZeitraumSwitch` aus `src/components/ZeitraumSwitch.tsx` (`{ wert: Zeitraum; onChange: (z: Zeitraum) => void }`), `useChartSelection` aus `ChartPicker.tsx`, `HomeChartList` (Task 5), `chartsFor` aus `registry.ts`, `STANDARD_ZEITRAUM`/`Zeitraum` aus `zeitraum.ts`.
- Produces: `export default function HomeAnalysisPage()` — von `src/App.tsx` lazy importiert und unter `/home/analyse` geroutet.

Aktueller Ausschnitt aus `src/App.tsx` (Imports und Routen):
```tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import TrainingPage from './pages/TrainingPage'
...
const TrainingAnalysisPage = lazy(() => import('./pages/TrainingAnalysisPage'))
const NutritionAnalysisPage = lazy(() => import('./pages/NutritionAnalysisPage'))
const BodyAnalysisPage = lazy(() => import('./pages/BodyAnalysisPage'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout>
                <Outlet />
              </AppLayout>
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/training" element={<TrainingPage />} />
```

- [ ] **Step 1: Schreibe die fehlschlagenden Tests für `HomeAnalysisPage`**

```tsx
// src/pages/HomeAnalysisPage.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import HomeAnalysisPage from './HomeAnalysisPage'
import { renderWithProviders } from '../test-render'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseHomeAnalysis = vi.fn()
vi.mock('../hooks/use-home-analysis', () => ({ useHomeAnalysis: (userId: string, zeitraum: unknown) => mockUseHomeAnalysis(userId, zeitraum) }))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))

describe('HomeAnalysisPage', () => {
  it('renders all three home charts', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseHomeAnalysis.mockReturnValue({ sessions: [], entries: [], rows: [], loading: false, error: false })
    mockUseProfile.mockReturnValue({
      profile: { analyse_auswahl: [] },
      loading: false,
      error: false,
      reload: vi.fn(),
      updateProfile: vi.fn(),
    })
    renderWithProviders(<HomeAnalysisPage />)
    expect(await screen.findByText('Aktivitätsraster')).toBeInTheDocument()
    expect(await screen.findByText('Wochen-Kurzform')).toBeInTheDocument()
    expect(await screen.findByText('Trends')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseHomeAnalysis.mockReturnValue({ sessions: [], entries: [], rows: [], loading: false, error: true })
    mockUseProfile.mockReturnValue({
      profile: { analyse_auswahl: [] },
      loading: false,
      error: false,
      reload: vi.fn(),
      updateProfile: vi.fn(),
    })
    renderWithProviders(<HomeAnalysisPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Daten konnten nicht geladen werden.')
  })
})
```

- [ ] **Step 2: Lauf den Test, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/pages/HomeAnalysisPage.test.tsx`
Expected: FAIL mit "Cannot find module './HomeAnalysisPage'"

- [ ] **Step 3: Implementiere `HomeAnalysisPage.tsx`**

```tsx
// src/pages/HomeAnalysisPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useHomeAnalysis } from '../hooks/use-home-analysis'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import { useChartSelection } from '../components/charts/ChartPicker'
import HomeChartList from '../components/charts/HomeChartList'
import { chartsFor } from '../lib/analysis/registry'
import { STANDARD_ZEITRAUM, type Zeitraum } from '../lib/analysis/zeitraum'

export default function HomeAnalysisPage() {
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
  const { sessions, entries, rows, loading, error } = useHomeAnalysis(userId, zeitraum)
  const auswahl = useChartSelection(userId)
  // Reihenfolge ist die der Registry — kein Umsortieren, wie in der Spec.
  const ids = chartsFor('home').map((chart) => chart.id)

  return (
    <div>
      <h1>Analyse</h1>
      <ZeitraumSwitch wert={zeitraum} onChange={setZeitraum} />
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <p>Lädt…</p>
      ) : (
        <HomeChartList ids={ids} sessions={sessions} entries={entries} rows={rows} zeitraum={zeitraum} auswahl={auswahl} />
      )}
      <Link to="/">Zurück zur Übersicht</Link>
    </div>
  )
}
```

- [ ] **Step 4: Lauf den Test, um das Bestehen zu bestätigen**

Run: `npx vitest run src/pages/HomeAnalysisPage.test.tsx`
Expected: PASS (2 Tests)

- [ ] **Step 5: Route in `App.tsx` ergänzen**

Ändere:
```tsx
const TrainingAnalysisPage = lazy(() => import('./pages/TrainingAnalysisPage'))
const NutritionAnalysisPage = lazy(() => import('./pages/NutritionAnalysisPage'))
const BodyAnalysisPage = lazy(() => import('./pages/BodyAnalysisPage'))
```
zu:
```tsx
const TrainingAnalysisPage = lazy(() => import('./pages/TrainingAnalysisPage'))
const NutritionAnalysisPage = lazy(() => import('./pages/NutritionAnalysisPage'))
const BodyAnalysisPage = lazy(() => import('./pages/BodyAnalysisPage'))
const HomeAnalysisPage = lazy(() => import('./pages/HomeAnalysisPage'))
```

Ändere:
```tsx
          <Route path="/" element={<HomePage />} />
          <Route path="/training" element={<TrainingPage />} />
```
zu:
```tsx
          <Route path="/" element={<HomePage />} />
          <Route
            path="/home/analyse"
            element={
              <Suspense fallback={<p>Lädt…</p>}>
                <HomeAnalysisPage />
              </Suspense>
            }
          />
          <Route path="/training" element={<TrainingPage />} />
```

- [ ] **Step 6: Lauf die volle Testsuite**

Run: `npm test -- --run`
Expected: alle Tests grün

- [ ] **Step 7: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 8: Commit**

```bash
git add src/pages/HomeAnalysisPage.tsx src/pages/HomeAnalysisPage.test.tsx src/App.tsx
git commit -m "feat: HomeAnalysisPage und Route /home/analyse"
```

---

### Task 8: Abschluss

**Files:**
- Modify: `docs/domaenenmodell.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nichts Neues — reine Dokumentation und Verifikation des bereits gebauten Stands.
- Produces: nichts, das andere Tasks konsumieren — letzter Task des Plans.

- [ ] **Step 1: Volle Testsuite, Lint, Typecheck, Build**

Run: `npm test -- --run && npm run lint && npx tsc -b --noEmit && npm run build`
Expected: alle vier Schritte grün. Bundle-Zahlen (Entry-Chunk, neue lazy Chunks für `ActivityGridChart`/`WeeklySummaryList`/`HomeSparklines`/`HomeAnalysisPage`) notieren für CLAUDE.md.

- [ ] **Step 2: `docs/domaenenmodell.md` ergänzen**

Abschnitt zum Home-Bereich ergänzen: `day_status`/`health_sync_data` bleiben ungenutzte Tabellen (Trainingstag/Restday wird live aus `workout_sessions.beendet_am` abgeleitet, keine neue Migration in diesem Plan), `useHomeAnalysis` komponiert die drei bestehenden Bereichs-Hooks. Quellenzeile auf den aktuellen Stand setzen (letzte Migration bleibt `0007`).

- [ ] **Step 3: Manuelle Browser-Verifikation**

Über eine Wegwerf-Testseite (temporäre Route in `App.tsx`, nicht committet, nach der Prüfung entfernt) mit echter `.env` im Haupt-Checkout oder einem frischen Worktree mit `.env`-Kopie:

1. `/` zeigt drei feste Karten (Kalorien heute via `DailySummary`, Trainingsstatus, Gewichtsänderung) als abgerundete `cardClass`-Karten ohne sichtbaren Rahmen.
2. Ohne angehakten Home-Graphen erscheint kein Graph und laut Netzwerk-Log feuert keine der `useHomeAnalysis`-Abfragen (nur die vier Karten-eigenen Hooks).
3. H1 (Aktivitätsraster) anhaken: Grid erscheint mit farblich unterschiedenen Trainingstag-/Restday-Feldern (`bg-accent` vs. `bg-surface` mit Rahmen), per `getComputedStyle` bestätigt.
4. H2 (Wochen-Kurzform) anhaken: Liste mit einer Zeile je Woche, Text enthält Trainingseinheiten/Kalorienschnitt/Gewichtsänderung wie erwartet.
5. H3 (Trends) anhaken: zwei kleine Linien nebeneinander, Gewicht in Blau (`#4f6ca5`), Kalorien in Mint (`#6efde6`), per DOM-Attribut auf `.recharts-line-curve` bestätigt.
6. `/home/analyse` zeigt alle drei Graphen mit `ZeitraumSwitch`, Häkchen-Persistenz über Reload bestätigt.
7. Konsole durchgängig ohne Fehler oder Warnungen.

- [ ] **Step 4: `CLAUDE.md` aktualisieren**

Neuen Abschnitt "Home-Dashboard" ergänzen (Analog zu den Phase-6-Plan-Abschnitten): Spec-Pfad, Plan-Pfad, Kurzbeschreibung (Statuskarten + H1/H2/H3, `day_status`/`health_sync_data` bleiben ungenutzt), Bundle-Zahlen aus Step 1, Ergebnis der manuellen Verifikation aus Step 3. "Status / Fortschritt" oben entsprechend nachziehen.

- [ ] **Step 5: Commit**

```bash
git add docs/domaenenmodell.md CLAUDE.md
git commit -m "docs: Home-Dashboard Abschluss - Domaenenmodell und Status"
```

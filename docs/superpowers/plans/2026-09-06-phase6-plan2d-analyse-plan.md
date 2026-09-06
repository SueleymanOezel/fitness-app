# Phase 6, Plan 2d – Analyse-Seiten im neuen Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle drei Analyse-Seiten (Training, Ernährung, Körper) und alle 19 Graphen verwenden die in Plan 1 gebauten Design-Bausteine (Chip, Karte) sowie die im Design-Spec festgelegte Farbpalette statt Recharts' Standardfarben und nackter `<section>`-Elemente.

**Architecture:** Zwei geteilte Bausteine bedienen alle drei Seiten und alle 19 Graphen zentral, keine 19 Einzeländerungen an Seiten-Struktur nötig: `ChartFrame.tsx` ist der einzige Ort, an dem jeder Graph sein `<section>`-Element bekommt — ein `cardClass`-Wrapper dort wirkt für alle 19 Graphen gleichzeitig. `ZeitraumSwitch.tsx` ist der einzige Ort, an dem der Zeitraum-Umschalter gerendert wird — eine Umstellung auf `Chip` dort wirkt für alle drei Analyse-Seiten gleichzeitig. Die eigentliche Farbzuordnung ist dagegen zwangsläufig 17 Einzeländerungen (ein `fill`/`stroke`-Wert oder ein kleines Farb-Array je Graph-Datei) — dafür ein neues, kleines Modul `src/lib/analysis/chart-colors.ts` mit benannten Farbkonstanten, damit jede Graph-Datei eine Konstante importiert statt einen Hex-Wert zu wiederholen.

**Tech Stack:** React 19 + Vite, TypeScript, Tailwind CSS v4, Recharts, Vitest + Testing Library. Keine neue Abhängigkeit.

**Spec:** `docs/superpowers/specs/2026-09-05-phase6-design-design.md` (Abschnitt „Struktur je Bereich", Analyse-Zeile: „Zeitraum-Umschalter wird zur Chip-Reihe. Graphen bekommen die neue Farbpalette … und eine Karten-Umrandung um jeden einzelnen Graphen." Abschnitt „Farbzuordnung für alle 19 Graphen" enthält die exakte Zuordnung je Graph, wörtlich in diesem Plan übernommen.)

**Vorgänger:** `docs/superpowers/plans/2026-09-05-phase6-plan1-fundament.md` (gemerged, PR #40 — liefert `Chip`, `cardClass`) und die drei Bereichs-Pläne (2a/2b/2c, alle gemerged), die dasselbe Muster für ihre jeweiligen Seiten bereits etabliert haben.

**Geschwisterpläne:** keine weiteren — dies ist der letzte Bereichs-Plan der Phase 6. Home-Dashboard bleibt außen vor (eigenes künftiges Vorhaben).

## Global Constraints

- **Keine Drittanbieter-Namen** aus Fitness/Ernährung in Code, Kommentaren, Commit-Messages oder Docs.
- **Karten:** `rounded-3xl`, kein sichtbarer Rahmen. Exakte Klasse `cardClass` aus `src/lib/ui-classes.ts` — nicht neu erfinden, importieren.
- **Chips:** `rounded-full`. Exakte Komponente `Chip` aus `src/components/Chip.tsx` (`{active, ...ButtonHTMLAttributes}`) — nicht neu erfinden, importieren.
- **Exakte Farbwerte aus dem Design-Spec, nicht approximieren:** `--color-chart-mint: #6efde6`, `--color-chart-blue: #4f6ca5`, `--color-chart-green: #49be69`, `--color-chart-orange: #ff6f43`, `--color-chart-violet: #8766ed`, `--color-chart-grid: #5e5f66`. Als literale Hex-Strings verwendet (siehe Rationale unten), nicht als `var(--color-*)`.
- **Farbzuordnung wörtlich aus dem Spec** (Abschnitt „Farbzuordnung für alle 19 Graphen"): Hauptmetrik/Trend → Mint. Vergleichs-/Rohwert daneben → Blau. Referenz-/Nulllinien → Grid (neutral), nie eine Akzentfarbe. Mehrserien-Charts (mehr als zwei Datenreihen) nutzen die 5er-Palette (Mint, Blau, Grün, Orange, Violett) zyklisch. T8 und K5 sind Listen ohne Chart-Farben — bewusst unverändert.
- **Graph-Tests bleiben, wie sie sind** (Projekt-Konvention seit Phase 5): sie prüfen gezeichnete Marken (Anzahl der Balken/Linienpunkte), nie Achsentexte oder Farben. Verifiziert vor Planerstellung: kein bestehender Test in `src/components/charts/*.test.tsx` prüft auf einen Farbwert — die Farbänderungen in diesem Plan brauchen deshalb **keine** Testdatei-Änderungen.
- Bestehende Barrierefreiheits-Konventionen bleiben erhalten.
- `src/index.css` wird von diesem Plan **nicht angefasst** — Profil und Login migrieren erst in späteren Plänen; die Gitter-Linien der `CartesianGrid`-Elemente bleiben ebenfalls unverändert (bewusst außerhalb, siehe Rationale unten).
- Nach jedem Task: `npm run lint`, `npx tsc -b --noEmit`, `npm test -- --run` müssen grün sein.
- Commit-Messages auf Deutsch ohne Umlaute, im Stil der bestehenden Historie.

### Rationale: warum literale Hex-Strings statt `var(--color-chart-*)`

Recharts' `fill`/`stroke`-Props landen als SVG-Präsentationsattribute. Die bereits gebauten Design-Bausteine (Karte, Buttons, Chip, Dialog, Toast) nutzen durchgängig Tailwind-Utility-Klassen (`bg-accent`, `text-accent`), niemals `var(--color-*)` direkt in einem Attribut — dieser Plan bricht dieses Muster nicht neu auf. Ein Tailwind-`className` setzt eine `fill`/`stroke`-Farbe auf einem SVG-Element nicht zuverlässig (keine etablierte `fill-*`/`stroke-*`-Nutzung im gesamten bisherigen Code), und dieselben Werte stehen ohnehin schon als Design-Tokens in `src/index.css`s `@theme`-Block. Ein neues, kleines Modul `src/lib/analysis/chart-colors.ts` mit benannten Konstanten hält die Werte an einer einzigen Stelle synchron zu `index.css`, ohne eine neue Indirektionsebene über CSS Custom Properties in SVG-Attributen zu riskieren.

### Rationale: warum `CartesianGrid` nicht angefasst wird

Das Spec-Farbsystem nennt `--color-chart-grid` ausdrücklich für „Referenz-/Nulllinien, Gridlines" — die Farbzuordnungs-Tabelle selbst spricht aber nur `ReferenceLine`-Elemente (Ziel-/Nulllinien) einzeln an, nie `CartesianGrid`. `CartesianGrid` setzt aktuell an keiner der 19 Graph-Dateien überhaupt eine explizite `stroke`-Farbe (nur `strokeDasharray="3 3"`, Recharts' Standardgrau bleibt). Das grundsätzlich anzupassen wäre eine zusätzliche, vom Spec nicht einzeln geforderte Änderung an 19 weiteren Stellen — bewusst außerhalb dieses Plans, kein Teil der wörtlichen Farbzuordnung.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `src/lib/analysis/chart-colors.ts` | **neu:** benannte Farbkonstanten aus dem Design-Spec |
| `src/components/charts/ChartFrame.tsx` | geändert: `cardClass`-Wrapper um jeden Graphen |
| `src/components/charts/ChartFrame.test.tsx` | geändert: neuer Karten-Test |
| `src/components/ZeitraumSwitch.tsx` | geändert: `Chip` statt nacktem `<button>` |
| `src/components/ZeitraumSwitch.test.tsx` | **neu:** bisher kein Test vorhanden |
| `src/components/charts/TrainingFrequencyChart.tsx` (T1) | geändert: Balkenfarbe Mint |
| `src/components/charts/StrengthChart.tsx` (T2) | geändert: Linienfarbe Mint |
| `src/components/charts/ExerciseVolumeChart.tsx` (T3) | geändert: Balkenfarbe Mint |
| `src/components/charts/BestSetWeightChart.tsx` (T4) | geändert: Linienfarbe Mint |
| `src/components/charts/RepsPerSetChart.tsx` (T5) | geändert: Farbzyklus statt Recharts-Demofarben |
| `src/components/charts/MuscleVolumeChart.tsx` (T6) | geändert: `Cell`-Farbzyklus je Muskelgruppe |
| `src/components/charts/SessionLoadChart.tsx` (T7) | geändert: Dauer Mint, Kalorien Blau |
| `src/components/charts/CaloriesPerDayChart.tsx` (E1) | geändert: Linie Mint, Ziel-Linie Grid |
| `src/components/charts/MacroDistributionChart.tsx` (E2) | geändert: `Cell`-Farben je Makro (Mint/Blau/Grün) |
| `src/components/charts/MacroTrendChart.tsx` (E3) | geändert: dieselbe Makro-Zuordnung wie E2 |
| `src/components/charts/MealSectionCaloriesChart.tsx` (E4) | geändert: `Cell`-Farbzyklus je Abschnitt |
| `src/components/charts/WeeklyAverageChart.tsx` (E5) | geändert: Balkenfarbe Mint |
| `src/components/charts/CalorieBalanceChart.tsx` (E6) | geändert: Linie Mint, Nulllinie Grid |
| `src/components/charts/WeightTrendChart.tsx` (K1) | geändert: Trend Mint, Rohgewicht Blau |
| `src/components/charts/BodyMeasurementsChart.tsx` (K2) | geändert: feste Farbzuordnung je Umfang |
| `src/components/charts/WeightChangeRateChart.tsx` (K3) | geändert: Linie Mint, Nulllinie Grid |
| `src/components/charts/WeightVsCaloriesChart.tsx` (K4) | geändert: Punkte Mint, Nulllinie Grid |
| `docs/domaenenmodell.md` | geprüft, keine Änderung erwartet |
| `CLAUDE.md` | Status nach Abschluss nachgezogen |

**Bewusst unverändert:** `PersonalRecordsList.tsx` (T8) und `PhotoTimeline.tsx` (K5) — beide sind Listen ohne Chart-Farben, Spec-Vorgabe wörtlich. `src/index.css`, `ChartPicker.tsx` (das Dashboard-Häkchen bleibt ein unstyliertes Formularfeld, Spec nennt es nicht).

---

## Task 1: Foundation — ChartFrame-Karte und ZeitraumSwitch-Chips

**Files:**
- Modify: `src/components/charts/ChartFrame.tsx`
- Modify: `src/components/charts/ChartFrame.test.tsx`
- Modify: `src/components/ZeitraumSwitch.tsx`
- Create: `src/components/ZeitraumSwitch.test.tsx`

**Interfaces:**
- Consumes: `cardClass` aus `src/lib/ui-classes.ts`; `Chip` (default export, `{active: boolean} & ButtonHTMLAttributes<HTMLButtonElement>`) aus `src/components/Chip.tsx`

`ChartFrame` ist der einzige Ort, an dem jeder der 19 Graphen sein `<section>`-Element bekommt (`TrainingChartList`/`NutritionChartList`/`BodyChartList` rendern die einzelnen Chart-Komponenten, jede davon rendert intern `ChartFrame`) — eine Änderung hier wirkt für alle 19 Graphen gleichzeitig, ohne eine einzige Chart-Datei anzufassen. `ZeitraumSwitch` ist ebenso der einzige Ort für den Zeitraum-Umschalter auf allen drei Analyse-Seiten.

- [ ] **Step 1: Write the failing test for ChartFrame**

Read the current `src/components/charts/ChartFrame.test.tsx` first. Add this test after the existing `'shows the chart when there is data'` test:

```tsx
  it('wraps every chart in the card recipe', () => {
    render(
      <ChartFrame titel="Trainingsfrequenz" leer={false}>
        <div data-testid="inhalt" />
      </ChartFrame>,
    )
    const heading = screen.getByRole('heading', { name: 'Trainingsfrequenz' })
    expect(heading.closest('section')).toHaveClass('bg-surface', 'rounded-3xl', 'p-6')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/charts/ChartFrame.test.tsx`
Expected: FAIL — the current `<section>` has no className.

- [ ] **Step 3: Write the ChartFrame implementation**

In `src/components/charts/ChartFrame.tsx`, add the import:

```ts
import { cardClass } from '../../lib/ui-classes'
```

Replace:
```tsx
  return (
    <section>
      <h2>{titel}</h2>
```
with:
```tsx
  return (
    <section className={cardClass}>
      <h2>{titel}</h2>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/charts/ChartFrame.test.tsx`
Expected: PASS — all 5 tests.

- [ ] **Step 5: Write the failing test for ZeitraumSwitch**

Create `src/components/ZeitraumSwitch.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ZeitraumSwitch from './ZeitraumSwitch'

describe('ZeitraumSwitch', () => {
  it('marks the active zeitraum and leaves the others inactive', () => {
    render(<ZeitraumSwitch wert={90} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '90 Tage' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '30 Tage' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with the picked value', () => {
    const onChange = vi.fn()
    render(<ZeitraumSwitch wert={90} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'alles' }))
    expect(onChange).toHaveBeenCalledWith('alles')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/components/ZeitraumSwitch.test.tsx`
Expected: FAIL — the current `<button>` has no `aria-pressed` styling difference visible via `Chip`, but more concretely the file compiles fine today (it already sets `aria-pressed`), so this may already pass. Run it to confirm the actual starting state before Step 7's implementation change — the meaningful check is that it still passes identically after switching to `Chip`.

- [ ] **Step 7: Write the ZeitraumSwitch implementation**

Replace `src/components/ZeitraumSwitch.tsx` in full:

```tsx
import { ZEITRAEUME, type Zeitraum } from '../lib/analysis/zeitraum'
import Chip from './Chip'

/** Chips rather than a select: four options, and one tap instead of two. */
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
        <Chip key={String(zeitraum.wert)} active={zeitraum.wert === wert} onClick={() => onChange(zeitraum.wert)}>
          {zeitraum.label}
        </Chip>
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- --run src/components/ZeitraumSwitch.test.tsx`
Expected: PASS — both tests.

- [ ] **Step 9: Run the full suite**

Run: `npm test -- --run`
Expected: PASS. The three analysis pages' own tests (`TrainingAnalysisPage.test.tsx` etc., if they reference `screen.getByRole('button', { name: '30 Tage' })`) keep working unchanged — `Chip` renders a `<button>` with the same accessible name and an `aria-pressed` attribute, identical to what `ZeitraumSwitch` rendered directly before.

- [ ] **Step 10: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/components/charts/ChartFrame.tsx src/components/charts/ChartFrame.test.tsx src/components/ZeitraumSwitch.tsx src/components/ZeitraumSwitch.test.tsx
git commit -m "feat: Chart-Karte und Zeitraum-Chips als geteilte Bausteine"
```

---

## Task 2: Trainingsgraphen (T1–T7) — Farbpalette

**Files:**
- Create: `src/lib/analysis/chart-colors.ts`
- Modify: `src/components/charts/TrainingFrequencyChart.tsx` (T1)
- Modify: `src/components/charts/StrengthChart.tsx` (T2)
- Modify: `src/components/charts/ExerciseVolumeChart.tsx` (T3)
- Modify: `src/components/charts/BestSetWeightChart.tsx` (T4)
- Modify: `src/components/charts/RepsPerSetChart.tsx` (T5)
- Modify: `src/components/charts/MuscleVolumeChart.tsx` (T6)
- Modify: `src/components/charts/SessionLoadChart.tsx` (T7)

**Interfaces:**
- Produces: `src/lib/analysis/chart-colors.ts` exportiert `CHART_MINT`, `CHART_BLUE`, `CHART_GREEN`, `CHART_ORANGE`, `CHART_VIOLET`, `CHART_GRID`, `CHART_PALETTE` (Array der ersten fünf, feste Reihenfolge)

T8 (`PersonalRecordsList.tsx`) bleibt unverändert — Liste ohne Chart-Farben, Spec-Vorgabe wörtlich. Kein bestehender Test prüft auf Farbwerte (siehe Global Constraints) — keine Testdatei in diesem Task.

- [ ] **Step 1: Write the color-constants module**

Create `src/lib/analysis/chart-colors.ts`:

```ts
/**
 * Named chart colors from the Phase 6 design spec
 * (docs/superpowers/specs/2026-09-05-phase6-design-design.md, section
 * "Farbzuordnung für alle 19 Graphen"). Recharts' fill/stroke props are SVG
 * presentation attributes and render more reliably as literal hex strings
 * than as CSS custom properties there, so these mirror src/index.css's
 * @theme values directly rather than referencing them via var(...).
 */
export const CHART_MINT = '#6efde6'
export const CHART_BLUE = '#4f6ca5'
export const CHART_GREEN = '#49be69'
export const CHART_ORANGE = '#ff6f43'
export const CHART_VIOLET = '#8766ed'
export const CHART_GRID = '#5e5f66'

/** Fixed cycle for charts with more categories than dedicated colors (T6, E4). */
export const CHART_PALETTE = [CHART_MINT, CHART_BLUE, CHART_GREEN, CHART_ORANGE, CHART_VIOLET]
```

- [ ] **Step 2: T1 — TrainingFrequencyChart**

In `src/components/charts/TrainingFrequencyChart.tsx`, add the import:

```ts
import { CHART_MINT } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <Bar dataKey="anzahl" fill="#8884d8" />
```
with:
```tsx
          <Bar dataKey="anzahl" fill={CHART_MINT} />
```

- [ ] **Step 3: T2 — StrengthChart**

In `src/components/charts/StrengthChart.tsx`, add the import:

```ts
import { CHART_MINT } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <Line type="monotone" dataKey="wert" stroke="#8884d8" dot={false} />
```
with:
```tsx
          <Line type="monotone" dataKey="wert" stroke={CHART_MINT} dot={false} />
```

- [ ] **Step 4: T3 — ExerciseVolumeChart**

In `src/components/charts/ExerciseVolumeChart.tsx`, add the import:

```ts
import { CHART_MINT } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <Bar dataKey="wert" fill="#8884d8" />
```
with:
```tsx
          <Bar dataKey="wert" fill={CHART_MINT} />
```

- [ ] **Step 5: T4 — BestSetWeightChart**

In `src/components/charts/BestSetWeightChart.tsx`, add the import:

```ts
import { CHART_MINT } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <Line type="monotone" dataKey="wert" stroke="#8884d8" dot={false} />
```
with:
```tsx
          <Line type="monotone" dataKey="wert" stroke={CHART_MINT} dot={false} />
```

- [ ] **Step 6: T5 — RepsPerSetChart**

`RepsPerSetChart` draws one line per set number (up to six) — the spec's per-graph table names T5 "Mint" as if it drew a single series, but collapsing all lines to one color would make them indistinguishable, exactly the problem the 5-color palette solves for T6/E4 elsewhere in the same table. This task cycles through that same palette here too, repeating Mint for a hypothetical sixth line.

In `src/components/charts/RepsPerSetChart.tsx`, add the import:

```ts
import { CHART_MINT, CHART_BLUE, CHART_GREEN, CHART_ORANGE, CHART_VIOLET } from '../../lib/analysis/chart-colors'
```

Replace:
```ts
// Sechs Farben reichen: mehr als sechs Arbeitssaetze je Uebung ist selten, und
// danach wiederholt sich die Reihe, statt dass eine Linie unsichtbar wird.
const FARBEN = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f7f', '#8dd1e1', '#a4de6c']
```
with:
```ts
// Sechs Farben reichen: mehr als sechs Arbeitssaetze je Uebung ist selten, und
// danach wiederholt sich die Reihe, statt dass eine Linie unsichtbar wird.
// Zyklus aus derselben 5er-Design-Palette wie T6/E4 (Ruling: der Spec-Satz
// "T5 -> Mint" meint keine Einzelfarbe, siehe Plan-2d-Rationale zu T5) —
// Mint wiederholt sich fuer eine sechste Linie.
const FARBEN = [CHART_MINT, CHART_BLUE, CHART_GREEN, CHART_ORANGE, CHART_VIOLET, CHART_MINT]
```

- [ ] **Step 7: T6 — MuscleVolumeChart**

In `src/components/charts/MuscleVolumeChart.tsx`, replace the recharts import:

```ts
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
```
with:
```ts
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
```

Add the import:
```ts
import { CHART_PALETTE } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <Bar dataKey="volumen" fill="#8884d8" />
```
with:
```tsx
          <Bar dataKey="volumen">
            {/* Reihenfolge nach erstem Auftreten in den Daten (Spec-Vorgabe),
                nicht nach Namen — volumenJeMuskelgruppe liefert diese Reihenfolge
                bereits, hier nur per Index eingefaerbt. */}
            {punkte.map((punkt, index) => (
              <Cell key={punkt.muskelgruppe} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
            ))}
          </Bar>
```

- [ ] **Step 8: T7 — SessionLoadChart**

In `src/components/charts/SessionLoadChart.tsx`, add the import:

```ts
import { CHART_BLUE, CHART_MINT } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <Bar yAxisId="minuten" dataKey="minuten" name="Minuten" fill="#8884d8" />
          <Line
            yAxisId="kalorien"
            type="monotone"
            dataKey="kalorien"
            name="kcal"
            stroke="#82ca9d"
            dot={false}
          />
```
with:
```tsx
          <Bar yAxisId="minuten" dataKey="minuten" name="Minuten" fill={CHART_MINT} />
          <Line
            yAxisId="kalorien"
            type="monotone"
            dataKey="kalorien"
            name="kcal"
            stroke={CHART_BLUE}
            dot={false}
          />
```

- [ ] **Step 9: Run the full suite**

Run: `npm test -- --run`
Expected: PASS — all tests, no test in this plan's scope asserts on color values (verified in the Global Constraints pre-flight check), and T6's bar-count test (`'.recharts-bar-rectangle'`) is unaffected since `Cell` customizes existing bars rather than adding new ones.

- [ ] **Step 10: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/lib/analysis/chart-colors.ts src/components/charts/TrainingFrequencyChart.tsx src/components/charts/StrengthChart.tsx src/components/charts/ExerciseVolumeChart.tsx src/components/charts/BestSetWeightChart.tsx src/components/charts/RepsPerSetChart.tsx src/components/charts/MuscleVolumeChart.tsx src/components/charts/SessionLoadChart.tsx
git commit -m "feat: Trainingsgraphen mit der Design-Farbpalette"
```

---

## Task 3: Ernährungsgraphen (E1–E6) — Farbpalette

**Files:**
- Modify: `src/components/charts/CaloriesPerDayChart.tsx` (E1)
- Modify: `src/components/charts/MacroDistributionChart.tsx` (E2)
- Modify: `src/components/charts/MacroTrendChart.tsx` (E3)
- Modify: `src/components/charts/MealSectionCaloriesChart.tsx` (E4)
- Modify: `src/components/charts/WeeklyAverageChart.tsx` (E5)
- Modify: `src/components/charts/CalorieBalanceChart.tsx` (E6)

**Interfaces:**
- Consumes: `CHART_MINT`, `CHART_BLUE`, `CHART_GREEN`, `CHART_GRID`, `CHART_PALETTE` aus `src/lib/analysis/chart-colors.ts` (Task 2)

Keine Testdatei-Änderung nötig — dieselbe Begründung wie Task 2.

- [ ] **Step 1: E1 — CaloriesPerDayChart**

In `src/components/charts/CaloriesPerDayChart.tsx`, add the import:

```ts
import { CHART_GRID, CHART_MINT } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
            <ReferenceLine
              y={ziel}
              stroke="#82ca9d"
              label={`Ziel ${ziel} kcal`}
              ifOverflow="extendDomain"
            />
          )}
          <Line type="monotone" dataKey="kalorien" stroke="#8884d8" dot={false} />
```
with:
```tsx
            <ReferenceLine
              y={ziel}
              stroke={CHART_GRID}
              label={`Ziel ${ziel} kcal`}
              ifOverflow="extendDomain"
            />
          )}
          <Line type="monotone" dataKey="kalorien" stroke={CHART_MINT} dot={false} />
```

- [ ] **Step 2: E2 — MacroDistributionChart**

In `src/components/charts/MacroDistributionChart.tsx`, replace the recharts import:

```ts
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
```
with:
```ts
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
```

Add the import:
```ts
import { CHART_BLUE, CHART_GREEN, CHART_MINT } from '../../lib/analysis/chart-colors'
```

After the `TITEL` export, add:
```ts
// Nach Namen, nicht nach Reihenfolge: makroAnteileHeute liefert die drei
// Makros in fester Reihenfolge, aber die Zuordnung soll auch dann stimmen,
// falls sich das je aendert.
const MAKRO_FARBEN: Record<string, string> = {
  Eiweiß: CHART_MINT,
  Kohlenhydrate: CHART_BLUE,
  Fett: CHART_GREEN,
}
```

Replace:
```tsx
          <Bar dataKey="anteil" fill="#8884d8" isAnimationActive={false}>
            {/* Der Gramm-Wert, nicht der Energie-Anteil: die Balkenhoehe ist
                Energie, die Beschriftung bleibt in der vertrauten Einheit aus
                DailySummary. */}
            <LabelList dataKey="gramm" formatter={(value: RenderableText) => `${value} g`} />
          </Bar>
```
with:
```tsx
          <Bar dataKey="anteil" isAnimationActive={false}>
            {anteile.map((eintrag) => (
              <Cell key={eintrag.makro} fill={MAKRO_FARBEN[eintrag.makro] ?? CHART_MINT} />
            ))}
            {/* Der Gramm-Wert, nicht der Energie-Anteil: die Balkenhoehe ist
                Energie, die Beschriftung bleibt in der vertrauten Einheit aus
                DailySummary. */}
            <LabelList dataKey="gramm" formatter={(value: RenderableText) => `${value} g`} />
          </Bar>
```

- [ ] **Step 3: E3 — MacroTrendChart**

In `src/components/charts/MacroTrendChart.tsx`, add the import:

```ts
import { CHART_BLUE, CHART_GREEN, CHART_MINT } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <Line type="monotone" dataKey="eiweiss" name="Eiweiß (g)" stroke="#8884d8" dot={false} />
          <Line type="monotone" dataKey="fett" name="Fett (g)" stroke="#ff7300" dot={false} />
          <Line
            type="monotone"
            dataKey="kohlenhydrate"
            name="Kohlenhydrate (g)"
            stroke="#82ca9d"
            dot={false}
          />
```
with:
```tsx
          <Line type="monotone" dataKey="eiweiss" name="Eiweiß (g)" stroke={CHART_MINT} dot={false} />
          <Line type="monotone" dataKey="fett" name="Fett (g)" stroke={CHART_GREEN} dot={false} />
          <Line
            type="monotone"
            dataKey="kohlenhydrate"
            name="Kohlenhydrate (g)"
            stroke={CHART_BLUE}
            dot={false}
          />
```

(Dieselbe Eiweiß→Mint/Kohlenhydrate→Blau/Fett→Grün-Zuordnung wie E2 — Spec-Vorgabe wörtlich: „identische Zuordnung wie E2, für Wiedererkennbarkeit".)

- [ ] **Step 4: E4 — MealSectionCaloriesChart**

In `src/components/charts/MealSectionCaloriesChart.tsx`, replace the recharts import:

```ts
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
```
with:
```ts
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
```

Add the import:
```ts
import { CHART_PALETTE } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <Bar dataKey="kalorien" fill="#8884d8" />
```
with:
```tsx
          <Bar dataKey="kalorien">
            {punkte.map((punkt, index) => (
              <Cell key={punkt.name} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
            ))}
          </Bar>
```

- [ ] **Step 5: E5 — WeeklyAverageChart**

In `src/components/charts/WeeklyAverageChart.tsx`, add the import:

```ts
import { CHART_MINT } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <Bar dataKey="schnitt" fill="#8884d8" />
```
with:
```tsx
          <Bar dataKey="schnitt" fill={CHART_MINT} />
```

- [ ] **Step 6: E6 — CalorieBalanceChart**

In `src/components/charts/CalorieBalanceChart.tsx`, add the import:

```ts
import { CHART_GRID, CHART_MINT } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <ReferenceLine y={0} stroke="#999" />
          <Line type="monotone" dataKey="bilanz" stroke="#8884d8" dot={false} />
```
with:
```tsx
          <ReferenceLine y={0} stroke={CHART_GRID} />
          <Line type="monotone" dataKey="bilanz" stroke={CHART_MINT} dot={false} />
```

- [ ] **Step 7: Run the full suite**

Run: `npm test -- --run`
Expected: PASS — all tests, no color assertions, `Cell`-based bar-count tests for E2/E4 unaffected.

- [ ] **Step 8: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/components/charts/CaloriesPerDayChart.tsx src/components/charts/MacroDistributionChart.tsx src/components/charts/MacroTrendChart.tsx src/components/charts/MealSectionCaloriesChart.tsx src/components/charts/WeeklyAverageChart.tsx src/components/charts/CalorieBalanceChart.tsx
git commit -m "feat: Ernaehrungsgraphen mit der Design-Farbpalette"
```

---

## Task 4: Körpergraphen (K1–K4) — Farbpalette

**Files:**
- Modify: `src/components/charts/WeightTrendChart.tsx` (K1)
- Modify: `src/components/charts/BodyMeasurementsChart.tsx` (K2)
- Modify: `src/components/charts/WeightChangeRateChart.tsx` (K3)
- Modify: `src/components/charts/WeightVsCaloriesChart.tsx` (K4)

**Interfaces:**
- Consumes: `CHART_MINT`, `CHART_BLUE`, `CHART_GREEN`, `CHART_ORANGE`, `CHART_VIOLET`, `CHART_GRID` aus `src/lib/analysis/chart-colors.ts` (Task 2)

K5 (`PhotoTimeline.tsx`) bleibt unverändert — Liste ohne Chart-Farben, Spec-Vorgabe wörtlich. Keine Testdatei-Änderung nötig.

- [ ] **Step 1: K1 — WeightTrendChart**

In `src/components/charts/WeightTrendChart.tsx`, add the import:

```ts
import { CHART_BLUE, CHART_MINT } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <Line type="monotone" dataKey="gewicht" name="Gewicht" stroke="#8884d8" dot={false} />
          <Line type="monotone" dataKey="trend" name="Trend" stroke="#82ca9d" strokeWidth={2} dot={false} />
```
with:
```tsx
          <Line type="monotone" dataKey="gewicht" name="Gewicht" stroke={CHART_BLUE} dot={false} />
          <Line type="monotone" dataKey="trend" name="Trend" stroke={CHART_MINT} strokeWidth={2} dot={false} />
```

(Trend ist die Hauptmetrik → Mint, das Rohgewicht der Vergleichswert daneben → Blau — Spec-Vorgabe wörtlich.)

- [ ] **Step 2: K2 — BodyMeasurementsChart**

In `src/components/charts/BodyMeasurementsChart.tsx`, add the import:

```ts
import { CHART_BLUE, CHART_GREEN, CHART_MINT, CHART_ORANGE, CHART_VIOLET } from '../../lib/analysis/chart-colors'
```

Replace:
```ts
/** Feste Farbe je Umfang: eine wechselnde Zuordnung waere zwischen zwei
 *  Zeitraeumen nicht wiedererkennbar. */
const FARBEN: Record<UmfangFeld, string> = {
  bauchumfang: '#8884d8',
  beinumfang: '#82ca9d',
  armumfang: '#ff7300',
  ruckenumfang: '#0088fe',
  brustumfang: '#d0468c',
}
```
with:
```ts
/** Feste Farbe je Umfang: eine wechselnde Zuordnung waere zwischen zwei
 *  Zeitraeumen nicht wiedererkennbar. Reihenfolge exakt wie im Design-Spec
 *  (Bauch/Bein/Arm/Ruecken/Brust -> Mint/Blau/Gruen/Orange/Violett). */
const FARBEN: Record<UmfangFeld, string> = {
  bauchumfang: CHART_MINT,
  beinumfang: CHART_BLUE,
  armumfang: CHART_GREEN,
  ruckenumfang: CHART_ORANGE,
  brustumfang: CHART_VIOLET,
}
```

- [ ] **Step 3: K3 — WeightChangeRateChart**

In `src/components/charts/WeightChangeRateChart.tsx`, add the import:

```ts
import { CHART_GRID, CHART_MINT } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <ReferenceLine y={0} stroke="#888" ifOverflow="extendDomain" />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg/Woche`, '']} />
          <Line type="monotone" dataKey="rate" name="kg/Woche" stroke="#8884d8" dot={false} />
```
with:
```tsx
          <ReferenceLine y={0} stroke={CHART_GRID} ifOverflow="extendDomain" />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg/Woche`, '']} />
          <Line type="monotone" dataKey="rate" name="kg/Woche" stroke={CHART_MINT} dot={false} />
```

- [ ] **Step 4: K4 — WeightVsCaloriesChart**

In `src/components/charts/WeightVsCaloriesChart.tsx`, add the import:

```ts
import { CHART_GRID, CHART_MINT } from '../../lib/analysis/chart-colors'
```

Replace:
```tsx
          <ReferenceLine y={0} stroke="#888" ifOverflow="extendDomain" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Woche" data={punkte} fill="#8884d8" />
```
with:
```tsx
          <ReferenceLine y={0} stroke={CHART_GRID} ifOverflow="extendDomain" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Woche" data={punkte} fill={CHART_MINT} />
```

- [ ] **Step 5: Run the full suite**

Run: `npm test -- --run`
Expected: PASS — all tests, no color assertions.

- [ ] **Step 6: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/components/charts/WeightTrendChart.tsx src/components/charts/BodyMeasurementsChart.tsx src/components/charts/WeightChangeRateChart.tsx src/components/charts/WeightVsCaloriesChart.tsx
git commit -m "feat: Koerpergraphen mit der Design-Farbpalette"
```

---

## Task 5: Abschluss — Gesamtlauf, Bundle, manueller Browser-Check, Doku

**Files:**
- Modify: `CLAUDE.md`
- Check (no change expected): `docs/domaenenmodell.md`

**Interfaces:**
- Consumes: alles Vorherige
- Produces: keine Codeschnittstelle

- [ ] **Step 1: Bundle messen**

```bash
npm run build
```

Zahlen wörtlich übernehmen — inklusive der Erinnerung, dass ein Worktree ohne `.env` einen nicht vergleichbaren, zu kleinen Wert liefert (fehlendes Barcode-Scanner-Subsystem im Entry-Chunk — siehe Plan 1/2a/2b/2c).

- [ ] **Step 2: Domänenmodell prüfen**

`docs/domaenenmodell.md` prüfen — dieser Plan ändert keine Tabelle, keine Spalte, keine Abfrage-Form, nur Markup, Klassen und Farbwerte. Keine Änderung vornehmen, falls das stimmt.

- [ ] **Step 3: Manueller Browser-Check**

**Warum zwingend:** jeder Test in diesem Plan prüft Verhalten oder gezeichnete Marken, keiner prüft eine tatsächliche Farbe oder das Karten-Layout. `npm run dev` starten (temporäre, nicht committete `.env` mit Platzhalter-Werten reicht, siehe Vorgehen aus Plan 1/2a/2b/2c) und gegen echte Produktionsdaten oder eine Wegwerf-Testseite mit Fake-Daten prüfen (analog zum Vorgehen der vorherigen Design-Pläne). Durchklicken und bestätigen:

1. Auf allen drei Analyse-Seiten (`/training/analyse`, `/nutrition/analyse`, `/body/analyse`): der Zeitraum-Umschalter zeigt vier Pillen (`rounded-full`), die aktive Pille ist deutlich von den übrigen unterschieden (Akzentfarbe vs. gedämpft) — die Plan-1-Chip-Optik greift korrekt.
2. Jeder einzelne Graph erscheint als eigene abgerundete Karte ohne sichtbaren Rahmen (die `ChartFrame`-Änderung wirkt für alle 19 Graphen).
3. Ein Einzelfarben-Graph (z. B. T1 Trainingsfrequenz oder E5 Wochenschnitt) zeigt die Mint-Farbe, nicht Recharts' Standard-Lila.
4. Ein Mehrfarben-Graph (z. B. T6 Volumen je Muskelgruppe, E2 Makro-Verteilung heute oder K2 Umfänge im Verlauf) zeigt mehrere klar unterscheidbare Farben aus der Palette, keine einzelne Uniform-Farbe.
5. T8 (persönliche Rekorde) und K5 (Fortschrittsfotos) bleiben unverändert Listen ohne Chart-Optik.
6. Konsole ohne Fehler oder Warnungen auf jeder besuchten Seite.

Alle sechs Punkte im Abschlussbericht festhalten. Falls einer fehlschlägt: Fund ins Ledger, ein Fix, ein Scoped-Re-Review, erneut visuell bestätigen — derselbe Ablauf wie in Plan 1/2a/2b/2c.

- [ ] **Step 4: Vollständige Prüfung**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
npm run build
```

- [ ] **Step 5: Status in CLAUDE.md nachziehen**

Im Abschnitt „Phase 6" festhalten: Plan 2d (Analyse-Seiten) umgesetzt — alle drei Analyse-Seiten und alle 19 Graphen auf Chip/Karte/Design-Palette umgestellt, Testzahl und Bundle-Zahl, Ergebnis des manuellen Browser-Checks. Phase 6 (Design) ist damit inhaltlich vollständig abgeschlossen — nächster Schritt ist Phase 7 (Härtung).

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Status fuer Phase 6 Plan 2d nachziehen"
```

---

## Self-Review

**Spec-Abdeckung.** „Zeitraum-Umschalter wird zur Chip-Reihe" → Task 1. „Karten-Umrandung um jeden einzelnen Graphen" → Task 1 (`ChartFrame`, wirkt für alle 19). Die vollständige Farbzuordnungs-Tabelle für Training/Ernährung/Körper → Task 2/3/4, jeder der 17 betroffenen Graphen einzeln nachvollzogen (T8/K5 bewusst ausgenommen, Spec-Vorgabe wörtlich).

**Ein Ruling dokumentiert, wo der Spec-Satz und die tatsächliche Graph-Struktur auseinanderfallen:** T5 (Wiederholungen je Satz) zeichnet tatsächlich bis zu sechs Linien (eine je Satznummer), der Spec-Satz nennt aber nur „Mint" — als wäre es eine einzelne Serie. Eine einzelne Farbe hätte die Linien ununterscheidbar gemacht, exakt das Problem, das die 5er-Palette bei T6/E4 löst. Task 2 Step 6 löst das mit demselben Palette-Zyklus, dokumentiert als Ruling im Code-Kommentar und hier im Self-Review.

**Testkonsistenz vorab geprüft, nicht angenommen:** vor Planerstellung wurde per `grep` über alle `src/components/charts/*.test.tsx`-Dateien bestätigt, dass kein bestehender Test einen Farbwert prüft — deckt sich mit der seit Phase 5 dokumentierten Projekt-Konvention „Graph-Tests prüfen gezeichnete Marken, nie Achsentexte oder Farben". Für die drei `Cell`-basierten Graphen (T6, E2, E4) wurde zusätzlich verifiziert, dass ihre bestehenden `.recharts-bar-rectangle`-Zähltests von `Cell`-Kindern unter einem bestehenden `Bar`-Element unberührt bleiben (keine zusätzlichen Balken, nur eingefärbte bestehende).

**Typkonsistenz.** `CHART_PALETTE` ist ein Array aus genau den fünf benannten Konstanten in fester Reihenfolge (Mint/Blau/Grün/Orange/Violett) — jede Zyklus-Nutzung (T6, E4, T5) indiziert in dieselbe Reihenfolge, keine abweichende Reihenfolge an einer der drei Stellen.

**Platzhalter-Durchgang.** Kein „TBD", kein „analog zu Task N" ohne ausgeschriebenen Code — jeder Schritt zeigt den exakten Vorher/Nachher-Block.

**Bewusst offen gelassen für diesen Plan:** `CartesianGrid`s eigene Gitterfarbe bleibt Recharts' Standardgrau (Rationale oben). `ChartPicker.tsx`s Dashboard-Checkbox bleibt unstyliert (Spec nennt sie nicht). Mit diesem Plan sind alle vier Bereichs-Pläne der Phase 6 (Fundament, Training, Ernährung, Körper, Analyse-Seiten) abgeschlossen — Härtung (Phase 7) ist der nächste Schritt, dafür existiert noch keine Spec/Plan.

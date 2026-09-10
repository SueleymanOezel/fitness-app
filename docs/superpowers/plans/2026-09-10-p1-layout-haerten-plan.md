# P1-Fixes (Layout-Hierarchie, Nav-Überdeckung, Leerzustand-CTAs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die drei P1-Befunde aus dem Critique-Re-Run beheben: app-weites zentriertes Layout durch linksbündige Hierarchie ersetzen, die schwebende Bottom-Nav-Pille verdeckt keine interaktiven Elemente mehr, und drei benannte Leerzustände bekommen einen Call-to-Action statt eines toten Endes.

**Architecture:** Eine globale CSS-Änderung (`#root` verliert `text-align: center`, `main` bekommt Padding gegen die Nav-Pille), ein neuer optionaler `leerCta`-Prop auf der gemeinsamen `ChartFrame`-Komponente, mechanisch durchgereicht durch alle 19 Chart-Komponenten und ihre drei Bereichs-`*ChartList`-Komponenten, plus gezielte Hierarchie-Fixes an den drei in der Spec benannten Stellen (`BodyPage`, `DailySummary`, `TrainingPage`).

**Tech Stack:** React + Vite + TypeScript, Tailwind v4 (`@theme`/`@layer`), React Router, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-10-p1-layout-haerten-design.md`

## Global Constraints

- Refinement, kein Redesign: bestehende Struktur, Copy und Funktion bleiben — nur Ausrichtung, Hierarchie, Nav-Abstand und die drei benannten CTAs ändern sich.
- Keine neuen Abhängigkeiten, keine neue Wrapper-Komponente für `leerCta` — ein einfacher optionaler Prop reicht (siehe Spec, Entscheidung 3).
- Kein CTA für Home-Bereich-Charts (`leerCta` bleibt dort `undefined`) — Home ist rein lesend (siehe `docs/superpowers/specs/2026-09-06-home-dashboard-design.md`).
- `LoginPage.tsx` braucht laut Code-Prüfung **keine** Änderung: jedes Text-Element dort hat bereits eine explizite `text-center`/`text-left`-Klasse aus dem P0/2-Login-Redesign-Task, nichts verlässt sich auf die geerbte `#root`-Regel. Task 1 verifiziert das nur, ändert nichts.
- Test-/Verifikationsbefehle: `npm test` (Vitest), `npm run lint` (ESLint), `npm run build` (`tsc -b && vite build`). Jeder Task läuft mindestens die eigenen betroffenen Tests; Task 6 läuft alle drei über das gesamte Repo.
- Bestehende Test-Helper: `renderWithProviders` aus `src/test-render.tsx` (wrapt `MemoryRouter` + `ToastProvider`) für jeden Test, der `<Link>` oder `useToast()` berührt — nackte `render()` aus `@testing-library/react` reicht nur, wenn beides fehlt.

---

## Task 1: Foundation — globale Zentrierung entfernen, Nav-Abstand reservieren

**Files:**
- Modify: `src/index.css:67-76` (`#root`-Regel), `src/index.css:135-138` (`main`-Regel in `@layer base`)
- Test: keine neue Testdatei — Verifikation über die bestehende Suite plus manuelle Browser-Prüfung (Schritt 5/6)

**Interfaces:**
- Produziert: keinen neuen Code-Vertrag. Nachfolgende Tasks verlassen sich darauf, dass `#root` ab jetzt linksbündig ist (kein Prop/keine Funktion, rein visuell).

- [ ] **Step 1: `#root` von der globalen Zentrierung befreien**

In `src/index.css`, aktueller Stand:

```css
#root {
  width: 1126px;
  max-width: 100%;
  margin: 0 auto;
  text-align: center;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
```

Entferne die Zeile `text-align: center;` ersatzlos:

```css
#root {
  width: 1126px;
  max-width: 100%;
  margin: 0 auto;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
```

- [ ] **Step 2: `main` bekommt Platz für die schwebende Bottom-Nav-Pille**

Aktueller Stand (`@layer base`, im selben `index.css`):

```css
main {
  flex: 1;
  padding: 0 16px 16px;
}
```

Nur der dritte Wert (unten) ändert sich, Shorthand-Schreibweise bleibt wie im Rest der Datei erhalten:

```css
main {
  flex: 1;
  padding: 0 16px calc(4rem + env(safe-area-inset-bottom) + 16px);
}
```

- [ ] **Step 3: Volle Testsuite laufen lassen — reine CSS-Änderung darf keinen Test brechen**

Run: `npm test`
Expected: alle Tests grün, unverändert zur Zahl vor diesem Task (Tests prüfen Text/Rollen, keine CSS-Klassen von `#root`/`main`).

- [ ] **Step 4: Build/Typecheck**

Run: `npm run build`
Expected: erfolgreich, keine neuen TypeScript- oder Build-Fehler.

- [ ] **Step 5: `LoginPage.tsx` verifizieren (kein Code-Fix erwartet)**

`npm run dev` starten, `/login` im echten Chrome öffnen. Logo, Formular, beide Buttons und der Moduswechsel-Link müssen weiterhin wie vor dieser Änderung zentriert/linksbündig aussehen (Formularfelder linksbündig, Überschrift/Buttons zentriert) — jedes betroffene Element in `LoginPage.tsx` trägt bereits eine explizite `text-center`- oder `text-left`-Klasse. Nur die Fehlermeldung (`<p role="alert" className="text-sm text-danger">`, keine explizite Ausrichtungsklasse) wechselt von zentriert auf linksbündig — das ist gewollt (kein optischer Fehler, einzeiliger Text in einer `max-w-sm`-Box).

- [ ] **Step 6: Restliche Seiten grob durchklicken (Vorab-Check, keine Fixes in diesem Task)**

`/`, `/training`, `/nutrition`, `/body`, `/profile` kurz im Browser öffnen. Notieren, welche Stellen jetzt sichtbar linksbündig statt zentriert sind — das ist erwartetes Verhalten, kein Bug. Diese Liste dient als Grundlage für Task 6 (Verifikation), nicht als Fix-Auftrag in diesem Task.

- [ ] **Step 7: Commit**

```bash
git add src/index.css
git commit -m "fix: remove global center alignment, reserve space for floating bottom nav"
```

---

## Task 2: `ChartFrame` — optionaler `leerCta`-Link im Leerzustand

**Files:**
- Modify: `src/components/charts/ChartFrame.tsx`
- Test: `src/components/charts/ChartFrame.test.tsx`

**Interfaces:**
- Produziert: `ChartFrame`s neue Prop `leerCta?: { label: string; to: string }`. Task 3–5 reichen diesen Typ unverändert durch alle Chart-Komponenten und `*ChartList`-Komponenten bis zu den Dashboard-/Analyse-Seiten durch.

- [ ] **Step 1: Fehlschlagenden Test schreiben**

In `src/components/charts/ChartFrame.test.tsx`, neuen Test am Ende von `describe('ChartFrame', ...)` ergänzen (vor der schließenden `})`):

```tsx
  it('shows a call-to-action link in the empty state when leerCta is set', () => {
    renderWithProviders(
      <ChartFrame titel="Trainingsfrequenz" leer leerCta={{ label: 'Training starten', to: '/training' }}>
        <div />
      </ChartFrame>,
    )
    const link = screen.getByRole('link', { name: 'Training starten' })
    expect(link).toHaveAttribute('href', '/training')
  })

  it('omits the call-to-action link when leerCta is not set', () => {
    renderWithProviders(
      <ChartFrame titel="Trainingsfrequenz" leer>
        <div />
      </ChartFrame>,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
```

Import am Dateikopf ergänzen (ersetzt den bisherigen `render`-Import, da `renderWithProviders` `MemoryRouter` mitbringt, das `<Link>` braucht):

```tsx
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test-render'
import ChartFrame from './ChartFrame'
```

Alle bestehenden `render(` in dieser Datei bleiben unverändert auf `render(...)` — nur der Import wechselt, `render` wird für die neuen zwei Tests durch `renderWithProviders` ersetzt, für die anderen fünf bestehenden Tests bleibt `render` weiterhin nutzbar, solange es zusätzlich importiert bleibt:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderWithProviders } from '../../test-render'
import ChartFrame from './ChartFrame'
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test -- ChartFrame`
Expected: FAIL — `leerCta` existiert noch nicht als Prop, kein Link im DOM.

- [ ] **Step 3: `ChartFrame.tsx` um `leerCta` erweitern**

Aktueller Stand:

```tsx
import type { ReactNode } from 'react'
import { cardClass } from '../../lib/ui-classes'

/**
 * Shared shell for every chart: title, the dashboard checkbox, and the empty
 * state. Kept in one place so a chart cannot invent its own wording for
 * "nothing to show yet".
 */
export default function ChartFrame({
  titel,
  leer,
  picker,
  vorspann,
  children,
}: {
  titel: string
  leer: boolean
  picker?: ReactNode
  /**
   * Rendered unconditionally, unlike `children` — for controls that must stay
   * usable even in the empty state (e.g. the exercise select on T2/T3/T4/T5:
   * without it, an empty result for the default exercise leaves no way to
   * pick a different one).
   */
  vorspann?: ReactNode
  children: ReactNode
}) {
  return (
    <section className={cardClass}>
      <h2>{titel}</h2>
      {picker}
      {vorspann}
      {leer ? <p>Noch nicht genug Daten für diesen Graphen.</p> : children}
    </section>
  )
}
```

Ersetzen durch:

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cardClass } from '../../lib/ui-classes'

/**
 * Shared shell for every chart: title, the dashboard checkbox, and the empty
 * state. Kept in one place so a chart cannot invent its own wording for
 * "nothing to show yet".
 */
export default function ChartFrame({
  titel,
  leer,
  picker,
  vorspann,
  leerCta,
  children,
}: {
  titel: string
  leer: boolean
  picker?: ReactNode
  /**
   * Rendered unconditionally, unlike `children` — for controls that must stay
   * usable even in the empty state (e.g. the exercise select on T2/T3/T4/T5:
   * without it, an empty result for the default exercise leaves no way to
   * pick a different one).
   */
  vorspann?: ReactNode
  /**
   * Link zur zentralen Eintragsaktion des Bereichs, gezeigt statt eines toten
   * Endes im Leerzustand. Von jedem Dashboard/jeder Analyse-Seite einmal fuer
   * alle ihre Charts gesetzt, nicht pro Chart-Typ einzeln.
   */
  leerCta?: { label: string; to: string }
  children: ReactNode
}) {
  return (
    <section className={cardClass}>
      <h2>{titel}</h2>
      {picker}
      {vorspann}
      {leer ? (
        <>
          <p>Noch nicht genug Daten für diesen Graphen.</p>
          {leerCta && (
            <Link to={leerCta.to} className="flex items-center justify-center gap-2">
              {leerCta.label}
            </Link>
          )}
        </>
      ) : (
        children
      )}
    </section>
  )
}
```

- [ ] **Step 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test -- ChartFrame`
Expected: PASS, alle sieben Tests grün.

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/ChartFrame.tsx src/components/charts/ChartFrame.test.tsx
git commit -m "feat: add optional call-to-action link to ChartFrame's empty state"
```

---

## Task 3: Trainings-Bereich — CTA-Wiring + Leerzustand-Fix auf `TrainingPage`

**Files:**
- Modify: `src/components/charts/TrainingFrequencyChart.tsx`, `StrengthChart.tsx`, `ExerciseVolumeChart.tsx`, `BestSetWeightChart.tsx`, `RepsPerSetChart.tsx`, `MuscleVolumeChart.tsx`, `SessionLoadChart.tsx`, `PersonalRecordsList.tsx`
- Modify: `src/components/charts/TrainingChartList.tsx`
- Modify: `src/pages/TrainingPage.tsx`, `src/pages/TrainingAnalysisPage.tsx`
- Test: `src/pages/TrainingPage.test.tsx`, `src/components/charts/TrainingFrequencyChart.test.tsx`

**Interfaces:**
- Konsumiert: `ChartFrame`s `leerCta?: { label: string; to: string }` aus Task 2.
- Produziert: `TrainingChartListProps.leerCta` (gleicher Typ), von `TrainingPage`/`TrainingAnalysisPage` mit `{ label: 'Training starten', to: '/training' }` befüllt.

- [ ] **Step 1: `leerCta` durch die acht Trainings-Chart-Komponenten durchreichen**

Für **`TrainingFrequencyChart.tsx`**, **`MuscleVolumeChart.tsx`**, **`SessionLoadChart.tsx`**, **`PersonalRecordsList.tsx`** (einzeilige `ChartFrame`-Aufrufe, kein `vorspann`) gilt derselbe dreiteilige Patch je Datei:

1. In der Prop-Destrukturierung `picker,\n}: {` → `picker,\n  leerCta,\n}: {`
2. Im Typ-Block `picker?: ReactNode\n}) {` → `picker?: ReactNode\n  leerCta?: { label: string; to: string }\n}) {`
3. Im JSX `picker={picker}>` → `picker={picker} leerCta={leerCta}>`

Beispiel für `TrainingFrequencyChart.tsx` (aktuell):

```tsx
export default function TrainingFrequencyChart({
  sessions,
  picker,
}: {
  sessions: AnalysisSession[]
  picker?: ReactNode
}) {
  const punkte = sessionsJeWoche(sessions)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker}>
```

Danach:

```tsx
export default function TrainingFrequencyChart({
  sessions,
  picker,
  leerCta,
}: {
  sessions: AnalysisSession[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const punkte = sessionsJeWoche(sessions)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker} leerCta={leerCta}>
```

Identisch (nur die `leer={...}`-Bedingung unterscheidet sich, unverändert lassen) für:
- `MuscleVolumeChart.tsx` (`leer={punkte.length < 1}`)
- `SessionLoadChart.tsx` (`leer={punkte.length < 1}`)
- `PersonalRecordsList.tsx` (`leer={rekorde.length < 1}`)

Für **`StrengthChart.tsx`**, **`ExerciseVolumeChart.tsx`**, **`BestSetWeightChart.tsx`**, **`RepsPerSetChart.tsx`** (mehrzeiliger `ChartFrame`-Aufruf mit `vorspann`/`mitUebungsauswahl`) gilt derselbe Patch, nur an anderer Stelle im JSX. Aktueller Stand (identisch in allen vier Dateien):

```tsx
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
```

```tsx
    <ChartFrame
      titel={titel}
      leer={punkte.length < 2}
      picker={picker}
      vorspann={
```

Danach (Funktionsname und `leer={...}` je Datei unverändert lassen):

```tsx
export default function StrengthChart({
  sessions,
  sets,
  picker,
  leerCta,
  mitUebungsauswahl = true,
}: {
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
  mitUebungsauswahl?: boolean
}) {
```

```tsx
    <ChartFrame
      titel={titel}
      leer={punkte.length < 2}
      picker={picker}
      leerCta={leerCta}
      vorspann={
```

(`ExerciseVolumeChart.tsx` hat `leer={punkte.length < 1}`, die anderen drei `leer={punkte.length < 2}` — jeweils unverändert lassen.)

- [ ] **Step 2: `TrainingChartList.tsx` um `leerCta` erweitern**

Aktueller Stand (Auszug):

```tsx
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
      case T2:
        return (
          <StrengthChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            mitUebungsauswahl={analyse}
          />
        )
      case T3:
        return (
          <ExerciseVolumeChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            mitUebungsauswahl={analyse}
          />
        )
      case T4:
        return (
          <BestSetWeightChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            mitUebungsauswahl={analyse}
          />
        )
      case T5:
        return (
          <RepsPerSetChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            mitUebungsauswahl={analyse}
          />
        )
      case T6:
        return <MuscleVolumeChart sets={sets} picker={picker} />
      case T7:
        return <SessionLoadChart sessions={sessions} picker={picker} />
      case T8:
        return <PersonalRecordsList sessions={sessions} sets={sets} picker={picker} />
      default:
        return null
    }
  }
```

Ersetzen durch:

```tsx
export type TrainingChartListProps = {
  ids: string[]
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  /** Gesetzt auf der Analyse-Seite: zeigt Haekchen und Uebungsauswahl. */
  auswahl?: ReturnType<typeof useChartSelection>
  /** Wird an jeden Chart des Bereichs durchgereicht, siehe ChartFrame. */
  leerCta?: { label: string; to: string }
}

export default function TrainingChartList({
  ids,
  sessions,
  sets,
  auswahl,
  leerCta,
}: TrainingChartListProps) {
  const analyse = auswahl != null

  function graph(id: string): ReactNode {
    const picker = auswahl ? <ChartPicker id={id} auswahl={auswahl} /> : undefined
    switch (id) {
      case T1:
        return <TrainingFrequencyChart sessions={sessions} picker={picker} leerCta={leerCta} />
      case T2:
        return (
          <StrengthChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            leerCta={leerCta}
            mitUebungsauswahl={analyse}
          />
        )
      case T3:
        return (
          <ExerciseVolumeChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            leerCta={leerCta}
            mitUebungsauswahl={analyse}
          />
        )
      case T4:
        return (
          <BestSetWeightChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            leerCta={leerCta}
            mitUebungsauswahl={analyse}
          />
        )
      case T5:
        return (
          <RepsPerSetChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            leerCta={leerCta}
            mitUebungsauswahl={analyse}
          />
        )
      case T6:
        return <MuscleVolumeChart sets={sets} picker={picker} leerCta={leerCta} />
      case T7:
        return <SessionLoadChart sessions={sessions} picker={picker} leerCta={leerCta} />
      case T8:
        return <PersonalRecordsList sessions={sessions} sets={sets} picker={picker} leerCta={leerCta} />
      default:
        return null
    }
  }
```

- [ ] **Step 3: `leerCta` an beiden Trainings-Aufrufstellen setzen**

In `src/pages/TrainingPage.tsx:119`, aktuell:

```tsx
  return <TrainingChartList ids={ids} sessions={sessions} sets={sets} />
```

Danach:

```tsx
  return (
    <TrainingChartList
      ids={ids}
      sessions={sessions}
      sets={sets}
      leerCta={{ label: 'Training starten', to: '/training' }}
    />
  )
```

In `src/pages/TrainingAnalysisPage.tsx:46`, aktuell:

```tsx
        <TrainingChartList ids={ids} sessions={sessions} sets={sets} auswahl={auswahl} />
```

Danach:

```tsx
        <TrainingChartList
          ids={ids}
          sessions={sessions}
          sets={sets}
          auswahl={auswahl}
          leerCta={{ label: 'Training starten', to: '/training' }}
        />
```

- [ ] **Step 4: Leerzustand auf `TrainingPage.tsx` selbst zum CTA machen**

Aktueller Stand (`src/pages/TrainingPage.tsx:60-63`):

```tsx
  return (
    <div>
      <h1>Training</h1>
      {plan == null && <p>Kein aktiver Plan.</p>}
```

Ersetzen durch (Text „Kein aktiver Plan." bleibt erhalten — der bestehende Test `getByText(/kein aktiver Plan/i)` bleibt dadurch unverändert grün — plus neuer CTA-Link darunter):

```tsx
  return (
    <div>
      <h1>Training</h1>
      {plan == null && (
        <>
          <p>Kein aktiver Plan.</p>
          <Link to="/training/plans" className={buttonPrimaryClass}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="plans" tone="mono" size={20} />
              Trainingsplan anlegen
            </span>
          </Link>
        </>
      )}
```

`Link` ist in `TrainingPage.tsx` bereits importiert (`import { Link, useNavigate } from 'react-router-dom'`); `buttonPrimaryClass` ergänzt den bestehenden Import `import { buttonPrimaryClass } from '../lib/ui-classes'` — bleibt unverändert, ist schon vorhanden.

- [ ] **Step 5: Test für den neuen CTA-Link schreiben**

In `src/pages/TrainingPage.test.tsx`, im Test rund um Zeile 79 (`getByText(/kein aktiver Plan/i)`), direkt danach ergänzen:

```tsx
    expect(screen.getByRole('link', { name: /Trainingsplan anlegen/ })).toHaveAttribute(
      'href',
      '/training/plans',
    )
```

- [ ] **Step 6: Tests laufen lassen**

Run: `npm test -- TrainingPage TrainingFrequencyChart`
Expected: PASS. `TrainingFrequencyChart.test.tsx` braucht keine Änderung — es ruft die Komponente ohne `leerCta` auf, `leerCta` bleibt optional und `undefined` rendert keinen Link (siehe `ChartFrame`s `leerCta &&`-Guard).

- [ ] **Step 7: Volle Suite, Lint, Build**

Run: `npm test && npm run lint && npm run build`
Expected: alles grün.

- [ ] **Step 8: Commit**

```bash
git add src/components/charts/TrainingFrequencyChart.tsx src/components/charts/StrengthChart.tsx src/components/charts/ExerciseVolumeChart.tsx src/components/charts/BestSetWeightChart.tsx src/components/charts/RepsPerSetChart.tsx src/components/charts/MuscleVolumeChart.tsx src/components/charts/SessionLoadChart.tsx src/components/charts/PersonalRecordsList.tsx src/components/charts/TrainingChartList.tsx src/pages/TrainingPage.tsx src/pages/TrainingAnalysisPage.tsx src/pages/TrainingPage.test.tsx
git commit -m "feat: add training area empty-state CTAs (plan creation, chart call-to-action)"
```

---

## Task 4: Ernährungs-Bereich — CTA-Wiring + `DailySummary`-Hierarchie

**Files:**
- Modify: `src/components/charts/CaloriesPerDayChart.tsx`, `MacroDistributionChart.tsx`, `MacroTrendChart.tsx`, `MealSectionCaloriesChart.tsx`, `WeeklyAverageChart.tsx`, `CalorieBalanceChart.tsx`
- Modify: `src/components/charts/NutritionChartList.tsx`
- Modify: `src/pages/NutritionPage.tsx`, `src/pages/NutritionAnalysisPage.tsx`
- Modify: `src/components/DailySummary.tsx`
- Test: `src/components/DailySummary.test.tsx` (keine Änderung erwartet, siehe Step 4 — läuft nur zur Bestätigung)

**Interfaces:**
- Konsumiert: `ChartFrame`s `leerCta` aus Task 2, dasselbe Muster wie Task 3.
- Produziert: `NutritionChartListProps.leerCta`, befüllt mit `{ label: 'Eintragen', to: '/nutrition' }`.

- [ ] **Step 1: `leerCta` durch die sechs Ernährungs-Chart-Komponenten durchreichen**

Alle sechs sind einzeilige `ChartFrame`-Aufrufe ohne `vorspann` — derselbe dreiteilige Patch wie in Task 3, Step 1 (Muster A):

| Datei | `leer`-Ausdruck (unverändert lassen) |
|---|---|
| `CaloriesPerDayChart.tsx` | `punkte.length < 2` |
| `MacroDistributionChart.tsx` | `anteile.length < 1` |
| `MacroTrendChart.tsx` | `punkte.length < 2` |
| `MealSectionCaloriesChart.tsx` | `!hatDaten` |
| `WeeklyAverageChart.tsx` | `punkte.length < 1` |
| `CalorieBalanceChart.tsx` | `punkte.length < 2` |

Je Datei:
1. `picker,\n}: {` → `picker,\n  leerCta,\n}: {`
2. `picker?: ReactNode\n}) {` → `picker?: ReactNode\n  leerCta?: { label: string; to: string }\n}) {`
3. `picker={picker}>` → `picker={picker} leerCta={leerCta}>`

(Identisches Beispiel wie `TrainingFrequencyChart.tsx` in Task 3, Step 1 — Funktionsname und `leer={...}` je Datei aus der Tabelle oben übernehmen.)

- [ ] **Step 2: `NutritionChartList.tsx` um `leerCta` erweitern**

Aktueller Stand:

```tsx
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
      case E2:
        return <MacroDistributionChart entries={entries} picker={picker} />
      case E3:
        return <MacroTrendChart entries={entries} picker={picker} />
      case E4:
        return <MealSectionCaloriesChart entries={entries} profile={profile} picker={picker} />
      case E5:
        return <WeeklyAverageChart entries={entries} picker={picker} />
      case E6:
        return <CalorieBalanceChart entries={entries} sessions={sessions} picker={picker} />
      default:
        return null
    }
  }
```

Ersetzen durch:

```tsx
export type NutritionChartListProps = {
  ids: string[]
  entries: AnalysisFoodEntry[]
  sessions: AnalysisSessionKalorien[]
  ziel: number | null
  profile: MealSectionNames | null
  /** Gesetzt auf der Analyse-Seite: zeigt die Haekchen. */
  auswahl?: ReturnType<typeof useChartSelection>
  /** Wird an jeden Chart des Bereichs durchgereicht, siehe ChartFrame. */
  leerCta?: { label: string; to: string }
}

export default function NutritionChartList({
  ids,
  entries,
  sessions,
  ziel,
  profile,
  auswahl,
  leerCta,
}: NutritionChartListProps) {
  function graph(id: string): ReactNode {
    const picker = auswahl ? <ChartPicker id={id} auswahl={auswahl} /> : undefined
    switch (id) {
      case E1:
        return <CaloriesPerDayChart entries={entries} ziel={ziel} picker={picker} leerCta={leerCta} />
      case E2:
        return <MacroDistributionChart entries={entries} picker={picker} leerCta={leerCta} />
      case E3:
        return <MacroTrendChart entries={entries} picker={picker} leerCta={leerCta} />
      case E4:
        return (
          <MealSectionCaloriesChart
            entries={entries}
            profile={profile}
            picker={picker}
            leerCta={leerCta}
          />
        )
      case E5:
        return <WeeklyAverageChart entries={entries} picker={picker} leerCta={leerCta} />
      case E6:
        return (
          <CalorieBalanceChart entries={entries} sessions={sessions} picker={picker} leerCta={leerCta} />
        )
      default:
        return null
    }
  }
```

- [ ] **Step 3: `leerCta` an beiden Ernährungs-Aufrufstellen setzen**

In `src/pages/NutritionPage.tsx:136`, aktuell:

```tsx
  return (
    <NutritionChartList ids={ids} entries={entries} sessions={sessions} ziel={ziel} profile={profile} />
  )
```

Danach:

```tsx
  return (
    <NutritionChartList
      ids={ids}
      entries={entries}
      sessions={sessions}
      ziel={ziel}
      profile={profile}
      leerCta={{ label: 'Eintragen', to: '/nutrition' }}
    />
  )
```

In `src/pages/NutritionAnalysisPage.tsx:47-57`, aktuell:

```tsx
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
```

Danach (nur eine neue Zeile vor dem schließenden `/>`):

```tsx
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
          leerCta={{ label: 'Eintragen', to: '/nutrition' }}
        />
```

- [ ] **Step 4: `DailySummary.tsx` — Kalorienstand als Stat statt als Satz**

Aktueller Stand (`src/components/DailySummary.tsx`):

```tsx
  return (
    <div className={cardClass}>
      <h2>Heute</h2>
      <p>
        {consumed} kcal verbraucht
        {remaining != null ? `, ${remaining} kcal offen (Ziel ${goal} kcal)` : ''}
      </p>
      <p>
        Eiweiß: {Math.round(sumMakro(entries, 'eiweiss'))} g · Fett: {Math.round(sumMakro(entries, 'fett'))} g ·
        Kohlenhydrate: {Math.round(sumMakro(entries, 'kohlenhydrate'))} g
      </p>
    </div>
  )
```

Ersetzen durch (verbrauchte kcal als große, betonte Zeile; offen/Ziel und Makros als kleinere, gedämpfte Sekundärzeilen — behält exakt dieselben Textinhalte, nur in getrennten Elementen mit eigener Größen-/Farbklasse):

```tsx
  return (
    <div className={cardClass}>
      <h2>Heute</h2>
      <p className="text-3xl font-semibold">{consumed} kcal verbraucht</p>
      {remaining != null && (
        <p className="text-sm text-text-muted">
          {remaining} kcal offen (Ziel {goal} kcal)
        </p>
      )}
      <p className="text-sm text-text-muted">
        Eiweiß: {Math.round(sumMakro(entries, 'eiweiss'))} g · Fett: {Math.round(sumMakro(entries, 'fett'))} g ·
        Kohlenhydrate: {Math.round(sumMakro(entries, 'kohlenhydrate'))} g
      </p>
    </div>
  )
```

- [ ] **Step 5: Tests laufen lassen — keine Testanpassung erwartet**

Run: `npm test -- DailySummary NutritionPage NutritionAnalysisPage`
Expected: PASS ohne Änderung an den Testdateien. Die vier bestehenden `DailySummary.test.tsx`-Fälle prüfen `getByText(/400 kcal verbraucht/)`, `getByText(/1600 kcal offen/)`, `getByText(/22 g/)` und die Card-Klassen auf dem Wrapper-`<div>` — alle vier bleiben durch die neue Struktur unverändert erfüllbar, weil jede gesuchte Phrase weiterhin vollständig im Text eines einzelnen Elements steht.

- [ ] **Step 6: Volle Suite, Lint, Build**

Run: `npm test && npm run lint && npm run build`
Expected: alles grün.

- [ ] **Step 7: Commit**

```bash
git add src/components/charts/CaloriesPerDayChart.tsx src/components/charts/MacroDistributionChart.tsx src/components/charts/MacroTrendChart.tsx src/components/charts/MealSectionCaloriesChart.tsx src/components/charts/WeeklyAverageChart.tsx src/components/charts/CalorieBalanceChart.tsx src/components/charts/NutritionChartList.tsx src/pages/NutritionPage.tsx src/pages/NutritionAnalysisPage.tsx src/components/DailySummary.tsx
git commit -m "feat: add nutrition area empty-state CTAs and restructure calorie summary as a stat"
```

---

## Task 5: Körper-Bereich — CTA-Wiring + Kennzahlen-Karten-Hierarchie

**Files:**
- Modify: `src/components/charts/WeightTrendChart.tsx`, `BodyMeasurementsChart.tsx`, `WeightChangeRateChart.tsx`, `WeightVsCaloriesChart.tsx`, `PhotoTimeline.tsx`
- Modify: `src/components/charts/BodyChartList.tsx`
- Modify: `src/pages/BodyPage.tsx`, `src/pages/BodyAnalysisPage.tsx`
- Test: `src/pages/BodyPage.test.tsx` (keine Änderung erwartet, siehe Step 3 — läuft nur zur Bestätigung)

**Interfaces:**
- Konsumiert: `ChartFrame`s `leerCta` aus Task 2, dasselbe Muster wie Task 3/4.
- Produziert: `BodyChartListProps.leerCta`, befüllt mit `{ label: 'Heute eintragen', to: '/body' }`.

- [ ] **Step 1: `leerCta` durch die fünf Körper-Chart-Komponenten durchreichen**

Alle fünf sind einzeilige `ChartFrame`-Aufrufe ohne `vorspann` — derselbe dreiteilige Patch wie in Task 3, Step 1 (Muster A):

| Datei | `leer`-Ausdruck (unverändert lassen) |
|---|---|
| `WeightTrendChart.tsx` | `punkte.length < 2` |
| `BodyMeasurementsChart.tsx` | `punkte.length < 2` |
| `WeightChangeRateChart.tsx` | `punkte.length < 2` |
| `WeightVsCaloriesChart.tsx` | `punkte.length < 2` |
| `PhotoTimeline.tsx` | `punkte.length < 1` |

Je Datei:
1. `picker,\n}: {` → `picker,\n  leerCta,\n}: {`
2. `picker?: ReactNode\n}) {` → `picker?: ReactNode\n  leerCta?: { label: string; to: string }\n}) {`
3. `picker={picker}>` → `picker={picker} leerCta={leerCta}>`

- [ ] **Step 2: `BodyChartList.tsx` um `leerCta` erweitern**

Aktueller Stand:

```tsx
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
      case K2:
        return <BodyMeasurementsChart rows={rows} picker={picker} />
      case K3:
        return <WeightChangeRateChart rows={rows} picker={picker} />
      case K4:
        return <WeightVsCaloriesChart rows={rows} kalorien={kalorien} picker={picker} />
      case K5:
        return <PhotoTimeline fotos={fotos} rows={rows} picker={picker} />
      default:
        return null
    }
  }
```

Ersetzen durch:

```tsx
export type BodyChartListProps = {
  ids: string[]
  rows: BodyMetricRow[]
  kalorien: TagesPunkt[]
  fotos: AnalysisPhoto[]
  /** Gesetzt auf der Analyse-Seite: zeigt die Haekchen. */
  auswahl?: ReturnType<typeof useChartSelection>
  /** Wird an jeden Chart des Bereichs durchgereicht, siehe ChartFrame. */
  leerCta?: { label: string; to: string }
}

export default function BodyChartList({
  ids,
  rows,
  kalorien,
  fotos,
  auswahl,
  leerCta,
}: BodyChartListProps) {
  function graph(id: string): ReactNode {
    const picker = auswahl ? <ChartPicker id={id} auswahl={auswahl} /> : undefined
    switch (id) {
      case K1:
        return <WeightTrendChart rows={rows} picker={picker} leerCta={leerCta} />
      case K2:
        return <BodyMeasurementsChart rows={rows} picker={picker} leerCta={leerCta} />
      case K3:
        return <WeightChangeRateChart rows={rows} picker={picker} leerCta={leerCta} />
      case K4:
        return (
          <WeightVsCaloriesChart rows={rows} kalorien={kalorien} picker={picker} leerCta={leerCta} />
        )
      case K5:
        return <PhotoTimeline fotos={fotos} rows={rows} picker={picker} leerCta={leerCta} />
      default:
        return null
    }
  }
```

- [ ] **Step 3: `leerCta` an beiden Körper-Aufrufstellen setzen**

In `src/pages/BodyPage.tsx:174`, aktuell:

```tsx
  return <BodyChartList ids={ids} rows={rows} kalorien={kalorien} fotos={fotos} />
```

Danach:

```tsx
  return (
    <BodyChartList
      ids={ids}
      rows={rows}
      kalorien={kalorien}
      fotos={fotos}
      leerCta={{ label: 'Heute eintragen', to: '/body' }}
    />
  )
```

In `src/pages/BodyAnalysisPage.tsx:44`, aktuell:

```tsx
        <BodyChartList ids={ids} rows={rows} kalorien={kalorien} fotos={fotos} auswahl={auswahl} />
```

Danach:

```tsx
        <BodyChartList
          ids={ids}
          rows={rows}
          kalorien={kalorien}
          fotos={fotos}
          auswahl={auswahl}
          leerCta={{ label: 'Heute eintragen', to: '/body' }}
        />
```

- [ ] **Step 4: Kennzahlen-Karten auf `BodyPage.tsx` — Label/Wert-Hierarchie**

Aktueller Stand (`src/pages/BodyPage.tsx`, in `Dashboard`):

```tsx
            <li key={field} className="block border-b-0">
              <div className={`${cardClass} w-full`}>
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
              </div>
            </li>
```

Ersetzen durch (Label klein/gedämpft, Wert groß/betont, vertikale Anordnung mit sichtbarem Abstand statt impliziter Reihung):

```tsx
            <li key={field} className="block border-b-0">
              <div className={`${cardClass} w-full flex flex-col items-start gap-1`}>
                <span className="text-sm text-text-muted">{FIELD_LABELS[field]}</span>
                <span className="text-2xl font-semibold" data-testid={`wert-${field}`}>
                  {latest == null ? '—' : `${formatValue(latest.value)} ${unitOf(field)}`}
                </span>
                {latest != null && (
                  <span className="text-sm text-text-muted">{`Stand ${formatDate(latest.datum)}`}</span>
                )}
                {change != null && (
                  <span className="text-sm text-text-muted">
                    {/* U+2212 minus, not a hyphen: it lines up with digits. */}
                    {`${change.delta < 0 ? '−' : '+'}${formatValue(Math.abs(change.delta))} ${unitOf(field)} seit ${formatDate(change.datum)}`}
                  </span>
                )}
              </div>
            </li>
```

- [ ] **Step 5: Tests laufen lassen — keine Testanpassung erwartet**

Run: `npm test -- BodyPage BodyAnalysisPage`
Expected: PASS ohne Änderung an den Testdateien — `BodyPage.test.tsx` prüft nur `getByTestId('wert-beinumfang')`-Textinhalt, keine Klassen.

- [ ] **Step 6: Volle Suite, Lint, Build**

Run: `npm test && npm run lint && npm run build`
Expected: alles grün.

- [ ] **Step 7: Commit**

```bash
git add src/components/charts/WeightTrendChart.tsx src/components/charts/BodyMeasurementsChart.tsx src/components/charts/WeightChangeRateChart.tsx src/components/charts/WeightVsCaloriesChart.tsx src/components/charts/PhotoTimeline.tsx src/components/charts/BodyChartList.tsx src/pages/BodyPage.tsx src/pages/BodyAnalysisPage.tsx
git commit -m "feat: add body area empty-state CTAs and metric-card label/value hierarchy"
```

---

## Task 6: App-weite Verifikation, Nav-Überdeckung messen, Status nachziehen

**Files:**
- Modify (nur falls die Sichtprüfung einen echten Regressionsbefund liefert): beliebige Seite aus der Liste in Schritt 2
- Modify: `CLAUDE.md` (Status-Abschnitt)
- Keine neue Testdatei

**Interfaces:**
- Konsumiert: den fertigen Stand aus Task 1–5.
- Produziert: nichts für Folge-Tasks — dies ist der Abschluss-Task von P1.

- [ ] **Step 1: Volle Suite, Lint, Build ein letztes Mal für den Gesamtstand**

Run: `npm test && npm run lint && npm run build`
Expected: alles grün, Build erfolgreich.

- [ ] **Step 2: Bottom-Nav-Überdeckung messen (Kernbefund von P1/Punkt 2)**

`npm run dev` starten, echten Chrome-Tab öffnen (Dummy-`.env` reicht, beide Seiten sind ohne echten Supabase-Zugriff über die üblichen Lade-/Fehlerzustände hinaus nicht testbar — falls nötig mit echtem `.env` gegen einen Test-Account einloggen, wie in früheren Tasks üblich).

Auf `/profile`: per Browser-DevTools-Konsole

```js
const logout = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Logout'))
const nav = document.querySelector('nav')
JSON.stringify({ logout: logout.getBoundingClientRect(), nav: nav.getBoundingClientRect() })
```

ausführen und bestätigen, dass `logout.bottom <= nav.top` (keine Überlappung) und `logout.bottom <= window.innerHeight` (nicht über den Viewport hinausragend).

Auf `/body`: dieselbe Prüfung für den „Fortschrittsfotos"-Link (`[...document.querySelectorAll('a')].find(a => a.textContent.includes('Fortschrittsfotos'))`) gegen `nav`.

Falls noch Überlappung besteht: `calc(4rem + ...)` aus Task 1 in `src/index.css` erhöhen (z. B. `5rem`), erneut messen, bis beide Prüfungen ohne Überlappung bestehen.

- [ ] **Step 3: Visuelle Hierarchie je Seite gegenprüfen**

Jede der 18 Seiten aus `src/pages/` öffnen (Desktop-Breite und ~375px Mobile-Breite im Chrome-Device-Toolbar), gegen die Liste aus Task 1/Step 6 abgleichen: Text ist linksbündig, Label/Wert-Paare haben sichtbaren Abstand und Größenunterschied, nichts wirkt uneinheitlich eingerückt.

- `TrainingPage`, `NutritionPage`, `BodyPage`: die in Task 3/4/5 explizit behobenen Stellen (CTA, `DailySummary`, Kennzahlen-Karten) sind erledigt — hier zusätzlich den Rest der jeweiligen Seite (z. B. `NutritionPage`s Mahlzeiten-Liste, die „Profil vervollständigen"-Zeile; `TrainingPage`s Plan-/Tag-Anzeige) auf echte Regressionen prüfen.
- `ProfilePage`: laut Spec keine strukturelle Änderung erwartet (`label { display:block }` reicht) — nur bestätigen, dass Formularfelder einheitlich linksbündig wirken.
- Alle übrigen Seiten (`HomePage`, `TrainingPlansPage`, `TrainingPlanEditPage`, `ExercisesPage`, `TrainingHistoryPage`, `TrainingHistoryDetailPage`, `WorkoutSessionPage`, `NutritionEntriesPage`, `BodyEntriesPage`, `BodyPhotosPage`, die vier `*AnalysisPage`s) auf echte Regressionen prüfen — nicht auf fehlende neue Politur (das wäre Scope-Creep über die Spec hinaus).

Ein gefundener echter Regressionsbefund (z. B. ein Element, das ohne die geerbte Zentrierung sichtbar falsch aussieht) wird direkt an Ort und Stelle mit einer expliziten `text-left`/`text-center`-Klasse behoben — kein Sammel-Ticket, kein „später".

- [ ] **Step 4: Leerzustände klicken**

„Kein aktiver Plan." → „Trainingsplan anlegen" auf `/training` klicken, landet auf `/training/plans` mit sichtbarem Formular. Auf einem Account ohne Trainings-/Ernährungs-/Körperdaten (oder durch temporäres Leeren der Testdaten) mindestens einen Chart mit `leerCta` in jedem der drei Bereiche im Leerzustand sehen und den CTA-Link anklicken, landet im jeweils richtigen Bereich (`/training`, `/nutrition`, `/body`).

- [ ] **Step 5: `docs/domaenenmodell.md` prüfen**

Keine Migration in diesem Vorhaben — kurz bestätigen, dass `docs/domaenenmodell.md` unverändert bleiben kann (letzte Migration weiterhin `0007`).

- [ ] **Step 6: `CLAUDE.md`-Status nachziehen**

Im Abschnitt „Status / Fortschritt" von `CLAUDE.md`: P1 als gemerged/verifiziert markieren (Merge-Commit nach dem PR-Merge ergänzen), Referenz auf Spec und diesen Plan, Ergebnis der Codex-Zweitmeinung (siehe unten) und den Hash-Sanity-Check nach dem Deploy. Nächster Schritt auf P2 (WCAG-Kontrast, unübersetzte Muskelgruppen-Werte) aktualisieren.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark P1 layout/nav/empty-state fixes as complete"
```

---

## Nach Abschluss aller Tasks (außerhalb dieses Plans, wie bei jedem bisherigen Vorhaben)

- Whole-Branch-Review (Opus) über den gesamten Diff, plus `codex review -c model="gpt-5.6-sol" --base master` als Zweitmeinung (siehe „Codex/GPT als Zweitmeinung" in `CLAUDE.md`).
- Scoped Re-Review nach etwaigen Fix-Runden.
- PR erstellen, mergen, danach im Hauptcheckout deployen: `npm ci && npm run build && firebase deploy --only hosting:vitaloop`, anschließend Hash-Sanity-Check gegen `https://vitaloop.web.app`.

# Phase 6, Plan 2a – Trainingsbereich im neuen Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle sieben Seiten des Trainingsbereichs (Dashboard, Pläne, Plan-Editor, Übungen, Live-Modus, Historie, Historien-Detail) verwenden die in Plan 1 gebauten Design-Bausteine (Karte, Buttons, Chip, Toast, Dialog) statt der alten unstylisierten Listen und `<p role="alert">`-Meldungen.

**Architecture:** Reine Umstellung auf bestehende Bausteine, keine neue Logik. Listenzeilen (Pläne, Übungen, Tage, Sätze, Sessions) werden zu Karten; die bisherige inline-Übungssuche (Plan-Editor) und das inline-Formular für eigene Übungen (Übungsseite) werden zu Dialogen; kurzlebige Aktions-Fehlermeldungen (fehlgeschlagenes Speichern/Löschen/Aktivieren/Starten) wandern von `<p role="alert">` zu `useToast()`; permanente Formular-Validierung (leerer Pflichtwert, außerhalb der Skala) und seitenblockierende Ladefehler bleiben inline, wie es der ToastProvider-Doc-Kommentar selbst festlegt. Der Satz-Eintrag im Live-Modus bekommt das Log-Screen-Muster: Kartenfelder, RIR-Auswahl als Chip-Reihe, ein breiter CTA-Button unten.

**Tech Stack:** React 19 + Vite, TypeScript, Tailwind CSS v4, Vitest + Testing Library. Keine neue Abhängigkeit — alles wird aus den in Plan 1 gebauten Bausteinen zusammengesetzt.

**Spec:** `docs/superpowers/specs/2026-09-05-phase6-design-design.md` (Abschnitt „Struktur je Bereich", Trainingsbereich-Zeile: „Pläne und Übungen als Karten. Der Satz-Eintrag im Live-Modus übernimmt das Log-Screen-Muster (Kategorie-Kontext oben, Kartenfelder darunter, breiter CTA-Button unten für 'Satz abschließen')." Die genaue Datei-für-Datei-Umsetzung — welche Buttons Primary/Secondary werden, wo Dialog statt Inline-Formular steht, wo Toast statt Inline-Fehler — ist bewusst nicht im Spec, sondern Aufgabe dieses Plans, exakt wie im Spec selbst festgehalten.)

**Vorgänger:** `docs/superpowers/plans/2026-09-05-phase6-plan1-fundament.md` (gemerged, PR #40, Merge-Commit `b891d0b`)

**Geschwisterpläne:** Plan 2b (Ernährung), Plan 2c (Körper), Plan 2d (Analyse-Seiten) folgen und übernehmen das Karten-/Toast-/Dialog-Muster aus diesem Plan für ihren Bereich. Home bleibt in allen vier Plänen unangetastet.

## Global Constraints

- **Keine Drittanbieter-Namen** aus Fitness/Ernährung in Code, Kommentaren, Commit-Messages oder Docs.
- **Karten:** `rounded-3xl`, kein sichtbarer Rahmen. **Buttons/CTAs:** `rounded-2xl`. **Chips:** `rounded-full`. Exakte Klassen aus `src/lib/ui-classes.ts` (`cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass`) und `src/components/Chip.tsx` — nicht neu erfinden, importieren.
- **Natives `<dialog>`** über `src/components/Dialog.tsx` für jedes Popup/Sheet in diesem Plan, kein eigenes Modal-System.
- **Ein Button je Seite wird `buttonPrimaryClass`** (die eine Hauptaktion: Anlegen, Tag hinzufügen, Training starten, Satz abschließen, Training abschließen, Speichern im Übung-anlegen-Dialog, der Übung-hinzufügen-Dialog-Auslöser). **Sekundäre/abbrechende/lösch-artige Aktionen** (Aktivieren, Löschen, Session löschen, Abbrechen, Entfernen) werden `buttonSecondaryClass`. **Kleine Zeilen-Werkzeuge** (Tag/Übung nach oben/unten verschieben) bleiben unstyled — sie behalten die bestehende Übergangs-CSS aus `index.css`, keine neue Klasse. Kein neuer dritter Button-Stil (z. B. „Danger") wird erfunden — Plan 1 hat nur zwei Varianten gebaut.
- **Karten-in-Liste-Muster (siehe Rationale unten):** jede Listenzeile, die eine Karte wird, bleibt `<li className="block border-b-0">`, der eigentliche Karten-Look sitzt auf einem verschachtelten `<div className={`${cardClass} w-full`}>`. Niemals `cardClass` direkt auf ein `<li>` setzen.
- **Toast statt Inline-Meldung** nur für kurzlebige Rückmeldung auf eine fehlgeschlagene Aktion (Speichern/Löschen/Aktivieren/Starten/Satz-Loggen). **Inline bleibt:** Formular-Validierung (leerer Pflichtwert, Wert außerhalb der Skala) und seitenblockierende Ladefehler (eine ganze Liste konnte nicht geladen werden) — exakt die Regel aus `ToastProvider.tsx`s eigenem Doc-Kommentar.
- Bestehende Barrierefreiheits-Konventionen bleiben erhalten: `role="list"` auf echten Listen, 44px Mindest-Tastziel, `label`-Verknüpfung auf jedem Formularfeld.
- `src/index.css` wird von diesem Plan **nicht angefasst** — die Übergangsregeln dort bedienen weiterhin Ernährung, Körper, Profil und Login, die erst in späteren Plänen migrieren. Sie frühzeitig zu entfernen würde diese Seiten sofort unstylisiert zurücklassen.
- Nach jedem Task: `npm run lint`, `npx tsc -b --noEmit`, `npm test -- --run` müssen grün sein.
- Commit-Messages auf Deutsch ohne Umlaute, im Stil der bestehenden Historie.

### Rationale: warum `<li className="block border-b-0">` statt `cardClass` direkt auf `<li>`

`src/index.css`s Übergangsregel für `li` (in `@layer base`, siehe Plan 1) setzt `display: flex; justify-content: center; align-items: center; gap: 8px; border-bottom: 1px solid #2e303a`. Läge `cardClass` (`bg-surface rounded-3xl p-6`) direkt auf dem `<li>`, würde die Tailwind-Utility zwar `padding`/`background`/`border-radius` gewinnen (höhere Layer-Priorität, siehe Plan 1s Whole-Branch-Review), aber `border-bottom`, `display: flex` und `justify-content: center` blieben unangetastet — keine dieser Eigenschaften wird von `cardClass`s Klassen gesetzt, also gewinnt hier die `@layer base`-Regel einfach mangels Gegner. Das Ergebnis wäre ein sichtbarer Rahmen unter jeder Karte (verstößt gegen „kein sichtbarer Rahmen") und ein durch `justify-content: center` zusammengeschrumpfter Karten-Inhalt statt einer volle Breite einnehmenden Zeile. Der verschachtelte `<div>` trägt die komplette Karten-Optik selbst; das `<li>` bleibt ein reiner, unsichtbarer Semantik-Wrapper — `block` hebt `display: flex` auf (danach greifen `gap`/`justify-content`/`align-items` gar nicht mehr, die gelten nur im Flex-/Grid-Kontext), `border-b-0` entfernt den Rahmen explizit. Das ist exakt die Art Fund, die Plan 1s Whole-Branch-Review bei Button/Chip gemacht hat — hier vorab vermieden, weil `<li>` von der Übergangsregel betroffen ist und `<div>` nicht.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `src/test-render.tsx` | **neu:** gemeinsamer Test-Render-Helfer, wrappt `MemoryRouter` + `ToastProvider`, optional mit Routen-Pfad für Seiten mit `useParams` |
| `src/pages/TrainingPage.tsx` | geändert: `buttonPrimaryClass` auf „Training starten", Start-Fehler über Toast |
| `src/pages/TrainingPlansPage.tsx` | geändert: Plan-Zeilen als Karten, Buttons, Aktions-Fehler über Toast, Namensvalidierung bleibt inline |
| `src/pages/ExercisesPage.tsx` | geändert: Übungs-Zeilen als Karten, „Eigene Übung anlegen" wird ein Dialog, Speichern-Fehler über Toast, Feld-Validierung und Ladefehler bleiben inline |
| `src/pages/TrainingPlanEditPage.tsx` | geändert: Tage und Übungszeilen als Karten, Übungssuche wird ein Dialog, CRUD-Fehler über Toast, Tagesnamen-Validierung bleibt inline |
| `src/pages/WorkoutSessionPage.tsx` | geändert: Satz-Eintrag als Karte (Log-Screen-Muster), RIR-Auswahl als Chip-Reihe, breite CTA-Buttons, Fehler über Toast |
| `src/pages/TrainingHistoryPage.tsx` | geändert: Session-Zeilen als Karten |
| `src/pages/TrainingHistoryDetailPage.tsx` | geändert: Satz-Zeilen als Karten, Speichern-/Löschen-Fehler über Toast |
| `docs/domaenenmodell.md` | geprüft, keine Änderung erwartet (reine UI-Umstellung, kein Schema-Bezug) |
| `CLAUDE.md` | Status nach Abschluss nachgezogen |

---

## Task 1: Gemeinsamer Test-Render-Helfer

**Files:**
- Create: `src/test-render.tsx`
- Test: `src/test-render.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export function renderWithProviders(
    ui: React.ReactElement,
    options?: { route?: string; path?: string },
  ): ReturnType<typeof render>
  ```

Jede der sieben Seiten in diesem Plan ruft künftig `useToast()` auf, das außerhalb eines `ToastProvider` wirft. Jeder bestehende Seiten-Test rendert bisher ohne `ToastProvider` — ohne diesen Helfer würde jeder einzelne Test-Datei-Umbau denselben Wrapper elf Mal duplizieren. `path` ist optional: Seiten ohne `useParams` (z. B. `TrainingPage`) brauchen nur `route`, Seiten mit Parametern (`WorkoutSessionPage`, `TrainingPlanEditPage`, `TrainingHistoryDetailPage`) brauchen zusätzlich das Routen-Muster.

- [ ] **Step 1: Write the failing test**

Create `src/test-render.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { useToast } from './components/ToastProvider'
import { useParams } from 'react-router-dom'
import { renderWithProviders } from './test-render'

function ToastButton() {
  const showToast = useToast()
  return (
    <button type="button" onClick={() => showToast('Hallo', 'success')}>
      Zeigen
    </button>
  )
}

function ParamPage() {
  const { id } = useParams<{ id: string }>()
  return <p>{`id: ${id}`}</p>
}

describe('renderWithProviders', () => {
  it('wraps in a ToastProvider so useToast does not throw', () => {
    renderWithProviders(<ToastButton />)
    expect(screen.getByRole('button', { name: 'Zeigen' })).toBeInTheDocument()
  })

  it('renders a parametrised route when path and route are given', () => {
    renderWithProviders(<ParamPage />, { route: '/thing/abc', path: '/thing/:id' })
    expect(screen.getByText('id: abc')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/test-render.test.tsx`
Expected: FAIL — Modul `./test-render` existiert nicht.

- [ ] **Step 3: Write the implementation**

Create `src/test-render.tsx`:

```tsx
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider'

/**
 * Every page in the training/nutrition/body areas calls useToast(), which
 * throws outside a ToastProvider. Wrapping that once here instead of in
 * every page's test file keeps the eleven-plus call sites from duplicating
 * the same three lines. `path` is only needed for pages read via useParams.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path }: { route?: string; path?: string } = {},
) {
  const content = path ? (
    <Routes>
      <Route path={path} element={ui} />
    </Routes>
  ) : (
    ui
  )
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>{content}</ToastProvider>
    </MemoryRouter>,
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/test-render.test.tsx`
Expected: PASS

- [ ] **Step 5: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/test-render.tsx src/test-render.test.tsx
git commit -m "test: gemeinsamer Render-Helfer fuer Toast-Provider und Routen"
```

---

## Task 2: TrainingPage (Dashboard)

**Files:**
- Modify: `src/pages/TrainingPage.tsx`
- Modify: `src/pages/TrainingPage.test.tsx`

**Interfaces:**
- Consumes: `buttonPrimaryClass` aus `src/lib/ui-classes.ts`; `useToast` aus `src/components/ToastProvider.tsx`; `renderWithProviders` aus `src/test-render.tsx`

Nur die eine Hauptaktion („Training starten") und ihr Fehlerpfad ändern sich. Der Rest des Dashboards bleibt unverändert — „Dashboards nur das Wichtigste" gilt weiterhin, keine Karten auf dieser Seite.

- [ ] **Step 1: Update the test render helper and the failure-path test**

In `src/pages/TrainingPage.test.tsx`: replace the import and the `zeigeDashboard` helper, and remove the `MemoryRouter` import (no longer used directly).

Replace:
```ts
import { MemoryRouter } from 'react-router-dom'
```
with:
```ts
import { renderWithProviders } from '../test-render'
```

Replace:
```ts
function zeigeDashboard() {
  return render(<TrainingPage />, { wrapper: MemoryRouter })
}
```
with:
```ts
function zeigeDashboard() {
  return renderWithProviders(<TrainingPage />)
}
```

Also remove the now-unused `render` import from `@testing-library/react` if the linter flags it (`render` is still used nowhere else in this file once the wrapper switches to `renderWithProviders`).

The existing test `'reports a failed start instead of navigating'` already asserts `screen.getByRole('alert')` — the Toast element also carries `role="alert"`, so this assertion needs **no change**. Run it after Step 3 to confirm.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/TrainingPage.test.tsx`
Expected: FAIL — `useToast must be used within a ToastProvider` (the page still calls nothing yet, so actually this step fails differently: the import change alone does not yet fail. Skip ahead — the meaningful RED state is in Step 2 of the implementation below, since the test file change alone is compatible with the *old* implementation too. Run the suite once now only to confirm no import/syntax errors were introduced.)

Run: `npm test -- --run src/pages/TrainingPage.test.tsx`
Expected: PASS (unchanged, since the implementation has not moved to `useToast` yet)

- [ ] **Step 3: Write the implementation**

In `src/pages/TrainingPage.tsx`, add the imports:

```ts
import { buttonPrimaryClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
```

Replace the `Dashboard` function's error handling and start button. Current:

```tsx
function Dashboard({ userId }: { userId: string }) {
  const { plan, day, loading } = useActiveTrainingDay(userId)
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const auswahl = useChartSelection(userId)

  if (loading) {
    return (
      <div>
        <h1>Training</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  // Disabled while starting: a second click would create a second session
  // and leave the first one open forever.
  async function start(dayId: string) {
    setError('')
    setStarting(true)
    try {
      const sessionId = await startWorkoutSession(userId, dayId)
      navigate(`/training/session/${sessionId}`)
    } catch {
      setError('Training konnte nicht gestartet werden.')
      setStarting(false)
    }
  }

  return (
    <div>
      <h1>Training</h1>
      {plan == null && <p>Kein aktiver Plan.</p>}
      {plan != null && day == null && (
        <>
          <p>{plan.name}</p>
          <p>Dieser Plan hat noch keinen Tag.</p>
        </>
      )}
      {plan != null && day != null && (
        <>
          <p>{plan.name}</p>
          <p>{day.name}</p>
          <button type="button" disabled={starting} onClick={() => start(day.id)}>
            Training starten
          </button>
        </>
      )}
      {error !== '' && <p role="alert">{error}</p>}
      <Link to="/training/plans">Meine Pläne</Link>
```

Replace with:

```tsx
function Dashboard({ userId }: { userId: string }) {
  const { plan, day, loading } = useActiveTrainingDay(userId)
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const showToast = useToast()
  const auswahl = useChartSelection(userId)

  if (loading) {
    return (
      <div>
        <h1>Training</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  // Disabled while starting: a second click would create a second session
  // and leave the first one open forever.
  async function start(dayId: string) {
    setStarting(true)
    try {
      const sessionId = await startWorkoutSession(userId, dayId)
      navigate(`/training/session/${sessionId}`)
    } catch {
      showToast('Training konnte nicht gestartet werden.', 'error')
      setStarting(false)
    }
  }

  return (
    <div>
      <h1>Training</h1>
      {plan == null && <p>Kein aktiver Plan.</p>}
      {plan != null && day == null && (
        <>
          <p>{plan.name}</p>
          <p>Dieser Plan hat noch keinen Tag.</p>
        </>
      )}
      {plan != null && day != null && (
        <>
          <p>{plan.name}</p>
          <p>{day.name}</p>
          <button type="button" className={buttonPrimaryClass} disabled={starting} onClick={() => start(day.id)}>
            Training starten
          </button>
        </>
      )}
      <Link to="/training/plans">Meine Pläne</Link>
```

(Everything from `<Link to="/training/plans">` onward stays exactly as it was — only the block above it changes.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/TrainingPage.test.tsx`
Expected: PASS — 10/10 tests, including the unchanged `'reports a failed start instead of navigating'` toast-backed alert.

- [ ] **Step 5: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/pages/TrainingPage.tsx src/pages/TrainingPage.test.tsx
git commit -m "feat: Trainings-Dashboard mit Primary-Button und Toast-Fehler"
```

---

## Task 3: TrainingPlansPage

**Files:**
- Modify: `src/pages/TrainingPlansPage.tsx`
- Modify: `src/pages/TrainingPlansPage.test.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass` aus `src/lib/ui-classes.ts`; `useToast`; `renderWithProviders`

Der leere-Name-Fehler bleibt eine eigene, lokale Zustandsvariable (permanente Formular-Validierung, inline); die drei Aktions-Fehler (Aktivieren/Löschen/Anlegen-Schreibfehler) wandern zu Toast.

- [ ] **Step 1: Update the test file's render helper**

In `src/pages/TrainingPlansPage.test.tsx`, replace:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
```
with:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-render'
```

Every call of the shape:
```ts
const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
render(<TrainingPlansPage />, { wrapper: MemoryRouter })
```
becomes:
```ts
const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
renderWithProviders(<TrainingPlansPage />)
```
(five occurrences — one per `it` block. No other test logic changes; the existing `screen.getByRole('alert')` assertions in `'refuses to create a plan without a name'` and `'reports a failed write instead of swallowing it'` need no change — the first still comes from local inline state, the second now comes from a Toast, both carry `role="alert"`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/TrainingPlansPage.test.tsx`
Expected: PASS still (the render-helper swap alone does not change behavior; the implementation has not moved yet). Confirms no regression before the real change.

- [ ] **Step 3: Write the implementation**

In `src/pages/TrainingPlansPage.tsx`, add the imports:

```ts
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
```

Replace the whole `PlansList` function:

```tsx
function PlansList({ userId }: { userId: string }) {
  const { plans, loading, createPlan, deletePlan, activatePlan } = useWorkoutPlans(userId)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const showToast = useToast()

  if (loading) {
    return (
      <div>
        <h1>Meine Pläne</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  // The hooks reject on a failed write; without this the rejection would go
  // unhandled and the user would see nothing at all. A write failure is
  // short-lived feedback on an action, so it goes to a toast — unlike the
  // name-is-empty check below, which is permanent form validation and stays
  // inline (ToastProvider's own contract: transient action feedback only).
  async function run(action: () => Promise<void>, message: string) {
    try {
      await action()
    } catch {
      showToast(message, 'error')
    }
  }

  return (
    <div>
      <h1>Meine Pläne</h1>
      <ul role="list" className="space-y-4">
        {plans.map((plan) => (
          <li key={plan.id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>
              <Link to={`/training/plans/${plan.id}`}>{plan.name}</Link>
              {plan.aktiv && <span>aktiv</span>}
              {!plan.aktiv && (
                <button
                  type="button"
                  className={buttonSecondaryClass}
                  onClick={() => run(() => activatePlan(plan.id), 'Aktivieren fehlgeschlagen.')}
                >
                  Aktivieren
                </button>
              )}
              <button
                type="button"
                className={buttonSecondaryClass}
                onClick={() => run(() => deletePlan(plan.id), 'Löschen fehlgeschlagen.')}
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (name.trim() === '') {
            setNameError('Der Plan braucht einen Namen.')
            return
          }
          setNameError('')
          const trimmed = name.trim()
          setName('')
          await run(() => createPlan(trimmed), 'Anlegen fehlgeschlagen.')
        }}
      >
        <label>
          Neuer Plan
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit" className={buttonPrimaryClass}>
          Anlegen
        </button>
      </form>
      {nameError !== '' && <p role="alert">{nameError}</p>}
      <Link to="/training">Zurück zum Training</Link>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/TrainingPlansPage.test.tsx`
Expected: PASS — all 5 tests, including the write-failure test now backed by a toast.

- [ ] **Step 5: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/pages/TrainingPlansPage.tsx src/pages/TrainingPlansPage.test.tsx
git commit -m "feat: Plaene-Liste als Karten, Aktions-Fehler ueber Toast"
```

---

## Task 4: ExercisesPage

**Files:**
- Modify: `src/pages/ExercisesPage.tsx`
- Modify: `src/pages/ExercisesPage.test.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass`; `Dialog` (default export, `{open, onClose, children}`) aus `src/components/Dialog.tsx`; `useToast`; `renderWithProviders`

„Eigene Übung anlegen" wird aus einem inline umgeschalteten Formular ein Dialog. Der Ladefehler (`loadError`, ganze Liste nicht verfügbar) bleibt inline — er ist kein kurzlebiges Feedback auf eine Aktion, sondern ein blockierender Zustand der ganzen Seite. Die Feld-Validierung im Formular bleibt ebenfalls inline; nur der Schreibfehler beim Speichern wird ein Toast — genau der Fall, den `ToastProvider.tsx`s eigener Doc-Kommentar als Beispiel nennt („Speichern fehlgeschlagen").

- [ ] **Step 1: Update the test file**

In `src/pages/ExercisesPage.test.tsx`, replace:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
```
with:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-render'
```

Every occurrence of:
```ts
const { default: ExercisesPage } = await import('./ExercisesPage')
render(<ExercisesPage />, { wrapper: MemoryRouter })
```
becomes:
```ts
const { default: ExercisesPage } = await import('./ExercisesPage')
renderWithProviders(<ExercisesPage />)
```
(five occurrences.)

The test `'reports a failed save instead of closing the form'` keeps its exact assertions (`screen.getByRole('alert')`, `screen.getByLabelText('Name')` still present) — the dialog stays open on a failed save exactly like the old inline form did, and the toast also carries `role="alert"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/ExercisesPage.test.tsx`
Expected: PASS still — the render-helper swap alone changes nothing behaviorally yet.

- [ ] **Step 3: Write the implementation**

In `src/pages/ExercisesPage.tsx`, add the imports:

```ts
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import { useToast } from '../components/ToastProvider'
```

Replace the whole file's `ExercisesList` and `NewExerciseForm` functions:

```tsx
function ExercisesList({ userId }: { userId: string }) {
  const { exercises, loading, error: loadError, createExercise } = useExercises(userId)
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const showToast = useToast()

  if (loading) {
    return (
      <div>
        <h1>Übungen</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (loadError) {
    // A partly loaded library would look complete and quietly hide exercises.
    // This blocks the whole page, so it stays inline rather than a toast
    // that would vanish while the page is still broken.
    return (
      <div>
        <h1>Übungen</h1>
        <p role="alert">Übungen konnten nicht geladen werden.</p>
        <Link to="/training">Zurück zum Training</Link>
      </div>
    )
  }

  const filtered = exercises.filter((exercise) => exercise.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <h1>Übungen</h1>
      <label>
        Suche
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul role="list" className="space-y-4">
        {filtered.map((exercise) => (
          <li key={exercise.id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>{exercise.name}</div>
          </li>
        ))}
      </ul>
      <button type="button" className={buttonPrimaryClass} onClick={() => setDialogOpen(true)}>
        Eigene Übung anlegen
      </button>
      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the form only while open forces a fresh instance (blank
          fields) each time it opens, instead of showing the last attempt's
          leftover values on reopen. */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        {dialogOpen && (
          <NewExerciseForm
            onSave={async (input) => {
              try {
                await createExercise(input)
              } catch {
                // A failed write on an otherwise valid form: not a validation
                // problem, so it goes to a toast, not the form's inline error —
                // the dialog stays open exactly as the old inline form did.
                showToast('Speichern fehlgeschlagen.', 'error')
                return
              }
              setDialogOpen(false)
            }}
            onCancel={() => setDialogOpen(false)}
          />
        )}
      </Dialog>
      <Link to="/training">Zurück zum Training</Link>
    </div>
  )
}

function NewExerciseForm({
  onSave,
  onCancel,
}: {
  onSave: (input: { name: string; kategorie: string; met_wert: number }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [kategorie, setKategorie] = useState('')
  const [metWert, setMetWert] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    // Number('') is 0, not "unset" — an empty MET field must not silently save as 0.
    const met = metWert === '' ? null : Number(metWert)
    if (name.trim() === '' || kategorie.trim() === '' || met === null || !Number.isFinite(met) || met <= 0) {
      setError('Name, Kategorie und ein MET-Wert größer als 0 sind nötig.')
      return
    }
    setSaving(true)
    setError('')
    await onSave({ name: name.trim(), kategorie: kategorie.trim(), met_wert: met })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={cardClass}>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Kategorie
          <input value={kategorie} onChange={(event) => setKategorie(event.target.value)} />
        </label>
        <label>
          MET-Wert
          <input type="number" step="any" value={metWert} onChange={(event) => setMetWert(event.target.value)} />
        </label>
      </div>
      {error !== '' && <p role="alert">{error}</p>}
      <button type="submit" className={buttonPrimaryClass} disabled={saving}>
        Speichern
      </button>
      <button type="button" className={buttonSecondaryClass} onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  )
}
```

Note: `onSave` no longer throws on a failed write (the parent now catches and toasts), so `NewExerciseForm`'s own `try/catch` around `onSave` is removed — `handleSubmit` just awaits it directly. This keeps the failed-write path from being reported twice.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/ExercisesPage.test.tsx`
Expected: PASS — all 5 tests. The two tests that click `'Eigene Übung anlegen'` now open a dialog first (already covered since the button is still the first thing clicked, and the form fields are found the same way via `getByLabelText` — `Dialog` renders its children directly, no portal, so Testing Library finds them without extra setup).

- [ ] **Step 5: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/pages/ExercisesPage.tsx src/pages/ExercisesPage.test.tsx
git commit -m "feat: Uebungsliste als Karten, eigene Uebung ueber Dialog anlegen"
```

---

## Task 5: TrainingPlanEditPage

**Files:**
- Modify: `src/pages/TrainingPlanEditPage.tsx`
- Modify: `src/pages/TrainingPlanEditPage.test.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass`; `Dialog`; `useToast`; `renderWithProviders`

Jeder Tag und jede Übungszeile eines Tages wird eine Karte. Die inline Übungssuche wird ein Dialog (Auslöser: „Übung hinzufügen" je Tag). Alle CRUD-Fehler (Verschieben/Hinzufügen/Speichern/Entfernen/Tag-hinzufügen) werden Toasts; die Tagesnamen-Validierung bleibt inline.

- [ ] **Step 1: Update the test file's render call and the exercise-add flow**

In `src/pages/TrainingPlanEditPage.test.tsx`, replace:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TrainingPlanEditPage from './TrainingPlanEditPage'
```
with:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import TrainingPlanEditPage from './TrainingPlanEditPage'
import { renderWithProviders } from '../test-render'
```

Replace:
```ts
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/training/plans/p1']}>
      <Routes>
        <Route path="/training/plans/:planId" element={<TrainingPlanEditPage />} />
      </Routes>
    </MemoryRouter>,
  )
}
```
with:
```ts
function renderPage() {
  return renderWithProviders(<TrainingPlanEditPage />, {
    route: '/training/plans/p1',
    path: '/training/plans/:planId',
  })
}
```

The exercise-search test now needs an extra click to open the dialog first. Replace:
```ts
  it('adds an exercise to a day via inline search', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({
      exercises: [exercise, { id: 'ex2', name: 'Kniebeuge' }],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.change(screen.getByLabelText('Übung suchen'), { target: { value: 'Kniebeuge' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kniebeuge hinzufügen' }))

    await waitFor(() => expect(result.addExerciseToDay).toHaveBeenCalledWith('d1', 'ex2'))
  })
```
with:
```ts
  it('adds an exercise to a day via a picker dialog', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({
      exercises: [exercise, { id: 'ex2', name: 'Kniebeuge' }],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))
    fireEvent.change(screen.getByLabelText('Übung suchen'), { target: { value: 'Kniebeuge' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kniebeuge hinzufügen' }))

    await waitFor(() => expect(result.addExerciseToDay).toHaveBeenCalledWith('d1', 'ex2'))
    // The dialog closes itself once an exercise is picked.
    expect(screen.queryByLabelText('Übung suchen')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/TrainingPlanEditPage.test.tsx`
Expected: FAIL — `'adds an exercise to a day via a picker dialog'` fails (`getByRole('button', { name: 'Übung hinzufügen' })` not found yet), all other tests still PASS (render-helper swap alone is behavior-neutral for them).

- [ ] **Step 3: Write the implementation**

In `src/pages/TrainingPlanEditPage.tsx`, add the imports:

```ts
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import { useToast } from '../components/ToastProvider'
```

Replace the `PlanEditor` function's error handling and day-add form:

```tsx
function PlanEditor({ userId, planId }: { userId: string; planId: string }) {
  const {
    plan,
    days,
    loading,
    addDay,
    moveDay,
    addExerciseToDay,
    updateDayExercise,
    removeDayExercise,
    moveDayExercise,
  } = useWorkoutPlan(planId)
  const { exercises } = useExercises(userId)
  const [newDayName, setNewDayName] = useState('')
  const [dayNameError, setDayNameError] = useState('')
  const showToast = useToast()

  if (loading) {
    return (
      <div>
        <h1>Plan bearbeiten</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div>
        <h1>Plan bearbeiten</h1>
        <p role="alert">Diesen Plan gibt es nicht mehr.</p>
        <Link to="/training/plans">Zurück zu meinen Plänen</Link>
      </div>
    )
  }

  // The hook rejects on a failed write; without this the rejection would go
  // unhandled and the user would see nothing at all.
  async function run(action: () => Promise<void>, message: string) {
    try {
      await action()
    } catch {
      showToast(message, 'error')
    }
  }

  return (
    <div>
      <h1>{plan.name}</h1>
      {days.map((day, index) => (
        <DayBlock
          key={day.id}
          day={day}
          exercises={exercises}
          canMoveUp={index > 0}
          canMoveDown={index < days.length - 1}
          onMoveDay={(direction) => run(() => moveDay(day.id, direction), 'Verschieben fehlgeschlagen.')}
          onAddExercise={(exerciseId) =>
            run(() => addExerciseToDay(day.id, exerciseId), 'Übung hinzufügen fehlgeschlagen.')
          }
          onUpdateExercise={(id, patch) => run(() => updateDayExercise(id, patch), 'Speichern fehlgeschlagen.')}
          onRemoveExercise={(id) => run(() => removeDayExercise(id), 'Entfernen fehlgeschlagen.')}
          onMoveExercise={(exerciseRowId, direction) =>
            run(() => moveDayExercise(day.id, exerciseRowId, direction), 'Verschieben fehlgeschlagen.')
          }
        />
      ))}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (newDayName.trim() === '') {
            setDayNameError('Der Tag braucht einen Namen.')
            return
          }
          setDayNameError('')
          const name = newDayName.trim()
          setNewDayName('')
          void run(() => addDay(name), 'Tag hinzufügen fehlgeschlagen.')
        }}
      >
        <label>
          Neuer Tag
          <input value={newDayName} onChange={(event) => setNewDayName(event.target.value)} />
        </label>
        <button type="submit" className={buttonPrimaryClass}>
          Tag hinzufügen
        </button>
      </form>
      {dayNameError !== '' && <p role="alert">{dayNameError}</p>}
      <Link to="/training/plans">Zurück zu meinen Plänen</Link>
    </div>
  )
}
```

Replace the `DayBlock` function (day and exercise rows become cards; the inline search becomes a dialog):

```tsx
function DayBlock({
  day,
  exercises,
  canMoveUp,
  canMoveDown,
  onMoveDay,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
  onMoveExercise,
}: {
  day: WorkoutPlanDay
  exercises: { id: string; name: string }[]
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveDay: (direction: 'up' | 'down') => void
  onAddExercise: (exerciseId: string) => void
  onUpdateExercise: (id: string, patch: DayExercisePatch) => void
  onRemoveExercise: (id: string) => void
  onMoveExercise: (exerciseRowId: string, direction: 'up' | 'down') => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <section className={cardClass}>
      <h2>{day.name}</h2>
      {canMoveUp && (
        <button type="button" onClick={() => onMoveDay('up')}>
          Tag nach oben
        </button>
      )}
      {canMoveDown && (
        <button type="button" onClick={() => onMoveDay('down')}>
          Tag nach unten
        </button>
      )}
      <ul role="list" className="space-y-4">
        {day.exercises.map((row, index) => (
          <li key={row.id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>
              {row.exercise?.name}
              <TargetField
                label="Sätze"
                stored={row.ziel_saetze}
                onCommit={(value) => onUpdateExercise(row.id, { ziel_saetze: value })}
              />
              <TargetField
                label="Wiederholungen"
                stored={row.ziel_wiederholungen}
                onCommit={(value) => onUpdateExercise(row.id, { ziel_wiederholungen: value })}
              />
              <TargetField
                label="Pause (Sekunden)"
                stored={row.pausenzeit_sekunden}
                onCommit={(value) => onUpdateExercise(row.id, { pausenzeit_sekunden: value })}
              />
              {index > 0 && (
                <button type="button" onClick={() => onMoveExercise(row.id, 'up')}>
                  Nach oben
                </button>
              )}
              {index < day.exercises.length - 1 && (
                <button type="button" onClick={() => onMoveExercise(row.id, 'down')}>
                  Nach unten
                </button>
              )}
              <button type="button" className={buttonSecondaryClass} onClick={() => onRemoveExercise(row.id)}>
                Entfernen
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className={buttonPrimaryClass} onClick={() => setPickerOpen(true)}>
        Übung hinzufügen
      </button>
      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the picker only while open resets the search field each
          time it opens, instead of keeping the last search around. */}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)}>
        {pickerOpen && (
          <ExercisePicker
            exercises={exercises}
            alreadyAdded={day.exercises.map((row) => row.exercise_id)}
            onPick={(exerciseId) => {
              onAddExercise(exerciseId)
              setPickerOpen(false)
            }}
          />
        )}
      </Dialog>
    </section>
  )
}

function ExercisePicker({
  exercises,
  alreadyAdded,
  onPick,
}: {
  exercises: { id: string; name: string }[]
  alreadyAdded: string[]
  onPick: (exerciseId: string) => void
}) {
  const [query, setQuery] = useState('')
  // Already-added exercises are filtered out rather than silently rejected by
  // the hook's duplicate guard, which would look like a dead button.
  const matches =
    query === ''
      ? []
      : exercises.filter(
          (exercise) =>
            exercise.name.toLowerCase().includes(query.toLowerCase()) && !alreadyAdded.includes(exercise.id),
        )

  return (
    <div className={cardClass}>
      <label>
        Übung suchen
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul role="list">
        {matches.map((exercise) => (
          <li key={exercise.id}>
            {exercise.name}
            <button type="button" onClick={() => onPick(exercise.id)}>
              {`${exercise.name} hinzufügen`}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

`TargetField` stays exactly as it is — no change needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/TrainingPlanEditPage.test.tsx`
Expected: PASS — all 10 tests, including the rewritten dialog-picker test.

- [ ] **Step 5: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/pages/TrainingPlanEditPage.tsx src/pages/TrainingPlanEditPage.test.tsx
git commit -m "feat: Plan-Editor mit Karten und Uebungssuche als Dialog"
```

---

## Task 6: WorkoutSessionPage (Live-Modus, Log-Screen-Muster)

**Files:**
- Modify: `src/pages/WorkoutSessionPage.tsx`
- Modify: `src/pages/WorkoutSessionPage.test.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonPrimaryClass`; `Chip` (default export, `{active: boolean} & ButtonHTMLAttributes`) aus `src/components/Chip.tsx`; `useToast`; `renderWithProviders`

Das ist die Seite, die der Spec-Satz explizit meint: „Kategorie-Kontext oben, Kartenfelder darunter, breiter CTA-Button unten für 'Satz abschließen'". Die Übungsliste bekommt ebenfalls Karten (Spec: „Übungen als Karten"). Die RIR-Auswahl (sechs sich gegenseitig ausschließende Werte) ist exakt Chips Anwendungsfall.

- [ ] **Step 1: Update the test file's render call**

In `src/pages/WorkoutSessionPage.test.tsx`, replace:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import WorkoutSessionPage from './WorkoutSessionPage'
```
with:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import WorkoutSessionPage from './WorkoutSessionPage'
import { renderWithProviders } from '../test-render'
```

Replace:
```ts
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/training/session/s1']}>
      <Routes>
        <Route path="/training/session/:sessionId" element={<WorkoutSessionPage />} />
      </Routes>
    </MemoryRouter>,
  )
}
```
with:
```ts
function renderPage() {
  return renderWithProviders(<WorkoutSessionPage />, {
    route: '/training/session/s1',
    path: '/training/session/:sessionId',
  })
}
```

No other test changes are needed: the RIR assertions already use `getByRole('button', { name: '2' })` / `toHaveAttribute('aria-pressed', ...)`, which is exactly what `Chip` renders (a `<button>` with `aria-pressed` and its children as the accessible name) — swapping the element for `Chip` keeps every existing assertion valid unchanged. The two `screen.getByRole('alert')` assertions (failed set, failed session-not-found) also keep working: the first now comes from a toast, the second is unrelated (an inline "gibt es nicht mehr" message, untouched by this task).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/WorkoutSessionPage.test.tsx`
Expected: PASS still — the render-helper swap is behavior-neutral before Step 3.

- [ ] **Step 3: Write the implementation**

In `src/pages/WorkoutSessionPage.tsx`, add the imports:

```ts
import { cardClass, buttonPrimaryClass } from '../lib/ui-classes'
import Chip from '../components/Chip'
import { useToast } from '../components/ToastProvider'
```

Replace the `LiveSession` function's error state and render:

```tsx
function LiveSession({ userId, sessionId }: { userId: string; sessionId: string }) {
  const { profile, loading: profileLoading } = useProfile(userId)
  const { session, exercises, sets, loading, logSet, completeSession } = useWorkoutSession(sessionId)
  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null)
  const [pause, setPause] = useState<{ until: number; sekunden: number } | null>(null)
  const showToast = useToast()
  const navigate = useNavigate()

  // Warm-ups are logged like any other set but count for nothing: not against
  // the target, and not in the volume charts the analysis area will draw.
  const workingSetCount = (exerciseId: string) =>
    sets.filter((set) => set.exercise_id === exerciseId && !set.ist_aufwaermsatz).length

  // Both queries are independent: without waiting for the profile too, a user
  // who has a weight stored is told for a moment that they have none.
  if (loading || profileLoading) {
    return (
      <div>
        <h1>Training</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div>
        <h1>Training</h1>
        <p role="alert">Dieses Training gibt es nicht mehr.</p>
        <Link to="/training">Zurück zum Training</Link>
      </div>
    )
  }

  if (session.beendet_am !== null) {
    // Reopening a finished session (back button, bookmark) and completing it
    // again would recompute the duration from its original start and overwrite
    // the stored calories with a wildly inflated number.
    return (
      <div>
        <h1>Training</h1>
        <p role="alert">Dieses Training ist bereits abgeschlossen.</p>
        <Link to={`/training/history/${session.id}`}>Zur Trainingseinheit</Link>
        <Link to="/training">Zurück zum Training</Link>
      </div>
    )
  }

  const gewichtKg = profile?.aktuelles_gewicht ?? null

  function pauseOver() {
    setPause(null)
    // The pause ends where the next set begins: stay on this exercise while it
    // still has target sets left, otherwise open the next one.
    const current = exercises.find((entry) => entry.exercise_id === openExerciseId)
    if (!current) return
    const done = workingSetCount(current.exercise_id)
    if (targetReached(current.ziel_saetze, done)) {
      const sorted = [...exercises].sort((a, b) => a.reihenfolge - b.reihenfolge)
      const index = sorted.findIndex((entry) => entry.exercise_id === current.exercise_id)
      setOpenExerciseId(sorted[index + 1]?.exercise_id ?? null)
    }
  }

  async function complete() {
    if (gewichtKg === null) return
    try {
      await completeSession(gewichtKg)
      navigate('/training')
    } catch {
      showToast('Training konnte nicht abgeschlossen werden.', 'error')
    }
  }

  return (
    <div>
      <h1>Training</h1>
      {pause !== null && <PauseTimer until={pause.until} sekunden={pause.sekunden} onDone={pauseOver} />}
      <ul role="list" className="space-y-4">
        {exercises.map((entry) => (
          <li key={entry.exercise_id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>
              <button type="button" onClick={() => setOpenExerciseId(entry.exercise_id)}>
                {entry.name}
              </button>
              {openExerciseId === entry.exercise_id && (
                <SetForm
                  exercise={entry}
                  completedCount={workingSetCount(entry.exercise_id)}
                  onLog={async (values) => {
                    // satz_nummer stays a running order over every set of the
                    // exercise; only the displayed counting skips warm-ups.
                    const satzNummer =
                      sets.filter((set) => set.exercise_id === entry.exercise_id).length + 1
                    try {
                      await logSet(entry.exercise_id, satzNummer, values)
                    } catch {
                      // No pause on a set that was never stored — it would suggest it counted.
                      showToast('Satz konnte nicht gespeichert werden.', 'error')
                      return false
                    }
                    if (entry.pausenzeit_sekunden) {
                      setPause({
                        until: Date.now() + entry.pausenzeit_sekunden * 1000,
                        sekunden: entry.pausenzeit_sekunden,
                      })
                    }
                    return true
                  }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
      <p>{gewichtKg === null ? '—' : `${gewichtKg} kg`}</p>
      {gewichtKg === null && <p>Ohne Gewicht im Profil lässt sich der Verbrauch nicht berechnen.</p>}
      <button type="button" className={buttonPrimaryClass} disabled={gewichtKg === null} onClick={complete}>
        Training abschließen
      </button>
    </div>
  )
}
```

Replace the `SetForm` function (Kartenfelder + Chip-Reihe + breiter CTA-Button — the Log-Screen pattern):

```tsx
function SetForm({
  exercise,
  completedCount,
  onLog,
}: {
  exercise: SessionExercise
  completedCount: number
  onLog: (values: SetValues) => Promise<boolean>
}) {
  const [gewicht, setGewicht] = useState('')
  const [wiederholungen, setWiederholungen] = useState('')
  const [rir, setRir] = useState<number | null>(null)
  const [istAufwaermsatz, setIstAufwaermsatz] = useState(false)

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        // Number('') is 0, not "unset" — an empty field must stay null, not become a fake 0.
        const gewichtValue = gewicht === '' ? null : Number(gewicht)
        const wiederholungenValue = wiederholungen === '' ? null : Number(wiederholungen)
        // Only clear on a stored set: wiping the fields after a failed save
        // would force the user to type everything again.
        const stored = await onLog({
          gewicht: gewichtValue,
          wiederholungen: wiederholungenValue,
          rir,
          ist_aufwaermsatz: istAufwaermsatz,
        })
        if (!stored) return
        setGewicht('')
        setWiederholungen('')
        setRir(null)
        // ponytail: reset to a working set rather than keeping the toggle on.
        // Forgetting it on silently files real sets as warm-ups, which is the
        // more expensive mistake of the two.
        setIstAufwaermsatz(false)
      }}
    >
      <div className={cardClass}>
        <p>
          {istAufwaermsatz
            ? 'Aufwärmsatz — zählt nicht zum Ziel'
            : targetReached(exercise.ziel_saetze, completedCount)
              ? 'Alle Sätze erfasst'
              : `Satz ${completedCount + 1}${exercise.ziel_saetze == null ? '' : ` von ${exercise.ziel_saetze}`}`}
        </p>
        <label>
          Gewicht (kg)
          <input value={gewicht} onChange={(event) => setGewicht(event.target.value)} />
        </label>
        <label>
          Wiederholungen
          <input value={wiederholungen} onChange={(event) => setWiederholungen(event.target.value)} />
        </label>
        <label>
          Aufwärmsatz
          <input
            type="checkbox"
            checked={istAufwaermsatz}
            onChange={(event) => setIstAufwaermsatz(event.target.checked)}
          />
        </label>
        <fieldset>
          <legend>Wie viele hättest du noch geschafft?</legend>
          {RIR_VALUES.map((value) => (
            <Chip
              key={value}
              active={rir === value}
              // Pressed rather than disabled: tapping the same value again clears
              // it, so a mistap does not stick for the rest of the session.
              onClick={() => setRir(rir === value ? null : value)}
            >
              {value === 5 ? '5+' : String(value)}
            </Chip>
          ))}
        </fieldset>
      </div>
      <button type="submit" className={buttonPrimaryClass}>
        Satz abschließen
      </button>
    </form>
  )
}
```

`PauseTimer` and the `targetReached`/`RIR_VALUES` module-level constants stay exactly as they are.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/WorkoutSessionPage.test.tsx`
Expected: PASS — all 17 tests, unchanged assertions, `Chip` satisfies every RIR-related check as-is.

- [ ] **Step 5: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/pages/WorkoutSessionPage.tsx src/pages/WorkoutSessionPage.test.tsx
git commit -m "feat: Live-Modus im Log-Screen-Muster mit Chip-Reihe fuer RIR"
```

---

## Task 7: TrainingHistoryPage

**Files:**
- Modify: `src/pages/TrainingHistoryPage.tsx`
- Modify: `src/pages/TrainingHistoryPage.test.tsx`

**Interfaces:**
- Consumes: `cardClass`; `renderWithProviders`

Keine Fehlerzustände auf dieser Seite (`useWorkoutHistory` liefert keinen `error`), deshalb kein Toast nötig — reine Karten-Umstellung.

- [ ] **Step 1: Update the test file's render call**

In `src/pages/TrainingHistoryPage.test.tsx`, replace:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
```
with:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { renderWithProviders } from '../test-render'
```

Every occurrence of:
```ts
const { default: TrainingHistoryPage } = await import('./TrainingHistoryPage')
render(<TrainingHistoryPage />, { wrapper: MemoryRouter })
```
becomes:
```ts
const { default: TrainingHistoryPage } = await import('./TrainingHistoryPage')
renderWithProviders(<TrainingHistoryPage />)
```
(three occurrences.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/TrainingHistoryPage.test.tsx`
Expected: PASS still (render-helper swap alone, no implementation change yet).

- [ ] **Step 3: Write the implementation**

In `src/pages/TrainingHistoryPage.tsx`, add the import:

```ts
import { cardClass } from '../lib/ui-classes'
```

Replace the `HistoryList` function's list rendering:

```tsx
function HistoryList({ userId }: { userId: string }) {
  const { sessions, loading } = useWorkoutHistory(userId)

  if (loading) {
    return (
      <div>
        <h1>Trainingshistorie</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Trainingshistorie</h1>
      {sessions.length === 0 ? (
        <p>Noch keine Trainings aufgezeichnet.</p>
      ) : (
        <ul role="list" className="space-y-4">
          {sessions.map((entry) => (
            <li key={entry.id} className="block border-b-0">
              <div className={`${cardClass} w-full`}>
                <Link to={`/training/history/${entry.id}`}>
                  {`${entry.plan_name ?? '—'} – ${entry.tag_name ?? '—'} – ${new Date(
                    entry.gestartet_am,
                  ).toLocaleDateString('de-DE')} – ${
                    // An unfinished session has no calorie result; "0 kcal" would read as a measurement.
                    entry.gesamt_kalorien == null ? 'nicht beendet' : `${Math.round(entry.gesamt_kalorien)} kcal`
                  }`}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link to="/training">Zurück zum Training</Link>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/TrainingHistoryPage.test.tsx`
Expected: PASS — all 3 tests.

- [ ] **Step 5: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/pages/TrainingHistoryPage.tsx src/pages/TrainingHistoryPage.test.tsx
git commit -m "feat: Trainingshistorie als Karten-Liste"
```

---

## Task 8: TrainingHistoryDetailPage

**Files:**
- Modify: `src/pages/TrainingHistoryDetailPage.tsx`
- Modify: `src/pages/TrainingHistoryDetailPage.test.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonSecondaryClass`; `useToast`; `renderWithProviders`

Satz-Zeilen werden Karten; „Session löschen" wird `buttonSecondaryClass` (löschende Aktion, kein Haupt-CTA); Speichern- und Löschen-Fehler werden Toasts.

- [ ] **Step 1: Update the test file's render call**

In `src/pages/TrainingHistoryDetailPage.test.tsx`, replace:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TrainingHistoryDetailPage from './TrainingHistoryDetailPage'
```
with:
```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import TrainingHistoryDetailPage from './TrainingHistoryDetailPage'
import { renderWithProviders } from '../test-render'
```

Replace:
```ts
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/training/history/s1']}>
      <Routes>
        <Route path="/training/history/:sessionId" element={<TrainingHistoryDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}
```
with:
```ts
function renderPage() {
  return renderWithProviders(<TrainingHistoryDetailPage />, {
    route: '/training/history/s1',
    path: '/training/history/:sessionId',
  })
}
```

The two existing `screen.getByRole('alert')` assertions (`'reports a failed delete instead of navigating away'`, and the session-not-found case) need no change — the delete failure now comes from a toast, the not-found message is untouched inline text.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/TrainingHistoryDetailPage.test.tsx`
Expected: PASS still (render-helper swap alone, behavior-neutral before Step 3).

- [ ] **Step 3: Write the implementation**

In `src/pages/TrainingHistoryDetailPage.tsx`, add the imports:

```ts
import { cardClass, buttonSecondaryClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
```

Replace the `Detail` function:

```tsx
function Detail({ sessionId }: { sessionId: string }) {
  const { session, sets, loading, updateSet, deleteSession } = useWorkoutSession(sessionId)
  const showToast = useToast()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div>
        <h1>Trainingseinheit</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div>
        <h1>Trainingseinheit</h1>
        <p role="alert">Diese Trainingseinheit gibt es nicht mehr.</p>
        <Link to="/training/history">Zurück zur Historie</Link>
      </div>
    )
  }

  async function run(action: () => Promise<void>, message: string) {
    try {
      await action()
    } catch {
      showToast(message, 'error')
    }
  }

  return (
    <div>
      <h1>Trainingseinheit</h1>
      {/* An unfinished session has no calorie result; "0 kcal" would read as a measurement. */}
      <p>{session.gesamt_kalorien == null ? 'nicht beendet' : `${Math.round(session.gesamt_kalorien)} kcal`}</p>
      <ul role="list" className="space-y-4">
        {sets.map((set) => (
          <li key={set.id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>
              {set.exercise?.name}
              <SetField
                label="Gewicht (kg)"
                stored={set.gewicht}
                onCommit={(value) => run(() => updateSet(set.id, { gewicht: value }), 'Speichern fehlgeschlagen.')}
              />
              <SetField
                label="Wiederholungen"
                stored={set.wiederholungen}
                integer
                onCommit={(value) =>
                  run(() => updateSet(set.id, { wiederholungen: value }), 'Speichern fehlgeschlagen.')
                }
              />
              <SetField
                label="RIR"
                stored={set.rir}
                max={5}
                integer
                onCommit={(value) => run(() => updateSet(set.id, { rir: value }), 'Speichern fehlgeschlagen.')}
              />
              <label>
                Aufwärmsatz
                <input
                  type="checkbox"
                  checked={set.ist_aufwaermsatz}
                  // Written straight through: there is nothing to type, so the
                  // blur-commit dance the number fields need buys nothing here.
                  onChange={(event) =>
                    run(
                      () => updateSet(set.id, { ist_aufwaermsatz: event.target.checked }),
                      'Speichern fehlgeschlagen.',
                    )
                  }
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={buttonSecondaryClass}
        onClick={async () => {
          try {
            await deleteSession()
          } catch {
            showToast('Löschen fehlgeschlagen.', 'error')
            return
          }
          navigate('/training/history')
        }}
      >
        Session löschen
      </button>
      <Link to="/training/history">Zurück zur Historie</Link>
    </div>
  )
}
```

`SetField` stays exactly as it is — no change needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/TrainingHistoryDetailPage.test.tsx`
Expected: PASS — all 12 tests.

- [ ] **Step 5: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/pages/TrainingHistoryDetailPage.tsx src/pages/TrainingHistoryDetailPage.test.tsx
git commit -m "feat: Historien-Detail als Karten, Speichern/Loeschen ueber Toast"
```

---

## Task 9: Abschluss — Gesamtlauf, Bundle, manueller Browser-Check, Doku

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

Erwartung notieren: keine der sieben Seiten hat eine neue Abhängigkeit gezogen, die Zahl sollte sich gegenüber Plan 1s Abschluss kaum bewegen. Die tatsächliche Zahl (Entry-Chunk, CSS-Datei) wörtlich in den Abschlussbericht übernehmen — inklusive der Erinnerung, dass ein Worktree ohne `.env` einen nicht vergleichbaren, zu kleinen Wert liefert (siehe Phase 5 Plan 2b/2c, Phase 6 Plan 1).

- [ ] **Step 2: Domänenmodell prüfen**

`docs/domaenenmodell.md` beschreibt Datenbank- und Domänenstruktur. Dieser Plan ändert keine Tabelle, keine Spalte, keine Abfrage-Form — nur Markup und Klassen. Nur prüfen, dass das stimmt, keine Änderung vornehmen.

- [ ] **Step 3: Manueller Browser-Check**

**Warum dieser Schritt zwingend ist:** jeder Test in diesem Plan prüft Verhalten (Klick ruft die richtige Funktion, ein Fehler erscheint als `role="alert"`) oder Klassenname-Strings — keiner rendert echtes Layout. Plan 1s Whole-Branch-Review fand genau deshalb einen Cascade-Layer-Fehler und einen Dialog-Zentrierungs-Fehler, die 724 grüne Tests nicht sahen. Dieser Schritt ist die einzige Prüfung, die eine echte Optik-Regression fängt.

`npm run dev` starten (worktree ohne `.env`: eine temporäre, nicht committete `.env` mit Platzhalter-Werten reicht für einen rein visuellen Check, siehe Vorgehen aus Plan 1s Abschluss-Review). Durchklicken und für jeden Punkt bestätigen:

1. `/training`: „Training starten" ist ein voller lila Button ohne Rahmen und ohne Randabstand-Lücke.
2. `/training/plans`: jeder Plan erscheint als eigene abgerundete Karte ohne sichtbare Trennlinie darunter; „Anlegen" ist der lila Hauptbutton, „Aktivieren"/„Löschen" sind unauffällige Sekundärbuttons.
3. `/training/plans/:id`: jeder Tag und jede Übungszeile ist eine Karte; „Übung hinzufügen" öffnet einen zentrierten Dialog mit verschwommenem Hintergrund, nicht oben links angepinnt (die exakte Regression aus Plan 1 — hier gezielt gegenprüfen).
4. `/training/exercises`: Übungen erscheinen als Karten; „Eigene Übung anlegen" öffnet einen Dialog, kein Inline-Formular mehr.
5. Eine Live-Session starten: der Satz-Eintrag ist eine Karte, die RIR-Auswahl ist eine Reihe runder Pillen (aktiv = lila gefüllt, inaktiv = gedeckt), „Satz abschließen" ist ein voller lila Button unten.
6. `/training/history` und die Detailseite: Session- bzw. Satz-Zeilen erscheinen als Karten.
7. Eine absichtlich fehlschlagende Aktion auslösen (z. B. Netzwerk kurz trennen und „Löschen" klicken): eine Toast-Meldung erscheint oben, kein `<p>` mitten in der Seite, und sie verschwindet nach wenigen Sekunden von selbst.
8. Konsole ohne Fehler oder Warnungen auf jeder besuchten Seite.

Alle acht Punkte im Abschlussbericht festhalten (bestätigt oder mit Fund + Fix, falls einer auftritt — dann denselben Ablauf wie in Plan 1 anwenden: Fund ins Ledger, ein Fix, ein Scoped-Re-Review, erneut visuell bestätigen).

- [ ] **Step 4: Vollständige Prüfung**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
npm run build
```

Erwartet: Lint ohne Fehler und Warnungen, keine Typfehler, alle Tests grün, Build erfolgreich.

- [ ] **Step 5: Status in CLAUDE.md nachziehen**

Im Abschnitt „Phase 6" festhalten: Plan 2a (Training) umgesetzt — sieben Seiten auf Karten/Buttons/Chip/Toast/Dialog umgestellt, Testzahl und Bundle-Zahl aus Schritt 1 und 4, Ergebnis des manuellen Browser-Checks aus Schritt 3. Offen: Plan 2b (Ernährung), 2c (Körper), 2d (Analyse-Seiten).

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Status fuer Phase 6 Plan 2a nachziehen"
```

---

## Self-Review

**Spec-Abdeckung.** „Pläne... als Karten" → Task 3. „...und Übungen als Karten" → Task 4 (Übungsliste), Task 5 (Übungszeilen im Plan-Editor), Task 6 (Übungsliste im Live-Modus). „Satz-Eintrag im Live-Modus übernimmt das Log-Screen-Muster (Kategorie-Kontext oben, Kartenfelder darunter, breiter CTA-Button unten für 'Satz abschließen')" → Task 6, `SetForm`. Karten-Bausteine, Buttons, Chip, Toast, Dialog aus Plan 1 werden in allen sieben Seiten verbraucht (Task 2–8). Home und die drei Analyse-Seiten bleiben unangetastet, wie im Vorgänger-Abschnitt „Nicht in diesem Spec" und in CLAUDE.md festgehalten.

**Typkonsistenz.** `renderWithProviders(ui, { route?, path? })` in Task 1 wird in Task 2–8 identisch aufgerufen — geprüft gegen jede Aufrufstelle. `Dialog`s Props (`open`, `onClose`, `children`) und `Chip`s Props (`active`, Rest wird durchgereicht) stimmen mit den tatsächlichen Exporten in `src/components/Dialog.tsx` und `src/components/Chip.tsx` überein (gegen die echten Dateien gelesen, nicht gegen Plan 1s Text — dessen Text hatte zwei vom Review gefundene Fehler).

**Karten-in-Liste-Muster.** Durchgängig `<li className="block border-b-0"><div className={`${cardClass} w-full`}>` in Task 3, 5 (beide Ebenen), 6, 7, 8 — nie `cardClass` direkt auf `<li>`, aus dem in der Rationale erklärten Grund. `TrainingPlanEditPage`s Tag-Ebene (`<section className={cardClass}>`) ist die eine Ausnahme, weil `section` von keiner Übergangsregel in `index.css` betroffen ist (nur `button`, `input`, `select`, `ul`, `li`, `a`, `h1`, `h2`, `p`, `header`, `main`, `label` haben Regeln — `section` nicht), also kein Bleed-through-Risiko.

**Platzhalter-Durchgang.** Kein „TBD", kein „analog zu Task N" ohne ausgeschriebenen Code — jede Task-Datei zeigt entweder die volle neue Funktion oder einen exakten Vorher/Nachher-Ersetzungsblock.

**Toast-vs-Inline-Regel durchgängig geprüft:** Task 2 (Start-Fehler → Toast), Task 3 (Namensvalidierung inline, Aktions-Fehler → Toast), Task 4 (Ladefehler inline, Feld-Validierung inline, Speichern-Fehler → Toast — deckungsgleich mit `ToastProvider.tsx`s eigenem Beispiel), Task 5 (Tagesnamen-Validierung inline, alle CRUD-Fehler → Toast), Task 6 (Satz-/Abschluss-Fehler → Toast, keine Validierung auf dieser Seite), Task 8 (Speichern/Löschen → Toast, kein Validierungsfall auf dieser Seite). Kein Fall, in dem ein permanenter Ladefehler fälschlich zum Toast würde.

**Dialog-mit-Formular-Muster:** `Dialog` lässt seine Kinder immer im DOM (siehe `src/components/Dialog.tsx` — nur `showModal()`/`close()` steuern die Sichtbarkeit, kein Unmount). Ein Formular mit eigenem `useState` (Name/Kategorie/MET-Wert in Task 4, die Suche in Task 5) würde beim erneuten Öffnen sonst die Werte des letzten Versuchs zeigen — und in Task 5s Test hätte `queryByLabelText('Übung suchen')` das Feld nach dem Schließen sogar weiterhin gefunden, da label-basierte Queries anders als `getByRole` nicht auf CSS-Sichtbarkeit prüfen; das wäre ein echter Testfehler gewesen, kein bloßes Kosmetikproblem. Deshalb rendern beide Tasks den Formular-Inhalt bedingt (`{dialogOpen && <NewExerciseForm .../>}` bzw. `{pickerOpen && <ExercisePicker .../>}`), nicht das `Dialog`-Element selbst bedingt — das bleibt immer gemountet, damit `showModal()`/`close()` funktionieren. Gilt als Muster für jeden künftigen Bereichs-Plan, der ein Formular in einen Dialog legt.

**Bewusst offen gelassen für diesen Plan:** kein Bestätigungs-Dialog vor „Löschen"/„Session löschen" — das widerspräche der bisherigen, zweimal explizit dokumentierten Projekt-Konvention „kein Rückfragen-Dialog vor dem Löschen" (Phase 3, Phase 4). `Dialog` wird stattdessen für die beiden tatsächlich neuen Sheet-artigen Abläufe verwendet (Übungssuche, eigene Übung anlegen), die keine bestehende Konvention umkehren. Falls das gewünschte Verhalten ist, gehört das in einen eigenen, bewusst entschiedenen Schritt, nicht stillschweigend in dieses Plan.

# Redesign Phase 2c – Übungskatalog und Übungsauswahl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Chip-Filterwand klappt auf dem Handy hinter einen „Filter“-Trigger ein, der Katalog bekommt Suche oben, Unterzeilen und einen Leerzustand, und beide Listen erscheinen gestaffelt.

**Architecture:** Das Verhalten sitzt in `ExerciseFilterChips` (Props unverändert), daher bekommen Katalog und Picker es automatisch. Die Unterzeile wird als reine Funktion `exerciseCaption` geteilt. Der Listen-Reveal ist eine CSS-Keyframe-Klasse mit Inline-`animationDelay`, kein GSAP.

**Tech Stack:** React + TypeScript, Tailwind 4, Vitest + RTL.

**Spec:** `docs/superpowers/specs/2026-10-13-uebungskatalog-2c-design.md`

## Global Constraints

- Props von `ExerciseFilterChips` bleiben unverändert.
- Breakpoint `md` (768 px): darunter Panel standardmäßig zu, ab `md` immer offen und kein Trigger — rein per CSS-Klassen (`md:hidden`, `hidden md:block`), kein JS-Media-Query, **nicht** das HTML-Attribut `hidden` (Tailwind 4 erzwingt es mit `!important`).
- Eine Chip-Auswahl klappt das Panel nicht zu. Kein animiertes Auf-/Zuklappen.
- Reveal: Klasse `list-in`, 250 ms, Opacity + 4 px, `animationDelay = Math.min(index, 12) * 30` ms, unter `prefers-reduced-motion: reduce` `animation: none`. Kein GSAP.
- Rohes `<button>` ist per ESLint verboten — `Pressable`/`Chip` nutzen.
- Deutsche UI-Texte, Du-Form. Working Copy nutzt CRLF.
- jsdom wertet Tailwind-Klassen nicht aus: Bestehende Tests, die Chips anklicken, laufen weiter, ohne den Filter zu öffnen. Sichtbarkeit wird über Klassen geprüft.

## Review Focus

- Nur Geräte und keine Muskelgruppen (oder umgekehrt) → Trigger und die eine Reihe erscheinen, keine leere Reihe (Test in Task 2).
- Zwei aktive Filter → „Filter (2)“ und zwei Entfernen-Chips, jeder setzt nur seinen eigenen Filter auf `null` (Test in Task 2).
- Aktiver Filter bei zugeklapptem Panel → der Entfernen-Chip bleibt sichtbar (Test in Task 2: Entfernen-Chip trägt kein `hidden`).
- Suche ohne Treffer im Katalog → „Keine Übungen gefunden.“ statt leerer Fläche (Test in Task 3).
- Übung ohne Gerät und ohne Muskelgruppe → keine leere Unterzeile (Test in Task 1).

---

### Task 1: `exerciseCaption` + Listen-Reveal-Klasse

**Files:**
- Create: `src/lib/exercise-caption.ts`
- Create: `src/lib/exercise-caption.test.ts`
- Modify: `src/components/ExercisePicker.tsx` (Caption-Logik durch Aufruf ersetzen)
- Modify: `src/index.css` (Keyframe `list-in`)

**Interfaces:**
- Produces: `export function exerciseCaption(exercise: { equipment: string | null; muskelgruppen_primaer: string[] | null }): string` und `export function revealDelay(index: number): string` (liefert z. B. `'90ms'`), beide aus `src/lib/exercise-caption.ts`; CSS-Klasse `list-in`.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```ts
import { describe, expect, it } from 'vitest'
import { exerciseCaption, revealDelay } from './exercise-caption'

describe('exerciseCaption', () => {
  it('joins equipment and first primary muscle group', () => {
    expect(exerciseCaption({ equipment: 'barbell', muskelgruppen_primaer: ['chest', 'triceps'] })).toBe('Langhantel · Brust')
  })
  it('shows only what is there', () => {
    expect(exerciseCaption({ equipment: 'barbell', muskelgruppen_primaer: null })).toBe('Langhantel')
    expect(exerciseCaption({ equipment: null, muskelgruppen_primaer: ['chest'] })).toBe('Brust')
  })
  it('is empty when nothing is known', () => {
    expect(exerciseCaption({ equipment: null, muskelgruppen_primaer: [] })).toBe('')
  })
})

describe('revealDelay', () => {
  it('staggers by 30ms and caps at index 12', () => {
    expect(revealDelay(0)).toBe('0ms')
    expect(revealDelay(3)).toBe('90ms')
    expect(revealDelay(500)).toBe('360ms')
  })
})
```

- [ ] **Step 2: Laufen lassen, muss fehlschlagen**

Run: `npx vitest run src/lib/exercise-caption.test.ts`
Expected: FAIL (Modul fehlt).

- [ ] **Step 3: Implementieren**

`src/lib/exercise-caption.ts`:

```ts
import { equipmentLabel } from './equipment-labels'
import { muskelgruppeLabel } from './muscle-group-labels'

/** "Gerät · erste primäre Muskelgruppe" — Unterzeile in Katalog und Übungsauswahl. */
export function exerciseCaption(exercise: { equipment: string | null; muskelgruppen_primaer: string[] | null }) {
  return [
    exercise.equipment ? equipmentLabel(exercise.equipment) : null,
    exercise.muskelgruppen_primaer?.[0] ? muskelgruppeLabel(exercise.muskelgruppen_primaer[0]) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ')
}

/** Staffelung für .list-in — gedeckelt, damit lange Listen nicht sekundenlang nachlaufen. */
export function revealDelay(index: number) {
  return `${Math.min(index, 12) * 30}ms`
}
```

`ExercisePicker.tsx`: den `caption`-Block (`[ exercise.equipment ? … ].filter(…).join(' · ')`) durch `const caption = exerciseCaption(exercise)` ersetzen, Import ergänzen, nicht mehr genutzte Imports (`equipmentLabel`/`muskelgruppeLabel`) nur entfernen, wenn sie sonst nirgends in der Datei vorkommen. Am `<li>` jeder Übung: `className="list-in"` und `style={{ animationDelay: revealDelay(index) }}` — dafür im `group.exercises.map` den Index mitnehmen (`(exercise, index) =>`).

`src/index.css` (am Ende):

```css
@keyframes list-in {
  from { opacity: 0; transform: translateY(4px); }
}
.list-in { animation: list-in 250ms ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .list-in { animation: none; }
}
```

- [ ] **Step 4: Tests**

Run: `npx vitest run src/lib/exercise-caption.test.ts src/components/ExercisePicker.test.tsx src/pages/TrainingPlanEditPage.test.tsx; npm run lint; npx tsc -b --noEmit`
Expected: PASS, sauber.

- [ ] **Step 5: Commit**

```bash
git add src/lib/exercise-caption.ts src/lib/exercise-caption.test.ts src/components/ExercisePicker.tsx src/index.css
git commit -m "feat: shared exercise caption and staggered list reveal"
```

---

### Task 2: `ExerciseFilterChips` einklappbar

**Files:**
- Modify: `src/components/ExerciseFilterChips.tsx`
- Test: `src/components/ExerciseFilterChips.test.tsx`

**Interfaces:**
- Props unverändert: `muskelgruppen, muskelgruppe, onMuskelgruppeChange, equipmentWerte, equipment, onEquipmentChange`.

- [ ] **Step 1: Fehlschlagende Tests ergänzen** (bestehende Tests bleiben; sie finden die Chips weiter, da jsdom `hidden` nicht auswertet)

```tsx
function renderChips(overrides: Partial<React.ComponentProps<typeof ExerciseFilterChips>> = {}) {
  const props = {
    muskelgruppen: ['chest', 'triceps'],
    muskelgruppe: null,
    onMuskelgruppeChange: vi.fn(),
    equipmentWerte: ['barbell'],
    equipment: null,
    onEquipmentChange: vi.fn(),
    ...overrides,
  }
  render(<ExerciseFilterChips {...props} />)
  return props
}

it('starts collapsed below md and toggles the panel', () => {
  renderChips()
  const trigger = screen.getByRole('button', { name: 'Filter' })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  const panel = document.getElementById(trigger.getAttribute('aria-controls')!)!
  expect(panel).toHaveClass('hidden', 'md:block')
  expect(panel).not.toHaveClass('block')
  fireEvent.click(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(panel).toHaveClass('block')
  fireEvent.click(trigger)
  expect(panel).not.toHaveClass('block')
})

it('keeps the panel open after picking a chip', () => {
  renderChips()
  const trigger = screen.getByRole('button', { name: 'Filter' })
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('button', { name: 'Brust' }))
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
})

it('counts active filters and offers a remove chip per filter, visible while collapsed', () => {
  const props = renderChips({ muskelgruppe: 'chest', equipment: 'barbell' })
  expect(screen.getByRole('button', { name: 'Filter (2)' })).toHaveClass('md:hidden')
  const entferneBrust = screen.getByRole('button', { name: 'Filter Brust entfernen' })
  expect(entferneBrust.closest('.hidden')).toBeNull()
  fireEvent.click(entferneBrust)
  expect(props.onMuskelgruppeChange).toHaveBeenCalledWith(null)
  expect(props.onEquipmentChange).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Filter Langhantel entfernen' }))
  expect(props.onEquipmentChange).toHaveBeenCalledWith(null)
})

it('renders only the row that has values', () => {
  renderChips({ muskelgruppen: [] })
  expect(screen.queryByRole('button', { name: 'Alle' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Alle Geräte' })).toBeInTheDocument()
})

it('renders nothing without any values', () => {
  const { container } = render(
    <ExerciseFilterChips
      muskelgruppen={[]}
      muskelgruppe={null}
      onMuskelgruppeChange={vi.fn()}
      equipmentWerte={[]}
      equipment={null}
      onEquipmentChange={vi.fn()}
    />,
  )
  expect(container).toBeEmptyDOMElement()
})
```

(`renderChips` und `import type React from 'react'` bzw. `ComponentProps` aus `react` je nach vorhandenen Imports ergänzen.)

- [ ] **Step 2: Laufen lassen, muss fehlschlagen**

Run: `npx vitest run src/components/ExerciseFilterChips.test.tsx`
Expected: FAIL (kein Trigger).

- [ ] **Step 3: Implementieren**

```tsx
import { useId, useState } from 'react'
import Chip from './Chip'
import Pressable from './Pressable'
import { VitaIcon } from './icons/VitaIcon'
import { muskelgruppeLabel } from '../lib/muscle-group-labels'
import { equipmentLabel } from '../lib/equipment-labels'

export default function ExerciseFilterChips({ /* Props unverändert */ }) {
  const [offen, setOffen] = useState(false)
  const panelId = useId()

  if (muskelgruppen.length === 0 && equipmentWerte.length === 0) return null

  const aktive = [
    muskelgruppe !== null && { label: muskelgruppeLabel(muskelgruppe), entfernen: () => onMuskelgruppeChange(null) },
    equipment !== null && { label: equipmentLabel(equipment), entfernen: () => onEquipmentChange(null) },
  ].filter((eintrag): eintrag is { label: string; entfernen: () => void } => Boolean(eintrag))

  return (
    <div className="space-y-2">
      {/* Unter md eingeklappt; ab md ist das Panel immer offen und der Trigger weg (nur CSS). */}
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <Pressable
          variant="secondary"
          type="button"
          aria-expanded={offen}
          aria-controls={panelId}
          className="md:hidden"
          onClick={() => setOffen(!offen)}
        >
          {aktive.length === 0 ? 'Filter' : `Filter (${aktive.length})`}
        </Pressable>
        {aktive.map((eintrag) => (
          <Chip key={eintrag.label} active aria-label={`Filter ${eintrag.label} entfernen`} onClick={eintrag.entfernen}>
            <span className="inline-flex items-center gap-1">
              {eintrag.label}
              <VitaIcon name="close" tone="mono" size={16} />
            </span>
          </Chip>
        ))}
      </div>
      <div id={panelId} className={`space-y-2 ${offen ? 'block' : 'hidden'} md:block`}>
        {/* die beiden bestehenden Chip-Reihen unverändert hierher verschieben */}
      </div>
    </div>
  )
}
```

Hinweise: Der Hook (`useState`/`useId`) steht vor dem frühen `return null`. `Chip` akzeptiert `aria-label` über die `ButtonHTMLAttributes`; `aria-label` überschreibt dabei `aria-pressed` nicht. Falls `VitaIcon` ohne `aria-hidden` rendert, prüfen, dass der zugängliche Name trotzdem genau `Filter Brust entfernen` ist (der `aria-label` gewinnt).

- [ ] **Step 4: Tests**

Run: `npx vitest run src/components/ExerciseFilterChips.test.tsx src/pages/ExercisesPage.test.tsx src/components/ExercisePicker.test.tsx src/pages/TrainingPlanEditPage.test.tsx; npm run lint; npx tsc -b --noEmit`
Expected: PASS, sauber. Die bestehenden Seitentests klicken Chips weiter ohne vorheriges Öffnen.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExerciseFilterChips.tsx src/components/ExerciseFilterChips.test.tsx
git commit -m "feat: collapse exercise filter chips behind a trigger on mobile"
```

---

### Task 3: Katalog – Suche oben, Unterzeile, Leerzustand, Reveal

**Files:**
- Modify: `src/pages/ExercisesPage.tsx` (Render-Block Z. ~69–96)
- Test: `src/pages/ExercisesPage.test.tsx`

**Interfaces:**
- Consumes: `exerciseCaption`, `revealDelay` (Task 1), Klasse `list-in`.

- [ ] **Step 1: Fehlschlagende Tests**

In `ExercisesPage.test.tsx`, mit dem vorhandenen Render-/Mock-Setup der Datei (eine Übung mit `equipment: 'barbell'`, `muskelgruppen_primaer: ['chest']` in der Fixture vorhanden oder ergänzen):

```ts
it('puts search before the filter and shows a caption per exercise', async () => {
  // vorhandenes Setup
  const suche = await screen.findByLabelText('Suche')
  const filter = screen.getByRole('button', { name: /^Filter/ })
  expect(suche.compareDocumentPosition(filter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.getByText('Langhantel · Brust')).toBeInTheDocument()
})

it('says so when nothing matches', async () => {
  // vorhandenes Setup
  fireEvent.change(await screen.findByLabelText('Suche'), { target: { value: 'zzzz' } })
  expect(screen.getByText('Keine Übungen gefunden.')).toBeInTheDocument()
})
```

- [ ] **Step 2: Laufen lassen, muss fehlschlagen**

Run: `npx vitest run src/pages/ExercisesPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementieren**

```tsx
<h1>Übungen</h1>
<label className="relative block">
  <span className="sr-only">Suche</span>
  <VitaIcon name="search" tone="mono" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" />
  <input className={`${inputClass} pl-12`} value={query} onChange={(event) => setQuery(event.target.value)} />
</label>
<ExerciseFilterChips /* unverändert */ />
{filtered.length === 0 && <p>Keine Übungen gefunden.</p>}
<ul role="list" className="space-y-4">
  {filtered.map((exercise, index) => {
    const caption = exerciseCaption(exercise)
    return (
      <li key={exercise.id} className="list-in block border-b-0" style={{ animationDelay: revealDelay(index) }}>
        <Pressable /* wie bisher */>
          <ExerciseThumbnail bildUrl={exercise.bild_url} />
          <span className="flex-1 text-left">
            <span className="block">{exercise.name_de ?? exercise.name}</span>
            {caption !== '' && <span className="block text-sm text-text-muted">{caption}</span>}
          </span>
        </Pressable>
      </li>
    )
  })}
</ul>
```

`inputClass`, `exerciseCaption`, `revealDelay` importieren; prüfen, ob `VitaIcon` ein `className`-Prop hat (sonst das Icon in ein `<span className="pointer-events-none absolute …">` wickeln). Falls bestehende Tests das Label „Suche“ als sichtbaren Text suchen (`getByText('Suche')`), auf `getByLabelText` umstellen.

- [ ] **Step 4: Tests**

Run: `npx vitest run src/pages/ExercisesPage.test.tsx; npm run lint; npx tsc -b --noEmit`
Expected: PASS, sauber.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ExercisesPage.tsx src/pages/ExercisesPage.test.tsx
git commit -m "feat: catalog search first, exercise captions, empty state, staggered reveal"
```

---

### Task 4: Verifikation und Doku

**Files:**
- Modify: `CLAUDE.md` (Status 2c)

- [ ] **Step 1: Volllauf**

Run: `npx vitest run; npm run lint; npx tsc -b --noEmit`
Expected: alles grün (bekannte Last-Flakes `HomeChartList`/`HomeAnalysisPage` einzeln nachlaufen lassen).

- [ ] **Step 2: Browser-Check** (`playwright-cli`, falls Budget; sonst bei der Live-Verifikation nach Deploy): 390×844 `/training/exercises` — Suche + erste Zeilen ohne Scrollen sichtbar, Chips zu, Trigger öffnet; 1024 px — Chips sichtbar, kein Trigger; Übungsauswahl im Plan-Editor ebenso.

- [ ] **Step 3: CLAUDE.md-Status nachziehen und committen**

```bash
git add CLAUDE.md
git commit -m "docs: record phase 2c status"
```

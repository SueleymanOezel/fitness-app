# Phase-6-Nachschärfung Plan 1: Design-Tokens (Motion + Kontrast) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drei WCAG-AA-Kontrastfehler in den geteilten Design-Tokens beheben und echte Hover-/Press-/Fokus-Zustände auf allen interaktiven Grundbausteinen (Buttons, Chip, Bottom-Nav, Toast) ergänzen — ohne die Akzentfarbe oder die Formensprache aus dem Referenzvideo zu ändern.

**Architecture:** Ein neuer, isolierter Kontrastformel-Helfer (`src/lib/contrast.ts`) macht die WCAG-Rechnung testbar und dokumentiert, statt die Zahlen nur als Kommentar zu behaupten. Zwei Tokenänderungen in `src/index.css` (`--color-text-muted` neu, `--color-on-bright` neu) fließen über die bestehenden Tailwind-v4-`@theme`-Utilities (`text-text-muted`, `text-on-bright`) automatisch in `ui-classes.ts`, `Chip.tsx`, `ToastProvider.tsx` und `BottomNav.tsx` ein. Motion ist ausschließlich Tailwind-Utility-Klassen (`transition`, `hover:`, `active:`, `focus-visible:`, `motion-reduce:`/`motion-safe:`), keine neue Abhängigkeit, keine JS-Animationslogik.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Vitest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-06-phase6-nachschaerfung-design.md`

## Global Constraints

- `--color-accent` (`#8766ed`) bleibt exakt unverändert — nur Textfarben *auf* ihr ändern sich.
- `src/lib/analysis/chart-colors.ts` (`CHART_GRID`, `CHART_VIOLET`) wird in diesem Plan **nicht** angefasst.
- Motion nur über Tailwind-Utility-Klassen, keine neue npm-Abhängigkeit.
- Hover/Active/Focus-States nur auf echt interaktiven Elementen (Buttons, Chip, Nav-Links) — keine rein informativen Karten.
- `prefers-reduced-motion`: animierte Übergänge entfallen (`motion-reduce:transition-none` bzw. `motion-safe:animate-…`), Farb-/Zustandswechsel selbst bleibt bestehen.
- Eng am Befund bleiben: keine Änderungen über die drei Kontrastpaare und die vier motion-losen Bausteine hinaus.

---

### Task 1: WCAG-Kontrastformel — `src/lib/contrast.ts`

**Files:**
- Create: `src/lib/contrast.ts`
- Create: `src/lib/contrast.test.ts`

**Interfaces:**
- Consumes: nichts — reine Funktion ohne Abhängigkeiten.
- Produces: `export function contrastRatio(hexA: string, hexB: string): number` — spätere Tasks in diesem Plan referenzieren diese Funktion nicht direkt (die Tokens werden in CSS gepflegt), sie dient als eigenständig testbarer Beleg für die in Task 2 eingetragenen Werte und als wiederverwendbarer Helfer für künftige Kontrast-Prüfungen.

- [ ] **Step 1: Schreibe die fehlschlagenden Tests**

```ts
// src/lib/contrast.test.ts
import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'

describe('contrastRatio', () => {
  it('gives the maximum ratio for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('gives a ratio of 1 for identical colors', () => {
    expect(contrastRatio('#5e5f66', '#5e5f66')).toBeCloseTo(1, 5)
  })

  it('is symmetric regardless of argument order', () => {
    expect(contrastRatio('#181920', '#8766ed')).toBeCloseTo(contrastRatio('#8766ed', '#181920'), 5)
  })

  // Die drei tatsaechlichen Token-Paare aus der Spec (docs/superpowers/specs/2026-09-06-phase6-nachschaerfung-design.md).
  // Diese Hex-Werte spiegeln src/index.css direkt (wie chart-colors.ts es fuer die Chart-Farben schon tut) —
  // Vitest kann eine CSS-Custom-Property nicht importieren, daher hier bewusst als Literal dupliziert.
  const BG = '#181920'
  const SURFACE = '#23242b'
  const SURFACE_RAISED = '#414249'
  const ACCENT = '#8766ed'
  const DANGER = '#f27a6b'

  it('confirms the old text-muted value FAILS AA text contrast against surface', () => {
    expect(contrastRatio('#5e5f66', SURFACE)).toBeLessThan(4.5)
  })

  it('confirms the new text-muted value clears AA text contrast against bg and surface', () => {
    expect(contrastRatio('#90919a', BG)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#90919a', SURFACE)).toBeGreaterThanOrEqual(4.5)
  })

  it('confirms the new text-muted value clears the 3:1 UI-component minimum against the nav pill', () => {
    expect(contrastRatio('#90919a', SURFACE_RAISED)).toBeGreaterThanOrEqual(3)
  })

  it('confirms the old white-on-accent pairing FAILS AA text contrast', () => {
    expect(contrastRatio('#fefeff', ACCENT)).toBeLessThan(4.5)
  })

  it('confirms the new on-bright value clears AA text contrast on both accent and danger', () => {
    expect(contrastRatio('#0d0e12', ACCENT)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#0d0e12', DANGER)).toBeGreaterThanOrEqual(4.5)
  })
})
```

- [ ] **Step 2: Lauf die Tests, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/lib/contrast.test.ts`
Expected: FAIL mit "Cannot find module './contrast'"

- [ ] **Step 3: Implementiere `contrast.ts`**

```ts
// src/lib/contrast.ts
/**
 * WCAG 2.x relative luminance and contrast ratio (formula per
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance). Pure math, no DOM —
 * lets the design-token values in src/index.css be checked against AA
 * thresholds (4.5:1 text, 3:1 UI components) instead of eyeballed.
 */
function channel(value: number): number {
  const srgb = value / 255
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexA)
  const luminanceB = relativeLuminance(hexB)
  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)
  return (lighter + 0.05) / (darker + 0.05)
}
```

- [ ] **Step 4: Lauf die Tests erneut, um das Bestehen zu bestätigen**

Run: `npx vitest run src/lib/contrast.test.ts`
Expected: PASS (9 Tests)

- [ ] **Step 5: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 6: Commit**

```bash
git add src/lib/contrast.ts src/lib/contrast.test.ts
git commit -m "test: WCAG-Kontrastformel als testbarer Beleg fuer die Token-Fixes"
```

---

### Task 2: Token-Werte in `src/index.css`

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Consumes: nichts.
- Produces: geänderter `--color-text-muted` (`#5e5f66` → `#90919a`), neuer `--color-on-bright` (`#0d0e12`). Tailwind v4 generiert daraus automatisch die Utilities `text-text-muted` (bereits vorhanden, jetzt mit neuem Wert) und `text-on-bright`/`bg-on-bright`/etc. (neu) — Task 3, 4 und 5 verwenden `text-on-bright` als Klassenname.

- [ ] **Step 1: Ändere die Tokens**

In `src/index.css`, im `@theme`-Block:

Ändere:
```css
  --color-text: #fefeff;
  --color-text-muted: #5e5f66;
```
zu:
```css
  --color-text: #fefeff;
  --color-text-muted: #90919a;
  /*
   * Textfarbe fuer Text auf hellen/gesaettigten Flaechen (Accent-Buttons,
   * aktiver Chip, Danger-Toast) — #fefeff auf #8766ed/#f27a6b faellt unter
   * WCAG-AA-Textkontrast (4.5:1), siehe src/lib/contrast.test.ts. Die
   * Akzent-/Danger-Farbe selbst bleibt unveraendert, nur die Textfarbe
   * darauf wechselt von hell auf dunkel.
   */
  --color-on-bright: #0d0e12;
```

- [ ] **Step 2: Kommentar am Dateikopf ergänzen**

Ändere den bestehenden Kommentarblock am Dateianfang:
```css
/*
 * Design tokens for Phase 6 (Design). Values are measured pixel samples from
 * the reference video analysed in
 * docs/superpowers/specs/2026-09-05-phase6-referenzdesign-analyse.md — not
 * approximated. Dark mode only, no light variant (decided in the Phase 6
 * design spec, docs/superpowers/specs/2026-09-05-phase6-design-design.md).
 */
```
zu:
```css
/*
 * Design tokens for Phase 6 (Design). Values are measured pixel samples from
 * the reference video analysed in
 * docs/superpowers/specs/2026-09-05-phase6-referenzdesign-analyse.md — not
 * approximated. Dark mode only, no light variant (decided in the Phase 6
 * design spec, docs/superpowers/specs/2026-09-05-phase6-design-design.md).
 *
 * --color-text-muted and --color-on-bright were corrected post-launch for
 * WCAG AA contrast failures found by an impeccable critique; see
 * docs/superpowers/specs/2026-09-06-phase6-nachschaerfung-design.md and
 * src/lib/contrast.test.ts for the exact ratios. Every other token here is
 * still the original pixel-sampled value.
 */
```

- [ ] **Step 3: Lauf die volle Testsuite (Regressionscheck)**

Run: `npm test -- --run`
Expected: alle Tests grün — insbesondere `src/lib/contrast.test.ts` (unveraendert, testet Literale, nicht die CSS-Datei) und keine Snapshot-artigen Tests, die den alten Hex-Wert erwarten

- [ ] **Step 4: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "fix: text-muted und neuen on-bright Token auf WCAG-AA-Kontrast bringen"
```

---

### Task 3: Motion + on-bright auf den Button-Klassen — `src/lib/ui-classes.ts`

**Files:**
- Modify: `src/lib/ui-classes.ts`
- Modify: `src/lib/ui-classes.test.ts`

**Interfaces:**
- Consumes: `text-on-bright`-Utility aus Task 2.
- Produces: `buttonPrimaryClass`/`buttonSecondaryClass` mit Motion-Klassen und (nur `buttonPrimaryClass`) `text-on-bright` statt `text-text`. Keine Signaturänderung an beiden — bleiben einfache exportierte Strings, wie von jeder Aufrufstelle (`HomePage`, `NutritionEntriesPage`, etc.) unverändert konsumiert. Zusätzlich neu: `export const interactiveClass` (ohne `focus-visible:ring-offset-*`, das bestimmt jeder Aufrufer selbst) — Task 4 (`Chip`) und Task 6 (`BottomNav`) importieren genau diesen Namen aus `./ui-classes`, statt dieselbe Klassenliste ein drittes und viertes Mal zu tippen.

- [ ] **Step 1: Schreibe die fehlschlagenden Tests**

In `src/lib/ui-classes.test.ts`, die bestehende Datei um diese Erweiterungen ergänzen (bestehende drei `it`-Blöcke bleiben, nur ergänzen):

```ts
// src/lib/ui-classes.test.ts
import { describe, expect, it } from 'vitest'
import { buttonPrimaryClass, buttonSecondaryClass, cardClass, interactiveClass } from './ui-classes'

describe('ui-classes', () => {
  it('gives every card the same rounded surface treatment', () => {
    expect(cardClass).toContain('bg-surface')
    expect(cardClass).toContain('rounded-3xl')
  })

  it('gives the primary button the accent background, full width and matching radius', () => {
    expect(buttonPrimaryClass).toContain('bg-accent')
    expect(buttonPrimaryClass).toContain('w-full')
    expect(buttonPrimaryClass).toContain('rounded-2xl')
    expect(buttonPrimaryClass).toContain('border-0')
    expect(buttonPrimaryClass).toContain('m-0')
  })

  it('keeps the secondary button visually distinct from the primary one', () => {
    expect(buttonSecondaryClass).not.toContain('bg-accent')
    expect(buttonSecondaryClass).not.toContain('w-full')
    expect(buttonSecondaryClass).toContain('rounded-2xl')
    expect(buttonSecondaryClass).toContain('border-0')
    expect(buttonSecondaryClass).toContain('m-0')
  })

  it('gives the primary button on-bright text instead of the near-white default, for AA contrast on accent', () => {
    expect(buttonPrimaryClass).toContain('text-on-bright')
    expect(buttonPrimaryClass).not.toContain('text-text ')
  })

  it('gives both buttons hover, press and focus-visible feedback', () => {
    for (const cls of [buttonPrimaryClass, buttonSecondaryClass]) {
      expect(cls).toContain('transition')
      expect(cls).toContain('motion-reduce:transition-none')
      expect(cls).toContain('hover:brightness-110')
      expect(cls).toContain('active:scale-[0.97]')
      expect(cls).toContain('focus-visible:ring-2')
      expect(cls).toContain('focus-visible:ring-accent')
      expect(cls).toContain('focus-visible:ring-offset-bg')
    }
  })

  it('exports the shared interactive-state classes for other components to reuse', () => {
    expect(interactiveClass).toContain('transition')
    expect(interactiveClass).toContain('active:scale-[0.97]')
    expect(interactiveClass).not.toContain('ring-offset')
  })
})
```

- [ ] **Step 2: Lauf die Tests, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/lib/ui-classes.test.ts`
Expected: FAIL — die zwei neuen `it`-Blöcke schlagen fehl, die drei bestehenden bleiben grün

- [ ] **Step 3: Implementiere die Änderung**

In `src/lib/ui-classes.ts`:

Ändere:
```ts
export const buttonPrimaryClass =
  'w-full rounded-2xl border-0 m-0 bg-accent px-4 py-3 font-semibold text-text disabled:opacity-50'

export const buttonSecondaryClass =
  'rounded-2xl border-0 m-0 bg-surface px-4 py-3 font-semibold text-text disabled:opacity-50'
```
zu:
```ts
/**
 * transition + motion-reduce:transition-none statt eines separaten
 * motion-safe:-Zweigs: der Zustandswechsel selbst (Farbe, Skalierung) soll
 * unter prefers-reduced-motion bestehen bleiben, nur ohne animierten
 * Uebergang dazwischen — siehe Spec, Abschnitt "Motion".
 *
 * Exportiert (nicht nur hier verwendet): Chip und BottomNav brauchen
 * dieselbe Hover/Press/Fokus-Basis, nur mit einer anderen
 * focus-visible:ring-offset-Farbe (die haengt davon ab, auf welchem
 * Hintergrund das Element sitzt) — die traegt jeder Aufrufer selbst bei,
 * statt die ganze Liste ein drittes/viertes Mal zu tippen.
 */
export const interactiveClass =
  'transition duration-150 motion-reduce:transition-none hover:brightness-110 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'

export const buttonPrimaryClass =
  `w-full rounded-2xl border-0 m-0 bg-accent px-4 py-3 font-semibold text-on-bright disabled:opacity-50 ${interactiveClass} focus-visible:ring-offset-bg`

export const buttonSecondaryClass =
  `rounded-2xl border-0 m-0 bg-surface px-4 py-3 font-semibold text-text disabled:opacity-50 ${interactiveClass} focus-visible:ring-offset-bg`
```

- [ ] **Step 4: Lauf die Tests erneut, um das Bestehen zu bestätigen**

Run: `npx vitest run src/lib/ui-classes.test.ts`
Expected: PASS (5 Tests)

- [ ] **Step 5: Lauf die volle Testsuite (Regressionscheck)**

Run: `npm test -- --run`
Expected: alle Tests grün — `disabled:opacity-50` steht jetzt vor `interactiveClass` im String, kein Test prüft die Reihenfolge der Klassen, nur `toContain`

- [ ] **Step 6: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 7: Commit**

```bash
git add src/lib/ui-classes.ts src/lib/ui-classes.test.ts
git commit -m "feat: Hover/Press/Fokus-Feedback und on-bright Text auf beiden Button-Klassen"
```

---

### Task 4: Motion + on-bright auf `Chip`

**Files:**
- Modify: `src/components/Chip.tsx`
- Modify: `src/components/Chip.test.tsx`

**Interfaces:**
- Consumes: `text-on-bright`-Utility aus Task 2, `interactiveClass` aus `../lib/ui-classes` (Task 3).
- Produces: `Chip` mit unveränderter Props-Signatur (`ChipProps`), nur geänderten CSS-Klassen im aktiven Zustand plus Motion-Klassen in beiden Zuständen.

- [ ] **Step 1: Schreibe die fehlschlagenden Tests**

In `src/components/Chip.test.tsx`, die bestehende Datei um einen vierten `it`-Block ergänzen (die drei bestehenden bleiben unverändert):

```tsx
// src/components/Chip.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Chip from './Chip'

describe('Chip', () => {
  it('marks an active chip with aria-pressed', () => {
    render(<Chip active>90 Tage</Chip>)
    expect(screen.getByRole('button', { name: '90 Tage' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('marks an inactive chip as not pressed', () => {
    render(<Chip active={false}>30 Tage</Chip>)
    expect(screen.getByRole('button', { name: '30 Tage' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('forwards the click handler', () => {
    const onClick = vi.fn()
    render(
      <Chip active={false} onClick={onClick}>
        30 Tage
      </Chip>,
    )
    fireEvent.click(screen.getByRole('button', { name: '30 Tage' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('gives the active chip on-bright text and both states hover/press/focus feedback', () => {
    const { rerender } = render(<Chip active>90 Tage</Chip>)
    const active = screen.getByRole('button', { name: '90 Tage' })
    expect(active.className).toContain('text-on-bright')
    expect(active.className).toContain('transition')
    expect(active.className).toContain('active:scale-[0.97]')
    expect(active.className).toContain('focus-visible:ring-2')
    expect(active.className).toContain('focus-visible:ring-offset-2')
    expect(active.className).toContain('focus-visible:ring-offset-bg')

    rerender(<Chip active={false}>90 Tage</Chip>)
    const inactive = screen.getByRole('button', { name: '90 Tage' })
    expect(inactive.className).not.toContain('text-on-bright')
    expect(inactive.className).toContain('transition')
  })
})
```

- [ ] **Step 2: Lauf den Test, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/components/Chip.test.tsx`
Expected: FAIL — der vierte Test schlägt fehl, die ersten drei bleiben grün

- [ ] **Step 3: Implementiere die Änderung**

In `src/components/Chip.tsx`:

Ändere:
```tsx
export default function Chip({ active, className = '', ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded-full border-0 m-0 px-4 py-2 font-medium ${
        active ? 'bg-accent text-text' : 'bg-surface text-text-muted'
      } ${className}`}
      {...props}
    />
  )
}
```
zu:
```tsx
import { interactiveClass } from '../lib/ui-classes'

export default function Chip({ active, className = '', ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded-full border-0 m-0 px-4 py-2 font-medium ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
        active ? 'bg-accent text-on-bright' : 'bg-surface text-text-muted'
      } ${className}`}
      {...props}
    />
  )
}
```

`interactiveClass` selbst enthält bewusst kein `ring-offset` (siehe Task 3, Ruling in der Ledger nach dessen Fix-Runde 1) — jeder Aufrufer setzt Breite (`ring-offset-2`) und Farbe (`ring-offset-bg`/`-surface-raised`) zusammen.

Der bestehende `import type { ButtonHTMLAttributes } from 'react'` bleibt unverändert stehen, der neue Import kommt darunter.

- [ ] **Step 4: Lauf die Tests erneut, um das Bestehen zu bestätigen**

Run: `npx vitest run src/components/Chip.test.tsx`
Expected: PASS (4 Tests)

- [ ] **Step 5: Lauf die volle Testsuite (Regressionscheck)**

Run: `npm test -- --run`
Expected: alle Tests grün — insbesondere `ChartPicker.test.tsx`/`ZeitraumSwitch`-nahe Tests, die `Chip` konsumieren, aber nur auf `aria-pressed`/Klick prüfen, nicht auf Klasseninhalt

- [ ] **Step 6: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 7: Commit**

```bash
git add src/components/Chip.tsx src/components/Chip.test.tsx
git commit -m "feat: Hover/Press/Fokus-Feedback und on-bright Text auf Chip"
```

---

### Task 5: on-bright + Enter-Übergang auf `ToastProvider`

**Files:**
- Modify: `src/components/ToastProvider.tsx`
- Modify: `src/components/ToastProvider.test.tsx`

**Interfaces:**
- Consumes: `text-on-bright`-Utility aus Task 2.
- Produces: `ToastProvider`/`useToast` unverändert in Signatur; nur die Danger-Variante bekommt `text-on-bright` statt `text-text`, plus eine neue `@keyframes toast-in`-Animation in `src/index.css` für den Einblend-Übergang.

Bewusst nur ein **Einblend**-Übergang, kein Ausblend-Übergang: `{toast && <p .../>}` entfernt das Element sofort aus dem DOM, sobald `toast` `null` wird — ein Ausblenden bräuchte einen zweiten, verzögerten Unmount-Zustand (State-Machine statt einer reinen Bedingung), was für einen Toast, der ohnehin durch Zeitablauf verschwindet, mehr Komplexität wäre, als der Befund ("kein Motion irgendwo") rechtfertigt. Eng am Befund: das Fehlen von *jeglicher* Animation ist behoben, ein Ausblend-Effekt bleibt eine mögliche spätere Ergänzung.

- [ ] **Step 1: Schreibe die fehlschlagenden Tests**

In `src/components/ToastProvider.test.tsx`, den bestehenden zweiten Test (`'shows an error message with the danger styling'`) erweitern und einen neuen Test ergänzen (alle anderen bestehenden Tests bleiben unverändert):

Ändere:
```tsx
  it('shows an error message with the danger styling', async () => {
    render(
      <ToastProvider>
        <TriggerButton message="Speichern fehlgeschlagen" type="error" />
      </ToastProvider>,
    )
    screen.getByRole('button', { name: 'ausloesen' }).click()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Speichern fehlgeschlagen')
    expect(alert.className).toContain('bg-danger')
  })
```
zu:
```tsx
  it('shows an error message with the danger styling', async () => {
    render(
      <ToastProvider>
        <TriggerButton message="Speichern fehlgeschlagen" type="error" />
      </ToastProvider>,
    )
    screen.getByRole('button', { name: 'ausloesen' }).click()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Speichern fehlgeschlagen')
    expect(alert.className).toContain('bg-danger')
    expect(alert.className).toContain('text-on-bright')
  })

  it('gives every toast an entrance transition, skipped under reduced motion', async () => {
    render(
      <ToastProvider>
        <TriggerButton message="Eintrag gespeichert" type="success" />
      </ToastProvider>,
    )
    screen.getByRole('button', { name: 'ausloesen' }).click()
    const alert = await screen.findByRole('alert')
    expect(alert.className).toContain('motion-safe:animate-[toast-in_200ms_ease-out]')
  })
```

- [ ] **Step 2: Lauf die Tests, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/components/ToastProvider.test.tsx`
Expected: FAIL — die zwei geänderten/neuen Assertions schlagen fehl

- [ ] **Step 3: Ergänze die `@keyframes` in `src/index.css`**

Ans Ende von `src/index.css` anfügen:

```css
/*
 * Toast-Einblendung. motion-safe: statt eines eigenen motion-reduce:-Zweigs:
 * ohne die Klasse ueberhaupt zu vergeben, gibt es unter reduced-motion keinen
 * ersten Frame mit opacity:0, der Toast erscheint sofort im Endzustand.
 */
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 4: Implementiere die Änderung in `ToastProvider.tsx`**

Ändere:
```tsx
        <p
          role="alert"
          className={`fixed inset-x-4 top-4 rounded-2xl px-4 py-3 font-medium ${
            toast.type === 'success' ? 'bg-success text-success-ink' : 'bg-danger text-text'
          }`}
        >
```
zu:
```tsx
        <p
          role="alert"
          className={`fixed inset-x-4 top-4 rounded-2xl px-4 py-3 font-medium motion-safe:animate-[toast-in_200ms_ease-out] ${
            toast.type === 'success' ? 'bg-success text-success-ink' : 'bg-danger text-on-bright'
          }`}
        >
```

- [ ] **Step 5: Lauf die Tests erneut, um das Bestehen zu bestätigen**

Run: `npx vitest run src/components/ToastProvider.test.tsx`
Expected: PASS (5 Tests)

- [ ] **Step 6: Lauf die volle Testsuite (Regressionscheck)**

Run: `npm test -- --run`
Expected: alle Tests grün

- [ ] **Step 7: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 8: Commit**

```bash
git add src/index.css src/components/ToastProvider.tsx src/components/ToastProvider.test.tsx
git commit -m "feat: on-bright Text und Einblend-Uebergang auf dem Danger-Toast"
```

---

### Task 6: Hover/Fokus-Feedback auf `BottomNav`

**Files:**
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/components/BottomNav.test.tsx`

**Interfaces:**
- Consumes: `text-text-muted`-Utility aus Task 2 (bereits vorhanden, jetzt mit korrigiertem Kontrastwert — hier keine Code-Änderung nötig, nur zur Vollständigkeit als konsumierter Fix genannt), `interactiveClass` aus `../lib/ui-classes` (Task 3).
- Produces: `BottomNav` unverändert in Struktur/Props; die `NavLink`-`className`-Funktion bekommt Motion-Klassen ergänzt.

- [ ] **Step 1: Schreibe den fehlschlagenden Test**

In `src/components/BottomNav.test.tsx`, den bestehenden zweiten Test unverändert lassen und einen dritten ergänzen:

```tsx
// src/components/BottomNav.test.tsx, ergaenzen nach dem bestehenden zweiten it-Block
  it('gives every nav link hover, press and focus-visible feedback', () => {
    renderNav()
    const home = screen.getByRole('link', { name: 'Home' })
    expect(home.className).toContain('transition')
    expect(home.className).toContain('hover:brightness-110')
    expect(home.className).toContain('active:scale-[0.97]')
    expect(home.className).toContain('focus-visible:ring-2')
    expect(home.className).toContain('focus-visible:ring-offset-2')
    expect(home.className).toContain('focus-visible:ring-offset-surface-raised')
  })
```

- [ ] **Step 2: Lauf den Test, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/components/BottomNav.test.tsx`
Expected: FAIL — der neue dritte Test schlägt fehl, die ersten zwei bleiben grün

- [ ] **Step 3: Implementiere die Änderung**

In `src/components/BottomNav.tsx`:

Ändere:
```tsx
          className={({ isActive }) =>
            `flex h-11 w-11 items-center justify-center rounded-full ${
              isActive ? 'text-accent' : 'text-text-muted'
            }`
          }
```
zu:
```tsx
          className={({ isActive }) =>
            `flex h-11 w-11 items-center justify-center rounded-full ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised ${
              isActive ? 'text-accent' : 'text-text-muted'
            }`
          }
```

Und am Dateikopf den Import ergänzen:

Ändere:
```tsx
import { Activity, Dumbbell, House, UtensilsCrossed } from 'lucide-react'
import { NavLink } from 'react-router-dom'
```
zu:
```tsx
import { Activity, Dumbbell, House, UtensilsCrossed } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { interactiveClass } from '../lib/ui-classes'
```

`focus-visible:ring-offset-surface-raised` statt `-offset-bg` wie bei Buttons/Chip: der Fokusring sitzt hier auf der Nav-Pille (`bg-surface-raised`), nicht auf dem Seitenhintergrund — ein `-offset-bg` würde am Pillenrand einen sichtbaren Farbsprung erzeugen.

- [ ] **Step 4: Lauf die Tests erneut, um das Bestehen zu bestätigen**

Run: `npx vitest run src/components/BottomNav.test.tsx`
Expected: PASS (3 Tests)

- [ ] **Step 5: Lauf die volle Testsuite (Regressionscheck)**

Run: `npm test -- --run`
Expected: alle Tests grün

- [ ] **Step 6: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 7: Commit**

```bash
git add src/components/BottomNav.tsx src/components/BottomNav.test.tsx
git commit -m "feat: Hover/Press/Fokus-Feedback auf der Bottom-Navigation"
```

---

### Task 7: Abschluss

**Files:**
- Modify: `docs/domaenenmodell.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nichts Neues — reine Verifikation und Dokumentation des bereits umgesetzten Stands.
- Produces: nichts, das andere Tasks konsumieren — letzter Task dieses Plans.

- [ ] **Step 1: Volle Testsuite, Lint, Typecheck, Build**

Run: `npm test -- --run && npm run lint && npx tsc -b --noEmit && npm run build`
Expected: alle vier Schritte grün. Bundle-Zahlen notieren (keine neue Abhängigkeit, Entry-Chunk sollte sich nur um die paar neuen Bytes in `ui-classes.ts`/`Chip.tsx`/`ToastProvider.tsx`/`BottomNav.tsx`/`contrast.ts` ändern).

- [ ] **Step 2: `docs/domaenenmodell.md` prüfen**

Kurz gegen den aktuellen Stand prüfen — dieser Plan fasst kein DB-Schema an (reine Frontend-CSS/Klassen-Änderung), letzte Migration bleibt `0007`. Falls die Datei schon exakt das sagt, keine Änderung nötig; falls die Quellenzeile ein älteres Datum trägt, auf den aktuellen Stand aktualisieren.

- [ ] **Step 3: `impeccable detect` erneut gegen die geänderten Seiten laufen lassen**

Nach Merge und Deploy (siehe CLAUDE.md, Abschnitt "Tech-Stack" → Deploy-Regel: `npm ci && npm run build && firebase deploy --only hosting:vitaloop` im Hauptcheckout mit echter `.env`):

```bash
C:\Users\Suley\.claude\skills\impeccable\scripts\impeccable.cmd detect --json https://vitaloop.web.app
```

Da die App clientseitig rendert, liefert das gegen die reine URL weiterhin `[]` (siehe Assessment B im Critique) — die eigentliche Prüfung läuft über den Browser-Overlay-Weg wie im Critique selbst: `impeccable.cmd live-server --background`, Skript `http://localhost:<PORT>/detect.js` in einen frischen Tab auf `/training`, `/nutrition`, `/body`, `/training/analyse` und `/profile` injizieren, 2-3 Sekunden warten, Konsole lesen. Erwartung: die drei vorher gemeldeten `low-contrast`-Funde sind weg (0 statt 6 Rohfunde, `line-length` auf `/profile` bleibt — das behebt erst Plan 2). Live-Server danach stoppen.

- [ ] **Step 4: Manuelle Browser-Verifikation**

Gegen die deployte Instanz, per Chrome-Erweiterung oder playwright-cli:

1. Auf `/training`, `/nutrition`, `/body`: primärer und sekundärer Button, Hover zeigt sichtbar helleren Zustand, Klick/Press einen kurzen Skalierungs-Effekt, Tab-Fokus einen sichtbaren Ring.
2. `Chip` (z. B. Zeitraum-Umschalter auf einer Analyse-Seite): aktiver Chip zeigt dunklen statt weißen Text auf dem Lila, per `getComputedStyle` bestätigt (`color` nahe `#0d0e12`).
3. Bottom-Nav: inaktive Icons sind jetzt deutlich sichtbar (nicht mehr fast unsichtbar), Hover/Fokus zeigt denselben Feedback-Stil wie die Buttons.
4. Einen Fehler-Toast auslösen (z. B. Netzwerk in DevTools kurz offline schalten und eine Aktion versuchen, falls eine Fehlermeldung dabei entsteht) — Text ist auf dem Orange/Rot gut lesbar (dunkel statt weiß), der Toast blendet sichtbar ein statt hart zu erscheinen.
5. Mit aktivierter „Reduce Motion"-Systemeinstellung (Browser/OS): kein Skalierungs-/Einblend-Effekt mehr sichtbar, Zustandswechsel (Farbe) funktioniert weiterhin.
6. Konsole durchgängig ohne Fehler oder Warnungen.

- [ ] **Step 5: `CLAUDE.md` aktualisieren**

Im Abschnitt „Status / Fortschritt" einen neuen Absatz „Phase-6-Nachschärfung Plan 1 (Design-Tokens)" ergänzen: Spec-Pfad, Plan-Pfad, Kurzbeschreibung (Kontrast-Fix für `text-muted` und neuen `on-bright`-Token, Motion auf Buttons/Chip/Nav/Toast), Bundle-Zahlen aus Step 1, Ergebnis von Step 3 (Detector) und Step 4 (manuelle Verifikation). „Genau hier weitermachen" auf „Plan 2 (Profil nachziehen)" verweisen.

- [ ] **Step 6: Commit**

```bash
git add docs/domaenenmodell.md CLAUDE.md
git commit -m "docs: Plan 1 (Design-Tokens) Abschluss - Verifikation und Status"
```

# Phase 6, Plan 1 – Design-Fundament

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tailwind CSS und die sechs wiederverwendbaren Design-Bausteine (Farb-Tokens, Karte, Buttons, Chip, Navigation, Toast, Dialog) stehen bereit, damit die folgenden Bereichs-Pläne (Training, Ernährung, Körper, Analyse-Seiten) darauf aufbauen können.

**Architecture:** Tailwind CSS v4 (`@theme`-Direktive in `src/index.css`, kein separates JS-Config-File) ersetzt die bisherigen CSS-Custom-Properties. Karte und Buttons sind reine Tailwind-Klassen-Rezepte (`src/lib/ui-classes.ts`), keine eigenen React-Komponenten nötig, da sie keinen eigenen Zustand oder Verhalten tragen. Chip, Toast und Dialog sind eigene Komponenten, weil sie Zustand bzw. Verhalten kapseln (aktiv/inaktiv, Auto-Dismiss, natives `<dialog>`-Verhalten). Die bestehenden Element-Selektor-Regeln in `index.css` (44px-Tastziele, `role="list"`-Konvention, Formularelemente) bleiben vorerst als Übergangs-Styling für noch nicht migrierte Seiten bestehen — sie werden Seite für Seite in den folgenden Bereichs-Plänen abgelöst, nicht in diesem Plan.

**Tech Stack:** React 19 + Vite, TypeScript, Vitest + Testing Library. **Neu:** Tailwind CSS 4.3.3, `@tailwindcss/vite` 4.3.3, `lucide-react` 1.41.0 — alle drei Versionen lokal installiert und gegen das Projekt getestet (Build, Lint, Typecheck liefen sauber durch), bevor dieser Plan geschrieben wurde.

**Spec:** `docs/superpowers/specs/2026-09-05-phase6-design-design.md` (baut auf `docs/superpowers/specs/2026-09-05-phase6-referenzdesign-analyse.md` auf)

## Global Constraints

- **Keine Drittanbieter-Namen** aus Fitness/Ernährung in Code, Kommentaren, Commit-Messages oder Docs.
- **Nur Dark Mode**, kein Light-Mode-Zweig. Exakte Farbwerte aus der Referenzdesign-Analyse übernehmen, nicht approximieren:
  `--color-bg: #181920`, `--color-surface: #23242b`, `--color-surface-raised: #414249`, `--color-accent: #8766ed`, `--color-success: #ebfd6e`, `--color-success-ink: #17181f`, `--color-danger: #f27a6b`, `--color-text: #fefeff`, `--color-text-muted: #5e5f66`, `--color-chart-mint: #6efde6`, `--color-chart-blue: #4f6ca5`, `--color-chart-green: #49be69`, `--color-chart-orange: #ff6f43`, `--color-chart-violet: #8766ed`, `--color-chart-grid: #5e5f66`.
- **Karten:** `rounded-3xl`, kein sichtbarer Rahmen. **Buttons/CTAs:** `rounded-2xl`. **Chips/Nav:** `rounded-full`.
- **Natives `<dialog>`** für Popups, kein selbstgebautes Modal-System.
- Bestehende Barrierefreiheits-Konventionen bleiben erhalten: `role="list"` auf Listen, 44px Mindest-Tastziel, `env(safe-area-inset-bottom)` auf der Navigation.
- Home-Dashboard wird in diesem und den folgenden Design-Plänen nicht angefasst.
- Nach jedem Task: `npm run lint`, `npx tsc -b --noEmit`, `npm test -- --run` müssen grün sein.
- Commit-Messages auf Deutsch ohne Umlaute, im Stil der bestehenden Historie.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `vite.config.ts` | erweitert um `@tailwindcss/vite`-Plugin |
| `src/index.css` | Tailwind-Import + `@theme`-Tokens; alte `:root`-Farbdefinitionen entfernt; verbleibende Übergangsregeln auf neue Tokens umgestellt |
| `src/lib/ui-classes.ts` | **neu:** Klassen-Rezepte für Karte und Buttons |
| `src/components/Chip.tsx` | **neu:** Toggle-Pille für Mehrfachauswahl und Zeitraum-Umschalter |
| `src/components/BottomNav.tsx` | umgebaut: schwebende Pille, vier lucide-react-Icons statt Text-Links |
| `src/components/ToastProvider.tsx` | **neu:** Kontext + Provider + `useToast()`-Hook |
| `src/components/AppLayout.tsx` | erweitert: wrappt Kinder in `ToastProvider` |
| `src/components/Dialog.tsx` | **neu:** Wrapper um natives `<dialog>` |
| `src/test-setup.ts` | erweitert: `HTMLDialogElement.showModal`/`close`-Polyfill für jsdom |

---

## Task 1: Tailwind CSS einrichten, Design-Tokens, globales Stylesheet migrieren

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)
- Modify: `vite.config.ts`
- Modify: `src/index.css`

**Interfaces:**
- Produces: CSS-Custom-Properties `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-accent`, `--color-success`, `--color-success-ink`, `--color-danger`, `--color-text`, `--color-text-muted`, `--color-chart-mint`, `--color-chart-blue`, `--color-chart-green`, `--color-chart-orange`, `--color-chart-violet`, `--color-chart-grid` — von Tailwinds `@theme` erzeugt, nutzbar sowohl als Utility-Klasse (`bg-bg`, `text-accent`, …) als auch als `var(--color-*)` in Plain CSS.

Dieser Task tauscht nur die Werkzeuge und Farb-Tokens aus — das visuelle Ergebnis für noch nicht migrierte Seiten bleibt weitgehend wie vorher (dieselben Layout-Regeln, nur mit den neuen dunklen Farben statt der alten hell/dunkel-Variablen). Die eigentliche Karten-/Button-Optik kommt in Task 2.

- [ ] **Step 1: Tailwind und lucide-react installieren**

```bash
npm install tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 lucide-react@1.41.0
```

- [ ] **Step 2: Tailwind-Plugin in Vite einbinden**

In `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'

// `npm run dev:mobile` serves over HTTPS on the local network so a phone can
// reach the app: getUserMedia (the barcode scanner) only runs in a secure
// context, and plain http:// over the LAN is not one. Plain `npm run dev` stays
// http on localhost, which counts as secure and needs no certificate prompt.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'mobile' ? [basicSsl()] : [])],
  // '0.0.0.0', not `true`: the latter binds to '::' and this machine's dual-stack
  // does not accept IPv4 through it, so phones on the LAN could not connect.
  server: mode === 'mobile' ? { host: '0.0.0.0' } : {},
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    env: {
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
}))
```

- [ ] **Step 3: `src/index.css` vollständig ersetzen**

```css
@import "tailwindcss";

/*
 * Design tokens for Phase 6 (Design). Values are measured pixel samples from
 * the reference video analysed in
 * docs/superpowers/specs/2026-09-05-phase6-referenzdesign-analyse.md — not
 * approximated. Dark mode only, no light variant (decided in the Phase 6
 * design spec, docs/superpowers/specs/2026-09-05-phase6-design-design.md).
 */
@theme {
  --color-bg: #181920;
  --color-surface: #23242b;
  --color-surface-raised: #414249;

  --color-accent: #8766ed;
  --color-success: #ebfd6e;
  --color-success-ink: #17181f;
  --color-danger: #f27a6b;

  --color-text: #fefeff;
  --color-text-muted: #5e5f66;

  --color-chart-mint: #6efde6;
  --color-chart-blue: #4f6ca5;
  --color-chart-green: #49be69;
  --color-chart-orange: #ff6f43;
  --color-chart-violet: #8766ed;
  --color-chart-grid: #5e5f66;

  --font-sans: system-ui, 'Segoe UI', Roboto, sans-serif;
}

:root {
  font: 18px/145% var(--font-sans);
  letter-spacing: 0.18px;
  color-scheme: dark;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  @media (max-width: 1024px) {
    font-size: 16px;
  }
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
}

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

h1,
h2 {
  font-family: var(--font-sans);
  font-weight: 500;
  color: var(--color-text);
}

h1 {
  font-size: 56px;
  letter-spacing: -1.68px;
  margin: 32px 0;
  @media (max-width: 1024px) {
    font-size: 36px;
    margin: 20px 0;
  }
}
h2 {
  font-size: 24px;
  line-height: 118%;
  letter-spacing: -0.24px;
  margin: 0 0 8px;
  @media (max-width: 1024px) {
    font-size: 20px;
  }
}
p {
  margin: 0;
}

/* Layout. The app ships plain semantic markup without classes, so every rule
   here is element-level. Interactive elements are 44px tall — the smallest
   reliable tap target on a phone. This block is transitional: it styles
   pages that have not yet been migrated to Tailwind utility classes and the
   Card/Button/Chip primitives (src/lib/ui-classes.ts, src/components/Chip.tsx).
   Each area plan in Phase 6 removes the rules its pages no longer need once
   migrated. */
#root > * {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* Progress photos are stored at up to 1600px on the long edge. Without this the
   intrinsic width forces a horizontal scrollbar on the whole app on a phone. */
img {
  max-width: 100%;
  height: auto;
}

header {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px;
}

main {
  flex: 1;
  padding: 0 16px 16px;
}

nav {
  position: sticky;
  bottom: 0;
  /* Keeps the tabs clear of the home indicator, which otherwise covers their
     lower third and wins the touch. */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  display: flex;
  background: var(--color-bg);
  border-top: 1px solid #2e303a;
}

nav a {
  flex: 1;
}

a {
  color: var(--color-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 0 8px;
}

/* A link that is not part of a list row gets a row of its own, so navigation
   links stop running together and the whole width stays tappable. Matched by
   what the link is next to rather than by nesting depth: an extra wrapper
   element must not silently bring the glued-together links back. */
main a:not(li a):not(p a) {
  display: flex;
}

/* Transitional border color for pages not yet migrated to the Card primitive.
   Removed once every list/form in the app uses Card instead of a bordered
   element (tracked across the Phase 6 area plans). */
button,
input,
select {
  font: inherit;
  min-height: 44px;
  margin: 4px;
  padding: 8px 12px;
  border: 1px solid #2e303a;
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
}

button {
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: default;
}

/* The components carry role="list": Safari drops list semantics from a ul
   whose marker is removed, and VoiceOver would stop announcing "list, N items". */
ul {
  list-style: none;
  margin: 16px 0;
  padding: 0;
}

li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #2e303a;
}

/* A form inside a list row belongs under it, not beside it. */
li form {
  flex-basis: 100%;
}

label {
  display: block;
  margin: 8px 0;
}
```

Entfernt gegenüber der alten Datei: die `:root`-Farbdefinitionen (hell und der `@media (prefers-color-scheme: dark)`-Block) — ersetzt durch `@theme`; die `code`/`.counter`-Regeln (im gesamten `src/`-Baum nirgends verwendet, Rest eines Scaffolding-Templates).

- [ ] **Step 4: Build-Integrität prüfen**

```bash
npm run build
```

Erwartet: Build erfolgreich. Prüfen, dass die Tokens tatsächlich im Ausgabe-CSS stehen:

```bash
grep -o "color-accent:[^;]*" dist/assets/*.css
```

Erwartet: `color-accent:#8766ed` (Tailwind schreibt jede `@theme`-Variable unabhängig davon, ob schon eine Utility-Klasse sie nutzt, als CSS-Custom-Property in die Ausgabe).

- [ ] **Step 5: Bestehende Qualitätssicherung durchlaufen lassen**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
```

Erwartet: alle drei sauber — dieser Task ändert keine Komponente und kein Verhalten, nur das Styling-Werkzeug und die Farbwerte, also darf sich an den 709 bestehenden Tests nichts ändern.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/index.css
git commit -m "feat: Tailwind CSS einrichten, Design-Tokens aus dem Referenzvideo"
```

---

## Task 2: Karte, Buttons und Chip

**Files:**
- Create: `src/lib/ui-classes.ts`
- Test: `src/lib/ui-classes.test.ts`
- Create: `src/components/Chip.tsx`
- Test: `src/components/Chip.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // src/lib/ui-classes.ts
  export const cardClass: string
  export const buttonPrimaryClass: string
  export const buttonSecondaryClass: string

  // src/components/Chip.tsx
  export type ChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }
  export default function Chip(props: ChipProps): JSX.Element
  ```

Karte und Buttons sind reine Klassen-Strings statt eigener Komponenten: sie tragen keinen Zustand und kein Verhalten, jede Konsumentenstelle kann sie direkt in ein natives Element schreiben (`<div className={cardClass}>`, `<button className={buttonPrimaryClass}>`). Ein Wrapper-Component ohne eigenes Verhalten wäre eine Abstraktion ohne Nutzen. Chip dagegen trägt echten Zustand (aktiv/inaktiv als Prop, die die Optik bestimmt) und ist deshalb eine eigene Komponente.

- [ ] **Step 1: Write the failing test**

Create `src/lib/ui-classes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buttonPrimaryClass, buttonSecondaryClass, cardClass } from './ui-classes'

describe('ui-classes', () => {
  it('gives every card the same rounded surface treatment', () => {
    expect(cardClass).toContain('bg-surface')
    expect(cardClass).toContain('rounded-3xl')
  })

  it('gives the primary button the accent background, full width and matching radius', () => {
    expect(buttonPrimaryClass).toContain('bg-accent')
    expect(buttonPrimaryClass).toContain('w-full')
    expect(buttonPrimaryClass).toContain('rounded-2xl')
  })

  it('keeps the secondary button visually distinct from the primary one', () => {
    expect(buttonSecondaryClass).not.toContain('bg-accent')
    expect(buttonSecondaryClass).not.toContain('w-full')
    expect(buttonSecondaryClass).toContain('rounded-2xl')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/ui-classes.test.ts`
Expected: FAIL — Modul `./ui-classes` existiert nicht.

- [ ] **Step 3: Write the implementation**

Create `src/lib/ui-classes.ts`:

```ts
/**
 * Shared Tailwind class recipes for the Phase 6 design system. One string
 * per role, reused everywhere that role appears, so the look changes in one
 * place instead of at every call site. Card and the two button variants
 * carry no state or behaviour, so a wrapper component would add an API
 * surface for nothing — a plain class string is the whole job.
 */
export const cardClass = 'bg-surface rounded-3xl p-6'

export const buttonPrimaryClass =
  'w-full rounded-2xl bg-accent px-4 py-3 font-semibold text-text disabled:opacity-50'

export const buttonSecondaryClass =
  'rounded-2xl bg-surface px-4 py-3 font-semibold text-text disabled:opacity-50'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/ui-classes.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for Chip**

Create `src/components/Chip.test.tsx`:

```tsx
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
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/components/Chip.test.tsx`
Expected: FAIL — Modul `./Chip` existiert nicht.

- [ ] **Step 7: Write the implementation**

Create `src/components/Chip.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean
}

/**
 * A single toggle pill, e.g. one option in the Zeitraum-Umschalter or a
 * multi-select tag. `active` carries only the selected/unselected look —
 * the caller owns the click handler and the selection state itself.
 */
export default function Chip({ active, className = '', ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded-full px-4 py-2 font-medium ${
        active ? 'bg-accent text-text' : 'bg-surface text-text-muted'
      } ${className}`}
      {...props}
    />
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- --run src/components/Chip.test.tsx`
Expected: PASS

- [ ] **Step 9: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/lib/ui-classes.ts src/lib/ui-classes.test.ts src/components/Chip.tsx src/components/Chip.test.tsx
git commit -m "feat: Karten- und Button-Klassen, Chip-Komponente"
```

---

## Task 3: Navigation umbauen — Icon-Pille statt Text-Leiste

**Files:**
- Modify: `src/components/BottomNav.tsx`
- Test: `src/components/BottomNav.test.tsx` (neu — es gab bisher keinen eigenen Test für diese Komponente)
- Modify: `src/index.css` (alte `nav`/`nav a`-Regeln entfernen, jetzt durch Tailwind-Klassen auf der Komponente selbst ersetzt)

**Interfaces:**
- Consumes: keine (lucide-react-Icons direkt importiert)

Die App hat vier Bereiche (Home, Training, Ernährung, Körper) — kein fünftes/erhöhtes Element wie im Referenzvideo (dort gab es einen zentralen „+"-Button für einen bereichsübergreifenden Log-Flow, den es hier nicht gibt; siehe Design-Spec, „Entschieden"-Abschnitt).

- [ ] **Step 1: Write the failing test**

Create `src/components/BottomNav.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BottomNav from './BottomNav'

function renderNav(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
    </MemoryRouter>,
  )
}

describe('BottomNav', () => {
  it('renders all four areas as accessible links', () => {
    renderNav()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Training' })).toHaveAttribute('href', '/training')
    expect(screen.getByRole('link', { name: 'Ernährung' })).toHaveAttribute('href', '/nutrition')
    expect(screen.getByRole('link', { name: 'Körper' })).toHaveAttribute('href', '/body')
  })

  it('marks the active area distinctly from the inactive ones', () => {
    renderNav('/training')
    const active = screen.getByRole('link', { name: 'Training' })
    const inactive = screen.getByRole('link', { name: 'Ernährung' })
    expect(active.className).toContain('text-accent')
    expect(inactive.className).not.toContain('text-accent')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/BottomNav.test.tsx`
Expected: FAIL — die Links tragen noch keinen Namen aus einem Icon-`aria-label`, und `className` enthält kein `text-accent` (die Komponente rendert bisher nur Text ohne Klassen).

- [ ] **Step 3: Write the implementation**

Replace `src/components/BottomNav.tsx`:

```tsx
import { Activity, Dumbbell, House, UtensilsCrossed } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', Icon: House, end: true },
  { to: '/training', label: 'Training', Icon: Dumbbell, end: false },
  { to: '/nutrition', label: 'Ernährung', Icon: UtensilsCrossed, end: false },
  { to: '/body', label: 'Körper', Icon: Activity, end: false },
]

/**
 * Floating pill, not a full-width bar with a top border: matches the
 * reference design's nav (docs/superpowers/specs/2026-09-05-phase6-referenzdesign-analyse.md,
 * section "Bottom Navigation"). No fifth/raised centre button — the app has
 * four areas, not a single cross-area "log" action (see design spec).
 */
export default function BottomNav() {
  return (
    <nav
      role="list"
      className="sticky bottom-4 mx-4 flex justify-around rounded-full bg-surface-raised p-2"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={label}
          className={({ isActive }) =>
            `flex h-11 w-11 items-center justify-center rounded-full ${
              isActive ? 'text-accent' : 'text-text-muted'
            }`
          }
        >
          <Icon aria-hidden="true" />
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/BottomNav.test.tsx`
Expected: PASS

- [ ] **Step 5: Alte Nav-Regeln aus `src/index.css` entfernen**

Die Komponente trägt jetzt ihre komplette Optik selbst über Tailwind-Klassen. Die alten Element-Selektor-Regeln dafür in `src/index.css` löschen:

```css
nav {
  position: sticky;
  bottom: 0;
  /* Keeps the tabs clear of the home indicator, which otherwise covers their
     lower third and wins the touch. */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  display: flex;
  background: var(--color-bg);
  border-top: 1px solid #2e303a;
}

nav a {
  flex: 1;
}
```

(ersatzlos entfernen — kein Ersatz nötig, `BottomNav.tsx` trägt ab jetzt seine eigenen Klassen)

- [ ] **Step 6: Run the full suite**

Run: `npm test -- --run`
Expected: PASS. `App.test.tsx` prüft keine Nav-Texte direkt (verifiziert vor Planerstellung), sollte also unverändert grün bleiben.

- [ ] **Step 7: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
git add src/components/BottomNav.tsx src/components/BottomNav.test.tsx src/index.css
git commit -m "feat: Navigation als schwebende Icon-Pille"
```

---

## Task 4: Toast-System für kurzlebige Rückmeldungen

**Files:**
- Create: `src/components/ToastProvider.tsx`
- Test: `src/components/ToastProvider.test.tsx`
- Modify: `src/components/AppLayout.tsx`

**Interfaces:**
- Produces:
  ```tsx
  // src/components/ToastProvider.tsx
  export function ToastProvider({ children }: { children: ReactNode }): JSX.Element
  export function useToast(): (message: string, type: 'success' | 'error') => void
  ```

Kontext, Provider und Hook liegen in einer Datei: alle drei sind so eng gekoppelt (der Hook liest genau den Kontext, den der Provider bereitstellt), dass eine Aufteilung auf `hooks/` und `components/` nur eine zusätzliche Import-Stelle wäre, ohne dass eine Seite unabhängig von der anderen verständlich würde.

- [ ] **Step 1: Write the failing test**

Create `src/components/ToastProvider.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import { ToastProvider, useToast } from './ToastProvider'

function TriggerButton({ message, type }: { message: string; type: 'success' | 'error' }) {
  const showToast = useToast()
  return (
    <button type="button" onClick={() => showToast(message, type)}>
      ausloesen
    </button>
  )
}

describe('ToastProvider', () => {
  it('shows a success message with the success styling', async () => {
    render(
      <ToastProvider>
        <TriggerButton message="Eintrag gespeichert" type="success" />
      </ToastProvider>,
    )
    screen.getByRole('button', { name: 'ausloesen' }).click()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Eintrag gespeichert')
    expect(alert.className).toContain('bg-success')
  })

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

  it('removes the toast on its own after a few seconds', async () => {
    render(
      <ToastProvider>
        <TriggerButton message="Eintrag gespeichert" type="success" />
      </ToastProvider>,
    )
    screen.getByRole('button', { name: 'ausloesen' }).click()
    const alert = await screen.findByRole('alert')

    await waitForElementToBeRemoved(alert, { timeout: 5000 })
  }, 6000)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/ToastProvider.test.tsx`
Expected: FAIL — Modul `./ToastProvider` existiert nicht.

- [ ] **Step 3: Write the implementation**

Create `src/components/ToastProvider.tsx`:

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error'
type ToastState = { message: string; type: ToastType } | null

/** Long enough to read a short sentence, short enough not to linger. */
const AUTO_DISMISS_MS = 4000

const ToastContext = createContext<((message: string, type: ToastType) => void) | null>(null)

/**
 * Mounted once in AppLayout, so every authenticated page can call useToast()
 * without its own state. Replaces the inline `<p role="alert">` pattern for
 * short-lived feedback on an action (e.g. "gespeichert") — a permanent
 * validation error in a form stays inline, since a toast that vanishes
 * mid-read would hide the reason a save was blocked.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), AUTO_DISMISS_MS)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <p
          role="alert"
          className={`fixed inset-x-4 top-4 rounded-2xl px-4 py-3 font-medium ${
            toast.type === 'success' ? 'bg-success text-success-ink' : 'bg-danger text-text'
          }`}
        >
          {toast.message}
        </p>
      )}
    </ToastContext.Provider>
  )
}

/** Call with a message and 'success' or 'error' to show a toast for a few seconds. */
export function useToast() {
  const showToast = useContext(ToastContext)
  if (!showToast) throw new Error('useToast must be used within a ToastProvider')
  return showToast
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/ToastProvider.test.tsx`
Expected: PASS

- [ ] **Step 5: In `AppLayout` einhängen**

Modify `src/components/AppLayout.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BottomNav from './BottomNav'
import { ToastProvider } from './ToastProvider'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div>
        <header>
          {/* Profile is a setting, not a fifth area — it stays out of the bottom nav. */}
          <Link to="/profile" aria-label="Profil">
            👤
          </Link>
        </header>
        <main>{children}</main>
        <BottomNav />
      </div>
    </ToastProvider>
  )
}
```

- [ ] **Step 6: Run the full suite**

Run: `npm test -- --run`
Expected: PASS — `AppLayout` bekommt keinen eigenen Test (bisher keiner vorhanden, dieser Task ändert nur die Verschachtelung, keine sichtbare Struktur für bestehende Tests, die über `AppLayout` rendern).

- [ ] **Step 7: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
git add src/components/ToastProvider.tsx src/components/ToastProvider.test.tsx src/components/AppLayout.tsx
git commit -m "feat: Toast-System fuer kurzlebige Rueckmeldungen"
```

---

## Task 5: Dialog — Wrapper um natives `<dialog>`

**Files:**
- Modify: `src/test-setup.ts` (jsdom-Polyfill für `HTMLDialogElement`)
- Create: `src/components/Dialog.tsx`
- Test: `src/components/Dialog.test.tsx`

**Interfaces:**
- Produces:
  ```tsx
  // src/components/Dialog.tsx
  export default function Dialog(props: {
    open: boolean
    onClose: () => void
    children: ReactNode
  }): JSX.Element
  ```

jsdom (Version 30, wie in diesem Projekt installiert) implementiert `HTMLDialogElement.prototype.showModal`/`close` nicht — verifiziert vor Planerstellung (`dialog.showModal is not a function`). Ohne Polyfill kann kein Test, der den Dialog öffnet, funktionieren. Der Polyfill bildet nur das nach, was diese Komponente tatsächlich braucht (das `open`-Attribut setzen/entfernen, ein `close`-Event feuern) — kein Fokus-Trap, keine Es c-Taste, das sind Presentational-Details des echten Browsers, die kein Test dieser Komponente prüft.

- [ ] **Step 1: jsdom-Polyfill ergänzen**

Append to `src/test-setup.ts`:

```ts
// jsdom (v30, as installed in this project) does not implement
// HTMLDialogElement.showModal()/close() — verified directly against the
// installed version before writing this. Without a polyfill, no test that
// opens a <dialog> can run. This reproduces only what Dialog.tsx actually
// needs: the `open` attribute toggling (jsdom already applies the UA rule
// `dialog:not([open]) { display: none }` on top of that, verified
// separately) and a `close` event on programmatic close — not focus-trapping
// or Escape-key handling, which no test here exercises.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `src/components/Dialog.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dialog from './Dialog'

describe('Dialog', () => {
  it('shows its content when open', () => {
    render(
      <Dialog open onClose={() => {}}>
        <p>Inhalt</p>
      </Dialog>,
    )
    expect(screen.getByText('Inhalt')).toBeVisible()
  })

  it('hides its content when not open', () => {
    render(
      <Dialog open={false} onClose={() => {}}>
        <p>Inhalt</p>
      </Dialog>,
    )
    expect(screen.getByText('Inhalt')).not.toBeVisible()
  })

  it('calls onClose when the close button is activated', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose}>
        <p>Inhalt</p>
      </Dialog>,
    )
    screen.getByRole('button', { name: 'Schließen' }).click()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --run src/components/Dialog.test.tsx`
Expected: FAIL — Modul `./Dialog` existiert nicht.

- [ ] **Step 4: Write the implementation**

Create `src/components/Dialog.tsx`:

```tsx
import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Wraps the native <dialog> element instead of building a modal from a div
 * and a state machine: the platform already provides focus-trapping, Escape
 * to close and the ::backdrop pseudo-element. `open` is applied
 * imperatively via showModal()/close() because a plain `open` attribute on
 * <dialog> renders a non-modal dialog with no backdrop at all.
 *
 * The close button sits inside the dialog but is laid out below the card
 * content (see the design spec) — visually a separate circle under the
 * sheet, like the reference design, while staying inside the dialog's own
 * focus trap so Tab never escapes it.
 */
export default function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="rounded-3xl bg-transparent p-0 backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4">{children}</div>
      <button
        type="button"
        onClick={() => ref.current?.close()}
        aria-label="Schließen"
        className="mx-auto mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised text-text"
      >
        ✕
      </button>
    </dialog>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run src/components/Dialog.test.tsx`
Expected: PASS

- [ ] **Step 6: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/test-setup.ts src/components/Dialog.tsx src/components/Dialog.test.tsx
git commit -m "feat: Dialog-Komponente auf Basis des nativen dialog-Elements"
```

---

## Task 6: Abschluss — Gesamtlauf, Bundle, Doku

**Files:**
- Modify: `docs/domaenenmodell.md` (falls relevant — siehe Step 2)
- Modify: `CLAUDE.md` (Abschnitt „Phase 6")

**Interfaces:**
- Consumes: alles Vorherige
- Produces: keine Codeschnittstelle

- [ ] **Step 1: Bundle messen**

```bash
npm run build
```

Erwartung notieren: Tailwind selbst trägt kaum zum Bundle bei (nur die tatsächlich genutzten Utility-Klassen werden generiert), lucide-react wird nur mit den vier importierten Icons gebündelt (kein Barrel-Import des gesamten Icon-Sets). Die tatsächliche Bundle-Größe (Entry-Chunk, CSS-Datei) wörtlich in den Abschlussbericht übernehmen.

- [ ] **Step 2: Domänenmodell prüfen**

`docs/domaenenmodell.md` beschreibt die Datenbank- und Domänenstruktur, nicht das visuelle Design — dieser Plan ändert daran nichts. Nur prüfen, dass das stimmt (keine neue Tabelle, keine neue Spalte in diesem Plan), keine Änderung vornehmen.

- [ ] **Step 3: Status in CLAUDE.md nachziehen**

Im Abschnitt „Phase 6" (bzw. neu anlegen, falls noch nicht vorhanden, analog zum Aufbau der Phase-5-Abschnitte) festhalten: Plan 1 (Fundament) umgesetzt — Tailwind CSS 4.3.3 und lucide-react 1.41.0 installiert, sechs Design-Bausteine (Card/Button-Klassen, Chip, Navigation, Toast, Dialog) stehen, Navigation ist bereits sichtbar umgestellt (schwebende Icon-Pille). Noch offen: die Bereichs-Pläne (Training, Ernährung, Körper, Analyse-Seiten), die diese Bausteine tatsächlich in den Seiten einsetzen. Testzahl und Bundle-Zahlen aus Step 1 mit aufnehmen.

- [ ] **Step 4: Vollständige Prüfung**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
npm run build
```

Erwartet: Lint ohne Fehler und Warnungen, keine Typfehler, alle Tests grün, Build erfolgreich.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Status fuer Phase 6 Plan 1 nachziehen"
```

---

## Self-Review

**Spec-Abdeckung.** Design-Tokens (Spec Abschnitt „Design-Tokens") → Task 1. Karte/Button (Spec „Kernkomponenten") → Task 2. Chip → Task 2. Navigation ohne erhöhten Mittelbutton (Spec „Entschieden") → Task 3. Toast mit Erfolgs-/Fehlervariante (Spec „Toast") → Task 4. Dialog mit nativem `<dialog>`, Blur-Backdrop, Schließen-Button unterhalb der Karte (Spec „Popup / Sheet") → Task 5. Die Farbzuordnung für die 19 Graphen und die Struktur-Änderungen je Bereich (Spec „Farbzuordnung", „Struktur je Bereich") sind **bewusst nicht** Teil dieses Plans — die verbrauchen die hier gebauten Bausteine erst in den folgenden Bereichs-Plänen (Training/Ernährung/Körper/Analyse-Seiten).

**Typkonsistenz.** `ToastProvider`/`useToast` exportieren aus derselben Datei, `AppLayout` importiert beide über einen einzigen Pfad. `Dialog`s Props (`open`, `onClose`, `children`) sind in Interfaces und Implementierung identisch benannt. `Chip`s `active`-Prop ist in Test und Implementierung durchgehend ein zwingendes Boolean, kein optionales Feld — eine vergessene Auswahl soll nicht stillschweigend als „aktiv" gerendert werden.

**Platzhalter-Durchgang.** Kein „TBD", kein „analog zu Task N" ohne ausgeschriebenen Code. Jeder Test- und Implementierungsschritt trägt den vollständigen Code.

**Bewusst offen gelassen für diesen Plan:** die Übergangs-Randfarbe (`#2e303a`) in `index.css` für noch nicht migrierte Formulare/Listen ist ein Literalwert statt eines benannten Tokens, weil sie nicht Teil des Design-Spec-Farbsystems ist — sie verschwindet Seite für Seite, sobald die Bereichs-Pläne die jeweilige Seite auf `cardClass` umstellen. Nicht in diesem Plan behoben: `AppLayout.tsx` bekommt keinen eigenen Test (gab es vorher auch nicht).

# Redesign Phase 2a – Gemeinsame Bausteine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jedes interaktive Element der App bekommt einheitliches GSAP-Tap-Feedback über `Pressable`/`PressableLink`, rohe `<button>` werden per ESLint verboten, `main` reserviert den Nav-Abstand per `--nav-clearance`, `/body` bekommt die neue Zahlen-Typografie, `Dialog` räumt seine Tweens beim Unmount auf.

**Architecture:** `attachPressFeedback(el)` (reine Funktion, lazy GSAP über `loadGsap()`) wird vom Hook `usePressFeedback(ref)` an Elemente gehängt. `Pressable` (button) und `PressableLink` (react-router `Link`) kapseln Hook plus Varianten-Klassen. Die ~64 rohen Buttons und ~40 Links werden per einmaligem Codemod umgestellt, danach erzwingt eine ESLint-Regel das Ergebnis.

**Tech Stack:** React 19, react-router-dom 7, Tailwind 4, GSAP 3 (lazy), Vitest 4 + Testing Library, ESLint 10.

**Spec:** `docs/superpowers/specs/2026-10-13-gemeinsame-bausteine-2a-design.md` (übergeordnet: `docs/superpowers/specs/2026-09-23-visuelles-interaktions-redesign-design.md`)

## Global Constraints

- Alles in Englisch im Code, Dateinamen kebab-case, React-Komponenten PascalCase (Projekt-Konvention); UI-Texte bleiben Deutsch.
- GSAP darf nie im initialen Bundle landen: nur über `loadGsap()` aus `src/lib/gsap-loader.ts` (dynamischer Import). Nach dem Build darf der String „gsap“ im Haupt-Entry-Chunk nicht vorkommen.
- Reduced Motion ist Pflicht: jede Animation prüft `prefersReducedMotion()` (`src/lib/motion.ts`) und fällt auf den statischen Zustand zurück; unter Reduced Motion darf der GSAP-Chunk nicht nachgeladen werden.
- Schlägt `loadGsap()` fehl, bleibt die UI voll funktionsfähig (kein ungefangener Promise-Reject).
- Farben/Marke unverändert: Lila `--color-accent`, Türkis, dunkles Thema.
- Keine Namen von Drittanbieter-Apps in Code, Doku, Commits.
- Tests laufen mit `npx vitest run`; Lint mit `npm run lint`; Typecheck mit `npx tsc -b --noEmit`.
- Commit-Messages enden mit `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Ausführung in einer eigenen Worktree/Branch (`superpowers:using-git-worktrees`), nicht direkt auf `master`.

## Review Focus

- Pointer-Event-Reihenfolge: `pointerup`/`pointercancel` kommt, bevor GSAP geladen ist → Element darf nicht auf 0,96 hängen bleiben (Task 1 pinnt das).
- Unmount mitten im Tap (Element verschwindet beim Klick, z. B. Dialog schließt) → kein Fehler, keine hängenden Tweens (Task 1, Task 5).
- Disabled-Buttons dürfen kein Tap-Feedback zeigen (Task 3).
- Ein vorher implizit als Submit-Button wirkender `<button>` ohne `type` darf seinen Typ nicht ändern: `Pressable` setzt **kein** Default-`type` (Task 3, Task 6).
- Dialog wird unmounted, bevor der GSAP-Chunk geladen ist → kein Tween nach Unmount (Task 5).

## File Structure

| Datei | Verantwortung |
|---|---|
| `src/lib/press-feedback.ts` (neu) | `attachPressFeedback(el)`: Pointer-Listener + GSAP-Tween, Cleanup |
| `src/lib/use-press-feedback.ts` (neu) | Hook + Idle-Vorladen des GSAP-Chunks |
| `src/components/Pressable.tsx` (neu) | `Pressable` (button) und `PressableLink` (Link), Varianten |
| `src/lib/ui-classes.ts` | `buttonDangerClass`, `statClass`, `labelClass`; `active:scale` aus `interactiveClass` entfernt |
| `src/components/Chip.tsx`, `BottomNav.tsx`, `Dialog.tsx` | nutzen Hook/Pressable; Dialog bekommt `gsap.context()`-Cleanup |
| ~25 Seiten/Komponenten | mechanische Umstellung auf `Pressable`/`PressableLink` (Codemod) |
| `eslint.config.js` | `no-restricted-syntax` gegen rohe `<button>` |
| `src/index.css` | `main` nutzt `var(--nav-clearance)` |
| `src/pages/BodyPage.tsx` | `statClass`/`labelClass` |

---

### Task 1: `attachPressFeedback`

**Files:**
- Create: `src/lib/press-feedback.ts`
- Test: `src/lib/press-feedback.test.ts`

**Interfaces:**
- Consumes: `loadGsap(): Promise<Gsap>` aus `src/lib/gsap-loader.ts`, `prefersReducedMotion(): boolean` aus `src/lib/motion.ts`.
- Produces: `attachPressFeedback(el: HTMLElement): () => void` – hängt Listener an und gibt die Cleanup-Funktion zurück.

- [ ] **Step 1: Write the failing test**

`src/lib/press-feedback.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { attachPressFeedback } from './press-feedback'
import { loadGsap } from './gsap-loader'

const gsap = {
  to: vi.fn(),
  killTweensOf: vi.fn(),
  set: vi.fn(),
}
vi.mock('./gsap-loader', () => ({ loadGsap: vi.fn(() => Promise.resolve(gsap)) }))

function stubReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

const flush = () => new Promise((r) => setTimeout(r, 0))

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.mocked(loadGsap).mockImplementation(() => Promise.resolve(gsap as never))
})

describe('attachPressFeedback', () => {
  it('scales down on pointerdown and springs back on pointerup', async () => {
    stubReducedMotion(false)
    const el = document.createElement('button')
    attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    await flush()
    expect(gsap.to).toHaveBeenLastCalledWith(el, expect.objectContaining({ scale: 0.96 }))

    el.dispatchEvent(new Event('pointerup'))
    await flush()
    expect(gsap.to).toHaveBeenLastCalledWith(el, expect.objectContaining({ scale: 1 }))
  })

  it('returns to scale 1 on pointerleave and pointercancel too', async () => {
    stubReducedMotion(false)
    const el = document.createElement('button')
    attachPressFeedback(el)

    for (const type of ['pointerleave', 'pointercancel']) {
      el.dispatchEvent(new Event('pointerdown'))
      el.dispatchEvent(new Event(type))
      await flush()
      expect(gsap.to).toHaveBeenLastCalledWith(el, expect.objectContaining({ scale: 1 }))
    }
  })

  it('never ends scaled down when pointerup arrives before gsap has loaded', async () => {
    stubReducedMotion(false)
    const el = document.createElement('button')
    attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    el.dispatchEvent(new Event('pointerup'))
    await flush()

    const scales = gsap.to.mock.calls.map(([, vars]) => (vars as { scale: number }).scale)
    expect(scales).toEqual([0.96, 1])
  })

  it('does nothing under reduced motion', async () => {
    stubReducedMotion(true)
    const el = document.createElement('button')
    attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    await flush()

    expect(loadGsap).not.toHaveBeenCalled()
    expect(gsap.to).not.toHaveBeenCalled()
  })

  it('stays silent when gsap fails to load', async () => {
    stubReducedMotion(false)
    vi.mocked(loadGsap).mockRejectedValue(new Error('chunk failed'))
    const el = document.createElement('button')
    attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    el.dispatchEvent(new Event('pointerup'))
    await flush()

    expect(gsap.to).not.toHaveBeenCalled()
  })

  it('removes its listeners and resets the element on cleanup', async () => {
    stubReducedMotion(false)
    const el = document.createElement('button')
    const detach = attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    await flush()
    detach()
    await flush()

    expect(gsap.killTweensOf).toHaveBeenCalledWith(el)
    expect(gsap.set).toHaveBeenCalledWith(el, { clearProps: 'scale' })

    gsap.to.mockClear()
    el.dispatchEvent(new Event('pointerdown'))
    await flush()
    expect(gsap.to).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/press-feedback.test.ts`
Expected: FAIL – `Failed to resolve import "./press-feedback"`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/press-feedback.ts`:

```ts
import { loadGsap } from './gsap-loader'
import { prefersReducedMotion } from './motion'

type Gsap = Awaited<ReturnType<typeof loadGsap>>

const PRESSED_SCALE = 0.96

/**
 * Tap feedback for one interactive element: scales down on press, springs
 * back on release. Every event is chained onto one promise so a release that
 * fires before GSAP has finished loading still runs AFTER its press — the
 * element can never end up stuck at PRESSED_SCALE. Reduced motion is read at
 * event time (not at attach time) so toggling the OS setting takes effect
 * without a reload. A failed GSAP load is swallowed: tap feedback is an extra
 * layer, never a precondition for the button working.
 */
export function attachPressFeedback(el: HTMLElement): () => void {
  let gsapInstance: Gsap | null = null
  let chain: Promise<void> = Promise.resolve()
  let detached = false

  function run(animate: (gsap: Gsap) => void) {
    if (prefersReducedMotion()) return
    chain = chain
      .then(() => loadGsap())
      .then((gsap) => {
        if (detached) return
        gsapInstance = gsap
        animate(gsap)
      })
      .catch(() => {})
  }

  const press = () =>
    run((gsap) => gsap.to(el, { scale: PRESSED_SCALE, duration: 0.08, ease: 'power2.out', overwrite: 'auto' }))
  const release = () =>
    run((gsap) => gsap.to(el, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' }))

  el.addEventListener('pointerdown', press)
  el.addEventListener('pointerup', release)
  el.addEventListener('pointerleave', release)
  el.addEventListener('pointercancel', release)

  return () => {
    detached = true
    el.removeEventListener('pointerdown', press)
    el.removeEventListener('pointerup', release)
    el.removeEventListener('pointerleave', release)
    el.removeEventListener('pointercancel', release)
    // Settle after any queued animation so a late tween cannot resurrect itself.
    chain = chain.then(() => {
      if (!gsapInstance) return
      gsapInstance.killTweensOf(el)
      gsapInstance.set(el, { clearProps: 'scale' })
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/press-feedback.test.ts`
Expected: PASS (6 tests). Falls der Test „removes its listeners…" hängt: `detached` wird in `run`s `.then` geprüft – nach `detach()` darf `gsap.to` nicht mehr aufgerufen werden; der Listener ist zudem entfernt.

- [ ] **Step 5: Commit**

```bash
git add src/lib/press-feedback.ts src/lib/press-feedback.test.ts
git commit -m "feat: add attachPressFeedback with lazy gsap tap spring

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `usePressFeedback` + Idle-Vorladen

**Files:**
- Create: `src/lib/use-press-feedback.ts`
- Test: `src/lib/use-press-feedback.test.tsx`

**Interfaces:**
- Consumes: `attachPressFeedback` (Task 1), `loadGsap`, `prefersReducedMotion`.
- Produces: `usePressFeedback(ref: RefObject<HTMLElement | null>): void`.

- [ ] **Step 1: Write the failing test**

`src/lib/use-press-feedback.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useRef } from 'react'

const attach = vi.fn(() => vi.fn())
vi.mock('./press-feedback', () => ({ attachPressFeedback: (el: HTMLElement) => attach(el) }))
const load = vi.fn(() => Promise.resolve({}))
vi.mock('./gsap-loader', () => ({ loadGsap: () => load() }))

function stubReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.useRealTimers()
  vi.resetModules()
})

async function renderProbe() {
  const { usePressFeedback } = await import('./use-press-feedback')
  function Probe() {
    const ref = useRef<HTMLButtonElement>(null)
    usePressFeedback(ref)
    return <button ref={ref}>x</button>
  }
  return render(<Probe />)
}

describe('usePressFeedback', () => {
  it('attaches to the element and detaches on unmount', async () => {
    stubReducedMotion(false)
    const detach = vi.fn()
    attach.mockReturnValueOnce(detach)
    const { unmount, getByRole } = await renderProbe()

    expect(attach).toHaveBeenCalledWith(getByRole('button'))
    unmount()
    expect(detach).toHaveBeenCalledOnce()
  })

  it('preloads the gsap chunk once when the browser is idle', async () => {
    stubReducedMotion(false)
    vi.useFakeTimers()
    await renderProbe()
    await renderProbe()

    vi.advanceTimersByTime(1000)
    expect(load).toHaveBeenCalledOnce()
  })

  it('does not preload under reduced motion', async () => {
    stubReducedMotion(true)
    vi.useFakeTimers()
    await renderProbe()

    vi.advanceTimersByTime(1000)
    expect(load).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/use-press-feedback.test.tsx`
Expected: FAIL – `Failed to resolve import "./use-press-feedback"`.

- [ ] **Step 3: Write minimal implementation**

`src/lib/use-press-feedback.ts`:

```ts
import { useEffect, type RefObject } from 'react'
import { loadGsap } from './gsap-loader'
import { prefersReducedMotion } from './motion'
import { attachPressFeedback } from './press-feedback'

let preloadScheduled = false

/**
 * Warms the GSAP chunk once, after first paint, so the first tap does not wait
 * on the network. Skipped under reduced motion (the chunk would never be used).
 * Idle callback with a timeout fallback: Safari has no requestIdleCallback.
 */
function schedulePreload() {
  if (preloadScheduled || prefersReducedMotion()) return
  preloadScheduled = true
  const idle: (cb: () => void) => unknown =
    typeof window.requestIdleCallback === 'function'
      ? (cb) => window.requestIdleCallback(cb)
      : (cb) => setTimeout(cb, 200)
  idle(() => {
    loadGsap().catch(() => {})
  })
}

export function usePressFeedback(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    schedulePreload()
    return attachPressFeedback(el)
  }, [ref])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/use-press-feedback.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/use-press-feedback.ts src/lib/use-press-feedback.test.tsx
git commit -m "feat: add usePressFeedback hook with idle gsap preload

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `Pressable`, `PressableLink`, Klassen

**Files:**
- Modify: `src/lib/ui-classes.ts`
- Create: `src/components/Pressable.tsx`
- Test: `src/components/Pressable.test.tsx`

**Interfaces:**
- Consumes: `usePressFeedback` (Task 2); `buttonPrimaryClass`, `buttonSecondaryClass`, `interactiveClass` aus `ui-classes.ts`.
- Produces:
  - `buttonDangerClass: string`, `statClass: string`, `labelClass: string` (in `ui-classes.ts`)
  - `type PressableVariant = 'primary' | 'secondary' | 'danger' | 'bare'`
  - `default export Pressable(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: PressableVariant; ref?: Ref<HTMLButtonElement> })`
  - `export function PressableLink(props: ComponentProps<typeof Link> & { variant?: PressableVariant; ref?: Ref<HTMLAnchorElement> })`
  - `Pressable` setzt **kein** Default-`type` (ein Button ohne `type` bleibt Submit wie vorher).

- [ ] **Step 1: Write the failing test**

`src/components/Pressable.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Pressable, { PressableLink } from './Pressable'

const attach = vi.fn(() => vi.fn())
vi.mock('../lib/press-feedback', () => ({ attachPressFeedback: (el: HTMLElement) => attach(el) }))
vi.mock('../lib/gsap-loader', () => ({ loadGsap: () => Promise.resolve({}) }))

describe('Pressable', () => {
  it('renders a button with the variant classes and passes props through', () => {
    const onClick = vi.fn()
    render(
      <Pressable variant="primary" type="submit" className="extra" onClick={onClick}>
        Speichern
      </Pressable>,
    )
    const button = screen.getByRole('button', { name: 'Speichern' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveClass('bg-accent', 'extra')
    button.click()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not invent a type, so a bare button stays a submit button as before', () => {
    render(<Pressable>Ohne Typ</Pressable>)
    expect(screen.getByRole('button')).not.toHaveAttribute('type')
  })

  it.each([
    ['primary', 'bg-accent'],
    ['secondary', 'bg-surface'],
    ['danger', 'text-danger'],
  ] as const)('variant %s carries its look', (variant, cls) => {
    render(<Pressable variant={variant}>x</Pressable>)
    expect(screen.getByRole('button')).toHaveClass(cls)
  })

  it('bare adds no variant classes', () => {
    render(<Pressable className="mine">x</Pressable>)
    expect(screen.getByRole('button').className).toBe('mine')
  })

  it('attaches tap feedback to its element and forwards the ref', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Pressable ref={ref}>x</Pressable>)
    expect(attach).toHaveBeenCalledWith(screen.getByRole('button'))
    expect(ref.current).toBe(screen.getByRole('button'))
  })

  it('keeps disabled buttons inert', () => {
    const onClick = vi.fn()
    render(
      <Pressable disabled onClick={onClick}>
        x
      </Pressable>,
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('PressableLink', () => {
  it('renders a router link with variant classes and tap feedback', () => {
    render(
      <MemoryRouter>
        <PressableLink to="/training" variant="primary">
          Training
        </PressableLink>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Training' })
    expect(link).toHaveAttribute('href', '/training')
    expect(link).toHaveClass('bg-accent')
    expect(attach).toHaveBeenCalledWith(link)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Pressable.test.tsx`
Expected: FAIL – `Failed to resolve import "./Pressable"`.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/ui-classes.ts`: aus `interactiveClass` das Fragment `motion-safe:active:scale-[0.97] ` entfernen (GSAP übernimmt das Skalieren) und anhängen:

```ts
export const interactiveClass =
  'transition duration-150 motion-reduce:transition-none hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

// ... buttonPrimaryClass / buttonSecondaryClass unverändert ...

/** Destructive action (delete, remove): same shape as secondary, danger-colored text. */
export const buttonDangerClass =
  `rounded-2xl border-0 m-0 bg-surface px-4 py-3 font-semibold text-danger disabled:opacity-50 ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`

/** Large figure (weight, PR, calories): bold, tight, digits that do not jump. */
export const statClass = 'text-3xl font-bold tracking-tight tabular-nums'

/** Quiet label above/next to a figure: visibly a different weight than the value. */
export const labelClass = 'text-sm font-medium text-text-muted'
```

Hinweis: `interactiveClass` steht im Kommentar-Block darüber; den Kommentar-Satz über „Skalierung“ auf „Farbe“ kürzen, falls er das `active:scale` erwähnt.

`src/components/Pressable.tsx`:

```tsx
import { useImperativeHandle, useRef, type ButtonHTMLAttributes, type ComponentProps, type Ref } from 'react'
import { Link } from 'react-router-dom'
import { usePressFeedback } from '../lib/use-press-feedback'
import { buttonDangerClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'

export type PressableVariant = 'primary' | 'secondary' | 'danger' | 'bare'

const variantClass: Record<PressableVariant, string> = {
  primary: buttonPrimaryClass,
  secondary: buttonSecondaryClass,
  danger: buttonDangerClass,
  bare: '',
}

function join(variant: PressableVariant, className: string) {
  return [variantClass[variant], className].filter(Boolean).join(' ')
}

type PressableProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PressableVariant
  ref?: Ref<HTMLButtonElement>
}

/**
 * The only place a raw <button> may appear (enforced by ESLint): every
 * interactive element in the app gets the same tap feedback this way. Passes
 * `type` through untouched — a button without one stays a submit button.
 */
export default function Pressable({ variant = 'bare', className = '', ref, ...props }: PressableProps) {
  const inner = useRef<HTMLButtonElement>(null)
  useImperativeHandle(ref, () => inner.current as HTMLButtonElement)
  usePressFeedback(inner)
  // eslint-disable-next-line no-restricted-syntax -- the one sanctioned raw button
  return <button ref={inner} className={join(variant, className)} {...props} />
}

type PressableLinkProps = ComponentProps<typeof Link> & {
  variant?: PressableVariant
  ref?: Ref<HTMLAnchorElement>
}

export function PressableLink({ variant = 'bare', className, ref, ...props }: PressableLinkProps) {
  const inner = useRef<HTMLAnchorElement>(null)
  useImperativeHandle(ref, () => inner.current as HTMLAnchorElement)
  usePressFeedback(inner)
  const resolved = typeof className === 'function' ? className : join(variant, className ?? '')
  return <Link ref={inner} className={resolved} {...props} />
}
```

(Die `eslint-disable`-Zeile ist wirkungslos, bis Task 7 die Regel aktiviert – sie wird dort gebraucht. Falls `react-refresh/only-export-components` wegen des zweiten Exports meckert: `// eslint-disable-next-line react-refresh/only-export-components` über `PressableLink` setzen oder `PressableLink` in eine eigene Datei `PressableLink.tsx` auslagern und den Import in Task 6 entsprechend anpassen.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Pressable.test.tsx src/lib/ui-classes.test.ts` (die zweite Datei nur, falls sie existiert) und `npx vitest run`
Expected: PASS. Falls ein bestehender Test den Klassenstring `active:scale` erwartet: Test auf den neuen Stand anpassen (Skalierung kommt nicht mehr per CSS).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui-classes.ts src/components/Pressable.tsx src/components/Pressable.test.tsx
git commit -m "feat: add Pressable and PressableLink with variants and danger class

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `Chip` und `BottomNav` auf den Hook

**Files:**
- Modify: `src/components/Chip.tsx`, `src/components/BottomNav.tsx`
- Test: `src/components/Chip.test.tsx`, `src/components/BottomNav.test.tsx` (bestehende Dateien ergänzen; falls nicht vorhanden, neu anlegen)

**Interfaces:**
- Consumes: `Pressable` (Task 3), `usePressFeedback` (Task 2).
- Produces: unveränderte öffentliche APIs (`Chip`-Props, `BottomNav`).

- [ ] **Step 1: Write the failing test**

An `src/components/Chip.test.tsx` anhängen (Imports ergänzen: `vi`, `render`, `screen`):

```tsx
vi.mock('../lib/press-feedback', () => ({ attachPressFeedback: vi.fn(() => vi.fn()) }))
vi.mock('../lib/gsap-loader', () => ({ loadGsap: () => Promise.resolve({}) }))

it('attaches tap feedback to the chip', async () => {
  const { attachPressFeedback } = await import('../lib/press-feedback')
  render(<Chip active={false}>Brust</Chip>)
  expect(attachPressFeedback).toHaveBeenCalledWith(screen.getByRole('button', { name: 'Brust' }))
})
```

`src/components/BottomNav.test.tsx` (neu oder ergänzen):

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BottomNav from './BottomNav'
import { attachPressFeedback } from '../lib/press-feedback'

vi.mock('../lib/press-feedback', () => ({ attachPressFeedback: vi.fn(() => vi.fn()) }))
vi.mock('../lib/gsap-loader', () => ({ loadGsap: () => Promise.resolve({}) }))

describe('BottomNav', () => {
  it('attaches tap feedback to every tab', () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>,
    )
    for (const name of ['Home', 'Training', 'Ernährung', 'Körper']) {
      expect(attachPressFeedback).toHaveBeenCalledWith(screen.getByRole('link', { name }))
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Chip.test.tsx src/components/BottomNav.test.tsx`
Expected: FAIL – `attachPressFeedback` wurde nicht aufgerufen.

- [ ] **Step 3: Write minimal implementation**

`Chip.tsx` – `<button>` durch `Pressable variant="bare"` ersetzen (Imports: `Pressable from './Pressable'`):

```tsx
export default function Chip({ active, className = '', ...props }: ChipProps) {
  return (
    <Pressable
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

`BottomNav.tsx` – jeder Tab bekommt eine eigene Komponente, weil ein Hook nicht in `map` stehen darf:

```tsx
import { useRef } from 'react'
import { usePressFeedback } from '../lib/use-press-feedback'

function NavTab({ to, label, icon, end }: (typeof tabs)[number]) {
  const ref = useRef<HTMLAnchorElement>(null)
  usePressFeedback(ref)
  return (
    <NavLink
      ref={ref}
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        `flex h-11 w-11 items-center justify-center rounded-full ${interactiveClass} focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised ${
          isActive ? 'text-accent-text' : 'text-text-muted'
        }`
      }
    >
      {({ isActive }) => <VitaIcon name={icon} tone={isActive ? 'brand' : 'mono'} />}
    </NavLink>
  )
}
```

und im `<nav>`: `{tabs.map((tab) => <NavTab key={tab.to} {...tab} />)}`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Chip.test.tsx src/components/BottomNav.test.tsx` und danach `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Chip.tsx src/components/BottomNav.tsx src/components/Chip.test.tsx src/components/BottomNav.test.tsx
git commit -m "feat: tap feedback on Chip and BottomNav tabs

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `Dialog` – `gsap.context()`-Cleanup und Pressable-Schließen-Button

**Files:**
- Modify: `src/components/Dialog.tsx`
- Test: `src/components/Dialog.test.tsx`

**Interfaces:**
- Consumes: `Pressable` (Task 3), `loadGsap`.
- Produces: unveränderte `Dialog`-API. Intern: ein `gsap.context()` pro Dialog-Instanz, beim Unmount `revert()`.

- [ ] **Step 1: Write the failing test**

In `src/components/Dialog.test.tsx` das `gsap`-Mock-Objekt erweitern:

```tsx
const revert = vi.fn()
const gsap = {
  fromTo: vi.fn(),
  to: vi.fn((_target: unknown, vars: { onComplete?: () => void }) => {
    vars.onComplete?.()
  }),
  context: vi.fn(() => ({ add: (fn: () => void) => fn(), revert })),
}
```

und anhängen:

```tsx
describe('Dialog unmount', () => {
  it('reverts its gsap context when unmounted', async () => {
    stubReducedMotion(false)
    const { unmount } = render(
      <Dialog open onClose={() => {}}>
        <p>Inhalt</p>
      </Dialog>,
    )
    await waitFor(() => expect(gsap.fromTo).toHaveBeenCalledOnce())

    unmount()

    expect(revert).toHaveBeenCalledOnce()
  })

  it('does not animate when unmounted before gsap has loaded', async () => {
    stubReducedMotion(false)
    let resolveLoad: (g: typeof gsap) => void = () => {}
    vi.mocked(loadGsap).mockReturnValueOnce(new Promise((r) => (resolveLoad = r)) as never)

    const { unmount } = render(
      <Dialog open onClose={() => {}}>
        <p>Inhalt</p>
      </Dialog>,
    )
    unmount()
    resolveLoad(gsap)
    await new Promise((r) => setTimeout(r, 0))

    expect(gsap.fromTo).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Dialog.test.tsx`
Expected: FAIL – `revert` wurde nicht aufgerufen, `fromTo` lief nach Unmount.

- [ ] **Step 3: Write minimal implementation**

In `Dialog.tsx` Imports ergänzen (`Pressable from './Pressable'`) und die Animationen über einen Kontext führen:

```tsx
type Gsap = Awaited<ReturnType<typeof loadGsap>>
type GsapContext = { add: (fn: () => void) => unknown; revert: () => void }

// in der Komponente:
const ctxRef = useRef<GsapContext | null>(null)
const disposedRef = useRef(false)

useEffect(() => {
  disposedRef.current = false
  return () => {
    disposedRef.current = true
    ctxRef.current?.revert()
    ctxRef.current = null
  }
}, [])

function animate(run: (gsap: Gsap) => void) {
  return loadGsap().then((gsap) => {
    if (disposedRef.current) return
    ctxRef.current ??= gsap.context(() => {}) as GsapContext
    ctxRef.current.add(() => run(gsap))
  })
}
```

`closeAnimated` und der Öffnen-Pfad rufen `animate((gsap) => gsap.to(...))` bzw. `animate((gsap) => gsap.fromTo(...))` statt `loadGsap().then(...)`; die bestehenden `.catch`-Zweige (`dialog.close()` beim Schließen, `() => {}` beim Öffnen) bleiben. Der Schließen-Button wird zu:

```tsx
<Pressable
  type="button"
  onClick={closeAnimated}
  aria-label="Schließen"
  className="mx-auto mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised text-text"
>
  <VitaIcon name="close" size={20} />
</Pressable>
```

Wichtig: `revert()` läuft nur beim Unmount, nie zwischen Öffnen und Schließen (ein `revert()` nach dem Öffnen-Tween würde den Inhalt wieder auf `opacity: 0` setzen).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Dialog.test.tsx` und `npx vitest run`
Expected: PASS (die bestehenden 7 Dialog-Tests bleiben grün).

- [ ] **Step 5: Commit**

```bash
git add src/components/Dialog.tsx src/components/Dialog.test.tsx
git commit -m "feat: revert Dialog's gsap context on unmount, close button via Pressable

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Alle Aufrufstellen auf `Pressable`/`PressableLink` umstellen (Codemod)

**Files:**
- Create (nur im Scratchpad, nicht im Repo): `codemod-pressable.mjs`
- Modify: alle `src/**/*.tsx` (ohne Tests und ohne `Pressable.tsx`), die `<button` oder `<Link` enthalten (~25 Dateien)

**Interfaces:**
- Consumes: `Pressable`, `PressableLink`, `PressableVariant` (Task 3).
- Produces: keine rohen `<button>` mehr außerhalb von `Pressable.tsx`; alle `<Link>` sind `<PressableLink>`.

- [ ] **Step 1: Codemod schreiben**

`codemod-pressable.mjs` (im Scratchpad-Ordner der Session; Aufruf mit dem Repo-Root als Argument):

```js
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { relative, dirname, sep } from 'node:path'

const root = process.argv[2]
const files = readdirSync(`${root}/src`, { recursive: true })
  .map((f) => `src/${String(f).split(sep).join('/')}`)
  .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx') && !f.endsWith('/Pressable.tsx'))

/** End index of the opening tag starting at `start`, skipping braces and quotes. */
function tagEnd(src, start) {
  let depth = 0
  let quote = null
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (quote) {
      if (c === quote && src[i - 1] !== '\\') quote = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') quote = c
    else if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === '>' && depth === 0) return i
  }
  throw new Error('unterminated tag')
}

function variantOf(tag) {
  const mapped = [
    [/\s+className=\{buttonPrimaryClass\}/, 'primary', ''],
    [/\s+className=\{buttonSecondaryClass\}/, 'secondary', ''],
    [/\s+className=\{`w-full \$\{buttonSecondaryClass\}`\}/, 'secondary', ' className="w-full"'],
    [/\s+className=\{`w-full \$\{buttonPrimaryClass\}`\}/, 'primary', ' className="w-full"'],
  ]
  for (const [re, variant, extra] of mapped) {
    if (re.test(tag)) return { tag: tag.replace(re, extra), variant }
  }
  return { tag, variant: 'bare' }
}

let touched = 0
for (const file of files) {
  const path = `${root}/${file}`
  let src = readFileSync(path, 'utf8')
  if (!/<button\b|<Link\b/.test(src)) continue
  const original = src

  for (const [open, close, name] of [
    ['<button', '</button>', 'Pressable'],
    ['<Link', '</Link>', 'PressableLink'],
  ]) {
    let out = ''
    let pos = 0
    while (true) {
      const i = src.indexOf(open, pos)
      if (i === -1) break
      const after = src[i + open.length]
      if (after && /[A-Za-z0-9]/.test(after)) { out += src.slice(pos, i + open.length); pos = i + open.length; continue }
      const end = tagEnd(src, i)
      const selfClosing = src[end - 1] === '/'
      const tag = src.slice(i + open.length, selfClosing ? end - 1 : end)
      const { tag: rest, variant } = variantOf(tag)
      const variantAttr = variant === 'bare' ? '' : ` variant="${variant}"`
      out += src.slice(pos, i) + `<${name}${variantAttr}${rest}${selfClosing ? ' /' : ''}>`
      pos = end + 1
    }
    src = out + src.slice(pos)
    src = src.split(close).join(`</${name}>`)
  }

  const rel = relative(dirname(file), 'src/components').split(sep).join('/')
  const importPath = rel === '' ? './Pressable' : `${rel}/Pressable`
  const imp =
    /<Pressable\b/.test(src) && /<PressableLink\b/.test(src)
      ? `import Pressable, { PressableLink } from '${importPath}'`
      : /<Pressable\b/.test(src)
        ? `import Pressable from '${importPath}'`
        : `import { PressableLink } from '${importPath}'`
  // insert after the last import statement
  const lastImport = [...src.matchAll(/^import .*$/gm)].pop()
  src = src.slice(0, lastImport.index + lastImport[0].length) + '\n' + imp + src.slice(lastImport.index + lastImport[0].length)

  // drop now-unused names from existing imports
  if (!/\bLink\b(?!\w)/.test(src.replace(/import .*react-router-dom.*/g, ''))) {
    src = src.replace(/(import \{[^}]*)\bLink,\s*/, '$1').replace(/(import \{[^}]*),\s*Link\b/, '$1').replace(/import \{\s*Link\s*\} from 'react-router-dom'\n/, '')
  }
  for (const name of ['buttonPrimaryClass', 'buttonSecondaryClass']) {
    const body = src.replace(/import .*ui-classes.*\n/, '')
    if (!new RegExp(`\\b${name}\\b`).test(body)) {
      src = src.replace(new RegExp(`(import \\{[^}]*)\\b${name},\\s*`), '$1').replace(new RegExp(`(import \\{[^}]*),\\s*${name}\\b`), '$1')
    }
  }
  if (src !== original) { writeFileSync(path, src); touched++; console.log('migrated', file) }
}
console.log(`done: ${touched} files`)
```

(Der Codemod ist ein Werkzeug für genau diesen einen Lauf. Der Implementierer prüft das Ergebnis per Diff; sollte eine Heuristik an einer Stelle danebenliegen, wird diese Stelle von Hand korrigiert, nicht der Codemod verallgemeinert.)

- [ ] **Step 2: Codemod ausführen und Diff prüfen**

Run: `node <scratchpad>/codemod-pressable.mjs .` (aus dem Worktree-Root), danach `git diff --stat | tail -3` und `git diff` stichprobenartig in drei Dateien (z. B. `TrainingPage.tsx`, `AddEntryFlow.tsx`, `WorkoutSessionPage.tsx`).
Expected: ~25 Dateien geändert; keine `<button` / `<Link` mehr außer in `Pressable.tsx`: prüfen mit
`grep -rn "<button\|<Link" src --include=*.tsx | grep -v "test.tsx" | grep -v "Pressable.tsx"` → leer. `NavLink` in `BottomNav.tsx` bleibt (Task 4).

- [ ] **Step 3: Typecheck und Tests**

Run: `npx tsc -b --noEmit` und `npx vitest run`
Expected: sauber/grün. Typische Nacharbeit: (a) ein Import-Pfad, den die Heuristik falsch gesetzt hat; (b) ein Test, der `vi.mock('react-router-dom', …)` ohne `Link`-Export nutzt – dort den Mock um `Link` ergänzen oder `PressableLink` mocken; (c) ein Button, der jetzt zusätzlich die Variante-Klassen bekommt, obwohl er vorher eigene Klassen mit `buttonSecondaryClass` mischte (`className={\`x ${buttonSecondaryClass}\`}` ohne `w-full`) – von Hand auf `variant="secondary" className="x"` umstellen.

- [ ] **Step 4: Destruktive Aktionen auf `danger` umstellen**

Run: `grep -rn "Löschen\|Entfernen\|Konto löschen" src --include=*.tsx | grep -v test | grep -i "pressable"` und die zugehörigen `<Pressable variant="secondary">`-Stellen, deren sichtbarer Text eine Löschung/Entfernung beschreibt (Foto löschen, Eintrag löschen, Plan löschen, Übung entfernen, Konto löschen), auf `variant="danger"` ändern. Aktivieren/Speichern/Abbrechen bleiben `primary`/`secondary`.
Expected: `npx vitest run` weiterhin grün (Tests suchen per Rolle und Namen, nicht per Klasse).

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "refactor: migrate all buttons and links to Pressable/PressableLink

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: ESLint-Regel gegen rohe `<button>`

**Files:**
- Modify: `eslint.config.js`
- Create (temporär): `src/__lint_fixture__.tsx` (nur zum RED-Nachweis, wird wieder gelöscht)

**Interfaces:**
- Consumes: Ergebnis von Task 6 (keine rohen Buttons mehr).
- Produces: Lint-Fehler `no-restricted-syntax` bei `<button>` außerhalb von `Pressable.tsx` und Testdateien.

- [ ] **Step 1: RED – Regel zuerst nachweisen**

Temporäre Datei `src/__lint_fixture__.tsx`:

```tsx
export const Raw = () => <button type="button">x</button>
```

Run: `npm run lint`
Expected: bisher **kein** Fehler für diese Datei (Regel existiert noch nicht) – das ist der RED-Beleg.

- [ ] **Step 2: Regel eintragen**

In `eslint.config.js` nach dem bestehenden Objekt ergänzen:

```js
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/components/Pressable.tsx', '**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='button']",
          message: 'Use <Pressable> from components/Pressable instead of a raw <button> (shared tap feedback).',
        },
      ],
    },
  },
```

Die `eslint-disable-next-line no-restricted-syntax`-Zeile in `Pressable.tsx` (Task 3) wird damit überflüssig, weil die Datei in `ignores` steht; entfernen, sonst meldet ESLint ggf. „unused disable directive“.

- [ ] **Step 3: GREEN – Regel greift**

Run: `npm run lint`
Expected: Fehler `no-restricted-syntax` **nur** in `src/__lint_fixture__.tsx`, sonst keine.

- [ ] **Step 4: Fixture löschen, Lint sauber**

Run: `rm src/__lint_fixture__.tsx && npm run lint`
Expected: sauber.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js src/components/Pressable.tsx
git commit -m "chore: forbid raw <button> via eslint, Pressable is the sanctioned wrapper

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `main` nutzt `--nav-clearance`

**Files:**
- Modify: `src/index.css:158-161`
- Test: `src/lib/nav-clearance.test.ts` (neu)

**Interfaces:**
- Consumes: bestehender Token `--nav-clearance` (`src/index.css`).
- Produces: `main` reserviert unten genau diesen Abstand.

- [ ] **Step 1: Write the failing test**

`src/lib/nav-clearance.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('nav clearance', () => {
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

  it('reserves the nav band at the bottom of main via the shared token', () => {
    const main = css.match(/\n\s*main\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(main).toContain('var(--nav-clearance)')
  })

  it('does not keep a second, hand-written copy of the nav height in main', () => {
    const main = css.match(/\n\s*main\s*\{([^}]*)\}/)?.[1] ?? ''
    expect(main).not.toMatch(/4rem/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/nav-clearance.test.ts`
Expected: FAIL – `main` enthält `4rem`, nicht den Token.

- [ ] **Step 3: Write minimal implementation**

In `src/index.css`:

```css
  main {
    flex: 1;
    padding: 0 16px var(--nav-clearance);
  }
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/nav-clearance.test.ts` und `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/lib/nav-clearance.test.ts
git commit -m "fix: main reserves the shared --nav-clearance instead of a hand-written copy

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: `/body` mit `statClass` und `labelClass`

**Files:**
- Modify: `src/pages/BodyPage.tsx:82-90` (+ Import)
- Test: `src/pages/BodyPage.test.tsx`

**Interfaces:**
- Consumes: `statClass`, `labelClass` (Task 3).
- Produces: Messwert-Karten auf `/body` mit der neuen Hierarchie.

- [ ] **Step 1: Write the failing test**

In `src/pages/BodyPage.test.tsx` im Block `describe('BodyPage', …)` ergänzen:

```tsx
  it('renders the figure large with tabular digits and the label as a quieter, separate weight', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())
    zeigeDashboard()

    const wert = screen.getByTestId('wert-gewicht')
    expect(wert).toHaveClass('tabular-nums', 'font-bold')
    expect(screen.getByText('Gewicht (kg)')).toHaveClass('text-text-muted', 'font-medium')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/BodyPage.test.tsx -t "tabular digits"`
Expected: FAIL – der Wert hat `font-semibold`, kein `tabular-nums`.

- [ ] **Step 3: Write minimal implementation**

In `BodyPage.tsx` Import erweitern: `import { cardClass, labelClass, statClass, stickyActionClass } from '../lib/ui-classes'` (`buttonPrimaryClass` entfällt, falls Task 6 es nicht schon entfernt hat – dort wurde `className={\`${buttonPrimaryClass} ${stickyActionClass}\`}` ggf. zu `variant="primary" className={stickyActionClass}`; Zustand vor dem Edit prüfen). Dann:

```tsx
<span className={labelClass}>{FIELD_LABELS[field]}</span>
<span className={statClass} data-testid={`wert-${field}`}>
  {latest == null ? '—' : `${formatValue(latest.value)} ${unitOf(field)}`}
</span>
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/pages/BodyPage.test.tsx` und `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/BodyPage.tsx src/pages/BodyPage.test.tsx
git commit -m "feat: stat and label typography on /body

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Gesamtverifikation, Browser-Prüfung, Doku

**Files:**
- Modify: `CLAUDE.md` (Status-Abschnitt), ggf. `docs/` (Wiki-Spiegel gemäß Projekt-Memory „Wiki & domain model upkeep": keine Migration, nur Wiki-Seite für Phase 2a ergänzen)

**Interfaces:**
- Consumes: alle vorherigen Tasks.
- Produces: verifizierter, dokumentierter Branch, bereit für PR.

- [ ] **Step 1: Voll-Verifikation**

Run: `npx vitest run`, `npm run lint`, `npx tsc -b --noEmit`, `npm run build`
Expected: alles grün/sauber. Im Build: `dist/assets/gsap-*.js` liegt als eigener Chunk vor, und der String „gsap“ kommt im Haupt-Entry-Chunk (`dist/assets/index-*.js`) **null** Mal vor (`grep -c gsap dist/assets/index-*.js` → `0`). Der Volllauf kann unter Last sporadisch zwei Chart-Tests (`HomeAnalysisPage`, `HomeChartList`) verlieren (bekannter Last-Flake) – dann diese beiden Dateien einzeln erneut laufen lassen.

- [ ] **Step 2: Browser-Prüfung mit `playwright-cli`, 390-px-Viewport**

Die Worktree hat keine echte `.env`; wie bei Phase 1 eine synthetische Supabase-Session in `localStorage` setzen (Schlüssel `sb-xxxxx-auth-token`), damit `ProtectedRoute` passiert wird. Prüfen und Werte notieren:
1. `/body`: „Heute eintragen“-Button liegt oberhalb der Nav (Bounding-Boxes ohne Überlappung), Messwerte in der neuen Typografie.
2. Tap-Feedback: während `pointerdown` auf einem Button ein `transform: matrix(0.96, …)` messen (Sampling per `page.evaluate`), nach `pointerup` zurück auf `1`.
3. `page.emulateMedia({ reducedMotion: 'reduce' })`: kein Request auf `gsap-*.js`, Buttons funktionieren.
4. Dialog öffnen/schließen funktioniert weiterhin (Phase-1-Verhalten).
Test-Artefakte (`.env`, Screenshots, `.playwright-cli/`) danach entfernen.

- [ ] **Step 3: Status dokumentieren**

In `CLAUDE.md` unter „Status / Fortschritt“ einen Absatz „Redesign Phase 2a – Gemeinsame Bausteine“ ergänzen (Spec/Plan-Pfade, Ergebnis der Verifikation, Testzahlen, offene Folgepunkte 2b–2d, Vorhaben B). Wiki-Seite gemäß Projekt-Konvention spiegeln.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs
git commit -m "docs: record redesign phase 2a as implemented and verified

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Branch abschließen**

`superpowers:requesting-code-review` (Whole-Branch-Review) und danach `superpowers:finishing-a-development-branch` (PR anlegen; Merge und `firebase deploy` führt der Nutzer aus bzw. gibt sie frei).

---

## Self-Review (gegen die Spec)

- **Abschnitt 1 (Pressable/Tap-Feedback):** `attachPressFeedback` (Task 1), Hook + Idle-Preload (Task 2), `Pressable`/`PressableLink` + vier Varianten + `active:scale` raus (Task 3), `Chip`/`BottomNav` (Task 4), Migration aller Stellen inkl. Parallel-Aktionen/Danger (Task 6), ESLint (Task 7). ✔
- **Abschnitt 2:** `main` + `--nav-clearance` (Task 8), `statClass`/`labelClass` auf `/body` (Task 3 + 9), `gsap.context()`-Cleanup (Task 5). ✔
- **Tests/Verifikation der Spec:** Vitest je Baustein, ESLint-RED/GREEN (Task 7), `playwright-cli` bei 390 px inkl. Reduced Motion (Task 10), Live-Verifikation nach Deploy (nach dem PR, im Abschluss-Schritt). ✔
- **Abweichung von der Spec (bewusst):** Die Spec nannte das Ref-Weiterreichen als Testfall; das ist über `useImperativeHandle` umgesetzt (Task 3). Der Spec-Satz „`bare` ohne Feedback gibt es nicht“ gilt unverändert – `bare` meint nur „keine Variantenklassen“, Tap-Feedback hat jede Variante.
- **Typkonsistenz:** `attachPressFeedback(el): () => void` (Task 1) wird in Task 2 genutzt; `usePressFeedback(ref)` (Task 2) in Task 3/4/5; `PressableVariant`, `buttonDangerClass`, `statClass`, `labelClass` (Task 3) in Task 6/9. ✔
- **Platzhalter-Scan:** keiner; der Codemod in Task 6 ist vollständig ausgeschrieben. Task 6 verlangt ausdrücklich die Diff-Prüfung, weil mechanische Umstellungen Randfälle haben.

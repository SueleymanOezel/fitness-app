# Redesign-Fundament (Visuelles & Interaktions-Redesign, Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared infrastructure the rest of the VitaLoop redesign depends on — reduced-motion detection, a lazy-loaded GSAP accessor, and a systemic fix for the P0 bottom-nav-overlap bug — and prove the nav-overlap fix on its one known real instance (`/body`'s "Heute eintragen" button).

**Architecture:** Five small, independent-where-possible units: a synchronous `prefersReducedMotion()` check, a single dynamic-import wrapper around GSAP so it never enters the initial bundle, a CSS custom property (`--nav-clearance`) that is the one place the bottom nav's box size is expressed as a length, a Tailwind class recipe (`stickyActionClass`) built on that property, and an extension of the existing `Dialog` component to animate its open/close through GSAP while collapsing to the current instant behavior under reduced motion.

**Tech Stack:** React + TypeScript + Vite + Tailwind v4 (existing). GSAP (new dependency, this plan installs it). Vitest + Testing Library (existing).

**Spec:** `docs/superpowers/specs/2026-09-23-visuelles-interaktions-redesign-design.md`

**Deliberate scope note:** the spec's Foundation bullet also names typography-scale tokens (tabular numerals, weight hierarchy) and the single-accent-color-lock cleanup across existing inconsistent buttons. This plan does not cover those two: unlike the nav-clearance fix and the motion system, they have no natural shared-infrastructure home with a clean API surface — applying them meaningfully requires looking at each screen's real numbers/labels/buttons, which Phase 2 does anyway. They are Phase 2 work, applied directly against the highest-impact screens, not abstracted here.

## Global Constraints

- Brand is fixed: existing logo, product name "VitaLoop", and the existing purple/teal accent colors do not change in this plan.
- Performance/bundle size is an explicit priority: GSAP must never be part of the app's initial bundle. Every use goes through the single `loadGsap()` dynamic import added in Task 2.
- Every GSAP-driven animation must collapse to an instant, non-animated state when `prefersReducedMotion()` is true. This is not optional.
- Mobile is the primary target platform; no desktop-specific layout work is in scope for this plan.
- This plan does not touch `lang="en"`, form validation, string formatting, or any of the other Vorhaben-B findings — those are a separate, unrelated bounded task.

---

### Task 1: Reduced-motion detection

**Files:**
- Modify: `src/test-setup.ts`
- Create: `src/lib/motion.ts`
- Test: `src/lib/motion.test.ts`

**Interfaces:**
- Produces: `prefersReducedMotion(): boolean` — a synchronous check, read once at the moment an animation would start (not a subscribing hook; nothing in this plan needs to react to the setting changing mid-session).

- [ ] **Step 1: Add a `window.matchMedia` polyfill to the shared test setup**

jsdom (as installed in this project) does not implement `window.matchMedia` at all. Add it to `src/test-setup.ts`, following the existing `ResizeObserver` polyfill's style in the same file (a guarded default, with a comment explaining the default's value):

```ts
// jsdom (v30, as installed in this project) does not implement
// window.matchMedia at all. Defaulting to "matches: true" (reduced motion
// IS requested) rather than false means every existing component test that
// renders something animatable keeps exercising today's synchronous,
// no-animation code path without changes — only a test that specifically
// wants to exercise an animated path needs to stub this itself (see
// src/lib/motion.test.ts and Dialog.test.tsx for examples).
window.matchMedia ??= function (query: string): MediaQueryList {
  return {
    matches: true,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }
}
```

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/motion.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { prefersReducedMotion } from './motion'

function stubMatchMedia(matches: boolean) {
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
})

describe('prefersReducedMotion', () => {
  it('returns true when the user has requested reduced motion', () => {
    stubMatchMedia(true)
    expect(prefersReducedMotion()).toBe(true)
  })

  it('returns false when the user has not requested reduced motion', () => {
    stubMatchMedia(false)
    expect(prefersReducedMotion()).toBe(false)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/motion.test.ts`
Expected: FAIL with "Failed to resolve import './motion'" (the module does not exist yet).

- [ ] **Step 4: Write the minimal implementation**

```ts
// src/lib/motion.ts
/**
 * A single, synchronous check rather than a subscribing hook: every caller
 * in this codebase reads it once, at the moment an animation would start,
 * not continuously while mounted. Add a reactive hook only if a future
 * caller actually needs to respond to the setting changing mid-session.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/motion.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/test-setup.ts src/lib/motion.ts src/lib/motion.test.ts
git commit -m "feat: add prefersReducedMotion utility with jsdom matchMedia polyfill"
```

---

### Task 2: Lazy-loaded GSAP accessor

**Files:**
- Modify: `package.json` (new dependency)
- Create: `src/lib/gsap-loader.ts`
- Test: `src/lib/gsap-loader.test.ts`

**Interfaces:**
- Produces: `loadGsap(): Promise<typeof gsap>` — the one and only place in the codebase that imports `gsap`. Every later task that needs GSAP calls this instead of importing `gsap` directly, so there is exactly one dynamic import to mock in tests and exactly one place that could ever pull GSAP into a bundle chunk.

- [ ] **Step 1: Install GSAP**

Run: `npm install gsap`

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/gsap-loader.test.ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('gsap', () => ({ gsap: { to: vi.fn(), fromTo: vi.fn() } }))

import { loadGsap } from './gsap-loader'

describe('loadGsap', () => {
  it('resolves the gsap instance via a dynamic import', async () => {
    const gsap = await loadGsap()
    expect(gsap.to).toBeInstanceOf(Function)
    expect(gsap.fromTo).toBeInstanceOf(Function)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/gsap-loader.test.ts`
Expected: FAIL with "Failed to resolve import './gsap-loader'" (the module does not exist yet).

- [ ] **Step 4: Write the minimal implementation**

```ts
// src/lib/gsap-loader.ts
/**
 * GSAP is loaded on demand, never from the app's initial bundle: most pages
 * never trigger an animation, and the app already carries a documented
 * bundle-size warning (see CLAUDE.md, "Vor dem Live-Gang"). Every caller
 * goes through this one function, so there is exactly one dynamic import to
 * mock in tests and exactly one place GSAP can ever enter a bundle chunk.
 */
export async function loadGsap() {
  const { gsap } = await import('gsap')
  return gsap
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/gsap-loader.test.ts`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/gsap-loader.ts src/lib/gsap-loader.test.ts
git commit -m "feat: add lazy-loaded gsap accessor"
```

---

### Task 3: Nav-clearance token and sticky-action class

**Files:**
- Modify: `src/index.css`
- Modify: `src/lib/ui-classes.ts`
- Test: `src/lib/ui-classes.test.ts`

**Interfaces:**
- Consumes: nothing new (references the existing `BottomNav` box size, see comment below, but does not import from `BottomNav.tsx`).
- Produces: `stickyActionClass: string` — a Tailwind class recipe any page can add to a primary action button so it sticks just above the floating bottom nav once the page scrolls that far, instead of scrolling into the nav's own fixed band. Depends on the CSS custom property `--nav-clearance`.

- [ ] **Step 1: Add the `--nav-clearance` custom property**

In `src/index.css`, inside the existing `:root { ... }` block (the one that currently sets `font`, `letter-spacing`, `color-scheme` — not the `@theme` block above it, since this value does not need to generate a Tailwind color/spacing utility, only to be referenced via an arbitrary value), add:

```css
  /*
   * Matches BottomNav's own box exactly (src/components/BottomNav.tsx):
   * bottom-4 (1rem gap from the viewport edge) + p-2's top padding (0.5rem)
   * + h-11 icon height (2.75rem) + the nav's own bottom padding, which is
   * at least 0.5rem and grows with env(safe-area-inset-bottom) on notched
   * phones, plus a 0.5rem buffer. If BottomNav's own sizing classes ever
   * change, this value must change with them — there is no shared source of
   * truth between the two other than this comment.
   */
  --nav-clearance: calc(
    1rem + 0.5rem + 2.75rem + max(0.5rem, env(safe-area-inset-bottom)) + 0.5rem
  );
```

- [ ] **Step 2: Write the failing test**

```ts
// Add to src/lib/ui-classes.test.ts, inside the existing describe('ui-classes', ...) block
it('keeps a bottom-anchored primary action above the floating nav', () => {
  expect(stickyActionClass).toContain('sticky')
  expect(stickyActionClass).toContain('bottom-[var(--nav-clearance)]')
})
```

Also add `stickyActionClass` to the existing import line at the top of the file:

```ts
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  cardClass,
  inputClass,
  interactiveClass,
  stickyActionClass,
} from './ui-classes'
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/ui-classes.test.ts`
Expected: FAIL with "does not provide an export named 'stickyActionClass'"

- [ ] **Step 4: Write the minimal implementation**

In `src/lib/ui-classes.ts`, add:

```ts
/**
 * For a primary action that would otherwise sit low enough on a page to
 * collide with the floating bottom nav (see the P0 finding in
 * .impeccable/critique/2026-09-23T00-41-12Z__vitaloop-web-app.md — /body's
 * "Heute eintragen" button was 57-69% hidden behind the nav at initial
 * page load). Sticks the action to `--nav-clearance` (src/index.css) from
 * the bottom of the viewport once the page scrolls that far, instead of
 * letting it scroll into the nav's own fixed band.
 */
export const stickyActionClass = 'sticky bottom-[var(--nav-clearance)] z-10'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/ui-classes.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/lib/ui-classes.ts src/lib/ui-classes.test.ts
git commit -m "feat: add nav-clearance token and stickyActionClass"
```

---

### Task 4: Fix the P0 nav-overlap on `/body`'s primary action

**Files:**
- Modify: `src/pages/BodyPage.tsx`
- Test: `src/pages/BodyPage.test.tsx`

**Interfaces:**
- Consumes: `stickyActionClass` from `../lib/ui-classes` (Task 3).

- [ ] **Step 1: Write the failing test**

Add to `src/pages/BodyPage.test.tsx`, inside the existing `describe('BodyPage', ...)` block:

```ts
it('keeps the primary action stuck above the bottom nav instead of sitting in normal page flow', () => {
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseBodyMetrics.mockReturnValue(metricsResult())

  zeigeDashboard()

  const button = screen.getByRole('button', { name: 'Heute eintragen' })
  expect(button).toHaveClass('sticky')
  expect(button.className).toContain('bottom-[var(--nav-clearance)]')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/BodyPage.test.tsx -t "keeps the primary action stuck"`
Expected: FAIL (button has no `sticky` class yet)

- [ ] **Step 3: Apply the fix**

In `src/pages/BodyPage.tsx`, update the import and the button:

```ts
import { cardClass, buttonPrimaryClass, stickyActionClass } from '../lib/ui-classes'
```

```tsx
<button
  type="button"
  className={`${buttonPrimaryClass} ${stickyActionClass}`}
  onClick={() => setFormOpen(true)}
>
  <span className="inline-flex items-center justify-center gap-2">
    <VitaIcon name="measurement" tone="mono" size={20} />
    Heute eintragen
  </span>
</button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/BodyPage.test.tsx`
Expected: PASS (all tests in the file — confirms the new class did not break any existing BodyPage assertion)

- [ ] **Step 5: Commit**

```bash
git add src/pages/BodyPage.tsx src/pages/BodyPage.test.tsx
git commit -m "fix: keep /body's primary action above the bottom nav (P0 critique finding)"
```

---

### Task 5: Animated Dialog open/close

**Files:**
- Modify: `src/components/Dialog.tsx`
- Modify: `src/components/Dialog.test.tsx`

**Interfaces:**
- Consumes: `loadGsap()` from `../lib/gsap-loader` (Task 2), `prefersReducedMotion()` from `../lib/motion` (Task 1).
- Produces: no change to `Dialog`'s public props (`open: boolean`, `onClose: () => void`, `children: ReactNode`) — every existing call site across the app keeps working unchanged.

- [ ] **Step 1: Write the failing tests**

In `src/components/Dialog.test.tsx`, replace the file's existing top-of-file import lines (`import { describe, expect, it, vi } from 'vitest'` and `import { render, screen } from '@testing-library/react'`) with the block below, keep the three existing `it(...)` tests exactly as they are (do not edit their bodies — they must still pass unmodified, since the default `matchMedia` stub from Task 1 reports reduced motion and every animated branch collapses to today's synchronous behavior under that default), and append the new `describe('Dialog animation', ...)` block after them:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Dialog from './Dialog'

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn(),
    to: vi.fn((_target: unknown, vars: { onComplete?: () => void }) => {
      vars.onComplete?.()
    }),
  },
}))

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
})

// ... existing three tests stay here, unmodified ...

describe('Dialog animation', () => {
  it('animates in via gsap when the user has not requested reduced motion', async () => {
    stubReducedMotion(false)
    const { gsap } = await import('gsap')

    render(
      <Dialog open onClose={() => {}}>
        <p>Inhalt</p>
      </Dialog>,
    )

    await waitFor(() => expect(gsap.fromTo).toHaveBeenCalledOnce())
  })

  it('animates out via gsap before closing when the user has not requested reduced motion', async () => {
    stubReducedMotion(false)
    const onClose = vi.fn()

    render(
      <Dialog open onClose={onClose}>
        <p>Inhalt</p>
      </Dialog>,
    )

    screen.getByRole('button', { name: 'Schließen' }).click()

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Dialog.test.tsx`
Expected: FAIL — the two new tests fail because `Dialog.tsx` never calls `gsap.fromTo`/`gsap.to` yet. The three original tests still PASS (nothing about them changed).

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/Dialog.tsx
import { useEffect, useRef, type ReactNode } from 'react'
import { VitaIcon } from './icons/VitaIcon'
import { loadGsap } from '../lib/gsap-loader'
import { prefersReducedMotion } from '../lib/motion'

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
 *
 * Open/close animate via a lazily-loaded GSAP (src/lib/gsap-loader.ts) and
 * collapse to the plain instant show/hide under prefers-reduced-motion
 * (src/lib/motion.ts) — see docs/superpowers/specs/2026-09-23-visuelles-
 * interaktions-redesign-design.md, "Motion-Architektur".
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
  const contentRef = useRef<HTMLDivElement>(null)

  function closeAnimated() {
    const dialog = ref.current
    const content = contentRef.current
    if (!dialog || !dialog.open) return
    if (!content || prefersReducedMotion()) {
      dialog.close()
      return
    }
    loadGsap().then((gsap) => {
      gsap.to(content, {
        opacity: 0,
        scale: 0.95,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => dialog.close(),
      })
    })
  }

  useEffect(() => {
    const dialog = ref.current
    const content = contentRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      if (content && !prefersReducedMotion()) {
        loadGsap().then((gsap) => {
          gsap.fromTo(
            content,
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.2, ease: 'power2.out' },
          )
        })
      }
    }

    if (!open && dialog.open) closeAnimated()
    // closeAnimated is stable across renders for this effect's purpose (it
    // only reads refs and the current open/reduced-motion state); adding it
    // as a dependency would re-run this effect on every render for no
    // behavioural reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto rounded-3xl bg-transparent p-0 backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      <div ref={contentRef} className="flex flex-col gap-4">
        {children}
      </div>
      <button
        type="button"
        onClick={closeAnimated}
        aria-label="Schließen"
        className="mx-auto mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised text-text"
      >
        <VitaIcon name="close" size={20} />
      </button>
    </dialog>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Dialog.test.tsx`
Expected: PASS (all five tests — the three original plus the two new ones)

- [ ] **Step 5: Run the full test suite to confirm no other Dialog consumer broke**

Run: `npx vitest run`
Expected: PASS (every test, including `ExerciseDetailDialog.test.tsx` and every page test that opens a `Dialog` — these all run under the Task 1 default of `matches: true`, so they exercise the exact same synchronous close path they did before this task; GSAP is never dynamically imported during their run)

- [ ] **Step 6: Commit**

```bash
git add src/components/Dialog.tsx src/components/Dialog.test.tsx
git commit -m "feat: animate Dialog open/close via lazy-loaded gsap, respecting reduced motion"
```

---

### Task 6: Foundation verification

**Files:** none (verification only)

- [ ] **Step 1: Full test suite, lint, typecheck, build**

```bash
npx vitest run
npm run lint
npx tsc -b --noEmit
npm run build
```

Expected: all green. `npm run build`'s output must show `gsap` in its own chunk, not inside the main entry chunk — confirm by checking the `dist/assets/` file list: the main `index-*.js` should not grow noticeably from its pre-Task-2 baseline size, and a separate chunk containing `gsap` should only be requested once a page actually opens a `Dialog` (this needs a manual check in the browser Network tab against the built `dist/` output, e.g. via `npm run preview`, not an automated test).

- [ ] **Step 2: Manual mobile-viewport check of the `/body` fix**

Using `playwright-cli` (already available in this project, per `CLAUDE.md`'s Design-Workflow skill list), open `/body` at a 390px-wide mobile viewport and confirm the "Heute eintragen" button is not overlapped by the bottom nav, both at the top of the page and after scrolling down past it.

- [ ] **Step 3: Manual check of Dialog animation**

Using `playwright-cli`, open any existing dialog in the app (e.g. the exercise picker) and confirm it now animates in/out instead of appearing/disappearing instantly, and confirm animation disables correctly when the OS-level "reduce motion" setting is turned on.

- [ ] **Step 4: Update CLAUDE.md status section**

Record that Foundation (Phase 1 of the visual/interaction redesign) is complete, merged and verified, and that Phase 2 (highest-impact screens: home dashboard, workout session/completion, exercise catalog/picker) is the next step, planned separately once Foundation's real component APIs exist to reference.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record redesign foundation as complete, next step is phase 2 planning"
```

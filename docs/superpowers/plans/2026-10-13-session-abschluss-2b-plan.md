# Redesign Phase 2b – Trainings-Session + Abschluss-Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Session-Screen und Abschluss-Screen bekommen Struktur, Daumenzone und eine Feier-Sequenz; Übungsnamen sind deutsch.

**Architecture:** Alles bleibt in `src/pages/WorkoutSessionPage.tsx` (Akkordeon-Flow unverändert) plus eine neue GSAP-Leaf-Komponente `src/components/CompletionCelebration.tsx`. Der Namens-Fix sitzt in `src/hooks/use-workout-session.ts`. Die Einblendung neuer Satz-Zeilen ist eine CSS-Keyframe-Animation (kein GSAP nötig, kein Bundle-Kosten).

**Tech Stack:** React + TypeScript, Tailwind 4, GSAP (lazy über `loadGsap()`), Vitest + RTL.

**Spec:** `docs/superpowers/specs/2026-10-13-session-abschluss-2b-design.md`

## Global Constraints

- Kein Schema, keine Migration, keine neue Route.
- GSAP nur über `loadGsap()` (`src/lib/gsap-loader.ts`), nie statisch importiert; `grep -c gsap dist/assets/index-*.js` muss `0` bleiben.
- Jede Animation prüft `prefersReducedMotion()` (`src/lib/motion.ts`) und fällt auf den statischen Endzustand zurück; ein fehlgeschlagener GSAP-Import bleibt still.
- Rohes `<button>` ist per ESLint verboten — nur `Pressable`/`PressableLink` (`src/components/Pressable.tsx`).
- Tokens aus `src/lib/ui-classes.ts`: `cardClass`, `statClass`, `labelClass`, `stickyActionClass`.
- Deutsche UI-Texte in Du-Form, keine Namen von Drittanbieter-Apps.
- Working Copy nutzt CRLF.

## Review Focus

- Übung ohne Übersetzung (`name_de = null`, z. B. eigene Übung) → englischer `name` statt leerer Zeile (Test in Task 1).
- Aufklappen einer Übung mit bereits erfassten Sätzen → keine Einblendanimation; nur der gerade erfasste Satz blendet ein (Test in Task 2).
- Pause ≥ 60 s → `m:ss` (`1:30`), unter 10 s → `0:05` (Test in Task 2).
- Abschluss ohne Kalorien (`null`) → nur Dauer, keine leere kcal-Karte (Test in Task 4).
- Abschluss-Screen unter Reduced Motion bzw. wenn GSAP nie lädt → Endwerte stehen sofort im DOM, `loadGsap` wird bei Reduced Motion gar nicht aufgerufen (Test in Task 5).

---

### Task 1: Deutsche Übungsnamen in der Session

**Files:**
- Modify: `src/hooks/use-workout-session.ts` (Typen Z. ~35 und ~53, Selects Z. 151 und 158, Mapping Z. 170 und 330)
- Test: `src/hooks/use-workout-session.test.ts`

**Interfaces:**
- Produces: `SessionExercise.name` und `NeuerRekord.name` sind ab jetzt `name_de ?? name`. `SessionSet.exercise` bekommt `name_de: string | null`.

- [ ] **Step 1: Fixtures auf englisch/deutsch umstellen (wird zum fehlschlagenden Test)**

In `use-workout-session.test.ts` die Fixtures Z. ~83 und ~93 ändern:

```ts
exercises: { id: 'ex1', name: 'Bench Press', name_de: 'Bankdrücken' },
// ...
exercises: { id: 'ex1', name: 'Bench Press', name_de: 'Bankdrücken', met_wert: 5 },
```

Alle übrigen Fixtures mit `exercise: { id, name, met_wert }` (z. B. Z. ~228) bekommen ebenfalls `name_de` (der Typ verlangt es). Die bestehenden Assertions auf `'Bankdrücken'` (z. B. Z. 213, 465) bleiben unverändert — sie prüfen jetzt die Übersetzung.

Zusätzlich einen Fallback-Test neben dem bestehenden Lade-Test anlegen: dieselbe Fixture-Struktur wie Z. ~83, aber `exercises: { id: 'ex1', name: 'Bench Press', name_de: null }`, und erwarten, dass `result.current.exercises[0].name` `'Bench Press'` ist (gleiches Mock-/`waitFor`-Muster wie der vorhandene Lade-Test der Datei kopieren).

- [ ] **Step 2: Test laufen lassen, muss fehlschlagen**

Run: `npx vitest run src/hooks/use-workout-session.test.ts`
Expected: FAIL — `'Bench Press'` statt `'Bankdrücken'`.

- [ ] **Step 3: Implementieren**

```ts
// SessionSet
exercise: { id: string; name: string; name_de: string | null; met_wert: number | null } | null
// RawSessionExercise
exercises: { id: string; name: string; name_de: string | null } | null
```

Selects: `exercises(id, name, name_de)` (Z. 151) und `exercises(id, name, name_de, met_wert)` (Z. 158).

Mapping:

```ts
name: row.exercises?.name_de ?? row.exercises?.name ?? '',   // Z. 170
name: set.exercise?.name_de ?? set.exercise?.name ?? '',     // Z. 330
```

Falls `tsc` weitere Stellen meldet, die ein `exercise`-Objekt bauen (z. B. optimistische Updates), dort `name_de` mitführen.

- [ ] **Step 4: Tests + Typcheck**

Run: `npx vitest run src/hooks/use-workout-session.test.ts src/pages/WorkoutSessionPage.test.tsx; npx tsc -b --noEmit`
Expected: PASS, keine Typfehler.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-workout-session.ts src/hooks/use-workout-session.test.ts
git commit -m "fix: show German exercise names in live session and PR list"
```

---

### Task 2: Satz-Tabelle mit RIR, Einblendung neuer Sätze, Pausen-Timer m:ss

**Files:**
- Modify: `src/pages/WorkoutSessionPage.tsx` (`LoggedSets`, `PauseTimer`)
- Modify: `src/index.css` (Keyframe)
- Test: `src/pages/WorkoutSessionPage.test.tsx`

**Interfaces:**
- Produces: Funktion `formatPause(sekunden: number): string` (Modul-lokal, exportiert für Tests), CSS-Klasse `row-in`.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

In `WorkoutSessionPage.test.tsx`:

```ts
import { formatPause } from './WorkoutSessionPage'

describe('formatPause', () => {
  it('formats seconds as m:ss', () => {
    expect(formatPause(90)).toBe('1:30')
    expect(formatPause(5)).toBe('0:05')
    expect(formatPause(0)).toBe('0:00')
  })
})
```

Den bestehenden Test um Z. 213 umstellen (statt `'Satz 1: 60 kg × 10 Wdh.'`):

```ts
const tabelle = screen.getByRole('table', { name: 'Erfasste Sätze' })
expect(within(tabelle).getByRole('columnheader', { name: 'RIR' })).toBeInTheDocument()
const zeile = within(tabelle).getAllByRole('row')[1]
expect(zeile).toHaveTextContent('1')
expect(zeile).toHaveTextContent('60')
expect(zeile).toHaveTextContent('10')
expect(zeile).toHaveTextContent('—') // rir der Fixture ist null; sonst Fixture-Wert erwarten
expect(zeile).not.toHaveClass('row-in') // beim Aufklappen vorhandener Sätze keine Einblendung
```

Neuer Test „blendet nur den neu erfassten Satz ein": Übung mit einem vorhandenen Satz aufklappen, dann `mockUseWorkoutSession.mockReturnValue(...)` mit einem zweiten Satz (neue `id`) setzen und neu rendern (das Rerender-/Log-Muster des Tests um Z. 296 verwenden); erwarten, dass `getAllByRole('row')[2]` die Klasse `row-in` hat und `[1]` nicht.

- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npx vitest run src/pages/WorkoutSessionPage.test.tsx`
Expected: FAIL (`formatPause` nicht exportiert, keine Tabelle).

- [ ] **Step 3: Implementieren**

`src/index.css` (am Ende):

```css
@keyframes row-in {
  from { opacity: 0; transform: translateY(-4px); }
}
.row-in { animation: row-in 300ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .row-in { animation: none; }
}
```

`LoggedSets` (Hook vor dem frühen `return null`):

```tsx
function LoggedSets({ sets }: { sets: SessionSet[] }) {
  // Snapshot beim Aufklappen: nur danach erfasste Sätze blenden ein.
  const [bekannteIds] = useState(() => new Set(sets.map((set) => set.id)))
  if (sets.length === 0) return null
  // ... arbeitssaetze / aufwaermsaetze wie bisher ...
  return (
    <div>
      {/* Aufwärmsatz-Zeile unverändert */}
      {arbeitssaetze.length > 0 && (
        <table aria-label="Erfasste Sätze" className="w-full text-left tabular-nums">
          <thead>
            <tr className={labelClass}>
              <th className="py-1 font-medium">Satz</th>
              <th className="py-1 font-medium">kg</th>
              <th className="py-1 font-medium">Wdh.</th>
              <th className="py-1 font-medium">RIR</th>
            </tr>
          </thead>
          <tbody>
            {arbeitssaetze.map((set, index) => (
              <tr
                key={set.id}
                className={`border-t border-text-muted/20 ${bekannteIds.has(set.id) ? '' : 'row-in'}`}
              >
                <td className="py-1">{index + 1}</td>
                <td className="py-1">{set.gewicht ?? '—'}</td>
                <td className="py-1">{set.wiederholungen ?? '—'}</td>
                <td className="py-1">{set.rir ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

`labelClass` und `statClass` zum Import aus `../lib/ui-classes` hinzufügen.

`PauseTimer`:

```tsx
export function formatPause(sekunden: number) {
  return `${Math.floor(sekunden / 60)}:${String(sekunden % 60).padStart(2, '0')}`
}
// im return von PauseTimer:
return (
  <div className={cardClass} role="timer">
    <p className={labelClass}>Pause</p>
    <p className={statClass}>{formatPause(remainingSeconds)}</p>
  </div>
)
```

Die vorhandenen `/Pause/`-Assertions (Z. 194, 296, 304, 615) matchen weiter das Label.

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/pages/WorkoutSessionPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/WorkoutSessionPage.tsx src/pages/WorkoutSessionPage.test.tsx src/index.css
git commit -m "feat: logged sets as table with RIR, reveal new sets, m:ss pause timer"
```

---

### Task 3: Session-Layout – Kartenkopf, Entfernen-Button, Daumenzone

**Files:**
- Modify: `src/pages/WorkoutSessionPage.tsx` (`LiveSession` return)
- Test: `src/pages/WorkoutSessionPage.test.tsx`

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```ts
it('pins the finish action above the nav and labels the body weight', async () => {
  // gleiches Setup wie der bestehende "Training abschließen"-Test (Z. ~470)
  renderPage()
  await screen.findByText('Bankdrücken')
  expect(screen.getByRole('button', { name: 'Training abschließen' })).toHaveClass('sticky')
  expect(screen.getByText('Körpergewicht für die kcal-Berechnung')).toBeInTheDocument()
})
```

- [ ] **Step 2: Test laufen lassen, muss fehlschlagen**

Run: `npx vitest run src/pages/WorkoutSessionPage.test.tsx -t "pins the finish action"`
Expected: FAIL.

- [ ] **Step 3: Implementieren**

Zuerst in `src/components/Pressable.tsx` nachsehen, wie `className` mit den Variantenklassen kombiniert wird. Die Projekt nutzt kein `tailwind-merge`; widersprechende Padding-Klassen deshalb mit Tailwind-4-Important-Suffix überschreiben (`px-3! py-2!`).

Kartenkopf statt der zwei untereinander liegenden Buttons:

```tsx
<div className="flex items-center gap-2">
  <Pressable
    variant="bare"
    type="button"
    className="flex-1 text-left text-lg font-semibold"
    onClick={() => setOpenExerciseId(entry.exercise_id)}
  >
    {entry.name}
  </Pressable>
  {!sets.some((set) => set.exercise_id === entry.exercise_id) && (
    <Pressable variant="danger" type="button" className="px-3! py-2! text-sm" onClick={() => removeExercise(entry.id)}>
      <span className="inline-flex items-center justify-center gap-2">
        <VitaIcon name="delete" tone="mono" size={16} />
        Entfernen
      </span>
    </Pressable>
  )}
</div>
```

(Wenn `bare` nicht der Default von `Pressable` ist, den bisherigen Variantenwert des Namens-Buttons beibehalten und nur die Klassen ergänzen.)

„Übung hinzufügen": `variant="primary"` → `variant="secondary"` plus `className="w-full"`.

Gewichtsanzeige:

```tsx
<div className="mt-6">
  <p className={labelClass}>Körpergewicht für die kcal-Berechnung</p>
  <p className="text-xl font-bold tabular-nums">{gewichtKg === null ? '—' : `${gewichtKg} kg`}</p>
  {gewichtKg === null && <p>Ohne Gewicht im Profil lässt sich der Verbrauch nicht berechnen.</p>}
</div>
```

„Training abschließen": `className={stickyActionClass}` am bestehenden primären `Pressable`.

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/pages/WorkoutSessionPage.test.tsx; npm run lint`
Expected: PASS, Lint ohne Ausgabe. Die Entfernen-Tests (Z. 146–168) bleiben grün.

- [ ] **Step 5: Commit**

```bash
git add src/pages/WorkoutSessionPage.tsx src/pages/WorkoutSessionPage.test.tsx
git commit -m "feat: session card header, compact danger remove, sticky finish action"
```

---

### Task 4: Abschluss-Screen – Kennzahlen und PR-Karten (statisch)

**Files:**
- Modify: `src/pages/WorkoutSessionPage.tsx` (`SessionCompletionScreen`)
- Test: `src/pages/WorkoutSessionPage.test.tsx`

**Interfaces:**
- Produces: Markup-Hooks für Task 5: `data-count-to="<Zahl>"` an jeder Kennzahl, `data-pr-card` an jeder PR-Karte, darin `data-sweep`-Element, `data-reveal` an der Streak-Zeile.

- [ ] **Step 1: Bestehende Assertions umstellen (fehlschlagend)**

Z. 479 ersetzen:

```ts
expect(screen.getByText('25')).toHaveAttribute('data-count-to', '25')
expect(screen.getByText('Minuten')).toBeInTheDocument()
expect(screen.getByText('187')).toBeInTheDocument()
expect(screen.getByText('kcal')).toBeInTheDocument()
```

Z. 543–544 ersetzen:

```ts
expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
expect(screen.getByText('116,7 kg')).toBeInTheDocument()
expect(screen.getByText('vorher: 105,0 kg')).toBeInTheDocument()
expect(screen.getByText('80,0 kg')).toBeInTheDocument()
expect(screen.getByText('erste Ausführung')).toBeInTheDocument()
```

Neuer Test „ohne Kalorien nur Dauer": wie der Test um Z. 470, aber `completeSession` liefert `gesamtKalorien: null`; erwarten `screen.queryByText('kcal')` ist `null` und `'Minuten'` ist da.

- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npx vitest run src/pages/WorkoutSessionPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementieren**

```tsx
return (
  <div>
    <h1>Training abgeschlossen</h1>
    <dl className="grid grid-cols-2 gap-4">
      <Kennzahl label="Dauer" wert={dauerMinuten} einheit="Minuten" />
      {kalorien != null && <Kennzahl label="Verbrauch" wert={Math.round(kalorien)} einheit="kcal" />}
    </dl>
    {neueRekorde.length > 0 && (
      <section className="mt-6">
        <h2>Neue Rekorde</h2>
        <ul role="list" className="space-y-3">
          {neueRekorde.map((rekord) => (
            <li key={rekord.exercise_id} data-pr-card className={`${cardClass} relative overflow-hidden`}>
              <span
                data-sweep
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-accent/30 to-transparent"
              />
              <p className="font-semibold">{rekord.name}</p>
              <p className="text-2xl font-bold tracking-tight tabular-nums">{`${zahl(rekord.neuesEinsRM)} kg`}</p>
              <p className={labelClass}>
                {rekord.altesEinsRM == null ? 'erste Ausführung' : `vorher: ${zahl(rekord.altesEinsRM)} kg`}
              </p>
            </li>
          ))}
        </ul>
      </section>
    )}
    <p data-reveal className="mt-6">{streakLoading ? '…' : streakText(streak)}</p>
    <Pressable variant="primary" type="button" className={stickyActionClass} onClick={onFertig}>
      Fertig
    </Pressable>
  </div>
)

function Kennzahl({ label, wert, einheit }: { label: string; wert: number; einheit: string }) {
  return (
    <div className={cardClass}>
      <dt className={labelClass}>{label}</dt>
      <dd>
        <span className={statClass} data-count-to={wert}>{wert}</span>{' '}
        <span className={labelClass}>{einheit}</span>
      </dd>
    </div>
  )
}
```

Der Sweep liegt statisch außerhalb der Karte (`-translate-x-full` + `overflow-hidden`) und ist ohne Animation unsichtbar. `stickyActionClass` importieren.

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/pages/WorkoutSessionPage.test.tsx`
Expected: PASS (inkl. der PR-Fehler-/Leer-Tests um Z. 557/571).

- [ ] **Step 5: Commit**

```bash
git add src/pages/WorkoutSessionPage.tsx src/pages/WorkoutSessionPage.test.tsx
git commit -m "feat: completion screen stat tiles and structured PR cards"
```

---

### Task 5: Feier-Sequenz (`CompletionCelebration`)

**Files:**
- Create: `src/components/CompletionCelebration.tsx`
- Create: `src/components/CompletionCelebration.test.tsx`
- Modify: `src/pages/WorkoutSessionPage.tsx` (Abschluss-Inhalt in `<CompletionCelebration>` wickeln)

**Interfaces:**
- Consumes: `data-count-to`, `data-pr-card`, `data-sweep`, `data-reveal` aus Task 4.
- Produces: `export default function CompletionCelebration({ children }: { children: ReactNode })`.

- [ ] **Step 1: Fehlschlagende Tests schreiben**

```tsx
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CompletionCelebration from './CompletionCelebration'
import { loadGsap } from '../lib/gsap-loader'
import { prefersReducedMotion } from '../lib/motion'

vi.mock('../lib/gsap-loader', () => ({ loadGsap: vi.fn(() => new Promise(() => {})) }))
vi.mock('../lib/motion', () => ({ prefersReducedMotion: vi.fn(() => false) }))

const inhalt = (
  <p>
    <span data-count-to={25}>25</span> Minuten
  </p>
)

describe('CompletionCelebration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows final values while GSAP has not loaded', () => {
    render(<CompletionCelebration>{inhalt}</CompletionCelebration>)
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(loadGsap).toHaveBeenCalledOnce()
  })

  it('does not load GSAP under reduced motion', () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true)
    render(<CompletionCelebration>{inhalt}</CompletionCelebration>)
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(loadGsap).not.toHaveBeenCalled()
  })

  it('stays static when the GSAP import fails', async () => {
    vi.mocked(loadGsap).mockRejectedValueOnce(new Error('offline'))
    render(<CompletionCelebration>{inhalt}</CompletionCelebration>)
    await Promise.resolve()
    expect(screen.getByText('25')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Tests laufen lassen, müssen fehlschlagen**

Run: `npx vitest run src/components/CompletionCelebration.test.tsx`
Expected: FAIL (Modul fehlt).

- [ ] **Step 3: Implementieren**

```tsx
import { useEffect, useRef, type ReactNode } from 'react'
import { loadGsap } from '../lib/gsap-loader'
import { prefersReducedMotion } from '../lib/motion'

/**
 * Feier-Sequenz des Abschluss-Screens. Das Markup steht immer mit den
 * Endwerten im DOM; die Animation ist nur eine Zusatzschicht darüber
 * (Reduced Motion oder ein fehlgeschlagener Import lassen es statisch).
 */
export default function CompletionCelebration({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root || prefersReducedMotion()) return
    let disposed = false
    let ctx: { revert: () => void } | undefined
    loadGsap()
      .then((gsap) => {
        if (disposed) return
        ctx = gsap.context(() => {
          const tl = gsap.timeline()
          root.querySelectorAll<HTMLElement>('[data-count-to]').forEach((el) => {
            const ziel = Number(el.dataset.countTo)
            const zaehler = { wert: 0 }
            tl.to(
              zaehler,
              {
                wert: ziel,
                duration: 0.8,
                ease: 'power2.out',
                onUpdate: () => { el.textContent = String(Math.round(zaehler.wert)) },
                onComplete: () => { el.textContent = String(ziel) },
              },
              0,
            )
          })
          tl.from('[data-pr-card]', { opacity: 0, y: 12, stagger: 0.12, duration: 0.4 }, 0.5)
          tl.fromTo('[data-sweep]', { xPercent: -100 }, { xPercent: 100, duration: 0.9, stagger: 0.12, ease: 'power1.inOut' }, 0.7)
          tl.from('[data-reveal]', { opacity: 0, duration: 0.4 }, '>-0.3')
        }, root)
      })
      .catch(() => {})
    return () => {
      disposed = true
      ctx?.revert()
    }
  }, [])

  return <div ref={rootRef}>{children}</div>
}
```

GSAP warnt bei leeren Selektoren (keine PRs) nur in der Konsole und überspringt den Tween — akzeptabel; falls störend, `tl.from` nur aufrufen, wenn `root.querySelector('[data-pr-card]')` existiert.

In `SessionCompletionScreen` den gesamten Inhalt (h1 bis Streak-Zeile, ohne „Fertig"-Button) in `<CompletionCelebration>…</CompletionCelebration>` wickeln. `WorkoutSessionPage.test.tsx` mockt `../lib/gsap-loader` noch nicht: dort `vi.mock('../lib/gsap-loader', () => ({ loadGsap: vi.fn(() => new Promise(() => {})) }))` ergänzen, damit die Seitentests die Endwerte prüfen.

- [ ] **Step 4: Tests laufen lassen**

Run: `npx vitest run src/components/CompletionCelebration.test.tsx src/pages/WorkoutSessionPage.test.tsx; npm run lint; npx tsc -b --noEmit`
Expected: PASS, sauber.

- [ ] **Step 5: Commit**

```bash
git add src/components/CompletionCelebration.tsx src/components/CompletionCelebration.test.tsx src/pages/WorkoutSessionPage.tsx src/pages/WorkoutSessionPage.test.tsx
git commit -m "feat: animated completion celebration with reduced-motion fallback"
```

---

### Task 6: Verifikation und Doku

**Files:**
- Modify: `CLAUDE.md` (Status 2b), ggf. `docs/` nur falls Architektur-Doku die Session-Seite beschreibt

- [ ] **Step 1: Volllauf**

Run: `npx vitest run; npm run lint; npx tsc -b --noEmit`
Expected: alles grün (bekannte Last-Flakes `HomeChartList`/`HomeAnalysisPage` einzeln nachlaufen lassen).

- [ ] **Step 2: Bundle-Check** (Build führt der Nutzer aus, falls der Classifier blockt)

Run: `npm run build; grep -c gsap dist/assets/index-*.js`
Expected: `0`.

- [ ] **Step 3: Browser-Check mit `playwright-cli`, 390×844** — Session-Screen: Unterkante „Training abschließen" < Nav-Oberkante und Klick in die Mitte trifft; Satz-Tabelle mit RIR-Spalte; Abschluss-Screen: Kennzahl `font-weight 700` + `tabular-nums`; mit `reducedMotion: 'reduce'` kein Request auf `gsap`.

- [ ] **Step 4: CLAUDE.md-Status nachziehen und committen**

```bash
git add CLAUDE.md
git commit -m "docs: record phase 2b status"
```

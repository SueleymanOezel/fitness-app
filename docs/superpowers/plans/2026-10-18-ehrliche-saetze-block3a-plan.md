# Block 3a – Ehrliche Sätze Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kein Satz ohne Wiederholungen mehr (Erfassen, Korrigieren, Historie), erfasste Sätze der laufenden Session per Dialog korrigierbar (inklusive Aufwärmsätze als Zeilen) und deutsche Übungsnamen in Historie und Analyse.

**Architecture:** Eine reine Validierungsfunktion (`parseSetInput`) als einzige Quelle der Satz-Regel; `SetForm`, der neue `SetEditDialog` und das Historie-Feld benutzen sie bzw. ihre Meldung. Die RIR-Chips werden in eine geteilte Komponente gezogen. Die Tabelle „Erfasste Sätze“ zeigt Aufwärmsätze als Zeilen und öffnet den Dialog per Zeilenklick (Button in der ersten Zelle für Tastatur/Screenreader, Klick steigt zum `<tr>` auf). Übungsnamen laufen über `exerciseName()`; die Analyse hat eine einzige Quelle (`use-training-analysis.ts`).

**Tech Stack:** React 19 + Vite + TypeScript, Tailwind 4, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-18-ehrliche-saetze-block3a-design.md`

## Global Constraints

- Satz-Regel (verbatim aus der Spec): Wiederholungen sind Pflicht, ganzzahlig und mindestens 1; das Gewicht ist optional (leer = `null`) und mindestens 0 (Komma oder Punkt). Meldungen: „Bitte Wiederholungen angeben (ganze Zahl, mindestens 1).“ und „Gewicht als Zahl ab 0 eingeben, z. B. 22,5.“
- Aussehen nur über Rezepte aus `src/lib/ui-classes.ts`; keine Karte in Karte; Buttons/Links nur über `Pressable`/`PressableLink` (ESLint verbietet rohes `<button>`).
- Dialog-Regeln: Dialog hält seine Kinder gemountet — Formularinhalt nur rendern, solange offen (frische Vorbelegung); Fehler, die auftreten können, während der Dialog offen bleibt, stehen **inline im Dialog**, kein Toast.
- Keine Datenbank-Migration, kein Constraint auf `wiederholungen` (alte Zeilen mit `null`/`0` bleiben bestehen).
- „Satz N von M“ zählt weiter nur Arbeitssätze (`workingSetCount`); `satz_nummer` bleibt die laufende Reihenfolge über alle Sätze der Übung.
- Deutsche UI, Du-Form, Dezimalkomma; keine Namen von Drittanbieter-/Konkurrenz-Apps in Code, Kommentaren, Tests, Commit-Messages.
- Commit-Nachrichten enden mit der Zeile `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (zweites `-m`).
- Tests: `npx vitest run <datei>` pro Schritt; jedes `findBy*` hinter einer `React.lazy`-Grenze braucht `{ timeout: 5000 }`. Bekannter Last-Flake: `HomeAnalysisPage`/`HomeChartList` im Volllauf, einzeln grün.
- Working Copy ist CRLF: bestehende Dateien mit dem Edit-Tool ändern.

## Execution Notes

- Worktree vom **lokalen** `master` (Spec `641b788` ist noch nicht gepusht): `git worktree add -b block3a-saetze .claude/worktrees/block3a HEAD`, darin `npm ci`.
- Nach jedem Report `git log` im Worktree prüfen und `git branch --show-current` = `block3a-saetze`.

## Abweichung von der Spec (bewusst)

`SetEditDialog` bekommt statt `open` + `set` nur `set: SessionSet | null` (offen ⇔ nicht `null`). Gleiches Verhalten, eine Prop weniger.

## Review Focus

Zustände, die die Spec nicht ausdrücklich nennt, aber echte Nutzer treffen — je Zeile ein Test in der genannten Task:

1. **Alter Satz mit `wiederholungen = null` in der Historie:** bloßes Verlassen des Feldes ohne Änderung darf keine Fehlermeldung zeigen und nicht schreiben → Task 5.
2. **Arbeitssatz-Zählung bleibt stabil, wenn ein Aufwärmsatz davor liegt** („Satz 2 von 3“, Zeilennummern 1, 2, 3) → Task 4.
3. **Zeilenklick und Button lösen den Dialog genau einmal aus** (Klick auf den Button bubbelt; kein Doppel-Öffnen, kein Doppel-`updateSet`) → Task 4.
4. **Speichern im Dialog schlägt fehl:** Dialog bleibt offen, Meldung inline, eingegebene Werte bleiben → Task 4.
5. **Übung ohne `name_de` oder gelöschte Übung** (Embed `null`) ergibt weiter einen lesbaren Namen („Unbekannte Uebung“ in der Analyse, Fallback auf `name`) → Task 2.

---

### Task 1: Satz-Validierung (`set-values.ts`)

**Files:**
- Create: `src/lib/set-values.ts`, `src/lib/set-values.test.ts`

**Interfaces:**
- Consumes: `parseDecimal(value: string, { integer?: boolean }): number | null | undefined` (vorhanden, `src/lib/parse-decimal.ts`).
- Produces: `WIEDERHOLUNGEN_FEHLER: string`, `GEWICHT_FEHLER: string`, `type SetInputValues = { gewicht: number | null; wiederholungen: number }`, `type SetInputResult = { ok: true; values: SetInputValues } | { ok: false; fehler: { gewicht?: string; wiederholungen?: string } }`, `parseSetInput(gewicht: string, wiederholungen: string): SetInputResult`.

- [ ] **Step 1: Failing test** — `src/lib/set-values.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { GEWICHT_FEHLER, WIEDERHOLUNGEN_FEHLER, parseSetInput } from './set-values'

describe('parseSetInput', () => {
  it('accepts repetitions with a weight', () => {
    expect(parseSetInput('60', '10')).toEqual({ ok: true, values: { gewicht: 60, wiederholungen: 10 } })
  })

  it('accepts a set without weight (bodyweight exercise)', () => {
    expect(parseSetInput('', '8')).toEqual({ ok: true, values: { gewicht: null, wiederholungen: 8 } })
  })

  it('accepts a German decimal comma and surrounding spaces', () => {
    expect(parseSetInput(' 22,5 ', ' 8 ')).toEqual({ ok: true, values: { gewicht: 22.5, wiederholungen: 8 } })
  })

  it('accepts a weight of exactly 0', () => {
    expect(parseSetInput('0', '5')).toEqual({ ok: true, values: { gewicht: 0, wiederholungen: 5 } })
  })

  it.each([[''], ['   '], ['0'], ['-3'], ['abc'], ['8.5'], ['8,5'], ['1e3']])(
    'rejects %j as repetitions',
    (wiederholungen) => {
      expect(parseSetInput('60', wiederholungen)).toEqual({
        ok: false,
        fehler: { wiederholungen: WIEDERHOLUNGEN_FEHLER },
      })
    },
  )

  it.each([['-1'], ['abc'], ['22,5kg']])('rejects %j as weight', (gewicht) => {
    expect(parseSetInput(gewicht, '10')).toEqual({ ok: false, fehler: { gewicht: GEWICHT_FEHLER } })
  })

  it('reports both fields at once', () => {
    expect(parseSetInput('abc', '')).toEqual({
      ok: false,
      fehler: { gewicht: GEWICHT_FEHLER, wiederholungen: WIEDERHOLUNGEN_FEHLER },
    })
  })

  it('refuses a completely empty set', () => {
    const result = parseSetInput('', '')
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2:** `npx vitest run src/lib/set-values.test.ts` → FAIL (Modul fehlt).

- [ ] **Step 3: Implementieren** — `src/lib/set-values.ts`:

```ts
import { parseDecimal } from './parse-decimal'

export const WIEDERHOLUNGEN_FEHLER = 'Bitte Wiederholungen angeben (ganze Zahl, mindestens 1).'
export const GEWICHT_FEHLER = 'Gewicht als Zahl ab 0 eingeben, z. B. 22,5.'

export type SetInputValues = { gewicht: number | null; wiederholungen: number }

export type SetInputResult =
  | { ok: true; values: SetInputValues }
  | { ok: false; fehler: { gewicht?: string; wiederholungen?: string } }

/**
 * Die eine Regel für einen Satz (Erfassen, Korrigieren in der Session): Wiederholungen
 * sind Pflicht (ganze Zahl ab 1), das Gewicht ist optional (Eigengewicht) und ab 0.
 * Beide Felder werden geprüft, damit der Nutzer alle Fehler auf einmal sieht.
 */
export function parseSetInput(gewicht: string, wiederholungen: string): SetInputResult {
  const gewichtWert = parseDecimal(gewicht)
  const wiederholungenWert = parseDecimal(wiederholungen, { integer: true })

  const fehler: { gewicht?: string; wiederholungen?: string } = {}
  if (gewichtWert === undefined || (gewichtWert !== null && gewichtWert < 0)) {
    fehler.gewicht = GEWICHT_FEHLER
  }
  if (wiederholungenWert == null || wiederholungenWert < 1) {
    fehler.wiederholungen = WIEDERHOLUNGEN_FEHLER
  }
  if (fehler.gewicht !== undefined || fehler.wiederholungen !== undefined) {
    return { ok: false, fehler }
  }
  return {
    ok: true,
    values: { gewicht: gewichtWert as number | null, wiederholungen: wiederholungenWert as number },
  }
}
```

- [ ] **Step 4:** Test → PASS; `npm run lint`, `npx tsc -b --noEmit` sauber.

- [ ] **Step 5: Commit**

```bash
git add src/lib/set-values.ts src/lib/set-values.test.ts
git commit -m "feat: single set validation rule (reps required, weight optional)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Deutsche Übungsnamen (`exerciseName`, Historie, Analyse)

**Files:**
- Create: `src/lib/exercise-name.ts`, `src/lib/exercise-name.test.ts`
- Modify: `src/pages/TrainingHistoryDetailPage.tsx`, `src/hooks/use-training-analysis.ts`, `src/hooks/use-training-analysis.test.ts`, `src/pages/TrainingHistoryDetailPage.test.tsx`

**Interfaces:**
- Produces: `exerciseName(exercise: { name: string; name_de?: string | null } | null | undefined): string` — `name_de`, sonst `name`, sonst `''`.

- [ ] **Step 1: Failing tests**

`src/lib/exercise-name.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { exerciseName } from './exercise-name'

describe('exerciseName', () => {
  it('prefers the German name', () => {
    expect(exerciseName({ name: 'Bench Press', name_de: 'Bankdrücken' })).toBe('Bankdrücken')
  })

  it('falls back to the English name without a translation', () => {
    expect(exerciseName({ name: 'Bench Press', name_de: null })).toBe('Bench Press')
    expect(exerciseName({ name: 'Bench Press' })).toBe('Bench Press')
    expect(exerciseName({ name: 'Bench Press', name_de: '' })).toBe('Bench Press')
  })

  it('returns an empty string for a deleted exercise', () => {
    expect(exerciseName(null)).toBe('')
    expect(exerciseName(undefined)).toBe('')
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : []
  })
}

describe('English exercise names in the UI', () => {
  it('no page or component reads exercise.name without a German name or exerciseName()', () => {
    const offenders: string[] = []
    for (const folder of ['src/pages', 'src/components']) {
      for (const file of sourceFiles(resolve(process.cwd(), folder))) {
        readFileSync(file, 'utf8')
          .split(/\r?\n/)
          .forEach((line, index) => {
            if (/\bexercises?\??\.name\b/.test(line) && !/name_de|exerciseName/.test(line)) {
              offenders.push(`${file}:${index + 1}: ${line.trim()}`)
            }
          })
      }
    }
    expect(offenders).toEqual([])
  })
})
```

In `src/pages/TrainingHistoryDetailPage.test.tsx` neuer Test im `describe`:

```tsx
  it('shows the German exercise name, falling back to the English one', async () => {
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        sets: [
          { ...set, id: 'a', exercise: { id: 'ex1', name: 'Bench Press', name_de: 'Bankdrücken', met_wert: 5 } },
          { ...set, id: 'b', exercise: { id: 'ex2', name: 'Cable Row', name_de: null, met_wert: 5 } },
        ],
      }),
    )

    renderPage()

    expect(await screen.findByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument()
    expect(screen.getByText('Cable Row')).toBeInTheDocument()
  })
```

In `src/hooks/use-training-analysis.test.ts` neue Tests nach „survives a set whose exercise was deleted“ (Muster des Tests „loads the sets of the loaded sessions and flattens the exercise“ direkt darüber: `ergebnis = { data: [session], error: null }`, `satzErgebnis = { data: [...], error: null }`, `renderHook(() => useTrainingAnalysis('u1', 30))`):

```ts
  it('uses the German exercise name when there is one', async () => {
    ergebnis = { data: [session], error: null }
    satzErgebnis = {
      data: [
        {
          id: 'x1',
          workout_session_id: 's1',
          exercise_id: 'e1',
          satz_nummer: 1,
          gewicht: 80,
          wiederholungen: 8,
          ist_aufwaermsatz: false,
          exercises: { name: 'Bench Press', name_de: 'Bankdrücken', muskelgruppen_primaer: ['brust'] },
        },
      ],
      error: null,
    }
    const { result } = renderHook(() => useTrainingAnalysis('u1', 30))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sets[0].exercise_name).toBe('Bankdrücken')
  })

  it('selects name_de in the embed so no chart shows the English name', async () => {
    ergebnis = { data: [session], error: null }
    renderHook(() => useTrainingAnalysis('u1', 30))
    await waitFor(() => expect(select).toHaveBeenCalledWith('workout_session_sets', expect.stringContaining('name_de')))
  })
```
(`select` ist in dieser Testdatei der Mock des Query-Builders; falls er dort anders heißt, die vorhandene Hilfsvariable des Tests „loads the sets of the loaded sessions…“ verwenden und gegen den Spaltenstring der Sätze-Abfrage prüfen. Der bestehende Test „loads the sets… flattens the exercise“ mit `exercises: { name: 'Bankdruecken', muskelgruppen_primaer: [...] }` bleibt unverändert grün — Fallback auf `name`.)

- [ ] **Step 2:** `npx vitest run src/lib/exercise-name.test.ts src/pages/TrainingHistoryDetailPage.test.tsx src/hooks/use-training-analysis.test.ts` → FAIL (Modul fehlt, Historie zeigt `name`, Embed ohne `name_de`).

- [ ] **Step 3: Implementieren**

`src/lib/exercise-name.ts`:

```ts
/** Deutscher Name, sonst der englische Quellname, sonst leer (gelöschte Übung). */
export function exerciseName(exercise: { name: string; name_de?: string | null } | null | undefined): string {
  return exercise?.name_de || exercise?.name || ''
}
```

`src/pages/TrainingHistoryDetailPage.tsx`: Import `import { exerciseName } from '../lib/exercise-name'`; Zeile `<p className="font-semibold">{set.exercise?.name}</p>` → `<p className="font-semibold">{exerciseName(set.exercise)}</p>`.

`src/hooks/use-training-analysis.ts`:
- Typ `RawSet.exercises` (Zeile ~33): `{ name: string; name_de: string | null; muskelgruppen_primaer: string[] | null } | null`.
- Embed-String (Zeile ~38): `exercises(name, muskelgruppen_primaer)` → `exercises(name, name_de, muskelgruppen_primaer)`.
- Mapping (Zeile ~130): `exercise_name: row.exercises?.name ?? UNBEKANNTE_UEBUNG` → `exercise_name: exerciseName(row.exercises) || UNBEKANNTE_UEBUNG`; Import von `exerciseName` ergänzen.

- [ ] **Step 4:** Die drei Testdateien → PASS; dazu `npx vitest run src/components/charts src/lib/analysis` (nichts darf brechen), `npm run lint`, `npx tsc -b --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: German exercise names in history and analysis" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `RirChips` und `SetForm` auf die Validierung umstellen

**Files:**
- Create: `src/components/RirChips.tsx`, `src/components/RirChips.test.tsx`
- Modify: `src/pages/WorkoutSessionPage.tsx` (`SetForm`, RIR-Konstante, Imports), `src/pages/WorkoutSessionPage.test.tsx`

**Interfaces:**
- Consumes: `parseSetInput`, `WIEDERHOLUNGEN_FEHLER` (Task 1).
- Produces: `RirChips({ value: number | null; onChange: (next: number | null) => void })` — Fieldset mit Legende „Wie viele hättest du noch geschafft?“, Chips 0–5 („5+“), erneutes Tippen auf den gewählten Wert ruft `onChange(null)`.

- [ ] **Step 1: Failing tests**

`src/components/RirChips.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RirChips from './RirChips'

afterEach(cleanup)

describe('RirChips', () => {
  it('shows the scale 0 to 5+ and marks the selected value', () => {
    render(<RirChips value={2} onChange={vi.fn()} />)
    expect(screen.getByRole('group', { name: 'Wie viele hättest du noch geschafft?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '5+' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('selects a value, and clears it when the same value is tapped again', () => {
    const onChange = vi.fn()
    const { rerender } = render(<RirChips value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onChange).toHaveBeenLastCalledWith(3)
    rerender(<RirChips value={3} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})
```

In `src/pages/WorkoutSessionPage.test.tsx` (Import `WIEDERHOLUNGEN_FEHLER, GEWICHT_FEHLER` aus `'../lib/set-values'` ergänzen):

(a) Test „refuses an invalid weight or negative reps …“: die zwei Meldungs-Assertions werden zu

```tsx
    expect(await screen.findByText(GEWICHT_FEHLER)).toBeInTheDocument()
    expect(screen.getByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
```

(b) In den Tests „numbers a set after every earlier set, warm-ups included“ und „sends the chosen effort rating and clears it after the set“ fehlt das Tippen der Wiederholungen (die neue Regel würde den Satz ablehnen). Direkt **vor** dem jeweiligen `fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))` einfügen:

```tsx
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
```

(c) Neue Tests (am Ende des `describe`):

```tsx
  it('refuses a completely empty set and says why', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    fireEvent.click(await screen.findByText('Bankdrücken'))
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    expect(await screen.findByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
    expect(screen.getByLabelText('Wiederholungen')).toHaveAttribute('aria-invalid', 'true')
    expect(result.logSet).not.toHaveBeenCalled()
  })

  it('refuses zero repetitions', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    fireEvent.click(await screen.findByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    expect(await screen.findByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
    expect(result.logSet).not.toHaveBeenCalled()
  })

  it('stores a bodyweight set without a weight', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    fireEvent.click(await screen.findByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() =>
      expect(result.logSet).toHaveBeenCalledWith('ex1', 1, expect.objectContaining({ gewicht: null, wiederholungen: 8 })),
    )
  })

  it('clears the message once the set is valid', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    fireEvent.click(await screen.findByText('Bankdrücken'))
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))
    expect(await screen.findByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() => expect(screen.queryByText(WIEDERHOLUNGEN_FEHLER)).not.toBeInTheDocument())
  })
```

- [ ] **Step 2:** `npx vitest run src/components/RirChips.test.tsx src/pages/WorkoutSessionPage.test.tsx` → FAIL.

- [ ] **Step 3: Implementieren**

`src/components/RirChips.tsx`:

```tsx
import Chip from './Chip'

const RIR_VALUES = [0, 1, 2, 3, 4, 5] as const

/** Anstrengung als „Wiederholungen in Reserve“ (0–5+); erneutes Tippen auf den gewählten Wert löscht ihn. */
export default function RirChips({ value, onChange }: { value: number | null; onChange: (next: number | null) => void }) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend>Wie viele hättest du noch geschafft?</legend>
      {RIR_VALUES.map((option) => (
        <Chip
          key={option}
          active={value === option}
          // Pressed rather than disabled: tapping the same value again clears
          // it, so a mistap does not stick for the rest of the session.
          onClick={() => onChange(value === option ? null : option)}
        >
          {option === 5 ? '5+' : String(option)}
        </Chip>
      ))}
    </fieldset>
  )
}
```

`src/pages/WorkoutSessionPage.tsx`:
- Imports: `import RirChips from '../components/RirChips'`, `import { parseSetInput } from '../lib/set-values'`; `Chip` und `parseDecimal` nur dann entfernen, wenn sie danach nirgends in der Datei mehr benutzt werden (Lint zeigt es); die Konstante `const RIR_VALUES = [0, 1, 2, 3, 4, 5] as const` entfällt.
- In `SetForm`: State `fehler` wird `useState<{ gewicht?: string; wiederholungen?: string }>({})`. Der Submit-Handler beginnt so (ersetzt die bisherigen `parseDecimal`-/`Ungueltig`-Zeilen bis einschließlich `if (gewichtUngueltig || wiederholungenUngueltig) return`):

```tsx
        event.preventDefault()
        // Eine Regel für alle Wege, einen Satz zu speichern (src/lib/set-values.ts).
        const eingabe = parseSetInput(gewicht, wiederholungen)
        setFehler(eingabe.ok ? {} : eingabe.fehler)
        if (!eingabe.ok) return
        // Only clear on a stored set: wiping the fields after a failed save
        // would force the user to type everything again.
        const stored = await onLog({
          gewicht: eingabe.values.gewicht,
          wiederholungen: eingabe.values.wiederholungen,
          rir,
          ist_aufwaermsatz: istAufwaermsatz,
        })
```
  (Der Rest des Handlers — `if (!stored) return`, Felder leeren, Aufwärm-Schalter zurücksetzen — bleibt unverändert.)
- Fehleranzeigen ersetzen:
  - Gewicht: `aria-invalid={fehler.gewicht !== undefined}` und `{fehler.gewicht && (<p role="alert" className="text-sm text-danger">{fehler.gewicht}</p>)}`.
  - Wiederholungen: `aria-invalid={fehler.wiederholungen !== undefined}` und `{fehler.wiederholungen && (<p role="alert" className="text-sm text-danger">{fehler.wiederholungen}</p>)}`.
- Das `<fieldset>`-Chip-Block am Ende der Formularfelder wird ersetzt durch `<RirChips value={rir} onChange={setRir} />`.

- [ ] **Step 4:** Beide Testdateien → PASS; `npm run lint`, `npx tsc -b --noEmit`; Vollsuite einmal (`npx vitest run`).

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: refuse sets without repetitions, extract RirChips" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `SetEditDialog` und Aufwärmsatz-Zeilen in der Session

**Files:**
- Create: `src/components/SetEditDialog.tsx`, `src/components/SetEditDialog.test.tsx`
- Modify: `src/pages/WorkoutSessionPage.tsx` (`LoggedSets`, Verdrahtung), `src/pages/WorkoutSessionPage.test.tsx`

**Interfaces:**
- Consumes: `parseSetInput`, `RirChips`, `SessionSet` (aus `use-workout-session`), `Dialog`, `useWorkoutSession().updateSet(setId, patch)` (vorhanden, lädt neu).
- Produces: `SetEditDialog({ set: SessionSet | null; onClose: () => void; onSave: (setId: string, patch: { gewicht: number | null; wiederholungen: number; rir: number | null; ist_aufwaermsatz: boolean }) => Promise<void> })`; `LoggedSets({ sets: SessionSet[]; onEdit: (set: SessionSet) => void })`.

- [ ] **Step 1: Failing tests**

`src/components/SetEditDialog.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import SetEditDialog from './SetEditDialog'
import { WIEDERHOLUNGEN_FEHLER } from '../lib/set-values'

vi.mock('../lib/gsap-loader', () => ({ loadGsap: vi.fn(() => new Promise(() => {})) }))

afterEach(cleanup)

const satz = {
  id: 'set1',
  exercise_id: 'ex1',
  satz_nummer: 1,
  gewicht: 60,
  wiederholungen: 10,
  rir: 2,
  ist_aufwaermsatz: false,
  abgeschlossen_am: '2026-08-21T10:05:00.000Z',
  exercise: { id: 'ex1', name: 'Bench Press', name_de: 'Bankdrücken', met_wert: 5 },
}

function formular() {
  return within(screen.getByRole('heading', { name: 'Satz bearbeiten' }).closest('form') as HTMLElement)
}

describe('SetEditDialog', () => {
  it('renders nothing while no set is being edited', () => {
    render(<SetEditDialog set={null} onClose={vi.fn()} onSave={vi.fn()} />)
    expect(screen.queryByRole('heading', { name: 'Satz bearbeiten' })).not.toBeInTheDocument()
  })

  it('prefills the stored values', () => {
    render(<SetEditDialog set={satz} onClose={vi.fn()} onSave={vi.fn()} />)
    expect(formular().getByLabelText('Gewicht (kg)')).toHaveValue('60')
    expect(formular().getByLabelText('Wiederholungen')).toHaveValue('10')
    expect(formular().getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true')
    expect(formular().getByLabelText('Aufwärmsatz')).not.toBeChecked()
  })

  it('prefills an empty weight as empty, not as "null"', () => {
    render(<SetEditDialog set={{ ...satz, gewicht: null }} onClose={vi.fn()} onSave={vi.fn()} />)
    expect(formular().getByLabelText('Gewicht (kg)')).toHaveValue('')
  })

  it('saves the changed values and closes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<SetEditDialog set={satz} onClose={onClose} onSave={onSave} />)

    fireEvent.change(formular().getByLabelText('Wiederholungen'), { target: { value: '12' } })
    fireEvent.change(formular().getByLabelText('Gewicht (kg)'), { target: { value: '62,5' } })
    fireEvent.click(formular().getByRole('button', { name: '3' }))
    fireEvent.click(formular().getByLabelText('Aufwärmsatz'))
    fireEvent.click(formular().getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('set1', {
        gewicht: 62.5,
        wiederholungen: 12,
        rir: 3,
        ist_aufwaermsatz: true,
      }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('refuses empty repetitions with the message inside the dialog and does not save', async () => {
    const onSave = vi.fn()
    render(<SetEditDialog set={satz} onClose={vi.fn()} onSave={onSave} />)

    fireEvent.change(formular().getByLabelText('Wiederholungen'), { target: { value: '' } })
    fireEvent.click(formular().getByRole('button', { name: 'Speichern' }))

    expect(await formular().findByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('stays open with an inline message when saving fails and keeps the typed values', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('boom'))
    const onClose = vi.fn()
    render(<SetEditDialog set={satz} onClose={onClose} onSave={onSave} />)

    fireEvent.change(formular().getByLabelText('Wiederholungen'), { target: { value: '11' } })
    fireEvent.click(formular().getByRole('button', { name: 'Speichern' }))

    expect(await formular().findByText('Satz konnte nicht gespeichert werden.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(formular().getByLabelText('Wiederholungen')).toHaveValue('11')
  })

  it('closes via Abbrechen without saving', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<SetEditDialog set={satz} onClose={onClose} onSave={onSave} />)
    fireEvent.click(formular().getByRole('button', { name: 'Abbrechen' }))
    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not save twice on a double tap', async () => {
    let resolve: () => void = () => {}
    const onSave = vi.fn().mockReturnValue(new Promise<void>((done) => { resolve = done }))
    render(<SetEditDialog set={satz} onClose={vi.fn()} onSave={onSave} />)

    const speichern = formular().getByRole('button', { name: 'Speichern' })
    fireEvent.click(speichern)
    fireEvent.click(speichern)
    resolve()

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
  })
})
```

In `src/pages/WorkoutSessionPage.test.tsx`:

(a) Test „lists already logged working sets, numbered separately from warm-ups“ — Body ab `expect(screen.getByText('1 Aufwärmsatz'))` ersetzen durch (Titel auf „lists all logged sets, numbering only the working sets“ ändern):

```tsx
    expect(screen.queryByText('1 Aufwärmsatz')).not.toBeInTheDocument()
    const tabelle = screen.getByRole('table', { name: 'Erfasste Sätze' })
    expect(within(tabelle).getByRole('columnheader', { name: 'RIR' })).toBeInTheDocument()
    // Header + working set 1 + warm-up + working set 2, in the order they were logged.
    const zeilen = within(tabelle).getAllByRole('row')
    expect(zeilen).toHaveLength(4)
    expect(within(zeilen[1]).getByRole('button', { name: 'Satz 1 bearbeiten' })).toBeInTheDocument()
    expect(zeilen[1]).toHaveTextContent('60')
    expect(zeilen[1]).toHaveTextContent('10')
    expect(zeilen[1]).toHaveTextContent('—') // rir der Fixture ist null
    expect(within(zeilen[2]).getByRole('button', { name: 'Aufwärmsatz bearbeiten' })).toBeInTheDocument()
    expect(zeilen[2]).toHaveTextContent('Aufw.')
    expect(zeilen[2]).toHaveTextContent('20')
    expect(within(zeilen[3]).getByRole('button', { name: 'Satz 2 bearbeiten' })).toBeInTheDocument()
    expect(zeilen[3]).toHaveTextContent('65')
    expect(zeilen[1]).not.toHaveClass('row-in') // beim Aufklappen vorhandener Sätze keine Einblendung
```

(b) Test „pluralizes the warm-up count for more than one“ ersetzen:

```tsx
  it('shows warm-ups as their own rows instead of a count', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        sets: [
          loggedSet({ id: 'set1', satz_nummer: 1, ist_aufwaermsatz: true }),
          loggedSet({ id: 'set2', satz_nummer: 2, ist_aufwaermsatz: true }),
        ],
      }),
    )

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))

    expect(screen.queryByText(/^\d+ Aufwärmsätze?$/)).not.toBeInTheDocument()
    const zeilen = within(screen.getByRole('table', { name: 'Erfasste Sätze' })).getAllByRole('row')
    expect(zeilen).toHaveLength(3) // header + 2 warm-ups
    expect(zeilen[1]).toHaveTextContent('Aufw.')
    expect(zeilen[2]).toHaveTextContent('Aufw.')
  })
```

(c) Neue Tests am Ende:

```tsx
  it('keeps the working-set counting when a warm-up comes first', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        sets: [
          loggedSet({ id: 'w1', satz_nummer: 1, ist_aufwaermsatz: true }),
          loggedSet({ id: 's1', satz_nummer: 2 }),
          loggedSet({ id: 's2', satz_nummer: 3 }),
        ],
      }),
    )

    renderPage()
    fireEvent.click(screen.getByText('Bankdrücken'))

    expect(screen.getByRole('button', { name: 'Satz 1 bearbeiten' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Satz 2 bearbeiten' })).toBeInTheDocument()
    // Two working sets of two targets are done: the form announces that, warm-up not counted.
    expect(screen.getByText('Alle Sätze erfasst')).toBeInTheDocument()
  })

  it('opens the edit dialog by tapping a row and saves the correction', async () => {
    signedIn()
    const result = sessionResult({ sets: [loggedSet({ id: 'set1', gewicht: 60, wiederholungen: 10 })] })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.click(within(screen.getByRole('table', { name: 'Erfasste Sätze' })).getAllByRole('row')[1])

    const dialog = within(screen.getByRole('heading', { name: 'Satz bearbeiten' }).closest('form') as HTMLElement)
    fireEvent.change(dialog.getByLabelText('Wiederholungen'), { target: { value: '12' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(result.updateSet).toHaveBeenCalledWith('set1', {
        gewicht: 60,
        wiederholungen: 12,
        rir: null,
        ist_aufwaermsatz: false,
      }),
    )
    expect(result.updateSet).toHaveBeenCalledTimes(1)
  })

  it('opens the dialog exactly once when the row button is used (keyboard / screen reader)', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [loggedSet({ id: 'set1' })] }))

    renderPage()
    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.click(screen.getByRole('button', { name: 'Satz 1 bearbeiten' }))

    expect(screen.getAllByRole('heading', { name: 'Satz bearbeiten' })).toHaveLength(1)
  })

  it('lets a warm-up be turned into a working set from the dialog', async () => {
    signedIn()
    const result = sessionResult({ sets: [loggedSet({ id: 'w1', satz_nummer: 1, ist_aufwaermsatz: true })] })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.click(screen.getByRole('button', { name: 'Aufwärmsatz bearbeiten' }))

    const dialog = within(screen.getByRole('heading', { name: 'Satz bearbeiten' }).closest('form') as HTMLElement)
    expect(dialog.getByLabelText('Aufwärmsatz')).toBeChecked()
    fireEvent.click(dialog.getByLabelText('Aufwärmsatz'))
    fireEvent.click(dialog.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(result.updateSet).toHaveBeenCalledWith('w1', expect.objectContaining({ ist_aufwaermsatz: false })),
    )
  })
```

- [ ] **Step 2:** `npx vitest run src/components/SetEditDialog.test.tsx src/pages/WorkoutSessionPage.test.tsx` → FAIL.

- [ ] **Step 3: Implementieren**

`src/components/SetEditDialog.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import Dialog from './Dialog'
import Pressable from './Pressable'
import RirChips from './RirChips'
import type { SessionSet } from '../hooks/use-workout-session'
import { parseSetInput } from '../lib/set-values'
import { cardClass, checkLabelClass, fieldLabelClass, inputClass } from '../lib/ui-classes'

export type SetPatch = {
  gewicht: number | null
  wiederholungen: number
  rir: number | null
  ist_aufwaermsatz: boolean
}

type Props = {
  /** Der Satz, der gerade korrigiert wird; `null` = Dialog zu. */
  set: SessionSet | null
  onClose: () => void
  onSave: (setId: string, patch: SetPatch) => Promise<void>
}

/**
 * Korrektur eines bereits erfassten Satzes in der laufenden Session. Dialog hält
 * seine Kinder gemountet (siehe Dialog.tsx) — das Formular wird nur gerendert,
 * solange ein Satz gewählt ist, damit die Vorbelegung bei jedem Öffnen frisch ist.
 * Fehler stehen im Dialog: ein Toast läge hinter dem Top-Layer des offenen <dialog>.
 */
export default function SetEditDialog({ set, onClose, onSave }: Props) {
  return (
    <Dialog open={set !== null} onClose={onClose}>
      {set && <SetEditForm key={set.id} set={set} onClose={onClose} onSave={onSave} />}
    </Dialog>
  )
}

function SetEditForm({ set, onClose, onSave }: { set: SessionSet; onClose: () => void; onSave: Props['onSave'] }) {
  const [gewicht, setGewicht] = useState(set.gewicht == null ? '' : String(set.gewicht))
  const [wiederholungen, setWiederholungen] = useState(set.wiederholungen == null ? '' : String(set.wiederholungen))
  const [rir, setRir] = useState<number | null>(set.rir)
  const [istAufwaermsatz, setIstAufwaermsatz] = useState(set.ist_aufwaermsatz)
  const [fehler, setFehler] = useState<{ gewicht?: string; wiederholungen?: string }>({})
  const [speichernFehler, setSpeichernFehler] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const eingabe = parseSetInput(gewicht, wiederholungen)
    setFehler(eingabe.ok ? {} : eingabe.fehler)
    if (!eingabe.ok) return
    setSpeichernFehler(false)
    setBusy(true)
    try {
      await onSave(set.id, { ...eingabe.values, rir, ist_aufwaermsatz: istAufwaermsatz })
      onClose()
    } catch {
      setSpeichernFehler(true)
      setBusy(false)
    }
  }

  return (
    <form className={cardClass} onSubmit={submit}>
      <h2>Satz bearbeiten</h2>
      <label className={fieldLabelClass}>
        Gewicht (kg)
        <input
          className={inputClass}
          inputMode="decimal"
          value={gewicht}
          aria-invalid={fehler.gewicht !== undefined}
          onChange={(event) => setGewicht(event.target.value)}
        />
      </label>
      {fehler.gewicht && (
        <p role="alert" className="text-sm text-danger">
          {fehler.gewicht}
        </p>
      )}
      <label className={fieldLabelClass}>
        Wiederholungen
        <input
          className={inputClass}
          inputMode="numeric"
          value={wiederholungen}
          aria-invalid={fehler.wiederholungen !== undefined}
          onChange={(event) => setWiederholungen(event.target.value)}
        />
      </label>
      {fehler.wiederholungen && (
        <p role="alert" className="text-sm text-danger">
          {fehler.wiederholungen}
        </p>
      )}
      <label className={checkLabelClass}>
        <input type="checkbox" checked={istAufwaermsatz} onChange={(event) => setIstAufwaermsatz(event.target.checked)} />
        Aufwärmsatz
      </label>
      <RirChips value={rir} onChange={setRir} />
      {speichernFehler && (
        <p role="alert" className="text-sm text-danger">
          Satz konnte nicht gespeichert werden.
        </p>
      )}
      <Pressable variant="primary" type="submit" disabled={busy}>
        Speichern
      </Pressable>
      <Pressable variant="secondary" type="button" onClick={onClose}>
        Abbrechen
      </Pressable>
    </form>
  )
}
```

`src/pages/WorkoutSessionPage.tsx`:
- Import `SetEditDialog`. In der Seiten-Komponente den State `const [bearbeiteterSatz, setBearbeiteterSatz] = useState<SessionSet | null>(null)` ergänzen und `updateSet` aus dem `useWorkoutSession(...)`-Ergebnis mitdestrukturieren (der Hook liefert es bereits).
- Aufruf `<LoggedSets sets={sets.filter((set) => set.exercise_id === entry.exercise_id)} />` → `<LoggedSets sets={sets.filter((set) => set.exercise_id === entry.exercise_id)} onEdit={setBearbeiteterSatz} />`.
- Direkt nach der schließenden `</ul>` der Übungsliste (vor dem Button „Übung hinzufügen“) einmal rendern:

```tsx
      <SetEditDialog
        set={bearbeiteterSatz}
        onClose={() => setBearbeiteterSatz(null)}
        onSave={(setId, patch) => updateSet(setId, patch)}
      />
```
- `LoggedSets` ersetzen (der Doc-Kommentar bleibt sinngemäß, ergänzt um „Aufwärmsätze erscheinen als Zeilen“):

```tsx
function LoggedSets({ sets, onEdit }: { sets: SessionSet[]; onEdit: (set: SessionSet) => void }) {
  // Snapshot beim Aufklappen: nur danach erfasste Sätze blenden ein.
  const [bekannteIds] = useState(() => new Set(sets.map((set) => set.id)))
  if (sets.length === 0) return null

  // Reihenfolge wie erfasst (satz_nummer zählt alle Sätze); die sichtbare Nummer
  // zählt nur Arbeitssätze, Aufwärmsätze tragen "Aufw." (siehe workingSetCount).
  const sortiert = [...sets].sort((a, b) => a.satz_nummer - b.satz_nummer)
  const nummern = new Map<string, number>()
  let arbeitssaetze = 0
  for (const set of sortiert) {
    if (!set.ist_aufwaermsatz) nummern.set(set.id, (arbeitssaetze += 1))
  }

  return (
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
        {sortiert.map((set) => {
          const label = set.ist_aufwaermsatz ? 'Aufw.' : String(nummern.get(set.id))
          return (
            // Der Zeilenklick öffnet die Korrektur; der Button in der ersten Zelle ist der
            // Zugang für Tastatur und Screenreader — sein Klick steigt zum <tr> auf und
            // hat bewusst keinen eigenen Handler (sonst öffnete der Dialog doppelt).
            <tr
              key={set.id}
              onClick={() => onEdit(set)}
              className={`cursor-pointer border-t border-text-muted/20 ${set.ist_aufwaermsatz ? 'text-text-muted' : ''} ${
                bekannteIds.has(set.id) ? '' : 'row-in'
              }`}
            >
              <td className="py-1">
                <Pressable
                  variant="bare"
                  type="button"
                  className="min-h-11 min-w-11 text-left"
                  aria-label={set.ist_aufwaermsatz ? 'Aufwärmsatz bearbeiten' : `Satz ${label} bearbeiten`}
                >
                  {label}
                </Pressable>
              </td>
              <td className="py-1">{set.gewicht ?? '—'}</td>
              <td className="py-1">{set.wiederholungen ?? '—'}</td>
              <td className="py-1">{set.rir ?? '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```
Falls ESLint (`jsx-a11y/no-noninteractive-element-interactions` o. ä.) den `onClick` am `<tr>` meldet, genau diese Zeile mit `// eslint-disable-next-line <regelname> -- Zeilenklick ist die Komfort-Fläche, der Button in der ersten Zelle ist der Tastatur-Zugang` versehen; ohne solche Regel nichts hinzufügen.

- [ ] **Step 4:** Beide Testdateien → PASS (der bestehende Test „reveals only the newly logged set“ muss unverändert grün bleiben: Kopfzeile + 2 Arbeitssätze = 3 Zeilen, nur die neue Zeile trägt `row-in`); `npm run lint`, `npx tsc -b --noEmit`; Vollsuite einmal.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: correct logged sets in the session via dialog, warm-ups as rows" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Historie – Wiederholungen nicht leeren

**Files:**
- Modify: `src/pages/TrainingHistoryDetailPage.tsx` (`SetField`, Aufruf), `src/pages/TrainingHistoryDetailPage.test.tsx`

**Interfaces:**
- Consumes: `WIEDERHOLUNGEN_FEHLER` (Task 1).
- Produces: `SetField` bekommt die optionale Prop `pflichtMeldung?: string` — gesetzt, ist das Feld Pflicht (leer oder < 1 wird abgelehnt) und die Meldung wird angezeigt.

- [ ] **Step 1: Failing tests** — im `describe` von `src/pages/TrainingHistoryDetailPage.test.tsx` (Import `WIEDERHOLUNGEN_FEHLER` aus `'../lib/set-values'` ergänzen):

```tsx
  it('does not let the repetitions be emptied, restores the value and says why', () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = screen.getByLabelText('Wiederholungen')
    fireEvent.change(field, { target: { value: '' } })
    fireEvent.blur(field)

    expect(result.updateSet).not.toHaveBeenCalled()
    expect(field).toHaveValue('10')
    expect(screen.getByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
  })

  it('does not let the repetitions be set to zero', () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = screen.getByLabelText('Wiederholungen')
    fireEvent.change(field, { target: { value: '0' } })
    fireEvent.blur(field)

    expect(result.updateSet).not.toHaveBeenCalled()
    expect(field).toHaveValue('10')
    expect(screen.getByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
  })

  it('still corrects the repetitions to another valid number', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = screen.getByLabelText('Wiederholungen')
    fireEvent.change(field, { target: { value: '12' } })
    fireEvent.blur(field)

    await waitFor(() => expect(result.updateSet).toHaveBeenCalledWith('set1', { wiederholungen: 12 }))
    expect(screen.queryByText(WIEDERHOLUNGEN_FEHLER)).not.toBeInTheDocument()
  })

  it('shows no message for an old set without repetitions that is merely visited', () => {
    const result = sessionResult({ sets: [{ ...set, wiederholungen: null }] })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.blur(screen.getByLabelText('Wiederholungen'))

    expect(result.updateSet).not.toHaveBeenCalled()
    expect(screen.queryByText(WIEDERHOLUNGEN_FEHLER)).not.toBeInTheDocument()
  })

  it('still lets the weight be emptied (bodyweight)', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = screen.getByLabelText('Gewicht (kg)')
    fireEvent.change(field, { target: { value: '' } })
    fireEvent.blur(field)

    await waitFor(() => expect(result.updateSet).toHaveBeenCalledWith('set1', { gewicht: null }))
  })
```

- [ ] **Step 2:** `npx vitest run src/pages/TrainingHistoryDetailPage.test.tsx` → FAIL.

- [ ] **Step 3: Implementieren** — `SetField` in `src/pages/TrainingHistoryDetailPage.tsx` ersetzen (Import `WIEDERHOLUNGEN_FEHLER` aus `'../lib/set-values'`); der bestehende Doc-Kommentar zu `max`/`integer` bleibt:

```tsx
function SetField({
  label,
  stored,
  max,
  integer,
  pflichtMeldung,
  onCommit,
}: {
  label: string
  stored: number | null
  /** Rejected client-side too, so an out-of-range RIR never becomes a failed write. */
  max?: number
  /** rir and wiederholungen are integer columns: Postgres would round 2.6 to 3
   *  and store a value nobody typed. Gewicht is numeric and stays fractional. */
  integer?: boolean
  /** Gesetzt = Pflichtfeld (mindestens 1): leer oder 0 wird abgelehnt und diese Meldung gezeigt. */
  pflichtMeldung?: string
  onCommit: (value: number | null) => void
}) {
  const [draft, setDraft] = useState(String(stored ?? ''))
  const [meldung, setMeldung] = useState<string | null>(null)

  function commit() {
    const value = draft.trim() === '' ? null : Number(draft)
    // Unverändert zuerst: ein alter Satz ohne Wiederholungen (null) darf beim bloßen
    // Antippen und Verlassen weder schreiben noch eine Meldung auslösen.
    if (value === stored) return
    const ungueltig =
      value !== null &&
      (!Number.isFinite(value) ||
        value < 0 ||
        (max != null && value > max) ||
        (integer === true && !Number.isInteger(value)))
    const fehlt = pflichtMeldung !== undefined && (value === null || value < 1)
    if (ungueltig || fehlt) {
      setDraft(String(stored ?? ''))
      setMeldung(pflichtMeldung ?? null)
      return
    }
    setMeldung(null)
    onCommit(value)
  }

  return (
    <label className={fieldLabelClass}>
      {label}
      <input
        className={inputClass}
        value={draft}
        aria-invalid={meldung !== null}
        onChange={(event) => {
          setDraft(event.target.value)
          setMeldung(null)
        }}
        onBlur={commit}
      />
      {meldung && (
        <span role="alert" className="text-sm font-normal text-danger">
          {meldung}
        </span>
      )}
    </label>
  )
}
```
Am Aufruf des Wiederholungs-Feldes `pflichtMeldung={WIEDERHOLUNGEN_FEHLER}` ergänzen (neben `integer`).

- [ ] **Step 4:** `npx vitest run src/pages/TrainingHistoryDetailPage.test.tsx` → PASS (alle bestehenden Tests dort bleiben grün, u. a. „does not write when a corrected field is left unchanged“ und „rejects fractional reps“); `npm run lint`, `npx tsc -b --noEmit`; Vollsuite einmal.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: history keeps repetitions required, no silent empty sets" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Gesamtverifikation, Sicht-Prüfung, Doku

**Files:**
- Modify: `CLAUDE.md` (Status-Abschnitt)

- [ ] **Step 1: Volle Verifikation** — `npx vitest run` (Last-Flakes einzeln erneut), `npm run lint`, `npx tsc -b --noEmit`, `npm run build` (nur mit echter `.env` im Worktree aussagekräftig; danach `.env` wieder löschen), `grep -c gsap dist/assets/index-*.js` = 0.
- [ ] **Step 2: Sicht-Prüfung bei 390 px** — wie bei Block 2: `.env` aus dem Haupt-Checkout kopieren, `npx vite --port 5181`, Playwright mit künstlicher Supabase-Session und per `page.route` gemockten REST-Antworten (Tabellen `profiles`, `workout_sessions`, `workout_session_exercises`, `workout_session_sets` mit je einem Arbeitssatz, einem Aufwärmsatz und einem Satz mit `name_de`); auf `/training/session/<id>`: Übung aufklappen → Tabelle mit „Aufw.“-Zeile, Zeile antippen → Dialog, leere Wiederholungen speichern → Meldung im Dialog, gültig speichern → PATCH-Request an `workout_session_sets` sichtbar; leeren Satz im Formular absenden → Meldung; `/training/history/<id>`: deutscher Name, Wiederholungen leeren → Wert zurück + Meldung. Ergebnis (Screenshots lesen) festhalten; gefundene Fehler per Fix-Dispatch beheben. Danach Dev-Server beenden und `.env` entfernen.
- [ ] **Step 3: Review** — Whole-Branch-Review (stärkstes Modell) + Scoped Re-Review der Fix-Welle; `codex review -c model="gpt-5.6-sol" --base master` als Zweitmeinung.
- [ ] **Step 4: CLAUDE.md-Status** — Abschnitt „Neuer Chat: genau hier weitermachen“: Block 3a umgesetzt (PR offen), Block 3b als nächster Schritt (einheitliches Lösch-Muster inkl. Einzelsatz löschen, Körper-Datum-Duplikat, Fehlerzustände in Hooks), 3c danach (404, Login-Fehler, `aria-label`); neue Bausteine nennen (`parseSetInput`, `SetEditDialog`, `RirChips`, `exerciseName`).
- [ ] **Step 5: Commit und PR**

```bash
git add -A CLAUDE.md
git commit -m "docs: status for block 3a" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push -u origin block3a-saetze
gh pr create --title "Block 3a: ehrliche Sätze und deutsche Übungsnamen" --body "..."
```
(PR-Beschreibung: was, Prüfung, „Nach dem Merge: Marker im Bundle `Satz bearbeiten` und `Bitte Wiederholungen angeben`“; endet mit `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.) **Merge macht der Nutzer; danach erst Bescheid geben, dann pullt Claude im Haupt-Checkout, nennt den Commit und deployt** (Deploy-Regel aus CLAUDE.md inkl. Marker-Prüfung im Live-Bundle). Danach: Worktree entfernen, Branch löschen, `graphify update`, Wiki-Seite `Audit-Block-3a-Saetze` + `Home.md` + `_Sidebar.md`.

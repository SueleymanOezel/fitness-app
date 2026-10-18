# Block 2 – Hochwertige Dashboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die vier Tab-Startseiten (Home, Training, Ernährung, Körper) bekommen einen Hero mit heutigem Status und genau einer Hauptaktion, eine Link-Listenkarte statt gestapelter Textlinks, Skeletons statt „Lädt…“ und echte Leerzustände; vier Listenseiten werden kompakte Einzelkarten.

**Architecture:** Neue geteilte Bausteine in `src/components/` (`PageHero`, `StatStrip`, `WeekStrip`, `ProgressRing`, `LinkListCard`, `Skeleton`/`PageSkeleton`/`ChartSkeleton`, `EmptyState`, `QuickAddDialog`) mit Rezepten in `src/lib/ui-classes.ts`; Rechenlogik als reine Funktionen in `src/lib/` (`kalorienStatus`, `abschnittFuerUhrzeit`, `wochenStreifen`). Die Seiten setzen die Bausteine zusammen, Hooks und Datenquellen bleiben bis auf `useTrainingStreak` (liefert zusätzlich `tage`) unverändert. Keine Migration, kein neuer GSAP-Einsatz.

**Tech Stack:** React 19 + Vite + TypeScript, Tailwind 4, Vitest + Testing Library (jsdom), react-router-dom.

**Spec:** `docs/superpowers/specs/2026-10-18-hochwertige-dashboards-block2-design.md`

## Global Constraints

- Aussehen nur über Rezepte aus `src/lib/ui-classes.ts`; Flächen: Seite `bg`, Karte `surface`, Bedienelement `surface-raised`; **keine Karte in Karte**; kein `m-0`/`gap-*` neben `cardClass`; `cardClass` nie auf eine waagerechte Flex-Zeile.
- Buttons/Links ausschließlich über `Pressable`/`PressableLink` (ESLint verbietet rohes `<button>`); Felder und Labels tragen ihre Rezept-Klassen.
- Jede Seite rendert genau **ein** Wurzel-Element unter `main` (dessen Kinder stehen 24 px auseinander, aus dem Basis-Layer).
- GSAP bleibt lazy: nach dem Build gilt `grep -c gsap dist/assets/index-*.js` = `0`. Skeleton-Puls und Ring-Füllung sind reines CSS und unter `prefers-reduced-motion` aus.
- Tap-Ziele mindestens 44 px, Sprache Deutsch/Du-Form, Dezimalkomma (`toLocaleString('de-DE')`).
- Keine Namen von Drittanbieter-/Konkurrenz-Apps in Code, Kommentaren, Tests, Commit-Messages.
- „Lädt…“-Zustände behalten für Tests und Screenreader einen `sr-only`-Text „Lädt…“ in einem `role="status"`-Element.
- Commit-Nachrichten enden mit der Zeile `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (zweites `-m`).
- Tests: `npx vitest run <datei>` pro Schritt; jedes `findBy*` hinter einer `React.lazy`-Grenze braucht `{ timeout: 5000 }`. Bekannter Last-Flake: `HomeAnalysisPage`/`HomeChartList` im Volllauf, einzeln grün.
- CRLF-Working-Copy: Edits mit den Edit-Tools sind unproblematisch; keine Python-Massenersetzung ohne `newline=''`.

## Execution Notes

- Worktree vom **lokalen** `master` (Spec `e4ee31b` ist noch nicht gepusht): `git worktree add -b block2-dashboards .claude/worktrees/block2 HEAD`, darin `npm ci`. Nach jedem Report `git log` im Worktree prüfen, dass der Commit dort gelandet ist.
- `.env` aus dem Haupt-Checkout nur für die Sicht-Prüfung (Task 10) in den Worktree kopieren, nie committen.

## Abweichungen von der Spec (bewusst, hier festgehalten)

1. **Körper-Hero ohne `stickyActionClass`.** Der Hero steht oben auf der Seite; `sticky` innerhalb der Hero-Karte würde nur innerhalb dieser Karte kleben und nichts bewirken. Der frühere Nav-Überdeckungs-Fall (Button als letztes Element) existiert nicht mehr. (Spec-Zeile wird in Task 10 angepasst.)
2. **`abschnittFuerUhrzeit` nach Position statt nach Namen:** vor 10 Uhr 1., bis 15 Uhr 2., bis 21 Uhr 3., danach 4. benannter Abschnitt, begrenzt auf die vorhandene Anzahl. Namen sind frei editierbar, deshalb keine Namenslogik.
3. **`DailySummary` wird gelöscht** (nach Task 7 ohne Importeur; ersetzt durch Hero/Kalorien-Karte). Makro-Farben wandern als `MAKRO_FARBEN` nach `src/lib/analysis/nutrition-charts.ts`, damit die Seite sie ohne den lazy Chart importieren kann.
4. **Streak-Kachel auf Home** zeigt die Zahl groß und `streakText(...)` klein darunter, damit alle bisherigen Texte („4 Tage in Folge“, „Noch kein Trainingstag.“) erhalten bleiben.

## Review Focus

Eingaben und Zustände, die die Spec nicht ausdrücklich nennt, aber echte Nutzer treffen – jede Zeile hat einen Test in der genannten Task:

1. **Ziel 0, fehlendes Ziel, Überschreitung** (Ring darf nie über 100 % oder negativ laufen, Titel „drüber“ statt „-120 kcal übrig“) → Task 1 (`kalorienStatus`).
2. **Wochenstreifen am Monats-/Jahreswechsel und an einem Sonntag** (Woche beginnt Montag, `heute = Sonntag` ist Tag 7) → Task 1 (`wochenStreifen`).
3. **Keine benannten Mahlzeiten-Abschnitte** (QuickAddDialog darf keine leere Chip-Zeile und keinen toten „Hinzufügen“-Weg zeigen) → Task 5.
4. **Komplett leeres neues Konto** (kein Plan, keine Einträge, keine Messwerte): jede der vier Seiten rendert ohne „NaN“, „undefined“ oder leere Karte und bietet eine Aktion → Tasks 4–7.
5. **Speichern im Ernährungs-Dialog schlägt fehl:** Fehler bleibt im Dialog (inline), Dialog bleibt offen, kein Eintrag verschwindet → Task 5.

---

### Task 1: Reine Funktionen und `tage` im Streak-Hook

**Files:**
- Create: `src/lib/calorie-status.ts`, `src/lib/calorie-status.test.ts`
- Modify: `src/lib/meal-sections.ts`, `src/lib/meal-sections.test.ts`
- Modify: `src/lib/streak.ts`, `src/lib/streak.test.ts`
- Modify: `src/hooks/use-training-streak.ts`, `src/hooks/use-training-streak.test.ts`

**Interfaces:**
- Produces: `kalorienStatus(verbrauchtExakt: number, ziel: number | null): KalorienStatus` mit `KalorienStatus = { gegessen: number; titel: string; untertitel: string | null; anteil: number; ringLabel: string }`.
- Produces: `abschnittFuerUhrzeit(sections: MealSection[], jetzt: Date): number | null` (Slot-Nummer oder `null` bei leerer Liste).
- Produces: `trainingstage(sessions: { beendet_am: string | null }[]): string[]` (sortierte, eindeutige lokale Tage `YYYY-MM-DD`), `type WochenTag = { label: string; datum: string; trainiert: boolean; heute: boolean }`, `wochenStreifen(tage: string[], heute: string): WochenTag[]` (sieben Einträge Mo–So).
- Produces: `useTrainingStreak(userId)` liefert `{ streak: number; tage: string[]; loading: boolean }`.

- [ ] **Step 1: Failing tests schreiben**

`src/lib/calorie-status.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { kalorienStatus } from './calorie-status'

describe('kalorienStatus', () => {
  it('zeigt Restkalorien, Ziel und den Anteil am Ziel', () => {
    const status = kalorienStatus(1360, 2000)
    expect(status.titel).toBe('640 kcal übrig')
    expect(status.untertitel).toBe('Ziel 2000 kcal · 1360 gegessen')
    expect(status.anteil).toBeCloseTo(0.68)
    expect(status.ringLabel).toBe('640 kcal übrig, Ziel 2000 kcal')
    expect(status.gegessen).toBe(1360)
  })

  it('meldet eine Überschreitung und begrenzt den Ring auf voll', () => {
    const status = kalorienStatus(2300, 2000)
    expect(status.titel).toBe('300 kcal drüber')
    expect(status.anteil).toBe(1)
  })

  it('zeigt ohne Ziel nur das Gegessene und einen leeren Ring', () => {
    const status = kalorienStatus(1360, null)
    expect(status.titel).toBe('1360 kcal gegessen')
    expect(status.untertitel).toBeNull()
    expect(status.anteil).toBe(0)
  })

  it('behandelt ein Ziel von 0 oder weniger wie kein Ziel', () => {
    expect(kalorienStatus(500, 0).titel).toBe('500 kcal gegessen')
    expect(kalorienStatus(500, -100).anteil).toBe(0)
  })

  it('rundet auf ganze kcal', () => {
    const status = kalorienStatus(1359.6, 2000)
    expect(status.gegessen).toBe(1360)
    expect(status.titel).toBe('640 kcal übrig')
  })

  it('beginnt ohne Einträge mit vollem Ziel und leerem Ring', () => {
    const status = kalorienStatus(0, 2000)
    expect(status.titel).toBe('2000 kcal übrig')
    expect(status.anteil).toBe(0)
  })
})
```

An `src/lib/meal-sections.test.ts` (Import um `abschnittFuerUhrzeit` ergänzen, neuen `describe` ans Dateiende):

```ts
import { abschnittFuerUhrzeit } from './meal-sections'

describe('abschnittFuerUhrzeit', () => {
  const vier = mealSections(names)
  const um = (stunde: number) => new Date(2026, 9, 18, stunde, 30)

  it('wählt nach Tageszeit den 1. bis 4. Abschnitt', () => {
    expect(abschnittFuerUhrzeit(vier, um(7))).toBe(1)
    expect(abschnittFuerUhrzeit(vier, um(12))).toBe(2)
    expect(abschnittFuerUhrzeit(vier, um(18))).toBe(3)
    expect(abschnittFuerUhrzeit(vier, um(22))).toBe(4)
  })

  it('begrenzt auf die vorhandene Anzahl', () => {
    const zwei = vier.slice(0, 2)
    expect(abschnittFuerUhrzeit(zwei, um(22))).toBe(2)
  })

  it('liefert die Slot-Nummer, nicht die Position', () => {
    const luecke = [{ slot: 2, name: 'A' }, { slot: 5, name: 'B' }]
    expect(abschnittFuerUhrzeit(luecke, um(12))).toBe(5)
  })

  it('liefert null ohne Abschnitte', () => {
    expect(abschnittFuerUhrzeit([], um(12))).toBeNull()
  })
})
```

An `src/lib/streak.test.ts` (Import `trainingstage`, `wochenStreifen` ergänzen, `describe` ans Ende; 18.10.2026 ist ein Sonntag):

```ts
import { trainingstage, wochenStreifen } from './streak'

describe('trainingstage', () => {
  it('liefert sortierte, eindeutige lokale Tage und ignoriert unbeendete Sessions', () => {
    const lokal = (tag: number, stunde: number) => new Date(2026, 9, tag, stunde).toISOString()
    const tage = trainingstage([
      { beendet_am: lokal(14, 18) },
      { beendet_am: lokal(12, 9) },
      { beendet_am: lokal(14, 7) },
      { beendet_am: null },
    ])
    expect(tage).toEqual(['2026-10-12', '2026-10-14'])
  })
})

describe('wochenStreifen', () => {
  it('liefert Montag bis Sonntag der aktuellen Woche mit Markierungen', () => {
    // Mittwoch, 14.10.2026
    const woche = wochenStreifen(['2026-10-12', '2026-10-14'], '2026-10-14')
    expect(woche.map((tag) => tag.label)).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])
    expect(woche.map((tag) => tag.datum)).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
    ])
    expect(woche.map((tag) => tag.trainiert)).toEqual([true, false, true, false, false, false, false])
    expect(woche.filter((tag) => tag.heute).map((tag) => tag.datum)).toEqual(['2026-10-14'])
  })

  it('behandelt einen Sonntag als siebten Tag derselben Woche', () => {
    const woche = wochenStreifen([], '2026-10-18')
    expect(woche[0].datum).toBe('2026-10-12')
    expect(woche[6]).toMatchObject({ label: 'So', datum: '2026-10-18', heute: true })
  })

  it('läuft über den Monatswechsel', () => {
    // Sonntag, 01.11.2026 → Woche beginnt am 26.10.
    const woche = wochenStreifen([], '2026-11-01')
    expect(woche[0].datum).toBe('2026-10-26')
    expect(woche[6].datum).toBe('2026-11-01')
  })

  it('läuft über den Jahreswechsel', () => {
    // Freitag, 01.01.2027 → Woche beginnt am 28.12.2026
    const woche = wochenStreifen([], '2027-01-01')
    expect(woche[0].datum).toBe('2026-12-28')
    expect(woche[4]).toMatchObject({ datum: '2027-01-01', heute: true })
  })
})
```

In `src/hooks/use-training-streak.test.ts` im ersten Test nach `expect(result.current.streak).toBe(2)` ergänzen, im Fehlertest nach `streak).toBe(0)`:

```ts
    expect(result.current.tage).toHaveLength(2)
```
```ts
    expect(result.current.tage).toEqual([])
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run src/lib/calorie-status.test.ts src/lib/meal-sections.test.ts src/lib/streak.test.ts src/hooks/use-training-streak.test.ts`
Expected: FAIL (Module/Exports fehlen, `tage` undefined).

- [ ] **Step 3: Implementieren**

`src/lib/calorie-status.ts`:

```ts
export type KalorienStatus = {
  /** Gerundete gegessene kcal. */
  gegessen: number
  titel: string
  untertitel: string | null
  /** 0–1, Anteil des Ziels; ohne Ziel immer 0. */
  anteil: number
  ringLabel: string
}

/**
 * Gemeinsame Sprachregelung für Home und Ernährung. Ein Ziel ≤ 0 gilt als
 * „kein Ziel“, damit der Ring nie durch 0 teilt oder negativ läuft.
 */
export function kalorienStatus(verbrauchtExakt: number, ziel: number | null): KalorienStatus {
  const gegessen = Math.round(verbrauchtExakt)
  if (ziel == null || ziel <= 0) {
    return {
      gegessen,
      titel: `${gegessen} kcal gegessen`,
      untertitel: null,
      anteil: 0,
      ringLabel: `${gegessen} kcal gegessen, kein Ziel gesetzt`,
    }
  }
  const uebrig = Math.round(ziel - verbrauchtExakt)
  const titel = uebrig >= 0 ? `${uebrig} kcal übrig` : `${-uebrig} kcal drüber`
  return {
    gegessen,
    titel,
    untertitel: `Ziel ${ziel} kcal · ${gegessen} gegessen`,
    anteil: Math.min(1, Math.max(0, verbrauchtExakt / ziel)),
    ringLabel: `${titel}, Ziel ${ziel} kcal`,
  }
}
```

An `src/lib/meal-sections.ts` anhängen:

```ts
/**
 * Vorbelegung für den Schnell-Eintrag: nach Tageszeit der 1.–4. benannte
 * Abschnitt (vor 10 Uhr, bis 15, bis 21, danach), begrenzt auf die vorhandene
 * Anzahl. Nach Position statt nach Name, weil die Namen frei editierbar sind.
 */
export function abschnittFuerUhrzeit(sections: MealSection[], jetzt: Date): number | null {
  if (sections.length === 0) return null
  const stunde = jetzt.getHours()
  const position = stunde < 10 ? 0 : stunde < 15 ? 1 : stunde < 21 ? 2 : 3
  return sections[Math.min(position, sections.length - 1)].slot
}
```

An `src/lib/streak.ts` anhängen (`pad` und `localDay` existieren dort bereits):

```ts
/** Sortierte, eindeutige lokale Kalendertage mit mindestens einer beendeten Session. */
export function trainingstage(sessions: { beendet_am: string | null }[]): string[] {
  const tage = new Set<string>()
  for (const session of sessions) {
    if (session.beendet_am != null) tage.add(localDay(session.beendet_am))
  }
  return [...tage].sort()
}

export type WochenTag = { label: string; datum: string; trainiert: boolean; heute: boolean }

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

/**
 * Montag bis Sonntag der Woche von `heute`. Datumsarithmetik über lokale
 * Kalenderfelder (wie vorherigerTag), nicht über Millisekunden, damit ein
 * Sommerzeitwechsel keinen Tag verschiebt.
 */
export function wochenStreifen(tage: string[], heute: string): WochenTag[] {
  const [jahr, monat, tag] = heute.split('-').map(Number)
  const seitMontag = (new Date(jahr, monat - 1, tag).getDay() + 6) % 7
  const trainiert = new Set(tage)
  return WOCHENTAGE.map((label, index) => {
    const datum = new Date(jahr, monat - 1, tag - seitMontag + index)
    const iso = `${datum.getFullYear()}-${pad(datum.getMonth() + 1)}-${pad(datum.getDate())}`
    return { label, datum: iso, trainiert: trainiert.has(iso), heute: iso === heute }
  })
}
```

`src/hooks/use-training-streak.ts`: Import `import { aktuellerStreak, trainingstage } from '../lib/streak'`, State `const [tage, setTage] = useState<string[]>([])`, in `reload` nach `if (current !== requestId.current) return`:

```ts
    setStreak(ergebnis.failed ? 0 : aktuellerStreak(ergebnis.rows, localDay(new Date().toISOString())))
    setTage(ergebnis.failed ? [] : trainingstage(ergebnis.rows))
    setLoading(false)
```
und `return { streak, tage, loading }`. Doc-Kommentar des Hooks um „Verwendet zusätzlich vom Wochenstreifen (TrainingPage)“ ergänzen.

- [ ] **Step 4: Tests grün**

Run: `npx vitest run src/lib/calorie-status.test.ts src/lib/meal-sections.test.ts src/lib/streak.test.ts src/hooks/use-training-streak.test.ts`
Expected: PASS. Dann `npx tsc -b --noEmit` (Konsumenten von `useTrainingStreak` bleiben kompatibel, weil nur ein Feld hinzukommt).

- [ ] **Step 5: Commit**

```bash
git add src/lib src/hooks
git commit -m "feat: pure helpers for hero status, week strip and meal section by time" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Rezepte, Skeleton, PageSkeleton, EmptyState

**Files:**
- Modify: `src/lib/ui-classes.ts`
- Create: `src/components/Skeleton.tsx`, `src/components/PageSkeleton.tsx`, `src/components/PageSkeleton.test.tsx`
- Create: `src/components/EmptyState.tsx`, `src/components/EmptyState.test.tsx`

**Interfaces:**
- Produces (ui-classes): `skeletonClass`, `heroTitleClass`, `tileClass`, `tileLabelClass`, `tileValueClass` (alle `string`).
- Produces: `Skeleton({ className?: string })`; `PageSkeleton({ titel: string; variante?: 'dashboard' | 'liste' })` (default export) und `ChartSkeleton()` (named export); `EmptyState({ titel: string; text?: string; action?: ReactNode })`.

- [ ] **Step 1: Failing tests**

`src/components/PageSkeleton.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import PageSkeleton, { ChartSkeleton } from './PageSkeleton'

afterEach(cleanup)

describe('PageSkeleton', () => {
  it('zeigt die Überschrift und meldet den Ladezustand als Status', () => {
    render(<PageSkeleton titel="Training" />)
    expect(screen.getByRole('heading', { name: 'Training' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Lädt…')
  })

  it('hält die Platzhalter vor Hilfstechnik verborgen', () => {
    const { container } = render(<PageSkeleton titel="Training" variante="liste" />)
    const blocks = container.querySelectorAll('[aria-hidden="true"]')
    expect(blocks.length).toBeGreaterThan(0)
  })

  it('pulsiert nur ohne reduzierte Bewegung', () => {
    const { container } = render(<PageSkeleton titel="Training" />)
    const block = container.querySelector('[aria-hidden="true"]')
    expect(block).toHaveClass('animate-pulse', 'motion-reduce:animate-none')
  })
})

describe('ChartSkeleton', () => {
  it('meldet den Ladezustand als Status', () => {
    render(<ChartSkeleton />)
    expect(screen.getByRole('status')).toHaveTextContent('Lädt…')
  })
})
```

`src/components/EmptyState.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import EmptyState from './EmptyState'

afterEach(cleanup)

describe('EmptyState', () => {
  it('zeigt Titel, Text und Aktion in einer Karte', () => {
    render(<EmptyState titel="Kein aktiver Plan." text="Lege einen Plan an." action={<a href="/x">Anlegen</a>} />)
    expect(screen.getByRole('heading', { name: 'Kein aktiver Plan.' })).toBeInTheDocument()
    expect(screen.getByText('Lege einen Plan an.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Anlegen' })).toBeInTheDocument()
    expect(screen.getByRole('heading').closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
  })

  it('kommt ohne Text und Aktion aus', () => {
    render(<EmptyState titel="Noch nichts da." />)
    expect(screen.getByRole('heading', { name: 'Noch nichts da.' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2:** `npx vitest run src/components/PageSkeleton.test.tsx src/components/EmptyState.test.tsx` → FAIL (Module fehlen).

- [ ] **Step 3: Implementieren**

An `src/lib/ui-classes.ts` anhängen:

```ts
/** Platzhalter-Block für Ladezustände; pulsiert nur ohne prefers-reduced-motion. */
export const skeletonClass = 'rounded-2xl bg-surface-raised animate-pulse motion-reduce:animate-none'

/** Titel eines PageHero: eine Stufe unter statClass, damit er neben dem Ring nicht umbricht. */
export const heroTitleClass = 'text-2xl font-bold tracking-tight tabular-nums'

/** Kennzahl-Kachel im StatStrip: eigene Fläche auf der Seite, Label und Wert eine Stufe kleiner als im Hero. */
export const tileClass = 'rounded-2xl bg-surface p-3 space-y-1'
export const tileLabelClass = 'text-xs font-medium text-text-muted'
export const tileValueClass = 'text-xl font-bold tracking-tight tabular-nums'
```

`src/components/Skeleton.tsx`:

```tsx
import { skeletonClass } from '../lib/ui-classes'

/** Reiner Platzhalter: vor Hilfstechnik verborgen, den Ladezustand meldet der umgebende role="status". */
export default function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`${skeletonClass} ${className}`} />
}
```

`src/components/PageSkeleton.tsx`:

```tsx
import Skeleton from './Skeleton'

/** Ladezustand eines einzelnen Graphen (Dashboards und Chart-Listen). */
export function ChartSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Lädt…</span>
      <Skeleton className="h-64" />
    </div>
  )
}

/**
 * Ladezustand einer ganzen Seite in der Form der fertigen Seite (nichts
 * springt). Der sr-only-Text hält Zugänglichkeit und Tests, die auf „Lädt…“
 * prüfen, stabil. Genau ein Wurzel-Element, damit der 24-px-Rhythmus aus
 * main > * greift.
 */
export default function PageSkeleton({
  titel,
  variante = 'dashboard',
}: {
  titel: string
  variante?: 'dashboard' | 'liste'
}) {
  return (
    <div>
      <h1>{titel}</h1>
      <div role="status" className="flex flex-col gap-6">
        <span className="sr-only">Lädt…</span>
        {variante === 'dashboard' ? (
          <>
            <Skeleton className="h-14" />
            <Skeleton className="h-44" />
            <Skeleton className="h-52" />
          </>
        ) : (
          <Skeleton className="h-56" />
        )}
      </div>
    </div>
  )
}
```

`src/components/EmptyState.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cardClass } from '../lib/ui-classes'

/** Leerzustand mit Ausweg: Titel, ein Satz, eine Aktion (PressableLink oder Pressable). */
export default function EmptyState({ titel, text, action }: { titel: string; text?: string; action?: ReactNode }) {
  return (
    <div className={cardClass}>
      <h2>{titel}</h2>
      {text && <p className="text-text-muted">{text}</p>}
      {action}
    </div>
  )
}
```

- [ ] **Step 4:** Tests aus Step 2 erneut laufen lassen → PASS; `npm run lint` sauber.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui-classes.ts src/components
git commit -m "feat: skeleton, page skeleton and empty state building blocks" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: ProgressRing, PageHero, StatStrip, WeekStrip, LinkListCard

**Files:**
- Modify: `src/index.css`
- Create: `src/components/ProgressRing.tsx`, `PageHero.tsx`, `StatStrip.tsx`, `WeekStrip.tsx`, `LinkListCard.tsx` (alle in `src/components/`) und je eine `*.test.tsx` daneben.

**Interfaces:**
- Consumes: `heroTitleClass`, `tileClass`, `tileLabelClass`, `tileValueClass`, `cardClass`, `labelClass`, `listClass`, `listRowClass`, `linkClass` (Task 2 / vorhanden); `WochenTag` (Task 1); `PressableLink`, `VitaIcon`, `VitaIconName`.
- Produces: `ProgressRing({ anteil: number; label: string; size?: number })`; `PageHero({ label: string; titel: string; untertitel?: ReactNode; aside?: ReactNode; action?: ReactNode; titelClass?: string; titelTestId?: string })`; `type StatTile = { label: string; wert: string; hinweis?: string; balken?: { anteil: number; farbe: string } }` und `StatStrip({ tiles: StatTile[] })`; `WeekStrip({ tage: WochenTag[] })`; `type LinkListItem = { to: string; label: string; icon?: VitaIconName; wert?: string; ariaLabel?: string }` und `LinkListCard({ items: LinkListItem[] })`.

- [ ] **Step 1: Failing tests**

`ProgressRing.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ProgressRing from './ProgressRing'

afterEach(cleanup)

const LAENGE = 2 * Math.PI * 30

describe('ProgressRing', () => {
  it('hat eine Textalternative', () => {
    render(<ProgressRing anteil={0.5} label="640 kcal übrig, Ziel 2000 kcal" />)
    expect(screen.getByRole('img', { name: '640 kcal übrig, Ziel 2000 kcal' })).toBeInTheDocument()
  })

  it('füllt den Ring anteilig', () => {
    const { container } = render(<ProgressRing anteil={0.25} label="x" />)
    const fortschritt = container.querySelector('.ring-fill') as SVGElement
    expect(parseFloat(fortschritt.getAttribute('stroke-dashoffset') ?? '')).toBeCloseTo(LAENGE * 0.75)
  })

  it('begrenzt auf 0 bis 1', () => {
    const { container } = render(<ProgressRing anteil={7} label="x" />)
    expect(parseFloat((container.querySelector('.ring-fill') as SVGElement).getAttribute('stroke-dashoffset') ?? '')).toBeCloseTo(0)
  })

  it('zeichnet bei 0 keinen Fortschrittsbogen (kein Punkt durch runde Kappe)', () => {
    const { container } = render(<ProgressRing anteil={0} label="x" />)
    expect(container.querySelector('.ring-fill')).toBeNull()
  })
})
```

`PageHero.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import PageHero from './PageHero'

afterEach(cleanup)

describe('PageHero', () => {
  it('zeigt Label, Titel, Untertitel und Aktion in einer benannten Region', () => {
    render(
      <PageHero
        label="Heute · Plan"
        titel="Pull"
        untertitel="Letztes Training vor 2 Tagen"
        action={<button type="button">Los</button>}
      />,
    )
    const region = screen.getByRole('region', { name: 'Heute · Plan' })
    expect(region).toHaveClass('bg-surface', 'rounded-3xl')
    expect(screen.getByText('Pull')).toBeInTheDocument()
    expect(screen.getByText('Letztes Training vor 2 Tagen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Los' })).toBeInTheDocument()
  })

  it('kommt ohne Untertitel, Aside und Aktion aus und reicht Titel-Klasse und Test-ID durch', () => {
    render(<PageHero label="Gewicht" titel="82,5 kg" titelClass="text-3xl" titelTestId="wert" />)
    expect(screen.getByTestId('wert')).toHaveClass('text-3xl')
  })
})
```

`StatStrip.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import StatStrip from './StatStrip'

afterEach(cleanup)

describe('StatStrip', () => {
  it('zeigt jede Kachel mit Label, Wert und Hinweis', () => {
    render(
      <StatStrip
        tiles={[
          { label: 'Streak', wert: '4', hinweis: '4 Tage in Folge' },
          { label: 'Gewicht', wert: '—', hinweis: 'Keine Messwerte.' },
        ]}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Streak')).toBeInTheDocument()
    expect(screen.getByText('4 Tage in Folge')).toBeInTheDocument()
    expect(screen.getByText('Keine Messwerte.')).toBeInTheDocument()
  })

  it('zeichnet einen Balken anteilig und begrenzt auf 0–100 %', () => {
    const { container } = render(
      <StatStrip
        tiles={[
          { label: 'A', wert: '1', balken: { anteil: 0.4, farbe: '#6efde6' } },
          { label: 'B', wert: '2', balken: { anteil: 3, farbe: '#4f6ca5' } },
        ]}
      />,
    )
    const fuellungen = container.querySelectorAll<HTMLElement>('[style*="width"]')
    expect(fuellungen[0].style.width).toBe('40%')
    expect(fuellungen[1].style.width).toBe('100%')
  })

  it('legt die Kachel auf eine eigene Fläche, nicht in eine Karte', () => {
    render(<StatStrip tiles={[{ label: 'A', wert: '1' }]} />)
    expect(screen.getByText('A').closest('div')).toHaveClass('bg-surface')
  })
})
```

`WeekStrip.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import WeekStrip from './WeekStrip'
import { wochenStreifen } from '../lib/streak'

afterEach(cleanup)

describe('WeekStrip', () => {
  it('zeigt sieben Tage mit Status für Screenreader', () => {
    render(<WeekStrip tage={wochenStreifen(['2026-10-12', '2026-10-14'], '2026-10-14')} />)
    const liste = screen.getByRole('list', { name: 'Trainingstage diese Woche' })
    const eintraege = Array.from(liste.querySelectorAll('li'))
    expect(eintraege).toHaveLength(7)
    expect(eintraege[0]).toHaveAttribute('data-status', 'trainiert')
    expect(eintraege[1]).toHaveAttribute('data-status', 'offen')
    expect(eintraege[2]).toHaveTextContent('trainiert, heute')
    expect(eintraege[3]).toHaveTextContent('kein Training')
  })
})
```

`LinkListCard.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LinkListCard from './LinkListCard'

afterEach(cleanup)

function zeige(items: Parameters<typeof LinkListCard>[0]['items']) {
  return render(<LinkListCard items={items} />, { wrapper: MemoryRouter })
}

describe('LinkListCard', () => {
  it('rendert jede Zeile als Link in einer einzigen Karte mit Trennlinien', () => {
    zeige([
      { to: '/a', label: 'Pläne', icon: 'plans' },
      { to: '/b', label: 'Historie', icon: 'history' },
    ])
    expect(screen.getByRole('link', { name: 'Pläne' })).toHaveAttribute('href', '/a')
    const liste = screen.getByRole('list')
    expect(liste).toHaveClass('divide-y')
    expect(liste.closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
    expect(screen.getAllByRole('listitem')[0]).not.toHaveClass('bg-surface')
  })

  it('zeigt einen Wert rechts und kann den zugänglichen Namen überschreiben', () => {
    zeige([{ to: '/c', label: 'Frühstück', wert: '150 kcal', ariaLabel: 'Frühstück — 150 kcal' }])
    const link = screen.getByRole('link', { name: 'Frühstück — 150 kcal' })
    expect(link).toHaveTextContent('150 kcal')
  })

  it('kommt ohne Icon aus', () => {
    zeige([{ to: '/d', label: 'Ohne Icon' }])
    expect(screen.getByRole('link', { name: 'Ohne Icon' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2:** `npx vitest run src/components/ProgressRing.test.tsx src/components/PageHero.test.tsx src/components/StatStrip.test.tsx src/components/WeekStrip.test.tsx src/components/LinkListCard.test.tsx` → FAIL.

- [ ] **Step 3: Implementieren**

An `src/index.css` (ganz ans Ende) anhängen:

```css
@keyframes ring-fill {
  from { stroke-dashoffset: var(--ring-length); }
}
.ring-fill { animation: ring-fill 700ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .ring-fill { animation: none; }
}
```

`ProgressRing.tsx`:

```tsx
import type { CSSProperties } from 'react'

const RADIUS = 30
const LAENGE = 2 * Math.PI * RADIUS

/**
 * Ring als reine SVG-Grafik; die Füllung beim Mount ist CSS (.ring-fill in
 * index.css, unter reduced-motion aus), kein GSAP. Der Bogen entfällt bei 0,
 * weil die runde Kappe sonst einen Punkt zeichnen würde.
 */
export default function ProgressRing({ anteil, label, size = 72 }: { anteil: number; label: string; size?: number }) {
  const gefuellt = Math.min(1, Math.max(0, anteil))
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox="0 0 72 72" className="shrink-0 -rotate-90">
      <circle cx="36" cy="36" r={RADIUS} fill="none" strokeWidth="8" className="stroke-surface-raised" />
      {gefuellt > 0 && (
        <circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="ring-fill stroke-chart-mint"
          strokeDasharray={LAENGE}
          strokeDashoffset={LAENGE * (1 - gefuellt)}
          style={{ '--ring-length': LAENGE } as CSSProperties}
        />
      )}
    </svg>
  )
}
```

`PageHero.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cardClass, heroTitleClass, labelClass } from '../lib/ui-classes'

type Props = {
  label: string
  titel: string
  untertitel?: ReactNode
  /** z. B. ProgressRing links neben dem Titel. */
  aside?: ReactNode
  /** Genau eine Hauptaktion: Pressable variant="primary" oder PressableLink variant="primary". */
  action?: ReactNode
  titelClass?: string
  titelTestId?: string
}

export default function PageHero({
  label,
  titel,
  untertitel,
  aside,
  action,
  titelClass = heroTitleClass,
  titelTestId,
}: Props) {
  return (
    <section className={cardClass} aria-label={label}>
      <div className="flex items-center gap-4">
        {aside}
        <div className="flex min-w-0 flex-col gap-1">
          <p className={labelClass}>{label}</p>
          <p className={titelClass} data-testid={titelTestId}>
            {titel}
          </p>
          {untertitel && <div className="text-sm text-text-muted">{untertitel}</div>}
        </div>
      </div>
      {action}
    </section>
  )
}
```

`StatStrip.tsx`:

```tsx
import { tileClass, tileLabelClass, tileValueClass } from '../lib/ui-classes'

export type StatTile = {
  label: string
  wert: string
  hinweis?: string
  balken?: { anteil: number; farbe: string }
}

export default function StatStrip({ tiles }: { tiles: StatTile[] }) {
  return (
    <ul role="list" className="flex gap-2">
      {tiles.map((tile) => (
        <li key={tile.label} className="min-w-0 flex-1">
          <div className={`${tileClass} h-full`}>
            <p className={tileLabelClass}>{tile.label}</p>
            <p className={tileValueClass}>{tile.wert}</p>
            {tile.hinweis && <p className={tileLabelClass}>{tile.hinweis}</p>}
            {tile.balken && (
              <div className="h-1.5 rounded-full bg-surface-raised">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(Math.min(1, Math.max(0, tile.balken.anteil)) * 100)}%`,
                    backgroundColor: tile.balken.farbe,
                  }}
                />
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
```

`WeekStrip.tsx`:

```tsx
import type { WochenTag } from '../lib/streak'
import { tileLabelClass } from '../lib/ui-classes'

/** Reine Anzeige: Mo–So der aktuellen Woche, trainiert in Akzentfarbe, heute mit türkisem Ring. */
export default function WeekStrip({ tage }: { tage: WochenTag[] }) {
  return (
    <ul role="list" aria-label="Trainingstage diese Woche" className="flex gap-1.5">
      {tage.map((tag) => (
        <li
          key={tag.datum}
          data-status={tag.trainiert ? 'trainiert' : 'offen'}
          className="flex flex-1 flex-col items-center gap-1"
        >
          <span className={tileLabelClass}>{tag.label}</span>
          <span
            className={`block h-7 w-full rounded-xl ${tag.trainiert ? 'bg-accent' : 'bg-surface-raised'} ${
              tag.heute ? 'ring-2 ring-chart-mint' : ''
            }`}
          />
          <span className="sr-only">{`${tag.trainiert ? 'trainiert' : 'kein Training'}${tag.heute ? ', heute' : ''}`}</span>
        </li>
      ))}
    </ul>
  )
}
```

`LinkListCard.tsx`:

```tsx
import { PressableLink } from './Pressable'
import { VitaIcon, type VitaIconName } from './icons/VitaIcon'
import { cardClass, linkClass, listClass, listRowClass } from '../lib/ui-classes'

export type LinkListItem = {
  to: string
  label: string
  icon?: VitaIconName
  /** Wert rechts, z. B. „150 kcal“. */
  wert?: string
  /** Überschreibt den zugänglichen Namen, wenn Label und Wert zusammen gelesen werden sollen. */
  ariaLabel?: string
}

/** Eine Karte, Zeilen mit dezenter Trennlinie — ersetzt gestapelte Textlinks und Karte-pro-Zeile. */
export default function LinkListCard({ items }: { items: LinkListItem[] }) {
  return (
    <div className={cardClass}>
      <ul role="list" className={listClass}>
        {items.map((item, index) => (
          <li key={`${index}|${item.to}|${item.label}`} className={listRowClass}>
            <PressableLink to={item.to} className={`${linkClass} flex-1`} aria-label={item.ariaLabel}>
              {item.icon && <VitaIcon name={item.icon} tone="brand" size={20} />}
              <span>{item.label}</span>
              {item.wert && <span className="ml-auto tabular-nums text-text">{item.wert}</span>}
              <span aria-hidden="true" className={`${item.wert ? '' : 'ml-auto'} text-text-muted`}>
                ›
              </span>
            </PressableLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4:** Tests aus Step 2 → PASS; `npm run lint` und `npx tsc -b --noEmit` sauber.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components
git commit -m "feat: hero, stat strip, week strip, progress ring and link list card" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: TrainingPage

**Files:**
- Modify: `src/pages/TrainingPage.tsx`, `src/pages/TrainingPage.test.tsx`

**Interfaces:**
- Consumes: `useTrainingStreak` (`tage`), `wochenStreifen`, `localDay`, `PageHero`, `WeekStrip`, `LinkListCard`, `EmptyState`, `PageSkeleton`, `ChartSkeleton`, `Skeleton`.

- [ ] **Step 1: Tests anpassen und ergänzen** (`src/pages/TrainingPage.test.tsx`)

Das bestehende `afterEach` (`cleanup(); vi.clearAllMocks()`) um `vi.useRealTimers()` erweitern, damit ein fehlschlagender Test keine Fake-Timer in die folgenden trägt. Direkt unter dem `use-workout-session`-Mock ergänzen (das Hook-Modul darf in keinem Test echt laufen):

```tsx
const mockUseTrainingStreak = vi.fn()
vi.mock('../hooks/use-training-streak', () => ({
  useTrainingStreak: (userId: string) => mockUseTrainingStreak(userId),
}))
```

In `beforeEach`-freien Bereich: oben nach `afterEach` einen `beforeEach` für den Streak-Default ergänzen (der bestehende `beforeEach` weiter unten für die Chart-Auswahl bleibt):

```tsx
beforeEach(() => {
  mockUseTrainingStreak.mockReturnValue({ streak: 0, tage: [], loading: false })
})
```

Änderung am Test „shows the active plan, the next day, and a link to manage plans“: die Zeile `expect(screen.getByText('Ganzkörper')).toBeInTheDocument()` wird zu

```tsx
    expect(screen.getByText('Heute · Ganzkörper')).toBeInTheDocument()
```

Neue Tests im Block `describe('TrainingPage', ...)` (vor dessen schließender Klammer):

```tsx
  it('shows a skeleton with the heading while the plan loads', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue({ plan: null, day: null, loading: true })

    zeigeDashboard()

    expect(screen.getByRole('heading', { name: 'Training' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Lädt…')
  })

  it('shows the week strip with todays training day marked', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 14, 12, 0)) // Mittwoch
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue(activeDay)
    mockUseTrainingStreak.mockReturnValue({ streak: 1, tage: ['2026-10-12', '2026-10-14'], loading: false })

    zeigeDashboard()

    const liste = screen.getByRole('list', { name: 'Trainingstage diese Woche' })
    const eintraege = Array.from(liste.querySelectorAll('li'))
    expect(eintraege.map((li) => li.getAttribute('data-status'))).toEqual([
      'trainiert', 'offen', 'trainiert', 'offen', 'offen', 'offen', 'offen',
    ])
    expect(eintraege[2]).toHaveTextContent('heute')
  })

  it('groups the area links in one list card', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue(activeDay)

    zeigeDashboard()

    const link = screen.getByRole('link', { name: 'Trainingshistorie' })
    expect(link).toHaveAttribute('href', '/training/history')
    expect(link.closest('ul')).toHaveClass('divide-y')
    expect(screen.getByRole('link', { name: 'Übungen' })).toHaveAttribute('href', '/training/exercises')
  })

  it('offers a way out for a plan without days', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue({ plan: activeDay.plan, day: null, loading: false })

    zeigeDashboard()

    expect(screen.getByRole('link', { name: 'Plan bearbeiten' })).toHaveAttribute('href', '/training/plans/p1')
  })

  it('renders cleanly for a brand-new account (no plan, no sessions)', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue({ plan: null, day: null, loading: false })

    const { container } = zeigeDashboard()

    expect(container.textContent).not.toMatch(/undefined|NaN/)
    expect(screen.getByRole('heading', { name: 'Kein aktiver Plan.' })).toBeInTheDocument()
  })
```

Im bestehenden Test „shows a message and no start button when no plan is active“ bleibt alles gültig (`/kein aktiver plan/i` trifft genau die Überschrift, der Beschreibungstext enthält diese Wortfolge nicht).

- [ ] **Step 2:** `npx vitest run src/pages/TrainingPage.test.tsx` → FAIL (u. a. `Heute · Ganzkörper`, Skeleton, Wochenliste).

- [ ] **Step 3: `src/pages/TrainingPage.tsx` ersetzen (nur der Komponententeil oberhalb von `DashboardTrainingCharts`; die beiden Chart-Funktionen darunter bleiben bis auf `ChartSkeleton` unverändert)**

Imports: `Skeleton`/`PageSkeleton`/`ChartSkeleton`, `PageHero`, `WeekStrip`, `LinkListCard`, `EmptyState`, `useTrainingStreak`, `wochenStreifen`, `localDay` ergänzen; `cardClass, labelClass, linkClass` aus `ui-classes` und `VitaIcon` bleiben nur, wenn noch genutzt (`VitaIcon` wird für die Buttons weiter gebraucht, `cardClass/labelClass/linkClass` entfallen).

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useActiveTrainingDay } from '../hooks/use-active-training-day'
import { startWorkoutSession } from '../hooks/use-workout-session'
import { useTrainingStreak } from '../hooks/use-training-streak'
import { useChartSelection } from '../components/charts/ChartPicker'
import { useTrainingAnalysis } from '../hooks/use-training-analysis'
import TrainingChartList from '../components/charts/TrainingChartList'
import { chartsFor } from '../lib/analysis/registry'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
import { useToast } from '../components/ToastProvider'
import { VitaIcon } from '../components/icons/VitaIcon'
import { wochenAktiv } from '../lib/plan-alter'
import { wochenStreifen } from '../lib/streak'
import { localDay } from '../lib/local-time'
import Pressable, { PressableLink } from '../components/Pressable'
import PageHero from '../components/PageHero'
import WeekStrip from '../components/WeekStrip'
import LinkListCard from '../components/LinkListCard'
import EmptyState from '../components/EmptyState'
import PageSkeleton, { ChartSkeleton } from '../components/PageSkeleton'
import Skeleton from '../components/Skeleton'

export default function TrainingPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Training" />

  return <Dashboard userId={userId} />
}

function Dashboard({ userId }: { userId: string }) {
  const { plan, day, loading } = useActiveTrainingDay(userId)
  const { tage, loading: streakLoading } = useTrainingStreak(userId)
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const showToast = useToast()
  const auswahl = useChartSelection(userId)

  if (loading) return <PageSkeleton titel="Training" />

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

  const wochenAktivSeit = plan != null ? wochenAktiv(plan.created_at, new Date()) : 0

  return (
    <div>
      <h1>Training</h1>
      {plan != null && plan.dauer_wochen != null && wochenAktivSeit >= plan.dauer_wochen && (
        <p>
          Dieser Plan läuft seit {wochenAktivSeit} {wochenAktivSeit === 1 ? 'Woche' : 'Wochen'} —{' '}
          <PressableLink to="/training/plans/new">Zeit für einen neuen?</PressableLink>
        </p>
      )}
      {streakLoading ? (
        <Skeleton className="h-14" />
      ) : (
        <WeekStrip tage={wochenStreifen(tage, localDay(new Date().toISOString()))} />
      )}
      {plan == null && (
        <EmptyState
          titel="Kein aktiver Plan."
          text="Lege einen Plan an, dann siehst du hier, was heute ansteht."
          action={
            <PressableLink variant="primary" to="/training/plans">
              <span className="inline-flex items-center justify-center gap-2">
                <VitaIcon name="plans" tone="mono" size={20} />
                Trainingsplan anlegen
              </span>
            </PressableLink>
          }
        />
      )}
      {plan != null && day == null && (
        <EmptyState
          titel={plan.name}
          text="Dieser Plan hat noch keinen Tag."
          action={
            <PressableLink variant="primary" to={`/training/plans/${plan.id}`}>
              Plan bearbeiten
            </PressableLink>
          }
        />
      )}
      {plan != null && day != null && (
        <PageHero
          label={`Heute · ${plan.name}`}
          titel={day.name}
          action={
            <Pressable variant="primary" type="button" disabled={starting} onClick={() => start(day.id)}>
              <span className="inline-flex items-center justify-center gap-2">
                <VitaIcon name="start" tone="mono" size={20} />
                Training starten
              </span>
            </Pressable>
          }
        />
      )}
      <LinkListCard
        items={[
          { to: '/training/plans', label: 'Meine Pläne', icon: 'plans' },
          { to: '/training/exercises', label: 'Übungen', icon: 'exercises' },
          { to: '/training/history', label: 'Trainingshistorie', icon: 'history' },
          { to: '/training/analyse', label: 'Analyse', icon: 'analysis' },
        ]}
      />
      <DashboardTrainingCharts userId={userId} auswahl={auswahl.auswahl} />
    </div>
  )
}
```

In `DashboardTrainingChartsData`: `if (loading) return <p>Lädt…</p>` → `if (loading) return <ChartSkeleton />`.

- [ ] **Step 4:** `npx vitest run src/pages/TrainingPage.test.tsx` → PASS; `npm run lint`, `npx tsc -b --noEmit` sauber.

- [ ] **Step 5: Commit**

```bash
git add src/pages/TrainingPage.tsx src/pages/TrainingPage.test.tsx
git commit -m "feat: training dashboard with hero, week strip and link list" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Ernährung – QuickAddDialog und NutritionPage

**Files:**
- Modify: `src/lib/analysis/nutrition-charts.ts`, `src/components/charts/MacroDistributionChart.tsx`
- Create: `src/components/QuickAddDialog.tsx`, `src/components/QuickAddDialog.test.tsx`
- Modify: `src/pages/NutritionPage.tsx`, `src/pages/NutritionPage.test.tsx`

**Interfaces:**
- Consumes: `kalorienStatus`, `abschnittFuerUhrzeit`, `mealSections`, `makroAnteileHeute`, `MAKRO_LABEL`, `PageHero`, `ProgressRing`, `StatStrip`, `LinkListCard`, `Dialog`, `Chip`, `AddEntryFlow`, `PageSkeleton`, `ChartSkeleton`.
- Produces: `MAKRO_FARBEN: Record<string, string>` (exportiert aus `nutrition-charts.ts`); `QuickAddDialog({ open: boolean; onClose: () => void; sections: MealSection[]; addEntry: (productId: string, menge: number, mahlzeit: number | null) => Promise<void> })`.

- [ ] **Step 1: `MAKRO_FARBEN` verschieben (Refactor ohne Verhaltensänderung)**

In `src/lib/analysis/nutrition-charts.ts` Import `import { CHART_BLUE, CHART_GREEN, CHART_MINT } from './chart-colors'` ergänzen und direkt hinter `MAKRO_LABEL` einfügen:

```ts
/** Farben nach Makro-Namen: Eiweiß bleibt Mint, unabhängig von der Reihenfolge in den Daten (E2 und Makro-Kacheln). */
export const MAKRO_FARBEN: Record<string, string> = {
  [MAKRO_LABEL.eiweiss]: CHART_MINT,
  [MAKRO_LABEL.kohlenhydrate]: CHART_BLUE,
  [MAKRO_LABEL.fett]: CHART_GREEN,
}
```

In `src/components/charts/MacroDistributionChart.tsx` die lokale `const MAKRO_FARBEN …`-Definition samt ihrem Kommentarblock entfernen, `MAKRO_FARBEN` aus `'../../lib/analysis/nutrition-charts'` mitimportieren (dort kommt `MAKRO_LABEL` bereits her) und nicht mehr benötigte Importe (`CHART_BLUE`, `CHART_GREEN`; `CHART_MINT` bleibt, weil `fill={CHART_MINT}` es nutzt) entfernen. Danach: `npx vitest run src/components/charts/MacroDistributionChart.test.tsx src/lib/analysis` → PASS (Verhalten unverändert).

- [ ] **Step 2: Failing tests**

`src/components/QuickAddDialog.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import QuickAddDialog from './QuickAddDialog'

// ProductPicker (Barcode, Suche) ist hier nicht Gegenstand: der Stub meldet nur ein Produkt zurück.
vi.mock('./AddEntryFlow', () => ({
  default: ({ onAdd, onCancel }: { onAdd: (id: string, menge: number) => Promise<void>; onCancel?: () => void }) => (
    <div>
      <button type="button" onClick={() => onAdd('p1', 150).catch(() => {})}>
        Stub hinzufügen
      </button>
      <button type="button" onClick={onCancel}>
        Stub abbrechen
      </button>
    </div>
  ),
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const sections = [
  { slot: 1, name: 'Frühstück' },
  { slot: 2, name: 'Mittagessen' },
  { slot: 3, name: 'Abendessen' },
  { slot: 4, name: 'Snacks' },
]

function zeige(props: Partial<Parameters<typeof QuickAddDialog>[0]> = {}) {
  const onClose = vi.fn()
  const addEntry = vi.fn().mockResolvedValue(undefined)
  render(<QuickAddDialog open onClose={onClose} sections={sections} addEntry={addEntry} {...props} />, {
    wrapper: MemoryRouter,
  })
  return { onClose, addEntry }
}

describe('QuickAddDialog', () => {
  it('rendert nichts, solange er geschlossen ist', () => {
    zeige({ open: false })
    expect(screen.queryByRole('group', { name: 'Mahlzeit' })).not.toBeInTheDocument()
  })

  it('belegt den Abschnitt nach Tageszeit vor', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 18, 12, 30))
    zeige()
    expect(screen.getByRole('button', { name: 'Mittagessen' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Frühstück' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('speichert in den gewählten Abschnitt und schließt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 18, 8, 0))
    const { addEntry, onClose } = zeige()
    fireEvent.click(screen.getByRole('button', { name: 'Snacks' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stub hinzufügen' }))
    await waitFor(() => expect(addEntry).toHaveBeenCalledWith('p1', 150, 4))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('bleibt offen, wenn das Speichern fehlschlägt', async () => {
    const addEntry = vi.fn().mockRejectedValue(new Error('boom'))
    const { onClose } = zeige({ addEntry })
    fireEvent.click(screen.getByRole('button', { name: 'Stub hinzufügen' }))
    await waitFor(() => expect(addEntry).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
  })

  it('schließt über Abbrechen', () => {
    const { onClose } = zeige()
    fireEvent.click(screen.getByRole('button', { name: 'Stub abbrechen' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('zeigt ohne benannte Abschnitte einen Hinweis statt einer leeren Chip-Zeile', () => {
    zeige({ sections: [] })
    expect(screen.queryByRole('group', { name: 'Mahlzeit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stub hinzufügen' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Profil/ })).toHaveAttribute('href', '/profile')
  })
})
```

Änderungen an `src/pages/NutritionPage.test.tsx`:

(a) Ganz oben nach den Imports einen Mock für den Flow ergänzen (die Seite öffnet ihn nur im Dialog, die echten Produkt-Hooks sollen nicht laufen) und `fireEvent` in den Testing-Library-Import aufnehmen:

```tsx
vi.mock('../components/AddEntryFlow', () => ({
  default: ({ onAdd }: { onAdd: (id: string, menge: number) => Promise<void> }) => (
    <button type="button" onClick={() => onAdd('p1', 150)}>
      Stub hinzufügen
    </button>
  ),
}))
```

(b) Test „renders the dashboard sections once profile and entries are loaded“: die Zeile `expect(screen.getByRole('heading', { name: 'Heute' })).toBeInTheDocument()` wird zu

```tsx
    expect(screen.getByRole('region', { name: 'Heute' })).toBeInTheDocument()
```

(c) Neue Tests im ersten `describe('NutritionPage', …)` (vor dessen schließender Klammer):

```tsx
  it('shows the remaining calories and the goal in the hero', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    zeigeDashboard()

    expect(screen.getByText('2000 kcal übrig')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '2000 kcal übrig, Ziel 2000 kcal' })).toBeInTheDocument()
  })

  it('does not say "verbraucht" for food that was eaten', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    zeigeDashboard()

    expect(screen.queryByText(/verbraucht/)).not.toBeInTheDocument()
  })

  it('shows the three macros with grams', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    zeigeDashboard()

    expect(screen.getByText('Eiweiß')).toBeInTheDocument()
    expect(screen.getByText('Kohlenhydrate')).toBeInTheDocument()
    expect(screen.getByText('Fett')).toBeInTheDocument()
    expect(screen.getAllByText('0 g')).toHaveLength(3)
  })

  it('opens the quick-add dialog from the hero and saves into the chosen section', async () => {
    const addEntry = vi.fn().mockResolvedValue(undefined)
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult({ addEntry }))

    zeigeDashboard()
    expect(screen.queryByRole('group', { name: 'Mahlzeit' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Eintrag hinzufügen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abendessen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stub hinzufügen' }))

    await waitFor(() => expect(addEntry).toHaveBeenCalledWith('p1', 150, 3))
  })

  it('renders cleanly for a brand-new account without entries', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile: { ...profile, taegliches_kalorienziel: null, aktuelles_gewicht: null, alter: null, groesse: null, geschlecht: null, aktivitaetslevel: null } }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    const { container } = zeigeDashboard()

    expect(container.textContent).not.toMatch(/undefined|NaN/)
    expect(screen.getByText('0 kcal gegessen')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Profil vervollständigen' })).toHaveAttribute('href', '/profile')
  })
```

(`waitFor`/`fireEvent` im Import von `@testing-library/react` ergänzen.) Der bestehende Test „leaves goal editing to the profile page“ prüft `getByRole('link', { name: /Profil/ })` bei vorhandenem Ziel: es existiert genau ein Treffer („Ziel im Profil anpassen“). Der bestehende Test „passes the manual calorie goal“ (`/Ziel 2000 kcal/`) trifft jetzt den Hero-Untertitel „Ziel 2000 kcal · 0 gegessen“ – genau ein Element.

- [ ] **Step 3:** `npx vitest run src/components/QuickAddDialog.test.tsx src/pages/NutritionPage.test.tsx` → FAIL.

- [ ] **Step 4: Implementieren**

`src/components/QuickAddDialog.tsx`:

```tsx
import { useState } from 'react'
import AddEntryFlow from './AddEntryFlow'
import Chip from './Chip'
import Dialog from './Dialog'
import { PressableLink } from './Pressable'
import { abschnittFuerUhrzeit, type MealSection } from '../lib/meal-sections'
import { linkClass } from '../lib/ui-classes'

type Props = {
  open: boolean
  onClose: () => void
  sections: MealSection[]
  addEntry: (productId: string, menge: number, mahlzeit: number | null) => Promise<void>
}

/**
 * Schnell-Eintrag auf dem Ernährungs-Dashboard. Dialog hält seine Kinder auch
 * geschlossen gemountet (siehe Dialog.tsx) — der Inhalt wird deshalb nur bei
 * `open` gerendert, damit Abschnitt, Produkt und Fehler bei jedem Öffnen frisch
 * vorbelegt sind. Fehler bleiben im Dialog (AddEntryFlow zeigt sie inline):
 * ein Toast läge hinter dem Top-Layer des offenen <dialog>.
 */
export default function QuickAddDialog({ open, onClose, sections, addEntry }: Props) {
  return (
    <Dialog open={open} onClose={onClose}>
      {open && <QuickAddForm sections={sections} addEntry={addEntry} onClose={onClose} />}
    </Dialog>
  )
}

function QuickAddForm({ sections, addEntry, onClose }: Omit<Props, 'open'>) {
  const [slot, setSlot] = useState<number | null>(() => abschnittFuerUhrzeit(sections, new Date()))

  if (slot === null) {
    return (
      <div className="flex flex-col gap-4">
        <p>Lege im Profil mindestens eine Mahlzeit an, um Einträge zu speichern.</p>
        <PressableLink to="/profile" className={linkClass}>
          Zum Profil
        </PressableLink>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Mahlzeit" className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <Chip key={section.slot} active={section.slot === slot} onClick={() => setSlot(section.slot)}>
            {section.name}
          </Chip>
        ))}
      </div>
      <AddEntryFlow
        onAdd={async (productId, menge) => {
          await addEntry(productId, menge, slot)
          onClose()
        }}
        onCancel={onClose}
      />
    </div>
  )
}
```

`src/pages/NutritionPage.tsx` – der Komponententeil oberhalb von `DashboardNutritionCharts` wird ersetzt, die Chart-Funktionen darunter bleiben (nur `<p>Lädt…</p>` → `<ChartSkeleton />`):

```tsx
import { useState } from 'react'
import { useSession } from '../hooks/use-session'
import { useProfile, type Profile } from '../hooks/use-profile'
import { useFoodEntries } from '../hooks/use-food-entries'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'
import { mealSections, visibleSections } from '../lib/meal-sections'
import { sumKalorien } from '../lib/entry-calories'
import { kalorienStatus } from '../lib/calorie-status'
import { MAKRO_FARBEN, MAKRO_LABEL, makroAnteileHeute } from '../lib/analysis/nutrition-charts'
import { localDay } from '../lib/local-time'
import PageHero from '../components/PageHero'
import ProgressRing from '../components/ProgressRing'
import StatStrip from '../components/StatStrip'
import LinkListCard from '../components/LinkListCard'
import QuickAddDialog from '../components/QuickAddDialog'
import PageSkeleton, { ChartSkeleton } from '../components/PageSkeleton'
import { useChartSelection } from '../components/charts/ChartPicker'
import NutritionChartList from '../components/charts/NutritionChartList'
import { chartsFor } from '../lib/analysis/registry'
import { useNutritionAnalysis } from '../hooks/use-nutrition-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
import { VitaIcon } from '../components/icons/VitaIcon'
import Pressable, { PressableLink } from '../components/Pressable'

export default function NutritionPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Ernährung" />

  return <NutritionDashboard userId={userId} />
}

function NutritionDashboard({ userId }: { userId: string }) {
  const { profile, loading: profileLoading, error: profileError, reload } = useProfile(userId)
  const { entries, loading: entriesLoading, addEntry } = useFoodEntries(userId)
  const auswahl = useChartSelection(userId)
  const [addOpen, setAddOpen] = useState(false)

  if (profileLoading || entriesLoading) return <PageSkeleton titel="Ernährung" />

  if (profileError || !profile) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p role="alert">Profil konnte nicht geladen werden.</p>
        <Pressable variant="secondary" type="button" className="inline-flex items-center gap-2 self-start" onClick={() => reload()}>
          <VitaIcon name="retry" tone="brand" size={20} />
          Erneut versuchen
        </Pressable>
      </div>
    )
  }

  const goal = effectiveCalorieGoal(profile)
  const status = kalorienStatus(sumKalorien(entries), goal)
  const anteile = makroAnteileHeute(entries, localDay(new Date().toISOString()))
  const makroKacheln = [MAKRO_LABEL.eiweiss, MAKRO_LABEL.kohlenhydrate, MAKRO_LABEL.fett].map((label) => {
    const anteil = anteile.find((eintrag) => eintrag.makro === label)
    return {
      label,
      wert: `${anteil?.gramm ?? 0} g`,
      balken: { anteil: (anteil?.anteil ?? 0) / 100, farbe: MAKRO_FARBEN[label] },
    }
  })
  const sections = visibleSections(profile, entries)

  return (
    <div>
      <h1>Ernährung</h1>
      <PageHero
        label="Heute"
        titel={status.titel}
        untertitel={status.untertitel ?? undefined}
        aside={<ProgressRing anteil={status.anteil} label={status.ringLabel} />}
        action={
          <Pressable variant="primary" type="button" onClick={() => setAddOpen(true)}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="add" tone="mono" size={20} />
              Eintrag hinzufügen
            </span>
          </Pressable>
        }
      />
      <QuickAddDialog open={addOpen} onClose={() => setAddOpen(false)} sections={mealSections(profile)} addEntry={addEntry} />
      {goal == null && (
        <p>
          Für ein Tagesziel <PressableLink to="/profile">Profil vervollständigen</PressableLink>.
        </p>
      )}
      <StatStrip tiles={makroKacheln} />
      {sections.length > 0 && (
        <LinkListCard
          items={sections.map((section) => {
            const kcal = `${Math.round(
              sumKalorien(entries.filter((entry) => entry.mahlzeit === section.slot)),
            )} kcal`
            return {
              to: '/nutrition/entries',
              label: section.name,
              wert: kcal,
              // aria-label hält den Namen "<Abschnitt> — <kcal>" als eine Einheit, obwohl die kcal optisch rechts stehen.
              ariaLabel: `${section.name} — ${kcal}`,
            }
          })}
        />
      )}
      <LinkListCard
        items={[
          { to: '/profile', label: 'Ziel im Profil anpassen', icon: 'goal' },
          { to: '/nutrition/entries', label: 'Einträge ansehen', icon: 'entries' },
          { to: '/nutrition/analyse', label: 'Analyse', icon: 'analysis' },
        ]}
      />
      <DashboardNutritionCharts userId={userId} auswahl={auswahl.auswahl} ziel={goal} profile={profile} />
    </div>
  )
}
```

- [ ] **Step 5:** `npx vitest run src/components/QuickAddDialog.test.tsx src/pages/NutritionPage.test.tsx src/components/LinkListCard.test.tsx` → PASS; `npm run lint`, `npx tsc -b --noEmit` sauber.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: nutrition dashboard with hero ring, macro tiles and quick-add dialog" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: BodyPage

**Files:**
- Modify: `src/pages/BodyPage.tsx`, `src/pages/BodyPage.test.tsx`

**Interfaces:**
- Consumes: `PageHero`, `LinkListCard`, `PageSkeleton`, `ChartSkeleton`; `statClass`, `listClass`, `cardClass`, `labelClass` aus `ui-classes`.

- [ ] **Step 1: Tests anpassen**

In `src/pages/BodyPage.test.tsx`:

(a) Test „wraps each measurement in the card-in-list markup“ ersetzen durch:

```tsx
  it('lists the remaining measurements in one divided card instead of seven cards', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    zeigeDashboard()

    const liste = screen.getByTestId('wert-bauchumfang').closest('ul')
    expect(liste).toHaveClass('divide-y')
    expect(liste?.closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
    expect(screen.getByTestId('wert-bauchumfang')).toHaveTextContent('90 cm')
  })
```

(b) Test „keeps the primary action stuck above the bottom nav …“ ersetzen durch:

```tsx
  it('puts the primary action in the weight hero', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    zeigeDashboard()

    const hero = screen.getByRole('region', { name: 'Gewicht (kg)' })
    expect(hero).toContainElement(screen.getByRole('button', { name: 'Heute eintragen' }))
  })
```

(c) Die bestehenden Tests „shows the newest value with its date“, „shows the change against the previous entry…“, „shows a dash …“, „renders the figure large …“ bleiben unverändert gültig (Hero-Titel `82,5 kg`, Untertitel mit Datum und Änderung, Test-IDs, Klassen `tabular-nums`/`font-bold` kommen über `statClass`, Label `text-text-muted font-medium` über `labelClass`).

(d) Neue Tests im ersten `describe`:

```tsx
  it('shows a skeleton while the values load', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult({ loading: true, rows: [] }))

    zeigeDashboard()

    expect(screen.getByRole('status')).toHaveTextContent('Lädt…')
  })

  it('renders cleanly for a brand-new account without any measurement', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult({ rows: [] }))

    const { container } = zeigeDashboard()

    expect(container.textContent).not.toMatch(/undefined|NaN/)
    expect(screen.getByTestId('wert-gewicht')).toHaveTextContent('—')
    expect(screen.getByText('Noch kein Gewicht eingetragen.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Heute eintragen' })).toBeInTheDocument()
  })

  it('groups verlauf, fotos and analyse in one list card', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    zeigeDashboard()

    expect(screen.getByRole('link', { name: 'Verlauf' })).toHaveAttribute('href', '/body/entries')
    expect(screen.getByRole('link', { name: 'Fortschrittsfotos' })).toHaveAttribute('href', '/body/photos')
    expect(screen.getByRole('link', { name: 'Analyse' }).closest('ul')).toHaveClass('divide-y')
  })
```

- [ ] **Step 2:** `npx vitest run src/pages/BodyPage.test.tsx` → FAIL.

- [ ] **Step 3: `src/pages/BodyPage.tsx` – Komponententeil ersetzen** (Hilfsfunktionen `formatValue`/`formatDate`/`unitOf` und die Chart-Funktionen darunter bleiben; in `DashboardBodyChartsData` wird `<p>Lädt…</p>` zu `<ChartSkeleton />`). Imports: `PageHero`, `LinkListCard`, `PageSkeleton`, `ChartSkeleton` ergänzen; aus `ui-classes` bleiben `cardClass, labelClass, listClass, statClass` (`linkClass`, `stickyActionClass` und `PressableLink` entfallen).

```tsx
export default function BodyPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Körper" />

  return <Dashboard userId={userId} />
}

function Dashboard({ userId }: { userId: string }) {
  const { rows, loading, error, saveEntry } = useBodyMetrics(userId)
  const [formOpen, setFormOpen] = useState(false)
  const showToast = useToast()
  const auswahl = useChartSelection(userId)

  if (loading) return <PageSkeleton titel="Körper" />

  const gewicht = latestValue(rows, 'gewicht')
  const gewichtAenderung = changeSince(rows, 'gewicht')
  const weitereFelder = MEASUREMENT_FIELDS.filter((field) => field !== 'gewicht')

  return (
    <div>
      <h1>Körper</h1>
      {error && <p role="alert">Werte konnten nicht geladen werden.</p>}

      <PageHero
        label={FIELD_LABELS.gewicht}
        titel={gewicht == null ? '—' : `${formatValue(gewicht.value)} ${unitOf('gewicht')}`}
        titelClass={statClass}
        titelTestId="wert-gewicht"
        untertitel={
          gewicht == null ? (
            'Noch kein Gewicht eingetragen.'
          ) : (
            <>
              <span className="block">{`Stand ${formatDate(gewicht.datum)}`}</span>
              {gewichtAenderung != null && (
                <span className="block">
                  {/* U+2212 minus, not a hyphen: it lines up with digits. */}
                  {`${gewichtAenderung.delta < 0 ? '−' : '+'}${formatValue(Math.abs(gewichtAenderung.delta))} ${unitOf('gewicht')} seit ${formatDate(gewichtAenderung.datum)}`}
                </span>
              )}
            </>
          )
        }
        action={
          <Pressable variant="primary" type="button" onClick={() => setFormOpen(true)}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="measurement" tone="mono" size={20} />
              Heute eintragen
            </span>
          </Pressable>
        }
      />
      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the form only while open forces a fresh prefill from the
          current rows each time it opens, instead of showing the last
          attempt's leftover draft. */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)}>
        {formOpen && (
          <BodyEntryForm
            // The upsert writes all seven columns, so an empty form would blank
            // everything already recorded today. Correcting the day means
            // starting from what is stored, not from blanks.
            entry={rows.find((row) => row.datum === today())}
            onSave={async (datum, values) => {
              try {
                await saveEntry(datum, values)
              } catch (err) {
                // The entry was already written and the list already reloaded;
                // only the profiles mirror failed. Resolve normally so the
                // dialog closes without its own "not saved" alert — the dialog
                // is already gone by the time this notice appears, so it is
                // short-lived feedback on a completed action, not a blocking
                // form error, hence a toast rather than inline.
                if (err instanceof ProfileWeightSyncError) {
                  showToast(
                    'Eintrag gespeichert. Das aktuelle Gewicht im Profil konnte nicht aktualisiert werden.',
                    'error',
                  )
                  return
                }
                throw err
              }
            }}
            onClose={() => setFormOpen(false)}
          />
        )}
      </Dialog>

      <div className={cardClass}>
        <ul role="list" className={listClass}>
          {weitereFelder.map((field) => {
            const latest = latestValue(rows, field)
            const change = changeSince(rows, field)
            return (
              <li key={field} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p>{FIELD_LABELS[field]}</p>
                  {change != null && (
                    <p className="text-sm text-text-muted">
                      {`${change.delta < 0 ? '−' : '+'}${formatValue(Math.abs(change.delta))} ${unitOf(field)} seit ${formatDate(change.datum)}`}
                    </p>
                  )}
                </div>
                <span className="text-lg font-semibold tabular-nums" data-testid={`wert-${field}`}>
                  {latest == null ? '—' : `${formatValue(latest.value)} ${unitOf(field)}`}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <LinkListCard
        items={[
          { to: '/body/entries', label: 'Verlauf', icon: 'history' },
          { to: '/body/photos', label: 'Fortschrittsfotos', icon: 'photos' },
          { to: '/body/analyse', label: 'Analyse', icon: 'analysis' },
        ]}
      />
      <DashboardBodyCharts userId={userId} auswahl={auswahl.auswahl} />
    </div>
  )
}
```

Hinweis zum Test „renders the figure large …“: dort steht `screen.getByText('Gewicht (kg)')` – der Hero-Label-Text ist das einzige sichtbare Element mit diesem Text (die Region trägt ihn nur als `aria-label`). Bei geöffnetem Dialog existiert zusätzlich ein Label „Gewicht (kg)“ – dieser Test öffnet ihn nicht.

- [ ] **Step 4:** `npx vitest run src/pages/BodyPage.test.tsx` → PASS; `npm run lint`, `npx tsc -b --noEmit` sauber.

- [ ] **Step 5: Commit**

```bash
git add src/pages/BodyPage.tsx src/pages/BodyPage.test.tsx
git commit -m "feat: body dashboard with weight hero and compact measurement list" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: HomePage und Löschen von DailySummary

**Files:**
- Modify: `src/pages/HomePage.tsx`, `src/pages/HomePage.test.tsx`
- Delete: `src/components/DailySummary.tsx`, `src/components/DailySummary.test.tsx`

**Interfaces:**
- Consumes: `StatStrip` (`StatTile`), `PageHero`, `ProgressRing`, `LinkListCard`, `EmptyState`, `PageSkeleton`, `ChartSkeleton`, `kalorienStatus`, `sumKalorien`, `streakText`.

- [ ] **Step 1: Tests anpassen** (`src/pages/HomePage.test.tsx`)

Im Test „shows todays calories via DailySummary“ (umbenennen in „shows todays calories in the calorie card“):

```tsx
  it('shows todays calories in the calorie card', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('region', { name: 'Kalorien' })).toBeInTheDocument()
    expect(screen.getByText('2000 kcal übrig')).toBeInTheDocument()
  })
```

Test „shows the active training day when there is one“: Assertion ersetzen durch

```tsx
    expect(screen.getByText('Push')).toBeInTheDocument()
    expect(screen.getByText('Push/Pull/Legs')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zum Training' })).toHaveAttribute('href', '/training')
```

Test „shows "Kein aktiver Plan" without an active plan“ (`getByText('Kein aktiver Plan.')`) und „shows a message for an active plan that has no days yet“ (`getByText('Plan „Push/Pull/Legs“ hat noch keine Tage.')`) bleiben gültig (Überschrift des `EmptyState`).

Neue Tests am Ende des ersten `describe`:

```tsx
  it('shows a skeleton while anything loads', () => {
    stubDefaults()
    mockUseTrainingStreak.mockReturnValue({ streak: 0, loading: true })
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('status')).toHaveTextContent('Lädt…')
  })

  it('groups the area links in one list card', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('link', { name: 'Körper' })).toHaveAttribute('href', '/body')
    expect(screen.getByRole('link', { name: 'Ernährung' })).toHaveAttribute('href', '/nutrition')
    expect(screen.getByRole('link', { name: 'Analyse' })).toHaveAttribute('href', '/home/analyse')
    expect(screen.getByRole('link', { name: 'Analyse' }).closest('ul')).toHaveClass('divide-y')
  })

  it('renders cleanly for a brand-new account', () => {
    stubDefaults()
    const { container } = renderWithProviders(<HomePage />)
    expect(container.textContent).not.toMatch(/undefined|NaN/)
    expect(screen.getByRole('link', { name: 'Trainingsplan anlegen' })).toHaveAttribute('href', '/training/plans')
  })
```

Die Tests zu Gewicht (`/−0,8 kg seit dem letzten Eintrag/`, `Keine Messwerte.`, `/82,5 kg/`) und Streak (`4 Tage in Folge`, `Noch kein Trainingstag.`) bleiben gültig (Kachel-Wert/Hinweis, siehe Abweichung 4). Der Test „shows the current weight without a delta …“ prüft `getByText(/82,5 kg/)` – die Kachel zeigt genau einmal `82,5 kg`.

- [ ] **Step 2:** `npx vitest run src/pages/HomePage.test.tsx` → FAIL.

- [ ] **Step 3: `src/pages/HomePage.tsx` – Komponententeil ersetzen** (`DashboardHomeCharts*` darunter bleiben, nur `<p>Lädt…</p>` → `<ChartSkeleton />`; `formatValue` bleibt)

```tsx
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries } from '../hooks/use-food-entries'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'
import { sumKalorien } from '../lib/entry-calories'
import { kalorienStatus } from '../lib/calorie-status'
import { useActiveTrainingDay } from '../hooks/use-active-training-day'
import { useBodyMetrics } from '../hooks/use-body-metrics'
import { changeSince, latestValue } from '../lib/body-change'
import { useChartSelection } from '../components/charts/ChartPicker'
import HomeChartList from '../components/charts/HomeChartList'
import { chartsFor } from '../lib/analysis/registry'
import { useHomeAnalysis } from '../hooks/use-home-analysis'
import { DASHBOARD_ZEITRAUM } from '../lib/analysis/zeitraum'
import { useTrainingStreak } from '../hooks/use-training-streak'
import { streakText } from '../lib/streak'
import { PressableLink } from '../components/Pressable'
import PageHero from '../components/PageHero'
import ProgressRing from '../components/ProgressRing'
import StatStrip, { type StatTile } from '../components/StatStrip'
import LinkListCard from '../components/LinkListCard'
import EmptyState from '../components/EmptyState'
import PageSkeleton, { ChartSkeleton } from '../components/PageSkeleton'

/** German notation: comma as the decimal mark, at most one place. */
function formatValue(value: number) {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 })
}

export default function HomePage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Home" />

  return <Dashboard userId={userId} />
}

function Dashboard({ userId }: { userId: string }) {
  const { profile, loading: profileLoading } = useProfile(userId)
  const { entries, loading: entriesLoading } = useFoodEntries(userId)
  const { plan, day, loading: trainingLoading } = useActiveTrainingDay(userId)
  const { rows, loading: rowsLoading, error: rowsError } = useBodyMetrics(userId)
  const { streak, loading: streakLoading } = useTrainingStreak(userId)
  const auswahl = useChartSelection(userId)

  if (profileLoading || entriesLoading || trainingLoading || rowsLoading || streakLoading) {
    return <PageSkeleton titel="Home" />
  }

  // goal bleibt null, wenn das Profil nicht geladen werden konnte — die Kalorien-Karte
  // zeigt das Gegessene dann trotzdem, nur ohne Restwert gegen ein Ziel. Ein
  // Bereich, der nicht laedt, soll die anderen nicht mit sperren.
  const goal = profile ? effectiveCalorieGoal(profile) : null
  const status = kalorienStatus(sumKalorien(entries), goal)
  const gewichtAktuell = latestValue(rows, 'gewicht')
  const gewichtsAenderung = changeSince(rows, 'gewicht')

  const kacheln: StatTile[] = [
    { label: 'Streak', wert: streak === 0 ? '—' : String(streak), hinweis: streakText(streak) },
    {
      label: 'Gewicht',
      wert: gewichtAktuell == null ? '—' : `${formatValue(gewichtAktuell.value)} kg`,
      // latestValue may find a weight without a prior entry to compare against —
      // changeSince is then null, and the tile must still show the current
      // value (a first-time weigh-in) instead of collapsing to "Keine Messwerte.".
      hinweis:
        gewichtAktuell == null
          ? 'Keine Messwerte.'
          : gewichtsAenderung == null
            ? undefined
            : `${gewichtsAenderung.delta < 0 ? '−' : '+'}${formatValue(Math.abs(gewichtsAenderung.delta))} kg seit dem letzten Eintrag`,
    },
  ]

  return (
    <div>
      <h1>Home</h1>
      {rowsError && <p role="alert">Gewichtsdaten konnten nicht geladen werden.</p>}
      <StatStrip tiles={kacheln} />
      {plan == null && (
        <EmptyState
          titel="Kein aktiver Plan."
          text="Lege einen Plan an, dann siehst du hier, was heute ansteht."
          action={
            <PressableLink variant="primary" to="/training/plans">
              Trainingsplan anlegen
            </PressableLink>
          }
        />
      )}
      {plan != null && day == null && (
        <EmptyState
          titel={`Plan „${plan.name}“ hat noch keine Tage.`}
          action={
            <PressableLink variant="primary" to={`/training/plans/${plan.id}`}>
              Plan bearbeiten
            </PressableLink>
          }
        />
      )}
      {plan != null && day != null && (
        <PageHero
          label="Heute · Training"
          titel={day.name}
          untertitel={plan.name}
          action={
            <PressableLink variant="primary" to="/training">
              Zum Training
            </PressableLink>
          }
        />
      )}
      <PageHero
        label="Kalorien"
        titel={status.titel}
        untertitel={status.untertitel ?? undefined}
        aside={<ProgressRing anteil={status.anteil} label={status.ringLabel} />}
      />
      <LinkListCard
        items={[
          { to: '/nutrition', label: 'Ernährung', icon: 'nutrition' },
          { to: '/training', label: 'Training', icon: 'training' },
          { to: '/body', label: 'Körper', icon: 'body' },
          { to: '/home/analyse', label: 'Analyse', icon: 'analysis' },
        ]}
      />
      <DashboardHomeCharts userId={userId} auswahl={auswahl.auswahl} />
    </div>
  )
}
```

Hinweis: Das Link „Training starten“ aus dem Home-Hero entfällt bewusst (Abweichung/Spec: nur ein Startpfad).

- [ ] **Step 4: DailySummary entfernen**

```bash
git rm src/components/DailySummary.tsx src/components/DailySummary.test.tsx
```
Dann `grep -rn "DailySummary" src` – übrig bleiben dürfen nur Kommentare in `MacroDistributionChart.tsx` und `nutrition-charts.ts`; diese zwei Kommentare auf „der Tages-Hero der Ernährungsseite“ umformulieren (Wortlaut: „gegen die Kalorien-/Makro-Anzeige auf /nutrition prüfbar“). `npx tsc -b --noEmit` und `npm run lint` müssen sauber sein.

- [ ] **Step 5:** `npx vitest run src/pages/HomePage.test.tsx` → PASS.

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: home dashboard with status tiles, training hero and calorie ring; drop DailySummary" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Kompakte Listen

**Files:**
- Modify: `src/pages/TrainingHistoryPage.tsx` (+ Test), `src/pages/TrainingPlansPage.tsx` (+ Test), `src/pages/BodyEntriesPage.tsx` (+ Test), `src/components/FoodEntryList.tsx` (+ Test), `src/pages/NutritionEntriesPage.tsx`

**Interfaces:**
- Consumes: `EmptyState`, `PageSkeleton` (`variante="liste"`), `cardClass`, `listClass`, `listRowClass`, `linkClass`.

- [ ] **Step 1: Tests anpassen/ergänzen**

`TrainingHistoryPage.test.tsx` – neuer Test:

```tsx
  it('puts all sessions into one divided card instead of one card per row', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutHistory.mockReturnValue({ sessions: [finished, { ...finished, id: 's2' }], loading: false })

    const { default: TrainingHistoryPage } = await import('./TrainingHistoryPage')
    renderWithProviders(<TrainingHistoryPage />)

    const liste = screen.getAllByRole('link', { name: /Ganzkörper.*Tag A/ })[0].closest('ul')
    expect(liste).toHaveClass('divide-y')
    expect(liste?.closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
    liste?.querySelectorAll('li').forEach((li) => expect(li).not.toHaveClass('bg-surface'))
  })
```
Der Test „says so when there is no history yet“ bleibt (Überschrift des `EmptyState`, `getByText` findet sie).

`TrainingPlansPage.test.tsx` – zwei neue Tests (die Datei definiert `mockUseWorkoutPlans` und `plansResult` bereits):

```tsx
  it('lists all plans in one divided card', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlans.mockReturnValue(
      plansResult({
        plans: [
          { id: 'p1', name: 'Ganzkörper', aktiv: true },
          { id: 'p2', name: 'Oberkörper', aktiv: false },
        ],
      }),
    )

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    renderWithProviders(<TrainingPlansPage />)

    const liste = screen.getByRole('link', { name: /Ganzkörper/ }).closest('ul')
    expect(liste).toHaveClass('divide-y')
    expect(liste?.closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
    expect(screen.getByRole('link', { name: /Oberkörper/ }).closest('li')).not.toHaveClass('bg-surface')
  })

  it('offers an empty state when there is no plan yet', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlans.mockReturnValue(plansResult({ plans: [] }))

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    renderWithProviders(<TrainingPlansPage />)

    expect(screen.getByRole('heading', { name: 'Noch kein Plan.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Neuer Plan/ })).toHaveAttribute('href', '/training/plans/new')
  })
```

`BodyEntriesPage.test.tsx` – Test „wraps each entry in the card-in-list markup“ ersetzen:

```tsx
  it('shows all entries in one divided card instead of one card per entry', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()

    const liste = screen.getByText('24.08.2026').closest('ul')
    expect(liste).toHaveClass('divide-y')
    expect(liste?.closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
    expect(screen.getByText('24.08.2026').closest('li')).not.toHaveClass('bg-surface')
  })
```
Der Leerzustand-Test (`getByText('Noch keine Einträge.')`) bleibt gültig.

`FoodEntryList.test.tsx` – Test „wraps each entry in the card-in-list markup“ ersetzen:

```tsx
  it('shows the entries as divided rows of one card, not one card per entry', () => {
    renderWithProviders(
      <FoodEntryList
        entries={entries}
        userId="u1"
        sections={[{ slot: 1, name: 'Frühstück' }]}
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    const liste = screen.getByText('Testprodukt').closest('ul')
    expect(liste).toHaveClass('divide-y')
    expect(liste?.closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
    expect(screen.getByText('Testprodukt').closest('li')).not.toHaveClass('bg-surface')
  })
```

- [ ] **Step 2:** `npx vitest run src/pages/TrainingHistoryPage.test.tsx src/pages/TrainingPlansPage.test.tsx src/pages/BodyEntriesPage.test.tsx src/components/FoodEntryList.test.tsx` → FAIL.

- [ ] **Step 3: Implementieren**

`TrainingHistoryPage.tsx` (Skeleton für beide Ladefälle, Karte mit Zeilen, Leerzustand):

```tsx
import { useSession } from '../hooks/use-session'
import { useWorkoutHistory } from '../hooks/use-workout-history'
import { cardClass, linkClass, listClass, listRowClass } from '../lib/ui-classes'
import { VitaIcon } from '../components/icons/VitaIcon'
import { PressableLink } from '../components/Pressable'
import EmptyState from '../components/EmptyState'
import PageSkeleton from '../components/PageSkeleton'

export default function TrainingHistoryPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Trainingshistorie" variante="liste" />

  return <HistoryList userId={userId} />
}

function HistoryList({ userId }: { userId: string }) {
  const { sessions, loading } = useWorkoutHistory(userId)

  if (loading) return <PageSkeleton titel="Trainingshistorie" variante="liste" />

  return (
    <div>
      <h1>Trainingshistorie</h1>
      {sessions.length === 0 ? (
        <EmptyState
          titel="Noch keine Trainings aufgezeichnet."
          text="Nach deinem ersten Training erscheint es hier."
          action={
            <PressableLink variant="primary" to="/training">
              Zum Training
            </PressableLink>
          }
        />
      ) : (
        <div className={cardClass}>
          <ul role="list" className={listClass}>
            {sessions.map((entry) => (
              <li key={entry.id} className={listRowClass}>
                <PressableLink to={`/training/history/${entry.id}`} className={`${linkClass} flex-1`}>
                  <span className="flex min-w-0 flex-col">
                    <span>{`${entry.plan_name ?? '—'} – ${entry.tag_name ?? '—'}`}</span>
                    <span className="text-sm text-text-muted">
                      {`${new Date(entry.gestartet_am).toLocaleDateString('de-DE')} · ${
                        // An unfinished session has no calorie result; "0 kcal" would read as a measurement.
                        entry.gesamt_kalorien == null ? 'nicht beendet' : `${Math.round(entry.gesamt_kalorien)} kcal`
                      }`}
                    </span>
                  </span>
                </PressableLink>
              </li>
            ))}
          </ul>
        </div>
      )}
      <PressableLink to="/training" className={linkClass}>
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zum Training
      </PressableLink>
    </div>
  )
}
```

`TrainingPlansPage.tsx`: beide Lade-Zweige → `<PageSkeleton titel="Meine Pläne" variante="liste" />`; die Plan-Liste ersetzen durch

```tsx
      {plans.length === 0 ? (
        <EmptyState titel="Noch kein Plan." text="Lege deinen ersten Trainingsplan an." />
      ) : (
        <div className={cardClass}>
          <ul role="list" className={listClass}>
            {plans.map((plan) => (
              <li key={plan.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <PressableLink to={`/training/plans/${plan.id}`} className={linkClass}>
                    {plan.name}
                  </PressableLink>
                  {plan.aktiv && (
                    <span className="rounded-full bg-surface-raised px-3 py-1 text-sm font-medium text-text">aktiv</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!plan.aktiv && (
                    <Pressable
                      variant="secondary"
                      type="button"
                      onClick={() => run(() => activatePlan(plan.id), 'Aktivieren fehlgeschlagen.')}
                    >
                      Aktivieren
                    </Pressable>
                  )}
                  <Pressable
                    variant="danger"
                    type="button"
                    onClick={() => run(() => deletePlan(plan.id), 'Löschen fehlgeschlagen.')}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      <VitaIcon name="delete" tone="mono" size={20} />
                      Löschen
                    </span>
                  </Pressable>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
```
(`listClass` zu den `ui-classes`-Imports, `EmptyState`/`PageSkeleton` importieren. Die beiden Buttons mit `run(...)` bleiben Zeichen für Zeichen wie bisher.)

`BodyEntriesPage.tsx`: beide Lade-Zweige → `<PageSkeleton titel="Verlauf" variante="liste" />`; `{rows.length === 0 && <p>Noch keine Einträge.</p>}` ersetzen durch

```tsx
      {rows.length === 0 && (
        <EmptyState
          titel="Noch keine Einträge."
          text="Trag deine ersten Werte ein, dann siehst du hier den Verlauf."
          action={
            <PressableLink variant="primary" to="/body">
              Zum Körperbereich
            </PressableLink>
          }
        />
      )}
```
und die Liste durch

```tsx
      {rows.length > 0 && (
        <div className={cardClass}>
          <ul role="list" className={listClass}>
            {rows.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-2 py-3">
                <span className="font-semibold">{formatDate(entry.datum)}</span>
                <span className="text-sm text-text-muted">{summarize(entry)}</span>
                <div className="flex flex-wrap gap-2">
                  <Pressable variant="secondary" type="button" onClick={() => setEditingId(entry.id)}>
                    <span className="inline-flex items-center justify-center gap-2">
                      <VitaIcon name="edit" tone="mono" size={20} />
                      Bearbeiten
                    </span>
                  </Pressable>
                  <Pressable variant="danger" type="button" onClick={() => remove(entry.id)}>
                    <span className="inline-flex items-center justify-center gap-2">
                      <VitaIcon name="delete" tone="mono" size={20} />
                      Löschen
                    </span>
                  </Pressable>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
```
(`listClass`, `EmptyState`, `PageSkeleton` importieren.)

`FoodEntryList.tsx`: Liste → eine Karte:

```tsx
  return (
    <div className={cardClass}>
      <ul role="list" className={listClass}>
        {entries.map((entry) => (
          <FoodEntryRow key={entry.id} entry={entry} userId={userId} sections={sections} onUpdateEntry={onUpdateEntry} onDelete={onDelete} />
        ))}
      </ul>
    </div>
  )
```
und in `FoodEntryRow` das innere `<div className={`${cardClass} flex flex-col`}>` durch `<div className="flex flex-col gap-2 py-3">` ersetzen, `<li>` → `<li>` (Klassen bleiben leer); `listClass` importieren. Der Leerzustand (`<p>Noch keine Einträge heute.</p>`) bleibt.

`NutritionEntriesPage.tsx`: die zwei Lade-Zweige (`!userId` und `loading || profileLoading`) → `<PageSkeleton titel="Einträge heute" variante="liste" />`; Import ergänzen.

- [ ] **Step 4:** Tests aus Step 2 plus `npx vitest run src/pages/NutritionEntriesPage.test.tsx` → PASS; `npm run lint`, `npx tsc -b --noEmit` sauber.

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat: compact divided-row lists and skeleton loading on list pages" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Chart-Listen und restliche Block-1-Punkte

**Files:**
- Modify: `src/components/charts/BodyChartList.tsx`, `HomeChartList.tsx`, `NutritionChartList.tsx`, `TrainingChartList.tsx`
- Modify: `src/components/ExercisePicker.tsx`, `src/pages/WorkoutSessionPage.tsx`

- [ ] **Step 1: Test ergänzen** – in `src/components/charts/HomeChartList.test.tsx` im `describe` (der Abstand ist in allen vier Listen derselbe; die Skeleton-Form deckt `PageSkeleton.test.tsx` ab, ein Fallback-Test hinter `React.lazy` wäre vom Modul-Cache abhängig):

```tsx
  it('stacks the charts with a 24px rhythm', async () => {
    const { container } = render(<HomeChartList ids={[H1]} sessions={[]} entries={[]} rows={[]} zeitraum={90} />)
    expect(container.firstElementChild).toHaveClass('space-y-6')
    expect(await screen.findByText('Aktivitätsraster', undefined, { timeout: 5000 })).toBeInTheDocument()
  })
```

- [ ] **Step 2:** Test laufen lassen → FAIL (`space-y-4`).

- [ ] **Step 3: Implementieren**

In allen vier `*ChartList.tsx`: `className="space-y-4"` → `className="space-y-6"`; `fallback={<p>Lädt…</p>}` → `fallback={<ChartSkeleton />}` mit `import { ChartSkeleton } from '../PageSkeleton'`.

`ExercisePicker.tsx` Zeile mit `className="space-y-1"` (Gruppen-Container) → `className="flex flex-col gap-1"`. `WorkoutSessionPage.tsx` in `LoggedSets` `<div className="space-y-2">` → `<div className="flex flex-col gap-2">`.

- [ ] **Step 4:** `npx vitest run src/components/charts src/components/ExercisePicker.test.tsx src/pages/WorkoutSessionPage.test.tsx` → PASS (Last-Flake `HomeChartList` einzeln erneut laufen lassen, falls rot).

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat: chart skeletons, 24px chart rhythm and gap-based picker spacing" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Gesamtverifikation, Doku und Übergabe

**Files:**
- Modify: `docs/superpowers/specs/2026-10-18-hochwertige-dashboards-block2-design.md`, `CLAUDE.md` (Status-Abschnitt)

- [ ] **Step 1: Spec an die Abweichungen angleichen** – in der Spec: Zeile „Hauptaktion … `stickyActionClass`“ im Körper-Abschnitt auf „ohne Sticky (Hero steht oben)“ ändern; im Ernährungs-Abschnitt die Vorbelegung auf „nach Position (vor 10, bis 15, bis 21 Uhr, danach; begrenzt auf die Anzahl)“; unter „Bausteine“ `DailySummary` als gelöscht vermerken.

- [ ] **Step 2: Volle Verifikation**

Run: `npx vitest run` (Last-Flake `HomeAnalysisPage`/`HomeChartList` einzeln erneut), `npm run lint`, `npx tsc -b --noEmit`, `npm run build`, dann `grep -c gsap dist/assets/index-*.js`.
Expected: alles grün, Grep-Ergebnis `0`. Bundle-Zahlen im Worktree ohne `.env` sind ohne Aussagekraft (siehe CLAUDE.md); die Messung im Haupt-Checkout folgt nach dem Merge.

- [ ] **Step 3: Sicht-Prüfung bei 390 px** – `.env` aus dem Haupt-Checkout in den Worktree kopieren, `npx vite --port 5181`; der Nutzer loggt sich auf `localhost:5181` einmal selbst ein und schaltet die DevTools-Handyansicht (390 px) ein; Klicks per `javascript_tool` mit `element.click()`. Prüfen und im Ergebnis festhalten: (a) Hero und Hauptaktion auf allen vier Tabs liegen nicht unter der Nav; (b) „Kohlenhydrate“-Kachel läuft nicht über (sonst Label auf `Kohlenh.` kürzen und `title` setzen); (c) Skeleton hat die Form der fertigen Seite (Seite im Netzwerk drosseln); (d) Ring füllt sich einmal, bei `prefers-reduced-motion` nicht; (e) Wochenstreifen: heute türkis umrandet; (f) Ernährungs-Dialog: Abschnitt vorbelegt, Speichern landet im richtigen Abschnitt (Wegwerf-Eintrag danach löschen); (g) Listenseiten: eine Karte mit Trennlinien. Die `.env` wieder entfernen.

- [ ] **Step 4: Review** – `superpowers:requesting-code-review` (Whole-Branch, Basis `a793279`) + Scoped Re-Review nach Fix-Welle; `codex review -c model="gpt-5.6-sol" --base master` als Zweitmeinung; Ergebnis im Status-Abschnitt festhalten.

- [ ] **Step 5: CLAUDE.md-Status nachziehen** (Abschnitt „Neuer Chat: genau hier weitermachen“): Block 2 umgesetzt, PR-Nummer offen, nächster Schritt Block 3; Designsystem-Regeln um die neuen Bausteine (`PageHero`, `StatStrip`, `WeekStrip`, `ProgressRing`, `LinkListCard`, `Skeleton`/`PageSkeleton`/`ChartSkeleton`, `EmptyState`, `QuickAddDialog`) ergänzen.

- [ ] **Step 6: Commit und PR**

```bash
git add -A docs CLAUDE.md
git commit -m "docs: align block 2 spec with implementation, update status" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push -u origin block2-dashboards
gh pr create --title "Block 2: hochwertige Dashboards" --body "Hero je Tab, Link-Listenkarten, Skeletons, Leerzustände, kompakte Listen. Spec/Plan unter docs/superpowers/." 
```
(Die PR-Beschreibung endet mit `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.) **Merge macht der Nutzer; danach erst Bescheid geben, dann pullt Claude im Haupt-Checkout, nennt den Commit und gibt den Deploy frei** (Deploy-Regel aus CLAUDE.md, inklusive PR-Marker-Prüfung in `dist/assets/*`: Marker `Trainingstage diese Woche` und `kcal übrig`).

- [ ] **Step 7: Nach dem Merge** – Worktree entfernen (`git worktree remove`), Branch löschen, `graphify update` (aus dem Haupt-Checkout), Wiki-Seite `Audit-Block-2-Dashboards` + `Home.md` + `_Sidebar.md`, CLAUDE.md-Status mit PR-Nummer/Commit/Hash.

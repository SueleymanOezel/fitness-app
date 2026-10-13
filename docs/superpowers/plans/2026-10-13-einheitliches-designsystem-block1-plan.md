# Audit-Block 1 – Einheitliches Designsystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die `@layer base`-Übergangsgeneration aus `src/index.css` entfernen und jede Seite auf die Phase-6-Rezepte aus `src/lib/ui-classes.ts` umstellen, sodass die App überall gleich aussieht (Typo-Skala, Abstands-Rhythmus, Flächen-Regel).

**Architecture:** Der Basis-Layer schrumpft auf Typo-Skala, Layout-Gerüst, Tap-Höhen und einen Rhythmus-Default für Seiten-Wurzeln — Tailwinds Preflight erledigt den Rest des Resets. Jedes Aussehen kommt aus Klassen-Rezepten in `ui-classes.ts`. Eine erweiterte ESLint-Regel (`no-restricted-syntax`, wie die bestehende `<button>`-Regel) verhindert unformatierte Felder/Labels/Pressables; eine Ausnahmeliste noch nicht migrierter Dateien schrumpft Task für Task auf null.

**Tech Stack:** React 19 + TypeScript, Tailwind 4 (`@theme`-Tokens, Preflight), ESLint 9 Flat Config, Vitest + Testing Library, Playwright-CLI für Screenshots.

**Spec:** `docs/superpowers/specs/2026-10-13-einheitliches-designsystem-block1-design.md`

## Abweichungen von der Spec (bewusst, dem Nutzer im Plan-Review vorgelegt)

1. **Rhythmus auf `main > *` statt auf `main`.** Jede Seite rendert genau ein Wurzel-Element unter `<main>` (`src/components/AppLayout.tsx:17`); ein `gap` auf `main` hätte keine Wirkung. Der Reset setzt deshalb `main > * { display: flex; flex-direction: column; gap: 1.5rem }`. Folge: Lose Einzelelemente einer Seite (z. B. Planname + Tagname + Start-Button auf `/training`) stünden 24 px auseinander — die Migration fasst Zusammengehöriges in Gruppen (`flex flex-col gap-2`) oder Karten zusammen. Das ist ohnehin der Audit-Fund „Abstands-Rhythmus kaputt“.
2. **Konsistenz-Schutz per ESLint statt per Regex-Vitest.** Das Projekt verbietet rohe `<button>` bereits per `no-restricted-syntax` (`eslint.config.js`). Die neuen Verbote kommen in dieselbe Regel; sie arbeiten auf dem AST statt auf Text, laufen in CI über `npm run lint` mit, und brauchen keinen `shortcut:`-Kommentar. Den „Karte in Karte“-Check kann ESLint nicht sinnvoll prüfen (die Verschachtelung entsteht oft über Komponentengrenzen) — er läuft über die Task-Checklisten und den Screenshot-Abgleich.
3. **Reset fast nur durch Löschen.** Tailwind 4 Preflight setzt bereits `margin/padding/border: 0`, `font: inherit`, `color: inherit`, transparenten Button-Hintergrund, `list-style: none`, `img { max-width: 100% }` und `h1–h6 { font-size/weight: inherit }`. Der neue Basis-Layer enthält nur, was Preflight nicht liefert.
4. **Bundle-Marker** ist `divide-text-muted/15` (aus `listClass`) statt des ganzen `listRowClass`-Strings — der ist zu generisch, um eindeutig zu sein.

## Global Constraints

- Ziel ist der bestehende Phase-6-Look: Karten `rounded-3xl`, Buttons/Felder `rounded-2xl`, bestehende Farb-Tokens. Kein neues Token, keine neue CSS-Variable.
- Typo-Skala: `h1` 28 px mobil / 36 px ab 1025 px, Zeilenhöhe 1.15, 600, −0.02em; `h2` 20/22 px, 1.25, 600, −0.01em; `h3` 17 px, 1.3, 600. Breakpoint bleibt `max-width: 1024px`.
- Rhythmus: 24 px zwischen Sektionen (`gap-6`/`1.5rem`), 12 px in Karten (`space-y-3` in `cardClass`), 8 px in Gruppen (`gap-2`).
- Flächen-Regel: Seite `bg`, Karte `surface`, Bedienelement `surface-raised`. Keine Karte in einer Karte.
- Tap-Ziele mindestens 44 px (`min-h-11`). WCAG 2.2 AA (Text ≥ 4,5:1).
- Sprache der UI Deutsch, Du-Form. Keine Namen von Drittanbieter-Apps in Code, Kommentaren, Commits.
- Zentriert bleiben nur: Login-Logo-Bereich (`LoginPage`) und Kopf des Abschluss-Screens (`WorkoutSessionPage` „Training abgeschlossen“). Alle anderen Überschriften links.
- Nicht im Umfang (nur notieren, nicht beheben): Hero-Bereiche, Skeletons, Leerzustände, Home-Dashboard-Inhalt (Block 2); Logik, Texte, Übersetzungen (Block 3); Virtualisierung, Bildgrößen, Caching (Block 4). Funde unterwegs im Abschlussbericht des Tasks auflisten.
- Working Copy nutzt CRLF. Edits per Tool, nicht per `sed` auf ganze Dateien; Python-Edits mit `newline=''`.
- Testabfragen nach Rolle/Label dürfen sich nicht ändern; ein Test, der nach dem Umbau rot wird, wird nur dann angepasst, wenn er alte Basis-Optik prüft (z. B. `block border-b-0`), sonst ist es ein Fehler im Umbau.
- Bekannter Last-Flake: `HomeAnalysisPage`/`HomeChartList` und die „pinned chart“-Tests fallen im Volllauf gelegentlich aus; einzeln grün = kein Befund.

## Review Focus

1. **Lange deutsche Wörter in schmalen Feldern/Labels bei 390 px** („Wiederholungen“, „Kohlenhydrate (g)“, Mahlzeiten-Abschnittsnamen) — erwartet: Umbruch, kein horizontaler Scroll. Geprüft im Screenshot-Abgleich (Task 7) bei 390 px auf `/profile`, `/nutrition` (Produkt-Formular), `/training/session`.
2. **Stretch-Effekt von `main > * { display: flex }`** — Buttons ohne `w-full` (Secondary, „Neu laden“) werden in der Flex-Spalte auf volle Breite gezogen. Erwartet: Nur Aktionen, die volle Breite tragen sollen, sind voll breit; andere bekommen `self-start`. Checkliste in jedem Migrations-Task.
3. **Dialoge** (`Dialog.tsx`: Übungsauswahl, Produktsuche, Eintrag bearbeiten) liegen außerhalb von `main` — der Rhythmus-Default greift dort nicht. Erwartet: Dialog-Inhalte haben über `Dialog`s eigenes `flex flex-col gap-4` weiter Abstand. Geprüft in Task 5 und Task 7 (Screenshot mit offenem Dialog).
4. **Fokus-Sichtbarkeit nach Entfernen der Basis-Rahmen** — Felder und Links müssen mit Tastatur einen sichtbaren Fokus-Ring haben. `inputClass` und `linkClass` tragen `focus-visible:ring-2`; Test in Task 1 prüft `linkClass` darauf.
5. **Checkbox/Radio/Datei-Eingaben** sind von der ESLint-Pflicht für `className` ausgenommen und dürfen nicht unsichtbar werden — erwartet: native Optik mit `accent-color` Lila. Geprüft im Screenshot von `/training/session` (Aufwärmsatz) und `/body/photos` (Datei-Feld).

---

## Muster-Katalog (gilt für Task 2–5, wird dort wörtlich angewandt)

Jeder Migrations-Task wendet genau diese Muster an. Imports kommen aus `../lib/ui-classes` (Seiten) bzw. `../lib/ui-classes` / `../../lib/ui-classes` (Komponenten/Charts).

**M1 – Feld mit Label:**
```tsx
// vorher
<label>
  Gewicht (kg)
  <input value={gewicht} onChange={(event) => setGewicht(event.target.value)} />
</label>
// nachher
<label className={fieldLabelClass}>
  Gewicht (kg)
  <input className={inputClass} value={gewicht} onChange={(event) => setGewicht(event.target.value)} />
</label>
```
`select` bekommt ebenfalls `inputClass`. `textarea` bekommt `` `${inputClass} min-h-28` ``. Ein `<label htmlFor>` mit separatem Feld (z. B. `ExerciseSelect`) bekommt `fieldLabelClass` am Label und `inputClass` am Feld, Label und Feld zusammen in `<div className="flex flex-col gap-1.5">`.

**M2 – Checkbox/Radio mit Label:**
```tsx
<label className={checkLabelClass}>
  <input type="checkbox" checked={istAufwaermsatz} onChange={(event) => setIstAufwaermsatz(event.target.checked)} />
  Aufwärmsatz
</label>
```
Checkbox steht vor dem Text (Konvention). Abfragen per `getByLabelText` bleiben gültig.

**M3 – Pressable ohne Variante:** Jede `<Pressable>` ohne `variant` bekommt eine:
- Aktion neben anderen, nicht destruktiv („Neu laden“, „Hoch“/„Runter“, „Abbrechen“) → `variant="secondary"`;
- Löschen/Entfernen → `variant="danger"`;
- Ausnahmen, die `bare` bleiben, weil sie eigenes Aussehen per `className` tragen: `Chip.tsx`, `Dialog.tsx` (Schließen-Kreis), `ExerciseFilterChips.tsx`, Listenzeilen-Buttons in `ExercisePicker.tsx`/`ExercisesPage.tsx`, kompakter „Entfernen“ in `WorkoutSessionPage` (2b).
- Nicht voll breit gedachte Buttons in einer Seiten-Spalte bekommen `className="self-start"`.

**M4 – Bereichs- und Zurück-Links:** `PressableLink` mit `className="flex items-center justify-center gap-2"` → `className={linkClass}`. Mehrere aufeinanderfolgende solche Links werden in **eine** Gruppe gefasst:
```tsx
<div className="flex flex-col">
  <PressableLink to="/training/plans" className={linkClass}>
    <VitaIcon name="plans" tone="brand" size={20} />
    Meine Pläne
  </PressableLink>
  <PressableLink to="/training/exercises" className={linkClass}>
    <VitaIcon name="exercises" tone="brand" size={20} />
    Übungen
  </PressableLink>
</div>
```
Links mitten im Fließtext (z. B. „Zeit für einen neuen?“, „Profil vervollständigen“) bleiben ohne Klasse — sie erben nur `color: accent-text` aus dem Basis-Layer (WCAG 2.2 nimmt Inline-Links von der Zielgröße aus).

**M5 – Listen:**
- `className="block border-b-0"` (bzw. `list-in block border-b-0`) am `<li>` ist ein Workaround gegen die alte `li`-Basisregel → entfernen (`list-in` bleibt).
- Liste, deren Zeilen selbst Karten sind: `<ul role="list" className="flex flex-col gap-3">`, `<li>` ohne Klasse.
- Liste in einer Karte (Zeilen sind keine Karten): `<ul role="list" className={listClass}>`, `<li className={listRowClass}>`.
- `role="list"` bleibt überall erhalten (Safari/VoiceOver).

**M6 – Abstände und Überschriften:**
- `space-y-*` am Seiten-Wurzel-Element entfernen (der Basis-Default `main > *` gibt `gap: 1.5rem`).
- Zusammengehörige lose Elemente (Text + Aktion, Planname + Tagname + Button) in `<div className="flex flex-col gap-2">` fassen; eine echte Sektion mit Überschrift in `<section className="flex flex-col gap-3">` oder in eine Karte.
- `justify-center` an `h2`-Klassen (`"flex items-center justify-center gap-2"`) → `"flex items-center gap-2"`.
- `text-center` an Überschriften entfernen, außer bei den zwei Ausnahmen aus den Global Constraints.

**M7 – Karte in Karte:** Liegt ein `cardClass`-Element in einem anderen `cardClass`-Element, wird das innere zu `listRowClass` (Zeile) oder zu `<div className="flex flex-col gap-3">` (Gruppe). Explizite `space-y-*`/`gap-*` neben `cardClass` nur behalten, wenn bewusst größer als 12 px.

**Checkliste am Ende jedes Migrations-Tasks** (im Bericht abhaken):
- [ ] `npm run lint` grün, die Dateien des Tasks stehen nicht mehr in `PENDING_MIGRATION` (siehe Task 2).
- [ ] `grep -n "block border-b-0\|justify-center gap-2\|space-y-" <Dateien>` geprüft, Treffer begründet.
- [ ] Kein `cardClass` in `cardClass` (auch über Komponentengrenzen: Kind-Komponenten der Datei angesehen).
- [ ] Keine voll gestreckten Nicht-Primär-Buttons ohne Absicht.
- [ ] `npx vitest run <Testdateien des Bereichs>` grün.

---

### Task 1: Fundament – Basis-Layer, Typo, Rhythmus, Rezepte, Flächen-Regel

**Files:**
- Modify: `src/index.css:56` (`:root`-Font), `src/index.css:101-232` (`@layer base`)
- Modify: `src/lib/ui-classes.ts`
- Modify: `src/components/Chip.tsx:20`
- Test: `src/lib/ui-classes.test.ts`, `src/lib/contrast.test.ts`, `src/components/ExerciseFilterChips.test.tsx:106`

**Interfaces:**
- Produces (für alle späteren Tasks, exakt diese Namen aus `src/lib/ui-classes.ts`):
  - `fieldLabelClass: string` = `'flex flex-col gap-1.5 text-sm font-medium text-text-muted'`
  - `checkLabelClass: string` = `'flex min-h-11 items-center gap-3 text-text'`
  - `linkClass: string` = `` `inline-flex min-h-11 items-center gap-2 rounded-lg text-accent-text underline-offset-4 hover:underline ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg` ``
  - `listClass: string` = `'divide-y divide-text-muted/15'`
  - `listRowClass: string` = `'flex items-center gap-3 py-3'`
  - `cardClass` neu `'bg-surface rounded-3xl p-6 space-y-3'`
  - `buttonSecondaryClass`/`buttonDangerClass`: `bg-surface` → `bg-surface-raised`
- Basis-Layer-Verhalten: `main > *` ist eine Flex-Spalte mit `gap: 1.5rem`.

- [ ] **Step 1: Failing tests für Rezepte und Flächen-Regel schreiben**

In `src/lib/ui-classes.test.ts` die Imports erweitern und ans Ende des `describe` anhängen:

```ts
import {
  buttonDangerClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  cardClass,
  checkLabelClass,
  fieldLabelClass,
  inputClass,
  interactiveClass,
  linkClass,
  listClass,
  listRowClass,
  stickyActionClass,
} from './ui-classes'
```

```ts
  it('raises every control off the card surface, so it stays visible inside a card', () => {
    for (const cls of [buttonSecondaryClass, buttonDangerClass, inputClass]) {
      expect(cls.split(' ')).toContain('bg-surface-raised')
      expect(cls.split(' ')).not.toContain('bg-surface')
    }
  })

  it('spaces blocks inside a card at 12px', () => {
    expect(cardClass.split(' ')).toContain('space-y-3')
  })

  it('stacks a field label above its field in the quiet label style', () => {
    expect(fieldLabelClass).toContain('flex-col')
    expect(fieldLabelClass).toContain('text-text-muted')
  })

  it('gives checkbox labels and text links a 44px tap height', () => {
    expect(checkLabelClass).toContain('min-h-11')
    expect(linkClass).toContain('min-h-11')
  })

  it('gives text links the accessible accent tint and a visible keyboard focus', () => {
    expect(linkClass).toContain('text-accent-text')
    expect(linkClass).toContain('focus-visible:ring-2')
  })

  it('separates list rows with a quiet divider and lays them out left-aligned', () => {
    expect(listClass).toContain('divide-y')
    expect(listRowClass).toContain('items-center')
    expect(listRowClass).not.toContain('justify-center')
  })
```

In `src/lib/contrast.test.ts` innerhalb des `describe`, nach den bestehenden Token-Tests (Konstanten `SURFACE`, `SURFACE_RAISED`, `ACCENT_TEXT` existieren dort schon):

```ts
  // Block 1 Flächen-Regel: Bedienelemente liegen auf surface-raised, Text darauf muss AA schaffen.
  it('clears AA for primary text on surface-raised (inactive chips, secondary buttons)', () => {
    expect(contrastRatio('#fefeff', SURFACE_RAISED)).toBeGreaterThanOrEqual(4.5)
  })

  it('documents that muted text on surface-raised fails AA, which is why chips use full text color', () => {
    expect(contrastRatio('#90919a', SURFACE_RAISED)).toBeLessThan(4.5)
  })

  it('clears AA for the accent text tint on a card surface (text links in cards)', () => {
    expect(contrastRatio(ACCENT_TEXT, SURFACE)).toBeGreaterThanOrEqual(4.5)
  })
```

In `src/components/ExerciseFilterChips.test.tsx:106` die Erwartung an den inaktiven Chip ändern:

```ts
    expect(screen.getByRole('button', { name: 'Alle' })).toHaveClass('bg-surface-raised', 'text-text')
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `npx vitest run src/lib/ui-classes.test.ts src/lib/contrast.test.ts src/components/ExerciseFilterChips.test.tsx`
Expected: FAIL — `fieldLabelClass`/`linkClass`/… sind nicht exportiert (Import-Fehler bzw. `undefined`), `bg-surface-raised` fehlt in Secondary/Danger und im Chip. Die drei Kontrast-Tests sind sofort grün (sie dokumentieren Token-Werte) — das ist erwartet.

- [ ] **Step 3: `ui-classes.ts` umsetzen**

`cardClass` ersetzen:

```ts
/**
 * Rhythmus (Block 1): 24px zwischen Sektionen kommt aus dem Basis-Layer
 * (main > *), 12px zwischen Blöcken in einer Karte kommt von hier
 * (space-y-3), 8px zwischen zusammengehörigen Bedienelementen ist gap-2
 * am Aufrufer. Eine Karte liegt nie in einer anderen Karte.
 */
export const cardClass = 'bg-surface rounded-3xl p-6 space-y-3'
```

In `buttonSecondaryClass` und `buttonDangerClass` jeweils `bg-surface` durch `bg-surface-raised` ersetzen und den Kommentar über `buttonDangerClass` belassen. Über `buttonSecondaryClass` einen Kommentar ergänzen:

```ts
/**
 * Flächen-Regel (Block 1): Bedienelemente liegen immer auf surface-raised —
 * auf bg-surface wären sie in einer Karte unsichtbar (Audit 13.10.2026).
 */
```

Ans Dateiende anhängen:

```ts
/** Label über seinem Feld; das Feld darin trägt inputClass (heller Text). */
export const fieldLabelClass = 'flex flex-col gap-1.5 text-sm font-medium text-text-muted'

/** Checkbox/Radio links, Text rechts, eine 44px-Zeile. */
export const checkLabelClass = 'flex min-h-11 items-center gap-3 text-text'

/**
 * Bereichs-/Zurück-Link als eigene Zeile (ersetzt die alte a-Basisregel).
 * Links im Fließtext bekommen keine Klasse, nur die Farbe aus dem Basis-Layer.
 */
export const linkClass = `inline-flex min-h-11 items-center gap-2 rounded-lg text-accent-text underline-offset-4 hover:underline ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`

/** Liste in einer Karte: Zeilen mit dezenter Trennlinie statt Karte in Karte. */
export const listClass = 'divide-y divide-text-muted/15'

export const listRowClass = 'flex items-center gap-3 py-3'
```

`linkClass` muss nach `interactiveClass` stehen (Template-String). Prüfen, dass `interactiveClass` oberhalb definiert ist — ist es.

- [ ] **Step 4: Chip umstellen**

`src/components/Chip.tsx:20`:

```tsx
        active ? 'bg-accent text-on-bright' : 'bg-surface-raised text-text'
```

Falls über dieser Zeile ein Kommentar die alte Farbwahl begründet, auf die Flächen-Regel und den Kontrast-Test (`text-muted` auf `surface-raised` < 4,5:1) umschreiben.

- [ ] **Step 5: Basis-Layer ersetzen**

In `src/index.css` Zeile `font: 18px/145% var(--font-sans);` ersetzen durch:

```css
  /* Einheitenlos: 145% würde einmal in px umgerechnet und so an h1 vererbt (36px Schrift, 23px Zeile). */
  font: 18px/1.45 var(--font-sans);
```

Den kompletten Block `@layer base { … }` (von `@layer base {` bis zur schließenden Klammer vor dem Toast-Kommentar) ersetzen durch:

```css
@layer base {
  /*
   * Block 1: Tailwinds Preflight setzt Ränder, Margins, Paddings, Button-
   * Hintergründe und Listen bereits zurück. Hier steht nur, was Preflight
   * nicht liefert: Typo-Skala, Layout-Gerüst, Tap-Höhen, Rhythmus-Default.
   * Jedes Aussehen (Felder, Buttons, Links, Listenzeilen, Karten) kommt aus
   * src/lib/ui-classes.ts — ein Element ohne Rezept sieht schlicht aus,
   * nicht nach einer zweiten Designgeneration.
   */
  h1,
  h2,
  h3 {
    font-family: var(--font-sans);
    font-weight: 600;
    color: var(--color-text);
  }

  h1 {
    font-size: 36px;
    line-height: 1.15;
    letter-spacing: -0.02em;
    @media (max-width: 1024px) {
      font-size: 28px;
    }
  }

  h2 {
    font-size: 22px;
    line-height: 1.25;
    letter-spacing: -0.01em;
    @media (max-width: 1024px) {
      font-size: 20px;
    }
  }

  h3 {
    font-size: 17px;
    line-height: 1.3;
  }

  #root > * {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  header {
    display: flex;
    justify-content: flex-end;
    padding: 8px 16px;
  }

  main {
    flex: 1;
    padding: 0 16px var(--nav-clearance);
  }

  /*
   * Rhythmus: jede Seite rendert genau ein Wurzel-Element unter main
   * (AppLayout). Dessen direkte Kinder sind die Sektionen der Seite und
   * stehen 24px auseinander. Zusammengehörige Einzelelemente fasst die
   * Seite selbst in eine Gruppe (gap-2) oder Karte (space-y-3).
   */
  main > * {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  a {
    color: var(--color-accent-text);
  }

  /* 44px: kleinstes zuverlässiges Tap-Ziel auf dem Handy — Barrierefreiheit, kein Aussehen. */
  button,
  input:not([type='checkbox']):not([type='radio']),
  select {
    min-height: 44px;
  }

  button {
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  input[type='checkbox'],
  input[type='radio'] {
    accent-color: var(--color-accent);
    width: 1.25rem;
    height: 1.25rem;
  }

  label {
    display: block;
  }
}
```

Hinweis: Die alte `img`-Regel entfällt, Preflight setzt `img { max-width: 100%; height: auto; display: block }`. Die Toast-/`row-in`-/`list-in`-Keyframes darunter bleiben unverändert.

- [ ] **Step 6: Tests laufen lassen**

Run: `npx vitest run src/lib/ui-classes.test.ts src/lib/contrast.test.ts src/components/ExerciseFilterChips.test.tsx src/components/Chip.test.tsx`
Expected: PASS. (Falls `Chip.test.tsx` nicht existiert, den Pfad weglassen.)

- [ ] **Step 7: Volllauf, Lint, Typecheck**

Run: `npx vitest run; npm run lint; npx tsc -b --noEmit`
Expected: Vitest grün bis auf Tests, die alte Basis-Optik prüfen. Solche Tests (z. B. `FoodEntryList.test.tsx:78` erwartet `block border-b-0`) **jetzt nicht** anpassen, sondern im Bericht auflisten — sie gehören zum Migrations-Task ihres Bereichs. Alle anderen Fehlschläge sind Fehler in diesem Task. Lint und `tsc` grün.

- [ ] **Step 8: Commit**

```bash
git add src/index.css src/lib/ui-classes.ts src/lib/ui-classes.test.ts src/lib/contrast.test.ts src/components/Chip.tsx src/components/ExerciseFilterChips.test.tsx
git commit -m "feat(design): neutral base layer, type scale, rhythm and surface rule"
```

---

### Task 2: ESLint-Schutz mit Migrations-Ausnahmeliste

**Files:**
- Modify: `eslint.config.js`

**Interfaces:**
- Consumes: nichts aus Task 1 (rein statisch).
- Produces: Konstante `PENDING_MIGRATION` in `eslint.config.js` — Task 3–6 entfernen daraus ihre Dateien; `npm run lint` muss danach grün sein. Am Ende von Task 6 ist die Liste leer und wird gelöscht.

- [ ] **Step 1: Regel erweitern**

In `eslint.config.js` oberhalb von `export default` einfügen:

```js
// Block 1: noch nicht auf ui-classes migrierte Dateien. Jeder Migrations-Task
// entfernt seine Dateien; am Ende ist die Liste leer und wird gelöscht.
const PENDING_MIGRATION = [
  'src/components/AddEntryFlow.tsx',
  'src/components/BodyEntryForm.tsx',
  'src/components/CalorieGoalEditor.tsx',
  'src/components/ExercisePicker.tsx',
  'src/components/FoodEntryEditForm.tsx',
  'src/components/FoodEntryList.tsx',
  'src/components/ManualProductForm.tsx',
  'src/components/ProductPicker.tsx',
  'src/components/charts/ChartPicker.tsx',
  'src/components/charts/ExerciseSelect.tsx',
  'src/pages/BodyEntriesPage.tsx',
  'src/pages/BodyPage.tsx',
  'src/pages/BodyPhotosPage.tsx',
  'src/pages/ExercisesPage.tsx',
  'src/pages/LoginPage.tsx',
  'src/pages/NutritionEntriesPage.tsx',
  'src/pages/NutritionPage.tsx',
  'src/pages/ProfilePage.tsx',
  'src/pages/TrainingHistoryDetailPage.tsx',
  'src/pages/TrainingPlanEditPage.tsx',
  'src/pages/TrainingPlansPage.tsx',
  'src/pages/TrainingPlanWizardPage.tsx',
  'src/pages/WorkoutSessionPage.tsx',
]

// Felder, Labels und Pressables tragen ihr Aussehen aus src/lib/ui-classes.ts;
// ohne Klasse fielen sie auf Preflight-Optik zurück (Block-1-Spec).
const designSystemSelectors = [
  {
    selector:
      "JSXOpeningElement[name.name=/^(input|select|textarea)$/]:not(:has(JSXAttribute[name.name='className'])):not(:has(JSXAttribute[name.name='type'][value.value=/^(checkbox|radio|file)$/]))",
    message: 'Felder brauchen inputClass aus lib/ui-classes (Checkbox/Radio/Datei ausgenommen).',
  },
  {
    selector: "JSXOpeningElement[name.name='label']:not(:has(JSXAttribute[name.name='className']))",
    message: 'Labels brauchen fieldLabelClass oder checkLabelClass aus lib/ui-classes.',
  },
  {
    selector:
      "JSXOpeningElement[name.name='Pressable']:not(:has(JSXAttribute[name.name='variant'])):not(:has(JSXAttribute[name.name='className']))",
    message: 'Pressable braucht eine variant (primary/secondary/danger) oder eigenes Aussehen per className.',
  },
]
```

Den bestehenden Block `files: ['src/**/*.tsx']` so ändern, dass er die `<button>`-Regel **und** die neuen Selektoren enthält, und einen zweiten Block für die Ausnahmeliste ergänzen, der nur die `<button>`-Regel behält:

```js
  {
    files: ['src/**/*.tsx'],
    // Pressable is the one sanctioned place that renders a raw <button>;
    // tests may render raw buttons as fixtures. `ignores` only exempts these
    // files from THIS object, the rules above still apply to them.
    ignores: ['src/components/Pressable.tsx', '**/*.test.tsx', ...PENDING_MIGRATION],
    rules: {
      'no-restricted-syntax': ['error', rawButtonSelector, ...designSystemSelectors],
    },
  },
  {
    files: PENDING_MIGRATION,
    rules: {
      'no-restricted-syntax': ['error', rawButtonSelector],
    },
  },
```

Dazu den bestehenden `<button>`-Eintrag als Konstante herausziehen (oberhalb von `export default`):

```js
const rawButtonSelector = {
  selector: "JSXOpeningElement[name.name='button']",
  message: 'Use <Pressable> from components/Pressable instead of a raw <button> (shared tap feedback).',
}
```

- [ ] **Step 2: Prüfen, dass der Selektor greift (Rot-Nachweis)**

Run: `npx eslint src/components/ManualProductForm.tsx --rule "no-restricted-syntax: [error, {selector: \"JSXOpeningElement[name.name=/^(input|select|textarea)$/]:not(:has(JSXAttribute[name.name='className']))\", message: x}]"`
Expected: mehrere Fehler „x“ in `ManualProductForm.tsx` (beweist, dass `:has` in dieser ESLint-Version funktioniert). Falls ESLint `:has` nicht unterstützt (Parse-Fehler des Selektors), STOP und an den Controller melden — dann wird der Schutz auf einen Vitest mit `import.meta.glob('?raw')` umgestellt (Spec, Abschnitt 7).

- [ ] **Step 3: Lint mit Ausnahmeliste grün**

Run: `npm run lint`
Expected: PASS. Meldet ESLint eine Datei, die nicht in `PENDING_MIGRATION` steht (z. B. `ExerciseFilterChips.tsx`, `Dialog.tsx`, `CompletionCelebration.tsx`, Chart-Listen), dann: Verstoß ist echt → Datei gemäß Muster-Katalog M1–M3 sofort in diesem Task beheben (nicht in die Liste aufnehmen). Im Bericht auflisten.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js
git commit -m "chore(lint): require design-system classes on fields, labels and pressables"
```

---

### Task 3: Training migrieren

**Files:**
- Modify: `src/pages/TrainingPage.tsx`, `src/pages/TrainingPlansPage.tsx`, `src/pages/TrainingPlanEditPage.tsx`, `src/pages/TrainingPlanWizardPage.tsx`, `src/pages/WorkoutSessionPage.tsx`, `src/pages/TrainingHistoryPage.tsx`, `src/pages/TrainingHistoryDetailPage.tsx`, `src/pages/ExercisesPage.tsx`, `src/components/ExercisePicker.tsx`
- Modify: `eslint.config.js` (Dateien aus `PENDING_MIGRATION` entfernen)
- Test: die zugehörigen `*.test.tsx` (nur anpassen, wo sie alte Basis-Optik prüfen)

**Interfaces:**
- Consumes: `fieldLabelClass`, `checkLabelClass`, `linkClass`, `listClass`, `listRowClass`, `inputClass`, `cardClass` aus `src/lib/ui-classes.ts` (Task 1); `PENDING_MIGRATION` (Task 2).

- [ ] **Step 1: Rot machen**

Die sieben Training-Dateien aus `PENDING_MIGRATION` in `eslint.config.js` entfernen: `ExercisePicker.tsx`, `ExercisesPage.tsx`, `TrainingHistoryDetailPage.tsx`, `TrainingPlanEditPage.tsx`, `TrainingPlansPage.tsx`, `TrainingPlanWizardPage.tsx`, `WorkoutSessionPage.tsx`.

Run: `npm run lint`
Expected: FAIL mit „Felder brauchen inputClass…“/„Labels brauchen…“/„Pressable braucht…“ in genau diesen Dateien.

- [ ] **Step 2: Felder, Labels, Pressables (M1–M3)**

Pro Datei (Zeilen = Stand der Bestandsaufnahme, vor Ort per Lint-Ausgabe bestätigen):
- `ExercisesPage.tsx:195-217` „Eigene Übung“-Formular: 6 Labels → `fieldLabelClass`, 5 `input` → `inputClass`, `textarea` → `` `${inputClass} min-h-28` ``.
- `ExercisePicker.tsx:72-74` Suchfeld: Label `fieldLabelClass`, Input `inputClass`.
- `TrainingPlanEditPage.tsx:116-118` „Neuer Tag“: M1. `:284-286` Ziel-Sätze-Feld: M1. `:172,177,204,209` Hoch/Runter: `variant="secondary"`, zusätzlich `className="min-w-11 px-3"` (Pfeil-Buttons sind schmal), in ihrer Zeile `flex gap-2`.
- `TrainingPlanWizardPage.tsx:75` Name-Label, `:114` Dauer-Label: M1; `:101` Pressable: Variante nach Rolle (Auswahl-Kachel → prüfen, ob es eine Chip-artige Auswahl ist; dann `Chip` verwenden, sonst `secondary`).
- `TrainingHistoryDetailPage.tsx:89,174-176`: M1; `:108` Pressable: Löschen → `danger`.
- `TrainingPlansPage.tsx:58,66`: Aktivieren → `secondary`, Löschen → `danger`.
- `WorkoutSessionPage.tsx:491` Gewicht, `:505` Wiederholungen: M1 (die `inputMode`/`aria-invalid`-Attribute aus PR #77 bleiben); `:519` Aufwärmsatz: M2 (Checkbox vor den Text). `:205,214` Pressables: kompakter „Entfernen“ (2b) bleibt `danger` mit seinen Klassen; der andere nach Rolle.

- [ ] **Step 3: Links, Listen, Abstände, Karte in Karte (M4–M7)**

- `TrainingPage.tsx:62-118`: Wurzel-`<div>` bleibt ohne Klasse. Leerzustand (`plan == null`) als `<div className="flex flex-col gap-2">` mit Text + Button. Plan/Tag/Start (`plan != null && day != null`) in **eine** Karte: `<div className={cardClass}>` mit `<p className={labelClass}>{plan.name}</p>`, `<p className="text-xl font-semibold">{day.name}</p>`, Start-Button. Die vier Bereichs-Links (Meine Pläne, Übungen, Historie, Analyse) per M4 in eine `flex flex-col`-Gruppe. Damit ist die Audit-Überlappung „Training starten“/„Meine Pläne“ behoben. `labelClass` zum Import hinzufügen.
- `TrainingPlansPage.tsx:53` `li` → M5 (Zeilen sind Karten: `ul className="flex flex-col gap-3"`); `:55` Planname-Link im Karteninhalt → `linkClass`; `:86` Zurück-Link → `linkClass`.
- `TrainingPlanEditPage.tsx:168-184` **Karte in Karte**: Tag-`section` ist `cardClass`, Übungszeilen `:184` ebenfalls → Zeilen zu `listRowClass` mit `items-start`, `ul` zu `listClass` (M7). `:169` `h2` bleibt. `:64,128` Zurück-Links → `linkClass`.
- `TrainingPlanWizardPage.tsx:139` → `linkClass`. Sektionen `:87`, `:113` (h2 + Inhalt) als `<section className="flex flex-col gap-3">`.
- `WorkoutSessionPage.tsx:202-203` Übungskarten: `li` M5. `:483` SetForm-`cardClass` liegt in der Übungskarte `:203` → **Karte in Karte** → `<div className="flex flex-col gap-3">` (M7). `:365` prüfen, ob ebenfalls in `:203` gerendert wird; wenn ja, gleich behandeln. `:291` „Gewicht im Profil eintragen“ → `className={linkClass}`. `:115,131,132` Links → `linkClass` (Gruppe). `:328` `h1` „Training abgeschlossen“ darf zentriert bleiben. `:338` PR-Karten-`li` bleibt (eigene Karte, liegt nicht in Karte — prüfen).
- `TrainingHistoryPage.tsx:43-45` `li` M5 (Karten-Zeilen), `:45` Link im Karteninhalt `linkClass`; `:58` → `linkClass`.
- `TrainingHistoryDetailPage.tsx:66-67` `li` M5; `:43,126` → `linkClass`.
- `ExercisesPage.tsx:96` `list-in block border-b-0` → `list-in`; `:55,136` → `linkClass`.
- `ExercisePicker.tsx:100` **Karte in Karte** (Zeilen-Buttons tragen `cardClass` im Picker-`cardClass` `:71`) → Zeilen-Klassen `` `${listRowClass} ${interactiveClass} w-full rounded-2xl px-2 text-left` `` statt `` `${cardClass} ${interactiveClass} flex w-full items-center gap-4 text-left` ``; die umgebende `ul` bekommt `listClass`. `list-in`/`revealDelay` bleiben. `:87` `h3` bleibt.

- [ ] **Step 4: Lint und Tests**

Run: `npm run lint; npx vitest run src/pages/Training src/pages/WorkoutSessionPage.test.tsx src/pages/ExercisesPage.test.tsx src/components/ExercisePicker.test.tsx`
Expected: Lint PASS. Tests PASS; Tests, die `block border-b-0` oder `cardClass` an Picker-Zeilen erwarten, auf die neue Klasse umstellen (nur Klassen-Erwartungen, keine Rollen/Labels).

- [ ] **Step 5: Checkliste aus dem Muster-Katalog abhaken, dann Commit**

```bash
git add eslint.config.js src/pages/Training*.tsx src/pages/WorkoutSessionPage*.tsx src/pages/ExercisesPage*.tsx src/components/ExercisePicker*.tsx
git commit -m "feat(design): migrate training area to the unified design system"
```

---

### Task 4: Ernährung migrieren

**Files:**
- Modify: `src/pages/NutritionPage.tsx`, `src/pages/NutritionEntriesPage.tsx`, `src/components/ManualProductForm.tsx`, `src/components/FoodEntryEditForm.tsx`, `src/components/AddEntryFlow.tsx`, `src/components/ProductPicker.tsx`, `src/components/FoodEntryList.tsx`, `src/components/CalorieGoalEditor.tsx`, `src/components/DailySummary.tsx`
- Modify: `eslint.config.js`
- Test: `src/components/FoodEntryList.test.tsx:78` und weitere Bereichs-Tests

**Interfaces:**
- Consumes: wie Task 3.

- [ ] **Step 1: Rot machen**

Aus `PENDING_MIGRATION` entfernen: `AddEntryFlow.tsx`, `CalorieGoalEditor.tsx`, `FoodEntryEditForm.tsx`, `FoodEntryList.tsx`, `ManualProductForm.tsx`, `ProductPicker.tsx`, `NutritionEntriesPage.tsx`, `NutritionPage.tsx`.

Run: `npm run lint`
Expected: FAIL in genau diesen Dateien.

- [ ] **Step 2: Felder, Labels, Pressables (M1–M3)**

- `ManualProductForm.tsx:78-113`: 8 Labels M1, alle `input` → `inputClass`. Die Felder in einer Karte (`:77`) — Felder stehen untereinander, kein Grid.
- `FoodEntryEditForm.tsx:153-230`: 11 Labels M1, `select` `:167` → `inputClass`.
- `AddEntryFlow.tsx:50-52`: M1.
- `ProductPicker.tsx:106`: M1 (Suchfeld).
- `CalorieGoalEditor.tsx:74`: M1. Test `CalorieGoalEditor.test.tsx:41,85` prüft `closest('div')`-Klassen → nach Umbau prüfen, nur Klassen-Erwartung anpassen.
- `NutritionEntriesPage.tsx:47` „Neu laden“ → `variant="secondary"` + `self-start`; `:125` nach Rolle (Bearbeiten → `secondary`, Löschen → `danger`).
- `NutritionPage.tsx:51` „Neu laden“ → `variant="secondary"` + `self-start`.
- `FoodEntryList.tsx:66` nach Rolle.

- [ ] **Step 3: Links, Listen, Abstände (M4–M7)**

- `NutritionPage.tsx:63-95`: `:67` Inline-Link „Profil vervollständigen“ bleibt ohne Klasse (M4-Ausnahme). `:70,86,91` Bereichs-Links → M4-Gruppe. `:74-79` Mahlzeiten-Abschnitts-Liste: steht nicht in einer Karte → Zeilen als Karten oder als Liste in **einer** Karte. Entscheidung: **eine** Karte mit `ul className={listClass}`, je Abschnitt `li className={listRowClass}` mit Link `linkClass` + kcal rechts (`ml-auto tabular-nums`). Kompakter, und Block 2 baut darauf auf.
- `NutritionEntriesPage.tsx:81` → `linkClass`; `:114` `h2` je Abschnitt bleibt; Abschnitte als `<section className="flex flex-col gap-3">`.
- `FoodEntryList.tsx:53` `li className="block border-b-0"` → `<li>`; Test `FoodEntryList.test.tsx:78` (`toHaveClass('block', 'border-b-0')`) → Erwartung entfernen bzw. auf die Karte (`:80`) beschränken. `ul` → `flex flex-col gap-3`.
- `DailySummary.tsx:17` `h2` bleibt; Karte prüfen (keine Karte in Karte, wenn sie in `NutritionPage`/`HomePage` direkt unter der Seiten-Wurzel steht).
- `CalorieGoalEditor.tsx:58,73` zwei `cardClass` — prüfen, ob der Editor in einer Karte gerendert wird (`ProfilePage`): ja → in Task 5 dort auflösen, hier nur notieren.

- [ ] **Step 4: Lint und Tests**

Run: `npm run lint; npx vitest run src/pages/Nutrition src/components/ManualProductForm.test.tsx src/components/FoodEntryEditForm.test.tsx src/components/AddEntryFlow.test.tsx src/components/ProductPicker.test.tsx src/components/FoodEntryList.test.tsx src/components/CalorieGoalEditor.test.tsx src/components/DailySummary.test.tsx`
Expected: PASS (nicht existierende Testdateien aus dem Befehl streichen).

- [ ] **Step 5: Checkliste, dann Commit**

```bash
git add eslint.config.js src/pages/Nutrition*.tsx src/components/ManualProductForm*.tsx src/components/FoodEntry*.tsx src/components/AddEntryFlow*.tsx src/components/ProductPicker*.tsx src/components/CalorieGoalEditor*.tsx src/components/DailySummary*.tsx
git commit -m "feat(design): migrate nutrition area to the unified design system"
```

---

### Task 5: Körper, Profil, Login, Dialoge, Analyse, Home

**Files:**
- Modify: `src/pages/BodyPage.tsx`, `src/pages/BodyEntriesPage.tsx`, `src/pages/BodyPhotosPage.tsx`, `src/components/BodyEntryForm.tsx`, `src/pages/ProfilePage.tsx`, `src/pages/LoginPage.tsx`, `src/components/ExerciseDetailDialog.tsx`, `src/components/charts/ExerciseSelect.tsx`, `src/components/charts/ChartPicker.tsx`, `src/components/charts/ChartFrame.tsx`, `src/components/charts/PersonalRecordsList.tsx`, `src/components/charts/PhotoTimeline.tsx`, `src/components/charts/WeeklySummaryList.tsx`, `src/components/charts/ActivityGridChart.tsx`, `src/pages/HomePage.tsx`, `src/pages/HomeAnalysisPage.tsx`, `src/pages/TrainingAnalysisPage.tsx`, `src/pages/NutritionAnalysisPage.tsx`, `src/pages/BodyAnalysisPage.tsx`
- Modify: `eslint.config.js` (Liste leeren und löschen)

**Interfaces:**
- Consumes: wie Task 3.

- [ ] **Step 1: Rot machen**

Alle verbleibenden Einträge aus `PENDING_MIGRATION` entfernen und die Konstante samt zweitem Config-Block (`files: PENDING_MIGRATION`) und dem Spread in `ignores` löschen.

Run: `npm run lint`
Expected: FAIL nur in den Dateien dieses Tasks.

- [ ] **Step 2: Felder, Labels, Pressables (M1–M3)**

- `BodyEntryForm.tsx:75,87`: M1 (je Messfeld).
- `BodyPhotosPage.tsx:77-79` Datum: M1; `:81-83` Datei: Label `fieldLabelClass`, `input type="file"` bleibt ohne Klasse (ESLint-Ausnahme), bekommt aber `className="text-sm text-text-muted file:mr-3 file:rounded-2xl file:border-0 file:bg-surface-raised file:px-4 file:py-2 file:text-text"`, damit der Datei-Button zur Flächen-Regel passt.
- `ProfilePage.tsx:233,305-374,400`: alle Labels M1, `:307` und weitere `input` → `inputClass` (die bestehenden `type="number"`/`step`-Attribute bleiben), `:365` `select` → `inputClass`. `:247,434` Pressables nach Rolle (Logout → `secondary`, Konto löschen → `danger`).
- `LoginPage.tsx:131`: Pressable nach Rolle; Labels der Login-Felder M1. Logo-Bereich bleibt zentriert.
- `ExerciseSelect.tsx:19-20`: M1-Variante mit `htmlFor` (siehe Muster).
- `ChartPicker.tsx:58`: Checkbox-Label → M2, sonst M1.
- `BodyPage.tsx:101`, `BodyEntriesPage.tsx:90`: nach Rolle.

- [ ] **Step 3: Links, Listen, Abstände, Karte in Karte (M4–M7)**

- `BodyPage.tsx:80-81` `li block border-b-0` → `<li>`; die Messwert-Karten stehen im 2-Spalten-Grid (bleibt). `:149,153,157` → M4-Gruppe.
- `BodyEntriesPage.tsx:86-87` M5; `:143` → `linkClass`.
- `BodyPhotosPage.tsx:91-92` M5; `:116` → `linkClass`.
- `ProfilePage.tsx:226,304` zwei Karten — prüfen, ob `CalorieGoalEditor` (zwei eigene `cardClass`, siehe Task 4) innerhalb einer dieser Karten liegt; wenn ja, **Karte in Karte**: im Editor die äußere `cardClass` behalten und den Profil-Wrapper zu einer Sektion `<section className="flex flex-col gap-3">` machen. `:431` `h2` „Tagesziel“ bleibt.
- `HomePage.tsx:66`: `className="space-y-4"` am Wurzel-`div` entfernen. `:74,87,111` `h2 "flex items-center justify-center gap-2"` → `"flex items-center gap-2"`. `:69,81,105,116,122` Links → `linkClass`; `:69` und `:122` (außerhalb der Karten) als M4-Gruppe, `:81,105,116` (in Karten) einzeln. Inhalt der Home-Karten bleibt — Neugestaltung ist Block 2.
- Analyse-Seiten (`HomeAnalysisPage.tsx:46`, `TrainingAnalysisPage.tsx:54`, `NutritionAnalysisPage.tsx:60`, `BodyAnalysisPage.tsx:53`) Zurück-Link → `linkClass`.
- `ChartFrame.tsx:45` Leerzustands-Link → `linkClass` (Test `ChartFrame.test.tsx:24` prüft `bg-surface rounded-3xl p-6` — bleibt gültig).
- `PersonalRecordsList.tsx:34-36`, `PhotoTimeline.tsx:38-40`, `WeeklySummaryList.tsx:38-40`: Listen liegen in `ChartFrame`-Karten → `ul className={listClass}`, `li className={listRowClass}` (M5). `ActivityGridChart.tsx:33` `block border-b-0 p-0` → `p-0` entfernen falls ohne Wirkung, `block border-b-0` streichen.
- `ExerciseDetailDialog.tsx:44` Anleitungs-`li`: nummerierte Schritte → `<ol className="flex list-decimal flex-col gap-2 pl-5">` statt `ul`, `li` ohne Klasse (Preflight entfernt Marker; `list-decimal` setzt sie zurück). Falls Tests `getAllByRole('listitem')` nutzen, bleibt das gültig.

- [ ] **Step 4: Lint und Tests**

Run: `npm run lint; npx vitest run src/pages/Body src/pages/ProfilePage.test.tsx src/pages/LoginPage.test.tsx src/pages/HomePage.test.tsx src/pages/HomeAnalysisPage.test.tsx src/components/BodyEntryForm.test.tsx src/components/ExerciseDetailDialog.test.tsx src/components/charts`
Expected: PASS. `eslint.config.js` enthält kein `PENDING_MIGRATION` mehr (`grep -c PENDING_MIGRATION eslint.config.js` = 0).

- [ ] **Step 5: Checkliste, dann Commit**

```bash
git add eslint.config.js src/pages src/components
git commit -m "feat(design): migrate body, profile, login, dialogs and analysis to the unified design system"
```

---

### Task 6: Restbestand und Volllauf

**Files:**
- Modify: alles, was die folgenden Greps finden
- Test: gesamte Suite

- [ ] **Step 1: Restbestand suchen**

Run:
```bash
grep -rn "block border-b-0\|justify-center gap-2\|#2e303a" src --include=*.tsx --include=*.css | grep -v test
grep -rn "className=\"space-y-" src/pages --include=*.tsx | grep -v test
```
Expected: Jeder Treffer ist entweder ein bewusst zentrierter Fall aus den Global Constraints oder wird gemäß Muster-Katalog behoben. Treffer + Entscheidung im Bericht auflisten.

- [ ] **Step 2: Volllauf**

Run: `npx vitest run; npm run lint; npx tsc -b --noEmit`
Expected: alles grün (bekannter Last-Flake: einzeln nachprüfen, siehe Global Constraints).

- [ ] **Step 3: Commit (falls Änderungen)**

```bash
git add -A src
git commit -m "chore(design): remove leftover base-layer workarounds"
```

---

### Task 7: Screenshot-Abgleich (Controller, nicht Subagent)

Dieser Task braucht ein eingeloggtes Testkonto und läuft deshalb beim Controller mit dem Nutzer, nicht in einem Subagent.

**Files:**
- Create: Screenshots im Scratchpad (nicht im Repo)

- [ ] **Step 1: Vorher-Screenshots** — vor Task 1 erstellt (siehe „Vorbereitung“ unten), aus dem Haupt-Checkout auf `master`.

- [ ] **Step 2: Nachher-Screenshots** — Dev-Server in der Worktree (`.env` aus dem Haupt-Checkout in die Worktree kopieren, sie ist gitignored; `npm run dev`), mit `playwright-cli` bei 390×844 und Stichproben bei 1024×768 dieselben Routen: `/`, `/training`, `/training/plans`, `/training/plans/<id>`, `/training/plans/new`, `/training/session/<id>` (Wegwerf-Plan anlegen, danach löschen und Plan „Test“ wieder aktivieren), `/training/history`, `/training/history/<id>`, `/training/exercises` (mit offenem „Eigene Übung“-Formular), `/nutrition`, `/nutrition/entries` (mit offenem Bearbeiten-Dialog), Produkt-Formular, `/body`, `/body/entries`, `/body/photos`, `/profile`, `/login` (ausgeloggt), je eine Analyse-Seite.

- [ ] **Step 3: Abgleich** gegen die Review-Focus-Punkte und die Erfolgskriterien der Spec: Überschriften links in der Skala, 24 px zwischen Sektionen, keine Doppelabstände, Bedienelemente in Karten sichtbar, keine Karte in Karte, kein horizontaler Scroll bei 390 px, nichts von der Bottom-Nav verdeckt, Checkbox/Datei-Feld sichtbar, Fokus-Ring per Tab sichtbar (Stichprobe `/profile`). Befunde → Fix-Commit in der Worktree, Screenshot wiederholen.

- [ ] **Step 4: Ergebnis** als kurze Liste für die PR-Beschreibung festhalten.

---

## Vorbereitung (Controller, vor Task 1)

- Worktree: `git worktree add -b worktree-design-block1 .claude/worktrees/design-block1 HEAD` vom lokalen `master`, darin `npm ci`.
- Vorher-Screenshots: Dev-Server im Haupt-Checkout (`npm run dev`, `.env` vorhanden), Nutzer loggt sich einmal im von `playwright-cli` geöffneten Browser ein, dann die Routen aus Task 7 Step 2 bei 390×844 aufnehmen.

## Abschluss (Controller, nach Task 7)

- Whole-Branch-Review (Opus) gegen Spec + Plan, Fix-Welle, Scoped Re-Review.
- `codex review -c model="gpt-5.6-sol" --base master --title "Audit-Block 1: Einheitliches Designsystem"`, Ergebnis im Status-Abschnitt von `CLAUDE.md`.
- PR mit Screenshot-Ergebnis, Merge nach Nutzer-Freigabe, `git checkout master; git pull` im Haupt-Checkout (Deploy-Regel), Nutzer baut/deployt, danach Hash-Vergleich **und** `grep -c "divide-text-muted/15" dist/assets/index-*.js` ≥ 1 im gebauten und im Live-JS (im JS steht der Klassen-String unescaped; im CSS escaped Tailwind den Schrägstrich).
- Worktree entfernen, `graphify update`, Wiki-Seite „Audit-Block-1-Designsystem“, Status in `CLAUDE.md`.

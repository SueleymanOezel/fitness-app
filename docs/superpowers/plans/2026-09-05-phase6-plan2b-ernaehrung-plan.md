# Phase 6, Plan 2b – Ernährungsbereich im neuen Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das Ernährungs-Dashboard und die Eintragsliste — inklusive der Barcode-Scan-/Produktsuche-Kette und der Bearbeiten-Flows — verwenden die in Plan 1 gebauten Design-Bausteine (Karte, Buttons, Dialog, Toast) statt der alten unstylisierten Listen, inline umgeschalteten Formulare und `<p role="alert">`-Meldungen.

**Architecture:** Reine Umstellung auf bestehende Bausteine, keine neue Logik. Mahlzeiten-Einträge werden zu Karten; die inline umgeschalteten Formulare für „+ Hinzufügen" (Barcode-Scan/manuelle Eingabe/Menge) und „Bearbeiten" werden zu Dialogen; der Barcode-Scan-Button bleibt die zentrale Aktion, jetzt im neuen Button-Stil (Spec-Vorgabe wörtlich). Anders als im Trainingsbereich bleiben die meisten Schreibfehler in diesem Bereich **inline**, nicht als Toast — weil die betroffenen Formulare in einem offen bleibenden Dialog liegen, und ein Toast hinter einem offenen `<dialog>` unsichtbar ist (siehe Rationale unten, die exakte Lehre aus Plan 2a). Nur der Löschen-Fehler in der Eintragsliste (kein Dialog beteiligt) wird ein Toast.

**Tech Stack:** React 19 + Vite, TypeScript, Tailwind CSS v4, Vitest + Testing Library. Keine neue Abhängigkeit.

**Spec:** `docs/superpowers/specs/2026-09-05-phase6-design-design.md` (Abschnitt „Struktur je Bereich", Ernährungs-Zeile: „Mahlzeiten-Einträge werden Karten statt Listenzeilen. Der Barcode-Scan-Button bleibt die zentrale Aktion, jetzt im neuen Button-Stil." Datei-für-Datei-Umsetzung ist bewusst Aufgabe dieses Plans, exakt wie im Spec selbst festgehalten.)

**Vorgänger:** `docs/superpowers/plans/2026-09-05-phase6-plan1-fundament.md` (gemerged, PR #40) und `docs/superpowers/plans/2026-09-05-phase6-plan2a-training-plan.md` (gemerged, PR #41 — liefert `src/test-render.tsx`s `renderWithProviders`, direkt wiederverwendet, kein neuer Test-Helfer nötig).

**Geschwisterpläne:** Plan 2c (Körper), Plan 2d (Analyse-Seiten) folgen. `CalorieGoalEditor.tsx` gehört zur Profilseite (`ProfilePage.tsx`), nicht zum Ernährungsbereich — bewusst **nicht** Teil dieses Plans, wie auch `ProfilePage` in keinem der vier Bereichs-Pläne vorkommt.

## Global Constraints

- **Keine Drittanbieter-Namen** aus Fitness/Ernährung in Code, Kommentaren, Commit-Messages oder Docs.
- **Karten:** `rounded-3xl`, kein sichtbarer Rahmen. **Buttons/CTAs:** `rounded-2xl`. Exakte Klassen aus `src/lib/ui-classes.ts` (`cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass`) — nicht neu erfinden, importieren.
- **Natives `<dialog>`** über `src/components/Dialog.tsx` für jedes Popup/Sheet in diesem Plan, kein eigenes Modal-System.
- **Karten-in-Liste-Muster** (siehe Rationale): `<li className="block border-b-0">` umschließt `<div className={`${cardClass} w-full`}>` — niemals `cardClass` direkt auf ein `<li>`.
- **Dialog-mit-Formular-Muster** (aus Plan 2a übernommen): `Dialog` hält seine Kinder immer gemountet — der Formular-/Flow-Inhalt wird bedingt auf den Öffnen-Status gerendert (`{open && <Inhalt .../>}`), das `Dialog`-Element selbst bleibt unbedingt gerendert.
- **Schreibfehler bleiben inline, solange der Dialog offen bleibt** (Rationale unten) — nur der Löschen-Fehler in der Eintragsliste (außerhalb jedes Dialogs) wird ein Toast.
- Ein Button je Bildschirm/Formular wird `buttonPrimaryClass` (die eine Hauptaktion dieses Bildschirms — nicht zwingend der ganzen Seite, siehe die aus Plan 2a nachgezogene Präzisierung). Sekundäre/abbrechende Aktionen werden `buttonSecondaryClass`. Kein dritter Button-Stil.
- Bestehende Barrierefreiheits-Konventionen bleiben erhalten: `role="list"` auf echten Listen, 44px Mindest-Tastziel, `label`-Verknüpfung auf jedem Formularfeld.
- `src/index.css` wird von diesem Plan **nicht angefasst** — Körper, Profil und Login migrieren erst in späteren Plänen.
- Nach jedem Task: `npm run lint`, `npx tsc -b --noEmit`, `npm test -- --run` müssen grün sein.
- Commit-Messages auf Deutsch ohne Umlaute, im Stil der bestehenden Historie.

### Rationale: warum Schreibfehler hier inline bleiben, nicht Toast (anders als der Trainingsbereich)

Plan 2a stellte fest, dass ein Toast, der auslöst während ein natives `<dialog>` offen ist, unsichtbar wird: `showModal()` hebt den Dialog und sein `::backdrop` in den Browser-Top-Layer, der über allem anderen liegt, unabhängig von z-index — der Toast liegt im normalen Layer und wird dahinter unlesbar verblasst (siehe `CLAUDE.md`, Abschnitt „Ein Ding, das beim Weiterbauen gilt"). Im Ernährungsbereich bleiben **alle** Formulare, die scheitern können (`AddEntryFlow`, `ManualProductForm`, `FoodEntryEditForm`), absichtlich in einem offenen Dialog stehen, damit der Nutzer die getippten Werte nicht verliert und es erneut versuchen kann — genau das Verhalten, das schon vor diesem Plan bestand und nicht verändert wird. Jede dieser Fehlermeldungen bleibt deshalb inline im Formular selbst, sichtbar innerhalb des offenen Dialogs. Der einzige Fehlerfall ohne Dialog-Beteiligung ist das Löschen eines Eintrags in der Liste (`FoodEntryList`) — der wird ein Toast, exakt wie `TrainingHistoryDetailPage`s „Löschen fehlgeschlagen." in Plan 2a.

### Rationale: warum `<li className="block border-b-0">` statt `cardClass` direkt auf `<li>`

Identisch zu Plan 2a: `src/index.css`s Übergangsregel für `li` (in `@layer base`) setzt `display: flex; justify-content: center; align-items: center; gap: 8px; border-bottom: 1px solid #2e303a`. Keine dieser Eigenschaften wird von `cardClass`s Klassen gesetzt, also gewinnt hier die `@layer base`-Regel mangels Gegner. Der verschachtelte `<div>` trägt die komplette Karten-Optik selbst; das `<li>` bleibt ein reiner, unsichtbarer Semantik-Wrapper.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `src/pages/NutritionPage.tsx` | geändert: `DailySummary` als Karte |
| `src/components/DailySummary.tsx` | geändert: Karten-Wrapper |
| `src/components/ManualProductForm.tsx` | geändert: Karten-Wrapper um die Felder, Buttons |
| `src/components/BarcodeScanner.tsx` | geändert: Abbrechen-Button als Sekundär-Button |
| `src/components/ProductPicker.tsx` | geändert: Barcode-Scan als Primär-Button, Karten-Wrapper, übrige Buttons sekundär |
| `src/components/AddEntryFlow.tsx` | geändert: Karten-Wrapper um das Mengen-Formular, Buttons — **kein** eigener Dialog (der kommt vom aufrufenden Elternteil) |
| `src/pages/NutritionEntriesPage.tsx` | geändert: „+ Hinzufügen" öffnet einen Dialog mit `AddEntryFlow` statt es inline umzuschalten |
| `src/components/FoodEntryList.tsx` | geändert: Einträge als Karten, „Bearbeiten" öffnet einen Dialog mit `FoodEntryEditForm`, Löschen-Fehler über Toast |
| `src/components/FoodEntryEditForm.tsx` | geändert: Karten-Wrapper um die Felder, Buttons — Schreibfehler bleiben inline |
| `docs/domaenenmodell.md` | geprüft, keine Änderung erwartet |
| `CLAUDE.md` | Status nach Abschluss nachgezogen |

---

## Task 1: NutritionPage-Dashboard (DailySummary als Karte)

**Files:**
- Modify: `src/components/DailySummary.tsx`
- Modify: `src/components/DailySummary.test.tsx`

**Interfaces:**
- Consumes: `cardClass` aus `src/lib/ui-classes.ts`

`NutritionPage.tsx` selbst braucht **keine** Änderung — es rendert `DailySummary` bereits als eigenständigen Block, die Karten-Optik entsteht allein durch `DailySummary`s eigenen Wrapper. „Dashboards nur das Wichtigste" gilt weiterhin: die Mahlzeiten-Abschnitts-Übersicht (Links mit Kalorienzahl) bleibt eine schlichte Liste, kein Karten-Umbau — die Spec nennt nur „Mahlzeiten-Einträge" (die tatsächlichen Einträge in Task 8), nicht die Dashboard-Kurzübersicht.

- [ ] **Step 1: Write the failing test**

Read the current `src/components/DailySummary.test.tsx` first. Add this test (adjust the exact existing fixture/import style to match what's already there):

```tsx
it('wraps the summary in the card recipe', () => {
  render(<DailySummary entries={[]} goal={2000} />)
  const heading = screen.getByRole('heading', { name: 'Heute' })
  expect(heading.closest('div')).toHaveClass('bg-surface', 'rounded-3xl', 'p-6')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/DailySummary.test.tsx`
Expected: FAIL — the current wrapper `<div>` has no className.

- [ ] **Step 3: Write the implementation**

In `src/components/DailySummary.tsx`, add the import:

```ts
import { cardClass } from '../lib/ui-classes'
```

Replace:
```tsx
  return (
    <div>
      <h2>Heute</h2>
```
with:
```tsx
  return (
    <div className={cardClass}>
      <h2>Heute</h2>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/components/DailySummary.test.tsx`
Expected: PASS

- [ ] **Step 5: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/components/DailySummary.tsx src/components/DailySummary.test.tsx
git commit -m "feat: Tagesuebersicht als Karte"
```

---

## Task 2: ManualProductForm und BarcodeScanner (Buttons, Karten-Wrapper)

**Files:**
- Modify: `src/components/ManualProductForm.tsx`
- Modify: `src/components/BarcodeScanner.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass`

Beide Komponenten bleiben strukturell unverändert — nur Klassen. Keine Test-Änderung nötig (kein Test prüft aktuell auf Klassennamen, alle bestehenden Assertions bleiben gültig).

- [ ] **Step 1: `ManualProductForm` — Karten-Wrapper und Buttons**

In `src/components/ManualProductForm.tsx`, add the import:

```ts
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
```

Wrap the label fields (everything between `<h2>` and the error paragraph) in a card div. Replace:

```tsx
  return (
    <form onSubmit={handleSubmit}>
      <h2>Neues Produkt (Werte pro 100 g)</h2>
      <label>
        Name
```
with:
```tsx
  return (
    <form onSubmit={handleSubmit}>
      <h2>Neues Produkt (Werte pro 100 g)</h2>
      <div className={cardClass}>
        <label>
          Name
```

And replace the closing of that same block plus the buttons. Replace:
```tsx
        <input type="number" step="any" value={salz} onChange={(event) => setSalz(event.target.value)} />
      </label>

      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        Produkt speichern
      </button>
      <button type="button" onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  )
}
```
with:
```tsx
          <input type="number" step="any" value={salz} onChange={(event) => setSalz(event.target.value)} />
        </label>
      </div>

      {error && <p role="alert">{error}</p>}
      <button type="submit" className={buttonPrimaryClass} disabled={submitting}>
        Produkt speichern
      </button>
      <button type="button" className={buttonSecondaryClass} onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  )
}
```

(Every `<label>` between „Name" and „Salz" gains one level of indentation as a child of the new `<div className={cardClass}>` — no other change to their content.)

- [ ] **Step 2: `BarcodeScanner` — Sekundär-Button**

In `src/components/BarcodeScanner.tsx`, add the import:

```ts
import { buttonSecondaryClass } from '../lib/ui-classes'
```

Replace:
```tsx
      <button type="button" onClick={onClose}>
        Abbrechen
      </button>
```
with:
```tsx
      <button type="button" className={buttonSecondaryClass} onClick={onClose}>
        Abbrechen
      </button>
```

- [ ] **Step 3: Run the full suite**

Run: `npm test -- --run src/components/ManualProductForm.test.tsx src/components/BarcodeScanner.test.tsx`
Expected: PASS — no assertion touches a className, both files' existing tests hold unchanged.

- [ ] **Step 4: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/components/ManualProductForm.tsx src/components/BarcodeScanner.tsx
git commit -m "feat: Produktformular und Scanner mit Karten-Design"
```

---

## Task 3: ProductPicker (Barcode-Scan als Primary-CTA, Karten-Wrapper)

**Files:**
- Modify: `src/components/ProductPicker.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass`

Der Spec-Satz „Der Barcode-Scan-Button bleibt die zentrale Aktion" gilt hier wörtlich: „Barcode scannen" wird der eine `buttonPrimaryClass`-Button des Idle-Bildschirms, „Manuell hinzufügen", „Suchen" (Formular-Submit für die getippte Nummer) und „Abbrechen" werden sekundär. Keine Test-Änderung nötig.

- [ ] **Step 1: Write the implementation**

In `src/components/ProductPicker.tsx`, add the import:

```ts
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
```

Replace the idle-screen return block:

```tsx
  return (
    <div>
      <button type="button" onClick={() => setStep('scanning')}>
        Barcode scannen
      </button>
      <button type="button" onClick={() => setStep('manual-entry')}>
        Manuell hinzufügen
      </button>
      <form onSubmit={handleTypedBarcode}>
        <label>
          Barcode-Nummer eingeben
          <input
            inputMode="numeric"
            value={typedBarcode}
            onChange={(event) => setTypedBarcode(event.target.value)}
            placeholder="z. B. 8076809580144"
          />
        </label>
        <button type="submit">Suchen</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={onCancel}>
        Abbrechen
      </button>
    </div>
  )
}
```

with:

```tsx
  return (
    <div className={cardClass}>
      <button type="button" className={buttonPrimaryClass} onClick={() => setStep('scanning')}>
        Barcode scannen
      </button>
      <button type="button" className={buttonSecondaryClass} onClick={() => setStep('manual-entry')}>
        Manuell hinzufügen
      </button>
      <form onSubmit={handleTypedBarcode}>
        <label>
          Barcode-Nummer eingeben
          <input
            inputMode="numeric"
            value={typedBarcode}
            onChange={(event) => setTypedBarcode(event.target.value)}
            placeholder="z. B. 8076809580144"
          />
        </label>
        <button type="submit" className={buttonSecondaryClass}>
          Suchen
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <button type="button" className={buttonSecondaryClass} onClick={onCancel}>
        Abbrechen
      </button>
    </div>
  )
}
```

The `manual-entry` branch's stray `{error && <p role="alert">{error}</p>}` above `ManualProductForm` stays exactly as is — `ManualProductForm` carries its own card wrapper from Task 2, nesting one more card here would double the padding.

- [ ] **Step 2: Run the full suite**

Run: `npm test -- --run src/components/ProductPicker.test.tsx`
Expected: PASS — no assertion touches a className.

- [ ] **Step 3: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/components/ProductPicker.tsx
git commit -m "feat: Produktsuche mit Barcode-Scan als Hauptaktion"
```

---

## Task 4: AddEntryFlow (Karten-Wrapper, Buttons — kein eigener Dialog)

**Files:**
- Modify: `src/components/AddEntryFlow.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass`

`AddEntryFlow` bekommt **keinen** eigenen `Dialog` — es wird in Task 5 vom aufrufenden `NutritionEntriesPage` in einen Dialog gerendert, exakt wie `NewExerciseForm` in Plan 1s `ExercisesPage` vom Elternteil in einen Dialog gerendert wurde, nicht von sich selbst. Nur die Mengen-Bestätigung (nachdem ein Produkt gewählt wurde) bekommt hier die Karten-/Button-Behandlung; `ProductPicker` (Task 3) trägt seine eigene bereits.

- [ ] **Step 1: Write the implementation**

In `src/components/AddEntryFlow.tsx`, add the import:

```ts
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
```

Replace the quantity-confirmation return block:

```tsx
  return (
    <form onSubmit={handleConfirmQuantity}>
      <p>{product.name}</p>
      <label>
        Menge (g)
        <input type="number" step="any" value={menge} onChange={(event) => setMenge(event.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Hinzufügen</button>
      <button type="button" onClick={reset}>
        Abbrechen
      </button>
    </form>
  )
}
```

with:

```tsx
  return (
    <form onSubmit={handleConfirmQuantity}>
      <div className={cardClass}>
        <p>{product.name}</p>
        <label>
          Menge (g)
          <input type="number" step="any" value={menge} onChange={(event) => setMenge(event.target.value)} />
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className={buttonPrimaryClass}>
        Hinzufügen
      </button>
      <button type="button" className={buttonSecondaryClass} onClick={reset}>
        Abbrechen
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Run the full suite**

Run: `npm test -- --run src/components/AddEntryFlow.test.tsx`
Expected: PASS — including `'shows an error and keeps the confirm form when adding fails'`, unchanged: the error stays inline, `reset()` is never called on a rejected `onAdd`, so the form (and, once Task 5 wraps this in a Dialog, the Dialog itself) stays open.

- [ ] **Step 3: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/components/AddEntryFlow.tsx
git commit -m "feat: Mengen-Bestaetigung als Karte mit Primary-Button"
```

---

## Task 5: NutritionEntriesPage — „+ Hinzufügen" als Dialog

**Files:**
- Modify: `src/pages/NutritionEntriesPage.tsx`
- Modify: `src/pages/NutritionEntriesPage.test.tsx`

**Interfaces:**
- Consumes: `buttonPrimaryClass` aus `src/lib/ui-classes.ts`; `Dialog` (default export, `{open, onClose, children}`) aus `src/components/Dialog.tsx`; `AddEntryFlow` (unverändertes Interface aus Task 4)

Jeder Mahlzeiten-Abschnitt bekommt seinen eigenen Dialog (analog zu Plan 2as `TrainingPlanEditPage`, wo jeder Tag seinen eigenen Übungssuche-Dialog bekam) — `SectionBlock`s bisheriges `adding`-Flag steuert jetzt einen Dialog statt eines Inline-Umschalters. Der `Dialog`-mit-Formular-Fix gilt auch hier: `AddEntryFlow` trägt eigenen `useState` (Produkt, Menge, Fehler), muss also bedingt auf den Öffnen-Status gerendert werden, sonst zeigt ein wiedereröffneter Dialog die Werte des letzten Versuchs.

- [ ] **Step 1: Update the test file for the dialog flow**

Read the current `src/pages/NutritionEntriesPage.test.tsx` in full first (it already scopes its assertions per section via `within()`, since every section has its own „+ Hinzufügen" button — that scoping stays exactly as it is). No test needs a *new* click to "open a dialog first", because clicking „+ Hinzufügen" already is that click — the existing tests already click it before looking for `Barcode-Nummer eingeben`, so their sequence needs **no change**. Only add one new test verifying the dialog closes on cancel and reopens blank (mirroring Plan 2as conditional-render regression coverage):

```tsx
  it('resets the capture flow on reopen instead of showing the last attempt', async () => {
    await renderPage(entriesResult({ entries: [] }))

    const fruehstueckHeading = screen.getByRole('heading', { name: /Frühstück/ })
    const fruehstueckSection = fruehstueckHeading.closest('section')
    expect(fruehstueckSection).not.toBeNull()
    const section = within(fruehstueckSection as HTMLElement)

    fireEvent.click(section.getByRole('button', { name: '+ Hinzufügen' }))
    fireEvent.change(section.getByLabelText('Barcode-Nummer eingeben'), { target: { value: '123' } })
    // '123' is not a valid barcode length — this leaves an inline error and no lookup call.
    fireEvent.click(section.getByRole('button', { name: 'Suchen' }))
    expect(section.getByRole('alert')).toHaveTextContent('8–14 Ziffern')

    // The dialog's own close button (Dialog.tsx's built-in "Schließen", not
    // AddEntryFlow's inner "Abbrechen" — that only resets the picker's own
    // state without closing the dialog) actually dismisses it, so reopening
    // must not show the stale error or the stale digits.
    fireEvent.click(section.getByRole('button', { name: 'Schließen' }))
    expect(section.queryByLabelText('Barcode-Nummer eingeben')).not.toBeInTheDocument()

    fireEvent.click(section.getByRole('button', { name: '+ Hinzufügen' }))
    expect(section.queryByRole('alert')).not.toBeInTheDocument()
    expect(section.getByLabelText('Barcode-Nummer eingeben')).toHaveValue('')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/NutritionEntriesPage.test.tsx`
Expected: FAIL — the new test (dialog conditional-render behavior does not exist yet); every other existing test still PASSes (the render-and-click sequence is unchanged, only the underlying markup will change in Step 3).

- [ ] **Step 3: Write the implementation**

In `src/pages/NutritionEntriesPage.tsx`, add the imports:

```ts
import { buttonPrimaryClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
```

Replace the `SectionBlock` function:

```tsx
function SectionBlock({
  slot,
  name,
  entries,
  userId,
  assignable,
  addEntry,
  updateEntry,
  deleteEntry,
}: {
  slot: number | null
  name: string
  entries: FoodEntry[]
  userId: string
  assignable: MealSection[]
  addEntry: (productId: string, menge: number, mahlzeit: number | null) => Promise<void>
  updateEntry: (entryId: string, patch: EntryPatch) => Promise<void>
  deleteEntry: (entryId: string) => Promise<void>
}) {
  // Collapsed by default: with up to six sections, an always-open capture flow
  // in each one stacks that many full forms (barcode input, manual entry, …)
  // on screen at once. One local flag per section is all this needs.
  const [adding, setAdding] = useState(false)

  return (
    <section>
      <h2>{`${name} — ${Math.round(sumKalorien(entries))} kcal`}</h2>
      <FoodEntryList
        entries={entries}
        userId={userId}
        sections={assignable}
        onUpdateEntry={updateEntry}
        onDelete={deleteEntry}
      />
      {/* No add button for the unassigned group — nothing new belongs there. */}
      {slot !== null &&
        (adding ? (
          <AddEntryFlow
            onAdd={async (productId, menge) => {
              await addEntry(productId, menge, slot)
              setAdding(false)
            }}
          />
        ) : (
          <button type="button" onClick={() => setAdding(true)}>
            + Hinzufügen
          </button>
        ))}
    </section>
  )
}
```

with:

```tsx
function SectionBlock({
  slot,
  name,
  entries,
  userId,
  assignable,
  addEntry,
  updateEntry,
  deleteEntry,
}: {
  slot: number | null
  name: string
  entries: FoodEntry[]
  userId: string
  assignable: MealSection[]
  addEntry: (productId: string, menge: number, mahlzeit: number | null) => Promise<void>
  updateEntry: (entryId: string, patch: EntryPatch) => Promise<void>
  deleteEntry: (entryId: string) => Promise<void>
}) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <section>
      <h2>{`${name} — ${Math.round(sumKalorien(entries))} kcal`}</h2>
      <FoodEntryList
        entries={entries}
        userId={userId}
        sections={assignable}
        onUpdateEntry={updateEntry}
        onDelete={deleteEntry}
      />
      {/* No add button for the unassigned group — nothing new belongs there. */}
      {slot !== null && (
        <>
          <button type="button" className={buttonPrimaryClass} onClick={() => setDialogOpen(true)}>
            + Hinzufügen
          </button>
          {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
              rendering AddEntryFlow only while open resets its product/quantity/error
              state each time it opens, instead of showing the last attempt's leftovers. */}
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            {dialogOpen && (
              <AddEntryFlow
                onAdd={async (productId, menge) => {
                  await addEntry(productId, menge, slot)
                  setDialogOpen(false)
                }}
              />
            )}
          </Dialog>
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/NutritionEntriesPage.test.tsx`
Expected: PASS — all existing tests plus the new one.

- [ ] **Step 5: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/pages/NutritionEntriesPage.tsx src/pages/NutritionEntriesPage.test.tsx
git commit -m "feat: Eintrag-hinzufuegen als Dialog je Mahlzeiten-Abschnitt"
```

---

## Task 6: FoodEntryList und FoodEntryEditForm (Karten, Bearbeiten als Dialog, Löschen über Toast)

**Files:**
- Modify: `src/components/FoodEntryList.tsx`
- Modify: `src/components/FoodEntryList.test.tsx`
- Modify: `src/components/FoodEntryEditForm.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonSecondaryClass`; `Dialog`; `useToast` aus `src/components/ToastProvider.tsx`; `renderWithProviders` aus `src/test-render.tsx`

Jeder Eintrag wird eine Karte (Spec: „Mahlzeiten-Einträge werden Karten statt Listenzeilen" — der wörtliche Auftrag dieses Plans). „Bearbeiten" öffnet `FoodEntryEditForm` in einem Dialog (derselbe bedingte-Rendering-Fix wie überall). Der Löschen-Fehler ist der **einzige** Fehlerfall in diesem Bereich ohne Dialog-Beteiligung — er wird ein Toast, exakt wie in Plan 2as `TrainingHistoryDetailPage`.

- [ ] **Step 1: Update the test file's render helper and add a reset-on-reopen test**

Read the current `src/components/FoodEntryList.test.tsx` in full. Replace:
```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
```
with:
```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-render'
```

Every `render(<FoodEntryList .../>)` call becomes `renderWithProviders(<FoodEntryList .../>)` (five occurrences — the props passed stay identical, only the render call changes).

The existing test `'opens the edit form on request and closes it again'` already asserts the field is gone after „Abbrechen" — this already covers the conditional-render requirement for this dialog (unlike Plan 2a, no separate new test is needed here, since this exact assertion already exists). The existing test `'shows a visible warning when the delete is rejected'` still asserts `screen.getByRole('alert')` — unchanged, since `ToastProvider`'s toast also carries `role="alert"`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/components/FoodEntryList.test.tsx`
Expected: PASS still (the render-helper swap alone is behavior-neutral before Step 3 changes the implementation).

- [ ] **Step 3: Write the `FoodEntryList` implementation**

In `src/components/FoodEntryList.tsx`, add the imports:

```ts
import { cardClass, buttonSecondaryClass } from '../lib/ui-classes'
import Dialog from './Dialog'
import { useToast } from './ToastProvider'
```

Replace the whole file's `FoodEntryList` and `FoodEntryRow` functions:

```tsx
export default function FoodEntryList({ entries, userId, sections, onUpdateEntry, onDelete }: Props) {
  if (entries.length === 0) {
    return <p>Noch keine Einträge heute.</p>
  }

  return (
    <ul role="list" className="space-y-4">
      {entries.map((entry) => (
        <FoodEntryRow
          key={entry.id}
          entry={entry}
          userId={userId}
          sections={sections}
          onUpdateEntry={onUpdateEntry}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

function FoodEntryRow({
  entry,
  userId,
  sections,
  onUpdateEntry,
  onDelete,
}: { entry: FoodEntry } & Pick<Props, 'userId' | 'sections' | 'onUpdateEntry' | 'onDelete'>) {
  const [editing, setEditing] = useState(false)
  const showToast = useToast()
  const label = entry.products?.name ?? 'Unbekanntes Produkt'
  const kalorien = entry.products ? Math.round((entry.products.kalorien * entry.menge) / 100) : null

  return (
    <li className="block border-b-0">
      <div className={`${cardClass} w-full`}>
        <span>{label}</span>
        {/* One template string per span: `{value} g` renders two text nodes and
            getByText(/150 g/) would not match across them. */}
        <span>{`${entry.menge} g`}</span>
        {kalorien != null && <span>{`${kalorien} kcal`}</span>}
        <button type="button" className={buttonSecondaryClass} onClick={() => setEditing(true)}>
          Bearbeiten
        </button>
        <button
          type="button"
          className={buttonSecondaryClass}
          onClick={() => {
            onDelete(entry.id).catch(() => showToast('Eintrag konnte nicht gelöscht werden.', 'error'))
          }}
        >
          Löschen
        </button>
      </div>
      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the edit form only while open resets its draft state each
          time it opens, instead of showing the last attempt's leftover values. */}
      <Dialog open={editing} onClose={() => setEditing(false)}>
        {editing && (
          <FoodEntryEditForm
            entry={entry}
            userId={userId}
            sections={sections}
            onSave={onUpdateEntry}
            onClose={() => setEditing(false)}
          />
        )}
      </Dialog>
    </li>
  )
}
```

Add `import { useState } from 'react'` if not already present (the file did not need it before — `editing`/`failed` were both already `useState`, so it should already be imported; verify and add only if missing). Note `failed` is removed: the delete failure now reports via `showToast`, not a local `<span role="alert">`, so that state is gone along with its old JSX.

- [ ] **Step 4: Write the `FoodEntryEditForm` implementation — card wrapper and buttons only, errors stay inline**

In `src/components/FoodEntryEditForm.tsx`, add the import:

```ts
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
```

Wrap the form's own fields (everything from the „Menge (g)" label through the nutrients `<fieldset>`) in a card div, and style the buttons. Replace:

```tsx
  return (
    <form onSubmit={handleSubmit}>
      <label>
        Menge (g)
```
with:
```tsx
  return (
    <form onSubmit={handleSubmit}>
      <div className={cardClass}>
        <label>
          Menge (g)
```

Every line from the „Menge (g)" label through the closing `</fieldset>` (the whole block already shown in full in the current file) gains one level of indentation as a child of the new wrapper div — no other content change. Then replace the closing and the buttons:

```tsx
        </fieldset>
      )}

      {error && <p role="alert">{error}</p>}
      <button type="submit">Speichern</button>
      <button type="button" onClick={onClose}>
        Abbrechen
      </button>
    </form>
  )
}
```
with:
```tsx
          </fieldset>
        )}
      </div>

      {error && <p role="alert">{error}</p>}
      <button type="submit" className={buttonPrimaryClass}>
        Speichern
      </button>
      <button type="button" className={buttonSecondaryClass} onClick={onClose}>
        Abbrechen
      </button>
    </form>
  )
}
```

Also style the „Anderes Produkt wählen" button (secondary, it is not this form's main action):

Replace:
```tsx
      <button type="button" onClick={() => setPicking(true)}>
        Anderes Produkt wählen
      </button>
```
with:
```tsx
      <button type="button" className={buttonSecondaryClass} onClick={() => setPicking(true)}>
        Anderes Produkt wählen
      </button>
```

The `picking` branch (`if (picking) return <ProductPicker .../>`) stays completely unchanged — it already returns early with `ProductPicker`, which carries its own card/button styling from Task 3. No nested `Dialog`: the product swap replaces this form's content within the same already-open dialog, exactly as it does today.

- [ ] **Step 5: Run the full suite**

Run: `npm test -- --run src/components/FoodEntryList.test.tsx src/components/FoodEntryEditForm.test.tsx src/pages/NutritionEntriesPage.test.tsx`
Expected: PASS — all tests, including the delete-failure test now backed by a toast.

- [ ] **Step 6: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/components/FoodEntryList.tsx src/components/FoodEntryList.test.tsx src/components/FoodEntryEditForm.tsx
git commit -m "feat: Eintraege als Karten, Bearbeiten als Dialog, Loeschen ueber Toast"
```

---

## Task 7: Abschluss — Gesamtlauf, Bundle, manueller Browser-Check, Doku

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

Zahlen wörtlich übernehmen — inklusive der Erinnerung, dass ein Worktree ohne `.env` einen nicht vergleichbaren, zu kleinen Wert liefert (fehlendes Barcode-Scanner-Subsystem im Entry-Chunk — siehe Plan 1/2a).

- [ ] **Step 2: Domänenmodell prüfen**

`docs/domaenenmodell.md` prüfen — dieser Plan ändert keine Tabelle, keine Spalte, keine Abfrage-Form, nur Markup und Klassen. Keine Änderung vornehmen, falls das stimmt.

- [ ] **Step 3: Manueller Browser-Check**

**Warum zwingend:** jeder Test in diesem Plan prüft Verhalten oder Klassenname-Strings, keiner rendert echtes Layout — genau die Lücke, die Plan 2as Whole-Branch-Review beim Toast-hinter-Dialog-Fund ausnutzte. `npm run dev` starten (temporäre, nicht committete `.env` mit Platzhalter-Werten reicht, siehe Vorgehen aus Plan 1/2a). Durchklicken und bestätigen:

1. `/nutrition`: „Heute"-Zusammenfassung erscheint als eigene abgerundete Karte ohne sichtbaren Rahmen.
2. `/nutrition/entries`: jeder Eintrag erscheint als eigene Karte; „+ Hinzufügen" öffnet einen **zentrierten** Dialog mit verschwommenem Hintergrund (nicht oben links angepinnt — die Plan-1-Regression, hier gezielt gegenprüfen).
3. Im geöffneten Dialog: „Barcode scannen" ist der volle lila Hauptbutton, „Manuell hinzufügen"/„Suchen"/„Abbrechen" sind unauffällige Sekundärbuttons.
4. Eine ungültige Barcode-Nummer eintippen (z. B. „123") → die Fehlermeldung erscheint **innerhalb des offenen Dialogs**, lesbar, nicht durch den Backdrop verdunkelt (die exakte Lehre aus Plan 2as Critical-Fund — hier gezielt gegenprüfen, da dieser Plan densselben Dialog-mit-Formular-Fehlerfall mehrfach hat).
5. Dialog schließen und erneut öffnen: leeres Formular, keine alten Werte oder Fehler aus dem letzten Versuch.
6. „Bearbeiten" an einem Eintrag öffnet ebenfalls einen zentrierten Dialog mit dem Formular als Karte; „Speichern" ist der Hauptbutton.
7. Absichtlich einen fehlschlagenden Löschversuch auslösen (z. B. Netzwerk kurz trennen und „Löschen" klicken): eine Toast-Meldung erscheint oben (außerhalb jedes Dialogs, also tatsächlich sichtbar) und verschwindet nach wenigen Sekunden von selbst.
8. Konsole ohne Fehler oder Warnungen auf jeder besuchten Seite.

Alle acht Punkte im Abschlussbericht festhalten. Falls einer fehlschlägt: Fund ins Ledger, ein Fix, ein Scoped-Re-Review, erneut visuell bestätigen — derselbe Ablauf wie in Plan 1/2a.

- [ ] **Step 4: Vollständige Prüfung**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
npm run build
```

- [ ] **Step 5: Status in CLAUDE.md nachziehen**

Im Abschnitt „Phase 6" festhalten: Plan 2b (Ernährung) umgesetzt — Dashboard, Eintragsliste, Barcode-/Produktsuche-Kette und Bearbeiten-Flow auf Karten/Buttons/Dialog/Toast umgestellt, Testzahl und Bundle-Zahl, Ergebnis des manuellen Browser-Checks. Offen: Plan 2c (Körper), 2d (Analyse-Seiten).

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Status fuer Phase 6 Plan 2b nachziehen"
```

---

## Self-Review

**Spec-Abdeckung.** „Mahlzeiten-Einträge werden Karten statt Listenzeilen" → Task 6. „Der Barcode-Scan-Button bleibt die zentrale Aktion, jetzt im neuen Button-Stil" → Task 3. Die Dashboard-Zusammenfassung (Task 1) und die restlichen Formulare/Flows (Task 2, 4, 5) verbrauchen die Plan-1-Bausteine konsequent, auch wo der Spec-Satz sie nicht wörtlich nennt — analog zu Plan 2as Umgang mit „Übungen als Karten", das ebenfalls über die Listenzeilen hinaus auf Formular-Flows angewendet wurde.

**Dialog-mit-Formular-Muster durchgängig geprüft:** Task 5 (`AddEntryFlow` in `SectionBlock`) und Task 6 (`FoodEntryEditForm` in `FoodEntryRow`) rendern ihren Formular-Inhalt beide bedingt auf den Öffnen-Status, das `Dialog`-Element selbst bleibt unbedingt gerendert — identisch zum in Plan 2a etablierten Muster.

**Inline-vs-Toast-Regel für diesen Bereich:** anders als der Trainingsbereich, wo die meisten Schreibfehler zu Toast wurden, bleiben hier **alle** Formular-Schreibfehler inline (`AddEntryFlow`, `ManualProductForm`, `FoodEntryEditForm` — jedes davon liegt in einem Dialog, der bei einem Fehler offen bleibt) — nur der dialogfreie Löschen-Fehler in `FoodEntryList` wird ein Toast. Durchgängig in Task 4, 6 und der Rationale oben begründet und geprüft, keine widersprüchliche Stelle gefunden.

**Typkonsistenz.** Keine der geänderten Komponenten ändert ihr Props-Interface — `AddEntryFlow`s `onAdd`, `FoodEntryEditForm`s `onSave`/`onClose`, `FoodEntryList`s `onUpdateEntry`/`onDelete` bleiben exakt wie vorher, nur die aufrufende Stelle (`SectionBlock`, `FoodEntryRow`) verpackt sie neu in einen Dialog. Gegen die tatsächlichen Dateien gelesen (nicht gegen Vermutung), inklusive der Bestätigung, dass `CalorieGoalEditor` nirgends in diesem Bereich vorkommt (gehört zu `ProfilePage`, bewusst außerhalb).

**Platzhalter-Durchgang.** Kein „TBD", kein „analog zu Task N" ohne ausgeschriebenen Code — jede Task-Datei zeigt entweder die volle neue Funktion oder einen exakten Vorher/Nachher-Ersetzungsblock.

**Bewusst offen gelassen für diesen Plan:** kein Bestätigungs-Dialog vor „Löschen" (identisch zur Entscheidung in Plan 2a — widerspräche der zweimal dokumentierten Projekt-Konvention). Die Mahlzeiten-Abschnitts-Kurzübersicht auf dem Dashboard bleibt unstyled (Dashboards nur das Wichtigste). `ProfilePage.tsx`/`CalorieGoalEditor.tsx` bleiben vollständig außerhalb, wie in jedem der vier Bereichs-Pläne.

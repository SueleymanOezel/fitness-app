# Phase 6, Plan 2c – Körperbereich im neuen Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das Körper-Dashboard, die Verlaufsliste und die Foto-Zeitleiste verwenden die in Plan 1 gebauten Design-Bausteine (Karte, Buttons, Dialog, Toast) statt der alten unstylisierten Listen und `<p role="alert">`-Meldungen.

**Architecture:** Reine Umstellung auf bestehende Bausteine, keine neue Logik. Die sieben Messwerte im Dashboard werden zu einer 2-spaltigen Karten-Grid (Spec-Vorgabe wörtlich). Die Verlaufsliste bekommt Karten-in-Liste-Zeilen; das bisher inline umgeschaltete Korrektur-Formular (`editingId`) wird ein einzelner, geteilter Dialog statt eines Formulars pro Zeile — `editingId` erlaubt ohnehin immer nur eine offene Bearbeitung gleichzeitig, ein Dialog je Zeile wäre unnötige Vervielfachung. Das Dashboard-Formular „Heute eintragen" wird ebenfalls ein Dialog. `BodyEntryForm` (von beiden Dialogen geteilt) bekommt Karten-/Button-Klassen, bleibt sonst unverändert. Fotoseite bekommt Karten für Formularfeld und Einträge.

**Tech Stack:** React 19 + Vite, TypeScript, Tailwind CSS v4, Vitest + Testing Library. Keine neue Abhängigkeit.

**Spec:** `docs/superpowers/specs/2026-09-05-phase6-design-design.md` (Abschnitt „Struktur je Bereich", Körper-Zeile: „die sieben Messwerte werden zu einer 2-spaltigen Karten-Grid (analog Glucose/Pills/Activity/Carbs im Referenzvideo) statt der aktuellen langen `<ul>`-Liste." Datei-für-Datei-Umsetzung ist bewusst Aufgabe dieses Plans, exakt wie im Spec selbst festgehalten — die Verlaufsliste und die Fotoseite bekommen dieselbe Behandlung wie schon in Plan 2a/2b Bereiche, die der Spec-Satz nicht wörtlich nennt, siehe Self-Review.)

**Vorgänger:** `docs/superpowers/plans/2026-09-05-phase6-plan1-fundament.md` (gemerged, PR #40) und `docs/superpowers/plans/2026-09-05-phase6-plan2a-training-plan.md` (gemerged, PR #41 — liefert `src/test-render.tsx`s `renderWithProviders`, direkt wiederverwendet, kein neuer Test-Helfer nötig).

**Geschwisterpläne:** Plan 2b (Ernährung, gemerged PR #42), Plan 2d (Analyse-Seiten, folgt). `ProfilePage.tsx` gehört zu keinem der vier Bereichs-Pläne, bewusst **nicht** Teil dieses Plans.

## Global Constraints

- **Keine Drittanbieter-Namen** aus Fitness/Ernährung in Code, Kommentaren, Commit-Messages oder Docs.
- **Karten:** `rounded-3xl`, kein sichtbarer Rahmen. **Buttons/CTAs:** `rounded-2xl`. Exakte Klassen aus `src/lib/ui-classes.ts` (`cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass`) — nicht neu erfinden, importieren.
- **Natives `<dialog>`** über `src/components/Dialog.tsx` für jedes Popup/Sheet in diesem Plan, kein eigenes Modal-System.
- **Karten-in-Liste-Muster** (siehe Rationale): `<li className="block border-b-0">` umschließt `<div className={`${cardClass} w-full`}>` — niemals `cardClass` direkt auf ein `<li>`. Gilt auch für die 2-spaltige Messwerte-Grid: das `<ul>` trägt `grid grid-cols-2 gap-4`, jedes `<li>` bleibt der reine, unsichtbare Semantik-Wrapper.
- **Dialog-mit-Formular-Muster** (aus Plan 2a/2b übernommen): `Dialog` hält seine Kinder immer gemountet — der Formular-Inhalt wird bedingt auf den Öffnen-Status gerendert (`{open && <Inhalt .../>}`), das `Dialog`-Element selbst bleibt unbedingt gerendert.
- **Schreibfehler-Regel für diesen Bereich** (Rationale unten): der reale Schreibfehler (Formular bleibt offen) bleibt inline in `BodyEntryForm`. Die `ProfileWeightSyncError`-bedingten Stale-Mirror-Hinweise sowie jeder Fehler ohne Dialog-Beteiligung (Löschen in der Verlaufsliste, Hochladen/Löschen bei Fotos) werden ein Toast.
- Ein Button je Bildschirm/Formular wird `buttonPrimaryClass` (die eine Hauptaktion), sekundäre/löschende Aktionen werden `buttonSecondaryClass`. Kein dritter Button-Stil. Nicht jede Seite braucht einen Primary-Button — die Verlaufsliste und die Fotoseite haben keine einzelne Hauptaktion und bekommen keinen.
- Bestehende Barrierefreiheits-Konventionen bleiben erhalten: `role="list"` auf echten Listen, 44px Mindest-Tastziel, `label`-Verknüpfung auf jedem Formularfeld.
- `src/index.css` wird von diesem Plan **nicht angefasst** — Profil und Login migrieren erst in späteren Plänen.
- Nach jedem Task: `npm run lint`, `npx tsc -b --noEmit`, `npm test -- --run` müssen grün sein.
- Commit-Messages auf Deutsch ohne Umlaute, im Stil der bestehenden Historie.

### Rationale: warum die Stale-Mirror-Hinweise hier Toast werden, nicht inline (Unterschied zu Plan 2b)

Plan 2b hielt fest: jeder Fehler, der auftreten kann, während ein Dialog offen bleibt, gehört inline in den Dialog-Inhalt, nicht in einen Toast (`showModal()` hebt den Dialog in den Browser-Top-Layer, ein Toast dahinter wird unsichtbar). Diese Regel gilt hier unverändert für den **echten** Schreibfehler: `BodyEntryForm`s `onSave` wirft dann weiter, das Formular bleibt offen, `BodyEntryForm`s eigener inline-`<p role="alert">` zeigt die Meldung — exakt das bestehende, unveränderte Verhalten.

Die `ProfileWeightSyncError`-Fälle liegen anders: `body_metrics` wurde bereits erfolgreich geschrieben bzw. gelöscht, nur der `profiles.aktuelles_gewicht`-Spiegel ist fehlgeschlagen. Die aufrufende Seite fängt diesen Fehlertyp ab und gibt `onSave`/die Löschfunktion **ohne erneuten Wurf** zurück — aus Sicht von `BodyEntryForm`/der Verlaufsliste war die Aktion ein Erfolg, das Formular schließt sich bzw. der Eintrag verschwindet sofort. Der Hinweis erscheint deshalb immer erst, **nachdem** der Dialog schon zu ist (oder, beim Löschen, ohne dass je ein Dialog beteiligt war) — er ist kurzlebiges Feedback auf eine bereits abgeschlossene Aktion, nicht eine blockierende Formularmeldung. Genau das ist der Toast-Anwendungsfall aus `ToastProvider.tsx`s eigenem Doc-Kommentar. Der Löschen-Fehler in der Verlaufsliste sowie Hochladen/Löschen bei Fotos sind ohnehin nie in einem Dialog verortet (kein Rückfragen-Dialog vor dem Löschen, Projekt-Konvention) und werden aus demselben Grund wie in Plan 2a/2b ein Toast.

### Rationale: warum `<li className="block border-b-0">` statt `cardClass` direkt auf `<li>`

Identisch zu Plan 2a/2b: `src/index.css`s Übergangsregel für `li` (in `@layer base`) setzt `display: flex; justify-content: center; align-items: center; gap: 8px; border-bottom: 1px solid #2e303a`. Keine dieser Eigenschaften wird von `cardClass`s Klassen gesetzt, also gewinnt hier die `@layer base`-Regel mangels Gegner. Der verschachtelte `<div>` trägt die komplette Karten-Optik selbst; das `<li>` bleibt ein reiner, unsichtbarer Semantik-Wrapper — `block` hebt `display: flex` auf, `border-b-0` entfernt den Rahmen explizit. Für die Messwerte-Grid gilt dasselbe: das `<ul>` trägt `grid grid-cols-2 gap-4`, ein block-level `<li>`-Kind eines Grid-Containers wird trotzdem automatisch zum Grid-Item — `display: block` steht dem nicht im Weg.

---

## File Structure

| Datei | Verantwortung |
|---|---|
| `src/components/BodyEntryForm.tsx` | geändert: Karten-Wrapper um die Felder, Buttons |
| `src/pages/BodyPage.tsx` | geändert: 2-spaltige Karten-Grid für die Messwerte, „Heute eintragen" als Dialog, Stale-Mirror-Hinweis als Toast |
| `src/pages/BodyPage.test.tsx` | geändert: `renderWithProviders`, neuer Reset-bei-Wiedereröffnen-Test |
| `src/pages/BodyEntriesPage.tsx` | geändert: Einträge als Karten, „Bearbeiten" als ein geteilter Dialog, Löschen-/Stale-Mirror-Fehler als Toast |
| `src/pages/BodyEntriesPage.test.tsx` | geändert: `renderWithProviders`, neuer Reset-bei-Wiedereröffnen-Test |
| `src/pages/BodyPhotosPage.tsx` | geändert: Formularfeld-Karte, Foto-Einträge als Karten, Buttons, Upload-/Löschen-Fehler als Toast |
| `src/pages/BodyPhotosPage.test.tsx` | geändert: `renderWithProviders` |
| `docs/domaenenmodell.md` | geprüft, keine Änderung erwartet |
| `CLAUDE.md` | Status nach Abschluss nachgezogen |

---

## Task 1: BodyEntryForm (Karten-Wrapper, Buttons)

**Files:**
- Modify: `src/components/BodyEntryForm.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass` aus `src/lib/ui-classes.ts`

`BodyEntryForm` ist von beiden Dialogen (Dashboard, Verlaufsliste) geteilt — eine Änderung hier wirkt in Task 2 und 3 mit. Keine Test-Änderung nötig: `src/components/BodyEntryForm.test.tsx` prüft aktuell keinen Klassennamen (verifiziert vor Planerstellung), alle bestehenden Assertions bleiben gültig.

- [ ] **Step 1: Write the implementation**

In `src/components/BodyEntryForm.tsx`, add the import:

```ts
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
```

Replace the return block:

```tsx
  return (
    <form onSubmit={handleSubmit}>
      <label>
        Datum
        <input
          type="date"
          value={datum}
          // A future date — or 0007-08-24 from a mistyped year — would sort to
          // the top of the history and hold profiles.aktuelles_gewicht there.
          max={today()}
          onChange={(event) => setDatum(event.target.value)}
        />
      </label>
      {MEASUREMENT_FIELDS.map((field) => (
        <label key={field}>
          {FIELD_LABELS[field]}
          <input
            type="number"
            // Every one of these columns is numeric: without step="any" the
            // browser rejects 82,5 and aborts the submit before we see it.
            step="any"
            value={draft[field]}
            onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
          />
        </label>
      ))}
      {error !== '' && <p role="alert">{error}</p>}
      <button type="submit" disabled={saving}>
        Speichern
      </button>
      <button type="button" onClick={onClose}>
        Abbrechen
      </button>
    </form>
  )
}
```

with:

```tsx
  return (
    <form onSubmit={handleSubmit}>
      <div className={cardClass}>
        <label>
          Datum
          <input
            type="date"
            value={datum}
            // A future date — or 0007-08-24 from a mistyped year — would sort to
            // the top of the history and hold profiles.aktuelles_gewicht there.
            max={today()}
            onChange={(event) => setDatum(event.target.value)}
          />
        </label>
        {MEASUREMENT_FIELDS.map((field) => (
          <label key={field}>
            {FIELD_LABELS[field]}
            <input
              type="number"
              // Every one of these columns is numeric: without step="any" the
              // browser rejects 82,5 and aborts the submit before we see it.
              step="any"
              value={draft[field]}
              onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}
            />
          </label>
        ))}
      </div>
      {error !== '' && <p role="alert">{error}</p>}
      <button type="submit" className={buttonPrimaryClass} disabled={saving}>
        Speichern
      </button>
      <button type="button" className={buttonSecondaryClass} onClick={onClose}>
        Abbrechen
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Run the full suite**

Run: `npm test -- --run src/components/BodyEntryForm.test.tsx`
Expected: PASS — no assertion touches a className.

- [ ] **Step 3: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/components/BodyEntryForm.tsx
git commit -m "feat: Koerper-Eintragsformular mit Karten-Design"
```

---

## Task 2: BodyPage (Dashboard — 2-spaltige Karten-Grid, Dialog)

**Files:**
- Modify: `src/pages/BodyPage.tsx`
- Modify: `src/pages/BodyPage.test.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonPrimaryClass` aus `src/lib/ui-classes.ts`; `Dialog` (default export, `{open, onClose, children}`) aus `src/components/Dialog.tsx`; `useToast` aus `src/components/ToastProvider.tsx`; `BodyEntryForm` (unverändertes Interface aus Task 1)

Die Spec nennt diesen Umbau wörtlich: die sieben Messwerte werden zu einer 2-spaltigen Karten-Grid. „Heute eintragen" wird ein Dialog statt eines inline umgeschalteten Formulars — derselbe Dialog-mit-Formular-Fix wie in Plan 2a/2b gilt auch hier: `BodyEntryForm` muss bedingt auf den Öffnen-Status gerendert werden, sonst zeigt ein wiedereröffneter Dialog den zuletzt getippten Entwurf statt der frischen Vorbelegung aus `rows`.

- [ ] **Step 1: Write the failing test**

Read the current `src/pages/BodyPage.test.tsx` first. Add this test in the `describe('BodyPage', ...)` block, directly after the existing `'prefills the form from the entry that already exists for today'` test:

```tsx
  it('resets the entry form on reopen instead of showing the last attempt', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    zeigeDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'Heute eintragen' }))
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '77' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(screen.queryByLabelText('Gewicht (kg)')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Heute eintragen' }))
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(82.5)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/BodyPage.test.tsx`
Expected: FAIL — the new test fails (the dialog conditional-render behavior does not exist yet, `BodyEntryForm` currently unmounts on `formOpen=false` too, so this specific test might actually pass by accident today; run it to confirm the *current* behavior first). Every other existing test still PASSes.

- [ ] **Step 3: Write the implementation**

In `src/pages/BodyPage.tsx`, add the imports:

```ts
import { cardClass, buttonPrimaryClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import { useToast } from '../components/ToastProvider'
```

Replace the `Dashboard` function:

```tsx
function Dashboard({ userId }: { userId: string }) {
  const { rows, loading, error, saveEntry } = useBodyMetrics(userId)
  const [formOpen, setFormOpen] = useState(false)
  const [syncNotice, setSyncNotice] = useState('')
  const auswahl = useChartSelection(userId)

  if (loading) {
    return (
      <div>
        <h1>Körper</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Körper</h1>
      {error && <p role="alert">Werte konnten nicht geladen werden.</p>}

      <ul role="list">
        {MEASUREMENT_FIELDS.map((field) => {
          const latest = latestValue(rows, field)
          const change = changeSince(rows, field)
          return (
            <li key={field}>
              <span>{FIELD_LABELS[field]}</span>
              <span data-testid={`wert-${field}`}>
                {latest == null ? '—' : `${formatValue(latest.value)} ${unitOf(field)}`}
              </span>
              {latest != null && <span>{`Stand ${formatDate(latest.datum)}`}</span>}
              {change != null && (
                <span>
                  {/* U+2212 minus, not a hyphen: it lines up with digits. */}
                  {`${change.delta < 0 ? '−' : '+'}${formatValue(Math.abs(change.delta))} ${unitOf(field)} seit ${formatDate(change.datum)}`}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {syncNotice !== '' && <p role="alert">{syncNotice}</p>}

      {formOpen ? (
        <BodyEntryForm
          // The upsert writes all seven columns, so an empty form would blank
          // everything already recorded today. Correcting the day means
          // starting from what is stored, not from blanks.
          entry={rows.find((row) => row.datum === today())}
          onSave={async (datum, values) => {
            setSyncNotice('')
            try {
              await saveEntry(datum, values)
            } catch (err) {
              // The entry was already written and the list already reloaded;
              // only the profiles mirror failed. Resolve normally so the form
              // closes without its own "not saved" alert — that message would
              // be wrong here, and this page (which stays on screen) is the
              // right place for the real one.
              if (err instanceof ProfileWeightSyncError) {
                setSyncNotice(
                  'Eintrag gespeichert. Das aktuelle Gewicht im Profil konnte nicht aktualisiert werden.',
                )
                return
              }
              throw err
            }
          }}
          onClose={() => setFormOpen(false)}
        />
      ) : (
        <button type="button" onClick={() => setFormOpen(true)}>
          Heute eintragen
        </button>
      )}

      <DashboardBodyCharts userId={userId} auswahl={auswahl.auswahl} />
      <Link to="/body/analyse">Analyse</Link>
      <Link to="/body/entries">Verlauf</Link>
      <Link to="/body/photos">Fortschrittsfotos</Link>
    </div>
  )
}
```

with:

```tsx
function Dashboard({ userId }: { userId: string }) {
  const { rows, loading, error, saveEntry } = useBodyMetrics(userId)
  const [formOpen, setFormOpen] = useState(false)
  const showToast = useToast()
  const auswahl = useChartSelection(userId)

  if (loading) {
    return (
      <div>
        <h1>Körper</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Körper</h1>
      {error && <p role="alert">Werte konnten nicht geladen werden.</p>}

      <ul role="list" className="grid grid-cols-2 gap-4">
        {MEASUREMENT_FIELDS.map((field) => {
          const latest = latestValue(rows, field)
          const change = changeSince(rows, field)
          return (
            <li key={field} className="block border-b-0">
              <div className={`${cardClass} w-full`}>
                <span>{FIELD_LABELS[field]}</span>
                <span data-testid={`wert-${field}`}>
                  {latest == null ? '—' : `${formatValue(latest.value)} ${unitOf(field)}`}
                </span>
                {latest != null && <span>{`Stand ${formatDate(latest.datum)}`}</span>}
                {change != null && (
                  <span>
                    {/* U+2212 minus, not a hyphen: it lines up with digits. */}
                    {`${change.delta < 0 ? '−' : '+'}${formatValue(Math.abs(change.delta))} ${unitOf(field)} seit ${formatDate(change.datum)}`}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <button type="button" className={buttonPrimaryClass} onClick={() => setFormOpen(true)}>
        Heute eintragen
      </button>
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

      <DashboardBodyCharts userId={userId} auswahl={auswahl.auswahl} />
      <Link to="/body/analyse">Analyse</Link>
      <Link to="/body/entries">Verlauf</Link>
      <Link to="/body/photos">Fortschrittsfotos</Link>
    </div>
  )
}
```

- [ ] **Step 4: Update the test file's render helper**

In `src/pages/BodyPage.test.tsx`, replace:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BodyPage from './BodyPage'
import { ProfileWeightSyncError } from '../hooks/use-body-metrics'
```

with:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import BodyPage from './BodyPage'
import { ProfileWeightSyncError } from '../hooks/use-body-metrics'
import { renderWithProviders } from '../test-render'
```

Replace:

```tsx
function zeigeDashboard() {
  return render(
    <MemoryRouter>
      <BodyPage />
    </MemoryRouter>,
  )
}
```

with:

```tsx
function zeigeDashboard() {
  return renderWithProviders(<BodyPage />)
}
```

No other test changes needed: every existing test uses `zeigeDashboard()`, including the six tests in the `'BodyPage – ausgewaehlte Graphen'` describe block further down the file — the swap covers all of them in one place. The existing `'shows a stale-mirror notice, not a failure notice, when only the profile sync fails'` test keeps its exact assertions (`screen.findByRole('alert')`, text content checks) — the toast also carries `role="alert"`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run src/pages/BodyPage.test.tsx`
Expected: PASS — all tests, including the new reset-on-reopen test.

- [ ] **Step 6: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/pages/BodyPage.tsx src/pages/BodyPage.test.tsx
git commit -m "feat: Koerper-Dashboard als Karten-Grid, Eintragen als Dialog"
```

---

## Task 3: BodyEntriesPage (Karten, ein geteilter Bearbeiten-Dialog, Toast)

**Files:**
- Modify: `src/pages/BodyEntriesPage.tsx`
- Modify: `src/pages/BodyEntriesPage.test.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonSecondaryClass`; `Dialog`; `useToast`; `BodyEntryForm` (unverändertes Interface aus Task 1)

Jeder Eintrag wird eine Karte. „Bearbeiten" öffnet `BodyEntryForm` in einem **einzigen, geteilten** Dialog statt eines Dialogs pro Zeile — `editingId` erlaubt ohnehin nur eine offene Bearbeitung gleichzeitig, ein Dialog je Zeile wäre unnötige Vervielfachung nativer `<dialog>`-Elemente. Der Löschen-Fehler und beide Stale-Mirror-Hinweise (Speichern, Löschen) werden Toasts (Rationale oben).

- [ ] **Step 1: Write the failing test**

Read the current `src/pages/BodyEntriesPage.test.tsx` in full first. Add this test at the end of the `describe('BodyEntriesPage', ...)` block:

```tsx
  it('resets the form on reopen instead of showing the last attempt', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Bearbeiten' })[1])
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(screen.queryByLabelText('Gewicht (kg)')).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Bearbeiten' })[1])
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(83.3)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/BodyEntriesPage.test.tsx`
Expected: run it and note the actual result before Step 3's implementation change — every other existing test still PASSes (the render-and-click sequence is unchanged, only the underlying markup changes in Step 3).

- [ ] **Step 3: Write the implementation**

In `src/pages/BodyEntriesPage.tsx`, add the imports:

```ts
import { cardClass, buttonSecondaryClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import { useToast } from '../components/ToastProvider'
```

Replace the `Entries` function:

```tsx
function Entries({ userId }: { userId: string }) {
  const { rows, loading, error, saveEntry, deleteEntry } = useBodyMetrics(userId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  if (loading) {
    return (
      <div>
        <h1>Verlauf</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  async function remove(id: string) {
    setActionError('')
    try {
      await deleteEntry(id)
    } catch (err) {
      // The entry was already deleted and the list already reloaded; only the
      // profiles mirror failed afterwards. Saying "not deleted" here would be a
      // lie that sends the user to retry an action that already happened.
      if (err instanceof ProfileWeightSyncError) {
        setActionError(
          'Eintrag gelöscht. Das aktuelle Gewicht im Profil konnte nicht aktualisiert werden.',
        )
        return
      }
      setActionError('Eintrag konnte nicht gelöscht werden.')
    }
  }

  return (
    <div>
      <h1>Verlauf</h1>
      {error && <p role="alert">Werte konnten nicht geladen werden.</p>}
      {rows.length === 0 && <p>Noch keine Einträge.</p>}

      <ul role="list">
        {rows.map((entry) => (
          <li key={entry.id}>
            {editingId === entry.id ? (
              <BodyEntryForm
                entry={entry}
                onSave={async (datum, values) => {
                  setActionError('')
                  try {
                    await saveEntry(datum, values)
                  } catch (err) {
                    // Same reasoning as remove(): the write already succeeded,
                    // only the profile mirror is stale. Resolve normally so the
                    // form closes without its own "not saved" alert.
                    if (err instanceof ProfileWeightSyncError) {
                      setActionError(
                        'Eintrag gespeichert. Das aktuelle Gewicht im Profil konnte nicht aktualisiert werden.',
                      )
                      return
                    }
                    throw err
                  }
                }}
                onClose={() => setEditingId(null)}
              />
            ) : (
              <>
                <span>{formatDate(entry.datum)}</span>
                <span>{summarize(entry)}</span>
                <button type="button" onClick={() => setEditingId(entry.id)}>
                  Bearbeiten
                </button>
                <button type="button" onClick={() => remove(entry.id)}>
                  Löschen
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {actionError !== '' && <p role="alert">{actionError}</p>}
      <Link to="/body">Zurück zum Körperbereich</Link>
    </div>
  )
}
```

with:

```tsx
function Entries({ userId }: { userId: string }) {
  const { rows, loading, error, saveEntry, deleteEntry } = useBodyMetrics(userId)
  const [editingId, setEditingId] = useState<string | null>(null)
  const showToast = useToast()

  if (loading) {
    return (
      <div>
        <h1>Verlauf</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  async function remove(id: string) {
    try {
      await deleteEntry(id)
    } catch (err) {
      // The entry was already deleted and the list already reloaded; only the
      // profiles mirror failed afterwards. Saying "not deleted" here would be a
      // lie that sends the user to retry an action that already happened.
      if (err instanceof ProfileWeightSyncError) {
        showToast(
          'Eintrag gelöscht. Das aktuelle Gewicht im Profil konnte nicht aktualisiert werden.',
          'error',
        )
        return
      }
      showToast('Eintrag konnte nicht gelöscht werden.', 'error')
    }
  }

  const editingEntry = rows.find((row) => row.id === editingId)

  return (
    <div>
      <h1>Verlauf</h1>
      {error && <p role="alert">Werte konnten nicht geladen werden.</p>}
      {rows.length === 0 && <p>Noch keine Einträge.</p>}

      <ul role="list" className="space-y-4">
        {rows.map((entry) => (
          <li key={entry.id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>
              <span>{formatDate(entry.datum)}</span>
              <span>{summarize(entry)}</span>
              <button
                type="button"
                className={buttonSecondaryClass}
                onClick={() => setEditingId(entry.id)}
              >
                Bearbeiten
              </button>
              <button type="button" className={buttonSecondaryClass} onClick={() => remove(entry.id)}>
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the form only while open forces a fresh prefill from the
          entry each time it opens, instead of showing the last attempt's
          leftover draft. One shared dialog for the whole list, not one per
          row: editingId already guarantees only one row is ever being edited
          at a time. */}
      <Dialog open={editingId !== null} onClose={() => setEditingId(null)}>
        {editingEntry && (
          <BodyEntryForm
            entry={editingEntry}
            onSave={async (datum, values) => {
              try {
                await saveEntry(datum, values)
              } catch (err) {
                // Same reasoning as remove(): the write already succeeded,
                // only the profile mirror is stale. Resolve normally so the
                // dialog closes without its own "not saved" alert.
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
            onClose={() => setEditingId(null)}
          />
        )}
      </Dialog>

      <Link to="/body">Zurück zum Körperbereich</Link>
    </div>
  )
}
```

- [ ] **Step 4: Update the test file's render helper**

In `src/pages/BodyEntriesPage.test.tsx`, replace:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BodyEntriesPage from './BodyEntriesPage'
import { ProfileWeightSyncError } from '../hooks/use-body-metrics'
```

with:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import BodyEntriesPage from './BodyEntriesPage'
import { ProfileWeightSyncError } from '../hooks/use-body-metrics'
import { renderWithProviders } from '../test-render'
```

Replace:

```tsx
function renderPage() {
  return render(
    <MemoryRouter>
      <BodyEntriesPage />
    </MemoryRouter>,
  )
}
```

with:

```tsx
function renderPage() {
  return renderWithProviders(<BodyEntriesPage />)
}
```

No other test changes needed: `'opens the form prefilled when correcting an entry'` still asserts the same `getByLabelText` calls (Dialog renders its children directly, no portal). `'reports a failed delete instead of swallowing it'` and both stale-mirror-notice tests keep their exact `screen.findByRole('alert')` assertions — the toast also carries `role="alert"`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run src/pages/BodyEntriesPage.test.tsx`
Expected: PASS — all tests, including the new reset-on-reopen test.

- [ ] **Step 6: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/pages/BodyEntriesPage.tsx src/pages/BodyEntriesPage.test.tsx
git commit -m "feat: Koerper-Verlauf als Karten, Bearbeiten als geteilter Dialog"
```

---

## Task 4: BodyPhotosPage (Formular-Karte, Foto-Karten, Toast)

**Files:**
- Modify: `src/pages/BodyPhotosPage.tsx`
- Modify: `src/pages/BodyPhotosPage.test.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonSecondaryClass`; `useToast`

Kein Dialog auf dieser Seite: die Datum-/Foto-Felder sind bereits immer sichtbar, kein inline umgeschalteter Zustand, der zu einem Dialog würde (anders als die „Eigene Übung anlegen"-Fälle in Plan 2a). Beide Fehlerfälle (Hochladen, Löschen) sind ohne Dialog-Beteiligung und werden deshalb ein Toast, exakt wie der Löschen-Fehler in Plan 2b.

- [ ] **Step 1: Write the implementation**

In `src/pages/BodyPhotosPage.tsx`, add the imports:

```ts
import { cardClass, buttonSecondaryClass } from '../lib/ui-classes'
import { useToast } from '../components/ToastProvider'
```

Replace the `Photos` function:

```tsx
function Photos({ userId }: { userId: string }) {
  const { photos, loading, error, uploadPhoto, deletePhoto } = useBodyPhotos(userId)
  const [datum, setDatum] = useState(today())
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div>
        <h1>Fortschrittsfotos</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset first: picking the same file twice would otherwise fire no change.
    event.target.value = ''
    if (!file) return

    setActionError('')
    setBusy(true)
    try {
      await uploadPhoto(file, datum)
    } catch {
      setActionError('Foto konnte nicht hochgeladen werden.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(photo: BodyPhoto) {
    setActionError('')
    try {
      await deletePhoto(photo)
    } catch {
      setActionError('Foto konnte nicht gelöscht werden.')
    }
  }

  return (
    <div>
      <h1>Fortschrittsfotos</h1>
      {error && <p role="alert">Fotos konnten nicht geladen werden.</p>}

      <label>
        Datum
        <input type="date" value={datum} onChange={(event) => setDatum(event.target.value)} />
      </label>
      <label>
        Foto
        <input type="file" accept="image/*" disabled={busy} onChange={choose} />
      </label>

      {actionError !== '' && <p role="alert">{actionError}</p>}
      {photos.length === 0 && <p>Noch keine Fotos.</p>}

      <ul role="list">
        {photos.map((photo) => (
          <li key={photo.id}>
            <span>{formatDate(photo.datum)}</span>
            {photo.url == null ? (
              // A signed link can fail on its own; a bare <img> would just show
              // a broken image and say nothing about why.
              <span>Bild nicht verfügbar</span>
            ) : (
              <img
                src={photo.url}
                alt={`Fortschrittsfoto vom ${formatDate(photo.datum)}`}
                loading="lazy"
              />
            )}
            <button type="button" onClick={() => remove(photo)}>
              Löschen
            </button>
          </li>
        ))}
      </ul>

      <Link to="/body">Zurück zum Körperbereich</Link>
    </div>
  )
}
```

with:

```tsx
function Photos({ userId }: { userId: string }) {
  const { photos, loading, error, uploadPhoto, deletePhoto } = useBodyPhotos(userId)
  const [datum, setDatum] = useState(today())
  const [busy, setBusy] = useState(false)
  const showToast = useToast()

  if (loading) {
    return (
      <div>
        <h1>Fortschrittsfotos</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Reset first: picking the same file twice would otherwise fire no change.
    event.target.value = ''
    if (!file) return

    setBusy(true)
    try {
      await uploadPhoto(file, datum)
    } catch {
      showToast('Foto konnte nicht hochgeladen werden.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function remove(photo: BodyPhoto) {
    try {
      await deletePhoto(photo)
    } catch {
      showToast('Foto konnte nicht gelöscht werden.', 'error')
    }
  }

  return (
    <div>
      <h1>Fortschrittsfotos</h1>
      {error && <p role="alert">Fotos konnten nicht geladen werden.</p>}

      <div className={cardClass}>
        <label>
          Datum
          <input type="date" value={datum} onChange={(event) => setDatum(event.target.value)} />
        </label>
        <label>
          Foto
          <input type="file" accept="image/*" disabled={busy} onChange={choose} />
        </label>
      </div>

      {photos.length === 0 && <p>Noch keine Fotos.</p>}

      <ul role="list" className="space-y-4">
        {photos.map((photo) => (
          <li key={photo.id} className="block border-b-0">
            <div className={`${cardClass} w-full`}>
              <span>{formatDate(photo.datum)}</span>
              {photo.url == null ? (
                // A signed link can fail on its own; a bare <img> would just show
                // a broken image and say nothing about why.
                <span>Bild nicht verfügbar</span>
              ) : (
                <img
                  src={photo.url}
                  alt={`Fortschrittsfoto vom ${formatDate(photo.datum)}`}
                  loading="lazy"
                />
              )}
              <button type="button" className={buttonSecondaryClass} onClick={() => remove(photo)}>
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Link to="/body">Zurück zum Körperbereich</Link>
    </div>
  )
}
```

- [ ] **Step 2: Update the test file's render helper**

In `src/pages/BodyPhotosPage.test.tsx`, replace:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BodyPhotosPage from './BodyPhotosPage'
```

with:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import BodyPhotosPage from './BodyPhotosPage'
import { renderWithProviders } from '../test-render'
```

Replace:

```tsx
function renderPage() {
  return render(
    <MemoryRouter>
      <BodyPhotosPage />
    </MemoryRouter>,
  )
}
```

with:

```tsx
function renderPage() {
  return renderWithProviders(<BodyPhotosPage />)
}
```

No other test changes needed: `'reports a failed upload instead of swallowing it'` keeps its exact `screen.findByRole('alert')` assertion — the toast also carries `role="alert"`. `'deletes a photo'` does not assert on any alert, unaffected.

- [ ] **Step 3: Run the full suite**

Run: `npm test -- --run src/pages/BodyPhotosPage.test.tsx`
Expected: PASS — all 6 tests.

- [ ] **Step 4: Full check and commit**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
git add src/pages/BodyPhotosPage.tsx src/pages/BodyPhotosPage.test.tsx
git commit -m "feat: Fortschrittsfotos als Karten, Fehler ueber Toast"
```

---

## Task 5: Abschluss — Gesamtlauf, Bundle, manueller Browser-Check, Doku

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

Zahlen wörtlich übernehmen — inklusive der Erinnerung, dass ein Worktree ohne `.env` einen nicht vergleichbaren, zu kleinen Wert liefert (fehlendes Barcode-Scanner-Subsystem im Entry-Chunk — siehe Plan 1/2a/2b).

- [ ] **Step 2: Domänenmodell prüfen**

`docs/domaenenmodell.md` prüfen — dieser Plan ändert keine Tabelle, keine Spalte, keine Abfrage-Form, nur Markup und Klassen. Keine Änderung vornehmen, falls das stimmt.

- [ ] **Step 3: Manueller Browser-Check**

**Warum zwingend:** jeder Test in diesem Plan prüft Verhalten oder Klassenname-Strings, keiner rendert echtes Layout. `npm run dev` starten (temporäre, nicht committete `.env` mit Platzhalter-Werten reicht, siehe Vorgehen aus Plan 1/2a/2b). Durchklicken und bestätigen:

1. `/body`: die sieben Messwerte erscheinen als 2-spaltige Karten-Grid, jede Karte abgerundet ohne sichtbaren Rahmen.
2. `/body`: „Heute eintragen" öffnet einen **zentrierten** Dialog mit verschwommenem Hintergrund (nicht oben links angepinnt — die Plan-1-Regression, hier gezielt gegenprüfen), Formularfelder als Karte, „Speichern" als voller Hauptbutton.
3. Dialog schließen und erneut öffnen: zeigt wieder die aktuell gespeicherten Werte, keine zwischenzeitlich getippten Reste.
4. `/body/entries`: jeder Eintrag erscheint als eigene Karte; „Bearbeiten" öffnet denselben zentrierten Dialog mit vorbelegtem Formular; „Bearbeiten"/„Löschen" sind unauffällige Sekundärbuttons.
5. `/body/photos`: das Datum-/Foto-Formularfeld erscheint als eigene Karte, jedes Foto als eigene Karte mit Sekundärbutton „Löschen".
6. Einen Löschversuch absichtlich scheitern lassen (z. B. Netzwerk kurz trennen): eine Toast-Meldung erscheint oben, außerhalb jedes Dialogs, sichtbar, und verschwindet nach wenigen Sekunden von selbst.
7. Konsole ohne Fehler oder Warnungen auf jeder besuchten Seite.

Alle sieben Punkte im Abschlussbericht festhalten. Falls einer fehlschlägt: Fund ins Ledger, ein Fix, ein Scoped-Re-Review, erneut visuell bestätigen — derselbe Ablauf wie in Plan 1/2a/2b.

- [ ] **Step 4: Vollständige Prüfung**

```bash
npm run lint
npx tsc -b --noEmit
npm test -- --run
npm run build
```

- [ ] **Step 5: Status in CLAUDE.md nachziehen**

Im Abschnitt „Phase 6" festhalten: Plan 2c (Körper) umgesetzt — Dashboard, Verlaufsliste und Fotoseite auf Karten/Buttons/Dialog/Toast umgestellt, Testzahl und Bundle-Zahl, Ergebnis des manuellen Browser-Checks. Offen: Plan 2d (Analyse-Seiten).

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Status fuer Phase 6 Plan 2c nachziehen"
```

---

## Self-Review

**Spec-Abdeckung.** „Die sieben Messwerte werden zu einer 2-spaltigen Karten-Grid" → Task 2. Die Verlaufsliste (Task 3) und die Fotoseite (Task 4) verbrauchen die Plan-1-Bausteine konsequent, auch wo der Spec-Satz sie nicht wörtlich nennt — analog zu Plan 2a/2bs Umgang mit Bereichen jenseits des einen Spec-Satzes je Zeile.

**Dialog-mit-Formular-Muster durchgängig geprüft:** Task 2 (`BodyEntryForm` in `Dashboard`) und Task 3 (`BodyEntryForm` in `Entries`, ein geteilter Dialog statt eines je Zeile) rendern ihren Formular-Inhalt beide bedingt auf den Öffnen-Status, das `Dialog`-Element selbst bleibt unbedingt gerendert.

**Toast-vs-inline-Regel für diesen Bereich:** anders als Plan 2b (wo praktisch jeder Schreibfehler inline blieb) werden hier die `ProfileWeightSyncError`-Stale-Mirror-Hinweise und jeder dialogfreie Fehler (Löschen in der Verlaufsliste, Hochladen/Löschen bei Fotos) zum Toast, weil die aufrufende Seite diesen Fehlertyp als Erfolg behandelt und der Dialog (falls überhaupt einer beteiligt war) zu diesem Zeitpunkt bereits geschlossen ist — ausführlich in der Rationale oben begründet und in Task 2/3 durchgängig angewandt. Der reale Schreibfehler bleibt inline in `BodyEntryForm` (Formular/Dialog bleibt offen), unverändert seit vor diesem Plan.

**Typkonsistenz.** Keine der geänderten Komponenten ändert ihr Props-Interface — `BodyEntryForm`s `entry`/`onSave`/`onClose` bleiben exakt wie vorher, nur die aufrufende Stelle (`Dashboard`, `Entries`) verpackt sie neu in einen Dialog. Gegen die tatsächlichen Dateien gelesen (nicht gegen Vermutung), inklusive der Bestätigung, dass `ProfilePage`/`CalorieGoalEditor` nirgends in diesem Bereich vorkommen.

**Platzhalter-Durchgang.** Kein „TBD", kein „analog zu Task N" ohne ausgeschriebenen Code — jede Task-Datei zeigt entweder die volle neue Funktion oder einen exakten Vorher/Nachher-Ersetzungsblock.

**Bewusst offen gelassen für diesen Plan:** kein Bestätigungs-Dialog vor „Löschen" (identisch zur Entscheidung in Plan 2a/2b — widerspräche der zweimal dokumentierten Projekt-Konvention). `ProfilePage.tsx`/`CalorieGoalEditor.tsx` bleiben vollständig außerhalb, wie in jedem der vier Bereichs-Pläne.

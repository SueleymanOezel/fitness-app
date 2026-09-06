# Phase-6-Nachschärfung Plan 2: Profil nachziehen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ProfilePage.tsx` und `CalorieGoalEditor.tsx` auf dieselben Design-Bausteine heben wie der Rest der App seit Phase 6 (`cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass`) und dabei den vom impeccable-Detector gemeldeten Zeilenlängen-Fund auf `/profile` beheben.

**Architecture:** Beide Dateien werden nach dem in `src/components/BodyEntryForm.tsx` bereits etablierten Muster migriert: ein `<div className={cardClass}>` umschließt die zusammengehörigen Formularfelder, Status-/Fehlermeldungen bleiben außerhalb der Karte, Submit-Buttons bekommen `buttonPrimaryClass`, alle anderen Buttons `buttonSecondaryClass`. Die nativen `<input>`/`<select>`-Elemente selbst werden nicht angefasst — kein Input-Styling existiert irgendwo im bisherigen Code, dieser Plan bricht das Muster nicht auf.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Vitest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-06-phase6-nachschaerfung-design.md`

**Vorgänger:** `docs/superpowers/plans/2026-09-06-phase6-nachschaerfung-plan1-tokens.md` (gemerged, PR #45) — liefert die bereits kontrast- und motion-korrigierten `cardClass`/`buttonPrimaryClass`/`buttonSecondaryClass`-Exporte aus `src/lib/ui-classes.ts`. Dieser Plan ändert `ui-classes.ts` selbst nicht, konsumiert nur die bestehenden Exporte.

## Global Constraints

- Nur `cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass` aus `src/lib/ui-classes.ts` verwenden — kein neuer Design-Baustein, keine neue CSS-Klasse außer `max-w-prose` (bereits Teil von Tailwind, keine eigene Definition nötig).
- Native `<input>`/`<select>`/`<option>`-Elemente bleiben unverändert — kein Input-Styling.
- Eng am Befund bleiben: nur die beiden genannten Dateien, keine Änderungen an `CalorieGoalEditor`s oder `ProfilePage`s Logik/Validierung/Datenfluss.
- Nach jedem Task: `npm run lint`, `npx tsc -b --noEmit`, `npm test -- --run` müssen grün sein.
- Commit-Messages auf Deutsch ohne Umlaute, im Stil der bestehenden Historie.

---

### Task 1: `ProfilePage.tsx` auf Karte und Button-Klassen heben

**Files:**
- Modify: `src/pages/ProfilePage.tsx`
- Modify: `src/pages/ProfilePage.test.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonPrimaryClass`, `buttonSecondaryClass` aus `../lib/ui-classes`.
- Produces: `ProfilePage` unverändert als Default-Export, `LoadedProfileForm` unverändert in Props-Signatur — reine Markup-/Klassen-Änderung, keine neue Schnittstelle.

- [ ] **Step 1: Schreibe die fehlschlagenden Tests**

In `src/pages/ProfilePage.test.tsx`, nach dem bestehenden Test `'shows the meal section names'` (vor `'saves renamed and newly added sections'`) zwei neue Tests einfügen:

```tsx
  it('wraps the form fields in a card and styles the primary/secondary buttons', async () => {
    await renderPage()

    expect(screen.getByLabelText('Name').closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
    expect(screen.getByRole('button', { name: 'Speichern' })).toHaveClass('bg-accent')
    expect(screen.getByRole('button', { name: 'Logout' })).not.toHaveClass('bg-accent')
    expect(screen.getByRole('button', { name: 'Logout' })).toHaveClass('rounded-2xl')
  })

  it('constrains the meal-section hint text to a readable line length', async () => {
    await renderPage()

    expect(screen.getByText(/Leere Felder werden nicht angezeigt/)).toHaveClass('max-w-prose')
  })
```

- [ ] **Step 2: Lauf die Tests, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/pages/ProfilePage.test.tsx`
Expected: FAIL — die zwei neuen Tests schlagen fehl (kein Element trägt `bg-surface`/`rounded-3xl`/`bg-accent`/`rounded-2xl`/`max-w-prose`), alle 16 bestehenden Tests bleiben grün.

- [ ] **Step 3: Ergänze den Import**

In `src/pages/ProfilePage.tsx`, ändere:
```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../hooks/use-session'
import { useProfile, type Profile } from '../hooks/use-profile'
import CalorieGoalEditor from '../components/CalorieGoalEditor'
```
zu:
```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../hooks/use-session'
import { useProfile, type Profile } from '../hooks/use-profile'
import CalorieGoalEditor from '../components/CalorieGoalEditor'
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
```

- [ ] **Step 4: Implementiere die Änderung in `LoadedProfileForm`**

Ändere den kompletten `return`-Block von `LoadedProfileForm` (identisch bis auf die im Diff markierten Stellen):

Ändere:
```tsx
  return (
    <div>
      <h1>Profil</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input value={draft.name} onChange={(event) => set('name', event.target.value)} />
        </label>
        <label>
          Alter (Jahre)
          <input
            type="number"
            value={draft.alter}
            onChange={(event) => set('alter', event.target.value)}
          />
        </label>
        <label>
          Größe (cm)
          <input
            type="number"
            step="any"
            value={draft.groesse}
            onChange={(event) => set('groesse', event.target.value)}
          />
        </label>
        <label>
          Gewicht (kg)
          <input
            type="number"
            step="any"
            value={draft.aktuelles_gewicht}
            onChange={(event) => set('aktuelles_gewicht', event.target.value)}
          />
        </label>
        <label>
          Geschlecht
          <select
            value={draft.geschlecht}
            onChange={(event) => set('geschlecht', event.target.value)}
          >
            <option value="">bitte wählen</option>
            {GESCHLECHT.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Aktivitätslevel
          <select
            value={draft.aktivitaetslevel}
            onChange={(event) => set('aktivitaetslevel', event.target.value)}
          >
            <option value="">bitte wählen</option>
            {AKTIVITAET.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ziel
          <select value={draft.ziel} onChange={(event) => set('ziel', event.target.value)}>
            <option value="">bitte wählen</option>
            {ZIEL.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ziel-Delta (kcal)
          <input
            type="number"
            step="any"
            value={draft.ziel_delta_kcal}
            onChange={(event) => set('ziel_delta_kcal', event.target.value)}
          />
        </label>

        <fieldset>
          <legend>Mahlzeiten</legend>
          <p>
            Leere Felder werden nicht angezeigt. Die ersten vier Mahlzeiten lassen sich
            umbenennen, aber nicht entfernen.
          </p>
          {(
            [
              [1, 'mahlzeit_1_name'],
              [2, 'mahlzeit_2_name'],
              [3, 'mahlzeit_3_name'],
              [4, 'mahlzeit_4_name'],
              [5, 'mahlzeit_5_name'],
              [6, 'mahlzeit_6_name'],
            ] as const
          ).map(([slot, field]) => (
            <label key={slot}>
              {`Mahlzeit ${slot}`}
              <input
                maxLength={MAX_SECTION_NAME_LENGTH}
                value={draft[field]}
                onChange={(event) => set(field, event.target.value)}
              />
            </label>
          ))}
        </fieldset>

        {status === 'invalid' && (
          <p role="alert">
            Bitte plausible Werte eingeben (Alter {RANGES.alter[0]}–{RANGES.alter[1]}, Größe{' '}
            {RANGES.groesse[0]}–{RANGES.groesse[1]} cm, Gewicht {RANGES.aktuelles_gewicht[0]}–
            {RANGES.aktuelles_gewicht[1]} kg, Ziel-Delta {RANGES.ziel_delta_kcal[0]}–
            {RANGES.ziel_delta_kcal[1]} kcal).
          </p>
        )}
        {status === 'failed' && <p role="alert">Profil konnte nicht gespeichert werden.</p>}
        {status === 'saved' && <p role="status">Gespeichert.</p>}

        <button type="submit">Speichern</button>
      </form>

      <h2>Tagesziel</h2>
      <CalorieGoalEditor profile={profile} onUpdate={onUpdate} />

      <button
        type="button"
        onClick={() => {
          supabase.auth.signOut().catch(() => {
            /* signOut failed network-side; ProtectedRoute re-checks the session on the next render anyway */
          })
        }}
      >
        Logout
      </button>
    </div>
  )
```
zu:
```tsx
  return (
    <div>
      <h1>Profil</h1>
      <form onSubmit={handleSubmit}>
        <div className={cardClass}>
          <label>
            Name
            <input value={draft.name} onChange={(event) => set('name', event.target.value)} />
          </label>
          <label>
            Alter (Jahre)
            <input
              type="number"
              value={draft.alter}
              onChange={(event) => set('alter', event.target.value)}
            />
          </label>
          <label>
            Größe (cm)
            <input
              type="number"
              step="any"
              value={draft.groesse}
              onChange={(event) => set('groesse', event.target.value)}
            />
          </label>
          <label>
            Gewicht (kg)
            <input
              type="number"
              step="any"
              value={draft.aktuelles_gewicht}
              onChange={(event) => set('aktuelles_gewicht', event.target.value)}
            />
          </label>
          <label>
            Geschlecht
            <select
              value={draft.geschlecht}
              onChange={(event) => set('geschlecht', event.target.value)}
            >
              <option value="">bitte wählen</option>
              {GESCHLECHT.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Aktivitätslevel
            <select
              value={draft.aktivitaetslevel}
              onChange={(event) => set('aktivitaetslevel', event.target.value)}
            >
              <option value="">bitte wählen</option>
              {AKTIVITAET.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ziel
            <select value={draft.ziel} onChange={(event) => set('ziel', event.target.value)}>
              <option value="">bitte wählen</option>
              {ZIEL.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ziel-Delta (kcal)
            <input
              type="number"
              step="any"
              value={draft.ziel_delta_kcal}
              onChange={(event) => set('ziel_delta_kcal', event.target.value)}
            />
          </label>

          <fieldset>
            <legend>Mahlzeiten</legend>
            <p className="max-w-prose">
              Leere Felder werden nicht angezeigt. Die ersten vier Mahlzeiten lassen sich
              umbenennen, aber nicht entfernen.
            </p>
            {(
              [
                [1, 'mahlzeit_1_name'],
                [2, 'mahlzeit_2_name'],
                [3, 'mahlzeit_3_name'],
                [4, 'mahlzeit_4_name'],
                [5, 'mahlzeit_5_name'],
                [6, 'mahlzeit_6_name'],
              ] as const
            ).map(([slot, field]) => (
              <label key={slot}>
                {`Mahlzeit ${slot}`}
                <input
                  maxLength={MAX_SECTION_NAME_LENGTH}
                  value={draft[field]}
                  onChange={(event) => set(field, event.target.value)}
                />
              </label>
            ))}
          </fieldset>
        </div>

        {status === 'invalid' && (
          <p role="alert">
            Bitte plausible Werte eingeben (Alter {RANGES.alter[0]}–{RANGES.alter[1]}, Größe{' '}
            {RANGES.groesse[0]}–{RANGES.groesse[1]} cm, Gewicht {RANGES.aktuelles_gewicht[0]}–
            {RANGES.aktuelles_gewicht[1]} kg, Ziel-Delta {RANGES.ziel_delta_kcal[0]}–
            {RANGES.ziel_delta_kcal[1]} kcal).
          </p>
        )}
        {status === 'failed' && <p role="alert">Profil konnte nicht gespeichert werden.</p>}
        {status === 'saved' && <p role="status">Gespeichert.</p>}

        <button type="submit" className={buttonPrimaryClass}>
          Speichern
        </button>
      </form>

      <h2>Tagesziel</h2>
      <CalorieGoalEditor profile={profile} onUpdate={onUpdate} />

      <button
        type="button"
        className={buttonSecondaryClass}
        onClick={() => {
          supabase.auth.signOut().catch(() => {
            /* signOut failed network-side; ProtectedRoute re-checks the session on the next render anyway */
          })
        }}
      >
        Logout
      </button>
    </div>
  )
```

- [ ] **Step 5: Lauf die Tests erneut, um das Bestehen zu bestätigen**

Run: `npx vitest run src/pages/ProfilePage.test.tsx`
Expected: PASS (18 Tests)

- [ ] **Step 6: Lauf die volle Testsuite (Regressionscheck)**

Run: `npm test -- --run`
Expected: alle Tests grün

- [ ] **Step 7: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 8: Commit**

```bash
git add src/pages/ProfilePage.tsx src/pages/ProfilePage.test.tsx
git commit -m "feat: ProfilePage auf Karte und Button-Klassen heben"
```

---

### Task 2: `CalorieGoalEditor.tsx` auf Karte und Button-Klasse heben

**Files:**
- Modify: `src/components/CalorieGoalEditor.tsx`
- Modify: `src/components/CalorieGoalEditor.test.tsx`

**Interfaces:**
- Consumes: `cardClass`, `buttonSecondaryClass` aus `../lib/ui-classes`.
- Produces: `CalorieGoalEditor` unverändert in Props-Signatur (`{ profile: Profile; onUpdate: (patch: Partial<Profile>) => Promise<void> }`) — reine Markup-/Klassen-Änderung.

- [ ] **Step 1: Schreibe die fehlschlagenden Tests**

In `src/components/CalorieGoalEditor.test.tsx`, nach dem bestehenden Test `'shows a completion hint when profile data is missing'` (vor `'switches to manual mode and saves the entered value once, on blur'`) einen neuen Test einfügen, und einen weiteren am Ende der `describe`-Block ergänzen:

```tsx
  it('wraps the calculated-goal view in a card and gives the toggle a secondary style', () => {
    render(<CalorieGoalEditor profile={calculableProfile} onUpdate={vi.fn()} />)

    expect(screen.getByText(/Berechnetes Tagesziel/).closest('div')).toHaveClass(
      'bg-surface',
      'rounded-3xl',
    )
    const toggle = screen.getByRole('button', { name: 'Manuell festlegen' })
    expect(toggle).toHaveClass('rounded-2xl')
    expect(toggle).not.toHaveClass('bg-accent')
  })
```

Und am Ende der Datei, nach dem letzten bestehenden Test (`'starts in manual mode and switches to calculated on request'`), vor der schließenden `})`:

```tsx

  it('wraps the manual-goal view in a card too', () => {
    const manualProfile = { ...calculableProfile, taegliches_kalorienziel: 1800 }
    render(<CalorieGoalEditor profile={manualProfile} onUpdate={vi.fn()} />)

    expect(screen.getByLabelText('Tagesziel (kcal)').closest('div')).toHaveClass(
      'bg-surface',
      'rounded-3xl',
    )
    expect(screen.getByRole('button', { name: 'Berechnen lassen' })).not.toHaveClass('bg-accent')
  })
```

- [ ] **Step 2: Lauf die Tests, um das Fehlschlagen zu bestätigen**

Run: `npx vitest run src/components/CalorieGoalEditor.test.tsx`
Expected: FAIL — die zwei neuen Tests schlagen fehl, die vier bestehenden bleiben grün

- [ ] **Step 3: Implementiere die Änderung**

In `src/components/CalorieGoalEditor.tsx`, ändere:
```tsx
import { useState } from 'react'
import type { Profile } from '../hooks/use-profile'
import { calculateCalorieGoal } from '../lib/nutrition-goal'
```
zu:
```tsx
import { useState } from 'react'
import type { Profile } from '../hooks/use-profile'
import { calculateCalorieGoal } from '../lib/nutrition-goal'
import { cardClass, buttonSecondaryClass } from '../lib/ui-classes'
```

Ändere:
```tsx
  if (mode === 'calculated') {
    return (
      <div>
        <p>
          {calculated != null
            ? `Berechnetes Tagesziel: ${calculated} kcal`
            : 'Profil vervollständigen (Gewicht, Größe, Alter, Geschlecht, Aktivitätslevel), um ein Ziel zu berechnen.'}
        </p>
        {failed && <p role="alert">Ziel konnte nicht gespeichert werden.</p>}
        <button type="button" onClick={switchToManual}>
          Manuell festlegen
        </button>
      </div>
    )
  }

  return (
    <div>
      <label>
        Tagesziel (kcal)
        <input
          type="number"
          step="any"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitManual}
        />
      </label>
      {failed && <p role="alert">Ziel konnte nicht gespeichert werden.</p>}
      <button type="button" onClick={switchToCalculated}>
        Berechnen lassen
      </button>
    </div>
  )
```
zu:
```tsx
  if (mode === 'calculated') {
    return (
      <div className={cardClass}>
        <p>
          {calculated != null
            ? `Berechnetes Tagesziel: ${calculated} kcal`
            : 'Profil vervollständigen (Gewicht, Größe, Alter, Geschlecht, Aktivitätslevel), um ein Ziel zu berechnen.'}
        </p>
        {failed && <p role="alert">Ziel konnte nicht gespeichert werden.</p>}
        <button type="button" className={buttonSecondaryClass} onClick={switchToManual}>
          Manuell festlegen
        </button>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <label>
        Tagesziel (kcal)
        <input
          type="number"
          step="any"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitManual}
        />
      </label>
      {failed && <p role="alert">Ziel konnte nicht gespeichert werden.</p>}
      <button type="button" className={buttonSecondaryClass} onClick={switchToCalculated}>
        Berechnen lassen
      </button>
    </div>
  )
```

- [ ] **Step 4: Lauf die Tests erneut, um das Bestehen zu bestätigen**

Run: `npx vitest run src/components/CalorieGoalEditor.test.tsx`
Expected: PASS (6 Tests)

- [ ] **Step 5: Lauf die volle Testsuite (Regressionscheck)**

Run: `npm test -- --run`
Expected: alle Tests grün — insbesondere `ProfilePage.test.tsx`, das `CalorieGoalEditor` einbettet, aber nur auf Text/Rollen prüft, nicht auf dessen interne Klassen

- [ ] **Step 6: Lint und Typecheck**

Run: `npm run lint && npx tsc -b --noEmit`
Expected: keine Fehler

- [ ] **Step 7: Commit**

```bash
git add src/components/CalorieGoalEditor.tsx src/components/CalorieGoalEditor.test.tsx
git commit -m "feat: CalorieGoalEditor auf Karte und Button-Klasse heben"
```

---

### Task 3: Abschluss

**Files:**
- Modify: `docs/domaenenmodell.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nichts Neues — reine Verifikation und Dokumentation des bereits umgesetzten Stands.
- Produces: nichts, das andere Tasks konsumieren — letzter Task dieses Plans.

- [ ] **Step 1: Volle Testsuite, Lint, Typecheck, Build**

Run: `npm test -- --run && npm run lint && npx tsc -b --noEmit && npm run build`
Expected: alle vier Schritte grün. Bundle-Zahlen notieren (keine neue Abhängigkeit, keine neue Datei — nur Klassenänderungen an zwei bestehenden Dateien).

- [ ] **Step 2: `docs/domaenenmodell.md` prüfen**

Kurz gegen den aktuellen Stand prüfen — dieser Plan fasst kein DB-Schema an (reine Frontend-CSS/Klassen-Änderung), letzte Migration bleibt `0007`. Keine Änderung vornehmen, falls das schon stimmt.

- [ ] **Step 3: `CLAUDE.md` aktualisieren**

Im Abschnitt „Status / Fortschritt" einen neuen Absatz „Phase-6-Nachschärfung Plan 2 (Profil nachziehen)" ergänzen: Spec-Pfad, Plan-Pfad, Kurzbeschreibung (`ProfilePage`/`CalorieGoalEditor` auf `cardClass`/`buttonPrimaryClass`/`buttonSecondaryClass` gehoben, Detector-Fund „zu lange Zeile" auf `/profile` durch `max-w-prose` behoben), Bundle-Zahlen aus Step 1. Explizit und wahrheitsgemäß festhalten: **Code auf dem Branch fertig und reviewt, noch nicht gemerged. Re-Verifikation gegen die Live-App (impeccable detect auf `/profile` + manuelle Browser-Prüfung) steht nach Merge und Deploy noch aus** — genau wie bei Plan 1 kann das aus dem Worktree heraus nicht laufen (kein echtes `.env`). „Genau hier weitermachen" entsprechend aktualisieren.

- [ ] **Step 4: Commit**

```bash
git add docs/domaenenmodell.md CLAUDE.md
git commit -m "docs: Plan 2 (Profil) Abschluss - Status nachziehen"
```

---

## Self-Review

**Spec-Abdeckung.** „ProfilePage.tsx, CalorieGoalEditor.tsx auf cardClass/buttonPrimaryClass/buttonSecondaryClass heben" → Task 1 + Task 2, exakt nach dem `BodyEntryForm`-Vorbild. „Detector meldete zusätzlich eine zu lange Zeile (~122 Zeichen) im Mahlzeiten-Hilfetext — im selben Rutsch umbrechen" → Task 1, `max-w-prose` auf dem Hilfetext-`<p>` (Breitenbeschränkung statt Textänderung, da der Text selbst nicht zu lang ist, nur der Container zu breit).

**Bewusste Entscheidung, hier dokumentiert:** `CalorieGoalEditor`s beide Toggle-Buttons („Manuell festlegen", „Berechnen lassen") bekommen `buttonSecondaryClass`, nicht `buttonPrimaryClass` — keiner der beiden ist ein Submit/eine Haupt-Aktion, beide sind gleichrangige Moduswechsel (das eigentliche Speichern passiert automatisch `onBlur`, ohne eigenen Button). `ProfilePage`s Logout-Button bekommt ebenfalls `buttonSecondaryClass` — kein neuer „destruktiver" Button-Stil existiert im Design-System, und Logout ist keine irreversible/gefährliche Aktion wie ein Löschen.

**Testkonsistenz.** Beide neuen Tests je Datei prüfen den tatsächlichen gerenderten `className` (`toHaveClass`), nicht den Quelltext — konsistent mit der seit Phase 6 etablierten Konvention (siehe `ChartFrame.test.tsx`, `ui-classes.test.ts`). `closest('div')` funktioniert zuverlässig, weil das nächste `<div>`-Element ab dem Input/Text-Knoten aufwärts genau der neu eingefügte `cardClass`-Container ist — kein anderes `<div>` liegt dazwischen.

**Platzhalter-Durchgang.** Kein „TBD", kein „analog zu Task N" ohne ausgeschriebenen Code — jeder Schritt zeigt den exakten Vorher/Nachher-Block, inklusive der vollständigen `LoadedProfileForm`-Return-Anweisung in Task 1 (dort bewusst als ein großer Block statt vieler kleiner Diffs, weil die Einrückung der gesamten Feldgruppe sich durch das neue `<div>` um eine Ebene verschiebt).

**Bewusst offen gelassen für diesen Plan:** die nativen `<input>`/`<select>`-Elemente bleiben unverändert unstyled — kein Input-Styling existiert im gesamten bisherigen Code, das wäre eine neue, vom Befund nicht geforderte Design-Entscheidung. Mit diesem Plan sind zwei der drei Nachschärfungs-Pläne abgeschlossen — Plan 3 (Wall-of-Options: Übungsliste-Filter, Ernährungs-Button-Hierarchie) ist der letzte.

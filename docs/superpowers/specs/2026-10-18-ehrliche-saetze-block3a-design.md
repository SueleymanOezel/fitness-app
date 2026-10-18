# Block 3a – Ehrliche Sätze und deutsche Übungsnamen

Stand: 18.10.2026 · Herkunft: Mobile-Audit vom 13.10.2026 (`.impeccable/critique/2026-10-13T20-53-41Z__vitaloop-web-app.md`) · Block 3 („ehrliche Daten/Logik“) ist in drei Zyklen geteilt: **3a Training (dieses Dokument)**, 3b Löschen und Körper-Datum, 3c 404, Login-Fehler, `aria-label`.

## Ziel

Im Gym darf nichts still Falsches gespeichert werden, und ein Vertipper lässt sich im Moment des Fehlers korrigieren. Konkret: kein Satz ohne Wiederholungen, erfasste Sätze der laufenden Session sind korrigierbar (inklusive Aufwärmsätzen), und Übungsnamen erscheinen überall auf Deutsch.

## Entscheidungen aus dem Brainstorming

1. **Satz-Regel:** Wiederholungen sind Pflicht, ganzzahlig und mindestens 1. Das Gewicht ist optional (Eigengewicht-Übungen) und mindestens 0. Gilt beim Erfassen, beim Korrigieren in der Session und in der Historie.
2. **Korrektur in der Session:** Antippen einer Zeile in „Erfasste Sätze“ öffnet einen Dialog (Gewicht, Wiederholungen, RIR, Aufwärmsatz, Speichern/Abbrechen).
3. **Aufwärmsätze werden als Zeilen sichtbar** („Aufw.“ statt Nummer), sonst wären sie nicht korrigierbar. Arbeitssätze zählen weiter 1, 2, 3; „Satz 2 von 3“ bleibt unverändert.
4. **Aufbau:** eine gemeinsame reine Validierungsfunktion plus ein Dialog. Die Historie behält ihre blur-getriebenen Felder, nutzt aber dieselbe Regel.
5. **Löschen eines einzelnen Satzes gehört zu 3b** (einheitliches Lösch-Muster), nicht hierher.

## Nicht-Ziele

Löschen von Sätzen, Plänen, Einträgen (3b); Datenbank-Constraint auf `wiederholungen` (bestehende Zeilen mit `null` blieben ungültig, keine Migration in diesem Zyklus); Umbau der Historie auf den Dialog; 404, Login-Fehlertexte (3c).

## Bausteine

### `src/lib/set-values.ts`
`parseSetInput(gewicht: string, wiederholungen: string)` liefert `{ ok: true; values: { gewicht: number | null; wiederholungen: number } }` oder `{ ok: false; fehler: { gewicht?: string; wiederholungen?: string } }`. Zahlen über das vorhandene `parseDecimal` (Komma und Punkt). Regeln:
- Wiederholungen: leer, `0`, negativ, nicht ganzzahlig oder keine Zahl → Meldung „Bitte Wiederholungen angeben (ganze Zahl, mindestens 1).“
- Gewicht: leer ist erlaubt (`null`); negativ oder keine Zahl → „Gewicht als Zahl ab 0 eingeben, z. B. 22,5.“ (vorhandener Wortlaut).
- Beide Felder werden geprüft; `fehler` enthält alle zutreffenden Meldungen.

### `SetForm` (Erfassen, `WorkoutSessionPage.tsx`)
Die vorhandene Inline-Prüfung wird durch `parseSetInput` ersetzt. Die Fehlermeldungen kommen aus `fehler` (Text statt Boolean). Verhalten sonst unverändert (Felder werden nur nach gespeichertem Satz geleert, Aufwärm-Schalter springt zurück, RIR löschbar).

### `RirChips` (geteilte Komponente)
Die RIR-Chip-Reihe (0–5, „5+“, erneutes Tippen löscht) wird aus `SetForm` in eine eigene Komponente gezogen und von `SetForm` und `SetEditDialog` benutzt.

### `SetEditDialog` (`src/components/SetEditDialog.tsx`)
Props: `open`, `onClose`, `set` (der Satz oder `null`), `onSave(values)`. `Dialog` hält seine Kinder gemountet, deshalb wird das Formular nur bei `open && set` gerendert (frische Vorbelegung bei jedem Öffnen, wie in den bestehenden Dialogen). Felder: Gewicht, Wiederholungen (vorbelegt aus dem Satz), `RirChips`, Aufwärmsatz-Checkbox. Speichern ruft `parseSetInput`; bei Fehlern erscheinen die Meldungen im Dialog, bei einem fehlgeschlagenen Schreibvorgang eine inline-Meldung „Satz konnte nicht gespeichert werden.“ (Dialog-Regel: kein Toast hinter dem offenen Dialog). Bei Erfolg schließt der Dialog.

### Tabelle „Erfasste Sätze“ (`LoggedSets`)
- Alle Sätze der Übung stehen in der Tabelle, nach `satz_nummer`. Arbeitssätze tragen die laufende Nummer 1, 2, 3; Aufwärmsätze „Aufw.“ in gedämpfter Farbe. Die Zählzeile „N Aufwärmsätze“ entfällt (sie steckt in den Zeilen).
- Jede Zeile ist antippbar: `onClick` auf dem `<tr>` öffnet den Dialog; in der ersten Zelle sitzt ein `Pressable` (bare, `type="button"`, mindestens 44 px, `aria-label` „Satz 2 bearbeiten“) ohne eigenen Handler, dessen Klick zum `<tr>` aufsteigt (Tastatur und Screenreader erreichen die Zeile).
- Die Tabelle bleibt eine `<table aria-label="Erfasste Sätze">`; die Einblend-Animation für neu erfasste Sätze (`.row-in`) bleibt.
- `useWorkoutSession.updateSet` existiert bereits (`Partial<Pick<SessionSet, 'gewicht' | 'wiederholungen' | 'rir' | 'ist_aufwaermsatz'>>`) und lädt neu; der Dialog nutzt es unverändert.

### Historie (`TrainingHistoryDetailPage`, `SetField`)
Das Feld „Wiederholungen“ darf nicht mehr geleert oder auf 0 gesetzt werden: `SetField` bekommt eine Option `required` (für Wiederholungen), die einen leeren Wert, `0` oder einen ungültigen Wert ablehnt, den gespeicherten Wert wieder einsetzt **und eine Feldmeldung zeigt** (dieselbe Meldung wie in `set-values.ts`, aus dort exportierter Konstante). Gewicht und RIR bleiben wie bisher (leer erlaubt). Kein Umbau auf den Dialog.

### Deutsche Übungsnamen
- Neue Funktion `exerciseName(e: { name: string; name_de: string | null } | null | undefined): string` (`src/lib/exercise-name.ts`), Fallback leer.
- `TrainingHistoryDetailPage.tsx:68`: `set.exercise?.name` → `exerciseName(set.exercise)`.
- Analyse: einzige Quelle ist `use-training-analysis.ts` (Embed `exercises(name, muskelgruppen_primaer)` und `exercise_name: row.exercises?.name ?? UNBEKANNTE_UEBUNG`): der Embed lädt zusätzlich `name_de`, `exercise_name` wird `exerciseName(row.exercises) || UNBEKANNTE_UEBUNG`. Alle Graphen (Übungsauswahl, Titel, PR-Liste T8, Legenden) erben das über `AnalysisSet.exercise_name`.
- Ein Strukturtest sperrt, dass in `src/pages` und `src/components` kein `exercise?.name` / `exercise.name` ohne `name_de` mehr gelesen wird (Allowlist für Stellen mit eigenem Fallback wie `name_de ?? name`).

## Tests

- `set-values.test.ts`: leer, `0`, negativ, `2,5`, `abc`, Gewicht leer, Gewicht negativ, Komma beim Gewicht, beide Felder falsch, Wiederholungen mit Leerzeichen.
- `SetForm` (Session-Seitentest): leerer Satz wird abgelehnt, Meldung sichtbar, `logSet` nicht aufgerufen; Gewicht leer + Wiederholungen 8 wird gespeichert (`gewicht: null`).
- `SetEditDialog`: Vorbelegung, Ändern und Speichern ruft `updateSet` mit den geänderten Feldern, Validierungsmeldung im Dialog, fehlgeschlagenes Speichern bleibt offen mit inline-Meldung, geschlossen rendert nichts.
- `LoggedSets`/Session: Aufwärmsatz erscheint als Zeile „Aufw.“, Arbeitssatz-Nummerierung bleibt 1, 2, 3 trotz Aufwärmsatz davor, Zeile antippen öffnet den Dialog, Tastatur-Button öffnet ihn ebenfalls.
- Historie: Wiederholungen leeren/0 wird abgelehnt, Wert zurückgesetzt, Meldung sichtbar; Namen deutsch.
- Analyse: `use-training-analysis` liefert `exercise_name` aus `name_de`, Fallback auf `name`, dann `UNBEKANNTE_UEBUNG`.
- Vor Merge: Volllauf, Lint, `tsc`, Build (kein GSAP im Entry), Sicht-Prüfung bei 390 px (Dialog, Aufwärmzeile, Meldung), Review plus Scoped Re-Review, `codex review` als Zweitmeinung.

## Risiken

- Bestehende Sätze mit `wiederholungen = null` oder `0` bleiben in der Historie sichtbar; ein Korrekturversuch verlangt dann eine gültige Zahl. Das ist gewollt (ehrliche Daten), wird nicht migriert.
- Aufwärmsätze als Zeilen ändern das Bild der Session leicht; die Zählung „Satz N von M“ darf sich nicht verschieben (eigener Test).
- Die Zeilen-Klickfläche am `<tr>` mit Button-Bubbling muss einen Doppelauslöser vermeiden (der Button hat bewusst keinen Handler).
- Kein Schema betroffen; `docs/domaenenmodell.md` bleibt unverändert.

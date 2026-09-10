# Übungsdetails (Bild, Anleitung, Schwierigkeitsgrad) – Design

**Spec-Datum:** 10.09.2026

## Ziel

Erste Hälfte der beiden Feature-Wünsche aus dem Absatz „Critique-Re-Run + Feature-Wünsche" in `CLAUDE.md`: Bilder pro Übung anzeigen, auf eine Übung klicken und Beschreibung/Ausführung sowie den Schwierigkeitsgrad sehen. Die zweite Hälfte — Freitext-Übersetzung von Namen und Instructions über eine neue Gemini-Anbindung — ist ein eigenes, späteres Vorhaben und **nicht** Teil dieser Spec (siehe „Bewusst außen vor").

## Ausgangslage

- `exercises.bild_url` existiert bereits seit `0001_initial_schema.sql` und wird von `scripts/import-exercises.ts` befüllt (erstes Bild aus `free-exercise-db`, GitHub-gehostet), wird aber aktuell nirgends im UI angezeigt — `ExercisesPage.tsx` rendert nur `exercise.name`.
- Die Rohquelle `scripts/free-exercise-db.json` hat pro Übung zusätzlich `instructions` (Array von Schritt-Sätzen, 868 von 873 Übungen haben mindestens einen Eintrag) und `level` (`beginner`/`intermediate`/`expert`, alle 873 Übungen haben einen Wert) — beide werden beim Import verworfen, keine Spalte in `exercises`.
- Muskelgruppen- und Geräte-Werte werden bereits über statische Mapping-Module übersetzt (`src/lib/muscle-group-labels.ts`, `src/lib/equipment-labels.ts`), jeweils mit Fallback auf den Rohwert für unbekannte Werte. `level` ist mit 3 Werten eine ebenso kleine, feste Vokabel — bekommt dasselbe Muster, ist **keine** Freitext-Übersetzung.
- Die App ist noch nicht produktiv im Einsatz (Nutzer-Bestätigung, 10.09.2026) — ein Re-Import über das bestehende Delete-Reinsert-Verfahren in `replaceImportedExercises` ist ohne Risiko für existierende Trainingspläne, obwohl `workout_plan_day_exercises.exercise_id` ohne `ON DELETE CASCADE` auf `exercises.id` verweist. Diese Einschränkung bleibt für später vorgemerkt, falls das Skript nach Produktivstart erneut laufen muss.
- Bestehendes `Dialog`-Muster (`src/components/Dialog.tsx`, verwendet für „Eigene Übung anlegen" auf derselben Seite) wird für die Detailansicht wiederverwendet — der Nutzer möchte ausdrücklich ein Popup, keine neue Route.

## Datenmodell

Neue Migration `supabase/migrations/0008_exercise_details.sql`, additiv, nullable, ohne Check-Constraint — gleiches Muster wie `kategorie`/`equipment` (offene Werte, Übersetzung mit Fallback passiert im Frontend, nicht in der DB erzwungen):

```sql
alter table public.exercises
  add column anleitung text[],
  add column schwierigkeitsgrad text;
```

`docs/domaenenmodell.md` wird um die beiden neuen Spalten in der `exercises`-Tabelle ergänzt.

Neues `src/lib/level-labels.ts`, identisches Muster zu `muscle-group-labels.ts`:

```ts
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Anfänger',
  intermediate: 'Fortgeschritten',
  expert: 'Experte',
}

export function levelLabel(value: string): string {
  return LEVEL_LABEL[value] ?? value
}
```

## Import-Skript

`RawExercise`-Typ in `scripts/import-exercises.ts` um `instructions: string[]` und `level: string` erweitert. `toExerciseRow` liest beide zusätzlich aus:

```ts
anleitung: raw.instructions.length > 0 ? raw.instructions : null,
schwierigkeitsgrad: raw.level,
```

`replaceImportedExercises` bleibt unverändert. Nach der Codeänderung einmal `npm run import-exercises` gegen die echte Supabase-Instanz laufen lassen, um die 873 bestehenden Zeilen mit den neuen Feldern zu befüllen (Voraussetzung: Migration `0008` ist vorher angewendet).

## UI — Liste

`ExercisesPage.tsx`: jede Zeile bekommt links ein 48×48px-Vorschaubild (`exercise.bild_url`, `object-cover`, abgerundet, direkt von GitHub gehotlinkt — keine eigene Bildablage, `alt=""` da der Name daneben ohnehin als Text steht — ein zweites Mal denselben Namen im `alt` vorzulesen wäre für Screenreader-Nutzer nur Rauschen). Fehlt `bild_url`, zeigt stattdessen `<VitaIcon name="exercises" tone="mono" />` an derselben Stelle (kein Layout-Sprung zwischen Zeilen mit/ohne Bild). Die bisherige `<div className={cardClass}>` pro Zeile wird zu einem klickbaren `<button type="button">` innerhalb des `<li>` (öffnet den Detail-Dialog), Bild und Name liegen nebeneinander in einem Flex-Container.

## UI — Detail-Dialog

Wiederverwendung von `Dialog` (identisches Muster zu `NewExerciseForm`). Inhalt ist rein additiv zu dem, was die jeweilige Übung tatsächlich hat — keine leeren Sektionen:

- Bild oben, nur falls `bild_url` gesetzt (`alt={exercise.name}` — hier steht der Name nicht zusätzlich als Text daneben, anders als in der Liste).
- Name als Überschrift (`<h2>`).
- Chip-Zeile für Muskelgruppe(n) (`muskelgruppeLabel`, aus `muskelgruppen_primaer`) und Gerät (`equipmentLabel`, aus `equipment`), jeweils nur falls vorhanden.
- Schwierigkeitsgrad als Text (`levelLabel`), nur falls `schwierigkeitsgrad` gesetzt.
- Anleitung als `<ol>`, ein `<li>` je Eintrag in `anleitung`, nur falls gesetzt und nicht leer. Fehlt sie (5 der 873 importierten Übungen, oder eine ältere eigene Übung ohne Anleitung), erscheint stattdessen der Text „Keine Anleitung hinterlegt."

Eine minimale eigene Übung (nur Name/Kategorie/MET, vor dieser Änderung angelegt) zeigt im Dialog entsprechend nur Name und MET-Wert — kein Bruch, nur weniger Inhalt.

Neue Komponente `ExerciseDetailDialog.tsx` (eigene Datei statt Inline-JSX in `ExercisesPage.tsx`, da der Dialog-Inhalt mit den bedingten Sektionen sonst die ohnehin schon zwei Verantwortlichkeiten tragende `ExercisesList`-Funktion weiter aufbläht).

## UI — Formular „Eigene Übung anlegen" erweitern

`NewExerciseForm` bekommt drei neue optionale Felder, alle als schlichte Text-Eingaben — gleiches Muster wie die bestehenden Kategorie-/MET-Felder, kein neuer Eingabe-Typ:

- **Bild-URL** (`<input>`, optional).
- **Schwierigkeitsgrad** (`<input>`, optional, bewusst kein Dropdown — konsistent zu `Kategorie`, das ebenfalls freier Text statt fester Auswahl ist; `levelLabel()` zeigt einen abweichenden Wert einfach unübersetzt).
- **Anleitung** (`<textarea>`, optional, eine Zeile = ein Schritt; beim Speichern per `\n` gesplittet, leere Zeilen gefiltert, Ergebnis `undefined` statt leerem Array, wenn nach dem Filtern nichts übrig bleibt).

`NewExercise`-Typ in `src/hooks/use-exercises.ts` um `bild_url?: string`, `anleitung?: string[]`, `schwierigkeitsgrad?: string` erweitert (das bestehende Muster optionaler Zusatzfelder — analog zu `equipment`/`muskelgruppen_primaer`/`muskelgruppen_sekundaer`, die dort schon existieren, aber von keinem Formular genutzt werden).

## Tests

- `supabase/migrations/0008_exercise_details.test.ts`: Text-Regex-Checks analog zu `0005_analysis_fields.test.ts` (beide Spalten additiv, nullable, kein Check-Constraint, keine andere Tabelle/Policy berührt).
- `level-labels.test.ts`: alle 3 Werte übersetzt + Fallback (analog zu `muscle-group-labels.test.ts`).
- Import-Skript-Tests (falls bereits vorhanden für `toExerciseRow`, sonst neu) um Fälle für `instructions`→`anleitung` (inkl. leeres Array → `null`) und `level`→`schwierigkeitsgrad` erweitert.
- `ExercisesPage.test.tsx`: Thumbnail-Rendering mit/ohne `bild_url`, Klick auf eine Zeile öffnet den Dialog mit den erwarteten Inhalten, Dialog ohne Anleitung/Schwierigkeitsgrad zeigt den reduzierten Zustand, Formular-Tests um die drei neuen Felder erweitert (inkl. Zeilenumbruch-Split für Anleitung, inkl. Fall „nur Leerzeilen eingegeben").

## Bewusst außen vor

- Keine Übersetzung von Namen oder Instructions (Freitext, ~4000 Sätze) — eigenes, späteres Vorhaben mit eigener Gemini-Integration und eigener Kosten-/Qualitätsentscheidung.
- Kein zweites Bild pro Übung — weiterhin nur `images[0]` wie im bestehenden Import.
- Kein Dropdown für Schwierigkeitsgrad, weder im Formular noch als DB-Check-Constraint.
- Keine Änderung an `replaceImportedExercises` (Delete+Reinsert bleibt, da unkritisch vor Produktivstart).
- Keine neue Route — die Detailansicht ist ausschließlich das Popup.

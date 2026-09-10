# Übungs-Übersetzung (Namen + Anleitung ins Deutsche) – Design

**Spec-Datum:** 11.09.2026

## Ziel

Zweite Hälfte des ursprünglichen Feature-Wunsches „Bilder, Beschreibung/Ausführung, Geräte-Filter, deutsche Übersetzung" (siehe `CLAUDE.md`, Absatz „Critique-Re-Run + Feature-Wünsche"). Die 873 Übungsnamen und die zugehörigen Anleitungs-Sätze aus `free-exercise-db` sind komplett Englisch — Muskelgruppen, Geräte und Schwierigkeitsgrad sind bereits übersetzt (feste, kleine Vokabulare über statische Mapping-Module), Namen und Anleitung sind dagegen echter Freitext ohne festes Vokabular und brauchen eine externe Übersetzung.

## Ausgangslage

- `exercises.name` (873 Zeilen) und `exercises.anleitung` (Migration `0008`, PR #58) stehen aktuell im rohen Englisch in der DB.
- Genaue Zahlen (ermittelt gegen `scripts/free-exercise-db.json`): 3.722 Anleitungs-Sätze über alle 873 Übungen, **3.884 einzigartige Strings** (Name + Anleitungs-Satz) nach Deduplizierung — viele Sätze wie „Repeat for the recommended amount of repetitions." wiederholen sich wortgleich über mehrere Übungen. Das entspricht **~511.000 Zeichen** (ohne Dedup: ~588.000).
- Es existiert noch keine Übersetzungs-Anbindung im Projekt. Gemini ist laut Tech-Stack für die spätere Foto-Analyse-Phase vorgesehen, ist aber ein Allzweck-LLM und für reine Satzübersetzung nicht die beste Wahl.
- **Nutzer-Entscheidung (11.09.2026):** DeepL API statt Gemini — dedizierter Übersetzungsdienst, Qualitätsstandard fürs Deutsche. Freier Tarif (500.000 Zeichen/Monat) statt bezahltem Pro-Tarif, obwohl die ~511.000 Zeichen das knapp (~2%) überschreiten — das Skript ist wiederaufnehmbar, der kleine Rest läuft einfach im nächsten Monat mit.
- **Nutzer-Entscheidung:** beides übersetzen (Namen **und** Anleitung), nicht nur eines von beidem — konsistent zur bereits komplett deutschen übrigen UI.
- Muster für „bereits importierte Referenzdaten einmalig anreichern" existiert bereits: `scripts/import-exercises.ts` (Delete+Reinsert der 873 Zeilen bei jedem Lauf, mit `created_by = null`-Filter als Markierung für importierte vs. eigene Übungen).

## Datenmodell

Neue Migration `supabase/migrations/0009_exercise_translations.sql`, additiv, nullable, ohne Check-Constraint (gleiches Muster wie `0008`):

```sql
alter table public.exercises
  add column name_de text,
  add column anleitung_de text[];
```

Gilt konzeptionell nur für die importierte Bibliothek (`created_by is null`) — eigene Übungen bleiben unangetastet, ihr Name/ihre Anleitung steht ja bereits in der vom Nutzer gewählten Sprache. `docs/domaenenmodell.md` wird um die zwei neuen Spalten in der `exercises`-Tabelle ergänzt.

## Übersetzungs-Skript

Neues `scripts/translate-exercises.ts`, manuell per `npm run translate-exercises` ausgeführt (eigenes, von `import-exercises.ts` entkoppeltes Skript — nicht Teil des Import-Laufs). Braucht `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (wie `import-exercises.ts`) sowie neu `DEEPL_API_KEY`, alle drei als Shell-Env-Variablen, keine davon in `.env` (Node lädt `.env` nicht automatisch). `.env.example` bekommt eine `DEEPL_API_KEY=`-Platzhalterzeile.

**Ablauf:**

1. Lädt alle Zeilen mit `created_by is null` und (`name_de is null` **oder** (`anleitung is not null` **und** `anleitung_de is null`)) — das filtert bereits vollständig übersetzte Zeilen heraus, macht das Skript wiederaufnehmbar.
2. Sammelt aus diesen Zeilen alle **einzigartigen** Strings (jeder `name` und jeder Satz aus `anleitung`) in einem `Set<string>`.
3. Übersetzt die einzigartigen Strings in Batches (z. B. 50 pro Request) gegen `https://api-free.deepl.com/v2/translate` (`target_lang=DE`), per nativem `fetch` — **kein neues npm-Paket**, DeepLs REST-API ist ohne SDK nutzbar. Ergebnis läuft in eine `Map<string, string>`.
4. Für jede zu übersetzende Zeile: `name_de` wird gesetzt, sobald `translations.has(name)`. `anleitung_de` wird **nur** gesetzt, wenn für **jeden** Satz in `anleitung` eine Übersetzung in der Map vorhanden ist (kein Array mit gemischt deutschen/englischen Sätzen) — sonst bleibt `anleitung_de` für diesen Lauf `null` und wird beim nächsten Lauf erneut versucht.
5. Schreibt jede vollständige Zeile per `update ... where id = ...` zurück (kein Delete+Reinsert — die Zeilen-IDs bleiben unangetastet, das ist unabhängig von `replaceImportedExercises`).
6. Trifft die DeepL-API einen Kontingent-Fehler (HTTP 456), bricht das Skript sauber ab und meldet, wie viele von wie vielen Zeilen bereits aktualisiert wurden — ein erneuter Lauf (z. B. im nächsten Monat) übersetzt einfach den Rest, ohne bereits Erledigtes zu wiederholen.

## Frontend-Anzeige

Überall, wo aktuell `exercise.name` oder `exercise.anleitung` direkt gelesen wird (`ExercisesPage.tsx`: Liste, Suche; `ExerciseDetailDialog.tsx`: Titel, Anleitungs-Liste), wird stattdessen der übersetzte Wert mit Fallback auf Englisch verwendet: `exercise.name_de ?? exercise.name`, `exercise.anleitung_de ?? exercise.anleitung`. Das greift automatisch für drei Fälle einheitlich: eine frisch importierte, noch nicht übersetzte Zeile; eine Zeile, deren Anleitung aus Kontingent-Gründen erst teilweise übersetzt ist; und eine eigene (nie zu übersetzende) Übung.

Die Namenssuche in `ExercisesPage.tsx` filtert auf denselben angezeigten Wert (`name_de ?? name`), damit eine deutsche Sucheingabe auch bei bereits übersetzten Übungen Treffer liefert.

`Exercise`-Typ in `src/hooks/use-exercises.ts` um `name_de: string | null` und `anleitung_de: string[] | null` erweitert (gleiches Muster wie `anleitung`/`schwierigkeitsgrad` in Migration `0008`).

## Tests

- `supabase/migrations/0009_exercise_translations.test.ts`: Text-Regex-Checks analog zu `0008_exercise_details.test.ts` (additiv, nullable, kein Check-Constraint, keine andere Tabelle/Policy berührt).
- `translate-exercises.ts` bekommt reine, ohne Netzwerk testbare Funktionen (gleiches Muster wie `toExerciseRow` in `import-exercises.ts`): eine Funktion, die aus einer Liste Übungen die Menge der einzigartigen zu übersetzenden Strings ermittelt, und eine Funktion, die aus einer Übung + der Übersetzungs-`Map` das Update-Objekt baut (inkl. der „nur bei vollständiger Anleitung setzen"-Regel). Die DeepL-Anfrage und das Supabase-Update sind dünne, injizierbare I/O-Funktionen (wie `ImportClient` in `import-exercises.ts`), in den Tests gemockt.
- `ExercisesPage.test.tsx`/`ExerciseDetailDialog.test.tsx`: Fälle für „zeigt `name_de`/`anleitung_de`, wenn vorhanden", „fällt auf Englisch zurück, wenn nicht vorhanden" (inkl. des Teil-Falls: `anleitung_de` fehlt, `name_de` aber vorhanden), „Suche findet eine Übung über den deutschen Namen".

## Bewusst außen vor

- Keine automatische Neu-Übersetzung, falls sich die englische Rohquelle künftig ändert — gleiche „One-off-Seed"-Haltung wie beim bestehenden Import (`created_by = null`-Zeilen sind Seed-Daten, keine laufend synchronisierte Kopie).
- Keine Übersetzung eigener (nutzererstellter) Übungen.
- Kein UI-Trigger für die Übersetzung innerhalb der App — reines Kommandozeilen-Skript, manuell ausgeführt wie `import-exercises`.
- Keine persistente Cache-Datei zwischen Skript-Läufen — Wiederaufnehmbarkeit kommt ausschließlich aus dem DB-Zustand (`name_de`/`anleitung_de is null`), nicht aus einem separaten Cache-Artefakt.
- Keine Retry-/Backoff-Logik für einzelne fehlgeschlagene Batches über den sauberen Abbruch bei Kontingent-Fehler hinaus.
- Keine Änderung an `import-exercises.ts`/`replaceImportedExercises` — die Übersetzung ist ein komplett separates Skript.

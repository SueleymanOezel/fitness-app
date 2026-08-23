# Design: Phase 3 — Trainingsbereich

**Stand:** 2026-08-21
**Status:** entworfen, noch nicht umgesetzt

## Ausgangslage

`/training` ist bis heute ein Platzhalter. Die Trainings-Tabellen selbst existieren aber schon: `0001_initial_schema.sql` (Phase 1) hat das komplette Grundschema für alle vier Bereiche auf einmal angelegt, darunter `exercises`, `workout_plans`, `workout_plan_exercises`, `workout_sessions`, `workout_session_sets` — alle mit RLS, alle bereits auf Produktion. Sie sind seither ungenutzt, also ohne Datenrisiko änderbar.

Diese Phase füllt den Trainingsbereich: Übungsdatenbank importieren, Trainingspläne verwalten, Training live durchführen, Kalorienverbrauch berechnen, Verlauf einsehen.

## Ziele

1. Einmaliger Import der `free-exercise-db` in die bestehende `exercises`-Tabelle, mit MET-Wert pro Kategorie.
2. Eigene Übungen anlegen können, analog zur Produkt-Community-Datenbank aus der Ernährung.
3. Trainingspläne mit mehreren benannten Tagen (z. B. „Push"/„Pull"/„Legs"), je Tag eine geordnete Übungsliste mit Ziel-Sätzen/-Wiederholungen/Pausenzeit.
4. Automatische Rotation: die App merkt sich den zuletzt trainierten Tag je Plan und schlägt den nächsten vor.
5. Live-Trainingsmodus: Sätze erfassen, automatischer Pausen-Timer, automatischer Sprung zum nächsten Satz/zur nächsten Übung.
6. Kalorienberechnung über die MET-Formel nach Abschluss einer Session.
7. Trainingshistorie mit nachträglicher Korrektur einzelner Sätze.

## Nicht-Ziele

- Trainingstag/Restday-Kalender (`day_status`) und Home-Dashboard-Ausbau — eigenes Folgevorhaben.
- Drag-and-drop zum Sortieren — Hoch/Runter-Buttons genügen.
- Kalorienberechnung je Übung mit eigener Dauer — ein MET-Durchschnitt über die gesamte Session reicht.
- Persistieren des Pausen-Timer-Zielzeitpunkts in der Datenbank — überlebt kein Neuladen mitten in der Pause, aber abgeschlossene Sätze bleiben erhalten.
- Schwierigkeitsgrad/`level` aus `free-exercise-db` importieren — nicht in der bestehenden `exercises`-Tabelle vorgesehen, für MVP nicht nötig.
- Rückwirkende Neuberechnung von `gesamt_kalorien`, wenn sich der MET-Wert einer verwendeten Übung später ändert — Kalorien werden einmalig beim Session-Abschluss festgeschrieben.

## Datenmodell

**Migration `0004_training_days.sql`** — entwickelt die bestehenden, leeren Tabellen weiter statt sie parallel neu anzulegen:

| Änderung | Zweck |
| --- | --- |
| `create table workout_plan_days (id, workout_plan_id → workout_plans, name, reihenfolge)` | neue Zwischenebene für Mehrtages-Pläne |
| `workout_plan_exercises` → umbenennen in `workout_plan_day_exercises` | Übungen hängen jetzt am Tag, nicht am Plan |
| `workout_plan_day_exercises.workout_plan_id` → umbenennen in `workout_plan_day_id`, FK auf `workout_plan_days` | s.o. |
| RLS-Policy auf `workout_plan_day_exercises` neu, über `workout_plan_days` → `workout_plans` (zwei Ebenen `exists`) | Eigentümerkette um eine Stufe verlängert |
| `workout_sessions.workout_plan_id` → umbenennen in `workout_plan_day_id`, FK auf `workout_plan_days` | eine Session gehört zu einem konkreten Tag, der Plan ergibt sich daraus |
| `exercises`, `workout_session_sets` | unverändert — bestehende Struktur passt genau |

Alle neuen/geänderten Fremdschlüssel-Spalten bekommen einen Index (gleiches Muster wie die bestehenden RLS-Indizes in `0001`).

**Warum evolutionär statt neu.** Die Tabellen sind leer und ungenutzt; ein Rename plus Spalten-Umhängen ist risikofrei und vermeidet eine tote Karteileiche (`workout_plan_exercises` bliebe sonst als unbenutzte Alt-Tabelle stehen).

## Übungsimport

Einmaliges Skript `scripts/import-exercises.mjs`, außerhalb der App (kein Teil des Vite-Bundles):

1. `free-exercise-db`-JSON-Datensatz einmalig herunterladen und als Fixture unter `scripts/free-exercise-db.json` committen (gemeinfrei, kein Lizenzproblem) — macht den Import reproduzierbar und testbar, ohne Netzwerkzugriff im Skript selbst.
2. Eine kleine, exportierte, reine Funktion `metForCategory(category: string): number` bildet die im Datensatz vorkommenden `category`-Werte (laut Datensatz-Dokumentation z. B. `strength`, `cardio`, `stretching`, `plyometrics`, `powerlifting`, `strongman`, `olympic weightlifting` — exakte Liste wird beim Implementieren gegen die echte Datei verifiziert) auf einen MET-Wert ab. Diese Funktion ist testbar ohne Datenbank.
3. Das Skript liest die Fixture, mappt jeden Eintrag auf `{ name, kategorie: category, equipment, muskelgruppen_primaer: primaryMuscles, muskelgruppen_sekundaer: secondaryMuscles, bild_url, met_wert: metForCategory(category), created_by: null }` und `upsert`et in `exercises` (Konfliktschlüssel: `name`, damit ein erneuter Lauf keine Duplikate erzeugt).
4. Läuft mit dem Supabase **Service-Role-Key** (lokal per Umgebungsvariable übergeben, nie committet — wie in `.env`, nur nicht Teil der App), weil der Import `created_by = null` schreibt und das an der bestehenden `exercises_insert_own`-Policy (`created_by = auth.uid()`) sonst scheitern würde. Einmaliger, manueller Admin-Schritt, dokumentiert wie ein Migrationslauf.

**Eigene Übung anlegen** ist ein normales Formular (`ExercisesPage`), analog zu `ManualProductForm`: Name, Kategorie (Freitext, wie die übrigen Felder — keine kuratierte Auswahlliste, das wäre für ein einzelnes Textfeld unnötiger Aufwand), MET-Wert, Equipment und Muskelgruppen optional. Schreibt mit `created_by = auth.uid()` über die bereits bestehende `exercises_insert_own`-Policy — keine neue Policy nötig.

## Übungen durchsuchen

`ExercisesPage` (`/training/exercises`) listet alle Übungen (importiert + eigene, ununterschieden — geteilte Bibliothek wie bei `products`), durchsuchbar nach Name, filterbar nach Muskelgruppe/Equipment. Dient sowohl als eigenständige Nachschlageseite als auch — eingebettet — als Auswahlkomponente im Plan-Editor.

## Trainings-Dashboard

`/training` zeigt nur das Nötigste:
- Name des aktiven Plans, Anzahl Tage/Übungen
- Welcher Tag als Nächstes dran ist (siehe Rotation unten)
- „Training starten" — legt sofort eine `workout_sessions`-Zeile an (`gestartet_am = now()`, `workout_plan_day_id` = der ermittelte nächste Tag) und navigiert in den Live-Modus
- Link „Meine Pläne"

**Rotation.** `src/lib/next-training-day.ts`, reine Funktion:

```
nextTrainingDay(days: { id, reihenfolge }[], lastCompletedDayId: string | null) → Tag
```

Ohne vorherige Session (oder wenn der zuletzt trainierte Tag nicht mehr existiert) ist Tag 1 dran, sonst der nächste in `reihenfolge`, mit Umlauf ans Ende zurück auf Tag 1. `lastCompletedDayId` kommt aus der zuletzt **abgeschlossenen** (`beendet_am is not null`) Session zu diesem Plan.

## Planverwaltung

**„Meine Pläne" (`/training/plans`):** Liste aller Pläne, aktivieren, löschen, „Neuer Plan".

**„Plan bearbeiten" (`/training/plans/:id`):**
- Plan-Name
- Tage verwalten: hinzufügen, umbenennen, löschen, Hoch/Runter-Buttons für die Reihenfolge
- Je Tag: Übungsliste — Inline-Suche (aus derselben Datenquelle wie `ExercisesPage`) fügt eine Übung direkt zur Tages-Liste hinzu; pro Übung Ziel-Sätze, Ziel-Wiederholungen, Pausenzeit editierbar; Hoch/Runter-Buttons für die Übungs-Reihenfolge; Übung entfernen

Reihenfolge wird wie bei den Mahlzeiten-Abschnitten über eine explizite `reihenfolge`-Spalte gepflegt, nicht implizit über Einfügereihenfolge — Hoch/Runter tauscht zwei benachbarte Werte.

## Live-Trainingsmodus

`/training/session/:sessionId`:

- Übungsliste des Tages, sortiert nach `reihenfolge`
- Klick auf eine Übung öffnet sie: Ziel-Sätze als Zeilen, je Zeile Gewicht + Wiederholungen eintragen, „Satz abschließen"
- Jeder abgeschlossene Satz wird **sofort** als `workout_session_sets`-Insert geschrieben (`abgeschlossen_am = now()`) — kein Sammeln im Client-State, gleiches Prinzip wie bei den Ernährungs-Einträgen. Geht der Tab mitten im Training verloren, sind nur die noch nicht abgeschlossenen Sätze weg.
- Nach Satzabschluss startet ein Pausen-Timer, Default aus `pausenzeit_sekunden` der Übung, vor dem Start editierbar. Intern gespeichert als Zielzeitpunkt (`Date.now() + Sekunden`), nicht als reiner Sekunden-Countdown — übersteht so Tab-Wechsel oder Bildschirmsperre, weil bei jedem Render aus der Wanduhr statt aus einer Tick-Zählung neu berechnet wird.
- Nach Ablauf springt die App automatisch zum nächsten Satz bzw. zur nächsten Übung.
- „Training abschließen": setzt `beendet_am`, berechnet und speichert `gesamt_kalorien` (siehe unten).
- Sätze lassen sich nachträglich korrigieren, solange die Session offen ist.

## Kalorienberechnung

`src/lib/workout-calories.ts`, reine Funktion:

```
sessionKalorien(sets: { exercise: { met_wert: number } }[], gewichtKg: number, dauerStunden: number) → number
```

- `dauerStunden` = `beendet_am − gestartet_am` in Stunden (ganze Session, keine Pausenzeit herausgerechnet — deckt sich mit der bewusst gewählten „gesamte Session"-Vereinfachung statt Berechnung je Übung)
- MET = arithmetisches Mittel der `met_wert`-Werte aller abgeschlossenen Sätze (jeder Satz zählt einmal, eine Übung mit vielen Sätzen wiegt entsprechend stärker mit)
- `gewichtKg` kommt aus `profiles.aktuelles_gewicht` — die einzige im System vorhandene Gewichtsquelle, dasselbe Feld, das schon das Ernährungs-Kalorienziel speist. `sessionKalorien` selbst verlangt ein gesetztes Gewicht (Parametertyp `number`, keine Sonderfälle in der reinen Funktion); die aufrufende Seite (`WorkoutSessionPage`, „Training abschließen") prüft vorher, ob `profiles.aktuelles_gewicht` gesetzt ist, ruft die Funktion nur dann auf und zeigt sonst „—" statt eines falschen oder erfundenen Werts.
- Formel: `gesamt_kalorien = MET × gewichtKg × dauerStunden`

Dieselbe Funktion beliefert Dashboard-Anzeige und Trainingshistorie — eine Berechnung, kein zweiter Ort, an dem sie abweichen könnte (gleiches Prinzip wie `entry-calories.ts` in der Ernährung).

## Trainingshistorie

`/training/history`: Liste vergangener Sessions (Datum, Plan-/Tagesname, Dauer, Kalorien), neueste zuerst.

`/training/history/:sessionId`: Details — alle Sätze mit Übung, Gewicht, Wiederholungen; hier lassen sich Sätze nachträglich korrigieren (gleicher Mechanismus wie im Live-Modus, nur ohne Pausen-Timer und ohne Auto-Sprung); Session löschen möglich.

## Komponenten

| Datei | Änderung |
| --- | --- |
| `supabase/migrations/0004_training_days.sql` | neu — Tage-Ebene, Umbenennungen, RLS |
| `scripts/free-exercise-db.json` | neu — vendorte Fixture |
| `scripts/import-exercises.mjs` | neu — einmaliger Import, nutzt `metForCategory` |
| `src/lib/met-categories.ts` | neu — `metForCategory(category): number`, nur vom Import genutzt (das `ExercisesPage`-Formular nimmt den MET-Wert als Freitext entgegen wie die Kategorie selbst — eine Zuordnungstabelle für ein Freitextfeld wäre unzuverlässig, da nichts eine Übereinstimmung mit den bekannten Kategorien-Strings erzwingt) |
| `src/lib/next-training-day.ts` | neu — Rotationslogik |
| `src/lib/workout-calories.ts` | neu — `sessionKalorien` |
| `src/hooks/use-exercises.ts` | neu — Übungen suchen/listen, eigene Übung anlegen |
| `src/hooks/use-workout-plans.ts` | neu — Pläne/Tage/Tages-Übungen: CRUD, aktivieren, Reihenfolge ändern |
| `src/hooks/use-workout-session.ts` | neu — Session starten/laden, Sätze erfassen/bearbeiten, abschließen |
| `src/hooks/use-workout-history.ts` | neu — vergangene Sessions listen/laden/löschen |
| `src/pages/TrainingPage.tsx` | Platzhalter ersetzt — Dashboard |
| `src/pages/TrainingPlansPage.tsx` | neu — Planliste |
| `src/pages/TrainingPlanEditPage.tsx` | neu — Plan-Editor (Tage, Übungen, Inline-Suche) |
| `src/pages/ExercisesPage.tsx` | neu — Übungssuche + eigene Übung anlegen |
| `src/pages/WorkoutSessionPage.tsx` | neu — Live-Modus |
| `src/pages/TrainingHistoryPage.tsx` | neu — Verlaufsliste |
| `src/pages/TrainingHistoryDetailPage.tsx` | neu — Session-Details, Sätze korrigieren, löschen |
| `src/App.tsx` | neue Routen unter `/training/*` |

## Fehlerbehandlung

Wie im übrigen Projekt: Schreibfehler werfen, werden sichtbar gemeldet, das Formular bleibt offen und der eingegebene Wert steht. `Number('')` wird vor jeder Zahlkonvertierung auf `null`/„nicht gesetzt" gemappt, nie direkt als 0 interpretiert (Gewicht, Wiederholungen, Pausenzeit, Ziel-Sätze). Fehlt `profiles.aktuelles_gewicht` bei Session-Abschluss, wird das als erwarteter Zustand behandelt (keine Kalorienzahl statt eines falschen Werts), kein Fehler.

## Tests

- `metForCategory`: bekannte Kategorien liefern die hinterlegten Werte, unbekannte einen dokumentierten Fallback.
- `nextTrainingDay`: erster Tag ohne vorherige Session, nächster Tag nach einer abgeschlossenen Session, Umlauf vom letzten zurück zum ersten, Fallback auf Tag 1 wenn der zuletzt trainierte Tag gelöscht wurde.
- `sessionKalorien`: MET-Durchschnitt über mehrere Übungen, eine Übung mit mehreren Sätzen wiegt stärker, leere Satzliste ergibt 0 statt eines Fehlers.
- Plan-Editor: Übung hinzufügen/entfernen, Hoch/Runter für Tage und Übungen vertauscht genau zwei benachbarte Einträge.
- Live-Modus: Satz-Abschluss schreibt sofort, Pausen-Timer startet mit der richtigen Dauer, automatischer Sprung zum nächsten Satz/zur nächsten Übung, „Training abschließen" setzt `beendet_am` und `gesamt_kalorien`.
- Trainingshistorie: Liste zeigt vergangene Sessions absteigend nach Datum, Satz-Korrektur in der Detailansicht, Löschen entfernt die Session samt Sätzen (Cascade).
- Migration `0004`: Spalten-/Tabellennamen nach der Umbenennung, RLS-Policy-Existenz, analog zu den bestehenden Migrationstests.

## Folgevorhaben

1. **Trainingstag/Restday-Kalender.** `day_status`-Tabelle existiert schon (Phase 1), Home-Dashboard-Integration fehlt noch.
2. **Kalorienberechnung je Übung mit eigener Dauer**, falls die Session-weite Vereinfachung sich als zu ungenau erweist (z. B. bei stark gemischten Einheiten aus Kraft und Cardio).
3. **Schwierigkeitsgrad importieren**, falls beim Durchsuchen der Übungen vermisst.
4. **Copy-on-write beim Bearbeiten fremder Übungen** — aktuell kann, wer eine eigene Übung anlegt, nur diese ändern (`exercises_update_own`); Bearbeiten importierter Übungen ist ohnehin nicht vorgesehen, daher aktuell kein Konfliktfall wie beim Produkt-Bearbeiten in der Ernährung.

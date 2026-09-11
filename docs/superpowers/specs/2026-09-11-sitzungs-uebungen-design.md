# Übungen während des Trainings ändern/einfügen — Design

**Spec-Datum:** 11.09.2026

## Ziel

Zweiter Teil aus der Wettbewerbsanalyse-Priorisierung (siehe „Neue Richtung: Wettbewerbsanalyse" in `CLAUDE.md`): während eines laufenden Trainings soll man Übungen hinzufügen und wieder entfernen können ("ändern" = entfernen + eine andere hinzufügen), ohne dass sich dadurch der zugrunde liegende Trainingsplan-Tag für zukünftige Trainingseinheiten ändert. Nutzer-Entscheidung im Brainstorming: **einmalig pro Sitzung**, nicht dauerhaft im Plan.

## Ausgangslage

- `WorkoutSessionPage.tsx`s `useWorkoutSession(sessionId)`-Hook liest die Übungsliste einer laufenden Sitzung aktuell **live** aus `workout_plan_day_exercises` über `session.workout_plan_day_id` (`use-workout-session.ts`, `reload()`) — kein Snapshot. Jede Änderung am Plan-Tag würde sich sofort in jeder noch offenen Sitzung dieses Tages spiegeln.
- Bereits erfasste Sätze (`workout_session_sets`) sind davon unabhängig: `exercise_id` wird direkt am Satz gespeichert, nicht über den Plan-Tag verknüpft. `TrainingHistoryDetailPage.tsx` liest ausschließlich `sets` (nie `exercises`) und ist von dieser Änderung daher gar nicht betroffen.
- `startWorkoutSession(userId, dayId)` (`use-workout-session.ts`) prüft zuerst auf eine bereits offene, fortsetzbare Sitzung desselben Tages (6-Stunden-Fenster) und legt nur bei Bedarf eine neue Sitzungszeile an.
- Ein Übungsauswahl-Dialog existiert bereits als `ExercisePicker` (lokal in `TrainingPlanEditPage.tsx`, Zeilen ~262–382) mit einer bereits generischen Schnittstelle (`exercises: PickableExercise[]`, `alreadyAdded: string[]`, `onAddSelected: (exerciseIds: string[]) => void`) — Mehrfachauswahl, Muskelgruppen-/Geräte-Filter, Suche. `WorkoutSessionPage.tsx` lädt aktuell keinen Übungskatalog (`useExercises`) und hat keinen Zugriff auf diesen Picker.
- Migrationen enden aktuell bei `0010`.

## Entscheidung 1: Neue Tabelle statt Live-Bezug

Migration `0011_workout_session_exercises.sql`: neue Tabelle `workout_session_exercises`, strukturell identisch zu `workout_plan_day_exercises` (`id, workout_session_id, exercise_id, reihenfolge, ziel_saetze, ziel_wiederholungen, pausenzeit_sekunden, created_at`), RLS-Policy nach demselben Muster wie `workout_session_sets` (Zugriff nur über `exists (select 1 from workout_sessions ws where ws.id = workout_session_id and ws.user_id = auth.uid())`). Unique Index auf `(workout_session_id, exercise_id)` wie beim Plan-Pendant.

`startWorkoutSession` kopiert beim **Neu**-Anlegen einer Sitzung (nicht beim Fortsetzen einer bereits offenen, deren Zeilen schon existieren) die aktuellen `workout_plan_day_exercises`-Zeilen des Tages einmalig per Array-Insert in `workout_session_exercises` — kein Loop, `reihenfolge` wird direkt aus den gelesenen Plan-Tag-Zeilen übernommen. Ab diesem Zeitpunkt läuft die Sitzung komplett unabhängig vom Plan-Tag: spätere Planänderungen wirken sich nicht mehr auf sie aus, und Änderungen innerhalb der Sitzung wirken sich nicht auf den Plan aus.

`useWorkoutSession`s `reload()` liest die Übungsliste künftig aus `workout_session_exercises` (gejoint mit `exercises(id, name)`) statt aus `workout_plan_day_exercises`. Der `SessionExercise`-Typ bekommt zusätzlich `id: string` (die Zeilen-ID in `workout_session_exercises`, nötig zum Entfernen) — alle anderen Felder bleiben unverändert, daher keine weiteren Anpassungen an der bestehenden Render-/Logging-Logik nötig.

## Entscheidung 2: Hinzufügen/Entfernen als neue Hook-Funktionen

```ts
async function addExercisesToSession(sessionId: string, exerciseIds: string[]): Promise<void>
async function removeExerciseFromSession(sessionExerciseRowId: string): Promise<void>
```

`addExercisesToSession` berechnet `reihenfolge` für alle neuen Zeilen aus einem einzigen Snapshot der aktuell geladenen `exercises` (max + 1, 2, 3, …) und schreibt sie in einem Array-Insert — exakt dasselbe Closure-Vermeidungsmuster wie bei `useWorkoutPlans.createPlan`s Tage-Erzeugung und `addExercisesToDay`. Neu hinzugefügte Übungen bekommen `ziel_saetze`/`ziel_wiederholungen`/`pausenzeit_sekunden` = `null` (kein Ziel) — die bestehende Anzeige- und Zähllogik in `WorkoutSessionPage.tsx` behandelt das bereits korrekt (kein „von N" in der Satzanzeige, keine automatische Pause).

`removeExerciseFromSession` löscht die Zeile per `id`. Kein Schutz auf DB-Ebene gegen das Entfernen einer Übung mit bereits erfassten Sätzen (die Sätze selbst bleiben unabhängig davon erhalten) — die Einschränkung „nur unbegonnene Übungen entfernbar" (Nutzer-Entscheidung im Brainstorming) ist eine reine UI-Regel: der „Entfernen"-Button erscheint nur, solange `workingSetCount(exercise_id) === 0` (bereits vorhandene Hilfsfunktion in `WorkoutSessionPage.tsx`).

## Entscheidung 3: `ExercisePicker` wird geteilt statt dupliziert

`ExercisePicker` (samt dem `PickableExercise`-Typ) zieht von `TrainingPlanEditPage.tsx` nach `src/components/ExercisePicker.tsx` um — seine Schnittstelle ist unverändert bereits generisch genug für beide Aufrufer. `TrainingPlanEditPage.tsx` importiert ihn künftig von dort (verhaltensgleich, reiner Umzug). `WorkoutSessionPage.tsx` lädt zusätzlich `useExercises(userId)` (bereits vorhandener Hook, an anderer Stelle im Projekt etabliert) und verwendet denselben `ExercisePicker` in einem `Dialog` (ebenfalls bereits vorhandene, geteilte Komponente), verkabelt mit `addExercisesToSession`.

UI in `WorkoutSessionPage.tsx`: ein „Übung hinzufügen"-Button unterhalb der Übungsliste (analog zu `DayBlock`s gleichnamigem Button), pro Übungszeile ein bedingter „Entfernen"-Button (nur sichtbar, wenn `workingSetCount(entry.exercise_id) === 0`), verkabelt mit `removeExerciseFromSession`.

## Betroffene Dateien

- `supabase/migrations/0011_workout_session_exercises.sql` (+ Test analog zu `0010_plan_assistent.test.ts`)
- `docs/domaenenmodell.md` (neue Tabelle im ERD + Prosa-Absatz)
- `src/hooks/use-workout-session.ts` (`SessionExercise`-Typ, `reload()`, `startWorkoutSession`, neue Funktionen `addExercisesToSession`/`removeExerciseFromSession`)
- Neu: `src/components/ExercisePicker.tsx` (+ Test, verschoben aus `TrainingPlanEditPage.test.tsx`/-`.tsx`)
- `src/pages/TrainingPlanEditPage.tsx` (Import statt lokaler Definition, verhaltensgleich)
- `src/pages/WorkoutSessionPage.tsx` (Übung-hinzufügen-Button + Dialog, Entfernen-Button pro Zeile)

## Tests

- Migrationstest (Spalten, Nullable-Verhalten, RLS, Unique-Index — analog zu `0010_plan_assistent.test.ts`).
- `use-workout-session.test.ts`: `startWorkoutSession` kopiert die Tages-Übungen beim Neuanlegen, **nicht** beim Fortsetzen einer offenen Sitzung; `addExercisesToSession` schreibt korrekte `reihenfolge`-Werte aus einem Snapshot (nicht aus einem Loop); `removeExerciseFromSession` löscht die richtige Zeile.
- `ExercisePicker.test.tsx`: verhaltensgleicher Test-Umzug aus `TrainingPlanEditPage.test.tsx` (Filter, Mehrfachauswahl, „Hinzufügen (N)").
- `TrainingPlanEditPage.test.tsx`: bestehende Tests bleiben grün (reiner Importwechsel).
- `WorkoutSessionPage.test.tsx`: „Übung hinzufügen" öffnet den Dialog und die neue Übung erscheint sofort in der Liste; „Entfernen"-Button verschwindet, sobald ein Satz für diese Übung erfasst wurde; entfernte Übung verschwindet aus der Liste, ihre (falls vorhandenen) Sätze bleiben in `sets` unangetastet.
- Volle Suite (`npm test`) + Lint + `tsc -b --noEmit` + `npm run build`.
- Live-Verifikation nach Merge: Wegwerf-Plan/-Tag, Übung während einer Sitzung hinzufügen und wieder entfernen, danach denselben Tag erneut im Plan-Editor öffnen und bestätigen, dass der Plan-Tag unverändert ist (die sitzungseigene Änderung hat sich nicht auf den Plan ausgewirkt).

## Bewusst außen vor

- **Keine Rückwirkung auf den Plan-Tag** — das ist der ganze Punkt dieses Vorhabens, explizite Nutzer-Entscheidung.
- **Kein Entfernen von Übungen mit bereits erfassten Sätzen** — Nutzer-Entscheidung im Brainstorming.
- **Kein Bearbeiten von `ziel_saetze`/`ziel_wiederholungen`/`pausenzeit_sekunden`** für während der Sitzung hinzugefügte Übungen — sie bleiben zielfrei, die bestehende Anzeige kommt damit bereits klar.
- **`WorkoutSessionPage.tsx` zeigt weiterhin den rohen englischen Übungsnamen** (`entry.name`, kein `name_de`) — bekannte, bereits dokumentierte offene Stelle aus dem Übungs-Übersetzung-Folgevorhaben, nicht Teil dieses Tasks.

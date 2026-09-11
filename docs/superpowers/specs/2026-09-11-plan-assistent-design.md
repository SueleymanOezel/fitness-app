# Plan-Erstellungs-Assistent — Design

**Spec-Datum:** 11.09.2026

## Ziel

Erster von zwei noch offenen Teilen aus dem ursprünglichen Übungsauswahl-Folgewunsch (siehe „Nächster Schritt" in `CLAUDE.md`): ein mehrstufiger Assistent zum Anlegen eines Trainingsplans (Name → Häufigkeit → Plandauer), der die aktuelle einfache Ein-Feld-Form ersetzt. Referenz-Screenshots liegen unter `G:\Code Projekte\fitness-app\20260911_025757000_iOS.png` (Häufigkeit) und `...025800000_iOS.png` (Plandauer/„Sonstiges"); der Name des Referenz-Apps wird hier bewusst nicht genannt (siehe `feedback_no_competitor_names`-Konvention).

## Ausgangslage

- `TrainingPlansPage.tsx` legt Pläne aktuell nur über ein Namensfeld + „Anlegen"-Button an (`useWorkoutPlans(userId).createPlan(name)`). Kein Konzept von Häufigkeit oder Plandauer, weder im UI noch im Schema.
- `workout_plans` (Migration `0001`) hat nur `id, user_id, name, aktiv, created_at` — keine passenden Spalten.
- Tage werden aktuell einzeln über `useWorkoutPlan(planId).addDay(name)` angelegt; diese Funktion berechnet `reihenfolge` aus dem aktuellen `days`-State der Komponente. Bei mehreren `addDay`-Aufrufen **in einer Schleife im selben Render** bliebe dieser State stale (identisches React-Closure-Problem, das beim Übungsauswahl-Redesign für `addExerciseToDay` bereits gefunden und behoben wurde — siehe „Übungsauswahl im Trainingsplan-Editor" in `CLAUDE.md`). Für die automatische Erzeugung mehrerer Tage bei Plan-Erstellung wird deshalb **nicht** `addDay` mehrfach aufgerufen, sondern ein einziger Batch-Insert analog zu `addExercisesToDay`.
- `createPlan` gibt aktuell keine ID zurück (nur `insert(...)` ohne `.select()`), da die aufrufende Seite bisher nur neu lädt und die Liste anzeigt. Der Assistent muss nach dem Erstellen direkt zum neuen Plan navigieren, braucht also die ID.
- Kein Cron/Edge Functions in diesem Projekt — alles läuft client-seitig gegen Supabase (bestätigt, keine `supabase/functions`).

## Entscheidung 1: Neue Spalten, additiv

Migration `0010_plan_assistent.sql`: `workout_plans` bekommt `haeufigkeit_pro_woche integer` (1–7, per `check`-Constraint begrenzt) und `dauer_wochen integer` (per `check` > 0, falls gesetzt) — beide **nullable**, kein Backfill. Bestehende Pläne (auch ohne diese Werte angelegte) bleiben unverändert funktionsfähig; der Reminder aus Entscheidung 4 zeigt für sie einfach nichts an. `docs/domaenenmodell.md` wird um die beiden Spalten ergänzt (ERD + Beschreibung).

## Entscheidung 2: Assistent-Flow ersetzt die Namenszeile

Neue Route `/training/plans/new` (`TrainingPlanWizardPage.tsx`), lokaler Step-State (`useState<1 | 2 | 3>`), kein Draft-Persistieren (kleiner Flow, Abbrechen verwirft einfach). Drei Schritte, „Zurück"/„Weiter" wie im Referenz-Screenshot:

1. **Name** — Textfeld, gleiche Validierung wie bisher („Der Plan braucht einen Namen."), „Weiter" erst nach nicht-leerem Namen aktiv.
2. **Häufigkeit** — Button-Grid 1–7× pro Woche (analog zum Screenshot), Pflichtauswahl, „Weiter" erst nach Auswahl aktiv.
3. **Plandauer** — Zahlenfeld/Stepper „X Wochen", vorbelegt mit 4 (wie im Screenshot), „Plan erstellen" statt „Weiter".

`TrainingPlansPage.tsx` verliert die bestehende `<form>` (Namensfeld + „Anlegen") und bekommt stattdessen einen „Neuer Plan"-Link/Button zu `/training/plans/new` (gleicher `buttonPrimaryClass`-Look wie bisher der Submit-Button).

**Keine Experteneinstellungen** in diesem ersten Wurf (Nutzer-Entscheidung im Brainstorming) — der Assistent endet nach Schritt 3.

## Entscheidung 3: Ein Insert erzeugt Plan + alle Tage

`useWorkoutPlans` bekommt eine neue Funktion (ersetzt die bisherige `createPlan`-Signatur):

```ts
async function createPlan(name: string, haeufigkeitProWoche: number, dauerWochen: number): Promise<string> {
  const { data, error } = await supabase
    .from('workout_plans')
    .insert({ user_id: userId, name, aktiv: false, haeufigkeit_pro_woche: haeufigkeitProWoche, dauer_wochen: dauerWochen })
    .select('id')
    .single()
  if (error || !data) throw new Error('create plan failed')

  const days = Array.from({ length: haeufigkeitProWoche }, (_, index) => ({
    workout_plan_id: data.id,
    name: `Tag ${index + 1}`,
    reihenfolge: index + 1,
  }))
  const { error: daysError } = await supabase.from('workout_plan_days').insert(days)
  if (daysError) throw new Error('create plan days failed')

  await reload()
  return data.id
}
```

Ein Array-Insert für alle Tage in einem Request (kein Loop über `addDay`) — vermeidet das Closure-Problem aus der Ausgangslage strukturell, weil `reihenfolge` 1..N aus der Aufrufparameter berechnet wird, nicht aus gelesenem State. Nach Erfolg navigiert der Assistent direkt zu `/training/plans/{id}` (bestehender `TrainingPlanEditPage`-Editor), wo der Nutzer die Tage mit Übungen über die bereits vorhandene Übungsauswahl füllt — keine neue Day/Exercise-Logik nötig.

**Fehlerfall:** Schlägt der zweite Insert (Tage) fehl, bleibt der Plan ohne Tage stehen (kein Rollback des ersten Inserts — Supabase/PostgREST erlaubt keine Client-Transaktion über zwei Requests, gleiches Muster wie an anderen Stellen im Projekt, z. B. `replaceImportedExercises` in `import-exercises.ts`). Der Assistent zeigt in diesem Fall einen Toast-Fehler; der Plan existiert dann leer in der Liste und kann dort wie jeder andere leere Plan manuell mit Tagen ergänzt werden — kein Sonderfall nötig.

## Entscheidung 4: Reminder auf dem Trainings-Dashboard

Neue reine Funktion `wochenAktiv(createdAt: string, now: Date): number` (z. B. `src/lib/plan-alter.ts`), berechnet volle Wochen seit `created_at`. In `TrainingPage.tsx`, direkt bei der Plan-Anzeige (`{plan.name}`): wenn `plan.dauer_wochen != null` und `wochenAktiv(plan.created_at, new Date()) >= plan.dauer_wochen`, erscheint ein Hinweis „Dieser Plan läuft seit {wochenAktiv} Wochen — Zeit für einen neuen?" mit Link zu `/training/plans/new`. Rein berechnet bei jedem Laden, kein Dismiss-Status, keine neue Spalte, kein Hintergrundjob.

`WorkoutPlan`-Typ in `use-workout-plans.ts` (aktuell nur `id, name, aktiv`) wird um `created_at`, `haeufigkeit_pro_woche`, `dauer_wochen` erweitert — `select('*')` liefert diese Spalten bereits, nur der TS-Typ fehlt noch. `useActiveTrainingDay` (liefert das `plan`-Objekt an `TrainingPage`) muss dieselben Felder mitgeben — betroffene Stelle wird beim Implementieren geprüft.

## Betroffene Dateien

- `supabase/migrations/0010_plan_assistent.sql` (+ Test analog zu `0008_exercise_details.test.ts`)
- `docs/domaenenmodell.md`
- `src/hooks/use-workout-plans.ts` (`createPlan`-Signatur, `WorkoutPlan`-Typ)
- `src/hooks/use-active-training-day.ts` (Felder für den Reminder durchreichen, falls nötig — wird beim Implementieren geprüft)
- `src/pages/TrainingPlansPage.tsx` (Namensform → „Neuer Plan"-Link)
- Neu: `src/pages/TrainingPlanWizardPage.tsx` (+ Test)
- Neu: `src/lib/plan-alter.ts` (+ Test)
- `src/pages/TrainingPage.tsx` (Reminder-Anzeige)
- `src/App.tsx` (neue Route `/training/plans/new`)

## Tests

- `plan-alter.test.ts`: `wochenAktiv` für 0/1/mehrere volle Wochen, Rundungsverhalten an der Wochengrenze.
- `use-workout-plans.test.ts` (falls vorhanden, sonst Hook-Test wie bei `addExercisesToDay`): `createPlan` erzeugt Plan + N Tage in der richtigen Reihenfolge aus einem Snapshot, nicht aus sequentiellem State.
- `TrainingPlanWizardPage.test.tsx`: alle drei Schritte, Validierung (leerer Name, keine Häufigkeit gewählt), Navigation zurück, Erstellen navigiert zum neuen Plan.
- `TrainingPlansPage.test.tsx`: bestehende Tests für die entfernte Inline-Form anpassen, neuer Test für den „Neuer Plan"-Link.
- `TrainingPage.test.tsx`: Reminder erscheint/erscheint nicht abhängig von `dauer_wochen`/Alter.
- Volle Suite (`npm test`) + Lint + `tsc -b --noEmit` + `npm run build` wie bei jedem bisherigen Task.
- Manuelle Live-Verifikation nach Merge: kompletten Assistenten durchklicken, geprüft dass die richtige Anzahl Tage entsteht, Reminder mit einem künstlich zurückdatierten Testplan sichtbar machen (Wegwerf-Daten, danach entfernt — gleiches Muster wie bei T6 in P2).

## Bewusst außen vor

- **Experteneinstellungen** (Standard-Sätze/Wiederholungen/Pause) — Nutzer-Entscheidung im Brainstorming, kein Bedarf im ersten Wurf.
- **Auto-Deaktivierung** nach Ablauf der Plandauer — Nutzer-Entscheidung: nur Hinweis, keine automatische Statusänderung.
- **Bearbeiten von Häufigkeit/Plandauer nach der Erstellung** — nicht Teil dieses Vorhabens; beide Felder werden aktuell nur beim Erstellen gesetzt, kein Editier-UI. Kann bei Bedarf später ergänzt werden (additive Spalten machen das einfach).
- **Tag-Übersicht mit Muskel-Silhouette/„Importieren"** (Screenshot 5 desselben Referenz-Sets) — zweiter, separater Teil des ursprünglichen Wunsches, eigenes künftiges Vorhaben.

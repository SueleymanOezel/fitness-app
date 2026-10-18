# Block 3b: Löschen und Körper (Design)

Stand 18.10.2026. Teil von Block 3 „Ehrliche Daten/Logik“ (Audit vom 13.10.2026). Der Nutzer hat die
Rückfragen abgewählt („lass 3b machen“) — die zwei Entscheidungen unten sind **Entscheidungen von Claude**,
nicht vom Nutzer bestätigt.

## Ziel

Nichts Gespeichertes verschwindet mit einem einzigen Antippen, und die App zeigt keinen Leerzustand mehr,
wenn in Wahrheit nur das Laden scheiterte (PRODUCT.md Prinzip 4 „Ehrliche Daten“).

## Entscheidungen (Claude)

1. **Einheitliches Lösch-Muster: Bestätigungs-Dialog**, überall gleich. Kein Undo-Toast: der bräuchte
   Soft-Delete im Client und wäre bei Plänen/Sessions mit abhängigen Zeilen heikel. Der Tap mehr ist bei
   Löschen vertretbar (Prinzip 3 „Ohne Ballast“ gilt für das Erfassen, nicht fürs Vernichten).
2. **Körper-Datum beim Bearbeiten:** Die Zeile wird per `id` aktualisiert. Gibt es für das neue Datum schon
   einen anderen Eintrag, wird abgelehnt mit „Für dieses Datum gibt es schon einen Eintrag.“ (kein
   Zusammenführen, das würde Werte still überschreiben).

## Bausteine

- `ConfirmDelete` (`src/components/ConfirmDelete.tsx`): Danger-Button + `Dialog` mit Titel, Satz,
  „Endgültig löschen“/„Abbrechen“. Der Dialog-Inhalt wird nur gerendert, solange er offen ist (frischer
  Zustand je Öffnen, siehe `Dialog.tsx`). `onConfirm` wirft → Fehler **inline im Dialog** (ein Toast läge
  hinter dem Top-Layer), Dialog bleibt offen. `onConfirm` löst auf → Dialog schließt. Sonderfälle (z. B.
  `ProfileWeightSyncError`: gelöscht, nur Spiegel veraltet) fängt die Seite in `onConfirm` selbst, zeigt
  den Toast und löst normal auf.
- Eingesetzt an allen Lösch-Stellen: Ernährungs-Eintrag (`FoodEntryList`), Körper-Eintrag
  (`BodyEntriesPage`), Körper-Foto (`BodyPhotosPage`), Plan (`TrainingPlansPage`), Übung aus Plan-Tag
  (`TrainingPlanEditPage`), Session (`TrainingHistoryDetailPage`), Übung aus laufender Session
  (`WorkoutSessionPage`, nur solange kein Satz erfasst ist).
- **Einzelnen Satz löschen:** neuer Button im `SetEditDialog` („Satz löschen“, ebenfalls hinter
  `ConfirmDelete`), neue Hook-Funktion `deleteSet(setId)` in `useWorkoutSession`. `satz_nummer` wird nicht
  umnummeriert; ein neuer Satz bekommt `max(satz_nummer) + 1` statt `Anzahl + 1` (sonst Duplikate nach
  einem Löschen mitten in der Reihe).
- **Körper-Datum:** `saveEntry(datum, values, id?)` — mit `id` ein `update … eq('id')` (vorher Konflikt
  gegen die geladenen Zeilen prüfen → `DatumBelegtError`), ohne `id` weiter Upsert (Dashboard „Heute
  eintragen“). `BodyEntryForm` zeigt die Konflikt-Meldung statt der allgemeinen. `syncProfileWeight` läuft
  danach wie bisher.
- **Fehlerzustände:** `useWorkoutHistory`, `useActiveTrainingDay`, `useWorkoutPlans` liefern `error`
  (Ladefehler) und `reload`. `TrainingHistoryPage`, `TrainingPlansPage`, `TrainingPage` zeigen dann
  `role="alert"` + „Erneut versuchen“ (Muster wie `NutritionPage` beim Profil) statt `EmptyState`/„Kein
  aktiver Plan.“. `HomePage`: die Trainingskarte zeigt „Training konnte nicht geladen werden.“, blockiert
  die anderen Karten nicht.

## Nicht-Ziele

Undo, Papierkorb, Mehrfachauswahl-Löschen, Konto-Löschen (gibt es schon mit eigener Bestätigung),
`deleteDay` (hat keine Oberfläche), Umnummerieren von Sätzen.

## Tests

Je Stelle: Löschen ohne Bestätigung ruft den Hook nicht auf; Bestätigen ruft ihn genau einmal auf;
Abbrechen nicht; Fehler erscheint im Dialog. Hooks: `deleteSet`, `saveEntry` mit `id` (kein Upsert,
Konflikt), `error` bei Ladefehler. Sicht-Prüfung bei 390 px mit Playwright (Fake-Session) am Ende.

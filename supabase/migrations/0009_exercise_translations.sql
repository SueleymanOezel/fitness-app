-- Name und Anleitung stehen aktuell im rohen Englisch aus free-exercise-db.
-- Diese Migration ergänzt die deutsche Übersetzung, befüllt durch das
-- manuell auszuführende scripts/translate-exercises.ts (DeepL API), nicht
-- durch die App selbst. Additiv und nullable: eine frisch importierte oder
-- eigene Übung hat noch keine/keine Übersetzung, das Frontend fällt in
-- beiden Fällen auf name/anleitung zurück.
alter table public.exercises
  add column name_de text,
  add column anleitung_de text[];

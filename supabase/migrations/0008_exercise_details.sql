-- Bild pro Übung existiert bereits (bild_url, seit 0001_initial_schema.sql).
-- Diese Migration ergänzt die zwei Felder, die die Detailansicht zusätzlich
-- braucht: eine Schritt-für-Schritt-Anleitung und den Schwierigkeitsgrad.
-- Additiv und nullable wie kategorie/equipment: Übersetzung ins Deutsche
-- passiert im Frontend mit Fallback, nicht als DB-Constraint.
alter table public.exercises
  add column anleitung text[],
  add column schwierigkeitsgrad text;

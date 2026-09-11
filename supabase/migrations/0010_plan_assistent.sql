-- Der Plan-Erstellungs-Assistent fragt Häufigkeit (Tage pro Woche) und
-- Plandauer ab. Additiv und nullable: bestehende Pläne (auch ohne den
-- Assistenten angelegte) bleiben unverändert funktionsfähig, der Reminder
-- auf dem Trainings-Dashboard zeigt für sie einfach nichts an.
alter table public.workout_plans
  add column haeufigkeit_pro_woche integer check (haeufigkeit_pro_woche between 1 and 7),
  add column dauer_wochen integer check (dauer_wochen > 0);

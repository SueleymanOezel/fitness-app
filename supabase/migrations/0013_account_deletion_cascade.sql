-- Beide Fremdschlüssel hatten bisher keine on-delete-Klausel (Postgres-Default
-- NO ACTION). Da products/exercises geteilte Community-Tabellen sind, würde
-- ein Löschen von auth.users mit einer Fremdschlüssel-Verletzung scheitern,
-- sobald der Nutzer je einen Barcode gescannt oder eine eigene Übung angelegt
-- hat — praktisch jeder aktive Nutzer. on delete set null passt zur bereits
-- etablierten Haltung aus products_update_own/products_delete_own: created_by
-- markiert nur, wer eine geteilte Zeile ursprünglich angelegt hat, nicht
-- dauerhafte Autorenschaft. Mit created_by = null bleibt die Zeile für alle
-- anderen Nutzer unverändert nutzbar, ist aber von niemandem mehr
-- bearbeit- oder löschbar (siehe Migration 0012).
alter table public.products
  drop constraint products_created_by_fkey,
  add constraint products_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;

alter table public.exercises
  drop constraint exercises_created_by_fkey,
  add constraint exercises_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;

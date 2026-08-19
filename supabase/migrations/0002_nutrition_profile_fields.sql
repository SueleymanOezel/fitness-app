-- Phase 2: nutrition area additions — calorie-goal fields on profiles, barcode uniqueness on products.

alter table public.profiles
  add column geschlecht text check (geschlecht in ('maennlich', 'weiblich')),
  add column aktivitaetslevel text check (aktivitaetslevel in ('sitzend', 'leicht', 'moderat', 'hoch', 'sehr_hoch')),
  add column ziel text check (ziel in ('abnehmen', 'halten', 'zunehmen')),
  add column ziel_delta_kcal numeric not null default 500,
  add column taegliches_kalorienziel numeric;

create unique index products_barcode_unique on public.products (barcode) where barcode is not null;

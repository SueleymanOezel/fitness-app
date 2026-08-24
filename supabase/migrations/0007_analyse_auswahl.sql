-- Which charts the user pinned to their dashboards, as a list of registry IDs.
--
-- A jsonb column on profiles rather than a new table: the value is a short list
-- that is always read and written as a whole, never queried across users.
--
-- The default is the three charts the design names as the starting view. It is
-- not null so that reading the column never needs a null branch; an empty list
-- is the honest way to say "no charts pinned".
alter table public.profiles
  add column analyse_auswahl jsonb not null default '["T1","E1","K1"]'::jsonb;

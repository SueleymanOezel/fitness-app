-- Fields the analysis area needs. They are added ahead of the charts on purpose:
-- a column only starts collecting history the day it exists, so a chart built
-- before the field is logged would sit empty for weeks.
--
-- Everything here is additive and nullable. Existing rows keep no value, which is
-- the honest state: we simply do not know what the effort or the fibre content was.

-- Reps in reserve, 0 = nothing left. Optional: an interrupted set entry must not
-- block the live mode, so a set without a rating stays valid.
alter table public.workout_session_sets
  add column rir smallint check (rir between 0 and 5),
  add column ist_aufwaermsatz boolean not null default false;

-- Warm-up sets would otherwise inflate every volume chart. satz_nummer keeps
-- numbering every set in order — the distinction lives in this flag, and the
-- "set 1 of 3" counting is derived in the UI from working sets alone.

-- Column only. The body area has no UI yet; entering this value belongs to the
-- phase that builds it.
alter table public.body_metrics
  add column koerperfettanteil numeric check (koerperfettanteil >= 0 and koerperfettanteil <= 100);

-- Per 100 g, like every other nutrient on this table. Salt rather than sodium:
-- that is what German labels print, and Open Food Facts serves both.
alter table public.products
  add column ballaststoffe numeric,
  add column zucker numeric,
  add column salz numeric;

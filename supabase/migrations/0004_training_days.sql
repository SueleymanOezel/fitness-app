-- Phase 3: a plan can now hold several named days (e.g. Push/Pull/Legs).
-- workout_plan_exercises and workout_sessions were created empty in 0001 and
-- never used (the Training-Dashboard was a placeholder), so this evolves
-- them in place instead of leaving a dead parallel table behind.

create table public.workout_plan_days (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans (id) on delete cascade,
  name text not null,
  reihenfolge integer not null,
  created_at timestamptz not null default now()
);

alter table public.workout_plan_days enable row level security;

create policy "workout_plan_days_all_own" on public.workout_plan_days
  for all to authenticated using (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = workout_plan_id and wp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_plans wp
      where wp.id = workout_plan_id and wp.user_id = auth.uid()
    )
  );

create index on public.workout_plan_days (workout_plan_id);

-- Rehang workout_plan_exercises on a day instead of directly on a plan.
-- The rename comes first: policies and indexes follow the table, so the old
-- policy is dropped under the new table name.
alter table public.workout_plan_exercises rename to workout_plan_day_exercises;

drop policy "workout_plan_exercises_all_own" on public.workout_plan_day_exercises;

alter table public.workout_plan_day_exercises
  drop constraint workout_plan_exercises_workout_plan_id_fkey;

alter table public.workout_plan_day_exercises rename column workout_plan_id to workout_plan_day_id;

alter table public.workout_plan_day_exercises
  add constraint workout_plan_day_exercises_workout_plan_day_id_fkey
    foreign key (workout_plan_day_id) references public.workout_plan_days (id) on delete cascade;

create policy "workout_plan_day_exercises_all_own" on public.workout_plan_day_exercises
  for all to authenticated using (
    exists (
      select 1 from public.workout_plan_days wpd
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wpd.id = workout_plan_day_id and wp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_plan_days wpd
      join public.workout_plans wp on wp.id = wpd.workout_plan_id
      where wpd.id = workout_plan_day_id and wp.user_id = auth.uid()
    )
  );

-- A session belongs to a concrete day; the plan follows from the day.
-- on delete set null, not cascade: a finished session is a record of what was
-- actually trained and must survive the plan being reorganised or deleted. It
-- also has to be nullable here, otherwise deleting a plan would cascade into
-- its days and be blocked by this constraint forever.
alter table public.workout_sessions
  drop constraint workout_sessions_workout_plan_id_fkey;

alter table public.workout_sessions rename column workout_plan_id to workout_plan_day_id;

alter table public.workout_sessions
  add constraint workout_sessions_workout_plan_day_id_fkey
    foreign key (workout_plan_day_id) references public.workout_plan_days (id) on delete set null;

create index on public.workout_sessions (workout_plan_day_id);

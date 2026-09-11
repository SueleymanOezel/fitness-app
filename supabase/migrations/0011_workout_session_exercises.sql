-- Snapshot of a live session's exercises, copied once from
-- workout_plan_day_exercises when the session is created (not on resume,
-- see startWorkoutSession in use-workout-session.ts). Lets a session
-- add/remove exercises without touching the plan template — see
-- docs/superpowers/specs/2026-09-11-sitzungs-uebungen-design.md.
create table public.workout_session_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  reihenfolge integer not null,
  ziel_saetze integer,
  ziel_wiederholungen integer,
  pausenzeit_sekunden integer,
  created_at timestamptz not null default now()
);

alter table public.workout_session_exercises enable row level security;

create policy "workout_session_exercises_all_own" on public.workout_session_exercises
  for all using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_session_id and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_session_id and ws.user_id = auth.uid()
    )
  );

create unique index workout_session_exercises_session_exercise_unique
  on public.workout_session_exercises (workout_session_id, exercise_id);

create index on public.workout_session_exercises (workout_session_id);

-- One-time backfill: any session already open (unfinished, within the
-- existing 6-hour resume window in startWorkoutSession) when this migration
-- lands would otherwise have no rows here at all, and its live page would
-- appear to have lost every exercise on resume.
insert into public.workout_session_exercises
  (workout_session_id, exercise_id, reihenfolge, ziel_saetze, ziel_wiederholungen, pausenzeit_sekunden)
select ws.id, wpde.exercise_id, wpde.reihenfolge, wpde.ziel_saetze, wpde.ziel_wiederholungen, wpde.pausenzeit_sekunden
  from public.workout_sessions ws
  join public.workout_plan_day_exercises wpde on wpde.workout_plan_day_id = ws.workout_plan_day_id
 where ws.beendet_am is null;

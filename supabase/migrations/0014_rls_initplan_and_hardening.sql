-- Security/performance advisor findings (checked 18.10.2026):
--  1. auth_rls_initplan (19x): `auth.uid()` in a policy is re-evaluated for
--     every row. Wrapped in a scalar subselect it is evaluated once per
--     statement. Same predicates, same roles, only the evaluation changes.
--  2. SECURITY DEFINER functions callable through /rest/v1/rpc by anon and
--     authenticated. Both are trigger functions that nobody has to call
--     directly; a trigger does not need EXECUTE for the role that fires it
--     (the privilege is checked when the trigger is created).
--  3. unindexed_foreign_keys (6x): added covering indexes.
-- Leaked-password protection is an Auth setting (dashboard), not SQL.

-- 1. RLS: (select auth.uid()) ---------------------------------------------

alter policy "body_metrics_all_own" on public.body_metrics
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "body_photos_all_own" on public.body_photos
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "day_status_all_own" on public.day_status
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "food_entries_all_own" on public.food_entries
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "health_sync_data_all_own" on public.health_sync_data
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "workout_plans_all_own" on public.workout_plans
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "workout_sessions_all_own" on public.workout_sessions
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "exercises_delete_own" on public.exercises
  using (created_by = (select auth.uid()));

alter policy "exercises_insert_own" on public.exercises
  with check (created_by = (select auth.uid()));

alter policy "exercises_update_own" on public.exercises
  using (created_by = (select auth.uid()));

alter policy "products_delete_own" on public.products
  using (created_by = (select auth.uid()) and barcode is null);

alter policy "products_insert_own" on public.products
  with check (created_by = (select auth.uid()));

alter policy "products_update_own" on public.products
  using (created_by = (select auth.uid()) and barcode is null)
  with check (created_by = (select auth.uid()) and barcode is null);

alter policy "profiles_select_own" on public.profiles
  using (id = (select auth.uid()));

alter policy "profiles_update_own" on public.profiles
  using (id = (select auth.uid()));

alter policy "workout_plan_days_all_own" on public.workout_plan_days
  using (exists (
    select 1 from public.workout_plans wp
    where wp.id = workout_plan_days.workout_plan_id and wp.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workout_plans wp
    where wp.id = workout_plan_days.workout_plan_id and wp.user_id = (select auth.uid())
  ));

alter policy "workout_plan_day_exercises_all_own" on public.workout_plan_day_exercises
  using (exists (
    select 1 from public.workout_plan_days wpd
    join public.workout_plans wp on wp.id = wpd.workout_plan_id
    where wpd.id = workout_plan_day_exercises.workout_plan_day_id and wp.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workout_plan_days wpd
    join public.workout_plans wp on wp.id = wpd.workout_plan_id
    where wpd.id = workout_plan_day_exercises.workout_plan_day_id and wp.user_id = (select auth.uid())
  ));

alter policy "workout_session_exercises_all_own" on public.workout_session_exercises
  using (exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_session_exercises.workout_session_id and ws.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_session_exercises.workout_session_id and ws.user_id = (select auth.uid())
  ));

alter policy "workout_session_sets_all_own" on public.workout_session_sets
  using (exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_session_sets.workout_session_id and ws.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workout_sessions ws
    where ws.id = workout_session_sets.workout_session_id and ws.user_id = (select auth.uid())
  ));

-- 2. SECURITY DEFINER trigger functions are not an API ---------------------

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- rls_auto_enable() is the platform's event trigger function and does not
-- exist in a database built only from these migrations.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- 3. Covering indexes for foreign keys --------------------------------------

create index if not exists exercises_created_by_idx on public.exercises (created_by);
create index if not exists food_entries_product_id_idx on public.food_entries (product_id);
create index if not exists products_created_by_idx on public.products (created_by);
create index if not exists workout_plan_day_exercises_exercise_id_idx on public.workout_plan_day_exercises (exercise_id);
create index if not exists workout_session_exercises_exercise_id_idx on public.workout_session_exercises (exercise_id);
create index if not exists workout_session_sets_exercise_id_idx on public.workout_session_sets (exercise_id);

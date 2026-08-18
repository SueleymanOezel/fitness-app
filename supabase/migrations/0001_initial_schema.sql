-- Phase 1: base schema for all four app areas. RLS enabled on every table.

-- profiles: 1:1 with auth.users
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  alter integer,
  groesse numeric,
  aktuelles_gewicht numeric,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- products: community nutrition database
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  barcode text,
  kalorien numeric not null,
  eiweiss numeric,
  fett numeric,
  kohlenhydrate numeric,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products_select_all" on public.products
  for select using (auth.role() = 'authenticated');

create policy "products_insert_own" on public.products
  for insert with check (created_by = auth.uid());

create policy "products_update_own" on public.products
  for update using (created_by = auth.uid());

create policy "products_delete_own" on public.products
  for delete using (created_by = auth.uid());

-- food_entries
create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.products (id),
  menge numeric not null,
  zeitpunkt timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.food_entries enable row level security;

create policy "food_entries_all_own" on public.food_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- exercises: community entries + later free-exercise-db import
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kategorie text,
  equipment text,
  muskelgruppen_primaer text[],
  muskelgruppen_sekundaer text[],
  bild_url text,
  met_wert numeric,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "exercises_select_all" on public.exercises
  for select using (auth.role() = 'authenticated');

create policy "exercises_insert_own" on public.exercises
  for insert with check (created_by = auth.uid());

create policy "exercises_update_own" on public.exercises
  for update using (created_by = auth.uid());

create policy "exercises_delete_own" on public.exercises
  for delete using (created_by = auth.uid());

-- workout_plans
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  aktiv boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.workout_plans enable row level security;

create policy "workout_plans_all_own" on public.workout_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- workout_plan_exercises
create table public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  reihenfolge integer not null,
  ziel_saetze integer,
  ziel_wiederholungen integer,
  pausenzeit_sekunden integer,
  created_at timestamptz not null default now()
);

alter table public.workout_plan_exercises enable row level security;

create policy "workout_plan_exercises_all_own" on public.workout_plan_exercises
  for all using (
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

-- workout_sessions
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_plan_id uuid references public.workout_plans (id),
  gestartet_am timestamptz,
  beendet_am timestamptz,
  gesamt_kalorien numeric,
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

create policy "workout_sessions_all_own" on public.workout_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- workout_session_sets
create table public.workout_session_sets (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  satz_nummer integer not null,
  gewicht numeric,
  wiederholungen integer,
  abgeschlossen_am timestamptz,
  created_at timestamptz not null default now()
);

alter table public.workout_session_sets enable row level security;

create policy "workout_session_sets_all_own" on public.workout_session_sets
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

-- body_metrics
create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  datum date not null,
  gewicht numeric,
  bauchumfang numeric,
  beinumfang numeric,
  armumfang numeric,
  ruckenumfang numeric,
  brustumfang numeric,
  created_at timestamptz not null default now()
);

alter table public.body_metrics enable row level security;

create policy "body_metrics_all_own" on public.body_metrics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- body_photos
create table public.body_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  datum date not null,
  foto_url text not null,
  created_at timestamptz not null default now()
);

alter table public.body_photos enable row level security;

create policy "body_photos_all_own" on public.body_photos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- day_status
create table public.day_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  datum date not null,
  status text not null check (status in ('trainingstag', 'restday')),
  created_at timestamptz not null default now()
);

alter table public.day_status enable row level security;

create policy "day_status_all_own" on public.day_status
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- health_sync_data
create table public.health_sync_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  schritte integer,
  weitere_health_metriken jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.health_sync_data enable row level security;

create policy "health_sync_data_all_own" on public.health_sync_data
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

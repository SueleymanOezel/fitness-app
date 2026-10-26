-- Meal favorites (re-audit 26.10.2026, efficiency): a whole meal saved once
-- ("Mein Frühstück" = oats, milk, banana) and entered again in one tap.
-- Two tables like plan -> day exercises: the items keep a real foreign key to
-- the product instead of a JSON copy, so a deleted product leaves no dangling
-- reference behind.

create table public.meal_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.meal_favorite_items (
  id uuid primary key default gen_random_uuid(),
  favorite_id uuid not null references public.meal_favorites (id) on delete cascade,
  -- A product deleted by its owner simply drops out of the favorite.
  product_id uuid not null references public.products (id) on delete cascade,
  menge numeric not null check (menge > 0),
  reihenfolge integer not null default 0
);

create index if not exists meal_favorites_user_id_idx on public.meal_favorites (user_id);
create index if not exists meal_favorite_items_favorite_id_idx on public.meal_favorite_items (favorite_id);
create index if not exists meal_favorite_items_product_id_idx on public.meal_favorite_items (product_id);

alter table public.meal_favorites enable row level security;
alter table public.meal_favorite_items enable row level security;

create policy "meal_favorites_all_own" on public.meal_favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "meal_favorite_items_all_own" on public.meal_favorite_items
  for all to authenticated
  using (exists (
    select 1 from public.meal_favorites mf
    where mf.id = meal_favorite_items.favorite_id and mf.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.meal_favorites mf
    where mf.id = meal_favorite_items.favorite_id and mf.user_id = (select auth.uid())
  ));

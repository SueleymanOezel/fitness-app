-- Meal sections: fixed slots 1-6. The names live on the profile, the slot on the
-- entry. Stable numbers rather than array positions — removing a section must not
-- silently move every entry after it into a different meal.

alter table public.profiles
  add column mahlzeit_1_name text not null default 'Frühstück',
  add column mahlzeit_2_name text not null default 'Mittagessen',
  add column mahlzeit_3_name text not null default 'Abendessen',
  add column mahlzeit_4_name text not null default 'Snacks',
  add column mahlzeit_5_name text,
  add column mahlzeit_6_name text;

-- Nullable: entries logged before this migration have no section. They show up
-- under "Ohne Zuordnung" until the user files them.
alter table public.food_entries
  add column mahlzeit smallint check (mahlzeit between 1 and 6);

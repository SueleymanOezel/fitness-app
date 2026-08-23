import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0004_training_days.sql'), 'utf-8')

describe('0004_training_days.sql', () => {
  it('creates workout_plan_days referencing workout_plans', () => {
    expect(sql).toMatch(/create table public\.workout_plan_days/)
    expect(sql).toMatch(/workout_plan_id uuid not null references public\.workout_plans \(id\) on delete cascade/)
    expect(sql).toMatch(/name text not null/)
    expect(sql).toMatch(/reihenfolge integer not null/)
  })

  it('enables RLS on workout_plan_days scoped through workout_plans', () => {
    expect(sql).toMatch(/alter table public\.workout_plan_days enable row level security/)
    expect(sql).toMatch(/create policy "workout_plan_days_all_own" on public\.workout_plan_days/)
  })

  it('renames workout_plan_exercises to workout_plan_day_exercises and rehangs it on the day', () => {
    expect(sql).toMatch(/alter table public\.workout_plan_exercises rename to workout_plan_day_exercises/)
    expect(sql).toMatch(
      /alter table public\.workout_plan_day_exercises rename column workout_plan_id to workout_plan_day_id/,
    )
    expect(sql).toMatch(/references public\.workout_plan_days \(id\) on delete cascade/)
  })

  it('replaces the old ownership policy with one that walks through workout_plan_days', () => {
    expect(sql).toMatch(/drop policy "workout_plan_exercises_all_own" on public\.workout_plan_day_exercises/)
    expect(sql).toMatch(/create policy "workout_plan_day_exercises_all_own" on public\.workout_plan_day_exercises/)
    expect(sql).toMatch(/from public\.workout_plan_days wpd/)
    expect(sql).toMatch(/join public\.workout_plans wp on wp\.id = wpd\.workout_plan_id/)
  })

  it('points workout_sessions at a day instead of a plan', () => {
    expect(sql).toMatch(/alter table public\.workout_sessions rename column workout_plan_id to workout_plan_day_id/)
    expect(sql).toMatch(/references public\.workout_plan_days \(id\)/)
  })

  it('keeps a session when its day is deleted instead of blocking the delete', () => {
    expect(sql).toMatch(
      /foreign key \(workout_plan_day_id\) references public\.workout_plan_days \(id\) on delete set null/,
    )
  })

  it('adds indexes on the new and renamed foreign key columns', () => {
    expect(sql).toMatch(/create index on public\.workout_plan_days \(workout_plan_id\)/)
    expect(sql).toMatch(/create index on public\.workout_sessions \(workout_plan_day_id\)/)
  })

  it('leaves exercises and workout_session_sets untouched', () => {
    expect(sql).not.toMatch(/alter table public\.exercises/)
    expect(sql).not.toMatch(/alter table public\.workout_session_sets/)
  })
})

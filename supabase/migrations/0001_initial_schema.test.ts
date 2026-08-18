import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(
  resolve(cwd(), 'supabase/migrations/0001_initial_schema.sql'),
  'utf-8',
)

const expectedTables = [
  'profiles',
  'products',
  'food_entries',
  'exercises',
  'workout_plans',
  'workout_plan_exercises',
  'workout_sessions',
  'workout_session_sets',
  'body_metrics',
  'body_photos',
  'day_status',
  'health_sync_data',
]

describe('0001_initial_schema.sql', () => {
  it('creates every expected table', () => {
    for (const table of expectedTables) {
      expect(sql).toMatch(new RegExp(`create table public\\.${table} `))
    }
  })

  it('enables row level security on every expected table', () => {
    for (const table of expectedTables) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`))
    }
  })

  it('defines at least one policy on every expected table', () => {
    for (const table of expectedTables) {
      expect(sql).toMatch(new RegExp(`on public\\.${table}\\s`))
    }
  })

  it('defines the handle_new_user trigger for automatic profile creation', () => {
    expect(sql).toContain('create function public.handle_new_user')
    expect(sql).toContain('after insert on auth.users')
  })
})

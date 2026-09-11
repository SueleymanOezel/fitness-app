import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0011_workout_session_exercises.sql'), 'utf-8')
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0011_workout_session_exercises.sql', () => {
  it('creates workout_session_exercises with the same shape as workout_plan_day_exercises', () => {
    expect(sql).toMatch(/create table public\.workout_session_exercises/)
    expect(statements).toContain(
      'workout_session_id uuid not null references public.workout_sessions (id) on delete cascade',
    )
    expect(statements).toContain('exercise_id uuid not null references public.exercises (id)')
    expect(statements).toContain('reihenfolge integer not null')
    expect(statements).toContain('ziel_saetze integer')
    expect(statements).toContain('ziel_wiederholungen integer')
    expect(statements).toContain('pausenzeit_sekunden integer')
    // Nullable on purpose: exercises added mid-session have no target.
    expect(statements).not.toMatch(/ziel_saetze integer\s+not null/)
    expect(statements).not.toMatch(/ziel_wiederholungen integer\s+not null/)
    expect(statements).not.toMatch(/pausenzeit_sekunden integer\s+not null/)
  })

  it('enables row level security scoped through workout_sessions.user_id, same pattern as workout_session_sets', () => {
    expect(statements).toContain('alter table public.workout_session_exercises enable row level security')
    expect(statements).toMatch(
      /create policy "workout_session_exercises_all_own" on public\.workout_session_exercises/,
    )
    expect(statements).toMatch(/ws\.id = workout_session_id and ws\.user_id = auth\.uid\(\)/)
  })

  it('has a unique index on (workout_session_id, exercise_id), same as the plan-day equivalent', () => {
    expect(statements).toMatch(
      /create unique index workout_session_exercises_session_exercise_unique\s+on public\.workout_session_exercises \(workout_session_id, exercise_id\)/,
    )
  })
})

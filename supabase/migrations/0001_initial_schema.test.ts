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

// Tables with intentionally open community SELECT (no auth.uid() check on SELECT).
const openSelectTables = new Set(['products', 'exercises'])

/**
 * Extracts the SQL text belonging to a single table: from its own
 * `create table public.<table> (` statement up to (but not including) the
 * next `create table public.` statement, or end-of-file for the last table.
 * This is robust to policy/table reordering as long as each table's own
 * create-table + policies stay contiguous, which they do in this file.
 */
function extractTableBlock(sqlText: string, table: string): string {
  const startMatch = new RegExp(`create table public\\.${table} `).exec(sqlText)
  if (!startMatch) {
    throw new Error(`could not find "create table public.${table}" in migration SQL`)
  }
  const start = startMatch.index
  const rest = sqlText.slice(start + startMatch[0].length)
  const nextTableMatch = /create table public\./.exec(rest)
  const end = nextTableMatch ? start + startMatch[0].length + nextTableMatch.index : sqlText.length
  return sqlText.slice(start, end)
}

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

  it('scopes RLS policies to the owning user via auth.uid() for owner-only tables', () => {
    for (const table of expectedTables) {
      if (openSelectTables.has(table)) continue
      const block = extractTableBlock(sql, table)
      expect(block).toContain('auth.uid()')
    }
  })

  it('scopes INSERT/UPDATE/DELETE policies to auth.uid() on community tables with open SELECT', () => {
    for (const table of openSelectTables) {
      const block = extractTableBlock(sql, table)
      expect(block).toContain('created_by = auth.uid()')
    }
  })

  it('defines the handle_new_user trigger for automatic profile creation', () => {
    expect(sql).toContain('create function public.handle_new_user')
    expect(sql).toContain('after insert on auth.users')
  })
})

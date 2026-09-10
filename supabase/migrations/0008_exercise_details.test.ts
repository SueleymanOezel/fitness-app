import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0008_exercise_details.sql'), 'utf-8')
/** Comments explain the columns and name things the statement must not touch. */
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0008_exercise_details.sql', () => {
  it('adds anleitung and schwierigkeitsgrad to exercises as nullable columns', () => {
    expect(sql).toMatch(/alter table public\.exercises/)
    expect(statements).toContain('add column anleitung text[]')
    expect(statements).toContain('add column schwierigkeitsgrad text')
    // Nullable on purpose: existing imported rows only get these values after
    // the import script re-runs, and a manually created exercise may skip them.
    expect(statements).not.toMatch(/anleitung text\[\]\s+not null/)
    expect(statements).not.toMatch(/schwierigkeitsgrad text\s+not null/)
  })

  it('adds no check constraint, table, or policy', () => {
    // No check constraint: translation to German happens in the frontend
    // with a fallback (src/lib/level-labels.ts), the same pattern already
    // used for kategorie/equipment — the schema stays open to any value a
    // future re-import might bring.
    expect(statements).not.toMatch(/check\s*\(/i)
    expect(sql).not.toMatch(/create table/i)
    expect(sql).not.toMatch(/create policy/i)
  })
})

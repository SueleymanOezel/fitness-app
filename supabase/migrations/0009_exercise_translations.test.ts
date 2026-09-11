import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0009_exercise_translations.sql'), 'utf-8')
/** Comments explain the columns and name things the statement must not touch. */
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0009_exercise_translations.sql', () => {
  it('adds name_de and anleitung_de to exercises as nullable columns', () => {
    expect(sql).toMatch(/alter table public\.exercises/)
    expect(statements).toContain('add column name_de text')
    expect(statements).toContain('add column anleitung_de text[]')
    // Nullable on purpose: rows only get a value once translate-exercises.ts
    // runs, and the script is resumable — it may leave rows half-translated.
    expect(statements).not.toMatch(/name_de text\s+not null/)
    expect(statements).not.toMatch(/anleitung_de text\[\]\s+not null/)
  })

  it('adds no check constraint, table, or policy', () => {
    // No check constraint: this is free-text translation output, not a
    // fixed vocabulary like kategorie/equipment/schwierigkeitsgrad.
    expect(statements).not.toMatch(/check\s*\(/i)
    expect(sql).not.toMatch(/create table/i)
    expect(sql).not.toMatch(/create policy/i)
  })
})

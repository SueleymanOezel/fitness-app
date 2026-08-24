import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(
  resolve(cwd(), 'supabase/migrations/0007_analyse_auswahl.sql'),
  'utf-8',
)
/** Comments name things the statements must not do. */
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0007_analyse_auswahl.sql', () => {
  it('adds the column to profiles as jsonb', () => {
    expect(statements).toMatch(/alter table public\.profiles/)
    expect(statements).toMatch(/add column .*analyse_auswahl jsonb/)
  })

  it('gives every existing row the three default charts', () => {
    // Without a default, every profile created before this migration reads as
    // null and the dashboards would come up empty for existing users.
    expect(statements).toMatch(/default '\["T1","E1","K1"\]'::jsonb/)
    expect(statements).toMatch(/not null/)
  })

  it('does not touch the existing policies', () => {
    // profiles_update_own has no `with check` — a known finding, deliberately
    // left to the hardening phase. This migration must not silently change it.
    expect(statements).not.toMatch(/create policy/)
    expect(statements).not.toMatch(/drop policy/)
    expect(statements).not.toMatch(/alter policy/)
  })

  it('adds nothing but this one column', () => {
    expect(statements).not.toMatch(/create table/)
    expect(statements.match(/add column/g)).toHaveLength(1)
  })
})

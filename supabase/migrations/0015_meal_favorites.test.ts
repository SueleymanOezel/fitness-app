import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0015_meal_favorites.sql'), 'utf-8')
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0015_meal_favorites.sql', () => {
  it('turns on RLS for both new tables', () => {
    expect(statements).toMatch(/alter table public\.meal_favorites enable row level security/)
    expect(statements).toMatch(/alter table public\.meal_favorite_items enable row level security/)
  })

  it('limits both tables to their owner, for reading and for writing', () => {
    expect(statements.match(/create policy /g)?.length).toBe(2)
    expect(statements.match(/for all to authenticated/g)?.length).toBe(2)
    expect(statements.match(/with check/g)?.length).toBe(2)
  })

  it('only ever calls auth.uid() inside a scalar subselect (as in 0014)', () => {
    const calls = statements.match(/auth\.uid\(\)/g)?.length ?? 0
    expect(calls).toBe(4)
    expect(statements.match(/\(select auth\.uid\(\)\)/g)?.length).toBe(calls)
  })

  it('goes away with the account and drops items with their favorite or product', () => {
    expect(statements).toMatch(/user_id uuid not null references auth\.users \(id\) on delete cascade/)
    expect(statements).toMatch(/references public\.meal_favorites \(id\) on delete cascade/)
    expect(statements).toMatch(/references public\.products \(id\) on delete cascade/)
  })

  it('indexes every foreign key', () => {
    expect(statements.match(/create index if not exists/g)?.length).toBe(3)
  })

  it('rejects an empty name and a non-positive amount in the database itself', () => {
    expect(statements).toMatch(/check \(char_length\(btrim\(name\)\) between 1 and 60\)/)
    expect(statements).toMatch(/check \(menge > 0\)/)
  })
})

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(
  resolve(cwd(), 'supabase/migrations/0013_account_deletion_cascade.sql'),
  'utf-8',
)
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0013_account_deletion_cascade.sql', () => {
  it('replaces products_created_by_fkey with an on delete set null version', () => {
    expect(statements).toContain('alter table public.products')
    expect(statements).toContain('drop constraint products_created_by_fkey')
    expect(statements).toMatch(
      /add constraint products_created_by_fkey\s+foreign key \(created_by\) references auth\.users \(id\) on delete set null/,
    )
  })

  it('replaces exercises_created_by_fkey with an on delete set null version', () => {
    expect(statements).toContain('alter table public.exercises')
    expect(statements).toContain('drop constraint exercises_created_by_fkey')
    expect(statements).toMatch(
      /add constraint exercises_created_by_fkey\s+foreign key \(created_by\) references auth\.users \(id\) on delete set null/,
    )
  })
})

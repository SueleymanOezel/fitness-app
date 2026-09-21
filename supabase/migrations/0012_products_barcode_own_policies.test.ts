import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(
  resolve(cwd(), 'supabase/migrations/0012_products_barcode_own_policies.sql'),
  'utf-8',
)
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0012_products_barcode_own_policies.sql', () => {
  it('replaces products_update_own so only a barcode-less, owned row can be updated in place', () => {
    expect(statements).toContain('drop policy "products_update_own" on public.products')
    expect(statements).toMatch(/create policy "products_update_own" on public\.products/)
    expect(statements).toMatch(/for update to authenticated/)
    expect(statements).toMatch(
      /using \(created_by = auth\.uid\(\) and barcode is null\)/,
    )
  })

  it('has a matching with check, so an update cannot reassign created_by or attach a barcode', () => {
    expect(statements).toMatch(
      /with check \(created_by = auth\.uid\(\) and barcode is null\)/,
    )
  })

  it('replaces products_delete_own with the same barcode-is-null rule, so a barcode row cannot be deleted either', () => {
    expect(statements).toContain('drop policy "products_delete_own" on public.products')
    expect(statements).toMatch(/create policy "products_delete_own" on public\.products/)
    expect(statements).toMatch(/for delete to authenticated/)
    // Same predicate text appears twice now (update's using/with check, delete's using) —
    // count occurrences instead of relying on a single match.
    expect(statements.match(/created_by = auth\.uid\(\) and barcode is null/g)?.length).toBe(3)
  })
})

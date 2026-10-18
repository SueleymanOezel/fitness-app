import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0014_rls_initplan_and_hardening.sql'), 'utf-8')
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0014_rls_initplan_and_hardening.sql', () => {
  it('alters all 19 flagged policies and never drops one (roles and predicates stay)', () => {
    expect(statements.match(/^alter policy /gm)?.length).toBe(19)
    expect(statements).not.toMatch(/drop policy/i)
  })

  it('only ever calls auth.uid() inside a scalar subselect', () => {
    const calls = statements.match(/auth\.uid\(\)/g)?.length ?? 0
    const wrapped = statements.match(/\(select auth\.uid\(\)\)/g)?.length ?? 0
    expect(calls).toBeGreaterThan(0)
    expect(wrapped).toBe(calls)
  })

  it('keeps the barcode rule from 0012 on the shared products policies', () => {
    expect(statements.match(/created_by = \(select auth\.uid\(\)\) and barcode is null/g)?.length).toBe(3)
  })

  it('keeps with check wherever the policy had one, so an update cannot reassign ownership', () => {
    // 7 single-table ALL + 4 join-based ALL + products_update_own + exercises_insert + products_insert.
    expect(statements.match(/with check/g)?.length).toBe(14)
  })

  it('takes the two SECURITY DEFINER trigger functions off the public API', () => {
    expect(statements).toMatch(/revoke execute on function public\.handle_new_user\(\) from public, anon, authenticated/)
    expect(statements).toMatch(/revoke execute on function public\.rls_auto_enable\(\) from public, anon, authenticated/)
    // The platform function may be missing in a database built only from migrations.
    expect(statements).toContain("to_regprocedure('public.rls_auto_enable()')")
  })

  it('indexes the six flagged foreign keys', () => {
    expect(statements.match(/create index if not exists/g)?.length).toBe(6)
  })
})

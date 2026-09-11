import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0010_plan_assistent.sql'), 'utf-8')
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0010_plan_assistent.sql', () => {
  it('adds haeufigkeit_pro_woche and dauer_wochen to workout_plans as nullable columns', () => {
    expect(sql).toMatch(/alter table public\.workout_plans/)
    expect(statements).toContain('add column haeufigkeit_pro_woche integer')
    expect(statements).toContain('add column dauer_wochen integer')
    expect(statements).not.toMatch(/haeufigkeit_pro_woche integer\s+not null/)
    expect(statements).not.toMatch(/dauer_wochen integer\s+not null/)
  })

  it('constrains haeufigkeit_pro_woche to 1..7 and dauer_wochen to a positive number', () => {
    expect(statements).toMatch(/check\s*\(\s*haeufigkeit_pro_woche between 1 and 7\s*\)/)
    expect(statements).toMatch(/check\s*\(\s*dauer_wochen > 0\s*\)/)
  })

  it('adds no table or policy — an alter on an existing RLS-protected table', () => {
    expect(sql).not.toMatch(/create table/i)
    expect(sql).not.toMatch(/create policy/i)
  })
})

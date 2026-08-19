import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0003_meal_sections.sql'), 'utf-8')

describe('0003_meal_sections.sql', () => {
  it('adds the four preset section names with their defaults', () => {
    expect(sql).toMatch(/add column mahlzeit_1_name text not null default 'Frühstück'/)
    expect(sql).toMatch(/add column mahlzeit_2_name text not null default 'Mittagessen'/)
    expect(sql).toMatch(/add column mahlzeit_3_name text not null default 'Abendessen'/)
    expect(sql).toMatch(/add column mahlzeit_4_name text not null default 'Snacks'/)
  })

  it('adds the two optional section names as nullable', () => {
    expect(sql).toMatch(/add column mahlzeit_5_name text(?!\s+not null)/)
    expect(sql).toMatch(/add column mahlzeit_6_name text(?!\s+not null)/)
  })

  it('adds a nullable slot column to food_entries, constrained to 1-6', () => {
    // Nullable on purpose: entries logged before this migration have no section,
    // and a default would file them under a meal they never belonged to.
    expect(sql).toMatch(/alter table public\.food_entries/)
    expect(sql).toMatch(/add column mahlzeit smallint check \(mahlzeit between 1 and 6\)/)
  })

  it('adds no table and no policy', () => {
    expect(sql).not.toMatch(/create table/i)
    expect(sql).not.toMatch(/create policy/i)
  })
})

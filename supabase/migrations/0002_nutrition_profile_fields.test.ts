import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(
  resolve(cwd(), 'supabase/migrations/0002_nutrition_profile_fields.sql'),
  'utf-8',
)

describe('0002_nutrition_profile_fields.sql', () => {
  it('adds the calorie-goal columns to profiles', () => {
    expect(sql).toMatch(/add column geschlecht text/)
    expect(sql).toMatch(/add column aktivitaetslevel text/)
    expect(sql).toMatch(/add column ziel text/)
    expect(sql).toMatch(/add column ziel_delta_kcal numeric not null default 500/)
    expect(sql).toMatch(/add column taegliches_kalorienziel numeric/)
  })

  it('constrains geschlecht, aktivitaetslevel, and ziel to their allowed values', () => {
    expect(sql).toContain("check (geschlecht in ('maennlich', 'weiblich'))")
    expect(sql).toContain(
      "check (aktivitaetslevel in ('sitzend', 'leicht', 'moderat', 'hoch', 'sehr_hoch'))",
    )
    expect(sql).toContain("check (ziel in ('abnehmen', 'halten', 'zunehmen'))")
  })

  it('adds a unique index on products.barcode for non-null barcodes', () => {
    expect(sql).toContain(
      'create unique index products_barcode_unique on public.products (barcode) where barcode is not null',
    )
  })
})

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'

const sql = readFileSync(resolve(cwd(), 'supabase/migrations/0005_analysis_fields.sql'), 'utf-8')
/** Comments explain the columns and name things the statements must not touch. */
const statements = sql.replace(/^\s*--.*$/gm, '')

describe('0005_analysis_fields.sql', () => {
  it('adds rir to the sets, constrained to 0-5 and nullable', () => {
    // Nullable on purpose: a set logged without a rating must stay valid, or the
    // live mode would block on a field nobody wants to fill mid-workout.
    expect(sql).toMatch(/alter table public\.workout_session_sets/)
    expect(sql).toMatch(/add column rir smallint check \(rir between 0 and 5\)(?!\s+not null)/)
  })

  it('adds the warm-up flag defaulting to false', () => {
    // not null with a default: every existing set predates the flag and was a
    // working set as far as the volume charts are concerned.
    expect(sql).toMatch(/add column ist_aufwaermsatz boolean not null default false/)
  })

  it('adds the body fat percentage, constrained to 0-100', () => {
    expect(sql).toMatch(/alter table public\.body_metrics/)
    expect(sql).toMatch(
      /add column koerperfettanteil numeric check \(koerperfettanteil >= 0 and koerperfettanteil <= 100\)/,
    )
  })

  it('adds the three nutrients to products as nullable columns', () => {
    expect(sql).toMatch(/alter table public\.products/)
    for (const column of ['ballaststoffe', 'zucker', 'salz']) {
      expect(statements).toContain(`add column ${column} numeric`)
      // Nullable: we do not know these values for anything already stored.
      expect(statements).not.toContain(`add column ${column} numeric not null`)
    }
  })

  it('leaves satz_nummer alone', () => {
    // The warm-up flag must not renumber anything: satz_nummer stays a plain
    // running order, and existing rows keep the numbers they were written with.
    expect(statements).not.toMatch(/satz_nummer/)
  })

  it('adds no table and no policy', () => {
    expect(sql).not.toMatch(/create table/i)
    expect(sql).not.toMatch(/create policy/i)
  })
})

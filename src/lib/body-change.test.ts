import { describe, expect, it } from 'vitest'
import { changeSince, latestValue } from './body-change'
import type { BodyMetricRow } from './body-metrics'

const row = (id: string, datum: string, overrides: Partial<BodyMetricRow> = {}): BodyMetricRow => ({
  id,
  datum,
  gewicht: null,
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
  ...overrides,
})

// Newest first, the order the hook delivers.
const rows: BodyMetricRow[] = [
  row('c', '2026-08-24', { gewicht: 82.5 }),
  row('b', '2026-08-20', { bauchumfang: 88 }),
  row('a', '2026-08-17', { gewicht: 83.3, bauchumfang: 90 }),
]

describe('latestValue', () => {
  it('returns the newest row that has the value with its date', () => {
    expect(latestValue(rows, 'gewicht')).toEqual({ value: 82.5, datum: '2026-08-24' })
  })

  it('skips rows in which the value was not measured', () => {
    // 24.08. has no circumference, so the newest one is from the 20th.
    expect(latestValue(rows, 'bauchumfang')).toEqual({ value: 88, datum: '2026-08-20' })
  })

  it('returns null when the value was never measured', () => {
    expect(latestValue(rows, 'armumfang')).toBeNull()
  })

  it('returns null for an empty history', () => {
    expect(latestValue([], 'gewicht')).toBeNull()
  })
})

describe('changeSince', () => {
  it('compares against the previous row that carried the same value', () => {
    // Not against 20.08., which has no weight at all.
    expect(changeSince(rows, 'gewicht')).toEqual({ delta: -0.8, datum: '2026-08-17' })
  })

  it('reports a gain as a positive delta', () => {
    expect(changeSince(rows, 'bauchumfang')).toEqual({ delta: -2, datum: '2026-08-17' })
    expect(changeSince([row('y', '2026-08-24', { gewicht: 84 }), row('x', '2026-08-17', { gewicht: 83 })], 'gewicht')).toEqual({
      delta: 1,
      datum: '2026-08-17',
    })
  })

  it('returns null when there is only one measurement to compare', () => {
    expect(changeSince([row('x', '2026-08-24', { gewicht: 82 })], 'gewicht')).toBeNull()
  })

  it('returns null when the value was never measured', () => {
    expect(changeSince(rows, 'beinumfang')).toBeNull()
  })
})

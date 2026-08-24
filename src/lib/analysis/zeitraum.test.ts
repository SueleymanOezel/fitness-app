import { describe, expect, it } from 'vitest'
import { rangeStart, STANDARD_ZEITRAUM, ZEITRAEUME } from './zeitraum'

describe('rangeStart', () => {
  it('counts back whole local days', () => {
    const jetzt = new Date(2026, 7, 24, 15, 0)
    expect(rangeStart(30, jetzt)).toBe('2026-07-25')
  })

  it('crosses a year boundary', () => {
    const jetzt = new Date(2026, 0, 10, 8, 0)
    expect(rangeStart(30, jetzt)).toBe('2025-12-11')
  })

  it('returns null for the whole history', () => {
    // null means "no lower bound" — a fixed early date would silently cut off
    // anyone who imported older data.
    expect(rangeStart('alles', new Date(2026, 7, 24))).toBeNull()
  })

  it('offers exactly the four documented ranges, 90 days as the default', () => {
    expect(ZEITRAEUME.map((z) => z.wert)).toEqual([30, 90, 365, 'alles'])
    expect(STANDARD_ZEITRAUM).toBe(90)
  })
})

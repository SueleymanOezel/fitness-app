import { describe, expect, it } from 'vitest'
import { wochenAktiv } from './plan-alter'

describe('wochenAktiv', () => {
  it('is 0 right after creation', () => {
    const created = '2026-01-01T00:00:00.000Z'
    const now = new Date('2026-01-01T00:00:00.000Z')
    expect(wochenAktiv(created, now)).toBe(0)
  })

  it('is still 0 one day short of a full week', () => {
    const created = '2026-01-01T00:00:00.000Z'
    const now = new Date('2026-01-07T23:59:59.000Z')
    expect(wochenAktiv(created, now)).toBe(0)
  })

  it('becomes 1 exactly one week later', () => {
    const created = '2026-01-01T00:00:00.000Z'
    const now = new Date('2026-01-08T00:00:00.000Z')
    expect(wochenAktiv(created, now)).toBe(1)
  })

  it('counts multiple full weeks', () => {
    const created = '2026-01-01T00:00:00.000Z'
    const now = new Date('2026-01-29T12:00:00.000Z') // 4 weeks + half a day
    expect(wochenAktiv(created, now)).toBe(4)
  })
})

import { describe, expect, it } from 'vitest'
import { wochenStart, wochenLabel } from './wochen'

describe('wochenStart', () => {
  it('returns the Monday of the week', () => {
    expect(wochenStart(new Date(2026, 7, 19, 10, 0).toISOString())).toBe('2026-08-17')
  })

  it('keeps Sunday in the week that started the Monday before', () => {
    expect(wochenStart(new Date(2026, 7, 23, 10, 0).toISOString())).toBe('2026-08-17')
  })
})

describe('wochenLabel', () => {
  it('names the ISO week of a Monday', () => {
    expect(wochenLabel('2026-08-17')).toBe('2026-KW34')
    expect(wochenLabel('2026-08-24')).toBe('2026-KW35')
  })
})

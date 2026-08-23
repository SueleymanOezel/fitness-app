import { describe, expect, it } from 'vitest'
import { metForCategory } from './met-categories'

describe('metForCategory', () => {
  it('returns the documented value for each known free-exercise-db category', () => {
    expect(metForCategory('strength')).toBe(5.0)
    expect(metForCategory('cardio')).toBe(8.0)
    expect(metForCategory('stretching')).toBe(2.5)
    expect(metForCategory('plyometrics')).toBe(8.0)
    expect(metForCategory('powerlifting')).toBe(6.0)
    expect(metForCategory('strongman')).toBe(6.0)
    expect(metForCategory('olympic weightlifting')).toBe(6.0)
  })

  it('falls back to a documented moderate value for an unknown category', () => {
    expect(metForCategory('unknown-category')).toBe(5.0)
  })
})

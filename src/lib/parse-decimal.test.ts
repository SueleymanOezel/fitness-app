import { describe, expect, it } from 'vitest'
import { parseDecimal } from './parse-decimal'

describe('parseDecimal', () => {
  it('reads a German decimal comma and a dot alike', () => {
    expect(parseDecimal('22,5')).toBe(22.5)
    expect(parseDecimal('22.5')).toBe(22.5)
    expect(parseDecimal(' 60 ')).toBe(60)
  })

  it('keeps an empty field unset instead of turning it into 0', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('   ')).toBeNull()
  })

  it('rejects anything that is not a number, but leaves the range to the caller', () => {
    expect(parseDecimal('abc')).toBeUndefined()
    expect(parseDecimal('1,2,3')).toBeUndefined()
    expect(parseDecimal('-500')).toBe(-500)
  })

  it('rejects fractions when an integer is required', () => {
    expect(parseDecimal('10', { integer: true })).toBe(10)
    expect(parseDecimal('10,5', { integer: true })).toBeUndefined()
  })
})

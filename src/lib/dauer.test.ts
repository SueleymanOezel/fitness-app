import { describe, expect, it } from 'vitest'
import { dauerText } from './dauer'

describe('dauerText', () => {
  it('shows minutes below an hour and hours with padded minutes above', () => {
    expect(dauerText(32)).toBe('32 min')
    expect(dauerText(65)).toBe('1 h 05 min')
    expect(dauerText(659)).toBe('10 h 59 min')
    expect(dauerText(-3)).toBe('0 min')
  })
})

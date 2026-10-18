import { describe, expect, it } from 'vitest'
import { tooltipZahl, zahlDe } from './zahl'

describe('zahlDe', () => {
  it('writes a decimal comma and drops trailing zeros', () => {
    expect(zahlDe(72.5)).toBe('72,5')
    expect(zahlDe(80)).toBe('80')
    expect(zahlDe(82.456)).toBe('82,46')
  })

  it('uses no thousands separator, so the text can go back into an input', () => {
    expect(zahlDe(12500)).toBe('12500')
  })
})

describe('tooltipZahl', () => {
  it('formats numbers and passes anything else through', () => {
    expect(tooltipZahl(1234.56)).toBe('1234,6')
    expect(tooltipZahl('x')).toBe('x')
    expect(tooltipZahl(undefined)).toBe('')
  })
})

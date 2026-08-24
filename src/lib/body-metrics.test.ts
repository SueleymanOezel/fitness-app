import { describe, expect, it } from 'vitest'
import { EMPTY_INPUT, parseBodyMetrics, type BodyMetricInput } from './body-metrics'

const input = (overrides: Partial<BodyMetricInput>): BodyMetricInput => ({
  ...EMPTY_INPUT,
  ...overrides,
})

describe('parseBodyMetrics', () => {
  it('parses the values that were given and leaves the rest null', () => {
    expect(parseBodyMetrics(input({ gewicht: '82.5', bauchumfang: '88' }))).toEqual({
      gewicht: 82.5,
      bauchumfang: 88,
      beinumfang: null,
      armumfang: null,
      ruckenumfang: null,
      brustumfang: null,
      koerperfettanteil: null,
    })
  })

  it('rejects an entry in which nothing was measured', () => {
    // An empty row carries no statement and would only clutter the history.
    expect(parseBodyMetrics(EMPTY_INPUT)).toBeNull()
  })

  it('rejects a weight outside the plausible range', () => {
    // Same 30–300 range as aktuelles_gewicht on the profile page: a body entry
    // must not sync a weight the profile form would then refuse to save back.
    expect(parseBodyMetrics(input({ gewicht: '25' }))).toBeNull()
    expect(parseBodyMetrics(input({ gewicht: '350' }))).toBeNull()
    expect(parseBodyMetrics(input({ gewicht: '30' }))?.gewicht).toBe(30)
    expect(parseBodyMetrics(input({ gewicht: '300' }))?.gewicht).toBe(300)
  })

  it('rejects a circumference outside the plausible range', () => {
    expect(parseBodyMetrics(input({ bauchumfang: '4' }))).toBeNull()
    expect(parseBodyMetrics(input({ bauchumfang: '400' }))).toBeNull()
  })

  it('rejects a body fat percentage above 100', () => {
    expect(parseBodyMetrics(input({ koerperfettanteil: '150' }))).toBeNull()
  })

  it('accepts a body fat percentage of zero as given, not as missing', () => {
    // Number('0') is falsy — a truthiness check here would silently drop it.
    expect(parseBodyMetrics(input({ koerperfettanteil: '0' }))?.koerperfettanteil).toBe(0)
  })

  it('rejects text that is not a number', () => {
    expect(parseBodyMetrics(input({ gewicht: 'schwer' }))).toBeNull()
  })

  it('treats whitespace as not measured', () => {
    expect(parseBodyMetrics(input({ gewicht: '   ' }))).toBeNull()
  })
})

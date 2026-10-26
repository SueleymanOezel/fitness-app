import { describe, expect, it } from 'vitest'
import { gesternRange } from './use-yesterday-entries'

describe('gesternRange', () => {
  it('is the whole local day before, also across a month end', () => {
    const { start, end } = gesternRange(new Date(2026, 10, 1, 8, 30))
    expect(new Date(start)).toEqual(new Date(2026, 9, 31))
    expect(new Date(end)).toEqual(new Date(2026, 10, 1))
  })
})

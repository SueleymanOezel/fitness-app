import { describe, expect, it } from 'vitest'
import { levelLabel } from './level-labels'

describe('levelLabel', () => {
  it('translates every one of the 3 known source values', () => {
    const values = ['beginner', 'intermediate', 'expert']
    for (const value of values) {
      const label = levelLabel(value)
      expect(label).not.toBe(value)
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('falls back to the raw value for an unknown level', () => {
    expect(levelLabel('some-future-value')).toBe('some-future-value')
  })
})

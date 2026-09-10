import { describe, expect, it } from 'vitest'
import { equipmentLabel } from './equipment-labels'

describe('equipmentLabel', () => {
  it('translates every one of the 12 known source values', () => {
    const values = [
      'bands',
      'barbell',
      'body only',
      'cable',
      'dumbbell',
      'e-z curl bar',
      'exercise ball',
      'foam roll',
      'kettlebells',
      'machine',
      'medicine ball',
      'other',
    ]
    for (const value of values) {
      const label = equipmentLabel(value)
      expect(label).not.toBe(value)
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('falls back to the raw value for unknown equipment', () => {
    expect(equipmentLabel('some-future-value')).toBe('some-future-value')
  })
})

import { describe, expect, it } from 'vitest'
import { muskelgruppeLabel } from './muscle-group-labels'

describe('muskelgruppeLabel', () => {
  it('translates every one of the 17 known source values', () => {
    const values = [
      'abdominals',
      'abductors',
      'adductors',
      'biceps',
      'calves',
      'chest',
      'forearms',
      'glutes',
      'hamstrings',
      'lats',
      'lower back',
      'middle back',
      'neck',
      'quadriceps',
      'shoulders',
      'traps',
      'triceps',
    ]
    for (const value of values) {
      const label = muskelgruppeLabel(value)
      expect(label).not.toBe(value)
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('falls back to the raw value for an unknown muscle group', () => {
    expect(muskelgruppeLabel('some-future-value')).toBe('some-future-value')
  })
})

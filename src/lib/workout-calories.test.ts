import { describe, expect, it } from 'vitest'
import { sessionKalorien } from './workout-calories'

describe('sessionKalorien', () => {
  it('multiplies the average MET across all sets by weight and duration', () => {
    const sets = [{ exercise: { met_wert: 5 } }, { exercise: { met_wert: 5 } }]
    // avg MET 5 × 80 kg × 1 h = 400
    expect(sessionKalorien(sets, 80, 1)).toBe(400)
  })

  it('weighs an exercise with more sets more heavily in the average', () => {
    const sets = [
      { exercise: { met_wert: 5 } },
      { exercise: { met_wert: 5 } },
      { exercise: { met_wert: 5 } },
      { exercise: { met_wert: 8 } },
    ]
    // avg MET (5+5+5+8)/4 = 5.75 × 80 kg × 1 h = 460
    expect(sessionKalorien(sets, 80, 1)).toBe(460)
  })

  it('returns 0 for an empty set list instead of failing', () => {
    expect(sessionKalorien([], 80, 1)).toBe(0)
  })
})

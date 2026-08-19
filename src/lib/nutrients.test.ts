import { describe, expect, it } from 'vitest'
import { parseNutrients } from './nutrients'

describe('parseNutrients', () => {
  it('parses plausible values', () => {
    expect(parseNutrients({ kalorien: '250', eiweiss: '10', fett: '5', kohlenhydrate: '30' })).toEqual({
      kalorien: 250,
      eiweiss: 10,
      fett: 5,
      kohlenhydrate: 30,
    })
  })

  it('keeps empty macros as null', () => {
    expect(parseNutrients({ kalorien: '250', eiweiss: '', fett: '', kohlenhydrate: '' })).toEqual({
      kalorien: 250,
      eiweiss: null,
      fett: null,
      kohlenhydrate: null,
    })
  })

  it('rejects a negative calorie value', () => {
    expect(parseNutrients({ kalorien: '-300', eiweiss: '', fett: '', kohlenhydrate: '' })).toBeNull()
  })

  it('rejects calories above 900 per 100 g', () => {
    expect(parseNutrients({ kalorien: '1e21', eiweiss: '', fett: '', kohlenhydrate: '' })).toBeNull()
  })

  it('rejects a macro above 100 g per 100 g', () => {
    expect(parseNutrients({ kalorien: '250', eiweiss: '150', fett: '', kohlenhydrate: '' })).toBeNull()
  })

  it('rejects missing calories', () => {
    // Number('') is 0, not NaN — an isNaN-only guard would let this through.
    expect(parseNutrients({ kalorien: '', eiweiss: '10', fett: '', kohlenhydrate: '' })).toBeNull()
  })
})

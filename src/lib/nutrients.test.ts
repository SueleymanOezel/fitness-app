import { describe, expect, it } from 'vitest'
import { parseNutrients, type NutrientInput } from './nutrients'

const EMPTY: NutrientInput = {
  kalorien: '',
  eiweiss: '',
  fett: '',
  kohlenhydrate: '',
  ballaststoffe: '',
  zucker: '',
  salz: '',
}

const input = (overrides: Partial<NutrientInput>): NutrientInput => ({ ...EMPTY, ...overrides })

describe('parseNutrients', () => {
  it('parses plausible values', () => {
    expect(
      parseNutrients(
        input({
          kalorien: '250',
          eiweiss: '10',
          fett: '5',
          kohlenhydrate: '30',
          ballaststoffe: '4',
          zucker: '12',
          salz: '1.2',
        }),
      ),
    ).toEqual({
      kalorien: 250,
      eiweiss: 10,
      fett: 5,
      kohlenhydrate: 30,
      ballaststoffe: 4,
      zucker: 12,
      salz: 1.2,
    })
  })

  it('keeps every empty gram field as null', () => {
    expect(parseNutrients(input({ kalorien: '250' }))).toEqual({
      kalorien: 250,
      eiweiss: null,
      fett: null,
      kohlenhydrate: null,
      ballaststoffe: null,
      zucker: null,
      salz: null,
    })
  })

  it('rejects a negative calorie value', () => {
    expect(parseNutrients(input({ kalorien: '-300' }))).toBeNull()
  })

  it('rejects calories above 900 per 100 g', () => {
    expect(parseNutrients(input({ kalorien: '1e21' }))).toBeNull()
  })

  it('rejects a macro above 100 g per 100 g', () => {
    expect(parseNutrients(input({ kalorien: '250', eiweiss: '150' }))).toBeNull()
  })

  it.each(['ballaststoffe', 'zucker', 'salz'] as const)(
    'rejects an implausible %s the same way as a macro',
    (field) => {
      // A new field must not become the hole that lets nonsense into the shared
      // products table.
      expect(parseNutrients(input({ kalorien: '250', [field]: '150' }))).toBeNull()
      expect(parseNutrients(input({ kalorien: '250', [field]: '-1' }))).toBeNull()
    },
  )

  it('rejects missing calories', () => {
    // Number('') is 0, not NaN — an isNaN-only guard would let this through.
    expect(parseNutrients(input({ eiweiss: '10' }))).toBeNull()
  })
})

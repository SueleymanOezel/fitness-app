import { describe, expect, it } from 'vitest'
import { entryKalorien, entryMakro, sumKalorien, sumMakro } from './entry-calories'
import type { FoodEntry } from '../hooks/use-food-entries'

function entry(menge: number, kalorien: number | null): FoodEntry {
  return {
    id: 'e1',
    menge,
    zeitpunkt: '2026-08-20T06:30:00.000Z',
    product_id: kalorien === null ? null : 'p1',
    mahlzeit: null,
    products:
      kalorien === null
        ? null
        : {
            id: 'p1',
            name: 'Testprodukt',
            barcode: null,
            created_by: 'u1',
            kalorien,
            eiweiss: null,
            fett: null,
            kohlenhydrate: null,
            ballaststoffe: null,
            zucker: null,
            salz: null,
          },
  }
}

describe('entryKalorien', () => {
  it('scales the per-100-g value by the amount', () => {
    expect(entryKalorien(entry(150, 100))).toBe(150)
  })

  it('counts a deleted product as zero', () => {
    expect(entryKalorien(entry(150, null))).toBe(0)
  })
})

describe('sumKalorien', () => {
  it('adds the entries up', () => {
    expect(sumKalorien([entry(150, 100), entry(50, 200)])).toBe(250)
  })

  it('is zero for no entries', () => {
    expect(sumKalorien([])).toBe(0)
  })
})

describe('entryMakro', () => {
  it('scales the per-100-g value by the amount', () => {
    expect(
      entryMakro({ menge: 200, products: { eiweiss: 10, fett: 5, kohlenhydrate: 20 } }, 'eiweiss'),
    ).toBe(20)
  })

  it('counts a deleted product as zero', () => {
    expect(entryMakro({ menge: 200, products: null }, 'eiweiss')).toBe(0)
  })

  it('counts a missing macro value as zero', () => {
    expect(
      entryMakro({ menge: 200, products: { eiweiss: null, fett: 5, kohlenhydrate: 20 } }, 'eiweiss'),
    ).toBe(0)
  })
})

describe('sumMakro', () => {
  it('adds the entries up', () => {
    expect(
      sumMakro(
        [
          { menge: 200, products: { eiweiss: 10, fett: 5, kohlenhydrate: 20 } },
          { menge: 50, products: { eiweiss: 4, fett: 40, kohlenhydrate: 0 } },
        ],
        'eiweiss',
      ),
    ).toBe(22)
  })

  it('is zero for no entries', () => {
    expect(sumMakro([], 'eiweiss')).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { entryKalorien, sumKalorien } from './entry-calories'
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

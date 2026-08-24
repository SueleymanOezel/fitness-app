import { describe, expect, it } from 'vitest'
import { kalorienJeTag } from './nutrition-charts'

const um = (tag: number, stunde: number) => new Date(2026, 7, tag, stunde, 0).toISOString()

describe('kalorienJeTag', () => {
  it('sums a day and scales by the amount, oldest first', () => {
    // Nutritional values are per 100 g.
    const punkte = kalorienJeTag([
      { zeitpunkt: um(24, 8), menge: 200, products: { kalorien: 100 } },
      { zeitpunkt: um(24, 19), menge: 50, products: { kalorien: 400 } },
      { zeitpunkt: um(23, 12), menge: 100, products: { kalorien: 250 } },
    ])
    expect(punkte).toEqual([
      { tag: '2026-08-23', kalorien: 250 },
      { tag: '2026-08-24', kalorien: 400 },
    ])
  })

  it('keeps a late entry on its own local day', () => {
    const punkte = kalorienJeTag([
      { zeitpunkt: um(24, 23), menge: 100, products: { kalorien: 100 } },
    ])
    expect(punkte[0].tag).toBe('2026-08-24')
  })

  it('skips an entry whose product is gone', () => {
    // The product row can be deleted; the entry stays. Counting it as 0 would
    // be a silent lie about that day's intake, so the entry drops out entirely.
    expect(kalorienJeTag([{ zeitpunkt: um(24, 8), menge: 100, products: null }])).toEqual([])
  })

  it('omits days without entries rather than inventing zeros', () => {
    // A day with no entry means "not logged", not "ate nothing" — a zero bar
    // would read as a fasting day.
    const punkte = kalorienJeTag([
      { zeitpunkt: um(20, 8), menge: 100, products: { kalorien: 100 } },
      { zeitpunkt: um(24, 8), menge: 100, products: { kalorien: 100 } },
    ])
    expect(punkte.map((p) => p.tag)).toEqual(['2026-08-20', '2026-08-24'])
  })
})

import { describe, expect, it } from 'vitest'
import { kalorienJeTag, makroAnteileHeute, makroVerlauf, kalorienJeAbschnitt } from './nutrition-charts'
import type { MealSectionNames } from '../meal-sections'

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

describe('makroAnteileHeute', () => {
  it('splits by energy share, not by gram share', () => {
    // 20g protein = 80 kcal, 20g fat = 180 kcal, 20g carbs = 80 kcal (total 340 kcal).
    // By gram all three would tie at 33%; fat carries more than twice the energy
    // per gram (9 vs 4 kcal/g), so its energy share must come out far higher.
    const anteile = makroAnteileHeute(
      [{ zeitpunkt: um(24, 8), menge: 100, products: { eiweiss: 20, fett: 20, kohlenhydrate: 20 } }],
      '2026-08-24',
    )
    expect(anteile).toEqual([
      { makro: 'Eiweiß', anteil: 24, gramm: 20 },
      { makro: 'Fett', anteil: 53, gramm: 20 },
      { makro: 'Kohlenhydrate', anteil: 24, gramm: 20 },
    ])
  })

  it('keeps only entries from the given day', () => {
    const anteile = makroAnteileHeute(
      [
        { zeitpunkt: um(24, 8), menge: 100, products: { eiweiss: 20, fett: 0, kohlenhydrate: 0 } },
        { zeitpunkt: um(23, 8), menge: 100, products: { eiweiss: 100, fett: 0, kohlenhydrate: 0 } },
      ],
      '2026-08-24',
    )
    expect(anteile).toEqual([
      { makro: 'Eiweiß', anteil: 100, gramm: 20 },
      { makro: 'Fett', anteil: 0, gramm: 0 },
      { makro: 'Kohlenhydrate', anteil: 0, gramm: 0 },
    ])
  })

  it('returns nothing without any macros today', () => {
    expect(makroAnteileHeute([], '2026-08-24')).toEqual([])
    expect(
      makroAnteileHeute(
        [{ zeitpunkt: um(24, 8), menge: 0, products: { eiweiss: 0, fett: 0, kohlenhydrate: 0 } }],
        '2026-08-24',
      ),
    ).toEqual([])
  })

  it('skips an entry whose product is gone', () => {
    expect(makroAnteileHeute([{ zeitpunkt: um(24, 8), menge: 100, products: null }], '2026-08-24')).toEqual(
      [],
    )
  })
})

describe('makroVerlauf', () => {
  it('sums each macro per day, oldest first', () => {
    const punkte = makroVerlauf([
      { zeitpunkt: um(24, 8), menge: 200, products: { eiweiss: 10, fett: 5, kohlenhydrate: 20 } },
      { zeitpunkt: um(24, 19), menge: 50, products: { eiweiss: 4, fett: 40, kohlenhydrate: 0 } },
      { zeitpunkt: um(23, 12), menge: 100, products: { eiweiss: 8, fett: 2, kohlenhydrate: 30 } },
    ])
    expect(punkte).toEqual([
      { tag: '2026-08-23', eiweiss: 8, fett: 2, kohlenhydrate: 30 },
      { tag: '2026-08-24', eiweiss: 22, fett: 30, kohlenhydrate: 40 },
    ])
  })

  it('counts a missing macro as zero, not as a missing entry', () => {
    const punkte = makroVerlauf([
      { zeitpunkt: um(24, 8), menge: 100, products: { eiweiss: null, fett: 5, kohlenhydrate: 20 } },
    ])
    expect(punkte).toEqual([{ tag: '2026-08-24', eiweiss: 0, fett: 5, kohlenhydrate: 20 }])
  })

  it('returns nothing without entries', () => {
    expect(makroVerlauf([])).toEqual([])
  })
})

const namen: MealSectionNames = {
  mahlzeit_1_name: 'Frühstück',
  mahlzeit_2_name: 'Mittagessen',
  mahlzeit_3_name: 'Abendessen',
  mahlzeit_4_name: 'Snacks',
  mahlzeit_5_name: null,
  mahlzeit_6_name: null,
}

describe('kalorienJeAbschnitt', () => {
  it('sums calories per named section over the whole range', () => {
    const punkte = kalorienJeAbschnitt(
      [
        { menge: 200, products: { kalorien: 100 }, mahlzeit: 1 }, // 200 kcal, Fruehstueck
        { menge: 100, products: { kalorien: 100 }, mahlzeit: 1 }, // 100 kcal, Fruehstueck
        { menge: 100, products: { kalorien: 300 }, mahlzeit: 2 }, // 300 kcal, Mittagessen
      ],
      namen,
    )
    expect(punkte).toEqual([
      { name: 'Frühstück', kalorien: 300 },
      { name: 'Mittagessen', kalorien: 300 },
      { name: 'Abendessen', kalorien: 0 },
      { name: 'Snacks', kalorien: 0 },
    ])
  })

  it('keeps an occupied but unnamed slot as "Abschnitt N"', () => {
    const punkte = kalorienJeAbschnitt([{ menge: 100, products: { kalorien: 200 }, mahlzeit: 5 }], namen)
    expect(punkte.find((p) => p.name === 'Abschnitt 5')).toEqual({ name: 'Abschnitt 5', kalorien: 200 })
  })

  it('groups unassigned entries under "Ohne Zuordnung"', () => {
    const punkte = kalorienJeAbschnitt([{ menge: 100, products: { kalorien: 150 }, mahlzeit: null }], namen)
    expect(punkte.find((p) => p.name === 'Ohne Zuordnung')).toEqual({
      name: 'Ohne Zuordnung',
      kalorien: 150,
    })
  })

  it('returns the four named sections with zero calories when there are no entries', () => {
    expect(kalorienJeAbschnitt([], namen)).toEqual([
      { name: 'Frühstück', kalorien: 0 },
      { name: 'Mittagessen', kalorien: 0 },
      { name: 'Abendessen', kalorien: 0 },
      { name: 'Snacks', kalorien: 0 },
    ])
  })
})

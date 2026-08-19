import { describe, expect, it } from 'vitest'
import { mealSections, visibleSections } from './meal-sections'

const names = {
  mahlzeit_1_name: 'Frühstück',
  mahlzeit_2_name: 'Mittagessen',
  mahlzeit_3_name: 'Abendessen',
  mahlzeit_4_name: 'Snacks',
  mahlzeit_5_name: null,
  mahlzeit_6_name: null,
}

describe('mealSections', () => {
  it('lists the named slots in order', () => {
    expect(mealSections(names)).toEqual([
      { slot: 1, name: 'Frühstück' },
      { slot: 2, name: 'Mittagessen' },
      { slot: 3, name: 'Abendessen' },
      { slot: 4, name: 'Snacks' },
    ])
  })

  it('includes an added section', () => {
    expect(mealSections({ ...names, mahlzeit_5_name: 'Spätmahlzeit' })).toEqual([
      { slot: 1, name: 'Frühstück' },
      { slot: 2, name: 'Mittagessen' },
      { slot: 3, name: 'Abendessen' },
      { slot: 4, name: 'Snacks' },
      { slot: 5, name: 'Spätmahlzeit' },
    ])
  })

  it('skips a slot whose name is blank', () => {
    expect(mealSections({ ...names, mahlzeit_5_name: '   ' })).toEqual([
      { slot: 1, name: 'Frühstück' },
      { slot: 2, name: 'Mittagessen' },
      { slot: 3, name: 'Abendessen' },
      { slot: 4, name: 'Snacks' },
    ])
  })

  it('correctly indexes slot 6 when all other slots are empty', () => {
    expect(
      mealSections({
        mahlzeit_1_name: '',
        mahlzeit_2_name: '',
        mahlzeit_3_name: '',
        mahlzeit_4_name: '',
        mahlzeit_5_name: null,
        mahlzeit_6_name: 'Nachts',
      }),
    ).toEqual([{ slot: 6, name: 'Nachts' }])
  })
})

describe('visibleSections', () => {
  it('shows the named sections when every entry is filed', () => {
    const sections = visibleSections(names, [{ mahlzeit: 1 }, { mahlzeit: 4 }])
    expect(sections).toEqual([
      { slot: 1, name: 'Frühstück' },
      { slot: 2, name: 'Mittagessen' },
      { slot: 3, name: 'Abendessen' },
      { slot: 4, name: 'Snacks' },
    ])
  })

  it('appends the unassigned group only when such entries exist', () => {
    expect(visibleSections(names, [{ mahlzeit: 1 }])).toEqual([
      { slot: 1, name: 'Frühstück' },
      { slot: 2, name: 'Mittagessen' },
      { slot: 3, name: 'Abendessen' },
      { slot: 4, name: 'Snacks' },
    ])

    expect(visibleSections(names, [{ mahlzeit: 1 }, { mahlzeit: null }])).toEqual([
      { slot: 1, name: 'Frühstück' },
      { slot: 2, name: 'Mittagessen' },
      { slot: 3, name: 'Abendessen' },
      { slot: 4, name: 'Snacks' },
      { slot: null, name: 'Ohne Zuordnung' },
    ])
  })

  it('keeps an unnamed slot visible while it still holds entries', () => {
    // Otherwise those entries vanish from the page while still counting towards
    // the day's total — a number the user cannot trace back to anything.
    const sections = visibleSections(names, [{ mahlzeit: 5 }])
    expect(sections).toEqual([
      { slot: 1, name: 'Frühstück' },
      { slot: 2, name: 'Mittagessen' },
      { slot: 3, name: 'Abendessen' },
      { slot: 4, name: 'Snacks' },
      { slot: 5, name: 'Abschnitt 5' },
    ])
  })

  it('drops an unnamed slot once it is empty', () => {
    expect(visibleSections(names, [{ mahlzeit: 1 }])).toEqual([
      { slot: 1, name: 'Frühstück' },
      { slot: 2, name: 'Mittagessen' },
      { slot: 3, name: 'Abendessen' },
      { slot: 4, name: 'Snacks' },
    ])
  })

  it('shows only unassigned entries when no named sections are used', () => {
    expect(visibleSections(names, [{ mahlzeit: null }, { mahlzeit: null }])).toEqual([
      { slot: 1, name: 'Frühstück' },
      { slot: 2, name: 'Mittagessen' },
      { slot: 3, name: 'Abendessen' },
      { slot: 4, name: 'Snacks' },
      { slot: null, name: 'Ohne Zuordnung' },
    ])
  })

  it('returns empty array when no entries exist', () => {
    expect(visibleSections(names, [])).toEqual([
      { slot: 1, name: 'Frühstück' },
      { slot: 2, name: 'Mittagessen' },
      { slot: 3, name: 'Abendessen' },
      { slot: 4, name: 'Snacks' },
    ])
  })
})

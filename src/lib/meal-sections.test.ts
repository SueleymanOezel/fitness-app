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
    expect(mealSections({ ...names, mahlzeit_5_name: 'Spätmahlzeit' })).toHaveLength(5)
  })

  it('skips a slot whose name is blank', () => {
    expect(mealSections({ ...names, mahlzeit_5_name: '   ' })).toHaveLength(4)
  })
})

describe('visibleSections', () => {
  it('shows the named sections when every entry is filed', () => {
    const sections = visibleSections(names, [{ mahlzeit: 1 }, { mahlzeit: 4 }])
    expect(sections.map((section) => section.slot)).toEqual([1, 2, 3, 4])
  })

  it('appends the unassigned group only when such entries exist', () => {
    expect(visibleSections(names, [{ mahlzeit: 1 }]).some((s) => s.slot === null)).toBe(false)

    const withUnassigned = visibleSections(names, [{ mahlzeit: 1 }, { mahlzeit: null }])
    expect(withUnassigned[withUnassigned.length - 1]).toEqual({
      slot: null,
      name: 'Ohne Zuordnung',
    })
  })

  it('keeps an unnamed slot visible while it still holds entries', () => {
    // Otherwise those entries vanish from the page while still counting towards
    // the day's total — a number the user cannot trace back to anything.
    const sections = visibleSections(names, [{ mahlzeit: 5 }])
    expect(sections).toContainEqual({ slot: 5, name: 'Abschnitt 5' })
  })

  it('drops an unnamed slot once it is empty', () => {
    expect(visibleSections(names, [{ mahlzeit: 1 }]).some((s) => s.slot === 5)).toBe(false)
  })
})

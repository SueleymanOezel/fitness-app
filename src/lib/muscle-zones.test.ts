import { describe, expect, it } from 'vitest'
import { ALLE_ZONEN, zonenFuerTag } from './muscle-zones'

describe('zonenFuerTag', () => {
  it('leaves every zone untrained for a day with no exercises', () => {
    const zonen = zonenFuerTag([])
    for (const zone of ALLE_ZONEN) expect(zonen[zone]).toBeNull()
  })

  it('marks a zone primary when an exercise trains it as its primary muscle', () => {
    const zonen = zonenFuerTag([{ muskelgruppen_primaer: ['chest'], muskelgruppen_sekundaer: null }])
    expect(zonen.brust).toBe('primary')
  })

  it('marks a zone secondary when an exercise trains it only as a secondary muscle', () => {
    const zonen = zonenFuerTag([{ muskelgruppen_primaer: ['chest'], muskelgruppen_sekundaer: ['triceps'] }])
    expect(zonen.trizeps).toBe('secondary')
  })

  it('keeps a zone primary even if another exercise the same day only hits it as secondary', () => {
    const zonen = zonenFuerTag([
      { muskelgruppen_primaer: ['triceps'], muskelgruppen_sekundaer: null },
      { muskelgruppen_primaer: ['chest'], muskelgruppen_sekundaer: ['triceps'] },
    ])
    expect(zonen.trizeps).toBe('primary')
  })

  it('upgrades a zone from secondary to primary regardless of exercise order', () => {
    const zonen = zonenFuerTag([
      { muskelgruppen_primaer: ['chest'], muskelgruppen_sekundaer: ['triceps'] },
      { muskelgruppen_primaer: ['triceps'], muskelgruppen_sekundaer: null },
    ])
    expect(zonen.trizeps).toBe('primary')
  })

  it('combines several raw muscle values into the same simplified zone', () => {
    const zonen = zonenFuerTag([
      { muskelgruppen_primaer: ['biceps'], muskelgruppen_sekundaer: null },
      { muskelgruppen_primaer: ['forearms'], muskelgruppen_sekundaer: null },
    ])
    expect(zonen.arme).toBe('primary')
  })

  it('ignores null muscle-group arrays and unknown values without crashing', () => {
    const zonen = zonenFuerTag([
      { muskelgruppen_primaer: null, muskelgruppen_sekundaer: null },
      { muskelgruppen_primaer: ['some-future-value'], muskelgruppen_sekundaer: null },
    ])
    for (const zone of ALLE_ZONEN) expect(zonen[zone]).toBeNull()
  })

  it('maps every one of the 17 known muscle-group values to exactly one of the 10 zones', () => {
    const alleWerte = [
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
    for (const wert of alleWerte) {
      const zonen = zonenFuerTag([{ muskelgruppen_primaer: [wert], muskelgruppen_sekundaer: null }])
      const getroffeneZonen = ALLE_ZONEN.filter((zone) => zonen[zone] === 'primary')
      expect(getroffeneZonen).toHaveLength(1)
    }
  })
})

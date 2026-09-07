import { describe, expect, it } from 'vitest'
import { aktivitaetsraster, wochenKurzform } from './home-charts'

describe('aktivitaetsraster', () => {
  it('marks a day with a completed session as a training day', () => {
    const sessions = [{ beendet_am: '2026-08-24T18:00:00Z' }]
    const raster = aktivitaetsraster(sessions, '2026-08-24', '2026-08-25')
    expect(raster).toEqual([
      { datum: '2026-08-24', status: 'trainingstag' },
      { datum: '2026-08-25', status: 'restday' },
    ])
  })

  it('ignores an unfinished session', () => {
    const sessions = [{ beendet_am: null }]
    const raster = aktivitaetsraster(sessions, '2026-08-24', '2026-08-24')
    expect(raster).toEqual([{ datum: '2026-08-24', status: 'restday' }])
  })

  it('starts at the first training day when the range is "alles" (start=null) and there are sessions', () => {
    const sessions = [{ beendet_am: '2026-08-20T10:00:00Z' }]
    const raster = aktivitaetsraster(sessions, null, '2026-08-22')
    expect(raster.map((tag) => tag.datum)).toEqual(['2026-08-20', '2026-08-21', '2026-08-22'])
  })

  it('produces a single restday for a brand-new account with no sessions and no start', () => {
    const raster = aktivitaetsraster([], null, '2026-08-24')
    expect(raster).toEqual([{ datum: '2026-08-24', status: 'restday' }])
  })
})

describe('wochenKurzform', () => {
  it('combines training count, calorie average and weight change per week', () => {
    // Montag 2026-08-17 - Sonntag 2026-08-23
    const sessions = [{ beendet_am: '2026-08-18T10:00:00Z' }, { beendet_am: '2026-08-20T10:00:00Z' }]
    const tagesKalorien = [
      { tag: '2026-08-17', kalorien: 2000 },
      { tag: '2026-08-19', kalorien: 2200 },
    ]
    const gewichte = [
      { datum: '2026-08-17', gewicht: 83.0 },
      { datum: '2026-08-21', gewicht: 82.5 },
    ]
    const zeilen = wochenKurzform(sessions, tagesKalorien, gewichte)
    expect(zeilen).toEqual([
      {
        woche: '2026-KW34',
        trainingseinheiten: 2,
        kalorienschnitt: 2100,
        gewichtsAenderung: -0.5,
      },
    ])
  })

  it('leaves kalorienschnitt and gewichtsAenderung null without matching data', () => {
    const sessions = [{ beendet_am: '2026-08-18T10:00:00Z' }]
    const zeilen = wochenKurzform(sessions, [], [])
    expect(zeilen).toEqual([
      { woche: '2026-KW34', trainingseinheiten: 1, kalorienschnitt: null, gewichtsAenderung: null },
    ])
  })

  it('needs at least two weight measurements in the week for a change', () => {
    const gewichte = [{ datum: '2026-08-17', gewicht: 83.0 }]
    const zeilen = wochenKurzform([], [], gewichte)
    expect(zeilen[0].gewichtsAenderung).toBeNull()
  })

  it('omits a week with no signal from any of the three sources', () => {
    const zeilen = wochenKurzform([], [], [])
    expect(zeilen).toEqual([])
  })
})

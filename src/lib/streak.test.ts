import { describe, expect, it } from 'vitest'
import { streakText, trainingstage, wochenImPlan, wochenStreifen } from './streak'

// 2026-10-19 is a Monday.
describe('wochenImPlan', () => {
  it('counts consecutive weeks that reached the weekly target', () => {
    const tage = ['2026-10-06', '2026-10-08', '2026-10-10', '2026-10-13', '2026-10-15', '2026-10-17']
    expect(wochenImPlan(tage, '2026-10-19', 3)).toEqual({ wochen: 2, dieseWoche: 0, ziel: 3 })
  })

  it('does not punish a 3x-a-week plan for its rest days', () => {
    // Mon, Wed, Fri: three training days, four rest days — a full week in plan.
    expect(wochenImPlan(['2026-10-13', '2026-10-15', '2026-10-17'], '2026-10-18', 3)).toEqual({
      wochen: 1,
      dieseWoche: 3,
      ziel: 3,
    })
  })

  it('keeps the streak while the running week can still reach the target', () => {
    const tage = ['2026-10-13', '2026-10-15', '2026-10-17', '2026-10-20']
    expect(wochenImPlan(tage, '2026-10-21', 3)).toEqual({ wochen: 1, dieseWoche: 1, ziel: 3 })
  })

  it('a missed week breaks it', () => {
    const tage = ['2026-09-29', '2026-10-01', '2026-10-03', '2026-10-13', '2026-10-15', '2026-10-17']
    expect(wochenImPlan(tage, '2026-10-19', 3).wochen).toBe(1)
  })

  it('counts a day once, however many sessions it had', () => {
    expect(wochenImPlan(['2026-10-13', '2026-10-13', '2026-10-13'], '2026-10-18', 2).dieseWoche).toBe(1)
  })

  it('treats a missing or zero target as one training day a week', () => {
    expect(wochenImPlan(['2026-10-15'], '2026-10-18', 0)).toEqual({ wochen: 1, dieseWoche: 1, ziel: 1 })
  })

  it('is 0 without any training', () => {
    expect(wochenImPlan([], '2026-10-18', 3)).toEqual({ wochen: 0, dieseWoche: 0, ziel: 3 })
  })
})

describe('streakText', () => {
  it('says there is no week yet', () => {
    expect(streakText({ wochen: 0, dieseWoche: 0, ziel: 3 })).toBe('Noch keine Woche im Plan.')
  })

  it('shows the progress of the first week', () => {
    expect(streakText({ wochen: 0, dieseWoche: 2, ziel: 3 })).toBe('Diese Woche 2 von 3')
  })

  it('uses the singular for one week and adds the running week while it is open', () => {
    expect(streakText({ wochen: 1, dieseWoche: 1, ziel: 3 })).toBe('1 Woche in Folge · diese Woche 1 von 3')
  })

  it('drops the progress once the week is done', () => {
    expect(streakText({ wochen: 4, dieseWoche: 3, ziel: 3 })).toBe('4 Wochen in Folge')
  })
})

describe('trainingstage', () => {
  it('liefert sortierte, eindeutige lokale Tage und ignoriert unbeendete Sessions', () => {
    const lokal = (tag: number, stunde: number) => new Date(2026, 9, tag, stunde).toISOString()
    const tage = trainingstage([
      { beendet_am: lokal(14, 18) },
      { beendet_am: lokal(12, 9) },
      { beendet_am: lokal(14, 7) },
      { beendet_am: null },
    ])
    expect(tage).toEqual(['2026-10-12', '2026-10-14'])
  })
})

describe('wochenStreifen', () => {
  it('liefert Montag bis Sonntag der aktuellen Woche mit Markierungen', () => {
    // Mittwoch, 14.10.2026
    const woche = wochenStreifen(['2026-10-12', '2026-10-14'], '2026-10-14')
    expect(woche.map((tag) => tag.label)).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])
    expect(woche.map((tag) => tag.datum)).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
    ])
    expect(woche.map((tag) => tag.trainiert)).toEqual([true, false, true, false, false, false, false])
    expect(woche.filter((tag) => tag.heute).map((tag) => tag.datum)).toEqual(['2026-10-14'])
  })

  it('behandelt einen Sonntag als siebten Tag derselben Woche', () => {
    const woche = wochenStreifen([], '2026-10-18')
    expect(woche[0].datum).toBe('2026-10-12')
    expect(woche[6]).toMatchObject({ label: 'So', datum: '2026-10-18', heute: true })
  })

  it('läuft über den Monatswechsel', () => {
    // Sonntag, 01.11.2026 → Woche beginnt am 26.10.
    const woche = wochenStreifen([], '2026-11-01')
    expect(woche[0].datum).toBe('2026-10-26')
    expect(woche[6].datum).toBe('2026-11-01')
  })

  it('läuft über den Jahreswechsel', () => {
    // Freitag, 01.01.2027 → Woche beginnt am 28.12.2026
    const woche = wochenStreifen([], '2027-01-01')
    expect(woche[0].datum).toBe('2026-12-28')
    expect(woche[4]).toMatchObject({ datum: '2027-01-01', heute: true })
  })
})

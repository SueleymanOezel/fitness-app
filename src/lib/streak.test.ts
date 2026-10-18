import { describe, expect, it } from 'vitest'
import { aktuellerStreak, streakText, trainingstage, wochenStreifen } from './streak'

describe('aktuellerStreak', () => {
  it('counts backward from today while every day has a finished session', () => {
    const sessions = [
      { beendet_am: '2026-08-24T18:00:00Z' },
      { beendet_am: '2026-08-23T18:00:00Z' },
      { beendet_am: '2026-08-22T18:00:00Z' },
    ]
    expect(aktuellerStreak(sessions, '2026-08-24')).toBe(3)
  })

  it('a gap breaks the streak', () => {
    const sessions = [{ beendet_am: '2026-08-24T18:00:00Z' }, { beendet_am: '2026-08-22T18:00:00Z' }]
    expect(aktuellerStreak(sessions, '2026-08-24')).toBe(1)
  })

  it('does not break the streak just because today has no session yet', () => {
    const sessions = [{ beendet_am: '2026-08-23T18:00:00Z' }, { beendet_am: '2026-08-22T18:00:00Z' }]
    expect(aktuellerStreak(sessions, '2026-08-24')).toBe(2)
  })

  it('is 0 for an empty history', () => {
    expect(aktuellerStreak([], '2026-08-24')).toBe(0)
  })

  it('ignores an unfinished session', () => {
    expect(aktuellerStreak([{ beendet_am: null }], '2026-08-24')).toBe(0)
  })
})

describe('streakText', () => {
  it('says no training day yet for 0', () => {
    expect(streakText(0)).toBe('Noch kein Trainingstag.')
  })

  it('uses the singular for exactly one day', () => {
    expect(streakText(1)).toBe('Erster Trainingstag.')
  })

  it('shows the count for more than one day', () => {
    expect(streakText(5)).toBe('5 Tage in Folge')
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

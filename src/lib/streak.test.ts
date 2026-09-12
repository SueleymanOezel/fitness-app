import { describe, expect, it } from 'vitest'
import { aktuellerStreak, streakText } from './streak'

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

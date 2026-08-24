import { describe, expect, it } from 'vitest'
import { sessionsJeWoche } from './training-charts'

const am = (jahr: number, monat: number, tag: number) =>
  new Date(jahr, monat - 1, tag, 18, 0).toISOString()

describe('sessionsJeWoche', () => {
  it('counts sessions per ISO week, oldest first', () => {
    const punkte = sessionsJeWoche([
      { gestartet_am: am(2026, 8, 17) }, // Mo, KW34
      { gestartet_am: am(2026, 8, 19) }, // Mi, KW34
      { gestartet_am: am(2026, 8, 24) }, // Mo, KW35
    ])
    expect(punkte).toEqual([
      { woche: '2026-KW34', anzahl: 2 },
      { woche: '2026-KW35', anzahl: 1 },
    ])
  })

  it('puts Sunday in the week that started on Monday', () => {
    // Sunday is day 0 in JavaScript. A naive week calculation moves it into the
    // following week and splits every weekend across two bars.
    expect(sessionsJeWoche([{ gestartet_am: am(2026, 8, 23) }])).toEqual([
      { woche: '2026-KW34', anzahl: 1 },
    ])
  })

  it('reports weeks without a session as zero', () => {
    // Without the gap the line would join two distant weeks and read as
    // continuous training.
    const punkte = sessionsJeWoche([
      { gestartet_am: am(2026, 8, 3) }, // KW32
      { gestartet_am: am(2026, 8, 24) }, // KW35
    ])
    expect(punkte.map((p) => p.anzahl)).toEqual([1, 0, 0, 1])
  })

  it('ignores a session that was never started', () => {
    expect(sessionsJeWoche([{ gestartet_am: null }])).toEqual([])
  })

  it('returns nothing for no sessions', () => {
    expect(sessionsJeWoche([])).toEqual([])
  })
})

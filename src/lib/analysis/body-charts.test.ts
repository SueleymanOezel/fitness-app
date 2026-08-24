import { describe, expect, it } from 'vitest'
import { gewichtsTrend } from './body-charts'

describe('gewichtsTrend', () => {
  it('starts the trend at the first value', () => {
    const punkte = gewichtsTrend([{ datum: '2026-08-01', gewicht: 83 }])
    expect(punkte).toEqual([{ datum: '2026-08-01', gewicht: 83, trend: 83 }])
  })

  it('smooths a single outlier instead of following it', () => {
    // Daily weight swings by a kilo or two through water. Unsmoothed, the noise
    // reads as progress.
    const punkte = gewichtsTrend([
      { datum: '2026-08-01', gewicht: 83 },
      { datum: '2026-08-02', gewicht: 83 },
      { datum: '2026-08-03', gewicht: 86 },
    ])
    expect(punkte[2].gewicht).toBe(86)
    expect(punkte[2].trend).toBeGreaterThan(83)
    expect(punkte[2].trend).toBeLessThan(84)
  })

  it('weights by elapsed time, not by position in the list', () => {
    // Weighing daily and weighing fortnightly must not give the same weight to
    // the previous entry. After two half-lives the old trend counts a quarter.
    const dicht = gewichtsTrend([
      { datum: '2026-08-01', gewicht: 80 },
      { datum: '2026-08-02', gewicht: 90 },
    ])
    const weit = gewichtsTrend([
      { datum: '2026-08-01', gewicht: 80 },
      { datum: '2026-08-29', gewicht: 90 },
    ])
    expect(weit[1].trend).toBeGreaterThan(dicht[1].trend)
    expect(weit[1].trend).toBeGreaterThan(89)
  })

  it('skips entries without a weight', () => {
    // A body entry may record only circumferences.
    const punkte = gewichtsTrend([
      { datum: '2026-08-01', gewicht: 83 },
      { datum: '2026-08-02', gewicht: null },
    ])
    expect(punkte).toHaveLength(1)
  })

  it('sorts oldest first even if the rows arrive newest first', () => {
    // useBodyMetrics orders by datum descending; feeding that in unsorted would
    // run the smoothing backwards through time.
    const punkte = gewichtsTrend([
      { datum: '2026-08-03', gewicht: 82 },
      { datum: '2026-08-01', gewicht: 83 },
    ])
    expect(punkte.map((p) => p.datum)).toEqual(['2026-08-01', '2026-08-03'])
    expect(punkte[0].trend).toBe(83)
  })

  it('returns nothing for no rows', () => {
    expect(gewichtsTrend([])).toEqual([])
  })
})

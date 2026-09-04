import { describe, expect, it } from 'vitest'
import {
  aenderungsrate,
  gewichtGegenKalorien,
  gewichtsTrend,
  UMFANG_FIELDS,
  umfaengeVerlauf,
} from './body-charts'

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

const umfaenge = (bauch: number | null, rest: number | null = bauch) => ({
  bauchumfang: bauch,
  beinumfang: rest,
  armumfang: rest,
  ruckenumfang: rest,
  brustumfang: rest,
})

describe('UMFANG_FIELDS', () => {
  it('holds exactly the five circumferences', () => {
    // Abgeleitet aus MEASUREMENT_FIELDS: Gewicht und Koerperfettanteil sind
    // keine Umfaenge und gehoeren nicht auf eine Zentimeter-Achse.
    expect(UMFANG_FIELDS).toEqual([
      'bauchumfang',
      'beinumfang',
      'armumfang',
      'ruckenumfang',
      'brustumfang',
    ])
  })
})

describe('umfaengeVerlauf', () => {
  it('keeps one point per day, oldest first', () => {
    expect(
      umfaengeVerlauf([
        { datum: '2026-08-24', ...umfaenge(90) },
        { datum: '2026-08-17', ...umfaenge(92) },
      ]),
    ).toEqual([
      { datum: '2026-08-17', ...umfaenge(92) },
      { datum: '2026-08-24', ...umfaenge(90) },
    ])
  })

  it('drops a day that measured no circumference at all', () => {
    // Ein Tag, an dem nur gewogen wurde, ist kein Punkt auf einer Umfangslinie.
    expect(
      umfaengeVerlauf([
        { datum: '2026-08-17', ...umfaenge(92) },
        { datum: '2026-08-20', ...umfaenge(null) },
        { datum: '2026-08-24', ...umfaenge(90) },
      ]).map((punkt) => punkt.datum),
    ).toEqual(['2026-08-17', '2026-08-24'])
  })

  it('keeps a day that measured only one circumference', () => {
    // Die Luecken der anderen vier bleiben null; die Linie ueberbrueckt sie im
    // Graphen (connectNulls), statt den ganzen Tag zu verwerfen.
    const punkte = umfaengeVerlauf([{ datum: '2026-08-17', ...umfaenge(92, null) }])
    expect(punkte).toHaveLength(1)
    expect(punkte[0].bauchumfang).toBe(92)
    expect(punkte[0].armumfang).toBeNull()
  })

  it('returns nothing without rows', () => {
    expect(umfaengeVerlauf([])).toEqual([])
  })
})

const wiegung = (datum: string, gewicht: number | null) => ({ datum, gewicht })

describe('aenderungsrate', () => {
  it('derives kg per week from the trend line', () => {
    // Trend bei 7 Tagen Abstand und 7 Tagen Halbwertszeit: die Haelfte bleibt.
    // 85 → 85*0,5 + 84*0,5 = 84,5 → 84,5*0,5 + 83*0,5 = 83,75 → gerundet 83,8.
    expect(
      aenderungsrate([
        wiegung('2026-08-01', 85),
        wiegung('2026-08-08', 84),
        wiegung('2026-08-15', 83),
      ]),
    ).toEqual([
      { datum: '2026-08-08', rate: -0.5 },
      { datum: '2026-08-15', rate: -0.7 },
    ])
  })

  it('normalises a gap to one week instead of reading it as one step', () => {
    // 21 Tage Abstand: Halbwertszeit dreimal, es bleiben 0,125 vom alten Trend.
    // 85*0,125 + 82*0,875 = 82,375 → 82,4. (82,4 − 85) / 21 × 7 = −0,87.
    expect(aenderungsrate([wiegung('2026-08-01', 85), wiegung('2026-08-22', 82)])).toEqual([
      { datum: '2026-08-22', rate: -0.87 },
    ])
  })

  it('shows a rising trend as a positive rate', () => {
    // Das Vorzeichen ist die eigentliche Aussage des Graphen.
    const punkte = aenderungsrate([wiegung('2026-08-01', 80), wiegung('2026-08-08', 81)])
    expect(punkte[0].rate).toBeGreaterThan(0)
  })

  it('drops points without a full week of history behind them', () => {
    // Zwei Wiegungen im Abstand von drei Tagen ergeben keine Wochenrate.
    expect(aenderungsrate([wiegung('2026-08-01', 85), wiegung('2026-08-04', 84)])).toEqual([])
  })

  it('ignores entries that recorded no weight', () => {
    expect(
      aenderungsrate([
        wiegung('2026-08-01', 85),
        wiegung('2026-08-05', null),
        wiegung('2026-08-08', 84),
      ]),
    ).toEqual([{ datum: '2026-08-08', rate: -0.5 }])
  })

  it('returns nothing without rows', () => {
    expect(aenderungsrate([])).toEqual([])
  })
})

// 2026-08-03, -10, -17 sind Montage (KW32, KW33, KW34).
describe('gewichtGegenKalorien', () => {
  it('pairs each week with its mean intake and its change against the week before', () => {
    expect(
      gewichtGegenKalorien(
        [
          { datum: '2026-08-03', gewicht: 85 },
          { datum: '2026-08-10', gewicht: 84 },
          { datum: '2026-08-17', gewicht: 83.5 },
        ],
        [
          { tag: '2026-08-04', kalorien: 2000 },
          { tag: '2026-08-06', kalorien: 2200 },
          { tag: '2026-08-11', kalorien: 2500 },
          { tag: '2026-08-18', kalorien: 1800 },
        ],
      ),
    ).toEqual([
      { woche: '2026-KW33', kalorien: 2500, aenderung: -1 },
      { woche: '2026-KW34', kalorien: 1800, aenderung: -0.5 },
    ])
  })

  it('averages several weighings of one week instead of taking the last', () => {
    // Ein einzelner Wassertag darf die Wochenaenderung nicht bestimmen.
    expect(
      gewichtGegenKalorien(
        [
          { datum: '2026-08-03', gewicht: 85 },
          { datum: '2026-08-10', gewicht: 85 },
          { datum: '2026-08-12', gewicht: 83 },
        ],
        [
          { tag: '2026-08-04', kalorien: 2000 },
          { tag: '2026-08-11', kalorien: 2000 },
        ],
      ),
    ).toEqual([{ woche: '2026-KW33', kalorien: 2000, aenderung: -1 }])
  })

  it('spreads a skipped week over its real distance', () => {
    // Zwei Wochen ohne Wiegung sind nicht die doppelte Wochenaenderung.
    expect(
      gewichtGegenKalorien(
        [
          { datum: '2026-08-03', gewicht: 85 },
          { datum: '2026-08-17', gewicht: 83 },
        ],
        [{ tag: '2026-08-18', kalorien: 1800 }],
      ),
    ).toEqual([{ woche: '2026-KW34', kalorien: 1800, aenderung: -1 }])
  })

  it('drops a week without logged food', () => {
    // Keine Eintraege heisst nicht null Kalorien; ein Punkt bei x = 0 waere eine
    // erfundene Nulldiaet.
    expect(
      gewichtGegenKalorien(
        [
          { datum: '2026-08-03', gewicht: 85 },
          { datum: '2026-08-10', gewicht: 84 },
        ],
        [],
      ),
    ).toEqual([])
  })

  it('ignores entries without a weight and needs no first week', () => {
    // Die erste Woche hat keine Vorwoche und liefert deshalb keinen Punkt.
    expect(
      gewichtGegenKalorien(
        [{ datum: '2026-08-03', gewicht: 85 }, { datum: '2026-08-05', gewicht: null }],
        [{ tag: '2026-08-04', kalorien: 2000 }],
      ),
    ).toEqual([])
  })
})

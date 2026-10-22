import { describe, expect, it } from 'vitest'
import { gewichtDieseWoche, kalorienSchnittDieseWoche, wochenAussage } from './week-summary'

// Thursday 22.10.2026; the week began on Monday 19.10.
const heute = new Date(2026, 9, 22, 12)

describe('gewichtDieseWoche', () => {
  it('compares against the last weighing of the week before', () => {
    const rows = [
      { datum: '2026-10-15', gewicht: 83 },
      { datum: '2026-10-18', gewicht: 82.8 },
      { datum: '2026-10-21', gewicht: 82.4 },
    ]
    expect(gewichtDieseWoche(rows, heute)).toBe(-0.4)
  })

  it('falls back to the first weighing of this week, and needs two', () => {
    expect(
      gewichtDieseWoche([{ datum: '2026-10-19', gewicht: 82 }, { datum: '2026-10-21', gewicht: 82.5 }], heute),
    ).toBe(0.5)
    expect(gewichtDieseWoche([{ datum: '2026-10-21', gewicht: 82 }], heute)).toBeNull()
  })

  it('ignores a weighing from months ago and weighings without weight', () => {
    expect(
      gewichtDieseWoche([{ datum: '2026-07-01', gewicht: 90 }, { datum: '2026-10-21', gewicht: 82 }], heute),
    ).toBeNull()
    expect(gewichtDieseWoche([{ datum: '2026-10-21', gewicht: null }], heute)).toBeNull()
  })
})

describe('kalorienSchnittDieseWoche', () => {
  const eintrag = (tag: string, kcal: number) => ({
    zeitpunkt: new Date(`${tag}T12:00:00`).toISOString(),
    menge: 100,
    products: { kalorien: kcal },
  })

  it('averages the days with an entry since Monday and skips the unfinished today', () => {
    const entries = [
      eintrag('2026-10-18', 3000), // last week
      eintrag('2026-10-19', 2000),
      eintrag('2026-10-20', 1800),
      eintrag('2026-10-22', 400), // today, incomplete
    ]
    expect(kalorienSchnittDieseWoche(entries, heute)).toBe(1900)
  })

  it('uses today when it is the only day, and is null without entries', () => {
    expect(kalorienSchnittDieseWoche([eintrag('2026-10-22', 400)], heute)).toBe(400)
    expect(kalorienSchnittDieseWoche([], heute)).toBeNull()
  })
})

describe('wochenAussage', () => {
  it('joins the parts that exist', () => {
    expect(wochenAussage({ trainings: 3, gewicht: -0.4, kalorien: 1900 })).toBe('3 Trainings · −0,4 kg · Ø 1900 kcal')
    expect(wochenAussage({ trainings: 1, gewicht: 0.5, kalorien: null })).toBe('1 Training · +0,5 kg')
    expect(wochenAussage({ trainings: 0, gewicht: null, kalorien: null })).toBe('0 Trainings')
  })
})

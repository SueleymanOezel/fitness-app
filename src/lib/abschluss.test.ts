import { describe, expect, it } from 'vitest'
import { abschlussZahlen, hoehepunktVon } from './abschluss'

const satz = (exercise_id: string, gewicht: number | null, wiederholungen: number | null, ist_aufwaermsatz = false) => ({
  exercise_id,
  gewicht,
  wiederholungen,
  ist_aufwaermsatz,
})

describe('abschlussZahlen', () => {
  it('counts working sets and their volume, leaving warm-ups and incomplete sets out', () => {
    const { saetze, volumen } = abschlussZahlen(
      [satz('a', 40, 10, true), satz('a', 70, 8), satz('a', 72.5, 8), satz('b', null, 12)],
      [],
      new Map(),
    )
    expect(saetze).toBe(3)
    expect(volumen).toBe(1140) // 70×8 + 72,5×8; the bodyweight set has no kg
  })

  it('compares the heaviest set of today with the last set of the previous workout', () => {
    const { vergleiche } = abschlussZahlen(
      [satz('a', 70, 8), satz('a', 72.5, 6), satz('a', 72.5, 8)],
      [
        { exercise_id: 'a', name: 'Bankdrücken' },
        { exercise_id: 'b', name: 'Nicht trainiert' },
      ],
      new Map([['a', { gewicht: 70, wiederholungen: 8 }]]),
    )
    expect(vergleiche).toEqual([
      {
        exercise_id: 'a',
        name: 'Bankdrücken',
        heute: { gewicht: 72.5, wiederholungen: 8 },
        vorher: { gewicht: 70, wiederholungen: 8 },
      },
    ])
  })

  it('marks a first time with no previous values', () => {
    const { vergleiche } = abschlussZahlen([satz('a', 50, 10)], [{ exercise_id: 'a', name: 'Neu' }], new Map())
    expect(vergleiche[0].vorher).toBeNull()
  })
})
describe('hoehepunktVon', () => {
  const v = (name: string, heute: number | null, vorher: number | null) => ({
    exercise_id: name,
    name,
    heute: { gewicht: heute, wiederholungen: 8 },
    vorher: vorher === undefined ? null : { gewicht: vorher, wiederholungen: 8 },
  })

  it('puts a new record first', () => {
    const rekord = { exercise_id: 'e1', name: 'Bankdrücken', neuesEinsRM: 96.67, altesEinsRM: 90 }
    expect(hoehepunktVon([rekord], [v('Kniebeuge', 100, 90)])).toEqual({
      wert: '≈ 96,7 kg',
      text: 'Neuer Rekord · Bankdrücken (geschätztes 1RM)',
    })
  })

  it('otherwise names the biggest step up from last time', () => {
    expect(hoehepunktVon([], [v('Bankdrücken', 72.5, 70), v('Kniebeuge', 100, 95), v('Rudern', 50, 55)])).toEqual({
      wert: '+5 kg',
      text: 'Kniebeuge · mehr als beim letzten Mal',
    })
  })

  it('has nothing to say without a record or a heavier set', () => {
    expect(hoehepunktVon([], [v('Bankdrücken', 70, 70), v('Klimmzüge', null, null)])).toBeNull()
  })
})
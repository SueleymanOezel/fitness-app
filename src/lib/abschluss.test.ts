import { describe, expect, it } from 'vitest'
import { abschlussZahlen } from './abschluss'

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

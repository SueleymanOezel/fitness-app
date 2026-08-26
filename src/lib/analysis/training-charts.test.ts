import { describe, expect, it } from 'vitest'
import { sessionsJeWoche, haeufigsteUebung, uebungenImZeitraum } from './training-charts'

const am = (jahr: number, monat: number, tag: number) =>
  new Date(jahr, monat - 1, tag, 18, 0).toISOString()

/** A finished session: started and ended on the given day. */
const einheit = (jahr: number, monat: number, tag: number) => ({
  gestartet_am: am(jahr, monat, tag),
  beendet_am: am(jahr, monat, tag),
})

describe('sessionsJeWoche', () => {
  it('counts sessions per ISO week, oldest first', () => {
    const punkte = sessionsJeWoche([
      einheit(2026, 8, 17), // Mo, KW34
      einheit(2026, 8, 19), // Mi, KW34
      einheit(2026, 8, 24), // Mo, KW35
    ])
    expect(punkte).toEqual([
      { woche: '2026-KW34', anzahl: 2 },
      { woche: '2026-KW35', anzahl: 1 },
    ])
  })

  it('puts Sunday in the week that started on Monday', () => {
    // Sunday is day 0 in JavaScript. A naive week calculation moves it into the
    // following week and splits every weekend across two bars.
    expect(sessionsJeWoche([einheit(2026, 8, 23)])).toEqual([
      { woche: '2026-KW34', anzahl: 1 },
    ])
  })

  it('reports weeks without a session as zero', () => {
    // Without the gap the line would join two distant weeks and read as
    // continuous training.
    const punkte = sessionsJeWoche([
      einheit(2026, 8, 3), // KW32
      einheit(2026, 8, 24), // KW35
    ])
    expect(punkte.map((p) => p.anzahl)).toEqual([1, 0, 0, 1])
  })

  it('ignores a session that was never started', () => {
    expect(sessionsJeWoche([{ gestartet_am: null, beendet_am: null }])).toEqual([])
  })

  it('ignores a session that was opened but never finished', () => {
    // Phase 3 keeps such rows and shows them as "nicht beendet". Counting them
    // as training raises the week's bar for a workout that did not happen.
    const punkte = sessionsJeWoche([
      einheit(2026, 8, 24),
      { gestartet_am: am(2026, 8, 25), beendet_am: null },
    ])
    expect(punkte).toEqual([{ woche: '2026-KW35', anzahl: 1 }])
  })

  it('returns nothing for no sessions', () => {
    expect(sessionsJeWoche([])).toEqual([])
  })
})

const satz = (
  exercise_id: string,
  name: string,
  extra: Partial<{ ist_aufwaermsatz: boolean; gewicht: number | null; wiederholungen: number | null }> = {},
) => ({
  id: `${exercise_id}-${Math.random()}`,
  workout_session_id: 's1',
  exercise_id,
  exercise_name: name,
  muskelgruppen: [],
  satz_nummer: 1,
  gewicht: 80,
  wiederholungen: 8,
  ist_aufwaermsatz: false,
  ...extra,
})

describe('uebungenImZeitraum', () => {
  it('lists every trained exercise once, alphabetically', () => {
    expect(
      uebungenImZeitraum([
        satz('e2', 'Kniebeuge'),
        satz('e1', 'Bankdruecken'),
        satz('e2', 'Kniebeuge'),
      ]),
    ).toEqual([
      { exercise_id: 'e1', name: 'Bankdruecken' },
      { exercise_id: 'e2', name: 'Kniebeuge' },
    ])
  })

  it('keeps an exercise that was only warmed up', () => {
    // Fuer die Auswahlliste zaehlt, dass die Uebung vorkam.
    expect(uebungenImZeitraum([satz('e1', 'Bankdruecken', { ist_aufwaermsatz: true })])).toEqual([
      { exercise_id: 'e1', name: 'Bankdruecken' },
    ])
  })
})

describe('haeufigsteUebung', () => {
  it('picks the exercise with the most working sets', () => {
    expect(
      haeufigsteUebung([
        satz('e1', 'Bankdruecken'),
        satz('e2', 'Kniebeuge'),
        satz('e2', 'Kniebeuge'),
      ]),
    ).toBe('e2')
  })

  it('does not let warm-up sets decide', () => {
    // Sonst gewinnt die Uebung, die man am laengsten aufwaermt.
    expect(
      haeufigsteUebung([
        satz('e1', 'Bankdruecken'),
        satz('e1', 'Bankdruecken'),
        satz('e2', 'Kniebeuge', { ist_aufwaermsatz: true }),
        satz('e2', 'Kniebeuge', { ist_aufwaermsatz: true }),
        satz('e2', 'Kniebeuge', { ist_aufwaermsatz: true }),
      ]),
    ).toBe('e1')
  })

  it('returns null without sets', () => {
    expect(haeufigsteUebung([])).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import {
  sessionsJeWoche,
  haeufigsteUebung,
  uebungenImZeitraum,
  epley1RM,
  kraftverlauf,
  volumenJeSession,
  bestesGewichtJeSession,
  wiederholungenJeSatz,
  volumenJeMuskelgruppe,
  dauerUndKalorien,
  persoenlicheRekorde,
} from './training-charts'

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

const sitzung = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00+02:00`,
  beendet_am: `${tag}T19:00:00+02:00`,
  gesamt_kalorien: 300,
})

const satzIn = (
  sessionId: string,
  exercise_id: string,
  gewicht: number | null,
  wiederholungen: number | null,
  ist_aufwaermsatz = false,
) => ({
  id: `${sessionId}-${exercise_id}-${gewicht}-${wiederholungen}-${ist_aufwaermsatz}`,
  workout_session_id: sessionId,
  exercise_id,
  exercise_name: 'Bankdruecken',
  muskelgruppen: ['brust'],
  satz_nummer: 1,
  gewicht,
  wiederholungen,
  ist_aufwaermsatz,
})

describe('epley1RM', () => {
  it('computes weight x (1 + reps / 30)', () => {
    expect(epley1RM(100, 0)).toBe(100)
    expect(epley1RM(100, 30)).toBe(200)
  })

  it('returns null for a set without weight or without reps', () => {
    // Nicht 0: ein unvollstaendiger Satz ist keine Leistung von null, sondern
    // keine Angabe. Als 0 wuerde er die Bestleistung der Session verschweigen.
    expect(epley1RM(null, 8)).toBeNull()
    expect(epley1RM(80, null)).toBeNull()
  })
})

describe('kraftverlauf', () => {
  it('takes the best estimated 1RM per session', () => {
    const punkte = kraftverlauf(
      [sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')],
      [
        satzIn('s1', 'e1', 80, 8), // 101,3
        satzIn('s1', 'e1', 90, 5), // 105,0 -> bester Satz
        satzIn('s2', 'e1', 95, 5), // 110,8
      ],
      'e1',
    )
    expect(punkte).toEqual([
      { tag: '2026-08-17', wert: 105 },
      { tag: '2026-08-24', wert: 110.8 },
    ])
  })

  it('ignores warm-up sets', () => {
    // Ein Aufwaermsatz mit hoher Wiederholungszahl kann das geschaetzte 1RM
    // ueber den schweren Arbeitssatz heben — der Graph zeigte dann Fortschritt,
    // wo nur laenger aufgewaermt wurde.
    const punkte = kraftverlauf(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 60, 30, true), satzIn('s1', 'e1', 90, 5)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 105 }])
  })

  it('ignores other exercises and sessions without a usable set', () => {
    const punkte = kraftverlauf(
      [sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')],
      [satzIn('s1', 'e1', 90, 5), satzIn('s2', 'e2', 120, 5), satzIn('s2', 'e1', null, 5)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 105 }])
  })

  it('uses the local day of the session start', () => {
    // 23:50 Ortszeit gehoert zu diesem Tag, nicht per UTC zum naechsten.
    const spaet = {
      id: 's3',
      gestartet_am: new Date(2026, 7, 24, 23, 50).toISOString(),
      beendet_am: null,
      gesamt_kalorien: null,
    }
    const punkte = kraftverlauf([spaet], [satzIn('s3', 'e1', 90, 5)], 'e1')
    expect(punkte[0].tag).toBe('2026-08-24')
  })
})

describe('volumenJeSession', () => {
  it('sums weight times reps over the working sets', () => {
    const punkte = volumenJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 80, 8), satzIn('s1', 'e1', 80, 6)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 1120 }])
  })

  it('leaves warm-up sets out', () => {
    // Ohne diesen Filter ist jeder Volumengraph systematisch zu hoch — genau
    // dafuer wurde ist_aufwaermsatz erfasst.
    const punkte = volumenJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 20, 15, true), satzIn('s1', 'e1', 80, 8)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 640 }])
  })

  it('skips a set without weight or reps rather than counting it as zero', () => {
    const punkte = volumenJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 80, 8), satzIn('s1', 'e1', null, 8), satzIn('s1', 'e1', 80, null)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 640 }])
  })

  it('gives a session without any usable set no point at all', () => {
    // Ein Punkt bei 0 laese sich als Trainingstag ohne Leistung lesen; es gab
    // an dem Tag aber keine verwertbare Angabe.
    const punkte = volumenJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', null, null)],
      'e1',
    )
    expect(punkte).toEqual([])
  })
})

describe('bestesGewichtJeSession', () => {
  it('takes the heaviest working set of the session', () => {
    const punkte = bestesGewichtJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 80, 8), satzIn('s1', 'e1', 92.5, 3)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 92.5 }])
  })

  it('does not let a warm-up set count', () => {
    const punkte = bestesGewichtJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 100, 1, true), satzIn('s1', 'e1', 80, 8)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 80 }])
  })

  it('counts a set without reps, unlike the 1RM estimate', () => {
    // Fuer T4 reicht das Gewicht: die Wiederholungen gehen in die Zahl nicht ein.
    const punkte = bestesGewichtJeSession(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 85, null)],
      'e1',
    )
    expect(punkte).toEqual([{ tag: '2026-08-17', wert: 85 }])
  })
})

describe('wiederholungenJeSatz', () => {
  it('numbers the working sets from one, ignoring warm-ups in between', () => {
    // satz_nummer zaehlt alle Saetze durch. Ohne Umnummerierung hiesse derselbe
    // Arbeitssatz an einem Tag "Satz 2" und am naechsten "Satz 4".
    const reihen = wiederholungenJeSatz(
      [sitzung('s1', '2026-08-17')],
      [
        { ...satzIn('s1', 'e1', 40, 12, true), satz_nummer: 1 },
        { ...satzIn('s1', 'e1', 80, 10), satz_nummer: 2 },
        { ...satzIn('s1', 'e1', 80, 8), satz_nummer: 3 },
      ],
      'e1',
    )
    expect(reihen.satzNummern).toEqual([1, 2])
    expect(reihen.punkte).toEqual([{ tag: '2026-08-17', satz1: 10, satz2: 8 }])
  })

  it('keeps a missing set as a gap instead of zero', () => {
    // Wer an einem Tag nur zwei Saetze schafft, hat keine null Wiederholungen
    // im dritten — die Linie soll dort aussetzen.
    const reihen = wiederholungenJeSatz(
      [sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')],
      [
        { ...satzIn('s1', 'e1', 80, 10), satz_nummer: 1 },
        { ...satzIn('s1', 'e1', 80, 8), satz_nummer: 2 },
        { ...satzIn('s2', 'e1', 80, 9), satz_nummer: 1 },
      ],
      'e1',
    )
    expect(reihen.satzNummern).toEqual([1, 2])
    expect(reihen.punkte[1]).toEqual({ tag: '2026-08-24', satz1: 9 })
  })

  it('is empty for an exercise without working sets', () => {
    const reihen = wiederholungenJeSatz(
      [sitzung('s1', '2026-08-17')],
      [satzIn('s1', 'e1', 40, 12, true)],
      'e1',
    )
    expect(reihen).toEqual({ punkte: [], satzNummern: [] })
  })
})

describe('volumenJeMuskelgruppe', () => {
  const mitGruppen = (gruppen: string[], gewicht: number, wiederholungen: number, warm = false) => ({
    ...satzIn('s1', 'e1', gewicht, wiederholungen, warm),
    id: `${gruppen.join('-')}-${gewicht}-${wiederholungen}-${warm}`,
    muskelgruppen: gruppen,
  })

  it('sums the volume per muscle group, largest first', () => {
    expect(
      volumenJeMuskelgruppe([mitGruppen(['brust'], 80, 10), mitGruppen(['ruecken'], 60, 10)]),
    ).toEqual([
      { muskelgruppe: 'brust', volumen: 800 },
      { muskelgruppe: 'ruecken', volumen: 600 },
    ])
  })

  it('splits an exercise with two primary groups instead of counting it twice', () => {
    // Volle Anrechnung an beide liesse die Summe aller Balken groesser werden
    // als das bewegte Volumen.
    expect(volumenJeMuskelgruppe([mitGruppen(['brust', 'trizeps'], 100, 10)])).toEqual([
      { muskelgruppe: 'brust', volumen: 500 },
      { muskelgruppe: 'trizeps', volumen: 500 },
    ])
  })

  it('leaves warm-up sets out', () => {
    expect(volumenJeMuskelgruppe([mitGruppen(['brust'], 100, 10, true)])).toEqual([])
  })

  it('drops sets whose exercise has no primary group', () => {
    // Ohne Zuordnung gibt es keinen Balken, auf den das Volumen gehoert; eine
    // Sammelgruppe "sonstiges" waere eine erfundene Aussage.
    expect(volumenJeMuskelgruppe([mitGruppen([], 100, 10)])).toEqual([])
  })
})

describe('dauerUndKalorien', () => {
  it('computes the minutes between start and end', () => {
    expect(
      dauerUndKalorien([
        {
          id: 's1',
          gestartet_am: '2026-08-17T17:30:00+02:00',
          beendet_am: '2026-08-17T18:35:00+02:00',
          gesamt_kalorien: 420,
        },
      ]),
    ).toEqual([{ tag: '2026-08-17', minuten: 65, kalorien: 420 }])
  })

  it('leaves an unfinished session out', () => {
    // Ohne beendet_am gibt es keine Dauer. Bis "jetzt" zu rechnen ergaebe
    // Balken von mehreren Tagen fuer eine vergessene Session.
    expect(
      dauerUndKalorien([
        {
          id: 's1',
          gestartet_am: '2026-08-17T17:30:00+02:00',
          beendet_am: null,
          gesamt_kalorien: 420,
        },
      ]),
    ).toEqual([])
  })

  it('keeps a finished session without calories', () => {
    // gesamt_kalorien ist optional; die Dauer steht trotzdem.
    expect(
      dauerUndKalorien([
        {
          id: 's1',
          gestartet_am: '2026-08-17T17:30:00+02:00',
          beendet_am: '2026-08-17T18:00:00+02:00',
          gesamt_kalorien: null,
        },
      ]),
    ).toEqual([{ tag: '2026-08-17', minuten: 30, kalorien: null }])
  })
})

describe('persoenlicheRekorde', () => {
  it('takes the best estimated 1RM per exercise with its date', () => {
    const rekorde = persoenlicheRekorde(
      [sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')],
      [satzIn('s1', 'e1', 90, 5), satzIn('s2', 'e1', 100, 5)],
    )
    expect(rekorde).toEqual([
      {
        exercise_id: 'e1',
        name: 'Bankdruecken',
        einsRM: 116.7,
        gewicht: 100,
        wiederholungen: 5,
        tag: '2026-08-24',
      },
    ])
  })

  it('keeps the earlier date when a later set only matches the record', () => {
    // Der Rekord gehoert dem Tag, an dem er zuerst stand.
    const rekorde = persoenlicheRekorde(
      [sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')],
      [satzIn('s1', 'e1', 90, 5), satzIn('s2', 'e1', 90, 5)],
    )
    expect(rekorde[0].tag).toBe('2026-08-17')
  })

  it('ignores warm-up sets and sets without a usable estimate', () => {
    expect(
      persoenlicheRekorde(
        [sitzung('s1', '2026-08-17')],
        [satzIn('s1', 'e1', 200, 5, true), satzIn('s1', 'e1', null, 5)],
      ),
    ).toEqual([])
  })

  it('sorts by estimated 1RM, heaviest first', () => {
    const rekorde = persoenlicheRekorde(
      [sitzung('s1', '2026-08-17')],
      [
        satzIn('s1', 'e1', 90, 5),
        { ...satzIn('s1', 'e2', 140, 5), exercise_name: 'Kniebeuge' },
      ],
    )
    expect(rekorde.map((rekord) => rekord.exercise_id)).toEqual(['e2', 'e1'])
  })
})

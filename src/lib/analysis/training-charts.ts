import { localDay } from '../local-time'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'

export type WochenPunkt = { woche: string; anzahl: number }
export type UebungsOption = { exercise_id: string; name: string }
export type MuskelPunkt = { muskelgruppe: string; volumen: number }
export type SessionPunkt = { tag: string; minuten: number; kalorien: number | null }

/** Monday of the week `iso` falls in, as a local `YYYY-MM-DD`. */
function wochenStart(iso: string): string {
  const date = new Date(iso)
  // getDay() is 0 for Sunday; shifting by 6 keeps Sunday in the week that
  // started the previous Monday.
  const versatz = (date.getDay() + 6) % 7
  const montag = new Date(date.getFullYear(), date.getMonth(), date.getDate() - versatz)
  return localDay(montag.toISOString())
}

/** ISO week number of a Monday given as `YYYY-MM-DD`. */
function wochenLabel(montag: string): string {
  const [jahr, monat, tag] = montag.split('-').map(Number)
  const donnerstag = new Date(jahr, monat - 1, tag + 3) // ISO weeks belong to their Thursday
  const jahresStart = new Date(donnerstag.getFullYear(), 0, 1)
  const tageSeitJahresStart = Math.round(
    (donnerstag.getTime() - jahresStart.getTime()) / 86_400_000,
  )
  const woche = Math.floor(tageSeitJahresStart / 7) + 1
  return `${donnerstag.getFullYear()}-KW${woche}`
}

/**
 * Finished sessions per calendar week, oldest first, with empty weeks kept as
 * zero.
 *
 * Only sessions with a `beendet_am` count: a session that was opened and never
 * finished is a real state in this app (the history shows it as "nicht
 * beendet"), and counting it would raise the week's bar for a workout that did
 * not happen. The week itself still comes from `gestartet_am` — that is when
 * the training took place.
 *
 * The gaps matter: without them the bars join two distant weeks and read as
 * uninterrupted training.
 */
export function sessionsJeWoche(
  sessions: { gestartet_am: string | null; beendet_am: string | null }[],
): WochenPunkt[] {
  const montage = sessions
    .filter(
      (session): session is { gestartet_am: string; beendet_am: string } =>
        session.gestartet_am != null && session.beendet_am != null,
    )
    .map((session) => wochenStart(session.gestartet_am))
  if (montage.length === 0) return []

  const anzahlJeMontag = new Map<string, number>()
  for (const montag of montage) {
    anzahlJeMontag.set(montag, (anzahlJeMontag.get(montag) ?? 0) + 1)
  }

  const sortiert = [...anzahlJeMontag.keys()].sort()
  const [jahr, monat, tag] = sortiert[0].split('-').map(Number)
  const letzter = sortiert[sortiert.length - 1]

  const punkte: WochenPunkt[] = []
  const lauf = new Date(jahr, monat - 1, tag)
  for (;;) {
    const montag = localDay(lauf.toISOString())
    punkte.push({ woche: wochenLabel(montag), anzahl: anzahlJeMontag.get(montag) ?? 0 })
    if (montag === letzter) break
    lauf.setDate(lauf.getDate() + 7)
  }
  return punkte
}

/** Jede im Zeitraum vorkommende Uebung, alphabetisch — die Auswahlliste ueber T2 bis T5. */
export function uebungenImZeitraum(sets: AnalysisSet[]): UebungsOption[] {
  const nameJeId = new Map<string, string>()
  for (const satz of sets) nameJeId.set(satz.exercise_id, satz.exercise_name)
  return [...nameJeId.entries()]
    .map(([exercise_id, name]) => ({ exercise_id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

/**
 * Die Uebung mit den meisten **Arbeitssaetzen** — die Vorbelegung der Auswahl.
 *
 * Aufwaermsaetze zaehlen nicht mit: sonst steht der Graph beim Aufwaermen der
 * Kniebeuge statt bei der Uebung, um die es ging.
 */
export function haeufigsteUebung(sets: AnalysisSet[]): string | null {
  const anzahl = new Map<string, number>()
  for (const satz of sets) {
    if (satz.ist_aufwaermsatz) continue
    anzahl.set(satz.exercise_id, (anzahl.get(satz.exercise_id) ?? 0) + 1)
  }
  let beste: string | null = null
  let hoechste = 0
  for (const [id, zahl] of anzahl) {
    if (zahl > hoechste) {
      hoechste = zahl
      beste = id
    }
  }
  return beste
}

export type UebungsPunkt = { tag: string; wert: number }

/**
 * Geschaetztes Einwiederholungsmaximum nach Epley.
 *
 * `null` statt 0 fuer unvollstaendige Saetze: ein Satz ohne Gewicht ist keine
 * Leistung von null, sondern keine Angabe.
 */
export function epley1RM(gewicht: number | null, wiederholungen: number | null): number | null {
  if (gewicht == null || wiederholungen == null) return null
  return gewicht * (1 + wiederholungen / 30)
}

const runde = (wert: number) => Math.round(wert * 10) / 10

/**
 * Baut je Session einen Punkt aus deren Arbeitssaetzen einer Uebung.
 *
 * Gemeinsame Grundlage von T2, T3 und T4: alle drei unterscheiden sich nur
 * darin, was sie aus den Saetzen einer Session machen.
 */
function punkteJeSession(
  sessions: AnalysisSession[],
  sets: AnalysisSet[],
  exerciseId: string,
  ausSaetzen: (saetze: AnalysisSet[]) => number | null,
): UebungsPunkt[] {
  const saetzeJeSession = new Map<string, AnalysisSet[]>()
  for (const satz of sets) {
    if (satz.exercise_id !== exerciseId || satz.ist_aufwaermsatz) continue
    const liste = saetzeJeSession.get(satz.workout_session_id) ?? []
    liste.push(satz)
    saetzeJeSession.set(satz.workout_session_id, liste)
  }

  const punkte: UebungsPunkt[] = []
  for (const session of sessions) {
    if (session.gestartet_am == null) continue
    const saetze = saetzeJeSession.get(session.id)
    if (!saetze || saetze.length === 0) continue
    const wert = ausSaetzen(saetze)
    if (wert == null) continue
    punkte.push({ tag: localDay(session.gestartet_am), wert: runde(wert) })
  }
  return punkte.sort((a, b) => a.tag.localeCompare(b.tag))
}

/** T2: bestes geschaetztes 1RM je Session. */
export function kraftverlauf(
  sessions: AnalysisSession[],
  sets: AnalysisSet[],
  exerciseId: string,
): UebungsPunkt[] {
  return punkteJeSession(sessions, sets, exerciseId, (saetze) => {
    const werte = saetze
      .map((satz) => epley1RM(satz.gewicht, satz.wiederholungen))
      .filter((wert): wert is number => wert != null)
    return werte.length === 0 ? null : Math.max(...werte)
  })
}

/** Σ Gewicht × Wiederholungen eines Satzes, oder null bei fehlender Angabe. */
function satzVolumen(satz: AnalysisSet): number | null {
  if (satz.gewicht == null || satz.wiederholungen == null) return null
  return satz.gewicht * satz.wiederholungen
}

/** T3: Volumen der Arbeitssaetze einer Uebung je Session. */
export function volumenJeSession(
  sessions: AnalysisSession[],
  sets: AnalysisSet[],
  exerciseId: string,
): UebungsPunkt[] {
  return punkteJeSession(sessions, sets, exerciseId, (saetze) => {
    const werte = saetze.map(satzVolumen).filter((wert): wert is number => wert != null)
    return werte.length === 0 ? null : werte.reduce((summe, wert) => summe + wert, 0)
  })
}

/** T4: schwerster Arbeitssatz einer Uebung je Session. */
export function bestesGewichtJeSession(
  sessions: AnalysisSession[],
  sets: AnalysisSet[],
  exerciseId: string,
): UebungsPunkt[] {
  return punkteJeSession(sessions, sets, exerciseId, (saetze) => {
    const werte = saetze
      .map((satz) => satz.gewicht)
      .filter((wert): wert is number => wert != null)
    return werte.length === 0 ? null : Math.max(...werte)
  })
}

export type SatzReihen = {
  punkte: (Record<string, number | string> & { tag: string })[]
  satzNummern: number[]
}

/**
 * T5: je Arbeitssatz eine Reihe, Schluessel `satz1`, `satz2`, …
 *
 * Fehlende Saetze bleiben Luecken statt Nullen: wer an einem Tag nur zwei
 * Saetze geschafft hat, hat im dritten keine null Wiederholungen gemacht.
 */
export function wiederholungenJeSatz(
  sessions: AnalysisSession[],
  sets: AnalysisSet[],
  exerciseId: string,
): SatzReihen {
  const arbeitsSaetze = sets.filter(
    (satz) => satz.exercise_id === exerciseId && !satz.ist_aufwaermsatz,
  )
  const jeSession = new Map<string, AnalysisSet[]>()
  for (const satz of arbeitsSaetze) {
    const liste = jeSession.get(satz.workout_session_id) ?? []
    liste.push(satz)
    jeSession.set(satz.workout_session_id, liste)
  }

  const punkte: SatzReihen['punkte'] = []
  const nummern = new Set<number>()

  for (const session of sessions) {
    if (session.gestartet_am == null) continue
    const saetze = (jeSession.get(session.id) ?? []).sort((a, b) => a.satz_nummer - b.satz_nummer)
    if (saetze.length === 0) continue
    const punkt: Record<string, number | string> & { tag: string } = {
      tag: localDay(session.gestartet_am),
    }
    saetze.forEach((satz, index) => {
      if (satz.wiederholungen == null) return
      const nummer = index + 1
      nummern.add(nummer)
      punkt[`satz${nummer}`] = satz.wiederholungen
    })
    punkte.push(punkt)
  }

  return {
    punkte: punkte.sort((a, b) => a.tag.localeCompare(b.tag)),
    satzNummern: [...nummern].sort((a, b) => a - b),
  }
}

/**
 * T6: Volumen der Arbeitssaetze ueber den ganzen Zeitraum, auf die primaeren
 * Muskelgruppen **verteilt**.
 *
 * Zwei Gruppen bekommen je die Haelfte. Volle Anrechnung an beide waere die
 * bequemere Rechnung, machte die Summe aller Balken aber groesser als das
 * bewegte Volumen und liesse Verbundeuebungen doppelt so wichtig aussehen.
 */
export function volumenJeMuskelgruppe(sets: AnalysisSet[]): MuskelPunkt[] {
  const summe = new Map<string, number>()
  for (const satz of sets) {
    if (satz.ist_aufwaermsatz) continue
    const volumen = satzVolumen(satz)
    if (volumen == null || satz.muskelgruppen.length === 0) continue
    const anteil = volumen / satz.muskelgruppen.length
    for (const gruppe of satz.muskelgruppen) {
      summe.set(gruppe, (summe.get(gruppe) ?? 0) + anteil)
    }
  }
  return [...summe.entries()]
    .map(([muskelgruppe, volumen]) => ({ muskelgruppe, volumen: Math.round(volumen) }))
    .sort((a, b) => b.volumen - a.volumen || a.muskelgruppe.localeCompare(b.muskelgruppe, 'de'))
}

/** T7: Dauer und Verbrauch je beendeter Session. */
export function dauerUndKalorien(sessions: AnalysisSession[]): SessionPunkt[] {
  const punkte: SessionPunkt[] = []
  for (const session of sessions) {
    if (session.gestartet_am == null || session.beendet_am == null) continue
    const minuten = Math.round(
      (new Date(session.beendet_am).getTime() - new Date(session.gestartet_am).getTime()) / 60_000,
    )
    if (minuten <= 0) continue
    punkte.push({
      tag: localDay(session.gestartet_am),
      minuten,
      kalorien: session.gesamt_kalorien,
    })
  }
  return punkte.sort((a, b) => a.tag.localeCompare(b.tag))
}

export type Rekord = {
  exercise_id: string
  name: string
  einsRM: number
  gewicht: number
  wiederholungen: number
  tag: string
}

/**
 * T8: bestes geschaetztes 1RM je Uebung im Zeitraum, mit dem Tag, an dem es
 * zuerst stand.
 *
 * Nur echte Verbesserungen setzen den Tag neu (`>` statt `>=`): ein spaeterer
 * Satz mit demselben Wert wiederholt den Rekord, er stellt ihn nicht auf. Die
 * Saetze kommen aus dem Hook nach `satz_nummer` sortiert, nicht nach Datum;
 * damit "der fruehere Tag gewinnt" stimmt, laeuft die Schleife in
 * Sessionreihenfolge statt in Satzreihenfolge.
 */
export function persoenlicheRekorde(sessions: AnalysisSession[], sets: AnalysisSet[]): Rekord[] {
  const tagJeSession = new Map<string, string>()
  for (const session of sessions) {
    if (session.gestartet_am != null) tagJeSession.set(session.id, localDay(session.gestartet_am))
  }

  const reihenfolge = new Map(sessions.map((session, index) => [session.id, index]))
  const sortierteSaetze = [...sets].sort(
    (a, b) =>
      (reihenfolge.get(a.workout_session_id) ?? 0) - (reihenfolge.get(b.workout_session_id) ?? 0),
  )

  const beste = new Map<string, Rekord>()
  for (const satz of sortierteSaetze) {
    if (satz.ist_aufwaermsatz) continue
    const einsRM = epley1RM(satz.gewicht, satz.wiederholungen)
    const tag = tagJeSession.get(satz.workout_session_id)
    if (einsRM == null || tag == null) continue
    const gerundet = runde(einsRM)
    const bisher = beste.get(satz.exercise_id)
    if (bisher && bisher.einsRM >= gerundet) continue
    beste.set(satz.exercise_id, {
      exercise_id: satz.exercise_id,
      name: satz.exercise_name,
      einsRM: gerundet,
      gewicht: satz.gewicht as number,
      wiederholungen: satz.wiederholungen as number,
      tag,
    })
  }

  return [...beste.values()].sort(
    (a, b) => b.einsRM - a.einsRM || a.name.localeCompare(b.name, 'de'),
  )
}

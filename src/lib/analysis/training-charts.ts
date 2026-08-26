import { localDay } from '../local-time'
import type { AnalysisSet } from '../../hooks/use-training-analysis'

export type WochenPunkt = { woche: string; anzahl: number }
export type UebungsOption = { exercise_id: string; name: string }

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

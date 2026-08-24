import { localDay } from '../local-time'

export type WochenPunkt = { woche: string; anzahl: number }

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
 * Sessions per calendar week, oldest first, with empty weeks kept as zero.
 *
 * The gaps matter: without them the line joins two distant weeks and reads as
 * uninterrupted training.
 */
export function sessionsJeWoche(sessions: { gestartet_am: string | null }[]): WochenPunkt[] {
  const montage = sessions
    .filter((session): session is { gestartet_am: string } => session.gestartet_am != null)
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

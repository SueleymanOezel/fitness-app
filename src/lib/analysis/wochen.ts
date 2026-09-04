import { localDay } from '../local-time'

/** Monday of the week `iso` falls in, as a local `YYYY-MM-DD`. */
export function wochenStart(iso: string): string {
  const date = new Date(iso)
  // getDay() is 0 for Sunday; shifting by 6 keeps Sunday in the week that
  // started the previous Monday.
  const versatz = (date.getDay() + 6) % 7
  const montag = new Date(date.getFullYear(), date.getMonth(), date.getDate() - versatz)
  return localDay(montag.toISOString())
}

/** ISO week number of a Monday given as `YYYY-MM-DD`. */
export function wochenLabel(montag: string): string {
  const [jahr, monat, tag] = montag.split('-').map(Number)
  const donnerstag = new Date(jahr, monat - 1, tag + 3) // ISO weeks belong to their Thursday
  const jahresStart = new Date(donnerstag.getFullYear(), 0, 1)
  const tageSeitJahresStart = Math.round(
    (donnerstag.getTime() - jahresStart.getTime()) / 86_400_000,
  )
  const woche = Math.floor(tageSeitJahresStart / 7) + 1
  return `${donnerstag.getFullYear()}-KW${woche}`
}

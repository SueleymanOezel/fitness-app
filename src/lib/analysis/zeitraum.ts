/** Days back, or the whole history. */
export type Zeitraum = 30 | 90 | 365 | 'alles'

export const ZEITRAEUME: { wert: Zeitraum; label: string }[] = [
  { wert: 30, label: '30 Tage' },
  { wert: 90, label: '90 Tage' },
  { wert: 365, label: '1 Jahr' },
  { wert: 'alles', label: 'alles' },
]

export const STANDARD_ZEITRAUM: Zeitraum = 90

/** Dashboards show a fixed window; the switch lives on the analysis page. */
export const DASHBOARD_ZEITRAUM: Zeitraum = 90

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * First day the range covers, as `YYYY-MM-DD`, or null for the whole history.
 *
 * Built from local calendar parts and not from a millisecond subtraction: the
 * latter drifts by an hour across a daylight-saving change and would drop or
 * duplicate a day at the edge of the range.
 */
export function rangeStart(zeitraum: Zeitraum, jetzt: Date = new Date()): string | null {
  if (zeitraum === 'alles') return null
  const start = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() - zeitraum)
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
}

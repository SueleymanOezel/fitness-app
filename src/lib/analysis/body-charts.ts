export type TrendPunkt = { datum: string; gewicht: number; trend: number }

const TAG_MS = 86_400_000

/**
 * Weights with an exponentially weighted moving average, weighted by elapsed
 * time rather than by position in the list.
 *
 * One weighs daily in one month and fortnightly in the next; a fortnight-old
 * value must not carry the same weight as yesterday's. With a seven-day
 * half-life the previous trend counts half after a week, a quarter after two.
 */
export function gewichtsTrend(
  rows: { datum: string; gewicht: number | null }[],
  halbwertszeitTage = 7,
): TrendPunkt[] {
  const gewogen = rows
    .filter((row): row is { datum: string; gewicht: number } => row.gewicht != null)
    .sort((a, b) => a.datum.localeCompare(b.datum))

  const punkte: TrendPunkt[] = []
  let trend = 0
  let vorherigesDatum = 0

  for (const row of gewogen) {
    const jetzt = new Date(`${row.datum}T00:00:00`).getTime()
    if (punkte.length === 0) {
      trend = row.gewicht
    } else {
      const tage = (jetzt - vorherigesDatum) / TAG_MS
      // 0.5 ** (tage / halbwertszeit): how much of the old trend survives.
      const rest = 0.5 ** (tage / halbwertszeitTage)
      trend = trend * rest + row.gewicht * (1 - rest)
    }
    vorherigesDatum = jetzt
    punkte.push({ datum: row.datum, gewicht: row.gewicht, trend: Math.round(trend * 10) / 10 })
  }
  return punkte
}

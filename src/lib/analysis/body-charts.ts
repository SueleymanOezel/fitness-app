import { MEASUREMENT_FIELDS, type MeasurementField } from '../body-metrics'

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

/** Die Umfangsfelder unter den Messwerten — Gewicht und Koerperfettanteil sind keine. */
export type UmfangFeld = Extract<MeasurementField, `${string}umfang`>

/**
 * Abgeleitet statt abgeschrieben: ein spaeter ergaenzter Umfang landet damit von
 * selbst in K2. Eine zweite, handgepflegte Liste wuerde ihn verschweigen.
 */
export const UMFANG_FIELDS = MEASUREMENT_FIELDS.filter((feld): feld is UmfangFeld =>
  feld.endsWith('umfang'),
)

export type UmfangZeile = { datum: string } & Record<UmfangFeld, number | null>
export type UmfangPunkt = UmfangZeile

/**
 * K2: je Tag ein Punkt mit allen fuenf Umfaengen, aeltester zuerst.
 *
 * Ein Tag ohne jeden Umfang faellt raus — auf einer Umfangslinie ist er kein
 * Punkt, sondern nur ein Tag, an dem gewogen wurde. Ein Tag mit einem einzigen
 * gemessenen Umfang bleibt dagegen stehen: die uebrigen vier bleiben `null` und
 * werden im Graphen ueberbrueckt.
 */
export function umfaengeVerlauf(rows: UmfangZeile[]): UmfangPunkt[] {
  return rows
    .filter((row) => UMFANG_FIELDS.some((feld) => row[feld] != null))
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .map((row) => {
      const punkt = { datum: row.datum } as UmfangPunkt
      for (const feld of UMFANG_FIELDS) punkt[feld] = row[feld]
      return punkt
    })
}

export type RatenPunkt = { datum: string; rate: number }

/** Wie weit ein Punkt mindestens zurueckliegen muss, um als Vergleich zu taugen. */
const FENSTER_TAGE = 7

/**
 * K3: Steigung der Trendlinie ueber die vorangegangene Woche, in kg pro Woche.
 *
 * Gerechnet wird auf `gewichtsTrend` — derselben Linie, die K1 zeichnet — und
 * nicht auf den Rohgewichten: zwei aufeinanderfolgende Tage koennen sich durch
 * Wasser um ein Kilo unterscheiden, hochgerechnet waeren das sieben Kilo Woche.
 *
 * Verglichen wird mit dem juengsten Punkt, der mindestens eine Woche
 * zurueckliegt, und die Differenz wird ueber den **tatsaechlichen** Abstand
 * normiert. Nach einer dreiwoechigen Luecke waere sie sonst dreifach zu hoch.
 * Punkte ohne eine Woche Vorlauf entfallen — eine Rate braucht eine Strecke.
 */
export function aenderungsrate(
  rows: { datum: string; gewicht: number | null }[],
  halbwertszeitTage = 7,
): RatenPunkt[] {
  const trend = gewichtsTrend(rows, halbwertszeitTage)
  const zeit = trend.map((punkt) => new Date(`${punkt.datum}T00:00:00`).getTime())

  const punkte: RatenPunkt[] = []
  for (let i = 0; i < trend.length; i += 1) {
    let vergleich = -1
    for (let j = i - 1; j >= 0; j -= 1) {
      if (zeit[i] - zeit[j] >= FENSTER_TAGE * TAG_MS) {
        vergleich = j
        break
      }
    }
    if (vergleich === -1) continue
    const tage = (zeit[i] - zeit[vergleich]) / TAG_MS
    const rate = ((trend[i].trend - trend[vergleich].trend) / tage) * 7
    // Zwei Nachkommastellen: eine Rate von −0,05 kg/Woche waere auf eine Stelle
    // gerundet eine glatte Null und der Graph eine Gerade auf der Achse.
    punkte.push({ datum: trend[i].datum, rate: Math.round(rate * 100) / 100 })
  }
  return punkte
}

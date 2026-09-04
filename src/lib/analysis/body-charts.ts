import { MEASUREMENT_FIELDS, type MeasurementField } from '../body-metrics'
import { wochenLabel, wochenStart } from './wochen'
import type { TagesPunkt } from './nutrition-charts'

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

export type KalorienPunkt = { woche: string; kalorien: number; aenderung: number }

/** Mittelwert je Kalenderwoche, Schluessel ist der Montag als `YYYY-MM-DD`. */
function mittelJeWoche(werte: { tag: string; wert: number }[]): Map<string, number> {
  const summen = new Map<string, { summe: number; anzahl: number }>()
  for (const eintrag of werte) {
    // `T00:00:00` angehaengt: `new Date('2026-08-17')` waere UTC-Mitternacht und
    // faellt westlich von Greenwich auf den Vortag, also womoeglich in die
    // Vorwoche.
    const montag = wochenStart(`${eintrag.tag}T00:00:00`)
    const bisher = summen.get(montag) ?? { summe: 0, anzahl: 0 }
    summen.set(montag, { summe: bisher.summe + eintrag.wert, anzahl: bisher.anzahl + 1 })
  }
  return new Map([...summen].map(([montag, { summe, anzahl }]) => [montag, summe / anzahl]))
}

const WOCHE_MS = 7 * TAG_MS

/**
 * K4: je Woche ein Punkt aus mittlerer Tagesaufnahme und Gewichtsaenderung.
 *
 * Die Woche ist die richtige Aufloesung: Tagesgewicht schwankt durch Wasser
 * staerker als durch jede Tagesbilanz. Verglichen wird mit der letzten Woche,
 * in der ueberhaupt gewogen wurde — nicht stur mit der Kalenderwoche davor —,
 * und die Differenz wird durch den Wochenabstand geteilt, damit zwei Wochen
 * Pause nicht als doppelte Aenderung dastehen.
 *
 * Eine Woche ohne Ernaehrungseintraege liefert keinen Punkt: null Kalorien
 * hiesse „nichts gegessen", gemeint ist aber „nichts erfasst".
 */
export function gewichtGegenKalorien(
  rows: { datum: string; gewicht: number | null }[],
  kalorien: TagesPunkt[],
): KalorienPunkt[] {
  const gewichtJeWoche = mittelJeWoche(
    rows
      .filter((row): row is { datum: string; gewicht: number } => row.gewicht != null)
      .map((row) => ({ tag: row.datum, wert: row.gewicht })),
  )
  const kalorienJeWoche = mittelJeWoche(
    kalorien.map((punkt) => ({ tag: punkt.tag, wert: punkt.kalorien })),
  )

  const wochen = [...gewichtJeWoche.keys()].sort()
  const punkte: KalorienPunkt[] = []
  for (let i = 1; i < wochen.length; i += 1) {
    const montag = wochen[i]
    const mittlereKalorien = kalorienJeWoche.get(montag)
    if (mittlereKalorien == null) continue
    const abstand =
      (new Date(`${montag}T00:00:00`).getTime() -
        new Date(`${wochen[i - 1]}T00:00:00`).getTime()) /
      WOCHE_MS
    const aenderung = (gewichtJeWoche.get(montag)! - gewichtJeWoche.get(wochen[i - 1])!) / abstand
    punkte.push({
      woche: wochenLabel(montag),
      kalorien: Math.round(mittlereKalorien),
      aenderung: Math.round(aenderung * 10) / 10,
    })
  }
  return punkte
}

export type FotoPunkt = { id: string; datum: string; url: string | null; gewicht: number | null }

/**
 * K5: die Fotos des Zeitraums, neuestes zuerst, jedes mit dem Gewicht seines
 * Tages.
 *
 * Verknuepft wird auf exakte Tagesgleichheit — `body_metrics` hat je Nutzer und
 * Tag hoechstens eine Zeile, die Zuordnung ist also eindeutig. Kein Suchen nach
 * dem naechstgelegenen Tag: unter dem Foto stuende sonst eine Zahl von
 * vorgestern, ohne dass man es sieht. Ein Foto ohne Wiegung bleibt stehen und
 * traegt `null`.
 */
export function fotoZeitleiste(
  fotos: { id: string; datum: string; url: string | null }[],
  rows: { datum: string; gewicht: number | null }[],
): FotoPunkt[] {
  const gewichtJeTag = new Map<string, number>()
  for (const row of rows) {
    if (row.gewicht != null) gewichtJeTag.set(row.datum, row.gewicht)
  }

  return [...fotos]
    // id als Tiebreaker: zwei Fotos desselben Tages brauchen eine feste
    // Reihenfolge, sonst springen sie zwischen zwei Renderdurchlaeufen.
    .sort((a, b) => b.datum.localeCompare(a.datum) || a.id.localeCompare(b.id))
    .map((foto) => ({
      id: foto.id,
      datum: foto.datum,
      url: foto.url,
      gewicht: gewichtJeTag.get(foto.datum) ?? null,
    }))
}

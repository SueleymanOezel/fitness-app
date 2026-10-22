import { wochenStart } from './analysis/wochen'
import { kalorienJeTag } from './analysis/nutrition-charts'
import { localDay } from './local-time'
import { zahlDe } from './zahl'

const montagVon = (heute: Date) => wochenStart(heute.toISOString())

/**
 * Weight change this week: the newest weighing against the last one of the past
 * 7 days before Monday (else the first of this week). Null without a comparison —
 * an old weighing from months ago would make "this week" a lie.
 */
export function gewichtDieseWoche(
  rows: { datum: string; gewicht: number | null }[],
  heute: Date = new Date(),
): number | null {
  const montag = montagVon(heute)
  const [jahr, monat, tag] = montag.split('-').map(Number)
  const fensterStart = localDay(new Date(jahr, monat - 1, tag - 7).toISOString())
  const gewogen = rows
    .filter((row): row is { datum: string; gewicht: number } => row.gewicht != null)
    .sort((a, b) => a.datum.localeCompare(b.datum))
  const dieseWoche = gewogen.filter((row) => row.datum >= montag)
  if (dieseWoche.length === 0) return null
  const davor = gewogen.filter((row) => row.datum >= fensterStart && row.datum < montag)
  const basis = davor[davor.length - 1] ?? dieseWoche[0]
  const neu = dieseWoche[dieseWoche.length - 1]
  if (basis === neu) return null
  return Math.round((neu.gewicht - basis.gewicht) * 100) / 100
}

/** Mean daily calories of this week's days with an entry; today only counts while it is the only day (it is still incomplete). */
export function kalorienSchnittDieseWoche(
  entries: Parameters<typeof kalorienJeTag>[0],
  heute: Date = new Date(),
): number | null {
  const montag = montagVon(heute)
  const heuteTag = localDay(heute.toISOString())
  let tage = kalorienJeTag(entries).filter((punkt) => punkt.tag >= montag)
  if (tage.some((punkt) => punkt.tag !== heuteTag)) tage = tage.filter((punkt) => punkt.tag !== heuteTag)
  if (tage.length === 0) return null
  return Math.round(tage.reduce((summe, punkt) => summe + punkt.kalorien, 0) / tage.length)
}

/** "3 Trainings · −0,4 kg · Ø 1900 kcal" — parts without data are left out. */
export function wochenAussage({
  trainings,
  gewicht,
  kalorien,
}: {
  trainings: number
  gewicht: number | null
  kalorien: number | null
}): string {
  const teile = [`${trainings} ${trainings === 1 ? 'Training' : 'Trainings'}`]
  if (gewicht != null) teile.push(`${gewicht < 0 ? '−' : '+'}${zahlDe(Math.abs(gewicht), 1)} kg`)
  if (kalorien != null) teile.push(`Ø ${kalorien} kcal`)
  return teile.join(' · ')
}

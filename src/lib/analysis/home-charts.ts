import { wochenLabel, wochenStart } from './wochen'
import { localDay } from '../local-time'
import type { TagesPunkt } from './nutrition-charts'

export type RasterTag = { datum: string; status: 'trainingstag' | 'restday' }

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Naechster Kalendertag ueber lokale Kalenderfelder statt Millisekunden-
 * Addition — dieselbe Vorsicht wie in `rangeStart` (zeitraum.ts): ein
 * Millisekunden-Sprung driftet ueber einen Sommerzeitwechsel um eine Stunde.
 */
function naechsterTag(iso: string): string {
  const [jahr, monat, tag] = iso.split('-').map(Number)
  const naechster = new Date(jahr, monat - 1, tag + 1)
  return `${naechster.getFullYear()}-${pad(naechster.getMonth() + 1)}-${pad(naechster.getDate())}`
}

/**
 * H1: ein Eintrag je Kalendertag von `start` bis `heute`, aeltester zuerst.
 * Trainingstag: mindestens eine Session mit `beendet_am` an diesem Tag.
 *
 * `start === null` (Zeitraum "alles") beginnt am ersten Trainingstag, nicht an
 * einem beliebig fruehen Datum — sonst rendert das Raster tausende leere
 * Restday-Felder vor dem ersten echten Eintrag. Ohne jede Session und ohne
 * `start` bleibt nur der heutige Tag als einzelner Restday.
 */
export function aktivitaetsraster(
  sessions: { beendet_am: string | null }[],
  start: string | null,
  heute: string,
): RasterTag[] {
  const trainingstage = new Set<string>()
  for (const session of sessions) {
    if (session.beendet_am != null) trainingstage.add(localDay(session.beendet_am))
  }

  const ersterTag = start ?? [...trainingstage].sort()[0] ?? heute
  const raster: RasterTag[] = []
  let tag = ersterTag
  while (tag <= heute) {
    raster.push({ datum: tag, status: trainingstage.has(tag) ? 'trainingstag' : 'restday' })
    tag = naechsterTag(tag)
  }
  return raster
}

export type WochenZeile = {
  woche: string
  trainingseinheiten: number
  kalorienschnitt: number | null
  gewichtsAenderung: number | null
}

type WochenEintrag = { einheiten: number; kalorien: number[]; gewichte: { datum: string; wert: number }[] }

/**
 * H2: eine Zeile je Kalenderwoche mit mindestens einem Signal aus den drei
 * Quellen — eine Woche ohne jede Session, jeden Kalorieneintrag und jede
 * Messung erscheint nicht (dieselbe Regel wie bei E5/T1: nur Wochen mit
 * Daten, keine mit Nullen aufgefuellten).
 *
 * Kalorienschnitt: Mittelwert ueber `tagesKalorien` (schon nur Tage **mit**
 * Eintrag, wie E5). Gewichtsaenderung: letzter minus erster gemessener Wert
 * der Woche, auf zwei Nachkommastellen gerundet wie in `body-change.ts`,
 * `null` bei weniger als zwei Messungen in der Woche.
 */
export function wochenKurzform(
  sessions: { beendet_am: string | null }[],
  tagesKalorien: TagesPunkt[],
  gewichte: { datum: string; gewicht: number | null }[],
): WochenZeile[] {
  const wochen = new Map<string, WochenEintrag>()

  function eintrag(montag: string): WochenEintrag {
    let zeile = wochen.get(montag)
    if (!zeile) {
      zeile = { einheiten: 0, kalorien: [], gewichte: [] }
      wochen.set(montag, zeile)
    }
    return zeile
  }

  for (const session of sessions) {
    if (session.beendet_am == null) continue
    eintrag(wochenStart(session.beendet_am)).einheiten += 1
  }
  for (const punkt of tagesKalorien) {
    eintrag(wochenStart(`${punkt.tag}T00:00:00`)).kalorien.push(punkt.kalorien)
  }
  for (const zeile of gewichte) {
    if (zeile.gewicht == null) continue
    eintrag(wochenStart(`${zeile.datum}T00:00:00`)).gewichte.push({ datum: zeile.datum, wert: zeile.gewicht })
  }

  return [...wochen.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([montag, zeile]) => {
      const gewogen = [...zeile.gewichte].sort((a, b) => a.datum.localeCompare(b.datum))
      const gewichtsAenderung =
        gewogen.length >= 2
          ? Math.round((gewogen[gewogen.length - 1].wert - gewogen[0].wert) * 100) / 100
          : null
      return {
        woche: wochenLabel(montag),
        trainingseinheiten: zeile.einheiten,
        kalorienschnitt:
          zeile.kalorien.length > 0
            ? Math.round(zeile.kalorien.reduce((summe, wert) => summe + wert, 0) / zeile.kalorien.length)
            : null,
        gewichtsAenderung,
      }
    })
}

import { localDay } from './local-time'

const pad = (value: number) => String(value).padStart(2, '0')

function montagVon(tag: string): string {
  const [jahr, monat, tagZahl] = tag.split('-').map(Number)
  const seitMontag = (new Date(jahr, monat - 1, tagZahl).getDay() + 6) % 7
  const montag = new Date(jahr, monat - 1, tagZahl - seitMontag)
  return `${montag.getFullYear()}-${pad(montag.getMonth() + 1)}-${pad(montag.getDate())}`
}

function montagDavor(montag: string): string {
  const [jahr, monat, tagZahl] = montag.split('-').map(Number)
  const davor = new Date(jahr, monat - 1, tagZahl - 7)
  return `${davor.getFullYear()}-${pad(davor.getMonth() + 1)}-${pad(davor.getDate())}`
}

export type PlanStreak = {
  /** Aufeinanderfolgende Wochen (Mo–So), in denen das Wochenziel erreicht wurde. */
  wochen: number
  /** Trainingstage der laufenden Woche. */
  dieseWoche: number
  /** Trainingstage pro Woche laut aktivem Plan (ohne Plan: 1). */
  ziel: number
}

/**
 * Streak in Plan-Wochen statt Kalendertagen (Nutzer-Entscheidung 18.10.2026):
 * ein Kalendertag-Streak bestraft genau den 3×-pro-Woche-Plan, den die App selbst
 * baut. Eine Woche zählt, wenn sie mindestens `ziel` Trainingstage hat. Die
 * laufende Woche bricht den Streak nicht, solange sie das Ziel noch erreichen
 * kann; sie zählt mit, sobald sie es erreicht hat.
 */
export function wochenImPlan(tage: string[], heute: string, ziel: number): PlanStreak {
  const wochenziel = Math.max(1, ziel)
  const jeWoche = new Map<string, number>()
  for (const tag of new Set(tage)) {
    const montag = montagVon(tag)
    jeWoche.set(montag, (jeWoche.get(montag) ?? 0) + 1)
  }

  const dieseWocheMontag = montagVon(heute)
  const dieseWoche = jeWoche.get(dieseWocheMontag) ?? 0
  let woche = dieseWoche >= wochenziel ? dieseWocheMontag : montagDavor(dieseWocheMontag)
  let wochen = 0
  while ((jeWoche.get(woche) ?? 0) >= wochenziel) {
    wochen += 1
    woche = montagDavor(woche)
  }
  return { wochen, dieseWoche, ziel: wochenziel }
}

/** Einheitlicher Text an beiden Stellen, die den Streak zeigen (Home-Karte, Abschluss-Screen). */
export function streakText({ wochen, dieseWoche, ziel }: PlanStreak): string {
  const fortschritt = `diese Woche ${dieseWoche} von ${ziel}`
  if (wochen === 0) {
    return dieseWoche === 0 ? 'Noch keine Woche im Plan.' : `Diese Woche ${dieseWoche} von ${ziel}`
  }
  const serie = `${wochen} ${wochen === 1 ? 'Woche' : 'Wochen'} im Plan`
  return dieseWoche >= ziel ? serie : `${serie} · ${fortschritt}`
}

/** Sortierte, eindeutige lokale Kalendertage mit mindestens einer beendeten Session. */
export function trainingstage(sessions: { beendet_am: string | null }[]): string[] {
  const tage = new Set<string>()
  for (const session of sessions) {
    if (session.beendet_am != null) tage.add(localDay(session.beendet_am))
  }
  return [...tage].sort()
}

export type WochenTag = { label: string; datum: string; trainiert: boolean; heute: boolean }

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

/**
 * Montag bis Sonntag der Woche von `heute`. Datumsarithmetik über lokale
 * Kalenderfelder (wie vorherigerTag), nicht über Millisekunden, damit ein
 * Sommerzeitwechsel keinen Tag verschiebt.
 */
export function wochenStreifen(tage: string[], heute: string): WochenTag[] {
  const [jahr, monat, tag] = heute.split('-').map(Number)
  const seitMontag = (new Date(jahr, monat - 1, tag).getDay() + 6) % 7
  const trainiert = new Set(tage)
  return WOCHENTAGE.map((label, index) => {
    const datum = new Date(jahr, monat - 1, tag - seitMontag + index)
    const iso = `${datum.getFullYear()}-${pad(datum.getMonth() + 1)}-${pad(datum.getDate())}`
    return { label, datum: iso, trainiert: trainiert.has(iso), heute: iso === heute }
  })
}

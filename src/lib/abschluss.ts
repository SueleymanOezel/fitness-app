import type { NeuerRekord } from './analysis/training-charts'
import { zahlDe } from './zahl'

type Satz = {
  exercise_id: string
  gewicht: number | null
  wiederholungen: number | null
  ist_aufwaermsatz: boolean
}

export type Vergleich = {
  exercise_id: string
  name: string
  heute: { gewicht: number | null; wiederholungen: number | null }
  /** The last working set of this exercise in an earlier workout; null on a first time. */
  vorher: { gewicht: number | null; wiederholungen: number | null } | null
}

/**
 * What the completion screen says beyond duration and kcal: working sets,
 * volume (kg × reps of working sets that have both), and per exercise today's
 * heaviest set next to the last set of the previous workout.
 */
export function abschlussZahlen(
  sets: Satz[],
  uebungen: { exercise_id: string; name: string }[],
  letzteWerte: Map<string, { gewicht: number | null; wiederholungen: number | null }>,
): { saetze: number; volumen: number; vergleiche: Vergleich[] } {
  const arbeit = sets.filter((set) => !set.ist_aufwaermsatz)
  const volumen = arbeit.reduce(
    (summe, set) => summe + (set.gewicht != null && set.wiederholungen != null ? set.gewicht * set.wiederholungen : 0),
    0,
  )
  const vergleiche: Vergleich[] = []
  for (const uebung of uebungen) {
    const eigene = arbeit.filter((set) => set.exercise_id === uebung.exercise_id)
    if (eigene.length === 0) continue
    // Heaviest first, more reps break a tie.
    const bester = [...eigene].sort(
      (a, b) => (b.gewicht ?? 0) - (a.gewicht ?? 0) || (b.wiederholungen ?? 0) - (a.wiederholungen ?? 0),
    )[0]
    vergleiche.push({
      exercise_id: uebung.exercise_id,
      name: uebung.name,
      heute: { gewicht: bester.gewicht, wiederholungen: bester.wiederholungen },
      vorher: letzteWerte.get(uebung.exercise_id) ?? null,
    })
  }
  return { saetze: arbeit.length, volumen: Math.round(volumen), vergleiche }
}

/** The completion screen's headline: a new record beats a heavier top set; null when neither happened. */
export function hoehepunktVon(neueRekorde: NeuerRekord[], vergleiche: Vergleich[]): { wert: string; text: string } | null {
  const rekord = neueRekorde[0]
  if (rekord) {
    return {
      wert: `≈ ${zahlDe(rekord.neuesEinsRM, 1)} kg`,
      text: `Neuer Rekord · ${rekord.name} (geschätztes 1RM)`,
    }
  }
  const schritte = vergleiche
    .filter((v) => v.vorher?.gewicht != null && v.heute.gewicht != null && v.heute.gewicht > v.vorher.gewicht)
    .map((v) => ({ name: v.name, delta: Math.round((v.heute.gewicht! - v.vorher!.gewicht!) * 100) / 100 }))
    .sort((a, b) => b.delta - a.delta)
  if (schritte.length === 0) return null
  return { wert: `+${zahlDe(schritte[0].delta)} kg`, text: `${schritte[0].name} · mehr als beim letzten Mal` }
}

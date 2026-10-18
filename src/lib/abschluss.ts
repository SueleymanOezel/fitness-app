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

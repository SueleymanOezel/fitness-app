import { useState } from 'react'
import type { AnalysisSet } from '../../hooks/use-training-analysis'
import { haeufigsteUebung, uebungenImZeitraum } from '../../lib/analysis/training-charts'

/**
 * Gewaehlte Uebung eines uebungsbezogenen Graphen.
 *
 * Die Vorbelegung wird bewusst nicht in den State geschrieben: bei einem
 * Zeitraumwechsel kaeme sonst ein Graph zu einer Uebung heraus, die im neuen
 * Zeitraum gar nicht trainiert wurde.
 */
export function useUebungsauswahl(sets: AnalysisSet[]) {
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const optionen = uebungenImZeitraum(sets)
  // Eine Auswahl, die im aktuellen Zeitraum nicht mehr auftaucht (nach einem
  // Zeitraumwechsel), zaehlt als nicht getroffen — sonst zeigt das <select>
  // einen Wert ohne passende <option> und rendert leer.
  const gueltig = gewaehlt != null && optionen.some((option) => option.exercise_id === gewaehlt)
  return {
    optionen,
    exerciseId: gueltig ? gewaehlt : haeufigsteUebung(sets),
    waehlen: setGewaehlt,
  }
}

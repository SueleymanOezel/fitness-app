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
  return {
    optionen: uebungenImZeitraum(sets),
    exerciseId: gewaehlt ?? haeufigsteUebung(sets),
    waehlen: setGewaehlt,
  }
}

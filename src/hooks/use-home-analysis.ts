import { useTrainingAnalysis } from './use-training-analysis'
import { useNutritionAnalysis } from './use-nutrition-analysis'
import { useBodyAnalysis } from './use-body-analysis'
import type { Zeitraum } from '../lib/analysis/zeitraum'

/**
 * Komponiert die drei bestehenden Bereichs-Hooks statt eigener Supabase-
 * Abfragen zu schreiben — Pagination, Chunking und Fehlerbehandlung
 * existieren dort bereits. Bewusste Konsequenz: sobald ein Home-Graph
 * angehakt ist, feuern alle Abfragen, die Training (2), Ernaehrung (2) und
 * Koerper (3) je einzeln schon ausloesen (Spec, Abschnitt "Datenfluss").
 */
export function useHomeAnalysis(userId: string, zeitraum: Zeitraum) {
  const training = useTrainingAnalysis(userId, zeitraum)
  const nutrition = useNutritionAnalysis(userId, zeitraum)
  const body = useBodyAnalysis(userId, zeitraum)
  return {
    sessions: training.sessions,
    entries: nutrition.entries,
    rows: body.rows,
    loading: training.loading || nutrition.loading || body.loading,
    error: training.error || nutrition.error || body.error,
  }
}

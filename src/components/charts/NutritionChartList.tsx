import { lazy, Suspense, type ReactNode } from 'react'
import type { AnalysisFoodEntry, AnalysisSessionKalorien } from '../../hooks/use-nutrition-analysis'
import type { MealSectionNames } from '../../lib/meal-sections'
import ChartPicker, { type useChartSelection } from './ChartPicker'
import { E1, E2, E3 } from '../../lib/analysis/registry'

// Lazy an dieser einen Stelle: die Liste ist der einzige Ort, an dem ein
// Ernaehrungsgraph noch eingebunden wird — Dashboard wie Analyse-Seite gehen
// hierdurch. Recharts bleibt damit aus dem Start-Chunk.
const CaloriesPerDayChart = lazy(() => import('./CaloriesPerDayChart'))
const MacroDistributionChart = lazy(() => import('./MacroDistributionChart'))
const MacroTrendChart = lazy(() => import('./MacroTrendChart'))

export type NutritionChartListProps = {
  ids: string[]
  entries: AnalysisFoodEntry[]
  sessions: AnalysisSessionKalorien[]
  ziel: number | null
  profile: MealSectionNames | null
  /** Gesetzt auf der Analyse-Seite: zeigt die Haekchen. */
  auswahl?: ReturnType<typeof useChartSelection>
}

export default function NutritionChartList({
  ids,
  entries,
  sessions,
  ziel,
  profile,
  auswahl,
}: NutritionChartListProps) {
  function graph(id: string): ReactNode {
    const picker = auswahl ? <ChartPicker id={id} auswahl={auswahl} /> : undefined
    switch (id) {
      case E1:
        return <CaloriesPerDayChart entries={entries} ziel={ziel} picker={picker} />
      case E2:
        return <MacroDistributionChart entries={entries} picker={picker} />
      case E3:
        return <MacroTrendChart entries={entries} picker={picker} />
      default:
        // Eine ID ohne Komponente ist kein Fehler, den der Nutzer sehen muss:
        // parseAuswahl haelt Unbekanntes schon fern, hier bleibt nur die Luecke.
        return null
    }
  }

  // sessions wird ab Task 7 (E6), profile ab Task 5 (E4) gebraucht; bis dahin
  // reicht die Liste sie nur durch.
  void sessions
  void profile

  return (
    <>
      {ids.map((id) => (
        <Suspense key={id} fallback={<p>Lädt…</p>}>
          {graph(id)}
        </Suspense>
      ))}
    </>
  )
}

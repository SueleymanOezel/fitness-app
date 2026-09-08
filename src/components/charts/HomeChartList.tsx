import { lazy, Suspense, type ReactNode } from 'react'
import type { AnalysisSession } from '../../hooks/use-training-analysis'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import type { BodyMetricRow } from '../../lib/body-metrics'
import ChartPicker, { type useChartSelection } from './ChartPicker'
import { H1, H2, H3 } from '../../lib/analysis/registry'
import type { Zeitraum } from '../../lib/analysis/zeitraum'

// Lazy an dieser einen Stelle: die Liste ist der einzige Ort, an dem ein
// Home-Graph noch eingebunden wird — Dashboard wie Analyse-Seite gehen
// hierdurch. Recharts (nur H3 braucht es) bleibt damit aus dem Start-Chunk.
const ActivityGridChart = lazy(() => import('./ActivityGridChart'))
const WeeklySummaryList = lazy(() => import('./WeeklySummaryList'))
const HomeSparklines = lazy(() => import('./HomeSparklines'))

export type HomeChartListProps = {
  ids: string[]
  sessions: AnalysisSession[]
  entries: AnalysisFoodEntry[]
  rows: BodyMetricRow[]
  /** H1 braucht das Fenster selbst, nicht nur die schon gefilterten Sessions. */
  zeitraum: Zeitraum
  auswahl?: ReturnType<typeof useChartSelection>
}

export default function HomeChartList({ ids, sessions, entries, rows, zeitraum, auswahl }: HomeChartListProps) {
  function graph(id: string): ReactNode {
    const picker = auswahl ? <ChartPicker id={id} auswahl={auswahl} /> : undefined
    switch (id) {
      case H1:
        return <ActivityGridChart sessions={sessions} zeitraum={zeitraum} picker={picker} />
      case H2:
        return <WeeklySummaryList sessions={sessions} entries={entries} rows={rows} picker={picker} />
      case H3:
        return <HomeSparklines rows={rows} entries={entries} picker={picker} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {ids.map((id) => (
        <Suspense key={id} fallback={<p>Lädt…</p>}>
          {graph(id)}
        </Suspense>
      ))}
    </div>
  )
}

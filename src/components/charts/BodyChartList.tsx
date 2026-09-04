import { lazy, Suspense, type ReactNode } from 'react'
import type { AnalysisPhoto } from '../../hooks/use-body-analysis'
import type { TagesPunkt } from '../../lib/analysis/nutrition-charts'
import type { BodyMetricRow } from '../../lib/body-metrics'
import ChartPicker, { type useChartSelection } from './ChartPicker'
import { K1, K2, K3, K4, K5 } from '../../lib/analysis/registry'

// Lazy an dieser einen Stelle: die Liste ist der einzige Ort, an dem ein
// Koerpergraph noch eingebunden wird — Dashboard wie Analyse-Seite gehen
// hierdurch. Recharts bleibt damit aus dem Start-Chunk.
const WeightTrendChart = lazy(() => import('./WeightTrendChart'))
const BodyMeasurementsChart = lazy(() => import('./BodyMeasurementsChart'))
const WeightChangeRateChart = lazy(() => import('./WeightChangeRateChart'))
const WeightVsCaloriesChart = lazy(() => import('./WeightVsCaloriesChart'))
const PhotoTimeline = lazy(() => import('./PhotoTimeline'))

export type BodyChartListProps = {
  ids: string[]
  rows: BodyMetricRow[]
  kalorien: TagesPunkt[]
  fotos: AnalysisPhoto[]
  /** Gesetzt auf der Analyse-Seite: zeigt die Haekchen. */
  auswahl?: ReturnType<typeof useChartSelection>
}

export default function BodyChartList({ ids, rows, kalorien, fotos, auswahl }: BodyChartListProps) {
  function graph(id: string): ReactNode {
    const picker = auswahl ? <ChartPicker id={id} auswahl={auswahl} /> : undefined
    switch (id) {
      case K1:
        return <WeightTrendChart rows={rows} picker={picker} />
      case K2:
        return <BodyMeasurementsChart rows={rows} picker={picker} />
      case K3:
        return <WeightChangeRateChart rows={rows} picker={picker} />
      case K4:
        return <WeightVsCaloriesChart rows={rows} kalorien={kalorien} picker={picker} />
      case K5:
        return <PhotoTimeline fotos={fotos} rows={rows} picker={picker} />
      default:
        // Eine ID ohne Komponente ist kein Fehler, den der Nutzer sehen muss:
        // parseAuswahl haelt Unbekanntes schon fern, hier bleibt nur die Luecke.
        return null
    }
  }

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

import { lazy, Suspense, type ReactNode } from 'react'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import ChartPicker, { type useChartSelection } from './ChartPicker'
import { T1, T2 } from '../../lib/analysis/registry'

// Lazy an dieser einen Stelle: die Liste ist der einzige Ort, an dem ein
// Trainingsgraph noch eingebunden wird — Dashboard wie Analyse-Seite gehen
// hierdurch. Recharts bleibt damit aus dem Start-Chunk.
const TrainingFrequencyChart = lazy(() => import('./TrainingFrequencyChart'))
const StrengthChart = lazy(() => import('./StrengthChart'))

export type TrainingChartListProps = {
  ids: string[]
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  /** Gesetzt auf der Analyse-Seite: zeigt Haekchen und Uebungsauswahl. */
  auswahl?: ReturnType<typeof useChartSelection>
}

export default function TrainingChartList({
  ids,
  sessions,
  sets,
  auswahl,
}: TrainingChartListProps) {
  const analyse = auswahl != null

  function graph(id: string): ReactNode {
    const picker = auswahl ? <ChartPicker id={id} auswahl={auswahl} /> : undefined
    switch (id) {
      case T1:
        return <TrainingFrequencyChart sessions={sessions} picker={picker} />
      case T2:
        return (
          <StrengthChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            mitUebungsauswahl={analyse}
          />
        )
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

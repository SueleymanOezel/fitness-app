import { lazy, Suspense, type ReactNode } from 'react'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import ChartPicker, { type useChartSelection } from './ChartPicker'
import { T1 } from '../../lib/analysis/registry'

// Lazy an dieser einen Stelle: die Liste ist der einzige Ort, an dem ein
// Trainingsgraph noch eingebunden wird — Dashboard wie Analyse-Seite gehen
// hierdurch. Recharts bleibt damit aus dem Start-Chunk.
const TrainingFrequencyChart = lazy(() => import('./TrainingFrequencyChart'))

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
      default:
        // Eine ID ohne Komponente ist kein Fehler, den der Nutzer sehen muss:
        // parseAuswahl haelt Unbekanntes schon fern, hier bleibt nur die Luecke.
        return null
    }
  }

  // `analyse` steuert spaeter die Uebungsauswahl ueber T2 bis T5; bis Task 3
  // wird der Wert nur weitergereicht.
  void analyse
  // `sets` wird erst ab Task 4 von einem Graphen gebraucht (T2); bis dahin
  // reicht die Liste die Saetze nur durch.
  void sets

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

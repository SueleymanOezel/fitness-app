import { lazy, Suspense, type ReactNode } from 'react'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import ChartPicker, { type useChartSelection } from './ChartPicker'
import { T1, T2, T3, T4, T5, T6, T7, T8 } from '../../lib/analysis/registry'

// Lazy an dieser einen Stelle: die Liste ist der einzige Ort, an dem ein
// Trainingsgraph noch eingebunden wird — Dashboard wie Analyse-Seite gehen
// hierdurch. Recharts bleibt damit aus dem Start-Chunk.
const TrainingFrequencyChart = lazy(() => import('./TrainingFrequencyChart'))
const StrengthChart = lazy(() => import('./StrengthChart'))
const ExerciseVolumeChart = lazy(() => import('./ExerciseVolumeChart'))
const BestSetWeightChart = lazy(() => import('./BestSetWeightChart'))
const RepsPerSetChart = lazy(() => import('./RepsPerSetChart'))
const MuscleVolumeChart = lazy(() => import('./MuscleVolumeChart'))
const SessionLoadChart = lazy(() => import('./SessionLoadChart'))
const PersonalRecordsList = lazy(() => import('./PersonalRecordsList'))

export type TrainingChartListProps = {
  ids: string[]
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  /** Gesetzt auf der Analyse-Seite: zeigt Haekchen und Uebungsauswahl. */
  auswahl?: ReturnType<typeof useChartSelection>
  /** Wird an jeden Chart des Bereichs durchgereicht, siehe ChartFrame. */
  leerCta?: { label: string; to: string }
}

export default function TrainingChartList({
  ids,
  sessions,
  sets,
  auswahl,
  leerCta,
}: TrainingChartListProps) {
  const analyse = auswahl != null

  function graph(id: string, cta?: { label: string; to: string }): ReactNode {
    const picker = auswahl ? <ChartPicker id={id} auswahl={auswahl} /> : undefined
    switch (id) {
      case T1:
        return <TrainingFrequencyChart sessions={sessions} picker={picker} leerCta={cta} />
      case T2:
        return (
          <StrengthChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            leerCta={cta}
            mitUebungsauswahl={analyse}
          />
        )
      case T3:
        return (
          <ExerciseVolumeChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            leerCta={cta}
            mitUebungsauswahl={analyse}
          />
        )
      case T4:
        return (
          <BestSetWeightChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            leerCta={cta}
            mitUebungsauswahl={analyse}
          />
        )
      case T5:
        return (
          <RepsPerSetChart
            sessions={sessions}
            sets={sets}
            picker={picker}
            leerCta={cta}
            mitUebungsauswahl={analyse}
          />
        )
      case T6:
        return <MuscleVolumeChart sets={sets} picker={picker} leerCta={cta} />
      case T7:
        return <SessionLoadChart sessions={sessions} picker={picker} leerCta={cta} />
      case T8:
        return <PersonalRecordsList sessions={sessions} sets={sets} picker={picker} leerCta={cta} />
      default:
        // Eine ID ohne Komponente ist kein Fehler, den der Nutzer sehen muss:
        // parseAuswahl haelt Unbekanntes schon fern, hier bleibt nur die Luecke.
        return null
    }
  }

  return (
    <div className="space-y-4">
      {ids.map((id, index) => (
        <Suspense key={id} fallback={<p>Lädt…</p>}>
          {graph(id, index === 0 ? leerCta : undefined)}
        </Suspense>
      ))}
    </div>
  )
}

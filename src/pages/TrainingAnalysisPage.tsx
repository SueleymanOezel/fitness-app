import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useTrainingAnalysis } from '../hooks/use-training-analysis'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import { useChartSelection } from '../components/charts/ChartPicker'
import TrainingChartList from '../components/charts/TrainingChartList'
import { chartsFor } from '../lib/analysis/registry'
import { STANDARD_ZEITRAUM, type Zeitraum } from '../lib/analysis/zeitraum'

export default function TrainingAnalysisPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Analyse</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <Analyse userId={userId} />
}

function Analyse({ userId }: { userId: string }) {
  const [zeitraum, setZeitraum] = useState<Zeitraum>(STANDARD_ZEITRAUM)
  const { sessions, sets, loading, error } = useTrainingAnalysis(userId, zeitraum)
  const auswahl = useChartSelection(userId)
  // Reihenfolge ist die der Registry — kein Umsortieren, wie in der Spec.
  const ids = chartsFor('training').map((chart) => chart.id)

  return (
    <div>
      <h1>Analyse</h1>
      <ZeitraumSwitch wert={zeitraum} onChange={setZeitraum} />
      {/* One message for the area, not one per chart: eight identical alerts
          between the charts would be noise, not information. */}
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <p>Lädt…</p>
      ) : (
        <TrainingChartList ids={ids} sessions={sessions} sets={sets} auswahl={auswahl} />
      )}
      <Link to="/training">Zurück zum Trainingsbereich</Link>
    </div>
  )
}

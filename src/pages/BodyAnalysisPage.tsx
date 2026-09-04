import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useBodyAnalysis } from '../hooks/use-body-analysis'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import { useChartSelection } from '../components/charts/ChartPicker'
import BodyChartList from '../components/charts/BodyChartList'
import { chartsFor } from '../lib/analysis/registry'
import { STANDARD_ZEITRAUM, type Zeitraum } from '../lib/analysis/zeitraum'

export default function BodyAnalysisPage() {
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
  const { rows, kalorien, fotos, loading, error } = useBodyAnalysis(userId, zeitraum)
  const auswahl = useChartSelection(userId)
  // Reihenfolge ist die der Registry — kein Umsortieren, wie in der Spec.
  const ids = chartsFor('body').map((chart) => chart.id)

  return (
    <div>
      <h1>Analyse</h1>
      <ZeitraumSwitch wert={zeitraum} onChange={setZeitraum} />
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <p>Lädt…</p>
      ) : (
        <BodyChartList ids={ids} rows={rows} kalorien={kalorien} fotos={fotos} auswahl={auswahl} />
      )}
      <Link to="/body">Zurück zum Körperbereich</Link>
    </div>
  )
}

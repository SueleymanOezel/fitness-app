import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useBodyAnalysis } from '../hooks/use-body-analysis'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import ChartPicker, { useChartSelection } from '../components/charts/ChartPicker'
import WeightTrendChart from '../components/charts/WeightTrendChart'
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
  const { rows, loading, error } = useBodyAnalysis(userId, zeitraum)
  const auswahl = useChartSelection(userId)

  return (
    <div>
      <h1>Analyse</h1>
      <ZeitraumSwitch wert={zeitraum} onChange={setZeitraum} />
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <p>Lädt…</p>
      ) : (
        <WeightTrendChart rows={rows} picker={<ChartPicker id="K1" auswahl={auswahl} />} />
      )}
      <Link to="/body">Zurück zum Körperbereich</Link>
    </div>
  )
}

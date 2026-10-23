import { useState } from 'react'
import { useSession } from '../hooks/use-session'
import { useBodyAnalysis } from '../hooks/use-body-analysis'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import { useChartSelection, AnpassenSchalter, AnpassenListe } from '../components/charts/ChartPicker'
import BodyChartList from '../components/charts/BodyChartList'
import { chartsFor } from '../lib/analysis/registry'
import { STANDARD_ZEITRAUM, type Zeitraum } from '../lib/analysis/zeitraum'
import PageSkeleton, { ChartSkeleton } from '../components/PageSkeleton'

export default function BodyAnalysisPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return <PageSkeleton titel="Analyse" />
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
      <AnpassenSchalter auswahl={auswahl} />
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <ChartSkeleton />
      ) : auswahl.anpassen ? (
        <AnpassenListe bereich="body" auswahl={auswahl} />
      ) : (
        <BodyChartList
          ids={ids}
          rows={rows}
          kalorien={kalorien}
          fotos={fotos}
          auswahl={auswahl}
          leerCta={{ label: 'Heute eintragen', to: '/body' }}
        />
      )}
    </div>
  )
}

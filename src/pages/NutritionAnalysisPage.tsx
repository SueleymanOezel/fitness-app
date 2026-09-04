import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useNutritionAnalysis } from '../hooks/use-nutrition-analysis'
import { useProfile } from '../hooks/use-profile'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import { useChartSelection } from '../components/charts/ChartPicker'
import NutritionChartList from '../components/charts/NutritionChartList'
import { chartsFor } from '../lib/analysis/registry'
import { STANDARD_ZEITRAUM, type Zeitraum } from '../lib/analysis/zeitraum'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'

export default function NutritionAnalysisPage() {
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
  const { entries, sessions, loading, error } = useNutritionAnalysis(userId, zeitraum)
  const { profile } = useProfile(userId)
  const auswahl = useChartSelection(userId)
  // Reihenfolge ist die der Registry — kein Umsortieren, wie in der Spec.
  const ids = chartsFor('nutrition').map((chart) => chart.id)

  return (
    <div>
      <h1>Analyse</h1>
      <ZeitraumSwitch wert={zeitraum} onChange={setZeitraum} />
      {error && <p role="alert">Daten konnten nicht geladen werden.</p>}
      {auswahl.fehler !== '' && <p role="alert">{auswahl.fehler}</p>}
      {loading ? (
        <p>Lädt…</p>
      ) : (
        <NutritionChartList
          ids={ids}
          entries={entries}
          sessions={sessions}
          // effectiveCalorieGoal, not the raw column: the manual field is null
          // for everyone who never typed a goal, and the fallback calculation is
          // what the rest of the app shows.
          ziel={profile ? effectiveCalorieGoal(profile) : null}
          profile={profile}
          auswahl={auswahl}
        />
      )}
      <Link to="/nutrition">Zurück zum Ernährungsbereich</Link>
    </div>
  )
}

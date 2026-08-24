import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useNutritionAnalysis } from '../hooks/use-nutrition-analysis'
import { useProfile } from '../hooks/use-profile'
import ZeitraumSwitch from '../components/ZeitraumSwitch'
import ChartPicker, { useChartSelection } from '../components/charts/ChartPicker'
import CaloriesPerDayChart from '../components/charts/CaloriesPerDayChart'
import { STANDARD_ZEITRAUM, type Zeitraum } from '../lib/analysis/zeitraum'
import { E1 } from '../lib/analysis/registry'
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
  const { entries, loading, error } = useNutritionAnalysis(userId, zeitraum)
  const { profile } = useProfile(userId)
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
        <CaloriesPerDayChart
          entries={entries}
          // effectiveCalorieGoal, not the raw column: the manual field is null
          // for everyone who never typed a goal, and the fallback calculation is
          // what the rest of the app shows.
          ziel={profile ? effectiveCalorieGoal(profile) : null}
          picker={<ChartPicker id={E1} auswahl={auswahl} />}
        />
      )}
      <Link to="/nutrition">Zurück zum Ernährungsbereich</Link>
    </div>
  )
}

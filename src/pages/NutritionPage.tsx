import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries } from '../hooks/use-food-entries'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'
import DailySummary from '../components/DailySummary'
import AddEntryFlow from '../components/AddEntryFlow'

export default function NutritionPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <NutritionDashboard userId={userId} />
}

function NutritionDashboard({ userId }: { userId: string }) {
  const { profile, loading: profileLoading, error: profileError, reload } = useProfile(userId)
  const { entries, loading: entriesLoading, addEntry } = useFoodEntries(userId)

  if (profileLoading || entriesLoading) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p role="alert">Profil konnte nicht geladen werden.</p>
        <button type="button" onClick={() => reload()}>
          Erneut versuchen
        </button>
      </div>
    )
  }

  const goal = effectiveCalorieGoal(profile)

  return (
    <div>
      <h1>Ernährung</h1>
      <DailySummary entries={entries} goal={goal} />
      {goal == null && (
        <p>
          Für ein Tagesziel <Link to="/profile">Profil vervollständigen</Link>.
        </p>
      )}
      <Link to="/profile">Ziel im Profil anpassen</Link>
      <AddEntryFlow onAdd={addEntry} />
      <Link to="/nutrition/entries">Einträge ansehen</Link>
    </div>
  )
}

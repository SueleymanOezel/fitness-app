import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries } from '../hooks/use-food-entries'
import { effectiveCalorieGoal } from '../lib/nutrition-goal'
import DailySummary from '../components/DailySummary'
import CalorieGoalEditor from '../components/CalorieGoalEditor'
import FoodEntryList from '../components/FoodEntryList'
import AddEntryFlow from '../components/AddEntryFlow'

export default function NutritionPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return null

  return <NutritionDashboard userId={userId} />
}

function NutritionDashboard({ userId }: { userId: string }) {
  const { profile, loading: profileLoading, updateProfile } = useProfile(userId)
  const { entries, loading: entriesLoading, addEntry, updateEntryMenge, deleteEntry } = useFoodEntries(userId)

  if (profileLoading || entriesLoading || !profile) {
    return (
      <div>
        <h1>Ernährung</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  const goal = effectiveCalorieGoal(profile)

  return (
    <div>
      <h1>Ernährung</h1>
      <DailySummary entries={entries} goal={goal} />
      <CalorieGoalEditor profile={profile} onUpdate={updateProfile} />
      <FoodEntryList entries={entries} onUpdateMenge={updateEntryMenge} onDelete={deleteEntry} />
      <AddEntryFlow onAdd={addEntry} />
    </div>
  )
}

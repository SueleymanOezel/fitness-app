import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useFoodEntries } from '../hooks/use-food-entries'
import FoodEntryList from '../components/FoodEntryList'

export default function NutritionEntriesPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) {
    return (
      <div>
        <h1>Einträge heute</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  return <EntriesList userId={userId} />
}

function EntriesList({ userId }: { userId: string }) {
  // Loads independently of the dashboard: both query the same day, and one small
  // query per page is cheaper than sharing state neither page owns.
  const { entries, loading, updateEntry, deleteEntry } = useFoodEntries(userId)

  return (
    <div>
      <h1>Einträge heute</h1>
      {loading ? (
        <p>Lädt…</p>
      ) : (
        <FoodEntryList entries={entries} onUpdateEntry={updateEntry} onDelete={deleteEntry} />
      )}
      <Link to="/nutrition">Zurück zur Ernährung</Link>
    </div>
  )
}

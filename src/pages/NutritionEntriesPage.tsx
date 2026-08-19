import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries, type FoodEntry } from '../hooks/use-food-entries'
import { visibleSections } from '../lib/meal-sections'
import { sumKalorien } from '../lib/entry-calories'
import FoodEntryList from '../components/FoodEntryList'
import AddEntryFlow from '../components/AddEntryFlow'

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

  return <EntriesBySection userId={userId} />
}

function EntriesBySection({ userId }: { userId: string }) {
  const { profile, loading: profileLoading } = useProfile(userId)
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useFoodEntries(userId)

  if (loading || profileLoading || !profile) {
    return (
      <div>
        <h1>Einträge heute</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  const sections = visibleSections(profile, entries)

  return (
    <div>
      <h1>Einträge heute</h1>
      {sections.map((section) => {
        // Bound to a const so the narrowing survives into the callback below —
        // TypeScript does not keep a property narrowing across a closure.
        const slot = section.slot
        const sectionEntries = entries.filter((entry) => entry.mahlzeit === slot)
        return (
          <section key={slot ?? 'unassigned'}>
            <h2>{`${section.name} — ${Math.round(sumKalorien(sectionEntries))} kcal`}</h2>
            <FoodEntryList
              entries={sectionEntries}
              userId={userId}
              onUpdateEntry={updateEntry}
              onDelete={deleteEntry}
            />
            {/* No add button for the unassigned group — nothing new belongs there. */}
            {slot !== null && (
              <AddEntryFlow onAdd={(productId, menge) => addEntry(productId, menge, slot)} />
            )}
          </section>
        )
      })}
      <Link to="/nutrition">Zurück zur Ernährung</Link>
    </div>
  )
}

export type { FoodEntry }

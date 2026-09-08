import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries, type EntryPatch, type FoodEntry } from '../hooks/use-food-entries'
import { mealSections, visibleSections, type MealSection } from '../lib/meal-sections'
import { sumKalorien } from '../lib/entry-calories'
import FoodEntryList from '../components/FoodEntryList'
import AddEntryFlow from '../components/AddEntryFlow'
import { buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'
import Dialog from '../components/Dialog'
import { VitaIcon } from '../components/icons/VitaIcon'

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
  const { profile, loading: profileLoading, error: profileError, reload } = useProfile(userId)
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useFoodEntries(userId)

  if (loading || profileLoading) {
    return (
      <div>
        <h1>Einträge heute</h1>
        <p>Lädt…</p>
      </div>
    )
  }

  if (profileError || !profile) {
    return (
      <div>
        <h1>Einträge heute</h1>
        <p role="alert">Profil konnte nicht geladen werden.</p>
        <button type="button" className="inline-flex items-center gap-2" onClick={() => reload()}>
          <VitaIcon name="retry" tone="brand" size={20} />
          Erneut versuchen
        </button>
      </div>
    )
  }

  const sections = visibleSections(profile, entries)
  const assignable = mealSections(profile)

  return (
    <div>
      <h1>Einträge heute</h1>
      {sections.map((section, index) => {
        // Bound to a const so the narrowing survives into the callback below —
        // TypeScript does not keep a property narrowing across a closure.
        const slot = section.slot
        const sectionEntries = entries.filter((entry) => entry.mahlzeit === slot)
        return (
          <SectionBlock
            key={slot ?? 'unassigned'}
            slot={slot}
            name={section.name}
            entries={sectionEntries}
            userId={userId}
            assignable={assignable}
            addEntry={addEntry}
            updateEntry={updateEntry}
            deleteEntry={deleteEntry}
            isPrimaryAdd={index === 0}
          />
        )
      })}
      <Link to="/nutrition" className="flex items-center justify-center gap-2">
        <VitaIcon name="back" tone="brand" size={20} />
        Zurück zur Ernährung
      </Link>
    </div>
  )
}

function SectionBlock({
  slot,
  name,
  entries,
  userId,
  assignable,
  addEntry,
  updateEntry,
  deleteEntry,
  isPrimaryAdd,
}: {
  slot: number | null
  name: string
  entries: FoodEntry[]
  userId: string
  assignable: MealSection[]
  addEntry: (productId: string, menge: number, mahlzeit: number | null) => Promise<void>
  updateEntry: (entryId: string, patch: EntryPatch) => Promise<void>
  deleteEntry: (entryId: string) => Promise<void>
  isPrimaryAdd: boolean
}) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <section>
      <h2>{`${name} — ${Math.round(sumKalorien(entries))} kcal`}</h2>
      <FoodEntryList
        entries={entries}
        userId={userId}
        sections={assignable}
        onUpdateEntry={updateEntry}
        onDelete={deleteEntry}
      />
      {/* No add button for the unassigned group — nothing new belongs there. */}
      {slot !== null && (
        <>
          <button
            type="button"
            className={isPrimaryAdd ? buttonPrimaryClass : buttonSecondaryClass}
            onClick={() => setDialogOpen(true)}
          >
            {/* "Eintrag hinzufügen", nicht bloss "Hinzufügen": AddEntryFlow
                (im Dialog) hat selbst einen Absenden-Button namens
                "Hinzufügen" — bei offenem Dialog sitzen beide im selben
                <section>, ein gleicher Name waere dann nicht mehr eindeutig. */}
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="add" tone="mono" size={20} />
              Eintrag hinzufügen
            </span>
          </button>
          {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
              rendering AddEntryFlow only while open resets its product/quantity/error
              state each time it opens, instead of showing the last attempt's leftovers. */}
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            {dialogOpen && (
              <AddEntryFlow
                onAdd={async (productId, menge) => {
                  await addEntry(productId, menge, slot)
                  setDialogOpen(false)
                }}
                onCancel={() => setDialogOpen(false)}
              />
            )}
          </Dialog>
        </>
      )}
    </section>
  )
}

export type { FoodEntry }

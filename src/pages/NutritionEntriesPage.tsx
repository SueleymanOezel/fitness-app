import { useState } from 'react'
import { useSession } from '../hooks/use-session'
import { useProfile } from '../hooks/use-profile'
import { useFoodEntries, type EntryPatch, type FoodEntry } from '../hooks/use-food-entries'
import { abschnittFuerUhrzeit, mealSections, visibleSections, type MealSection } from '../lib/meal-sections'
import { sumKalorien } from '../lib/entry-calories'
import FoodEntryList from '../components/FoodEntryList'
import AddEntryFlow from '../components/AddEntryFlow'
import Dialog from '../components/Dialog'
import { VitaIcon } from '../components/icons/VitaIcon'
import Pressable from '../components/Pressable'
import PageSkeleton from '../components/PageSkeleton'
import { useToast } from '../components/ToastProvider'
import { useGesternEintraege, type GesternEintrag } from '../hooks/use-yesterday-entries'

export default function NutritionEntriesPage() {
  const { session } = useSession()
  const userId = session?.user.id

  if (!userId) return <PageSkeleton titel="Einträge heute" variante="liste" />

  return <EntriesBySection userId={userId} />
}

function EntriesBySection({ userId }: { userId: string }) {
  const { profile, loading: profileLoading, error: profileError, reload } = useProfile(userId)
  const { entries, loading, addEntry, addEntries, updateEntry, deleteEntry, removeEntries, restoreEntry } =
    useFoodEntries(userId)
  const { eintraege: gestern } = useGesternEintraege(userId)

  if (loading || profileLoading) return <PageSkeleton titel="Einträge heute" variante="liste" />

  if (profileError || !profile) {
    return (
      <div>
        <h1>Einträge heute</h1>
        <p role="alert">Profil konnte nicht geladen werden.</p>
        <Pressable variant="secondary" type="button" className="inline-flex items-center gap-2 self-start" onClick={() => reload()}>
          <VitaIcon name="retry" tone="brand" size={20} />
          Erneut versuchen
        </Pressable>
      </div>
    )
  }

  const sections = visibleSections(profile, entries)
  const assignable = mealSections(profile)
  // The one primary add is the meal of the moment (breakfast in the morning…), not whichever comes first.
  const jetzt = abschnittFuerUhrzeit(assignable, new Date())

  return (
    <div>
      <h1>Einträge heute</h1>
      {sections.map((section) => {
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
            restoreEntry={restoreEntry}
            gestern={slot == null ? [] : gestern.filter((eintrag) => eintrag.mahlzeit === slot)}
            addEntries={addEntries}
            removeEntries={removeEntries}
            isPrimaryAdd={slot != null && slot === jetzt}
          />
        )
      })}
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
  restoreEntry,
  gestern,
  addEntries,
  removeEntries,
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
  restoreEntry: (entry: FoodEntry) => Promise<void>
  /** Yesterday's entries of this meal; the shortcut shows while today's is empty and yesterday's is not. */
  gestern: GesternEintrag[]
  addEntries: (rows: GesternEintrag[]) => Promise<string[]>
  removeEntries: (ids: string[]) => Promise<void>
  isPrimaryAdd: boolean
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [kopiertGerade, setKopiertGerade] = useState(false)
  const showToast = useToast()

  // The same breakfast every day in one tap instead of one search per food (re-audit 26.10.2026: efficiency).
  async function vonGestern() {
    setKopiertGerade(true)
    try {
      const ids = await addEntries(gestern)
      const anzahl = ids.length === 1 ? '1 Eintrag' : `${ids.length} Einträge`
      showToast(`${anzahl} von gestern übernommen.`, 'success', {
        label: 'Rückgängig',
        onClick: () =>
          void removeEntries(ids).catch(() => showToast('Konnte nicht rückgängig gemacht werden.', 'error')),
      })
    } catch {
      showToast('Konnte nicht von gestern übernommen werden.', 'error')
    } finally {
      setKopiertGerade(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2>{`${name} — ${Math.round(sumKalorien(entries))} kcal`}</h2>
      <FoodEntryList
        entries={entries}
        userId={userId}
        sections={assignable}
        onUpdateEntry={updateEntry}
        onDelete={deleteEntry}
        onRestore={restoreEntry}
      />
      {/* No add button for the unassigned group — nothing new belongs there. */}
      {slot !== null && (
        <>
          <Pressable
            variant={isPrimaryAdd ? 'primary' : 'secondary'}
            type="button"
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
          </Pressable>
          {/* Only for a meal still empty today: once copied (or eaten) it is gone, so it cannot double up. */}
          {gestern.length > 0 && entries.length === 0 && (
            <Pressable variant="secondary" type="button" disabled={kopiertGerade} onClick={() => void vonGestern()}>
              {`Von gestern übernehmen (${gestern.length})`}
            </Pressable>
          )}
          {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
              rendering AddEntryFlow only while open resets its product/quantity/error
              state each time it opens, instead of showing the last attempt's leftovers. */}
          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            {dialogOpen && <h2>{`Eintrag für ${name}`}</h2>}
            {dialogOpen && (
              <AddEntryFlow
                onAdd={async (productId, menge) => {
                  await addEntry(productId, menge, slot)
                  setDialogOpen(false)
                }}
              />
            )}
          </Dialog>
        </>
      )}
    </section>
  )
}

export type { FoodEntry }

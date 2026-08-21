import { useState } from 'react'
import FoodEntryEditForm from './FoodEntryEditForm'
import type { MealSection } from '../lib/meal-sections'
import type { EntryPatch, FoodEntry } from '../hooks/use-food-entries'

type Props = {
  entries: FoodEntry[]
  userId: string
  sections: MealSection[]
  onUpdateEntry: (entryId: string, patch: EntryPatch) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
}

export default function FoodEntryList({ entries, userId, sections, onUpdateEntry, onDelete }: Props) {
  if (entries.length === 0) {
    return <p>Noch keine Einträge heute.</p>
  }

  return (
    <ul>
      {entries.map((entry) => (
        <FoodEntryRow
          key={entry.id}
          entry={entry}
          userId={userId}
          sections={sections}
          onUpdateEntry={onUpdateEntry}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

function FoodEntryRow({
  entry,
  userId,
  sections,
  onUpdateEntry,
  onDelete,
}: { entry: FoodEntry } & Pick<Props, 'userId' | 'sections' | 'onUpdateEntry' | 'onDelete'>) {
  const [editing, setEditing] = useState(false)
  const [failed, setFailed] = useState(false)
  const label = entry.products?.name ?? 'Unbekanntes Produkt'
  const kalorien = entry.products ? Math.round((entry.products.kalorien * entry.menge) / 100) : null

  if (editing) {
    return (
      <li>
        <FoodEntryEditForm
          entry={entry}
          userId={userId}
          sections={sections}
          onSave={onUpdateEntry}
          onClose={() => setEditing(false)}
        />
      </li>
    )
  }

  return (
    <li>
      <span>{label}</span>
      {/* One template string per span: `{value} g` renders two text nodes and
          getByText(/150 g/) would not match across them. */}
      <span>{`${entry.menge} g`}</span>
      {kalorien != null && <span>{`${kalorien} kcal`}</span>}
      <button type="button" onClick={() => setEditing(true)}>
        Bearbeiten
      </button>
      <button
        type="button"
        onClick={() => {
          setFailed(false)
          onDelete(entry.id).catch(() => setFailed(true))
        }}
      >
        Löschen
      </button>
      {failed && <span role="alert">Eintrag konnte nicht gelöscht werden.</span>}
    </li>
  )
}

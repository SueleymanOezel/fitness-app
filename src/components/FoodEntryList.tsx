import { useState } from 'react'
import FoodEntryEditForm from './FoodEntryEditForm'
import { cardClass, buttonSecondaryClass } from '../lib/ui-classes'
import Dialog from './Dialog'
import { useToast } from './ToastProvider'
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
    <ul role="list" className="space-y-4">
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
  const showToast = useToast()
  const label = entry.products?.name ?? 'Unbekanntes Produkt'
  const kalorien = entry.products ? Math.round((entry.products.kalorien * entry.menge) / 100) : null

  return (
    <li className="block border-b-0">
      <div className={`${cardClass} w-full`}>
        <span>{label}</span>
        {/* One template string per span: `{value} g` renders two text nodes and
            getByText(/150 g/) would not match across them. */}
        <span>{`${entry.menge} g`}</span>
        {kalorien != null && <span>{`${kalorien} kcal`}</span>}
        <button type="button" className={buttonSecondaryClass} onClick={() => setEditing(true)}>
          Bearbeiten
        </button>
        <button
          type="button"
          className={buttonSecondaryClass}
          onClick={() => {
            onDelete(entry.id).catch(() => showToast('Eintrag konnte nicht gelöscht werden.', 'error'))
          }}
        >
          Löschen
        </button>
      </div>
      {/* Dialog keeps its children mounted even while closed (see Dialog.tsx) —
          rendering the edit form only while open resets its draft state each
          time it opens, instead of showing the last attempt's leftover values. */}
      <Dialog open={editing} onClose={() => setEditing(false)}>
        {editing && (
          <FoodEntryEditForm
            entry={entry}
            userId={userId}
            sections={sections}
            onSave={onUpdateEntry}
            onClose={() => setEditing(false)}
          />
        )}
      </Dialog>
    </li>
  )
}

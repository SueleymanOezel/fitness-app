import { useState } from 'react'
import FoodEntryEditForm from './FoodEntryEditForm'
import { cardClass, listClass } from '../lib/ui-classes'
import Dialog from './Dialog'
import { VitaIcon } from './icons/VitaIcon'
import ConfirmDelete from './ConfirmDelete'
import type { MealSection } from '../lib/meal-sections'
import type { EntryPatch, FoodEntry } from '../hooks/use-food-entries'
import Pressable from './Pressable'

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
    <div className={cardClass}>
      <ul role="list" className={listClass}>
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
    </div>
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
  const label = entry.products?.name ?? 'Unbekanntes Produkt'
  const kalorien = entry.products ? Math.round((entry.products.kalorien * entry.menge) / 100) : null

  return (
    <li>
      <div className="flex flex-col gap-2 py-3">
        <span className="font-semibold">{label}</span>
        {/* One template string per span: `{value} g` renders two text nodes and
            getByText(/150 g/) would not match across them. */}
        <div className="flex gap-3 text-sm text-text-muted">
          <span>{`${entry.menge} g`}</span>
          {kalorien != null && <span>{`${kalorien} kcal`}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Pressable variant="secondary" type="button" onClick={() => setEditing(true)}>
            <span className="inline-flex items-center justify-center gap-2">
              <VitaIcon name="edit" tone="mono" size={20} />
              Bearbeiten
            </span>
          </Pressable>
          <ConfirmDelete
            label="Löschen"
            titel="Eintrag löschen?"
            text={`${label} wird aus deinem Tagebuch entfernt.`}
            onConfirm={() => onDelete(entry.id)}
          />
        </div>
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

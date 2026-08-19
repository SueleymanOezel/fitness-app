import { useState } from 'react'
import type { FoodEntry } from '../hooks/use-food-entries'

type Props = {
  entries: FoodEntry[]
  onUpdateMenge: (entryId: string, menge: number) => Promise<void>
  onDelete: (entryId: string) => Promise<void>
}

export default function FoodEntryList({ entries, onUpdateMenge, onDelete }: Props) {
  if (entries.length === 0) {
    return <p>Noch keine Einträge heute.</p>
  }

  return (
    <ul>
      {entries.map((entry) => (
        <FoodEntryRow key={entry.id} entry={entry} onUpdateMenge={onUpdateMenge} onDelete={onDelete} />
      ))}
    </ul>
  )
}

function FoodEntryRow({
  entry,
  onUpdateMenge,
  onDelete,
}: { entry: FoodEntry } & Pick<Props, 'onUpdateMenge' | 'onDelete'>) {
  const label = entry.products?.name ?? 'Unbekanntes Produkt'
  // Held as a draft so clearing the field to retype it cannot persist an intermediate
  // (or empty, which Number() turns into 0) value on every keystroke.
  const [draft, setDraft] = useState(String(entry.menge))
  const [failed, setFailed] = useState(false)

  function commit() {
    setFailed(false)
    const value = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(value) || value <= 0) {
      setDraft(String(entry.menge))
      return
    }
    if (value === entry.menge) return

    // A rejected write must not leave the typed value on screen as if it were stored.
    onUpdateMenge(entry.id, value).catch(() => {
      setDraft(String(entry.menge))
      setFailed(true)
    })
  }

  return (
    <li>
      <span>{label}</span>
      <input
        type="number"
        aria-label={`Menge (g) für ${label}`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
      />
      <span>g</span>
      <button type="button" onClick={() => onDelete(entry.id).catch(() => setFailed(true))}>
        Löschen
      </button>
      {failed && <span role="alert">Änderung konnte nicht gespeichert werden.</span>}
    </li>
  )
}

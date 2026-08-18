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
      {entries.map((entry) => {
        const label = entry.products?.name ?? 'Unbekanntes Produkt'
        return (
          <li key={entry.id}>
            <span>{label}</span>
            <input
              type="number"
              aria-label={`Menge (g) für ${label}`}
              value={entry.menge}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (!Number.isNaN(value)) onUpdateMenge(entry.id, value)
              }}
            />
            <span>g</span>
            <button type="button" onClick={() => onDelete(entry.id)}>
              Löschen
            </button>
          </li>
        )
      })}
    </ul>
  )
}

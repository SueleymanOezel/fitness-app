import { useState, type FormEvent } from 'react'
import type { FoodEntry } from '../hooks/use-food-entries'
import { useMahlzeitFavoriten } from '../hooks/use-meal-favorites'
import { cardClass, fieldLabelClass, inputClass, interactiveClass, labelClass } from '../lib/ui-classes'
import Dialog from './Dialog'
import Pressable from './Pressable'
import { useToast } from './ToastProvider'

/** "Als Favorit speichern" under a meal: today's foods and amounts become one tap next time. */
export default function FavoritSpeichern({ userId, vorschlag, entries }: { userId: string; vorschlag: string; entries: FoodEntry[] }) {
  const [offen, setOffen] = useState(false)
  return (
    <>
      <Pressable
        variant="bare"
        type="button"
        className={`inline-flex min-h-11 items-center self-start rounded-full px-1 text-sm font-medium text-accent-text ${interactiveClass}`}
        onClick={() => setOffen(true)}
      >
        Als Favorit speichern
      </Pressable>
      <Dialog open={offen} onClose={() => setOffen(false)}>
        {/* Mounted only while open: the favorites are not read for every meal on the page. */}
        {offen && <Formular userId={userId} vorschlag={vorschlag} entries={entries} onFertig={() => setOffen(false)} />}
      </Dialog>
    </>
  )
}

function Formular({ userId, vorschlag, entries, onFertig }: { userId: string; vorschlag: string; entries: FoodEntry[]; onFertig: () => void }) {
  const { speichern } = useMahlzeitFavoriten(userId)
  const showToast = useToast()
  const [name, setName] = useState(vorschlag)
  const [fehler, setFehler] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // An entry whose product is gone has nothing to repeat.
  const zutaten = entries.filter((entry): entry is FoodEntry & { product_id: string } => entry.product_id != null)

  async function absenden(event: FormEvent) {
    event.preventDefault()
    if (name.trim() === '') {
      setFehler('Der Favorit braucht einen Namen.')
      return
    }
    setBusy(true)
    try {
      await speichern(name.slice(0, 60), zutaten.map((entry) => ({ product_id: entry.product_id, menge: entry.menge })))
      onFertig()
      showToast(`Favorit „${name.trim()}“ gespeichert.`, 'success')
    } catch {
      setBusy(false)
      setFehler('Favorit konnte nicht gespeichert werden.')
    }
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-4" noValidate>
      <div className={cardClass}>
        <h2>Als Favorit speichern</h2>
        <label className={fieldLabelClass}>
          Name
          <input className={inputClass} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <ul role="list" className={labelClass}>
          {zutaten.map((entry) => (
            <li key={entry.id}>{`${entry.products?.name ?? 'Unbekannt'} · ${entry.menge.toLocaleString('de-DE')} g`}</li>
          ))}
        </ul>
        <p className="text-sm text-text-muted">Beim Hinzufügen steht er dann ganz oben und trägt alles mit einem Tipp ein.</p>
        {fehler && <p role="alert">{fehler}</p>}
      </div>
      <Pressable variant="primary" type="submit" disabled={busy}>
        {busy ? 'Speichert …' : 'Favorit speichern'}
      </Pressable>
    </form>
  )
}

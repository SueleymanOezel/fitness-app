import { useState, type FormEvent } from 'react'
import ProductPicker from './ProductPicker'
import { parseNutrients } from '../lib/nutrients'
import { saveProductEdit } from '../lib/product-edit'
import { fromLocalInputValue, toLocalInputValue } from '../lib/local-time'
import type { Product } from '../lib/product-lookup'
import type { EntryPatch, FoodEntry } from '../hooks/use-food-entries'

type Props = {
  entry: FoodEntry
  userId: string
  onSave: (entryId: string, patch: EntryPatch) => Promise<void>
  onClose: () => void
}

export default function FoodEntryEditForm({ entry, userId, onSave, onClose }: Props) {
  const product = entry.products
  const [menge, setMenge] = useState(String(entry.menge))
  const [zeitpunkt, setZeitpunkt] = useState(toLocalInputValue(entry.zeitpunkt))
  const [swapped, setSwapped] = useState<Product | null>(null)
  const [name, setName] = useState(product?.name ?? '')
  const [kalorien, setKalorien] = useState(product?.kalorien?.toString() ?? '')
  const [eiweiss, setEiweiss] = useState(product?.eiweiss?.toString() ?? '')
  const [fett, setFett] = useState(product?.fett?.toString() ?? '')
  const [kohlenhydrate, setKohlenhydrate] = useState(product?.kohlenhydrate?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const value = Number(menge)
    if (menge.trim() === '' || !Number.isFinite(value) || value <= 0) {
      setError('Bitte eine Menge größer als 0 g angeben.')
      return
    }

    const patch: EntryPatch = { menge: value, zeitpunkt: fromLocalInputValue(zeitpunkt) }

    if (swapped) {
      // The nutrients on screen belong to the product being replaced, so they
      // are not saved — the entry simply points at the chosen product now.
      patch.product_id = swapped.id
    } else if (product) {
      const nutrients = parseNutrients({ kalorien, eiweiss, fett, kohlenhydrate })
      if (!nutrients) {
        setError('Bitte plausible Werte pro 100 g eingeben (Kalorien 0–900 kcal, Makros 0–100 g).')
        return
      }

      try {
        const saved = await saveProductEdit(
          { id: product.id, created_by: product.created_by },
          { ...nutrients, name: name.trim() || product.name },
          userId,
        )
        // saveProductEdit returns a copy when the product belonged to someone
        // else; the entry has to follow it.
        if (saved.id !== product.id) patch.product_id = saved.id
      } catch {
        setError('Produkt konnte nicht gespeichert werden. Bitte erneut versuchen.')
        return
      }
    }

    try {
      await onSave(entry.id, patch)
      onClose()
    } catch {
      setError('Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Menge (g)
        <input type="number" value={menge} onChange={(event) => setMenge(event.target.value)} />
      </label>
      <label>
        Zeitpunkt
        <input
          type="datetime-local"
          value={zeitpunkt}
          onChange={(event) => setZeitpunkt(event.target.value)}
        />
      </label>

      <p>{swapped ? swapped.name : (product?.name ?? 'Unbekanntes Produkt')}</p>
      <ProductPicker onPicked={(picked) => setSwapped(picked)} onCancel={() => {}} />

      {!swapped && product && (
        <fieldset>
          <legend>Nährwerte pro 100 g</legend>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Kalorien (kcal)
            <input
              type="number"
              value={kalorien}
              onChange={(event) => setKalorien(event.target.value)}
            />
          </label>
          <label>
            Eiweiß (g)
            <input type="number" value={eiweiss} onChange={(event) => setEiweiss(event.target.value)} />
          </label>
          <label>
            Fett (g)
            <input type="number" value={fett} onChange={(event) => setFett(event.target.value)} />
          </label>
          <label>
            Kohlenhydrate (g)
            <input
              type="number"
              value={kohlenhydrate}
              onChange={(event) => setKohlenhydrate(event.target.value)}
            />
          </label>
        </fieldset>
      )}

      {error && <p role="alert">{error}</p>}
      <button type="submit">Speichern</button>
      <button type="button" onClick={onClose}>
        Abbrechen
      </button>
    </form>
  )
}

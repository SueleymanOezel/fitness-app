import { useState, type FormEvent } from 'react'
import ProductPicker from './ProductPicker'
import { parseNutrients } from '../lib/nutrients'
import { saveProductEdit } from '../lib/product-edit'
import { fromLocalInputValue, toLocalInputValue } from '../lib/local-time'
import { MAX_NAME_LENGTH } from '../lib/open-food-facts'
import { UNASSIGNED_LABEL, type MealSection } from '../lib/meal-sections'
import type { Product } from '../lib/product-lookup'
import type { EntryPatch, FoodEntry } from '../hooks/use-food-entries'

type Props = {
  entry: FoodEntry
  userId: string
  sections: MealSection[]
  onSave: (entryId: string, patch: EntryPatch) => Promise<void>
  onClose: () => void
}

// Cache of the last saveProductEdit result, keyed by the exact input it was
// produced from. A retry after a failed onSave (e.g. a network drop) must
// reuse this instead of writing another copy of a foreign product — see I3.
type ProductSaveCache = { key: string; result: Product }

export default function FoodEntryEditForm({ entry, userId, sections, onSave, onClose }: Props) {
  const product = entry.products
  const initialZeitpunkt = toLocalInputValue(entry.zeitpunkt)
  const [menge, setMenge] = useState(String(entry.menge))
  const [zeitpunkt, setZeitpunkt] = useState(initialZeitpunkt)
  const [mahlzeit, setMahlzeit] = useState(entry.mahlzeit === null ? '' : String(entry.mahlzeit))
  const [swapped, setSwapped] = useState<Product | null>(null)
  const [picking, setPicking] = useState(false)
  const [name, setName] = useState(product?.name ?? '')
  const [kalorien, setKalorien] = useState(product?.kalorien?.toString() ?? '')
  const [eiweiss, setEiweiss] = useState(product?.eiweiss?.toString() ?? '')
  const [fett, setFett] = useState(product?.fett?.toString() ?? '')
  const [kohlenhydrate, setKohlenhydrate] = useState(product?.kohlenhydrate?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [productSaveCache, setProductSaveCache] = useState<ProductSaveCache | null>(null)

  if (picking) {
    return (
      <ProductPicker
        onPicked={(picked) => {
          setSwapped(picked)
          setPicking(false)
        }}
        onCancel={() => setPicking(false)}
      />
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const value = Number(menge)
    if (menge.trim() === '' || !Number.isFinite(value) || value <= 0) {
      setError('Bitte eine Menge größer als 0 g angeben.')
      return
    }

    const patch: EntryPatch = { menge: value }

    // Only when it actually changed — an unchanged section has no business in the patch.
    const gewaehlt = mahlzeit === '' ? null : Number(mahlzeit)
    if (gewaehlt !== entry.mahlzeit) patch.mahlzeit = gewaehlt

    // datetime-local has minute resolution; only touch zeitpunkt when the
    // field actually changed, otherwise a plain amount edit would silently
    // zero out seconds/milliseconds on every save (M1).
    if (zeitpunkt !== initialZeitpunkt) {
      const zeitpunktIso = fromLocalInputValue(zeitpunkt)
      if (!zeitpunktIso) {
        setError('Bitte einen gültigen Zeitpunkt angeben.')
        return
      }
      patch.zeitpunkt = zeitpunktIso
    }

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

      // Truncated the same way as ManualProductForm/open-food-facts.ts: the
      // field has no maxLength, and products.name has no length constraint,
      // so an untrimmed value would reach the shared table unbounded (I2).
      const trimmedName = name.trim().slice(0, MAX_NAME_LENGTH) || product.name
      const nutrientsChanged =
        trimmedName !== product.name ||
        nutrients.kalorien !== product.kalorien ||
        nutrients.eiweiss !== product.eiweiss ||
        nutrients.fett !== product.fett ||
        nutrients.kohlenhydrate !== product.kohlenhydrate

      // Only amount/time changed: writing the product here would, for a
      // product owned by someone else, always take the insert branch of
      // saveProductEdit and create a duplicate row every time the amount is
      // edited. Skip the product write entirely when nothing about it changed.
      if (nutrientsChanged) {
        const cacheKey = JSON.stringify({ trimmedName, ...nutrients })
        let saved: Product

        if (productSaveCache && productSaveCache.key === cacheKey) {
          // Retrying after a failed onSave with the same field values: reuse
          // the earlier result instead of writing another copy (I3).
          saved = productSaveCache.result
        } else {
          try {
            saved = await saveProductEdit(
              { id: product.id, created_by: product.created_by },
              { ...nutrients, name: trimmedName },
              userId,
            )
            setProductSaveCache({ key: cacheKey, result: saved })
          } catch {
            setError('Produkt konnte nicht gespeichert werden. Bitte erneut versuchen.')
            return
          }
        }

        // saveProductEdit returns a copy when the product belonged to someone
        // else; the entry has to follow it.
        if (saved.id !== product.id) patch.product_id = saved.id
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
      <label>
        Mahlzeit
        <select value={mahlzeit} onChange={(event) => setMahlzeit(event.target.value)}>
          <option value="">{UNASSIGNED_LABEL}</option>
          {sections.map((section) => (
            <option key={section.slot} value={String(section.slot)}>
              {section.name}
            </option>
          ))}
        </select>
      </label>

      <p>{swapped ? swapped.name : (product?.name ?? 'Unbekanntes Produkt')}</p>
      <button type="button" onClick={() => setPicking(true)}>
        Anderes Produkt wählen
      </button>

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

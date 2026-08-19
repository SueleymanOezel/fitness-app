import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Product } from '../lib/product-lookup'
import { MAX_NAME_LENGTH } from '../lib/open-food-facts'
import { parseNutrients } from '../lib/nutrients'

type Props = {
  barcode?: string
  onCreated: (product: Product) => void
  onCancel: () => void
}
export default function ManualProductForm({ barcode, onCreated, onCancel }: Props) {
  const [name, setName] = useState('')
  const [kalorien, setKalorien] = useState('')
  const [eiweiss, setEiweiss] = useState('')
  const [fett, setFett] = useState('')
  const [kohlenhydrate, setKohlenhydrate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim() || kalorien.trim() === '') {
      setError('Name und Kalorien (pro 100 g) sind erforderlich.')
      return
    }

    const nutrients = parseNutrients({ kalorien, eiweiss, fett, kohlenhydrate })
    if (!nutrients) {
      setError('Bitte plausible Werte pro 100 g eingeben (Kalorien 0–900 kcal, Makros 0–100 g).')
      return
    }

    setSubmitting(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) {
        setError('Produkt konnte nicht angelegt werden. Bitte erneut versuchen.')
        return
      }

      const { data, error: insertError } = await supabase
        .from('products')
        .insert({
          name: name.trim().slice(0, MAX_NAME_LENGTH),
          barcode: barcode ?? null,
          ...nutrients,
          created_by: userId,
        })
        .select('id, name, barcode, kalorien, eiweiss, fett, kohlenhydrate')
        .single()

      if (insertError || !data) {
        // Raw Postgres/RLS messages stay out of the UI.
        setError('Produkt konnte nicht angelegt werden. Bitte erneut versuchen.')
        return
      }

      onCreated(data as Product)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Neues Produkt (Werte pro 100 g)</h2>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Kalorien (kcal)
        <input type="number" value={kalorien} onChange={(event) => setKalorien(event.target.value)} />
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
        <input type="number" value={kohlenhydrate} onChange={(event) => setKohlenhydrate(event.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        Produkt speichern
      </button>
      <button type="button" onClick={onCancel}>
        Abbrechen
      </button>
    </form>
  )
}

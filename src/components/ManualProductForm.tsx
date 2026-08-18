import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Product } from '../lib/product-lookup'

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

    setSubmitting(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error: insertError } = await supabase
        .from('products')
        .insert({
          name: name.trim(),
          barcode: barcode ?? null,
          kalorien: Number(kalorien),
          eiweiss: eiweiss.trim() === '' ? null : Number(eiweiss),
          fett: fett.trim() === '' ? null : Number(fett),
          kohlenhydrate: kohlenhydrate.trim() === '' ? null : Number(kohlenhydrate),
          created_by: userData.user?.id,
        })
        .select('id, name, barcode, kalorien, eiweiss, fett, kohlenhydrate')
        .single()

      if (insertError || !data) {
        setError(insertError?.message ?? 'Produkt konnte nicht angelegt werden.')
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

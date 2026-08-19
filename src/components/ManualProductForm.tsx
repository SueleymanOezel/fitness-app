import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Product } from '../lib/product-lookup'

type Props = {
  barcode?: string
  onCreated: (product: Product) => void
  onCancel: () => void
}

/**
 * products is a shared community table — a typo'd -300 or 1e21 would poison everyone's
 * totals, so implausible values never reach the insert. Empty macros stay null.
 */
function parseNutrients(raw: Record<'kalorien' | 'eiweiss' | 'fett' | 'kohlenhydrate', string>) {
  const parse = (value: string, max: number) => {
    if (value.trim() === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : undefined
  }

  const kalorien = parse(raw.kalorien, 900)
  const eiweiss = parse(raw.eiweiss, 100)
  const fett = parse(raw.fett, 100)
  const kohlenhydrate = parse(raw.kohlenhydrate, 100)

  if (kalorien == null || eiweiss === undefined || fett === undefined || kohlenhydrate === undefined) {
    return null
  }
  return { kalorien, eiweiss, fett, kohlenhydrate }
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
      const { data, error: insertError } = await supabase
        .from('products')
        .insert({
          name: name.trim(),
          barcode: barcode ?? null,
          ...nutrients,
          created_by: userData.user?.id,
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

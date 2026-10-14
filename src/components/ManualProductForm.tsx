import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { PRODUCT_COLUMNS, type Product } from '../lib/product-lookup'
import { MAX_NAME_LENGTH } from '../lib/open-food-facts'
import { parseNutrients } from '../lib/nutrients'
import { cardClass, fieldLabelClass, inputClass } from '../lib/ui-classes'
import { VitaIcon } from './icons/VitaIcon'
import Pressable from './Pressable'

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
  const [ballaststoffe, setBallaststoffe] = useState('')
  const [zucker, setZucker] = useState('')
  const [salz, setSalz] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim() || kalorien.trim() === '') {
      setError('Name und Kalorien (pro 100 g) sind erforderlich.')
      return
    }

    const nutrients = parseNutrients({ kalorien, eiweiss, fett, kohlenhydrate, ballaststoffe, zucker, salz })
    if (!nutrients) {
      setError('Bitte plausible Werte pro 100 g eingeben (Kalorien 0–900 kcal, alle Gramm-Angaben 0–100 g).')
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
        .select(PRODUCT_COLUMNS)
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2>Neues Produkt (Werte pro 100 g)</h2>
      <div className={cardClass}>
        <label className={fieldLabelClass}>
          Name
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
      <label className={fieldLabelClass}>
        Kalorien (kcal)
        <input className={inputClass} type="number" step="any" value={kalorien} onChange={(event) => setKalorien(event.target.value)} />
      </label>
      <label className={fieldLabelClass}>
        Eiweiß (g)
        <input className={inputClass} type="number" step="any" value={eiweiss} onChange={(event) => setEiweiss(event.target.value)} />
      </label>
      <label className={fieldLabelClass}>
        Fett (g)
        <input className={inputClass} type="number" step="any" value={fett} onChange={(event) => setFett(event.target.value)} />
      </label>
      <label className={fieldLabelClass}>
        Kohlenhydrate (g)
        <input className={inputClass} type="number" step="any" value={kohlenhydrate} onChange={(event) => setKohlenhydrate(event.target.value)} />
      </label>
      <label className={fieldLabelClass}>
        Ballaststoffe (g)
        <input
          className={inputClass}
          type="number"
          step="any"
          value={ballaststoffe}
          onChange={(event) => setBallaststoffe(event.target.value)}
        />
      </label>
      <label className={fieldLabelClass}>
        Zucker (g)
        <input className={inputClass} type="number" step="any" value={zucker} onChange={(event) => setZucker(event.target.value)} />
      </label>
      <label className={fieldLabelClass}>
        Salz (g)
        <input className={inputClass} type="number" step="any" value={salz} onChange={(event) => setSalz(event.target.value)} />
      </label>
      </div>

      {error && <p role="alert">{error}</p>}
      <Pressable variant="primary" type="submit" disabled={submitting}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="save" tone="mono" size={20} />
          Produkt speichern
        </span>
      </Pressable>
      <Pressable variant="secondary" className="self-start" type="button" onClick={onCancel}>
        Abbrechen
      </Pressable>
    </form>
  )
}

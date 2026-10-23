import { useState, type FormEvent } from 'react'
import ProductPicker from './ProductPicker'
import type { Product } from '../lib/product-lookup'
import { parseDecimal } from '../lib/parse-decimal'
import { cardClass, fieldLabelClass, inputClass } from '../lib/ui-classes'
import Chip from './Chip'
import Pressable from './Pressable'

type Props = {
  onAdd: (productId: string, menge: number) => Promise<void>
  /** Passed on to the product picker; leave it out inside a dialog, whose own close button is the way out. */
  onCancel?: () => void
}

/** Common portions in grams, one tap each; the last eaten amount comes first when there is one. */
const SCHNELLMENGEN = [50, 100, 200]

export default function AddEntryFlow({ onAdd, onCancel }: Props) {
  const [product, setProduct] = useState<Product | null>(null)
  const [menge, setMenge] = useState('100')
  const [letzteMenge, setLetzteMenge] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setProduct(null)
    setMenge('100')
    setLetzteMenge(null)
    setError(null)
  }

  async function handleConfirmQuantity(event: FormEvent) {
    event.preventDefault()
    if (!product) return
    setError(null)

    const value = parseDecimal(menge)
    if (value == null || value <= 0) {
      setError('Bitte eine Menge größer als 0 g angeben.')
      return
    }

    try {
      await onAdd(product.id, value)
      reset()
    } catch {
      setError('Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.')
    }
  }

  const mengeZahl = parseDecimal(menge)
  const kcalVorschau =
    product && mengeZahl != null && mengeZahl > 0 ? Math.round((product.kalorien * mengeZahl) / 100) : null

  if (!product) {
    return (
      <ProductPicker
        onPicked={(picked, zuletzt) => {
          setProduct(picked)
          // A repeated meal is usually the same portion as last time.
          if (zuletzt != null) {
            setMenge(String(zuletzt).replace('.', ','))
            setLetzteMenge(zuletzt)
          }
        }}
        onCancel={onCancel}
      />
    )
  }

  const mengen = [...new Set([...(letzteMenge != null ? [letzteMenge] : []), ...SCHNELLMENGEN])]

  return (
    <form onSubmit={handleConfirmQuantity} className="flex flex-col gap-4">
      <div className={cardClass}>
        <p className="font-semibold">{product.name}</p>
        <label className={fieldLabelClass}>
          Menge (g)
          <input
            className={inputClass}
            inputMode="decimal"
            // The product is chosen; the amount is the one thing left to type.
            autoFocus
            value={menge}
            onChange={(event) => setMenge(event.target.value)}
          />
        </label>
        <div role="group" aria-label="Schnellmengen" className="flex flex-wrap gap-2">
          {mengen.map((gramm) => (
            <Chip key={gramm} active={mengeZahl === gramm} onClick={() => setMenge(String(gramm).replace('.', ','))}>
              {gramm === letzteMenge ? `wie zuletzt ${gramm.toLocaleString('de-DE')} g` : `${gramm} g`}
            </Chip>
          ))}
        </div>
        {/* What the portion adds up to, before it is stored. */}
        {kcalVorschau != null && <p className="text-sm text-text-muted">{`≈ ${kcalVorschau} kcal`}</p>}
      </div>
      {error && <p role="alert">{error}</p>}
      <Pressable variant="primary" type="submit">
        Hinzufügen
      </Pressable>
      <Pressable variant="secondary" className="self-start" type="button" onClick={reset}>
        Anderes Produkt
      </Pressable>
    </form>
  )
}

import { useState, type FormEvent } from 'react'
import ProductPicker from './ProductPicker'
import type { Product } from '../lib/product-lookup'
import { cardClass, fieldLabelClass, inputClass } from '../lib/ui-classes'
import Pressable from './Pressable'

type Props = {
  onAdd: (productId: string, menge: number) => Promise<void>
  onCancel?: () => void
}

export default function AddEntryFlow({ onAdd, onCancel }: Props) {
  const [product, setProduct] = useState<Product | null>(null)
  const [menge, setMenge] = useState('100')
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setProduct(null)
    setMenge('100')
    setError(null)
  }

  async function handleConfirmQuantity(event: FormEvent) {
    event.preventDefault()
    if (!product) return
    setError(null)

    const value = Number(menge)
    if (menge.trim() === '' || !Number.isFinite(value) || value <= 0) {
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

  if (!product) {
    return <ProductPicker onPicked={setProduct} onCancel={onCancel ?? reset} />
  }

  return (
    <form onSubmit={handleConfirmQuantity} className="flex flex-col gap-4">
      <div className={cardClass}>
        <p>{product.name}</p>
        <label className={fieldLabelClass}>
          Menge (g)
          <input className={inputClass} type="number" step="any" value={menge} onChange={(event) => setMenge(event.target.value)} />
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <Pressable variant="primary" type="submit">
        Hinzufügen
      </Pressable>
      <Pressable variant="secondary" className="self-start" type="button" onClick={reset}>
        Abbrechen
      </Pressable>
    </form>
  )
}

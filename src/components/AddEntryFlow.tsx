import { useState, type FormEvent } from 'react'
import ProductPicker from './ProductPicker'
import type { Product } from '../lib/product-lookup'
import { cardClass, buttonPrimaryClass, buttonSecondaryClass } from '../lib/ui-classes'

type Props = {
  onAdd: (productId: string, menge: number) => Promise<void>
}

export default function AddEntryFlow({ onAdd }: Props) {
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
    return <ProductPicker onPicked={setProduct} onCancel={reset} />
  }

  return (
    <form onSubmit={handleConfirmQuantity}>
      <div className={cardClass}>
        <p>{product.name}</p>
        <label>
          Menge (g)
          <input type="number" step="any" value={menge} onChange={(event) => setMenge(event.target.value)} />
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className={buttonPrimaryClass}>
        Hinzufügen
      </button>
      <button type="button" className={buttonSecondaryClass} onClick={reset}>
        Abbrechen
      </button>
    </form>
  )
}

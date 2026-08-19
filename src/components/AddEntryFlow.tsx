import { useCallback, useState, type FormEvent } from 'react'
import BarcodeScanner from './BarcodeScanner'
import ManualProductForm from './ManualProductForm'
import { findOrFetchProductByBarcode, type Product } from '../lib/product-lookup'
import { isValidBarcode } from '../lib/open-food-facts'

type Step = 'idle' | 'scanning' | 'looking-up' | 'confirm-quantity' | 'manual-entry'

type Props = {
  onAdd: (productId: string, menge: number) => Promise<void>
}

export default function AddEntryFlow({ onAdd }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [product, setProduct] = useState<Product | null>(null)
  const [scannedBarcode, setScannedBarcode] = useState<string | undefined>(undefined)
  const [menge, setMenge] = useState('100')
  const [error, setError] = useState<string | null>(null)

  const handleDetected = useCallback(async (barcode: string) => {
    // The scanner also decodes QR codes; only a real product barcode is worth a
    // lookup and worth storing on a product row.
    if (!isValidBarcode(barcode)) {
      setScannedBarcode(undefined)
      setError('Kein gültiger Produkt-Barcode erkannt. Bitte manuell eintragen.')
      setStep('manual-entry')
      return
    }

    setStep('looking-up')
    const found = await findOrFetchProductByBarcode(barcode).catch(() => null)
    if (found) {
      setProduct(found)
      setStep('confirm-quantity')
    } else {
      setScannedBarcode(barcode)
      setStep('manual-entry')
    }
  }, [])

  function reset() {
    setStep('idle')
    setProduct(null)
    setScannedBarcode(undefined)
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

  function handleManuallyCreated(created: Product) {
    setProduct(created)
    setError(null)
    setStep('confirm-quantity')
  }

  if (step === 'idle') {
    return (
      <div>
        <button type="button" onClick={() => setStep('scanning')}>
          Barcode scannen
        </button>
        <button type="button" onClick={() => setStep('manual-entry')}>
          Manuell hinzufügen
        </button>
      </div>
    )
  }

  if (step === 'scanning') {
    return <BarcodeScanner onDetected={handleDetected} onClose={reset} />
  }

  if (step === 'looking-up') {
    return <p>Produkt wird gesucht…</p>
  }

  if (step === 'manual-entry') {
    return (
      <>
        {error && <p role="alert">{error}</p>}
        <ManualProductForm barcode={scannedBarcode} onCreated={handleManuallyCreated} onCancel={reset} />
      </>
    )
  }

  if (step === 'confirm-quantity' && product) {
    return (
      <form onSubmit={handleConfirmQuantity}>
        <p>{product.name}</p>
        <label>
          Menge (g)
          <input type="number" value={menge} onChange={(event) => setMenge(event.target.value)} />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit">Hinzufügen</button>
        <button type="button" onClick={reset}>
          Abbrechen
        </button>
      </form>
    )
  }

  return null
}

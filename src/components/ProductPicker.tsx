import { useCallback, useState, type FormEvent } from 'react'
import BarcodeScanner from './BarcodeScanner'
import ManualProductForm from './ManualProductForm'
import { findOrFetchProductByBarcode, type Product } from '../lib/product-lookup'
import { isValidBarcode } from '../lib/open-food-facts'

type Step = 'idle' | 'scanning' | 'looking-up' | 'manual-entry'

type Props = {
  onPicked: (product: Product) => void
  onCancel: () => void
}

export default function ProductPicker({ onPicked, onCancel }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [scannedBarcode, setScannedBarcode] = useState<string | undefined>(undefined)
  const [typedBarcode, setTypedBarcode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleDetected = useCallback(
    async (barcode: string) => {
      // The scanner also decodes QR codes; only a real product barcode is worth
      // a lookup and worth storing on a product row.
      if (!isValidBarcode(barcode)) {
        setScannedBarcode(undefined)
        setError('Kein gültiger Produkt-Barcode erkannt. Bitte manuell eintragen.')
        setStep('manual-entry')
        return
      }

      setStep('looking-up')
      const found = await findOrFetchProductByBarcode(barcode).catch(() => null)
      if (found) {
        onPicked(found)
        return
      }
      setScannedBarcode(barcode)
      setStep('manual-entry')
    },
    [onPicked],
  )

  // Typed instead of scanned: laptop webcams and worn packaging often never
  // resolve a code, and the digits are printed right under it.
  function handleTypedBarcode(event: FormEvent) {
    event.preventDefault()
    const entered = typedBarcode.replace(/\s/g, '')
    if (!isValidBarcode(entered)) {
      setError('Bitte die Ziffern unter dem Strichcode eingeben (8–14 Ziffern).')
      return
    }
    setError(null)
    setTypedBarcode('')
    handleDetected(entered)
  }

  if (step === 'scanning') {
    return <BarcodeScanner onDetected={handleDetected} onClose={() => setStep('idle')} />
  }

  if (step === 'looking-up') {
    return <p>Produkt wird gesucht…</p>
  }

  if (step === 'manual-entry') {
    return (
      <>
        {error && <p role="alert">{error}</p>}
        <ManualProductForm
          barcode={scannedBarcode}
          onCreated={onPicked}
          onCancel={() => setStep('idle')}
        />
      </>
    )
  }

  return (
    <div>
      <button type="button" onClick={() => setStep('scanning')}>
        Barcode scannen
      </button>
      <button type="button" onClick={() => setStep('manual-entry')}>
        Manuell hinzufügen
      </button>
      <form onSubmit={handleTypedBarcode}>
        <label>
          Barcode-Nummer eingeben
          <input
            inputMode="numeric"
            value={typedBarcode}
            onChange={(event) => setTypedBarcode(event.target.value)}
            placeholder="z. B. 8076809580144"
          />
        </label>
        <button type="submit">Suchen</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={onCancel}>
        Abbrechen
      </button>
    </div>
  )
}

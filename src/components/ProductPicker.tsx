import { useCallback, useState, type FormEvent } from 'react'
import BarcodeScanner from './BarcodeScanner'
import ManualProductForm from './ManualProductForm'
import { findOrFetchProductByBarcode, type Product } from '../lib/product-lookup'
import { isValidBarcode } from '../lib/open-food-facts'
import { cardClass, fieldLabelClass, inputClass } from '../lib/ui-classes'
import { VitaIcon } from './icons/VitaIcon'
import Pressable from './Pressable'

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

  // Returning to idle from the scanner or the manual form must clear everything
  // that led here — a stale error or leftover barcode from the previous attempt
  // must not resurface on the next idle screen.
  function resetToIdle() {
    setStep('idle')
    setScannedBarcode(undefined)
    setTypedBarcode('')
    setError(null)
  }

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
    return <BarcodeScanner onDetected={handleDetected} onClose={resetToIdle} />
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
          onCancel={resetToIdle}
        />
      </>
    )
  }

  return (
    <div className={`${cardClass} flex flex-col`}>
      <Pressable variant="primary" type="button" onClick={() => setStep('scanning')}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="scan" tone="mono" size={20} />
          Barcode scannen
        </span>
      </Pressable>
      <Pressable variant="secondary" type="button" onClick={() => setStep('manual-entry')}>
        <span className="inline-flex items-center justify-center gap-2">
          <VitaIcon name="add" tone="mono" size={20} />
          Manuell hinzufügen
        </span>
      </Pressable>
      <form onSubmit={handleTypedBarcode} className="flex flex-col gap-3">
        <label className={fieldLabelClass}>
          Barcode-Nummer eingeben
          <input
            className={inputClass}
            inputMode="numeric"
            value={typedBarcode}
            onChange={(event) => setTypedBarcode(event.target.value)}
            placeholder="z. B. 8076809580144"
          />
        </label>
        <Pressable variant="secondary" className="self-start" type="submit">
          <span className="inline-flex items-center justify-center gap-2">
            <VitaIcon name="search" tone="mono" size={20} />
            Suchen
          </span>
        </Pressable>
      </form>
      {error && <p role="alert">{error}</p>}
      <Pressable variant="secondary" className="self-start" type="button" onClick={onCancel}>
        Abbrechen
      </Pressable>
    </div>
  )
}

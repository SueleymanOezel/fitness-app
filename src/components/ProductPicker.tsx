import { useCallback, useState, type FormEvent } from 'react'
import BarcodeScanner from './BarcodeScanner'
import ManualProductForm from './ManualProductForm'
import { findOrFetchProductByBarcode, type Product } from '../lib/product-lookup'
import { isValidBarcode } from '../lib/open-food-facts'
import { cardClass, fieldLabelClass, inputClass, interactiveClass, labelClass, listClass, listRowClass } from '../lib/ui-classes'
import { useSession } from '../hooks/use-session'
import { useProduktSuche, useZuletztGegessen } from '../hooks/use-product-search'
import { VitaIcon } from './icons/VitaIcon'
import Pressable from './Pressable'

type Step = 'idle' | 'scanning' | 'looking-up' | 'manual-entry'

type Props = {
  /** `letzteMenge`: the amount eaten last time, when the product came from the user's history. */
  onPicked: (product: Product, letzteMenge?: number) => void
  onCancel: () => void
}

export default function ProductPicker({ onPicked, onCancel }: Props) {
  const [step, setStep] = useState<Step>('idle')
  const [scannedBarcode, setScannedBarcode] = useState<string | undefined>(undefined)
  const [typedBarcode, setTypedBarcode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suche, setSuche] = useState('')
  const { session } = useSession()
  const userId = session?.user.id
  const zuletzt = useZuletztGegessen(userId)
  const { produkte: gefunden, laedt } = useProduktSuche(userId, suche)

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

  // Search first: most meals repeat, and a name is faster than a barcode. Own
  // recent products come first (with last amount), then other matches.
  const begriff = suche.trim().toLocaleLowerCase('de-DE')
  const treffer: { product: Product; letzteMenge?: number }[] =
    begriff === ''
      ? zuletzt.slice(0, 8)
      : [
          ...zuletzt.filter((eintrag) => eintrag.product.name.toLocaleLowerCase('de-DE').includes(begriff)),
          ...gefunden
            .filter((product) => !zuletzt.some((eintrag) => eintrag.product.id === product.id))
            .map((product) => ({ product })),
        ]

  return (
    <div className="flex flex-col gap-4">
      <div className={cardClass}>
        <label className={fieldLabelClass}>
          Produkt suchen
          <input
            className={inputClass}
            type="search"
            enterKeyHint="search"
            value={suche}
            onChange={(event) => setSuche(event.target.value)}
            placeholder="z. B. Haferflocken"
          />
        </label>
        {begriff === '' && treffer.length > 0 && <p className={labelClass}>Zuletzt gegessen</p>}
        {treffer.length > 0 && (
          <ul role="list" aria-label={begriff === '' ? 'Zuletzt gegessen' : 'Suchergebnisse'} className={listClass}>
            {treffer.map(({ product, letzteMenge }) => (
              <li key={product.id}>
                <Pressable
                  variant="bare"
                  type="button"
                  className={`${listRowClass} ${interactiveClass} w-full rounded-2xl px-2 text-left`}
                  onClick={() => onPicked(product, letzteMenge)}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{product.name}</span>
                    <span className="text-sm text-text-muted">
                      {letzteMenge == null
                        ? `${Math.round(product.kalorien)} kcal / 100 g`
                        : `zuletzt ${letzteMenge.toLocaleString('de-DE')} g · ${Math.round(product.kalorien)} kcal / 100 g`}
                    </span>
                  </span>
                </Pressable>
              </li>
            ))}
          </ul>
        )}
        {begriff !== '' && treffer.length === 0 && (
          <p className="text-text-muted">{laedt ? 'Suche läuft…' : 'Nichts gefunden. Scanne den Barcode oder lege das Produkt an.'}</p>
        )}
      </div>
      <div className={`${cardClass} flex flex-col`}>
      <Pressable variant="secondary" type="button" onClick={() => setStep('scanning')}>
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
            <VitaIcon name="scan" tone="mono" size={20} />
            Barcode prüfen
          </span>
        </Pressable>
      </form>
      {error && <p role="alert">{error}</p>}
      </div>
      <Pressable variant="secondary" className="self-start" type="button" onClick={onCancel}>
        Abbrechen
      </Pressable>
    </div>
  )
}

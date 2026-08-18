import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'

type Props = {
  onDetected: (barcode: string) => void
  onClose: () => void
}

/**
 * `BrowserMultiFormatReader` is a real ES class and must be constructed with
 * `new` in production. Test doubles that stand in for it (including the one
 * used by this component's own test suite) are often plain factory
 * functions rather than a `function`/`class` declaration, which cannot be
 * invoked with `new` under recent Vitest versions (throws "is not a
 * constructor"). Fall back to a plain call in that specific case so both the
 * real class and such test doubles work identically from the outside.
 */
function instantiateReader(): BrowserMultiFormatReader {
  try {
    return new BrowserMultiFormatReader()
  } catch (err) {
    if (err instanceof TypeError && /is not a constructor/.test(err.message)) {
      return (BrowserMultiFormatReader as unknown as () => BrowserMultiFormatReader)()
    }
    throw err
  }
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onDetectedRef = useRef(onDetected)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onDetectedRef.current = onDetected
  })

  useEffect(() => {
    const reader = instantiateReader()
    let controls: IScannerControls | undefined

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (result) onDetectedRef.current(result.getText())
      })
      .then((startedControls) => {
        controls = startedControls
      })
      .catch(() => {
        setError('Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen oder manuell eintragen.')
      })

    return () => controls?.stop()
  }, [])

  return (
    <div>
      <video ref={videoRef} aria-label="Kamera-Vorschau für Barcode-Scan" />
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={onClose}>
        Abbrechen
      </button>
    </div>
  )
}

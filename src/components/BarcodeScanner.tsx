import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import type { IScannerControls } from '@zxing/browser'

type Props = {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onDetectedRef = useRef(onDetected)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onDetectedRef.current = onDetected
  })

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
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

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

type ScannerControls = { stop: () => void }

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
    let controls: ScannerControls | undefined
    let cancelled = false
    let detected = false

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        // The decode callback keeps firing after a hit; only the first one counts.
        if (!result || detected) return
        detected = true
        onDetectedRef.current(result.getText())
      })
      .then((startedControls) => {
        // Unmounting before the camera finished starting would otherwise leave it running.
        if (cancelled) startedControls.stop()
        else controls = startedControls
      })
      .catch(() => {
        if (!cancelled) {
          setError('Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen oder manuell eintragen.')
        }
      })

    return () => {
      cancelled = true
      controls?.stop()
    }
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

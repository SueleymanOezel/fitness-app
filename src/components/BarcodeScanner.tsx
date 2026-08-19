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
  const session = useRef<Promise<unknown>>(Promise.resolve())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onDetectedRef.current = onDetected
  })

  useEffect(() => {
    let controls: ScannerControls | undefined
    let cancelled = false
    let detected = false

    // Chained onto the previous session, never started alongside it: this effect
    // remounts (twice on every mount under StrictMode), and zxing binds every
    // reader to the same <video>. If a start overlaps the previous stop, the old
    // session tears the element down under the new stream — camera on, no picture.
    const start = session.current.then(async () => {
      if (cancelled) return
      const reader = new BrowserMultiFormatReader()
      controls = await reader.decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        // The decode callback keeps firing after a hit; only the first one counts.
        if (!result || detected) return
        detected = true
        onDetectedRef.current(result.getText())
      })
      // Unmounted while the camera was starting: release it right away.
      if (cancelled) {
        controls.stop()
        controls = undefined
      }
    })

    session.current = start.catch(() => {
      if (!cancelled) {
        setError('Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen oder manuell eintragen.')
      }
    })

    return () => {
      cancelled = true
      // The next session waits for this stop instead of racing it.
      session.current = start.then(() => controls?.stop()).catch(() => {})
    }
  }, [])

  return (
    <div>
      {/* playsInline keeps iOS Safari from yanking the preview into its fullscreen player */}
      <video
        ref={videoRef}
        aria-label="Kamera-Vorschau für Barcode-Scan"
        autoPlay
        muted
        playsInline
        style={{ width: '100%', maxWidth: '480px' }}
      />
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={onClose}>
        Abbrechen
      </button>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { buttonSecondaryClass } from '../lib/ui-classes'

type ScannerControls = { stop: () => void }

/**
 * Only the product barcodes `isValidBarcode` accepts anyway — this keeps the
 * decoder from spending every frame ruling out QR and Micro QR.
 *
 * Deliberately no TRY_HARDER: it makes the 1D readers retry each frame rotated,
 * and that path throws "Could not create a Canvas element." in @zxing/browser
 * 0.2.1, killing every frame before it is decoded at all.
 */
const HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E],
  ],
])

/**
 * A default-resolution stream (often 640x480) leaves an EAN-13 with too few
 * pixels to pass its checksum — the decoder finds the pattern and then rejects
 * it. Ask for the rear camera and as much resolution as the device offers.
 */
const CAMERA: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
}

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
      const reader = new BrowserMultiFormatReader(HINTS as Map<DecodeHintType, unknown>)
      controls = await reader.decodeFromConstraints(CAMERA, videoRef.current ?? undefined, (result) => {
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
      <button type="button" className={buttonSecondaryClass} onClick={onClose}>
        Abbrechen
      </button>
    </div>
  )
}

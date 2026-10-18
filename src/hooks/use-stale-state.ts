import { useCallback, useRef, useState } from 'react'
import { cacheLesen, cacheSchreiben } from '../lib/stale-cache'

/**
 * State for a list/record that is loaded from the network but may start from the
 * last-known copy (src/lib/stale-cache.ts). With a copy the page is usable from
 * the first render (`loading` stays false); without one it behaves exactly as
 * before.
 *
 * - `gelungen(wert)`: a load succeeded — show it and remember it.
 * - `gescheitert(ersatz)`: a load failed. With a copy the old data stays (offline,
 *   flaky network); without one `ersatz` is shown. Returns whether a copy exists,
 *   so the caller can leave its error flag off: a stale page is not an error page.
 */
export function useStaleState<T>(userId: string, name: string, leer: T) {
  const [start] = useState(() => cacheLesen<T>(userId, name))
  const [daten, setDaten] = useState<T>(start ?? leer)
  const [loading, setLoading] = useState(start === undefined)
  const hatKopie = useRef(start !== undefined)

  const gelungen = useCallback(
    (wert: T) => {
      cacheSchreiben(userId, name, wert)
      hatKopie.current = true
      setDaten(wert)
      setLoading(false)
    },
    [userId, name],
  )

  const gescheitert = useCallback((ersatz: T) => {
    if (!hatKopie.current) setDaten(ersatz)
    setLoading(false)
    return hatKopie.current
  }, [])

  return { daten, setDaten, loading, gelungen, gescheitert }
}

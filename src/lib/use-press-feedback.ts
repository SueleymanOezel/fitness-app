import { useEffect, type RefObject } from 'react'
import { loadGsap } from './gsap-loader'
import { prefersReducedMotion } from './motion'
import { attachPressFeedback } from './press-feedback'

let preloadScheduled = false

/**
 * Warms the GSAP chunk once, after first paint, so the first tap does not wait
 * on the network. Skipped under reduced motion (the chunk would never be used).
 * Idle callback with a timeout fallback: Safari has no requestIdleCallback.
 */
function schedulePreload() {
  if (preloadScheduled || prefersReducedMotion()) return
  preloadScheduled = true
  const idle: (cb: () => void) => unknown =
    typeof window.requestIdleCallback === 'function'
      ? (cb) => window.requestIdleCallback(cb)
      : (cb) => setTimeout(cb, 200)
  idle(() => {
    loadGsap().catch(() => {})
  })
}

export function usePressFeedback(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    schedulePreload()
    return attachPressFeedback(el)
  }, [ref])
}

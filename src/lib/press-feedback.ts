import { loadGsap } from './gsap-loader'
import { prefersReducedMotion } from './motion'

type Gsap = Awaited<ReturnType<typeof loadGsap>>

const PRESSED_SCALE = 0.96

/**
 * Tap feedback for one interactive element: scales down on press, springs
 * back on release. Every event is chained onto one promise so a release that
 * fires before GSAP has finished loading still runs AFTER its press — the
 * element can never end up stuck at PRESSED_SCALE. Reduced motion is read at
 * event time (not at attach time) so toggling the OS setting takes effect
 * without a reload. A failed GSAP load is swallowed: tap feedback is an extra
 * layer, never a precondition for the button working.
 *
 * Disabled elements (`:disabled` or aria-disabled="true") get no feedback:
 * a press on them is ignored before GSAP is even requested. Release is guarded
 * differently on purpose: it is skipped only when no press tween was started,
 * never because the element is disabled NOW — a button that becomes disabled
 * mid-press must still spring back to scale 1 instead of staying shrunk.
 */
export function attachPressFeedback(el: HTMLElement): () => void {
  let gsapInstance: Gsap | null = null
  let chain: Promise<void> = Promise.resolve()
  let detached = false
  let pressed = false

  const isDisabled = () => el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true'

  function run(animate: (gsap: Gsap) => void) {
    if (prefersReducedMotion()) return
    chain = chain
      .then(() => loadGsap())
      .then((gsap) => {
        if (detached) return
        gsapInstance = gsap
        animate(gsap)
      })
      .catch(() => {})
  }

  const press = () => {
    if (isDisabled()) return
    pressed = true
    run((gsap) => gsap.to(el, { scale: PRESSED_SCALE, duration: 0.08, ease: 'power2.out', overwrite: 'auto' }))
  }
  const release = () => {
    if (!pressed) return
    pressed = false
    run((gsap) => gsap.to(el, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' }))
  }

  el.addEventListener('pointerdown', press)
  el.addEventListener('pointerup', release)
  el.addEventListener('pointerleave', release)
  el.addEventListener('pointercancel', release)

  return () => {
    detached = true
    el.removeEventListener('pointerdown', press)
    el.removeEventListener('pointerup', release)
    el.removeEventListener('pointerleave', release)
    el.removeEventListener('pointercancel', release)
    // Settle after any queued animation so a late tween cannot resurrect itself.
    chain = chain.then(() => {
      if (!gsapInstance) return
      gsapInstance.killTweensOf(el)
      gsapInstance.set(el, { clearProps: 'scale' })
    }).catch(() => {})
  }
}

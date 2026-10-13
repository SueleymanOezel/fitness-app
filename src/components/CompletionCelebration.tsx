import { useEffect, useRef, type ReactNode } from 'react'
import { loadGsap } from '../lib/gsap-loader'
import { prefersReducedMotion } from '../lib/motion'

/**
 * Feier-Sequenz des Abschluss-Screens. Das Markup steht immer mit den
 * Endwerten im DOM; die Animation ist nur eine Zusatzschicht darüber
 * (Reduced Motion oder ein fehlgeschlagener Import lassen es statisch).
 */
export default function CompletionCelebration({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root || prefersReducedMotion()) return
    let disposed = false
    let ctx: { revert: () => void } | undefined
    loadGsap()
      .then((gsap) => {
        if (disposed) return
        ctx = gsap.context(() => {
          const tl = gsap.timeline()
          root.querySelectorAll<HTMLElement>('[data-count-to]').forEach((el) => {
            const ziel = Number(el.dataset.countTo)
            const zaehler = { wert: 0 }
            tl.to(
              zaehler,
              {
                wert: ziel,
                duration: 0.8,
                ease: 'power2.out',
                onUpdate: () => { el.textContent = String(Math.round(zaehler.wert)) },
                onComplete: () => { el.textContent = String(ziel) },
              },
              0,
            )
          })
          // Ohne Rekorde gibt es keine Ziele: GSAP würde sonst "target not found" warnen.
          if (root.querySelector('[data-pr-card]')) {
            tl.from('[data-pr-card]', { opacity: 0, y: 12, stagger: 0.12, duration: 0.4 }, 0.5)
            tl.fromTo('[data-sweep]', { xPercent: -100, opacity: 1 }, { xPercent: 100, duration: 0.9, stagger: 0.12, ease: 'power1.inOut' }, 0.7)
          }
          tl.from('[data-reveal]', { opacity: 0, duration: 0.4 }, '>-0.3')
        }, root)
      })
      .catch(() => {})
    return () => {
      disposed = true
      ctx?.revert()
    }
  }, [])

  return <div ref={rootRef}>{children}</div>
}

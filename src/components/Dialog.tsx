import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { VitaIcon } from './icons/VitaIcon'
import { loadGsap } from '../lib/gsap-loader'
import { prefersReducedMotion } from '../lib/motion'
import Pressable from './Pressable'

type Gsap = Awaited<ReturnType<typeof loadGsap>>
type GsapContext = { add: (fn: () => void) => unknown; revert: () => void }

/**
 * Wraps the native <dialog> element instead of building a modal from a div
 * and a state machine: the platform already provides focus-trapping, Escape
 * to close and the ::backdrop pseudo-element. `open` is applied
 * imperatively via showModal()/close() because a plain `open` attribute on
 * <dialog> renders a non-modal dialog with no backdrop at all.
 *
 * The close button sits inside the dialog but is laid out below the card
 * content (see the design spec) — visually a separate circle under the
 * sheet, like the reference design, while staying inside the dialog's own
 * focus trap so Tab never escapes it.
 *
 * Open/close animate via a lazily-loaded GSAP (src/lib/gsap-loader.ts) and
 * collapse to the plain instant show/hide under prefers-reduced-motion
 * (src/lib/motion.ts) — see docs/superpowers/specs/2026-09-23-visuelles-
 * interaktions-redesign-design.md, "Motion-Architektur".
 */
export default function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<GsapContext | null>(null)
  const disposedRef = useRef(false)

  // One gsap context per instance, reverted only on unmount — never between
  // open and close, where a revert would reset the content back to opacity 0.
  // disposedRef drops a loadGsap() that resolves after unmount; it is reset in
  // the effect body so StrictMode's mount -> cleanup -> mount stays usable.
  useEffect(() => {
    disposedRef.current = false
    return () => {
      disposedRef.current = true
      ctxRef.current?.revert()
      ctxRef.current = null
    }
  }, [])

  const animate = useCallback((run: (gsap: Gsap) => void) => {
    return loadGsap().then((gsap) => {
      if (disposedRef.current) return
      ctxRef.current ??= gsap.context(() => {}) as GsapContext
      ctxRef.current.add(() => run(gsap))
    })
  }, [])

  const closeAnimated = useCallback(() => {
    const dialog = ref.current
    const content = contentRef.current
    if (!dialog || !dialog.open) return
    if (!content || content.childElementCount === 0 || prefersReducedMotion()) {
      dialog.close()
      return
    }
    animate((gsap) => {
      gsap.to(content, {
        opacity: 0,
        scale: 0.95,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => dialog.close(),
      })
    })
      // A failed chunk load must never leave the dialog undismissable.
      .catch(() => dialog.close())
  }, [animate])

  useEffect(() => {
    const dialog = ref.current
    const content = contentRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      if (content && !prefersReducedMotion()) {
        animate((gsap) => {
          gsap.fromTo(
            content,
            { opacity: 0, scale: 0.95 },
            { opacity: 1, scale: 1, duration: 0.2, ease: 'power2.out' },
          )
        })
          // Already visible via showModal(); a failed load only skips the animation.
          .catch(() => {})
      }
    }

    if (!open && dialog.open) closeAnimated()
  }, [open, animate, closeAnimated])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto rounded-3xl bg-transparent p-0 backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      <div ref={contentRef} className="flex flex-col gap-4">
        {children}
      </div>
      <Pressable
        type="button"
        onClick={closeAnimated}
        aria-label="Schließen"
        className="mx-auto mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised text-text"
      >
        <VitaIcon name="close" size={20} />
      </Pressable>
    </dialog>
  )
}

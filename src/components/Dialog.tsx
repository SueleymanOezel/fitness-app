import { useEffect, useRef, type ReactNode } from 'react'

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

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto rounded-3xl bg-transparent p-0 backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4">{children}</div>
      <button
        type="button"
        onClick={() => ref.current?.close()}
        aria-label="Schließen"
        className="mx-auto mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised text-text"
      >
        ✕
      </button>
    </dialog>
  )
}

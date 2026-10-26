import { useId } from 'react'
import { BEGRIFFE, type Begriff } from '../lib/glossary'
import Pressable from './Pressable'

/**
 * A "?" that explains one term. Native popover instead of a state-driven
 * tooltip: the platform toggles it, closes it on a tap outside or Escape, and
 * puts it in the top layer, so it also works inside a <dialog>. Only phrasing
 * elements (button, span), so it may sit inside a heading or a <dt>.
 */
/** `zu`: what the "?" sits on, when one page has the same term twice (two charts with "Volumen"). */
export default function HilfeKnopf({ begriff, zu }: { begriff: Begriff; zu?: string }) {
  const id = useId()
  const { titel, text } = BEGRIFFE[begriff]
  return (
    <>
      {/* 44 px target around a 22 px ring; the negative margin keeps the heading row its height. */}
      <Pressable
        type="button"
        popoverTarget={id}
        aria-label={zu ? `Was heißt ${titel}? (${zu})` : `Was heißt ${titel}?`}
        className="-my-2.5 inline-flex h-11 w-11 shrink-0 items-center justify-center align-middle text-text-muted"
      >
        <span
          aria-hidden="true"
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-current text-xs font-semibold"
        >
          ?
        </span>
      </Pressable>
      <span
        id={id}
        popover="auto"
        role="note"
        className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-surface-raised p-4 text-left font-sans text-base leading-normal font-normal tracking-normal normal-case text-text shadow-lg backdrop:bg-bg/60"
      >
        <span className="mb-1 block font-semibold">{titel}</span>
        <span className="block">{text}</span>
      </span>
    </>
  )
}

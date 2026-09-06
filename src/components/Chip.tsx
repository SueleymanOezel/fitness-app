import type { ButtonHTMLAttributes } from 'react'
import { interactiveClass } from '../lib/ui-classes'

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean
}

/**
 * A single toggle pill, e.g. one option in the Zeitraum-Umschalter or a
 * multi-select tag. `active` carries only the selected/unselected look —
 * the caller owns the click handler and the selection state itself.
 */
export default function Chip({ active, className = '', ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`rounded-full border-0 m-0 px-4 py-2 font-medium ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${
        active ? 'bg-accent text-on-bright' : 'bg-surface text-text-muted'
      } ${className}`}
      {...props}
    />
  )
}

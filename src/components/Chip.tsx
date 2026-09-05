import type { ButtonHTMLAttributes } from 'react'

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
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
      className={`rounded-full px-4 py-2 font-medium ${
        active ? 'bg-accent text-text' : 'bg-surface text-text-muted'
      } ${className}`}
      {...props}
    />
  )
}

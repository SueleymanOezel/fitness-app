import { useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { interactiveClass } from '../lib/ui-classes'
import { usePressFeedback } from '../lib/use-press-feedback'
import { VitaIcon, type VitaIconName } from './icons/VitaIcon'

const tabs: { to: string; label: string; icon: VitaIconName; end: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/training', label: 'Training', icon: 'training', end: false },
  { to: '/nutrition', label: 'Ernährung', icon: 'nutrition', end: false },
  { to: '/body', label: 'Körper', icon: 'body', end: false },
]

function NavTab({ to, label, icon, end }: (typeof tabs)[number]) {
  const ref = useRef<HTMLAnchorElement>(null)
  usePressFeedback(ref)
  return (
    <NavLink
      ref={ref}
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        `flex h-11 w-11 items-center justify-center rounded-full ${interactiveClass} focus-visible:ring-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised ${
          isActive ? 'text-accent-text' : 'text-text-muted'
        }`
      }
    >
      {({ isActive }) => <VitaIcon name={icon} tone={isActive ? 'brand' : 'mono'} />}
    </NavLink>
  )
}

/**
 * Floating pill, not a full-width bar with a top border: matches the
 * reference design's nav (docs/superpowers/specs/2026-09-05-phase6-referenzdesign-analyse.md,
 * section "Bottom Navigation"). No fifth/raised centre button — the app has
 * four areas, not a single cross-area "log" action (see design spec).
 */
export default function BottomNav() {
  return (
    // Lifted above the home indicator instead of padded inside: a safe-area padding
    // made the pill taller at the bottom and the icons sat off-centre on iPhones.
    // Capped and centred so a desktop window does not stretch four icons across 700px.
    <nav className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] mx-auto flex w-[calc(100%-2rem)] max-w-sm justify-around rounded-full bg-surface-raised p-2">
      {tabs.map((tab) => (
        <NavTab key={tab.to} {...tab} />
      ))}
    </nav>
  )
}

import { NavLink } from 'react-router-dom'
import { interactiveClass } from '../lib/ui-classes'
import { VitaIcon, type VitaIconName } from './icons/VitaIcon'

const tabs: { to: string; label: string; icon: VitaIconName; end: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/training', label: 'Training', icon: 'training', end: false },
  { to: '/nutrition', label: 'Ernährung', icon: 'nutrition', end: false },
  { to: '/body', label: 'Körper', icon: 'body', end: false },
]

/**
 * Floating pill, not a full-width bar with a top border: matches the
 * reference design's nav (docs/superpowers/specs/2026-09-05-phase6-referenzdesign-analyse.md,
 * section "Bottom Navigation"). No fifth/raised centre button — the app has
 * four areas, not a single cross-area "log" action (see design spec).
 */
export default function BottomNav() {
  return (
    <nav
      className="sticky bottom-4 mx-4 flex justify-around rounded-full bg-surface-raised p-2"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {tabs.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
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
      ))}
    </nav>
  )
}

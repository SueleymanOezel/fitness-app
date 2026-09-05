import { Activity, Dumbbell, House, UtensilsCrossed } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', Icon: House, end: true },
  { to: '/training', label: 'Training', Icon: Dumbbell, end: false },
  { to: '/nutrition', label: 'Ernährung', Icon: UtensilsCrossed, end: false },
  { to: '/body', label: 'Körper', Icon: Activity, end: false },
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
      role="list"
      className="sticky bottom-4 mx-4 flex justify-around rounded-full bg-surface-raised p-2"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          aria-label={label}
          className={({ isActive }) =>
            `flex h-11 w-11 items-center justify-center rounded-full ${
              isActive ? 'text-accent' : 'text-text-muted'
            }`
          }
        >
          <Icon aria-hidden="true" />
        </NavLink>
      ))}
    </nav>
  )
}

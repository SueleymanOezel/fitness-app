import type { CSSProperties, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import { ToastProvider } from './ToastProvider'
import { VitaIcon } from './icons/VitaIcon'
import { PressableLink } from './Pressable'
import { interactiveClass } from '../lib/ui-classes'
import { useOnline } from '../hooks/use-online'

const iconLinkClass = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-full ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`

export default function AppLayout({ children }: { children: ReactNode }) {
  const online = useOnline()
  // The live workout is a focused mode: no tab bar to mistap between sets, the
  // pause timer owns the bottom edge, and the way out is the arrow at the top.
  const fokus = useLocation().pathname.startsWith('/training/session/')
  return (
    <ToastProvider>
      <div
        style={
          fokus ? ({ '--nav-clearance': 'calc(1rem + env(safe-area-inset-bottom))' } as CSSProperties) : undefined
        }
      >
        <header>
          {fokus ? (
            <PressableLink to="/training" aria-label="Zurück zum Training" className={`mr-auto ${iconLinkClass}`}>
              <VitaIcon name="back" tone="brand" />
            </PressableLink>
          ) : (
            // Profile is a setting, not a fifth area — it stays out of the bottom nav.
            <PressableLink to="/profile" aria-label="Profil" className={iconLinkClass}>
              <VitaIcon name="profile" />
            </PressableLink>
          )}
        </header>
        {!online && (
          <p role="status" className="mx-4 rounded-2xl bg-surface-raised px-4 py-2 text-sm">
            Du bist offline. Du siehst den letzten Stand, Änderungen lassen sich gerade nicht speichern.
          </p>
        )}
        <main>{children}</main>
        {!fokus && <BottomNav />}
      </div>
    </ToastProvider>
  )
}

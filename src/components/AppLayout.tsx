import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import { ToastProvider } from './ToastProvider'
import { VitaIcon } from './icons/VitaIcon'
import { PressableLink } from './Pressable'
import { interactiveClass } from '../lib/ui-classes'
import { useOnline } from '../hooks/use-online'
import { parentRoute } from '../lib/parent-route'

const iconLinkClass = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-full ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`

export default function AppLayout({ children }: { children: ReactNode }) {
  const online = useOnline()
  // The live workout is a focused mode: no tab bar to mistap between sets, the
  // pause timer owns the bottom edge, and the way out is the arrow at the top.
  const pathname = useLocation().pathname
  const fokus = pathname.startsWith('/training/session/')
  // Every sub page has its way back at the top, where the thumb expects it.
  const zurueck = parentRoute(pathname)
  // After a page change focus lands on the new content, not on the tapped nav link, so a screen
  // reader starts reading the page. main is the target because a page swaps its h1 once loaded.
  const mainRef = useRef<HTMLElement>(null)
  const ersterPfad = useRef<string | null>(pathname)
  useEffect(() => {
    if (pathname === ersterPfad.current) return
    ersterPfad.current = null
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])
  return (
    <ToastProvider>
      <div
        style={
          fokus ? ({ '--nav-clearance': 'calc(1rem + env(safe-area-inset-bottom))' } as CSSProperties) : undefined
        }
      >
        <header>
          {zurueck ? (
            <PressableLink to={zurueck.to} aria-label={zurueck.label} className={`mr-auto ${iconLinkClass}`}>
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
        <main ref={mainRef} tabIndex={-1} className="focus:outline-none">{children}</main>
        {!fokus && <BottomNav />}
      </div>
    </ToastProvider>
  )
}

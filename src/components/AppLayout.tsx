import type { ReactNode } from 'react'
import BottomNav from './BottomNav'
import { ToastProvider } from './ToastProvider'
import { VitaIcon } from './icons/VitaIcon'
import { PressableLink } from './Pressable'
import { interactiveClass } from '../lib/ui-classes'
import { useOnline } from '../hooks/use-online'

export default function AppLayout({ children }: { children: ReactNode }) {
  const online = useOnline()
  return (
    <ToastProvider>
      <div>
        <header>
          {/* Profile is a setting, not a fifth area — it stays out of the bottom nav. */}
          <PressableLink
            to="/profile"
            aria-label="Profil"
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full ${interactiveClass} focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
          >
            <VitaIcon name="profile" />
          </PressableLink>
        </header>
        {!online && (
          <p role="status" className="mx-4 rounded-2xl bg-surface-raised px-4 py-2 text-sm">
            Du bist offline. Du siehst den letzten Stand, Änderungen lassen sich gerade nicht speichern.
          </p>
        )}
        <main>{children}</main>
        <BottomNav />
      </div>
    </ToastProvider>
  )
}

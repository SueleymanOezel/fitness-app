import type { ReactNode } from 'react'
import BottomNav from './BottomNav'
import { ToastProvider } from './ToastProvider'
import { VitaIcon } from './icons/VitaIcon'
import { PressableLink } from './Pressable'
import { interactiveClass } from '../lib/ui-classes'

export default function AppLayout({ children }: { children: ReactNode }) {
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
        <main>{children}</main>
        <BottomNav />
      </div>
    </ToastProvider>
  )
}

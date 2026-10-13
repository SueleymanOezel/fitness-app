import type { ReactNode } from 'react'
import BottomNav from './BottomNav'
import { ToastProvider } from './ToastProvider'
import { VitaIcon } from './icons/VitaIcon'
import { PressableLink } from './Pressable'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div>
        <header>
          {/* Profile is a setting, not a fifth area — it stays out of the bottom nav. */}
          <PressableLink to="/profile" aria-label="Profil">
            <VitaIcon name="profile" />
          </PressableLink>
        </header>
        <main>{children}</main>
        <BottomNav />
      </div>
    </ToastProvider>
  )
}

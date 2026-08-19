import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header>
        {/* Profile is a setting, not a fifth area — it stays out of the bottom nav. */}
        <Link to="/profile" aria-label="Profil">
          👤
        </Link>
      </header>
      <main>{children}</main>
      <BottomNav />
    </div>
  )
}

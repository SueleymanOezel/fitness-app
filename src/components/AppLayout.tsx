import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from './BottomNav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header>
        <button
          type="button"
          onClick={() => {
            supabase.auth.signOut().catch(() => {
              /* signOut failed network-side; ProtectedRoute will re-check session on next render regardless */
            })
          }}
        >
          Logout
        </button>
      </header>
      <main>{children}</main>
      <BottomNav />
    </div>
  )
}

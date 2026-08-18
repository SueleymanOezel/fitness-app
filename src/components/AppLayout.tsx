import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import BottomNav from './BottomNav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <header>
        <button type="button" onClick={() => supabase.auth.signOut()}>
          Logout
        </button>
      </header>
      <main>{children}</main>
      <BottomNav />
    </div>
  )
}

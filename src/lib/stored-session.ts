import type { Session } from '@supabase/supabase-js'

const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL

/**
 * supabase-js' own default key, spelled out so useSession can read the same entry.
 * Empty without a URL: supabase.ts then throws its own, readable config error.
 */
export const AUTH_STORAGE_KEY = supabaseUrl ? `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token` : ''

/**
 * The session auth-js still keeps in storage. It removes the entry itself when a
 * refresh fails for good, so an entry that survived a failed refresh is a session
 * waiting for the network, not a signed-out user.
 */
export function gespeicherteSession(): Session | null {
  try {
    const roh = localStorage.getItem(AUTH_STORAGE_KEY)
    const session = roh ? (JSON.parse(roh) as Session) : null
    return session?.refresh_token && session.user ? session : null
  } catch {
    return null
  }
}

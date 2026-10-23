import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { cacheLeeren } from '../lib/stale-cache'
import { gespeicherteSession } from '../lib/stored-session'

/**
 * The last session this tab learned about. Every page calls useSession() on its
 * own, so without this each tab switch started from "loading, no user" and
 * showed a loading screen before the page's own data even began to load.
 * `undefined` = not known yet (first start); the effect below still confirms or
 * corrects the value, this only removes the blank first render.
 */
let bekannteSession: Session | null | undefined

/** For tests: forget what an earlier test learned. */
export function vergissSession() {
  bekannteSession = undefined
}

export function useSession() {
  // First start: trust storage right away. Offline, getSession() waits up to 30 s on refresh
  // retries; it and SIGNED_OUT below still correct this if the session turns out dead.
  const [start] = useState(() => bekannteSession ?? gespeicherteSession() ?? undefined)
  const [session, setSession] = useState<Session | null>(start ?? null)
  const [loading, setLoading] = useState(start === undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      // null with a stored session = the refresh failed on the network, not a sign-out.
      const aktuell = data.session ?? gespeicherteSession()
      bekannteSession = aktuell
      setSession(aktuell)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      // INITIAL_SESSION is null for the same network hiccup; getSession above decides that case.
      if (event === 'INITIAL_SESSION' && newSession === null) return
      bekannteSession = newSession
      // Signed out (or the session expired for good): the last-known copies of this user's data go with it.
      if (newSession === null) cacheLeeren()
      setSession(newSession)
      setLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  return { session, loading }
}

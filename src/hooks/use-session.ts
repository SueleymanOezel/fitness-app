import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

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
  const [session, setSession] = useState<Session | null>(bekannteSession ?? null)
  const [loading, setLoading] = useState(bekannteSession === undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      bekannteSession = data.session
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      bekannteSession = newSession
      setSession(newSession)
      setLoading(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  return { session, loading }
}

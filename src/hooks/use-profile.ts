import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Profile = {
  id: string
  name: string | null
  alter: number | null
  groesse: number | null
  aktuelles_gewicht: number | null
  geschlecht: 'maennlich' | 'weiblich' | null
  aktivitaetslevel: 'sitzend' | 'leicht' | 'moderat' | 'hoch' | 'sehr_hoch' | null
  ziel: 'abnehmen' | 'halten' | 'zunehmen' | null
  ziel_delta_kcal: number
  taegliches_kalorienziel: number | null
  mahlzeit_1_name: string
  mahlzeit_2_name: string
  mahlzeit_3_name: string
  mahlzeit_4_name: string
  mahlzeit_5_name: string | null
  mahlzeit_6_name: string | null
}

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)
  const pending = useRef<Promise<unknown>>(Promise.resolve())

  const reload = useCallback(async () => {
    const current = ++requestId.current
    // maybeSingle: a missing profile row is an empty result to report, not an exception.
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (current !== requestId.current) return
    setProfile(data as Profile | null)
    setError(Boolean(loadError) || data == null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  /**
   * Serialized: a field's blur-commit and a button click land back to back (the
   * browser fires focusout before click), and two concurrent PATCHes have no
   * ordering guarantee — the losing one would silently become the stored value.
   * Rejects on a failed write so callers can show it instead of assuming success.
   */
  async function updateProfile(patch: Partial<Profile>) {
    const run = pending.current.then(async () => {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select('*')
        .maybeSingle()
      if (updateError || !data) throw new Error('profile update failed')
      setProfile(data as Profile)
    })
    pending.current = run.catch(() => {})
    return run
  }

  return { profile, loading, error, reload, updateProfile }
}

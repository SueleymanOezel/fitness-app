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
}

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

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

  async function updateProfile(patch: Partial<Profile>) {
    const { data } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select('*')
      .maybeSingle()
    if (data) setProfile(data as Profile)
  }

  return { profile, loading, error, reload, updateProfile }
}

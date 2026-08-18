import { useCallback, useEffect, useState } from 'react'
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

  const reload = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data as Profile | null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    // reload() only sets state after its internal `await`, never synchronously
    // during this effect's call stack; the compiler's static check cannot see
    // the await boundary through the named function call, so it conservatively
    // flags it.
    reload() // eslint-disable-line react-hooks/set-state-in-effect
  }, [reload])

  async function updateProfile(patch: Partial<Profile>) {
    const { data } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
      .select('*')
      .single()
    if (data) setProfile(data as Profile)
  }

  return { profile, loading, updateProfile }
}

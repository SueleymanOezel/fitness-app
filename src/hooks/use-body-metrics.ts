import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MEASUREMENT_FIELDS, type BodyMetricRow, type BodyMetricValues } from '../lib/body-metrics'

const COLUMNS = `id, datum, ${MEASUREMENT_FIELDS.join(', ')}`

/** The entry itself was stored; only the profile mirror is stale. */
export class ProfileWeightSyncError extends Error {
  constructor() {
    super('profile weight sync failed')
    this.name = 'ProfileWeightSyncError'
  }
}

export function useBodyMetrics(userId: string) {
  const [rows, setRows] = useState<BodyMetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const { data, error: loadError } = await supabase
      .from('body_metrics')
      .select(COLUMNS)
      .eq('user_id', userId)
      .order('datum', { ascending: false })
    if (current !== requestId.current) return
    setRows((data ?? []) as unknown as BodyMetricRow[])
    setError(Boolean(loadError))
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
   * profiles.aktuelles_gewicht feeds the calorie goal and the workout calorie
   * formula. It carries the weight of the entry with the NEWEST date, never the
   * one that was just typed: correcting a three-week-old entry must not reset
   * the current weight, and deleting the newest entry has to fall back to the
   * one before it.
   */
  async function syncProfileWeight() {
    const { data } = await supabase
      .from('body_metrics')
      .select('gewicht')
      .eq('user_id', userId)
      .not('gewicht', 'is', null)
      .order('datum', { ascending: false })
      .limit(1)
      .maybeSingle()

    const gewicht = (data as { gewicht: number } | null)?.gewicht ?? null
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ aktuelles_gewicht: gewicht })
      .eq('id', userId)
    if (profileError) throw new ProfileWeightSyncError()
  }

  // supabase-js resolves rather than throws on a rejected write, so an unchecked
  // error would let the UI report success while nothing was stored.
  async function saveEntry(datum: string, values: BodyMetricValues) {
    const { error: saveError } = await supabase
      .from('body_metrics')
      .upsert({ user_id: userId, datum, ...values }, { onConflict: 'user_id,datum' })
    if (saveError) throw new Error('body metric save failed')
    // The entry is stored at this point: reload before the profile mirror runs
    // so a later ProfileWeightSyncError doesn't leave the list stale too.
    await reload()
    await syncProfileWeight()
  }

  async function deleteEntry(id: string) {
    const { error: deleteError } = await supabase.from('body_metrics').delete().eq('id', id)
    if (deleteError) throw new Error('body metric delete failed')
    // Same reasoning as saveEntry: the delete already happened.
    await reload()
    await syncProfileWeight()
  }

  return { rows, loading, error, saveEntry, deleteEntry, reload }
}

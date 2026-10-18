import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStaleState } from './use-stale-state'
import { MEASUREMENT_FIELDS, type BodyMetricRow, type BodyMetricValues } from '../lib/body-metrics'

const COLUMNS = `id, datum, ${MEASUREMENT_FIELDS.join(', ')}`

/** The entry itself was stored; only the profile mirror is stale. */
export class ProfileWeightSyncError extends Error {
  constructor() {
    super('profile weight sync failed')
    this.name = 'ProfileWeightSyncError'
  }
}

/** Editing an entry onto a date that already has another entry. */
export class DatumBelegtError extends Error {
  constructor() {
    super('date already has an entry')
    this.name = 'DatumBelegtError'
  }
}

export function useBodyMetrics(userId: string) {
  const { daten: rows, loading, gelungen, gescheitert } = useStaleState<BodyMetricRow[]>(userId, 'body-metrics', [])
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
    // With a last-known copy (offline) the old rows stay and are not an error.
    const fehlerAnzeigen = loadError
      ? !gescheitert([])
      : (gelungen((data ?? []) as unknown as BodyMetricRow[]), false)
    setError(fehlerAnzeigen)
  }, [userId, gelungen, gescheitert])

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
    // A failed read resolves with data: null, which is indistinguishable from
    // "no entry carries a weight". Writing that null into the profile would
    // wipe the weight on any transient failure, and the calorie goal and the
    // workout calorie formula would go dead without a single error anywhere.
    // Only one case clears the profile: every weight entry actually deleted.
    const { data, error: readError } = await supabase
      .from('body_metrics')
      .select('gewicht')
      .eq('user_id', userId)
      .not('gewicht', 'is', null)
      .order('datum', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (readError) throw new ProfileWeightSyncError()

    const gewicht = (data as { gewicht: number } | null)?.gewicht ?? null
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ aktuelles_gewicht: gewicht })
      .eq('id', userId)
    if (profileError) throw new ProfileWeightSyncError()
  }

  // supabase-js resolves rather than throws on a rejected write, so an unchecked
  // error would let the UI report success while nothing was stored.
  //
  // With an id the row itself is updated: an upsert on the (possibly changed)
  // date would insert a second row and leave the edited one behind. A date that
  // belongs to another row is refused rather than merged, a merge would
  // silently overwrite that row's values.
  async function saveEntry(datum: string, values: BodyMetricValues, id?: string) {
    if (id !== undefined) {
      if (rows.some((row) => row.id !== id && row.datum === datum)) throw new DatumBelegtError()
      const { error: updateError } = await supabase
        .from('body_metrics')
        .update({ datum, ...values })
        .eq('id', id)
      // 23505 = unique_violation: another tab/device took the date meanwhile.
      if (updateError?.code === '23505') throw new DatumBelegtError()
      if (updateError) throw new Error('body metric save failed')
    } else {
      const { error: saveError } = await supabase
        .from('body_metrics')
        .upsert({ user_id: userId, datum, ...values }, { onConflict: 'user_id,datum' })
      if (saveError) throw new Error('body metric save failed')
    }
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

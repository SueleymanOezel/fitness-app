import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { BodyMetricValues } from '../lib/body-metrics'
import { ProfileWeightSyncError } from './use-body-metrics'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const values: BodyMetricValues = {
  gewicht: 82.5,
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

const rows = [
  { id: 'c', datum: '2026-08-24', gewicht: 82.5 },
  { id: 'a', datum: '2026-08-17', gewicht: 83.3 },
]

beforeEach(() => {
  vi.clearAllMocks()
})

/** Routes each table to its own builder so the writes can be told apart. */
function mockTables(builders: Record<string, ReturnType<typeof createQueryBuilder>>) {
  mockFrom.mockImplementation((table: string) => builders[table] ?? createQueryBuilder({ data: [] }))
}

describe('useBodyMetrics', () => {
  it('loads the history newest first', async () => {
    const metrics = createQueryBuilder({ data: rows })
    mockTables({ body_metrics: metrics })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rows).toEqual(rows)
    expect(metrics.order).toHaveBeenCalledWith('datum', { ascending: false })
  })

  it('upserts on the day rather than inserting a second row', async () => {
    // body_metrics has unique (user_id, datum): weighing twice a day must
    // correct the day instead of failing on the constraint.
    const metrics = createQueryBuilder({ data: rows })
    mockTables({ body_metrics: metrics })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.saveEntry('2026-08-24', values)

    expect(metrics.upsert).toHaveBeenCalledWith(
      { user_id: 'u1', datum: '2026-08-24', ...values },
      { onConflict: 'user_id,datum' },
    )
  })

  it('writes the weight of the newest entry into the profile, not the one just typed', async () => {
    // The decisive case: correcting an old entry must leave the profile alone,
    // or the calorie goal silently starts using a stale weight.
    const metrics = createQueryBuilder({ data: rows })
    // The list query and the "newest weight" query hit the same builder, so the
    // single-row lookup gets its own answer: the newest entry, not the list.
    metrics.maybeSingle = vi.fn(() => Promise.resolve({ data: { gewicht: 82.5 } }))
    const profiles = createQueryBuilder({ data: null })
    mockTables({ body_metrics: metrics, profiles })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.saveEntry('2026-08-17', { ...values, gewicht: 83.3 })

    // Not 83.3: the entry just written is older than the newest one.
    expect(profiles.update).toHaveBeenCalledWith({ aktuelles_gewicht: 82.5 })
  })

  it('clears the profile weight when no entry carries one any more', async () => {
    const metrics = createQueryBuilder({ data: [] })
    // No row carries a weight any more.
    metrics.maybeSingle = vi.fn(() => Promise.resolve({ data: null }))
    const profiles = createQueryBuilder({ data: null })
    mockTables({ body_metrics: metrics, profiles })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.deleteEntry('c')

    expect(profiles.update).toHaveBeenCalledWith({ aktuelles_gewicht: null })
  })

  it('does not touch the profile when the newest-weight read fails', async () => {
    // A failed read resolves with data: null, which looks exactly like "no entry
    // carries a weight". Writing it through would clear aktuelles_gewicht on a
    // transient 5xx, an expired token or an RLS rejection.
    const metrics = createQueryBuilder({ data: rows })
    metrics.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: { message: 'boom' } }))
    const profiles = createQueryBuilder({ data: null })
    mockTables({ body_metrics: metrics, profiles })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.saveEntry('2026-08-24', values)).rejects.toBeInstanceOf(
      ProfileWeightSyncError,
    )
    expect(profiles.update).not.toHaveBeenCalled()
  })

  it('rejects instead of reporting success when the write fails', async () => {
    const metrics = createQueryBuilder({ data: null, error: { message: 'boom' } })
    mockTables({ body_metrics: metrics })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.saveEntry('2026-08-24', values)).rejects.toThrow()
  })

  it('rejects instead of reporting success when the delete fails', async () => {
    const metrics = createQueryBuilder({ data: null, error: { message: 'boom' } })
    mockTables({ body_metrics: metrics })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.deleteEntry('c')).rejects.toThrow()
  })

  it('rejects with ProfileWeightSyncError when the entry saved but the profile mirror failed, and reloads anyway', async () => {
    // The body_metrics write succeeds; only the profiles update fails. The
    // caller must be able to tell this apart from "nothing was saved."
    const metrics = createQueryBuilder({ data: rows })
    const profiles = createQueryBuilder({ data: null, error: { message: 'boom' } })
    mockTables({ body_metrics: metrics, profiles })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.saveEntry('2026-08-24', values)).rejects.toBeInstanceOf(
      ProfileWeightSyncError,
    )
    // reload()'s list-shaped select carries the full column list (it contains
    // "bauchumfang"), unlike syncProfileWeight's single-column 'gewicht'
    // select — so counting these tells apart "reloaded once on mount only"
    // from "reloaded again after the write, before the profile sync failed."
    const listSelects = (metrics.select as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([columns]: unknown[]) => typeof columns === 'string' && columns.includes('bauchumfang'),
    ).length
    expect(listSelects).toBe(2)
  })

  it('rejects with ProfileWeightSyncError when the delete succeeded but the profile mirror failed, and reloads anyway', async () => {
    const metrics = createQueryBuilder({ data: rows })
    const profiles = createQueryBuilder({ data: null, error: { message: 'boom' } })
    mockTables({ body_metrics: metrics, profiles })

    const { useBodyMetrics } = await import('./use-body-metrics')
    const { result } = renderHook(() => useBodyMetrics('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.deleteEntry('c')).rejects.toBeInstanceOf(ProfileWeightSyncError)
    // Same reasoning as the saveEntry case above: two list-shaped selects means
    // reload() ran again after the delete, even though the profile sync then failed.
    const listSelects = (metrics.select as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([columns]: unknown[]) => typeof columns === 'string' && columns.includes('bauchumfang'),
    ).length
    expect(listSelects).toBe(2)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const profile = {
  id: 'u1',
  name: 'Test',
  alter: 30,
  groesse: 180,
  aktuelles_gewicht: 80,
  geschlecht: 'maennlich',
  aktivitaetslevel: 'moderat',
  ziel: 'halten',
  ziel_delta_kcal: 500,
  taegliches_kalorienziel: null,
  mahlzeit_1_name: 'Frühstück',
  mahlzeit_2_name: 'Mittagessen',
  mahlzeit_3_name: 'Abendessen',
  mahlzeit_4_name: 'Snacks',
  mahlzeit_5_name: null,
  mahlzeit_6_name: null,
}

describe('useProfile', () => {
  it('loads the profile for the given user id', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: profile }))

    const { useProfile } = await import('./use-profile')
    const { result } = renderHook(() => useProfile('u1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toEqual(profile)
  })

  it('updates the profile and stores the returned row', async () => {
    const updated = { ...profile, taegliches_kalorienziel: 1800 }
    const loadBuilder = createQueryBuilder({ data: profile })
    const updateBuilder = createQueryBuilder({ data: updated })
    mockFrom.mockReturnValueOnce(loadBuilder).mockReturnValueOnce(updateBuilder)

    const { useProfile } = await import('./use-profile')
    const { result } = renderHook(() => useProfile('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.updateProfile({ taegliches_kalorienziel: 1800 })

    expect(updateBuilder.update).toHaveBeenCalledWith({ taegliches_kalorienziel: 1800 })
    await waitFor(() => expect(result.current.profile).toEqual(updated))
  })

  it('serializes concurrent updates so the last one issued wins', async () => {
    // Blurring the goal input and clicking "Berechnen lassen" fires focusout
    // before click: without serialization the abandoned 2500 can overwrite the
    // null that was issued after it.
    const order: unknown[] = []
    // Records the patch it was called with and answers after `delay` ms, so the
    // first update is still in flight when the second one is issued.
    function recordingBuilder(data: unknown, delay: number) {
      const builder: Record<string, unknown> = {
        update: vi.fn((patch: unknown) => {
          order.push(patch)
          return builder
        }),
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        maybeSingle: vi.fn(
          () => new Promise((resolve) => setTimeout(() => resolve({ data }), delay)),
        ),
      }
      return builder
    }

    mockFrom
      .mockReturnValueOnce(createQueryBuilder({ data: profile }))
      .mockReturnValueOnce(recordingBuilder({ ...profile, taegliches_kalorienziel: 2500 }, 20))
      .mockReturnValueOnce(recordingBuilder(profile, 0))

    const { useProfile } = await import('./use-profile')
    const { result } = renderHook(() => useProfile('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await Promise.all([
      result.current.updateProfile({ taegliches_kalorienziel: 2500 }),
      result.current.updateProfile({ taegliches_kalorienziel: null }),
    ])

    expect(order).toEqual([{ taegliches_kalorienziel: 2500 }, { taegliches_kalorienziel: null }])
    // waitFor, not a bare assertion: both setProfile calls land outside act(), so
    // the intermediate 2500 render can still be the current one at this point.
    await waitFor(() => expect(result.current.profile).toEqual(profile))
  })

  it('rejects instead of reporting success when the update fails', async () => {
    const loadBuilder = createQueryBuilder({ data: profile })
    const failingUpdate = createQueryBuilder({ data: null, error: { message: 'rejected' } })
    mockFrom.mockReturnValueOnce(loadBuilder).mockReturnValueOnce(failingUpdate)

    const { useProfile } = await import('./use-profile')
    const { result } = renderHook(() => useProfile('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.updateProfile({ taegliches_kalorienziel: 1800 })).rejects.toThrow()
    expect(result.current.profile).toEqual(profile)
  })

  it('reports an error instead of loading forever when the profile row is missing', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null }))

    const { useProfile } = await import('./use-profile')
    const { result } = renderHook(() => useProfile('u1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.profile).toBeNull()
  })
})

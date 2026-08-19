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

  it('reports an error instead of loading forever when the profile row is missing', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null }))

    const { useProfile } = await import('./use-profile')
    const { result } = renderHook(() => useProfile('u1'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.profile).toBeNull()
  })
})

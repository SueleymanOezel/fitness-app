import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: unknown) => mockOnAuthStateChange(callback),
    },
  },
}))

describe('useSession', () => {
  beforeEach(async () => {
    const { vergissSession } = await import('./use-session')
    vergissSession()
  })

  it('starts loading, then resolves the session from getSession', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })

    const { useSession } = await import('./use-session')
    const { result } = renderHook(() => useSession())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toEqual({ user: { id: 'u1' } })
  })

  it('resolves a null session when no user is logged in', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })

    const { useSession } = await import('./use-session')
    const { result } = renderHook(() => useSession())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
  })

  it('starts with the session an earlier mount already learned, so a tab switch shows no loading screen', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })

    const { useSession } = await import('./use-session')
    const erster = renderHook(() => useSession())
    await waitFor(() => expect(erster.result.current.loading).toBe(false))

    const zweiter = renderHook(() => useSession())
    expect(zweiter.result.current.loading).toBe(false)
    expect(zweiter.result.current.session).toEqual({ user: { id: 'u1' } })
  })

  it('drops every last-known data copy when the user signs out', async () => {
    const { cacheSchreiben, cacheLesen } = await import('../lib/stale-cache')
    cacheSchreiben('u1', 'profile', { id: 'u1' })
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    let melden: (event: string, session: unknown) => void = () => {}
    mockOnAuthStateChange.mockImplementation((callback: typeof melden) => {
      melden = callback
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    const { useSession } = await import('./use-session')
    const { result } = renderHook(() => useSession())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(cacheLesen('u1', 'profile')).toEqual({ id: 'u1' })

    act(() => melden('SIGNED_OUT', null))

    expect(cacheLesen('u1', 'profile')).toBeUndefined()
  })
})

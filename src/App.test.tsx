import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ProfileWeightSyncError } from './hooks/use-body-metrics'

const mockUseSession = vi.fn()
vi.mock('./hooks/use-session', () => ({
  useSession: () => mockUseSession(),
}))

const mockSaveEntry = vi.fn().mockResolvedValue(undefined)
// Spread the real module: the pages import ProfileWeightSyncError as a value and
// reach it in their catch blocks, so a factory that only defines the hook makes
// the first failing-save test die on "no export defined on the mock".
vi.mock('./hooks/use-body-metrics', async () => {
  const actual = await vi.importActual<typeof import('./hooks/use-body-metrics')>(
    './hooks/use-body-metrics',
  )
  return {
    ...actual,
    useBodyMetrics: () => ({
      rows: [],
      loading: false,
      error: false,
      saveEntry: (datum: string, values: unknown) => mockSaveEntry(datum, values),
      deleteEntry: vi.fn(),
      reload: vi.fn(),
    }),
  }
})

vi.mock('./hooks/use-body-photos', () => ({
  useBodyPhotos: () => ({
    photos: [],
    loading: false,
    error: false,
    uploadPhoto: vi.fn(),
    deletePhoto: vi.fn(),
    reload: vi.fn(),
  }),
}))

vi.mock('./hooks/use-training-analysis', () => ({
  useTrainingAnalysis: () => ({ sessions: [], sets: [], loading: false, error: false }),
}))
vi.mock('./hooks/use-nutrition-analysis', () => ({
  useNutritionAnalysis: () => ({ entries: [], sessions: [], loading: false, error: false }),
}))
vi.mock('./hooks/use-body-analysis', () => ({
  useBodyAnalysis: () => ({ rows: [], kalorien: [], fotos: [], loading: false, error: false }),
}))

afterEach(() => {
  window.history.pushState({}, '', '/')
})

describe('App routing', () => {
  it('shows the login page at /login', async () => {
    window.history.pushState({}, '', '/login')
    mockUseSession.mockReturnValue({ session: null, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('redirects to /login when visiting / without a session', async () => {
    window.history.pushState({}, '', '/')
    mockUseSession.mockReturnValue({ session: null, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('shows the home dashboard with a link to the profile at / with an active session', async () => {
    window.history.pushState({}, '', '/')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    // Logout moved onto the profile page, so the header is not where it lives now.
    expect(screen.getByRole('link', { name: 'Profil' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument()
  })

  it('shows the entries page at /nutrition/entries with an active session', async () => {
    window.history.pushState({}, '', '/nutrition/entries')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Einträge heute' })).toBeInTheDocument()
  })

  it('shows the profile page at /profile with an active session', async () => {
    window.history.pushState({}, '', '/profile')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument()
  })

  it('shows the training dashboard at /training with an active session', async () => {
    window.history.pushState({}, '', '/training')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Training' })).toBeInTheDocument()
  })

  it('shows the training plans page at /training/plans with an active session', async () => {
    window.history.pushState({}, '', '/training/plans')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Meine Pläne' })).toBeInTheDocument()
  })

  it('shows the plan editor at /training/plans/:planId with an active session', async () => {
    window.history.pushState({}, '', '/training/plans/p1')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Plan bearbeiten' })).toBeInTheDocument()
  })

  it('shows the exercises page at /training/exercises with an active session', async () => {
    window.history.pushState({}, '', '/training/exercises')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Übungen' })).toBeInTheDocument()
  })

  it('shows the live session page at /training/session/:sessionId with an active session', async () => {
    window.history.pushState({}, '', '/training/session/s1')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Training' })).toBeInTheDocument()
  })

  it('shows the training history page at /training/history with an active session', async () => {
    window.history.pushState({}, '', '/training/history')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Trainingshistorie' })).toBeInTheDocument()
  })

  it('shows a history entry at /training/history/:sessionId with an active session', async () => {
    window.history.pushState({}, '', '/training/history/s1')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Trainingseinheit' })).toBeInTheDocument()
  })

  it('shows the body history at /body/entries', async () => {
    window.history.pushState({}, '', '/body/entries')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Verlauf' })).toBeInTheDocument()
  })

  it('shows the stale-mirror notice at /body when only the profile sync fails', async () => {
    window.history.pushState({}, '', '/body')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockSaveEntry.mockRejectedValueOnce(new ProfileWeightSyncError())

    const { default: App } = await import('./App')
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Heute eintragen' }))
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /aktuelle Gewicht im Profil konnte nicht aktualisiert werden/,
    )
  })

  it('shows the photo timeline at /body/photos', async () => {
    window.history.pushState({}, '', '/body/photos')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Fortschrittsfotos' })).toBeInTheDocument()
  })

  it.each([
    ['/training/analyse'],
    ['/nutrition/analyse'],
    ['/body/analyse'],
  ])('shows the analysis page at %s', async (pfad) => {
    window.history.pushState({}, '', pfad)
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    // findByRole, not getByRole: the analysis pages are loaded lazily, so the
    // first render is the Suspense fallback.
    // timeout: the page arrives via a dynamic import. The 1000 ms default is a
    // statement about machine speed, not about correctness, and a loaded CI
    // runner exceeds it often enough to make the suite intermittently red.
    expect(
      await screen.findByRole('heading', { name: 'Analyse' }, { timeout: 5000 }),
    ).toBeInTheDocument()
  })
})

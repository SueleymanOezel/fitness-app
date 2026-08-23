import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUseSession = vi.fn()
vi.mock('./hooks/use-session', () => ({
  useSession: () => mockUseSession(),
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
})

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

  it('shows the home dashboard with logout button at / with an active session', async () => {
    window.history.pushState({}, '', '/')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
  })

  it('shows the training placeholder at /training with an active session', async () => {
    window.history.pushState({}, '', '/training')
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Training' })).toBeInTheDocument()
  })
})

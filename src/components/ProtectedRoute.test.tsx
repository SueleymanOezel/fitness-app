import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({
  useSession: () => mockUseSession(),
}))

beforeEach(() => {
  cleanup()
  mockUseSession.mockClear()
})

async function renderProtected() {
  const { default: ProtectedRoute } = await import('./ProtectedRoute')
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Secret Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('renders children when a session exists', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    await renderProtected()
    expect(screen.getByText('Secret Content')).toBeInTheDocument()
  })

  it('redirects to /login when there is no session', async () => {
    mockUseSession.mockReturnValue({ session: null, loading: false })
    await renderProtected()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders nothing while loading', async () => {
    mockUseSession.mockReturnValue({ session: null, loading: true })
    await renderProtected()
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })
})

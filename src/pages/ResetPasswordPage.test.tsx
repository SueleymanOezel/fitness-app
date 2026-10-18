import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ResetPasswordPage from './ResetPasswordPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUpdateUser = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { updateUser: (args: unknown) => mockUpdateUser(args) } },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <ResetPasswordPage />
    </MemoryRouter>,
  )
}

describe('ResetPasswordPage', () => {
  it('explains an expired link instead of offering a form that cannot work', () => {
    mockUseSession.mockReturnValue({ session: null, loading: false })

    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('abgelaufen')
    expect(screen.queryByLabelText('Neues Passwort')).not.toBeInTheDocument()
  })

  it('rejects a short password without calling Supabase', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })

    renderPage()

    fireEvent.change(screen.getByLabelText('Neues Passwort'), { target: { value: 'kurz' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passwort speichern' }))

    expect(screen.getByRole('alert')).toHaveTextContent('mindestens 8 Zeichen')
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('saves the new password and opens the app', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUpdateUser.mockResolvedValue({ data: {}, error: null })

    renderPage()

    fireEvent.change(screen.getByLabelText('Neues Passwort'), { target: { value: 'neuesPasswort1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passwort speichern' }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'neuesPasswort1' })
  })

  it('shows a German message when saving fails and stays on the page', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUpdateUser.mockResolvedValue({ data: null, error: { code: 'weak_password', status: 422 } })

    renderPage()

    fireEvent.change(screen.getByLabelText('Neues Passwort'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passwort speichern' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('zu schwach')
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

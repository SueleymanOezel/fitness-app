import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockSignInWithOAuth = vi.fn()
const mockResetPassword = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (args: unknown) => mockSignIn(args),
      signUp: (args: unknown) => mockSignUp(args),
      signInWithOAuth: (args: unknown) => mockSignInWithOAuth(args),
      resetPasswordForEmail: (email: string, options: unknown) => mockResetPassword(email, options),
    },
  },
}))

let mockSession: unknown = null
vi.mock('../hooks/use-session', () => ({ useSession: () => ({ session: mockSession, loading: false }) }))

async function renderLoginPage() {
  const { default: LoginPage } = await import('./LoginPage')
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<p>Startseite</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  // The installed iPhone app always opens on /login (its start URL was saved at install time):
  // a signed-in user must land in the app, not on the form (user video 23.10.2026).
  it('sends a signed-in user straight into the app', async () => {
    mockSession = { user: { id: 'u1' } }
    await renderLoginPage()
    expect(screen.getByText('Startseite')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Einloggen' })).not.toBeInTheDocument()
  })

  beforeEach(() => {
    mockSession = null
    mockSignIn.mockReset()
    mockSignUp.mockReset()
    mockSignInWithOAuth.mockReset()
    mockResetPassword.mockReset()
  })

  it('asks for the e-mail before sending a password reset', async () => {
    await renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: 'Passwort vergessen?' }))

    expect(screen.getByRole('alert')).toHaveTextContent('E-Mail-Adresse')
    expect(mockResetPassword).not.toHaveBeenCalled()
  })

  it('sends the reset link to the reset page and answers without revealing whether the account exists', async () => {
    mockResetPassword.mockResolvedValue({ data: {}, error: null })
    await renderLoginPage()

    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: ' a@b.com ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passwort vergessen?' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Wenn es zu dieser E-Mail ein Konto gibt')
    expect(mockResetPassword).toHaveBeenCalledWith('a@b.com', {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  })

  it('shows a German message when the reset request fails', async () => {
    mockResetPassword.mockResolvedValue({ data: null, error: { code: 'over_email_send_rate_limit', status: 429 } })
    await renderLoginPage()

    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Passwort vergessen?' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Zu viele Versuche')
  })

  it('shows a validation error and does not call Supabase when fields are empty', async () => {
    await renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: 'Einloggen' }))

    expect(screen.getByRole('alert')).toHaveTextContent('E-Mail und Passwort sind erforderlich.')
    expect(screen.getByLabelText('E-Mail')).toHaveFocus()
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('shows a validation error when the password is too short', async () => {
    await renderLoginPage()

    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einloggen' }))

    expect(screen.getByRole('alert')).toHaveTextContent('mindestens 8 Zeichen')
    expect(screen.getByLabelText('Passwort')).toHaveFocus()
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('calls signInWithPassword with valid credentials', async () => {
    mockSignIn.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    await renderLoginPage()

    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einloggen' }))

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' }),
    )
  })

  it('switches to signup mode and calls signUp', async () => {
    mockSignUp.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
    await renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: 'Noch kein Konto? Registrieren' }))
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrieren' }))

    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' }),
    )
  })

  it('shows a confirmation message when signup succeeds but no session is returned (e-mail confirmation on)', async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: null })
    await renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: 'Noch kein Konto? Registrieren' }))
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrieren' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Bitte bestätige deine E-Mail-Adresse, dann kannst du dich einloggen.',
      ),
    )
  })

  it('starts the Google OAuth flow, redirecting back to the current origin', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { provider: 'google', url: 'https://x' }, error: null })
    await renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: 'Weiter mit Google' }))

    await waitFor(() =>
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      }),
    )
  })

  it('shows the Google button in signup mode too, since sign-in and sign-up are the same OAuth action', async () => {
    await renderLoginPage()
    fireEvent.click(screen.getByRole('button', { name: 'Noch kein Konto? Registrieren' }))

    expect(screen.getByRole('button', { name: 'Weiter mit Google' })).toBeInTheDocument()
  })

  it('shows an error when Google sign-in fails instead of silently doing nothing', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: null },
      error: { message: 'boom' },
    })
    await renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: 'Weiter mit Google' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Das hat nicht geklappt'))
  })

  it('shows a German message for wrong credentials, not the raw server text', async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })
    await renderLoginPage()

    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'a@b.de' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'falschfalsch' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einloggen' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('E-Mail oder Passwort stimmt nicht.'))
    expect(screen.getByRole('alert')).not.toHaveTextContent('Invalid')
    // Re-audit 27.10.2026: focus fell to <body> after a refused login; it goes back to the password.
    expect(screen.getByLabelText('Passwort')).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Passwort')))
  })
})

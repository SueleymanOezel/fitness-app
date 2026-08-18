import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockSignIn = vi.fn()
const mockSignUp = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (args: unknown) => mockSignIn(args),
      signUp: (args: unknown) => mockSignUp(args),
    },
  },
}))

async function renderLoginPage() {
  const { default: LoginPage } = await import('./LoginPage')
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignIn.mockReset()
    mockSignUp.mockReset()
  })

  it('shows a validation error and does not call Supabase when fields are empty', async () => {
    await renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: 'Einloggen' }))

    expect(screen.getByRole('alert')).toHaveTextContent('E-Mail und Passwort sind erforderlich.')
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('shows a validation error when the password is too short', async () => {
    await renderLoginPage()

    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einloggen' }))

    expect(screen.getByRole('alert')).toHaveTextContent('mindestens 8 Zeichen')
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('calls signInWithPassword with valid credentials', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    await renderLoginPage()

    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Einloggen' }))

    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' }),
    )
  })

  it('switches to signup mode and calls signUp', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    await renderLoginPage()

    fireEvent.click(screen.getByRole('button', { name: 'Noch keinen Account? Registrieren' }))
    fireEvent.change(screen.getByLabelText('E-Mail'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrieren' }))

    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' }),
    )
  })
})

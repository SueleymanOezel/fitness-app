import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockInvoke = vi.fn()
const mockNavigate = vi.fn()
const mockSignOut = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { signOut: (...args: unknown[]) => mockSignOut(...args) },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

async function renderPage() {
  const { default: DeleteAccountPage } = await import('./DeleteAccountPage')
  render(
    <MemoryRouter>
      <DeleteAccountPage />
    </MemoryRouter>,
  )
}

describe('DeleteAccountPage', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
    mockNavigate.mockReset()
    mockSignOut.mockReset()
    mockSignOut.mockResolvedValue({ error: null })
  })

  it('says what is lost and offers a way back without deleting', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { name: 'Konto löschen' })).toBeInTheDocument()
    expect(screen.getByText(/unwiderruflich gelöscht/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abbrechen' })).toHaveAttribute('href', '/profile')
  })

  it('keeps the delete-account confirm button disabled until "LÖSCHEN" is typed exactly', async () => {
    await renderPage()

    const confirmButton = screen.getByRole('button', { name: 'Konto endgültig löschen' })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Bestätigung: LÖSCHEN eingeben'), {
      target: { value: 'löschen' },
    })
    expect(confirmButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Bestätigung: LÖSCHEN eingeben'), {
      target: { value: 'LÖSCHEN' },
    })
    expect(confirmButton).toBeEnabled()
  })

  it('calls the delete-account function and navigates to /login when the account is deleted', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null })
    await renderPage()

    fireEvent.change(screen.getByLabelText('Bestätigung: LÖSCHEN eingeben'), {
      target: { value: 'LÖSCHEN' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Konto endgültig löschen' }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login'))
    expect(mockInvoke).toHaveBeenCalledWith('delete-account')
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('shows an inline error and keeps the confirmation text when the function call fails', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'network' } })
    await renderPage()

    fireEvent.change(screen.getByLabelText('Bestätigung: LÖSCHEN eingeben'), {
      target: { value: 'LÖSCHEN' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Konto endgültig löschen' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Konto konnte nicht gelöscht werden. Bitte erneut versuchen.',
      ),
    )
    expect(screen.getByLabelText('Bestätigung: LÖSCHEN eingeben')).toHaveValue('LÖSCHEN')
    expect(mockNavigate).not.toHaveBeenCalled()
  })

})

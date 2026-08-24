import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BodyPhotosPage from './BodyPhotosPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseBodyPhotos = vi.fn()
vi.mock('../hooks/use-body-photos', () => ({
  useBodyPhotos: (userId: string) => mockUseBodyPhotos(userId),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function photosResult(overrides: Record<string, unknown> = {}) {
  return {
    photos: [
      { id: 'p1', datum: '2026-08-24', pfad: 'u1/a.jpg', url: 'https://signed.example/a' },
      { id: 'p2', datum: '2026-08-17', pfad: 'u1/b.jpg', url: null },
    ],
    loading: false,
    error: false,
    uploadPhoto: vi.fn().mockResolvedValue(undefined),
    deletePhoto: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn(),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BodyPhotosPage />
    </MemoryRouter>,
  )
}

const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })

describe('BodyPhotosPage', () => {
  it('shows a photo through its signed link', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyPhotos.mockReturnValue(photosResult())

    renderPage()

    expect(screen.getByAltText('Fortschrittsfoto vom 24.08.2026')).toHaveAttribute(
      'src',
      'https://signed.example/a',
    )
  })

  it('says so instead of showing a broken image when no link could be signed', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyPhotos.mockReturnValue(photosResult())

    renderPage()

    expect(screen.getByText('Bild nicht verfügbar')).toBeInTheDocument()
  })

  it('uploads a chosen file for the given date', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = photosResult()
    mockUseBodyPhotos.mockReturnValue(result)

    renderPage()
    fireEvent.change(screen.getByLabelText('Datum'), { target: { value: '2026-08-24' } })
    fireEvent.change(screen.getByLabelText('Foto'), { target: { files: [file] } })

    await waitFor(() => expect(result.uploadPhoto).toHaveBeenCalledWith(file, '2026-08-24'))
  })

  it('reports a failed upload instead of swallowing it', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyPhotos.mockReturnValue(
      photosResult({ uploadPhoto: vi.fn().mockRejectedValue(new Error('boom')) }),
    )

    renderPage()
    fireEvent.change(screen.getByLabelText('Foto'), { target: { files: [file] } })

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('deletes a photo', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = photosResult()
    mockUseBodyPhotos.mockReturnValue(result)

    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Löschen' })[0])

    await waitFor(() =>
      expect(result.deletePhoto).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p1' }),
      ),
    )
  })

  it('says so instead of showing an empty page when there are no photos', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyPhotos.mockReturnValue(photosResult({ photos: [] }))

    renderPage()

    expect(screen.getByText('Noch keine Fotos.')).toBeInTheDocument()
  })
})

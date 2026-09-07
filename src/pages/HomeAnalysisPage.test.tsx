import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import HomeAnalysisPage from './HomeAnalysisPage'
import { renderWithProviders } from '../test-render'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseHomeAnalysis = vi.fn()
vi.mock('../hooks/use-home-analysis', () => ({ useHomeAnalysis: (userId: string, zeitraum: unknown) => mockUseHomeAnalysis(userId, zeitraum) }))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))

describe('HomeAnalysisPage', () => {
  it('renders all three home charts', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseHomeAnalysis.mockReturnValue({ sessions: [], entries: [], rows: [], loading: false, error: false })
    mockUseProfile.mockReturnValue({
      profile: { analyse_auswahl: [] },
      loading: false,
      error: false,
      reload: vi.fn(),
      updateProfile: vi.fn(),
    })
    renderWithProviders(<HomeAnalysisPage />)
    expect(await screen.findByText('Aktivitätsraster')).toBeInTheDocument()
    expect(await screen.findByText('Wochen-Kurzform')).toBeInTheDocument()
    expect(await screen.findByText('Trends')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseHomeAnalysis.mockReturnValue({ sessions: [], entries: [], rows: [], loading: false, error: true })
    mockUseProfile.mockReturnValue({
      profile: { analyse_auswahl: [] },
      loading: false,
      error: false,
      reload: vi.fn(),
      updateProfile: vi.fn(),
    })
    renderWithProviders(<HomeAnalysisPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Daten konnten nicht geladen werden.')
  })
})

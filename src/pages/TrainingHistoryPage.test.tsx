import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { renderWithProviders } from '../test-render'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseWorkoutHistory = vi.fn()
vi.mock('../hooks/use-workout-history', () => ({
  useWorkoutHistory: (userId: string) => mockUseWorkoutHistory(userId),
}))

afterEach(() => cleanup())

const finished = {
  id: 's1',
  gestartet_am: '2026-08-20T10:00:00.000Z',
  beendet_am: '2026-08-20T11:00:00.000Z',
  gesamt_kalorien: 400,
  tag_name: 'Tag A',
  plan_name: 'Ganzkörper',
}

describe('TrainingHistoryPage', () => {
  it('lists past sessions newest first with a link to each detail page', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutHistory.mockReturnValue({ sessions: [finished], loading: false })

    const { default: TrainingHistoryPage } = await import('./TrainingHistoryPage')
    renderWithProviders(<TrainingHistoryPage />)

    const link = screen.getByRole('link', { name: /Ganzkörper.*Tag A/ })
    expect(link).toHaveAttribute('href', '/training/history/s1')
    expect(link).toHaveTextContent('400 kcal')
  })

  it('marks a session without a calorie result instead of showing 0 kcal', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutHistory.mockReturnValue({
      sessions: [{ ...finished, beendet_am: null, gesamt_kalorien: null }],
      loading: false,
    })

    const { default: TrainingHistoryPage } = await import('./TrainingHistoryPage')
    renderWithProviders(<TrainingHistoryPage />)

    const link = screen.getByRole('link', { name: /Ganzkörper.*Tag A/ })
    expect(link).not.toHaveTextContent('0 kcal')
    expect(link).toHaveTextContent('nicht beendet')
  })

  it('says so when there is no history yet', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutHistory.mockReturnValue({ sessions: [], loading: false })

    const { default: TrainingHistoryPage } = await import('./TrainingHistoryPage')
    renderWithProviders(<TrainingHistoryPage />)

    expect(screen.getByText('Noch keine Trainings aufgezeichnet.')).toBeInTheDocument()
  })
})

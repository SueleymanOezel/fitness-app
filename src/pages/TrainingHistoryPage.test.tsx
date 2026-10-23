import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
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

    const link = screen.getByRole('link', { name: /Tag A/ })
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

    const link = screen.getByRole('link', { name: /Tag A/ })
    expect(link).not.toHaveTextContent('0 kcal')
    expect(link).toHaveTextContent('nicht beendet')
  })

  it('puts all sessions into one divided card instead of one card per row', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutHistory.mockReturnValue({ sessions: [finished, { ...finished, id: 's2' }], loading: false })

    const { default: TrainingHistoryPage } = await import('./TrainingHistoryPage')
    renderWithProviders(<TrainingHistoryPage />)

    const liste = screen.getAllByRole('link', { name: /Tag A/ })[0].closest('ul')
    expect(liste).toHaveClass('divide-y')
    expect(liste?.closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
    liste?.querySelectorAll('li').forEach((li) => expect(li).not.toHaveClass('bg-surface'))
  })

  it('says so when there is no history yet', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutHistory.mockReturnValue({ sessions: [], loading: false })

    const { default: TrainingHistoryPage } = await import('./TrainingHistoryPage')
    renderWithProviders(<TrainingHistoryPage />)

    expect(screen.getByText('Noch keine Trainings aufgezeichnet.')).toBeInTheDocument()
  })

  it('shows an error with a retry instead of an empty history when loading failed', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const reload = vi.fn()
    mockUseWorkoutHistory.mockReturnValue({ sessions: [], loading: false, error: true, reload })

    const { default: TrainingHistoryPage } = await import('./TrainingHistoryPage')
    renderWithProviders(<TrainingHistoryPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('Trainings konnten nicht geladen werden.')
    expect(screen.queryByText('Noch keine Trainings aufgezeichnet.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(reload).toHaveBeenCalled()
  })
})

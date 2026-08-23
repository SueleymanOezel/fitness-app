import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseActiveTrainingDay = vi.fn()
vi.mock('../hooks/use-active-training-day', () => ({
  useActiveTrainingDay: (userId: string) => mockUseActiveTrainingDay(userId),
}))

const mockStartWorkoutSession = vi.fn()
const mockNavigate = vi.fn()
vi.mock('../hooks/use-workout-session', () => ({
  startWorkoutSession: (userId: string, dayId: string) => mockStartWorkoutSession(userId, dayId),
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks() // mockNavigate is shared; a call from an earlier test would leak into the next
})

const activeDay = {
  plan: { id: 'p1', name: 'Ganzkörper', aktiv: true },
  day: { id: 'd1', name: 'Tag A', reihenfolge: 1 },
  loading: false,
}

describe('TrainingPage', () => {
  it('shows a placeholder while there is no session', async () => {
    mockUseSession.mockReturnValue({ session: null, loading: false })

    const { default: TrainingPage } = await import('./TrainingPage')
    render(<TrainingPage />, { wrapper: MemoryRouter })

    expect(screen.getByRole('heading', { name: 'Training' })).toBeInTheDocument()
  })

  it('shows the active plan, the next day, and a link to manage plans', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue(activeDay)

    const { default: TrainingPage } = await import('./TrainingPage')
    render(<TrainingPage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Ganzkörper')).toBeInTheDocument()
    expect(screen.getByText('Tag A')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Meine Pläne' })).toHaveAttribute('href', '/training/plans')
  })

  it('starts a session for the next day and navigates to it', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue(activeDay)
    mockStartWorkoutSession.mockResolvedValue('s1')

    const { default: TrainingPage } = await import('./TrainingPage')
    render(<TrainingPage />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: 'Training starten' }))

    await waitFor(() => expect(mockStartWorkoutSession).toHaveBeenCalledWith('u1', 'd1'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/training/session/s1'))
  })

  it('shows a message and no start button when no plan is active', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue({ plan: null, day: null, loading: false })

    const { default: TrainingPage } = await import('./TrainingPage')
    render(<TrainingPage />, { wrapper: MemoryRouter })

    expect(screen.queryByRole('button', { name: 'Training starten' })).not.toBeInTheDocument()
    expect(screen.getByText(/kein aktiver Plan/i)).toBeInTheDocument()
  })

  it('asks for a day when the active plan has none yet', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue({ plan: activeDay.plan, day: null, loading: false })

    const { default: TrainingPage } = await import('./TrainingPage')
    render(<TrainingPage />, { wrapper: MemoryRouter })

    expect(screen.queryByRole('button', { name: 'Training starten' })).not.toBeInTheDocument()
    expect(screen.getByText(/noch keinen Tag/i)).toBeInTheDocument()
  })

  it('reports a failed start instead of navigating', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue(activeDay)
    mockStartWorkoutSession.mockRejectedValue(new Error('boom'))

    const { default: TrainingPage } = await import('./TrainingPage')
    render(<TrainingPage />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: 'Training starten' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

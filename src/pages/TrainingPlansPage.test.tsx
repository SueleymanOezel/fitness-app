import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-render'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseWorkoutPlans = vi.fn()
vi.mock('../hooks/use-workout-plans', () => ({ useWorkoutPlans: (userId: string) => mockUseWorkoutPlans(userId) }))

afterEach(() => cleanup())

function plansResult(overrides: Partial<ReturnType<typeof mockUseWorkoutPlans>> = {}) {
  return {
    plans: [{ id: 'p1', name: 'Ganzkörper', aktiv: true }],
    loading: false,
    createPlan: vi.fn().mockResolvedValue(undefined),
    deletePlan: vi.fn().mockResolvedValue(undefined),
    activatePlan: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('TrainingPlansPage', () => {
  it('lists plans with a link to edit and an active marker', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlans.mockReturnValue(plansResult())

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    renderWithProviders(<TrainingPlansPage />)

    expect(screen.getByRole('link', { name: /Ganzkörper/ })).toHaveAttribute('href', '/training/plans/p1')
    expect(screen.getByText(/aktiv/i)).toBeInTheDocument()
  })

  it('lists all plans in one divided card', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlans.mockReturnValue(
      plansResult({
        plans: [
          { id: 'p1', name: 'Ganzkörper', aktiv: true },
          { id: 'p2', name: 'Oberkörper', aktiv: false },
        ],
      }),
    )

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    renderWithProviders(<TrainingPlansPage />)

    const liste = screen.getByRole('link', { name: /Ganzkörper/ }).closest('ul')
    expect(liste).toHaveClass('divide-y')
    expect(liste?.closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
    expect(screen.getByRole('link', { name: /Oberkörper/ }).closest('li')).not.toHaveClass('bg-surface')
  })

  it('offers an empty state when there is no plan yet', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlans.mockReturnValue(plansResult({ plans: [] }))

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    renderWithProviders(<TrainingPlansPage />)

    expect(screen.getByRole('heading', { name: 'Noch kein Plan.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Neuer Plan/ })).toHaveAttribute('href', '/training/plans/new')
  })

  it('links to the plan-creation wizard instead of an inline form', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlans.mockReturnValue(plansResult())

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    renderWithProviders(<TrainingPlansPage />)

    expect(screen.getByRole('link', { name: /Neuer Plan/ })).toHaveAttribute('href', '/training/plans/new')
    expect(screen.queryByLabelText('Neuer Plan')).not.toBeInTheDocument()
  })

  it('activates and deletes a plan', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = plansResult({
      plans: [{ id: 'p1', name: 'Ganzkörper', aktiv: false }],
    })
    mockUseWorkoutPlans.mockReturnValue(result)

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    renderWithProviders(<TrainingPlansPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Aktivieren' }))
    await waitFor(() => expect(result.activatePlan).toHaveBeenCalledWith('p1'))

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))
    await waitFor(() => expect(result.deletePlan).toHaveBeenCalledWith('p1'))
  })

  it('reports a failed write instead of swallowing it', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = plansResult({
      plans: [{ id: 'p1', name: 'Ganzkörper', aktiv: false }],
      activatePlan: vi.fn().mockRejectedValue(new Error('boom')),
    })
    mockUseWorkoutPlans.mockReturnValue(result)

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    renderWithProviders(<TrainingPlansPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Aktivieren' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('shows an error with a retry instead of "no plan" when loading failed', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const reload = vi.fn()
    mockUseWorkoutPlans.mockReturnValue(plansResult({ plans: [], error: true, reload }))

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    renderWithProviders(<TrainingPlansPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('Pläne konnten nicht geladen werden.')
    expect(screen.queryByText('Noch kein Plan.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(reload).toHaveBeenCalled()
  })

  it('asks before deleting a plan', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = plansResult()
    mockUseWorkoutPlans.mockReturnValue(result)

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    renderWithProviders(<TrainingPlansPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    expect(result.deletePlan).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Plan löschen?' })).toBeInTheDocument()
  })
})

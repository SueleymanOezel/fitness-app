import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

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
    render(<TrainingPlansPage />, { wrapper: MemoryRouter })

    expect(screen.getByRole('link', { name: /Ganzkörper/ })).toHaveAttribute('href', '/training/plans/p1')
    expect(screen.getByText(/aktiv/i)).toBeInTheDocument()
  })

  it('creates a new plan', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = plansResult()
    mockUseWorkoutPlans.mockReturnValue(result)

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    render(<TrainingPlansPage />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Neuer Plan'), { target: { value: 'Push/Pull/Legs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }))

    await waitFor(() => expect(result.createPlan).toHaveBeenCalledWith('Push/Pull/Legs'))
  })

  it('activates and deletes a plan', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = plansResult({
      plans: [{ id: 'p1', name: 'Ganzkörper', aktiv: false }],
    })
    mockUseWorkoutPlans.mockReturnValue(result)

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    render(<TrainingPlansPage />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: 'Aktivieren' }))
    await waitFor(() => expect(result.activatePlan).toHaveBeenCalledWith('p1'))

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    await waitFor(() => expect(result.deletePlan).toHaveBeenCalledWith('p1'))
  })

  it('refuses to create a plan without a name', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = plansResult()
    mockUseWorkoutPlans.mockReturnValue(result)

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    render(<TrainingPlansPage />, { wrapper: MemoryRouter })

    fireEvent.change(screen.getByLabelText('Neuer Plan'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anlegen' }))

    expect(result.createPlan).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('reports a failed write instead of swallowing it', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = plansResult({
      plans: [{ id: 'p1', name: 'Ganzkörper', aktiv: false }],
      activatePlan: vi.fn().mockRejectedValue(new Error('boom')),
    })
    mockUseWorkoutPlans.mockReturnValue(result)

    const { default: TrainingPlansPage } = await import('./TrainingPlansPage')
    render(<TrainingPlansPage />, { wrapper: MemoryRouter })

    fireEvent.click(screen.getByRole('button', { name: 'Aktivieren' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })
})

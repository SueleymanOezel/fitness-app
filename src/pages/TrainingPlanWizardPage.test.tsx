import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-render'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseWorkoutPlans = vi.fn()
vi.mock('../hooks/use-workout-plans', () => ({ useWorkoutPlans: (userId: string) => mockUseWorkoutPlans(userId) }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function stelleBereit(createPlan = vi.fn().mockResolvedValue('new-id')) {
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseWorkoutPlans.mockReturnValue({ createPlan })
  return createPlan
}

describe('TrainingPlanWizardPage', () => {
  it('walks through all three steps and creates the plan', async () => {
    const createPlan = stelleBereit()
    const { default: TrainingPlanWizardPage } = await import('./TrainingPlanWizardPage')
    renderWithProviders(<TrainingPlanWizardPage />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Push/Pull/Legs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getByRole('heading', { name: 'Wie oft möchtest du trainieren?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '3× pro Woche' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getByRole('heading', { name: 'Plandauer' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Plan erstellen' }))

    await waitFor(() => expect(createPlan).toHaveBeenCalledWith('Push/Pull/Legs', 3, 4))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/training/plans/new-id'))
  })

  it('refuses to continue without a name', async () => {
    stelleBereit()
    const { default: TrainingPlanWizardPage } = await import('./TrainingPlanWizardPage')
    renderWithProviders(<TrainingPlanWizardPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Wie oft möchtest du trainieren?' })).not.toBeInTheDocument()
  })

  it('requires a frequency before continuing to plan duration', async () => {
    stelleBereit()
    const { default: TrainingPlanWizardPage } = await import('./TrainingPlanWizardPage')
    renderWithProviders(<TrainingPlanWizardPage />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Push/Pull/Legs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled()
  })

  it('goes back a step and keeps the entered name', async () => {
    stelleBereit()
    const { default: TrainingPlanWizardPage } = await import('./TrainingPlanWizardPage')
    renderWithProviders(<TrainingPlanWizardPage />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Push/Pull/Legs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))

    expect(screen.getByLabelText('Name')).toHaveValue('Push/Pull/Legs')
  })

  it('reports a failed creation instead of navigating', async () => {
    stelleBereit(vi.fn().mockRejectedValue(new Error('boom')))
    const { default: TrainingPlanWizardPage } = await import('./TrainingPlanWizardPage')
    renderWithProviders(<TrainingPlanWizardPage />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Push/Pull/Legs' } })
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('button', { name: '2× pro Woche' }))
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Plan erstellen' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

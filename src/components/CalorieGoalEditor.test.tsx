import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import CalorieGoalEditor from './CalorieGoalEditor'
import type { Profile } from '../hooks/use-profile'

const calculableProfile: Profile = {
  id: 'u1',
  name: null,
  alter: 30,
  groesse: 180,
  aktuelles_gewicht: 80,
  geschlecht: 'maennlich',
  aktivitaetslevel: 'moderat',
  ziel: 'halten',
  ziel_delta_kcal: 500,
  taegliches_kalorienziel: null,
}

describe('CalorieGoalEditor', () => {
  it('shows the calculated goal when no manual value is set', () => {
    render(<CalorieGoalEditor profile={calculableProfile} onUpdate={vi.fn()} />)
    expect(screen.getByText(/2759 kcal/)).toBeInTheDocument()
  })

  it('shows a completion hint when profile data is missing', () => {
    const incomplete = { ...calculableProfile, geschlecht: null }
    render(<CalorieGoalEditor profile={incomplete} onUpdate={vi.fn()} />)
    expect(screen.getByText(/Profil vervollständigen/)).toBeInTheDocument()
  })

  it('switches to manual mode and calls onUpdate with the entered value', () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<CalorieGoalEditor profile={calculableProfile} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Manuell festlegen' }))
    fireEvent.change(screen.getByLabelText('Tagesziel (kcal)'), { target: { value: '1800' } })

    expect(onUpdate).toHaveBeenCalledWith({ taegliches_kalorienziel: 1800 })
  })

  it('starts in manual mode and switches to calculated on request', () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    const manualProfile = { ...calculableProfile, taegliches_kalorienziel: 1800 }
    render(<CalorieGoalEditor profile={manualProfile} onUpdate={onUpdate} />)

    expect(screen.getByLabelText('Tagesziel (kcal)')).toHaveValue(1800)

    fireEvent.click(screen.getByRole('button', { name: 'Berechnen lassen' }))
    expect(onUpdate).toHaveBeenCalledWith({ taegliches_kalorienziel: null })
  })
})

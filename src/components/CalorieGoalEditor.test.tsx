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
  mahlzeit_1_name: 'Frühstück',
  mahlzeit_2_name: 'Mittagessen',
  mahlzeit_3_name: 'Abendessen',
  mahlzeit_4_name: 'Snacks',
  mahlzeit_5_name: null,
  mahlzeit_6_name: null,
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

  it('switches to manual mode and saves the entered value once, on blur', () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<CalorieGoalEditor profile={calculableProfile} onUpdate={onUpdate} />)

    fireEvent.click(screen.getByRole('button', { name: 'Manuell festlegen' }))
    const input = screen.getByLabelText('Tagesziel (kcal)')

    // Typing "1800" must not fire four racing updates (1, 18, 180, 1800) whose
    // responses can land out of order and leave 180 kcal persisted.
    fireEvent.change(input, { target: { value: '1' } })
    fireEvent.change(input, { target: { value: '18' } })
    fireEvent.change(input, { target: { value: '180' } })
    fireEvent.change(input, { target: { value: '1800' } })
    expect(onUpdate).not.toHaveBeenCalled()

    fireEvent.blur(input)
    expect(onUpdate).toHaveBeenCalledTimes(1)
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

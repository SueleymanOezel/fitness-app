import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-render'
import ErststartDialog from './ErststartDialog'
import type { Profile } from '../hooks/use-profile'

const leer = {
  id: 'u1', alter: null, groesse: null, aktuelles_gewicht: null, geschlecht: null,
  aktivitaetslevel: null, ziel: null, ziel_delta_kcal: 0, taegliches_kalorienziel: null,
} as unknown as Profile

function oeffnen(props: Partial<Parameters<typeof ErststartDialog>[0]> = {}) {
  const updateProfile = vi.fn().mockResolvedValue(undefined)
  const ersteWiegung = vi.fn().mockResolvedValue(undefined)
  const onClose = vi.fn()
  renderWithProviders(
    <ErststartDialog open onClose={onClose} profile={leer} updateProfile={updateProfile} hatPlan={false} ersteWiegung={ersteWiegung} {...props} />,
  )
  return { updateProfile, ersteWiegung, onClose }
}

function koerperAusfuellen() {
  fireEvent.change(screen.getByLabelText('Alter (Jahre)'), { target: { value: '30' } })
  fireEvent.change(screen.getByLabelText('Größe (cm)'), { target: { value: '180' } })
  fireEvent.change(screen.getByLabelText('Gewicht heute (kg)'), { target: { value: '80' } })
  fireEvent.click(screen.getByRole('button', { name: 'männlich' }))
  fireEvent.change(screen.getByLabelText('Dein Alltag (ohne Sport)'), { target: { value: 'sitzend' } })
  fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
}

describe('ErststartDialog', () => {
  it('marks exactly the missing fields and moves focus to the first one', () => {
    oeffnen()
    fireEvent.change(screen.getByLabelText('Alter (Jahre)'), { target: { value: '30' } })
    fireEvent.change(screen.getByLabelText('Gewicht heute (kg)'), { target: { value: '800' } })
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Bitte noch ausfüllen: Größe (100–250 cm), Gewicht (30–300 kg), Geschlecht, Alltag.')
    expect(screen.getByLabelText('Alter (Jahre)')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText('Größe (cm)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Gewicht heute (kg)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Dein Alltag (ohne Sport)')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'männlich' })).toHaveAttribute('aria-invalid', 'true')
    expect(document.activeElement).toBe(screen.getByLabelText('Größe (cm)'))
    expect(screen.getByText('Schritt 1 von 3')).toBeInTheDocument()
  })

  it('is named by its title and hands focus to the new title on each step', async () => {
    oeffnen()
    expect(screen.getByRole('dialog', { name: 'Willkommen bei VitaLoop' })).toBeInTheDocument()
    koerperAusfuellen()
    const titel = screen.getByRole('heading', { name: 'Dein Ziel' })
    expect(document.activeElement).toBe(titel)
    expect(await screen.findByRole('dialog', { name: 'Dein Ziel' })).toBeInTheDocument()
  })

  it('computes the daily goal live while the goal is chosen', () => {
    oeffnen()
    koerperAusfuellen()
    // Mifflin-St Jeor 1780 × 1,4 (sitzend) = 2492, minus 400 to lose weight.
    expect(screen.getByText('2092 kcal')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'halten' }))
    expect(screen.getByText('2492 kcal')).toBeInTheDocument()
    expect(screen.queryByLabelText(/Abstand zum Bedarf/)).not.toBeInTheDocument()
  })

  it('saves the goal, logs the first weigh-in and offers the plan assistant', async () => {
    const { updateProfile, ersteWiegung } = oeffnen()
    koerperAusfuellen()
    fireEvent.click(screen.getByRole('button', { name: 'Ziel speichern' }))
    expect(await screen.findByText('Schritt 3 von 3')).toBeInTheDocument()
    expect(updateProfile).toHaveBeenCalledWith({
      alter: 30, groesse: 180, aktuelles_gewicht: 80, geschlecht: 'maennlich',
      aktivitaetslevel: 'sitzend', ziel: 'abnehmen', ziel_delta_kcal: 400,
    })
    expect(ersteWiegung).toHaveBeenCalledWith(80)
    expect(screen.getByRole('link', { name: 'Plan zusammenstellen' })).toHaveAttribute('href', '/training/plans/new')
  })

  it('closes after the goal when there is a plan already', async () => {
    const { onClose } = oeffnen({ hatPlan: true })
    expect(screen.getByText('Schritt 1 von 2')).toBeInTheDocument()
    expect(screen.getByText(/^Zwei kurze Schritte/)).toBeInTheDocument()
    koerperAusfuellen()
    fireEvent.click(screen.getByRole('button', { name: 'Ziel speichern' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('stays on the goal and says so when saving fails', async () => {
    const { ersteWiegung } = oeffnen({ updateProfile: vi.fn().mockRejectedValue(new Error('x')) })
    koerperAusfuellen()
    fireEvent.click(screen.getByRole('button', { name: 'Ziel speichern' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Konnte nicht gespeichert werden')
    expect(ersteWiegung).not.toHaveBeenCalled()
  })

  it('does not take an empty distance as zero when losing weight', async () => {
    const { updateProfile } = oeffnen()
    koerperAusfuellen()
    fireEvent.change(screen.getByLabelText(/Abstand zum Bedarf/), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ziel speichern' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Bitte einen Abstand')
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('can be put off at the first step', () => {
    const { onClose } = oeffnen()
    fireEvent.click(screen.getByRole('button', { name: 'Später' }))
    expect(onClose).toHaveBeenCalled()
  })
})

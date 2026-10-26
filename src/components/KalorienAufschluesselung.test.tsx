import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import KalorienAufschluesselung from './KalorienAufschluesselung'
import { renderWithProviders as render } from '../test-render'
import { merkeAktivitaetGewaehlt } from '../lib/activity-level-notice'

const profil = {
  geschlecht: 'maennlich' as const,
  aktivitaetslevel: 'moderat' as const,
  ziel: 'abnehmen' as const,
  ziel_delta_kcal: 400,
  aktuelles_gewicht: 82.4,
  groesse: 181,
  alter: 29,
  taegliches_kalorienziel: null,
}

describe('KalorienAufschluesselung', () => {
  it('adds need, delta and the training of today up to the goal of today', () => {
    merkeAktivitaetGewaehlt('u1')
    render(<KalorienAufschluesselung userId="u1" profile={profil} trainingKcal={413} />)
    expect(screen.getByText('So entsteht dein Ziel')).toBeInTheDocument()
    expect(screen.getByText('Tagesbedarf (Alltag)')).toBeInTheDocument()
    expect(screen.getByText('−400 kcal')).toBeInTheDocument()
    expect(screen.getByText('+413 kcal')).toBeInTheDocument()
    expect(screen.getByText('Ziel heute')).toBeInTheDocument()
    expect(screen.queryByText(/Im Profil neu wählen/)).not.toBeInTheDocument()
  })

  it('asks to pick the activity level again until the profile was saved with the new meaning', () => {
    render(<KalorienAufschluesselung userId="u2" profile={profil} trainingKcal={0} />)
    expect(screen.getByRole('link', { name: 'Im Profil neu wählen' })).toHaveAttribute('href', '/profile')
  })

  it('starts a fixed goal from that goal, with training on top', () => {
    render(<KalorienAufschluesselung userId="u1" profile={{ ...profil, taegliches_kalorienziel: 2200 }} trainingKcal={200} />)
    expect(screen.getByText('Dein festes Tagesziel')).toBeInTheDocument()
    expect(screen.getByText('2400 kcal')).toBeInTheDocument()
    expect(screen.queryByText(/Im Profil neu wählen/)).not.toBeInTheDocument()
  })
})

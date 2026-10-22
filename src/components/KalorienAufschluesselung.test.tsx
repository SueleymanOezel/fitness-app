import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import KalorienAufschluesselung from './KalorienAufschluesselung'

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
  it('shows need, delta and goal, plus today\'s training', () => {
    render(<KalorienAufschluesselung profile={profil} trainingKcal={413} />)
    expect(screen.getByText('So entsteht dein Ziel')).toBeInTheDocument()
    expect(screen.getByText('Tagesbedarf')).toBeInTheDocument()
    expect(screen.getByText('−400 kcal')).toBeInTheDocument()
    expect(screen.getByText('413 kcal')).toBeInTheDocument()
  })

  it('shows only the training line for a manual goal, and nothing without either', () => {
    const { container, rerender } = render(
      <KalorienAufschluesselung profile={{ ...profil, taegliches_kalorienziel: 2200 }} trainingKcal={200} />,
    )
    expect(screen.queryByText('Tagesbedarf')).not.toBeInTheDocument()
    expect(screen.getByText('200 kcal')).toBeInTheDocument()
    rerender(<KalorienAufschluesselung profile={{ ...profil, taegliches_kalorienziel: 2200 }} trainingKcal={0} />)
    expect(container).toBeEmptyDOMElement()
  })
})

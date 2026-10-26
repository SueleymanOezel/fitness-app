import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-render'
import HelpPage from './HelpPage'
import { BEGRIFFE } from '../lib/glossary'

describe('HelpPage', () => {
  it('lists every term with the same text the "?" buttons show', () => {
    renderWithProviders(<HelpPage />)
    for (const begriff of Object.values(BEGRIFFE)) {
      expect(screen.getByText(begriff.titel)).toBeInTheDocument()
      expect(screen.getByText(begriff.text)).toBeInTheDocument()
    }
  })

  it('leads from each first step to the place where it happens', () => {
    renderWithProviders(<HelpPage />)
    expect(screen.getByRole('link', { name: 'Zur Ernährung' })).toHaveAttribute('href', '/nutrition')
    expect(screen.getByRole('link', { name: 'Zu meinen Plänen' })).toHaveAttribute('href', '/training/plans')
  })
})

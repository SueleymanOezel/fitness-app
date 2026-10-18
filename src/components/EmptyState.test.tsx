import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import EmptyState from './EmptyState'

afterEach(cleanup)

describe('EmptyState', () => {
  it('zeigt Titel, Text und Aktion in einer Karte', () => {
    render(<EmptyState titel="Kein aktiver Plan." text="Lege einen Plan an." action={<a href="/x">Anlegen</a>} />)
    expect(screen.getByRole('heading', { name: 'Kein aktiver Plan.' })).toBeInTheDocument()
    expect(screen.getByText('Lege einen Plan an.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Anlegen' })).toBeInTheDocument()
    expect(screen.getByRole('heading').closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
  })

  it('kommt ohne Text und Aktion aus', () => {
    render(<EmptyState titel="Noch nichts da." />)
    expect(screen.getByRole('heading', { name: 'Noch nichts da.' })).toBeInTheDocument()
  })
})

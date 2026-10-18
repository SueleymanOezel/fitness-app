import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import PageHero from './PageHero'

afterEach(cleanup)

describe('PageHero', () => {
  it('zeigt Label, Titel, Untertitel und Aktion in einer benannten Region', () => {
    render(
      <PageHero
        label="Heute · Plan"
        titel="Pull"
        untertitel="Letztes Training vor 2 Tagen"
        action={<button type="button">Los</button>}
      />,
    )
    const region = screen.getByRole('region', { name: 'Heute · Plan' })
    expect(region).toHaveClass('bg-surface', 'rounded-3xl')
    expect(screen.getByText('Pull')).toBeInTheDocument()
    expect(screen.getByText('Letztes Training vor 2 Tagen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Los' })).toBeInTheDocument()
  })

  it('kommt ohne Untertitel, Aside und Aktion aus und reicht Titel-Klasse und Test-ID durch', () => {
    render(<PageHero label="Gewicht" titel="82,5 kg" titelClass="text-3xl" titelTestId="wert" />)
    expect(screen.getByTestId('wert')).toHaveClass('text-3xl')
  })
})

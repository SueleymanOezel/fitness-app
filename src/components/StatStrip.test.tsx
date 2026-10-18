import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import StatStrip from './StatStrip'

afterEach(cleanup)

describe('StatStrip', () => {
  it('zeigt jede Kachel mit Label, Wert und Hinweis', () => {
    render(
      <StatStrip
        tiles={[
          { label: 'Streak', wert: '4', hinweis: '4 Tage in Folge' },
          { label: 'Gewicht', wert: '—', hinweis: 'Keine Messwerte.' },
        ]}
      />,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Streak')).toBeInTheDocument()
    expect(screen.getByText('4 Tage in Folge')).toBeInTheDocument()
    expect(screen.getByText('Keine Messwerte.')).toBeInTheDocument()
  })

  it('zeichnet einen Balken anteilig und begrenzt auf 0–100 %', () => {
    const { container } = render(
      <StatStrip
        tiles={[
          { label: 'A', wert: '1', balken: { anteil: 0.4, farbe: '#6efde6' } },
          { label: 'B', wert: '2', balken: { anteil: 3, farbe: '#4f6ca5' } },
        ]}
      />,
    )
    const fuellungen = container.querySelectorAll<HTMLElement>('[style*="width"]')
    expect(fuellungen[0].style.width).toBe('40%')
    expect(fuellungen[1].style.width).toBe('100%')
  })

  it('legt die Kachel auf eine eigene Fläche, nicht in eine Karte', () => {
    render(<StatStrip tiles={[{ label: 'A', wert: '1' }]} />)
    expect(screen.getByText('A').closest('div')).toHaveClass('bg-surface')
  })
})

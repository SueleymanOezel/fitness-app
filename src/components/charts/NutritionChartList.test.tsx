import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NutritionChartList from './NutritionChartList'
import { E1 } from '../../lib/analysis/registry'

const eintrag = (tag: number, kalorien: number) => ({
  zeitpunkt: new Date(2026, 7, tag, 12, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
})

const entries = [eintrag(23, 1800), eintrag(24, 2100)]

const auswahl = {
  auswahl: [E1],
  istGewaehlt: (id: string) => id === E1,
  umschalten: vi.fn(),
  fehler: '',
}

describe('NutritionChartList', () => {
  it('renders the charts of the given ids', async () => {
    render(
      <NutritionChartList ids={[E1]} entries={entries} sessions={[]} ziel={2000} profile={null} />,
    )
    // timeout: die Graphen haengen hinter React.lazy.
    expect(await screen.findByText('Kalorien pro Tag', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('renders no chart for an id it does not know', () => {
    // parseAuswahl verwirft unbekannte IDs bereits, aber die Liste darf an einer
    // durchgerutschten ID nicht abstuerzen.
    const { container } = render(
      <NutritionChartList ids={['E99']} entries={[]} sessions={[]} ziel={null} profile={null} />,
    )
    expect(container.querySelector('section')).toBeNull()
  })

  it('shows the checkbox only when a selection is passed', async () => {
    const { rerender } = render(
      <NutritionChartList ids={[E1]} entries={entries} sessions={[]} ziel={2000} profile={null} />,
    )
    await screen.findByText('Kalorien pro Tag', {}, { timeout: 5000 })
    expect(screen.queryByRole('checkbox')).toBeNull()

    rerender(
      <NutritionChartList
        ids={[E1]}
        entries={entries}
        sessions={[]}
        ziel={2000}
        profile={null}
        auswahl={auswahl}
      />,
    )
    expect(await screen.findByRole('checkbox', {}, { timeout: 5000 })).toBeChecked()
  })
})

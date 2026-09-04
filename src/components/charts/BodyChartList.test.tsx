import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import BodyChartList from './BodyChartList'
import { K1 } from '../../lib/analysis/registry'

const leer = {
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

const zeile = (id: string, datum: string, gewicht: number | null) => ({
  id,
  datum,
  gewicht,
  ...leer,
})

const rows = [zeile('a', '2026-08-17', 83.3), zeile('b', '2026-08-24', 82.5)]

const auswahl = {
  auswahl: [K1],
  istGewaehlt: (id: string) => id === K1,
  umschalten: vi.fn(),
  fehler: '',
}

describe('BodyChartList', () => {
  it('renders the charts of the given ids', async () => {
    render(<BodyChartList ids={[K1]} rows={rows} kalorien={[]} fotos={[]} />)
    // timeout: die Graphen haengen hinter React.lazy.
    expect(await screen.findByText('Gewichtsverlauf', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('renders no chart for an id it does not know', () => {
    // parseAuswahl verwirft unbekannte IDs bereits, aber die Liste darf an einer
    // durchgerutschten ID nicht abstuerzen.
    const { container } = render(
      <BodyChartList ids={['K99']} rows={rows} kalorien={[]} fotos={[]} />,
    )
    expect(container.querySelector('section')).toBeNull()
  })

  it('shows the checkbox only when a selection is passed', async () => {
    const { rerender } = render(<BodyChartList ids={[K1]} rows={rows} kalorien={[]} fotos={[]} />)
    await screen.findByText('Gewichtsverlauf', {}, { timeout: 5000 })
    expect(screen.queryByRole('checkbox')).toBeNull()

    rerender(<BodyChartList ids={[K1]} rows={rows} kalorien={[]} fotos={[]} auswahl={auswahl} />)
    expect(await screen.findByRole('checkbox', {}, { timeout: 5000 })).toBeChecked()
  })
})

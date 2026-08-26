import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TrainingChartList from './TrainingChartList'
import { T1 } from '../../lib/analysis/registry'

const session = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00Z`,
  beendet_am: `${tag}T19:00:00Z`,
  gesamt_kalorien: 300,
})

const auswahl = {
  auswahl: [T1],
  istGewaehlt: (id: string) => id === T1,
  umschalten: vi.fn(),
  fehler: '',
}

describe('TrainingChartList', () => {
  it('renders the charts of the given ids', async () => {
    render(
      <TrainingChartList
        ids={[T1]}
        sessions={[session('s1', '2026-08-17'), session('s2', '2026-08-24')]}
        sets={[]}
      />,
    )
    // timeout: die Graphen haengen hinter React.lazy.
    expect(await screen.findByText('Trainingsfrequenz', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('renders no chart for an id it does not know', async () => {
    // parseAuswahl verwirft unbekannte IDs bereits, aber die Liste darf an einer
    // durchgerutschten ID nicht abstuerzen.
    const { container } = render(
      <TrainingChartList ids={['T99']} sessions={[session('s1', '2026-08-17')]} sets={[]} />,
    )
    expect(container.querySelector('section')).toBeNull()
  })

  it('shows the checkbox only when a selection is passed', async () => {
    const { rerender } = render(
      <TrainingChartList ids={[T1]} sessions={[session('s1', '2026-08-17')]} sets={[]} />,
    )
    await screen.findByText('Trainingsfrequenz', {}, { timeout: 5000 })
    expect(screen.queryByRole('checkbox')).toBeNull()

    rerender(
      <TrainingChartList
        ids={[T1]}
        sessions={[session('s1', '2026-08-17')]}
        sets={[]}
        auswahl={auswahl}
      />,
    )
    expect(await screen.findByRole('checkbox', {}, { timeout: 5000 })).toBeChecked()
  })
})

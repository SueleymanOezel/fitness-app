import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import PhotoTimeline from './PhotoTimeline'

const leer = {
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

const zeile = (datum: string, gewicht: number | null) => ({ id: datum, datum, gewicht, ...leer })

const foto = (id: string, datum: string, url: string | null = `https://signed/${id}`) => ({
  id,
  datum,
  pfad: `u1/${id}.jpg`,
  url,
})

describe('PhotoTimeline', () => {
  it('shows each photo with its date and the weight of that day', () => {
    render(
      <PhotoTimeline
        fotos={[foto('p1', '2026-08-24')]}
        rows={[zeile('2026-08-24', 82.5)]}
      />,
    )
    expect(screen.getByText('24.08.2026')).toBeInTheDocument()
    expect(screen.getByText('82,5 kg')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Fortschrittsfoto vom 24.08.2026' })).toHaveAttribute(
      'src',
      'https://signed/p1',
    )
  })

  it('says so when no weight was recorded that day', () => {
    // Kein Absturz und keine leere Zeile: das Foto bleibt sichtbar.
    render(<PhotoTimeline fotos={[foto('p1', '2026-08-24')]} rows={[]} />)
    expect(screen.getByText('kein Gewicht erfasst')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Fortschrittsfoto vom 24.08.2026' })).toBeInTheDocument()
  })

  it('says so when the signed link is missing instead of showing a broken image', () => {
    render(<PhotoTimeline fotos={[foto('p1', '2026-08-24', null)]} rows={[]} />)
    expect(screen.getByText('Bild nicht verfügbar')).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('states the empty case without photos', () => {
    render(<PhotoTimeline fotos={[]} rows={[zeile('2026-08-24', 82.5)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})

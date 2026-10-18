import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ProgressRing from './ProgressRing'

afterEach(cleanup)

const LAENGE = 2 * Math.PI * 30

describe('ProgressRing', () => {
  it('hat eine Textalternative', () => {
    render(<ProgressRing anteil={0.5} label="640 kcal übrig, Ziel 2000 kcal" />)
    expect(screen.getByRole('img', { name: '640 kcal übrig, Ziel 2000 kcal' })).toBeInTheDocument()
  })

  it('füllt den Ring anteilig', () => {
    const { container } = render(<ProgressRing anteil={0.25} label="x" />)
    const fortschritt = container.querySelector('.ring-fill') as SVGElement
    expect(parseFloat(fortschritt.getAttribute('stroke-dashoffset') ?? '')).toBeCloseTo(LAENGE * 0.75)
  })

  it('begrenzt auf 0 bis 1', () => {
    const { container } = render(<ProgressRing anteil={7} label="x" />)
    expect(parseFloat((container.querySelector('.ring-fill') as SVGElement).getAttribute('stroke-dashoffset') ?? '')).toBeCloseTo(0)
  })

  it('zeichnet bei 0 keinen Fortschrittsbogen (kein Punkt durch runde Kappe)', () => {
    const { container } = render(<ProgressRing anteil={0} label="x" />)
    expect(container.querySelector('.ring-fill')).toBeNull()
  })
})

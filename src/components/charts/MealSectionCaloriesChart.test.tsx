import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MealSectionCaloriesChart from './MealSectionCaloriesChart'
import type { MealSectionNames } from '../../lib/meal-sections'

const namen: MealSectionNames = {
  mahlzeit_1_name: 'Frühstück',
  mahlzeit_2_name: 'Mittagessen',
  mahlzeit_3_name: 'Abendessen',
  mahlzeit_4_name: 'Snacks',
  mahlzeit_5_name: null,
  mahlzeit_6_name: null,
}

const eintrag = (mahlzeit: number, kalorien: number) => ({
  zeitpunkt: new Date(2026, 7, 24, 8, 0).toISOString(),
  menge: 100,
  mahlzeit,
  products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
})

describe('MealSectionCaloriesChart', () => {
  it('draws one bar per section that actually has calories', () => {
    const { container } = render(
      <MealSectionCaloriesChart entries={[eintrag(1, 300), eintrag(2, 200)]} profile={namen} />,
    )
    // Vier benannte Abschnitte, aber nur zwei mit Kalorien groesser null:
    // Abendessen und Snacks blieben leer, und Recharts zeichnet fuer einen
    // Nullwert keine Marke.
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
  })

  it('states the empty case without a profile yet', () => {
    render(<MealSectionCaloriesChart entries={[eintrag(1, 300)]} profile={null} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('states the empty case without any calories in range', () => {
    render(<MealSectionCaloriesChart entries={[]} profile={namen} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})

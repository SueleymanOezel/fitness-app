import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import FoodEntryList from './FoodEntryList'
import type { FoodEntry } from '../hooks/use-food-entries'

const entries: FoodEntry[] = [
  {
    id: 'e1',
    menge: 150,
    zeitpunkt: '2026-08-18T12:00:00Z',
    products: { name: 'Testprodukt', kalorien: 100, eiweiss: 1, fett: 2, kohlenhydrate: 3 },
  },
]

describe('FoodEntryList', () => {
  it('shows a placeholder when there are no entries', () => {
    render(<FoodEntryList entries={[]} onUpdateMenge={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Noch keine Einträge heute.')).toBeInTheDocument()
  })

  it('renders each entry with its product name and menge', () => {
    render(<FoodEntryList entries={entries} onUpdateMenge={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Testprodukt')).toBeInTheDocument()
    expect(screen.getByLabelText('Menge (g) für Testprodukt')).toHaveValue(150)
  })

  it('calls onUpdateMenge when the menge input changes', () => {
    const onUpdateMenge = vi.fn()
    render(<FoodEntryList entries={entries} onUpdateMenge={onUpdateMenge} onDelete={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Menge (g) für Testprodukt'), { target: { value: '200' } })

    expect(onUpdateMenge).toHaveBeenCalledWith('e1', 200)
  })

  it('calls onDelete when the delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<FoodEntryList entries={entries} onUpdateMenge={vi.fn()} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    expect(onDelete).toHaveBeenCalledWith('e1')
  })
})

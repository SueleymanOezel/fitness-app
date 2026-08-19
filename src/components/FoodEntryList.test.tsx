import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import FoodEntryList from './FoodEntryList'
import type { FoodEntry } from '../hooks/use-food-entries'

const entries: FoodEntry[] = [
  {
    id: 'e1',
    menge: 150,
    zeitpunkt: '2026-08-19T06:30:00.000Z',
    product_id: 'p1',
    products: {
      id: 'p1',
      name: 'Testprodukt',
      barcode: null,
      created_by: 'u1',
      kalorien: 100,
      eiweiss: 1,
      fett: 2,
      kohlenhydrate: 3,
    },
  },
]

describe('FoodEntryList', () => {
  it('shows a placeholder when there are no entries', () => {
    render(
      <FoodEntryList
        entries={[]}
        userId="u1"
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    expect(screen.getByText('Noch keine Einträge heute.')).toBeInTheDocument()
  })

  it('shows the stored values without an input field', () => {
    render(
      <FoodEntryList
        entries={entries}
        userId="u1"
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByText('Testprodukt')).toBeInTheDocument()
    expect(screen.getByText(/150 g/)).toBeInTheDocument()
    // The amount was silently editable before and nobody found it.
    expect(screen.queryByLabelText('Menge (g) für Testprodukt')).not.toBeInTheDocument()
  })

  it('opens the edit form on request and closes it again', () => {
    render(
      <FoodEntryList
        entries={entries}
        userId="u1"
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }))
    expect(screen.getByLabelText('Menge (g)')).toHaveValue(150)

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(screen.queryByLabelText('Menge (g)')).not.toBeInTheDocument()
  })

  it('calls onDelete when the delete button is clicked', () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <FoodEntryList
        entries={entries}
        userId="u1"
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={onDelete}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    expect(onDelete).toHaveBeenCalledWith('e1')
  })
})

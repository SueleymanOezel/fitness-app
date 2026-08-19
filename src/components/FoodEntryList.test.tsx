import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import FoodEntryList from './FoodEntryList'
import type { FoodEntry } from '../hooks/use-food-entries'

const entries: FoodEntry[] = [
  {
    id: 'e1',
    menge: 150,
    zeitpunkt: '2026-08-18T12:00:00Z',
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
    render(<FoodEntryList entries={[]} onUpdateEntry={vi.fn().mockResolvedValue(undefined)} onDelete={vi.fn().mockResolvedValue(undefined)} />)
    expect(screen.getByText('Noch keine Einträge heute.')).toBeInTheDocument()
  })

  it('renders each entry with its product name and menge', () => {
    render(<FoodEntryList entries={entries} onUpdateEntry={vi.fn().mockResolvedValue(undefined)} onDelete={vi.fn().mockResolvedValue(undefined)} />)
    expect(screen.getByText('Testprodukt')).toBeInTheDocument()
    expect(screen.getByLabelText('Menge (g) für Testprodukt')).toHaveValue(150)
  })

  it('calls onUpdateEntry with the edited value once the input is left', () => {
    const onUpdateEntry = vi.fn().mockResolvedValue(undefined)
    render(<FoodEntryList entries={entries} onUpdateEntry={onUpdateEntry} onDelete={vi.fn().mockResolvedValue(undefined)} />)
    const input = screen.getByLabelText('Menge (g) für Testprodukt')

    fireEvent.change(input, { target: { value: '200' } })
    expect(onUpdateEntry).not.toHaveBeenCalled()

    fireEvent.blur(input)
    expect(onUpdateEntry).toHaveBeenCalledWith('e1', { menge: 200 })
  })

  it('never persists an intermediate or empty value while retyping the menge', () => {
    const onUpdateEntry = vi.fn().mockResolvedValue(undefined)
    render(<FoodEntryList entries={entries} onUpdateEntry={onUpdateEntry} onDelete={vi.fn().mockResolvedValue(undefined)} />)
    const input = screen.getByLabelText('Menge (g) für Testprodukt')

    // Clearing the field character by character: Number('') is 0, not NaN, so a
    // per-keystroke save would write menge = 0 and lose the entry's real value.
    fireEvent.change(input, { target: { value: '15' } })
    fireEvent.change(input, { target: { value: '1' } })
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)

    expect(onUpdateEntry).not.toHaveBeenCalled()
    expect(input).toHaveValue(150)
  })

  it('restores the stored value and warns when the update is rejected', async () => {
    const onUpdateEntry = vi.fn().mockRejectedValue(new Error('update failed'))
    render(<FoodEntryList entries={entries} onUpdateEntry={onUpdateEntry} onDelete={vi.fn().mockResolvedValue(undefined)} />)
    const input = screen.getByLabelText('Menge (g) für Testprodukt')

    fireEvent.change(input, { target: { value: '200' } })
    fireEvent.blur(input)

    // Leaving 200 on screen after a failed write would show a value that is not stored.
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('nicht gespeichert'))
    expect(input).toHaveValue(150)
  })

  it('calls onDelete when the delete button is clicked', () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(<FoodEntryList entries={entries} onUpdateEntry={vi.fn().mockResolvedValue(undefined)} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    expect(onDelete).toHaveBeenCalledWith('e1')
  })
})

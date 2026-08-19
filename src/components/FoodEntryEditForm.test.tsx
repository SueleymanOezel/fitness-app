import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FoodEntry } from '../hooks/use-food-entries'

const mockSaveProductEdit = vi.fn()
vi.mock('../lib/product-edit', () => ({
  saveProductEdit: (...args: unknown[]) => mockSaveProductEdit(...args),
}))

vi.mock('./ProductPicker', () => ({
  default: ({ onPicked }: { onPicked: (product: unknown) => void }) => (
    <button type="button" onClick={() => onPicked({ id: 'p2', name: 'Anderes Produkt' })}>
      Anderes Produkt wählen
    </button>
  ),
}))

const entry: FoodEntry = {
  id: 'e1',
  menge: 150,
  zeitpunkt: '2026-08-19T06:30:00.000Z',
  product_id: 'p1',
  products: {
    id: 'p1',
    name: 'Testprodukt',
    barcode: '4001234567890',
    created_by: 'u1',
    kalorien: 100,
    eiweiss: 1,
    fett: 2,
    kohlenhydrate: 3,
  },
}

describe('FoodEntryEditForm', () => {
  beforeEach(() => {
    mockSaveProductEdit.mockReset()
    mockSaveProductEdit.mockImplementation(async (_product, patch) => ({ id: 'p1', ...patch }))
  })

  it('fills the form with the stored values', async () => {
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(
      <FoodEntryEditForm entry={entry} userId="u1" onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByLabelText('Menge (g)')).toHaveValue(150)
    expect(screen.getByLabelText('Kalorien (kcal)')).toHaveValue(100)
  })

  it('saves amount and nutrients together', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '200' } })
    fireEvent.change(screen.getByLabelText('Kalorien (kcal)'), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(mockSaveProductEdit).toHaveBeenCalledWith(
      { id: 'p1', created_by: 'u1' },
      expect.objectContaining({ kalorien: 120, name: 'Testprodukt' }),
      'u1',
    )
    expect(onSave).toHaveBeenCalledWith('e1', expect.objectContaining({ menge: 200 }))
  })

  it('remaps the entry when the product is swapped', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" onSave={onSave} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Anderes Produkt wählen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('e1', expect.objectContaining({ product_id: 'p2' })),
    )
    // A swapped product is not the one whose nutrients this form was editing.
    expect(mockSaveProductEdit).not.toHaveBeenCalled()
  })

  it('rejects an amount of zero without writing', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" onSave={onSave} onClose={vi.fn()} />)

    // Number('') is 0, not NaN — the guard has to catch it.
    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(screen.getByRole('alert')).toHaveTextContent('größer als 0')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('rejects implausible nutrients without writing', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Kalorien (kcal)'), { target: { value: '-300' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(screen.getByRole('alert')).toHaveTextContent('plausible Werte')
    expect(onSave).not.toHaveBeenCalled()
    expect(mockSaveProductEdit).not.toHaveBeenCalled()
  })

  it('reports a failed save instead of closing', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('denied'))
    const onClose = vi.fn()
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" onSave={onSave} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('konnte nicht gespeichert werden'),
    )
    expect(onClose).not.toHaveBeenCalled()
  })
})

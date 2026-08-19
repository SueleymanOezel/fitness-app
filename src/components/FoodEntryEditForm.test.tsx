import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { FoodEntry } from '../hooks/use-food-entries'

// Minimal ambient type for the Node `process` global (to pin the timezone in
// the zeitpunkt-conversion test below). The project's browser-only tsconfig
// has no @types/node.
declare const process: { env: Record<string, string | undefined> }

const mockSaveProductEdit = vi.fn()
vi.mock('../lib/product-edit', () => ({
  saveProductEdit: (...args: unknown[]) => mockSaveProductEdit(...args),
}))

vi.mock('./ProductPicker', () => ({
  default: ({
    onPicked,
    onCancel,
  }: {
    onPicked: (product: unknown) => void
    onCancel: () => void
  }) => (
    <div>
      <button type="button" onClick={() => onPicked({ id: 'p2', name: 'Anderes Produkt' })}>
        Produkt übernehmen
      </button>
      <button type="button" onClick={onCancel}>
        Picker abbrechen
      </button>
    </div>
  ),
}))

const entry: FoodEntry = {
  id: 'e1',
  menge: 150,
  zeitpunkt: '2026-08-19T06:30:00.000Z',
  product_id: 'p1',
  mahlzeit: null,
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

const sections = [
  { slot: 1, name: 'Frühstück' },
  { slot: 2, name: 'Mittagessen' },
]

describe('FoodEntryEditForm', () => {
  beforeEach(() => {
    mockSaveProductEdit.mockReset()
    mockSaveProductEdit.mockImplementation(async (_product, patch) => ({ id: 'p1', ...patch }))
  })

  it('fills the form with the stored values', async () => {
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(
      <FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByLabelText('Menge (g)')).toHaveValue(150)
    expect(screen.getByLabelText('Kalorien (kcal)')).toHaveValue(100)
  })

  it('saves amount and nutrients together', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={vi.fn()} />)

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

  it('does not write the product when only the amount changes on a foreign product', async () => {
    const foreignEntry: FoodEntry = {
      ...entry,
      products: { ...entry.products!, created_by: 'someone-else' },
    }
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={foreignEntry} userId="u1" sections={sections} onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(mockSaveProductEdit).not.toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledWith('e1', expect.objectContaining({ menge: 200 }))
    expect(onSave.mock.calls[0][1]).not.toHaveProperty('product_id')
  })

  it('does not write the product when only the amount changes on an own product', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(mockSaveProductEdit).not.toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledWith('e1', expect.objectContaining({ menge: 200 }))
  })

  it('remaps the entry when the product is swapped', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Anderes Produkt wählen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Produkt übernehmen' }))
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
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={vi.fn()} />)

    // Number('') is 0, not NaN — the guard has to catch it.
    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(screen.getByRole('alert')).toHaveTextContent('größer als 0')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('rejects implausible nutrients without writing', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={vi.fn()} />)

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
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('konnte nicht gespeichert werden'),
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it('remaps the entry when saveProductEdit returns a copy with a different id', async () => {
    // Correcting the nutrients of someone else's product makes saveProductEdit
    // insert a copy under a different id — the entry must follow it, without
    // this counting as a product swap.
    mockSaveProductEdit.mockImplementation(async (_product, patch) => ({ id: 'p2', ...patch }))
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={vi.fn()} />)

    // Only an actual nutrient correction takes the saveProductEdit path.
    fireEvent.change(screen.getByLabelText('Kalorien (kcal)'), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('e1', expect.objectContaining({ product_id: 'p2' })),
    )
  })

  it('reports a failed product save instead of closing', async () => {
    mockSaveProductEdit.mockRejectedValue(new Error('denied'))
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={onClose} />)

    // Only an actual nutrient correction takes the saveProductEdit path.
    fireEvent.change(screen.getByLabelText('Kalorien (kcal)'), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Produkt konnte nicht gespeichert werden'),
    )
    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  // I1: an emptied datetime-local field must not throw a TypeError deep inside
  // fromLocalInputValue — it has to surface as the same kind of user-facing
  // error as an invalid amount.
  it('rejects an emptied zeitpunkt without throwing', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Zeitpunkt'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Zeitpunkt')
    expect(onSave).not.toHaveBeenCalled()
  })

  // I2: the name field has no maxLength, so a pasted block of text must still
  // be truncated before it reaches saveProductEdit — same limit as
  // ManualProductForm and open-food-facts.ts.
  it('truncates an overlong product name before saving', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={vi.fn()} />)

    const longName = 'x'.repeat(250)
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: longName } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(mockSaveProductEdit).toHaveBeenCalled())
    const patchArg = mockSaveProductEdit.mock.calls[0][1] as { name: string }
    expect(patchArg.name).toHaveLength(200)
  })

  // I3: a retry after a failed onSave must not write a second copy of a
  // foreign product — the first saveProductEdit result has to be reused.
  it('does not call saveProductEdit again when retrying after a failed onSave', async () => {
    mockSaveProductEdit.mockResolvedValue({
      id: 'p2',
      name: 'Testprodukt',
      kalorien: 120,
      eiweiss: 1,
      fett: 2,
      kohlenhydrate: 3,
    })
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Kalorien (kcal)'), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))

    expect(mockSaveProductEdit).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][1]).toMatchObject({ product_id: 'p2' })
    expect(onSave.mock.calls[1][1]).toMatchObject({ product_id: 'p2' })
  })

  // M1: datetime-local has minute resolution — writing zeitpunkt on every
  // save would silently zero out seconds/milliseconds even when the user
  // never touched the field.
  it('omits zeitpunkt from the patch when only the amount changed', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][1]).not.toHaveProperty('zeitpunkt')
  })

  it('moves the entry to another section', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(
      <FoodEntryEditForm
        entry={{ ...entry, mahlzeit: 1 }}
        userId="u1"
        sections={sections}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Mahlzeit'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('e1', expect.objectContaining({ mahlzeit: 2 })),
    )
  })

  it('files an unassigned entry into a section', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(
      <FoodEntryEditForm
        entry={{ ...entry, mahlzeit: null }}
        userId="u1"
        sections={sections}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Mahlzeit')).toHaveValue('')
    fireEvent.change(screen.getByLabelText('Mahlzeit'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('e1', expect.objectContaining({ mahlzeit: 1 })),
    )
  })

  it('leaves the section out of the patch when it did not change', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(
      <FoodEntryEditForm
        entry={{ ...entry, mahlzeit: 1 }}
        userId="u1"
        sections={sections}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][1]).not.toHaveProperty('mahlzeit')
  })
})

// I5: the field → fromLocalInputValue → patch.zeitpunkt chain had no test at
// all. Pin a non-UTC zone so a naive UTC implementation would fail here.
describe('FoodEntryEditForm zeitpunkt timezone handling', () => {
  const originalTz = process.env.TZ

  beforeEach(() => {
    mockSaveProductEdit.mockReset()
    mockSaveProductEdit.mockImplementation(async (_product, patch) => ({ id: 'p1', ...patch }))
    process.env.TZ = 'Europe/Berlin'
  })

  afterEach(() => {
    process.env.TZ = originalTz
  })

  it('stores a changed zeitpunkt as UTC in the patch', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const { default: FoodEntryEditForm } = await import('./FoodEntryEditForm')
    render(<FoodEntryEditForm entry={entry} userId="u1" sections={sections} onSave={onSave} onClose={vi.fn()} />)

    // entry.zeitpunkt = '2026-08-19T06:30:00.000Z' = 08:30 Berlin summer time.
    fireEvent.change(screen.getByLabelText('Zeitpunkt'), { target: { value: '2026-08-19T09:15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({ zeitpunkt: '2026-08-19T07:15:00.000Z' }),
    )
  })
})

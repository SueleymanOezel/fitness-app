import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockFindOrFetch = vi.fn()
vi.mock('../lib/product-lookup', () => ({
  findOrFetchProductByBarcode: (barcode: string) => mockFindOrFetch(barcode),
}))

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- placeholder matches BarcodeScanner's onDetected signature until the mock overwrites it
const mockOnDetected = { current: (_barcode: string) => {} }
vi.mock('./BarcodeScanner', () => ({
  default: ({ onDetected, onClose }: { onDetected: (barcode: string) => void; onClose: () => void }) => {
    mockOnDetected.current = onDetected
    return (
      <div>
        Scanner
        <button type="button" onClick={onClose}>
          Abbrechen
        </button>
      </div>
    )
  },
}))

vi.mock('./ManualProductForm', () => ({
  default: ({ onCreated }: { onCreated: (product: unknown) => void }) => (
    <button type="button" onClick={() => onCreated({ id: 'p9', name: 'Selbst angelegt' })}>
      Produkt speichern
    </button>
  ),
}))

const product = { id: 'p1', name: 'Gefundenes Produkt', barcode: '4001234567890', kalorien: 200 }

describe('ProductPicker', () => {
  beforeEach(() => {
    mockFindOrFetch.mockReset()
  })

  it('reports the product found for a typed barcode', async () => {
    mockFindOrFetch.mockResolvedValue(product)
    const onPicked = vi.fn()

    const { default: ProductPicker } = await import('./ProductPicker')
    render(<ProductPicker onPicked={onPicked} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Barcode-Nummer eingeben'), {
      target: { value: '4001234567890' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))

    await waitFor(() => expect(onPicked).toHaveBeenCalledWith(product))
  })

  it('reports a manually created product', async () => {
    const onPicked = vi.fn()

    const { default: ProductPicker } = await import('./ProductPicker')
    render(<ProductPicker onPicked={onPicked} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Manuell hinzufügen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Produkt speichern' }))

    await waitFor(() =>
      expect(onPicked).toHaveBeenCalledWith({ id: 'p9', name: 'Selbst angelegt' }),
    )
  })

  it('rejects a typed value that is not a barcode without looking it up', async () => {
    const { default: ProductPicker } = await import('./ProductPicker')
    render(<ProductPicker onPicked={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Barcode-Nummer eingeben'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))

    expect(screen.getByRole('alert')).toHaveTextContent('8–14 Ziffern')
    expect(mockFindOrFetch).not.toHaveBeenCalled()
  })

  it('falls back to the manual form when the barcode is unknown', async () => {
    mockFindOrFetch.mockResolvedValue(null)

    const { default: ProductPicker } = await import('./ProductPicker')
    render(<ProductPicker onPicked={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Barcode scannen' }))
    mockOnDetected.current('4001234567890')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Produkt speichern' })).toBeInTheDocument(),
    )
  })

  it('clears a stale error message when returning to idle via the scanner close button', async () => {
    const { default: ProductPicker } = await import('./ProductPicker')
    render(<ProductPicker onPicked={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Barcode-Nummer eingeben'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))
    expect(screen.getByRole('alert')).toHaveTextContent('8–14 Ziffern')

    fireEvent.click(screen.getByRole('button', { name: 'Barcode scannen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

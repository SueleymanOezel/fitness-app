import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockFindOrFetch = vi.fn()
vi.mock('../lib/product-lookup', () => ({
  findOrFetchProductByBarcode: (barcode: string) => mockFindOrFetch(barcode),
}))

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- placeholder matches BarcodeScanner's onDetected signature until the mock overwrites it
const mockOnDetected = { current: (_barcode: string) => {} }
vi.mock('./BarcodeScanner', () => ({
  default: ({ onDetected }: { onDetected: (barcode: string) => void }) => {
    mockOnDetected.current = onDetected
    return <div>Scanner aktiv</div>
  },
}))

vi.mock('./ManualProductForm', () => ({
  default: ({ onCreated }: { onCreated: (product: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onCreated({ id: 'p-new', name: 'Manuell', kalorien: 100, barcode: null, eiweiss: null, fett: null, kohlenhydrate: null })}
    >
      Simulierte manuelle Erstellung
    </button>
  ),
}))

const product = {
  id: 'p1',
  name: 'Gefundenes Produkt',
  barcode: '4001234567890',
  kalorien: 200,
  eiweiss: 1,
  fett: 2,
  kohlenhydrate: 3,
}

describe('AddEntryFlow', () => {
  beforeEach(() => {
    mockFindOrFetch.mockReset()
  })

  it('opens the scanner, finds a product, and adds it with the entered quantity', async () => {
    mockFindOrFetch.mockResolvedValue(product)
    const onAdd = vi.fn().mockResolvedValue(undefined)

    const { default: AddEntryFlow } = await import('./AddEntryFlow')
    render(<AddEntryFlow onAdd={onAdd} />)

    fireEvent.click(screen.getByRole('button', { name: 'Barcode scannen' }))
    expect(screen.getByText('Scanner aktiv')).toBeInTheDocument()

    mockOnDetected.current('4001234567890')

    await waitFor(() => expect(screen.getByText('Gefundenes Produkt')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }))

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('p1', 250))
  })

  it('falls back to the manual form when the barcode is not found', async () => {
    mockFindOrFetch.mockResolvedValue(null)
    const onAdd = vi.fn().mockResolvedValue(undefined)

    const { default: AddEntryFlow } = await import('./AddEntryFlow')
    render(<AddEntryFlow onAdd={onAdd} />)

    fireEvent.click(screen.getByRole('button', { name: 'Barcode scannen' }))
    mockOnDetected.current('9999999999999')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Simulierte manuelle Erstellung' })).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Simulierte manuelle Erstellung' }))

    await waitFor(() => expect(screen.getByText('Manuell')).toBeInTheDocument())
  })

  it('opens the manual form directly via the fallback button', async () => {
    const { default: AddEntryFlow } = await import('./AddEntryFlow')
    render(<AddEntryFlow onAdd={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Manuell hinzufügen' }))

    expect(screen.getByRole('button', { name: 'Simulierte manuelle Erstellung' })).toBeInTheDocument()
    expect(mockFindOrFetch).not.toHaveBeenCalled()
  })
})

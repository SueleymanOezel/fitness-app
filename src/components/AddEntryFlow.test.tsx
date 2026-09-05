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

  it('falls back to the manual form when the product lookup rejects', async () => {
    mockFindOrFetch.mockRejectedValue(new Error('network error'))
    const onAdd = vi.fn().mockResolvedValue(undefined)

    const { default: AddEntryFlow } = await import('./AddEntryFlow')
    render(<AddEntryFlow onAdd={onAdd} />)

    fireEvent.click(screen.getByRole('button', { name: 'Barcode scannen' }))
    mockOnDetected.current('4001234567890')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Simulierte manuelle Erstellung' })).toBeInTheDocument(),
    )
    expect(screen.queryByText('Produkt wird gesucht…')).not.toBeInTheDocument()
  })

  it('shows an error and keeps the confirm form when adding fails', async () => {
    mockFindOrFetch.mockResolvedValue(product)
    const onAdd = vi.fn().mockRejectedValue(new Error('save failed'))

    const { default: AddEntryFlow } = await import('./AddEntryFlow')
    render(<AddEntryFlow onAdd={onAdd} />)

    fireEvent.click(screen.getByRole('button', { name: 'Barcode scannen' }))
    mockOnDetected.current('4001234567890')

    await waitFor(() => expect(screen.getByText('Gefundenes Produkt')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.'),
    )
    expect(screen.getByText('Gefundenes Produkt')).toBeInTheDocument()
  })

  it('looks up a barcode that was typed instead of scanned', async () => {
    mockFindOrFetch.mockResolvedValue(product)

    const { default: AddEntryFlow } = await import('./AddEntryFlow')
    render(<AddEntryFlow onAdd={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.change(screen.getByLabelText('Barcode-Nummer eingeben'), {
      target: { value: '8076809580144' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))

    await waitFor(() => expect(screen.getByText('Gefundenes Produkt')).toBeInTheDocument())
    expect(mockFindOrFetch).toHaveBeenCalledWith('8076809580144')
  })

  it('rejects a typed barcode that is not 8-14 digits without looking it up', async () => {
    const { default: AddEntryFlow } = await import('./AddEntryFlow')
    render(<AddEntryFlow onAdd={vi.fn().mockResolvedValue(undefined)} />)

    fireEvent.change(screen.getByLabelText('Barcode-Nummer eingeben'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))

    expect(screen.getByRole('alert')).toHaveTextContent('8–14 Ziffern')
    expect(mockFindOrFetch).not.toHaveBeenCalled()
  })

  it('calls onCancel when Abbrechen is clicked on the idle picker screen', async () => {
    const onCancel = vi.fn()
    const { default: AddEntryFlow } = await import('./AddEntryFlow')
    render(<AddEntryFlow onAdd={vi.fn().mockResolvedValue(undefined)} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(onCancel).toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

const mockFrom = vi.fn()
const mockGetUser = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: { getUser: () => mockGetUser() },
  },
}))

const createdProduct = {
  id: 'p1',
  name: 'Neues Produkt',
  barcode: '4001234567890',
  kalorien: 250,
  eiweiss: 10,
  fett: 5,
  kohlenhydrate: 30,
}

describe('ManualProductForm', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockGetUser.mockReset()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
  })

  it('shows a validation error when name or kalorien are missing', async () => {
    const { default: ManualProductForm } = await import('./ManualProductForm')
    render(<ManualProductForm onCreated={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Produkt speichern' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Name und Kalorien')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('inserts the product with the given barcode and calls onCreated', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: createdProduct }))
    const onCreated = vi.fn()

    const { default: ManualProductForm } = await import('./ManualProductForm')
    render(<ManualProductForm barcode="4001234567890" onCreated={onCreated} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Neues Produkt' } })
    fireEvent.change(screen.getByLabelText('Kalorien (kcal)'), { target: { value: '250' } })
    fireEvent.click(screen.getByRole('button', { name: 'Produkt speichern' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(createdProduct))

    const builder = mockFrom.mock.results[0].value
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Neues Produkt', barcode: '4001234567890', kalorien: 250, created_by: 'u1' }),
    )
  })

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const { default: ManualProductForm } = await import('./ManualProductForm')
    render(<ManualProductForm onCreated={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(onCancel).toHaveBeenCalled()
  })
})

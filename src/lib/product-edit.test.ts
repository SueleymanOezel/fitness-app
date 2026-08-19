import { beforeEach, describe, expect, it, vi } from 'vitest'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder = {
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('./supabase', () => ({ supabase: { from: (table: string) => mockFrom(table) } }))

const patch = { name: 'Haferflocken', kalorien: 350, eiweiss: 13, fett: 7, kohlenhydrate: 59 }

describe('saveProductEdit', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('updates the product in place when it belongs to the user', async () => {
    const updated = { id: 'p1', barcode: '4001234567890', ...patch }
    const builder = createQueryBuilder({ data: updated })
    mockFrom.mockReturnValue(builder)

    const { saveProductEdit } = await import('./product-edit')
    const result = await saveProductEdit({ id: 'p1', created_by: 'u1' }, patch, 'u1')

    expect(result).toEqual(updated)
    expect(builder.update).toHaveBeenCalledWith(patch)
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1')
    expect(builder.insert).not.toHaveBeenCalled()
  })

  it('copies the product instead of overwriting when it belongs to someone else', async () => {
    const copy = { id: 'p2', barcode: null, ...patch }
    const builder = createQueryBuilder({ data: copy })
    mockFrom.mockReturnValue(builder)

    const { saveProductEdit } = await import('./product-edit')
    const result = await saveProductEdit({ id: 'p1', created_by: 'someone-else' }, patch, 'u1')

    expect(result).toEqual(copy)
    // The shared row must stay untouched, and the copy carries no barcode:
    // products_barcode_unique is global, two rows cannot share one.
    expect(builder.update).not.toHaveBeenCalled()
    expect(builder.insert).toHaveBeenCalledWith({ ...patch, barcode: null, created_by: 'u1' })
  })

  it('treats a product without an owner as someone else\'s', async () => {
    const copy = { id: 'p2', barcode: null, ...patch }
    const builder = createQueryBuilder({ data: copy })
    mockFrom.mockReturnValue(builder)

    const { saveProductEdit } = await import('./product-edit')
    await saveProductEdit({ id: 'p1', created_by: null }, patch, 'u1')

    expect(builder.insert).toHaveBeenCalled()
    expect(builder.update).not.toHaveBeenCalled()
  })

  it('throws when the write is rejected instead of reporting success', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'denied' } }))

    const { saveProductEdit } = await import('./product-edit')
    await expect(saveProductEdit({ id: 'p1', created_by: 'u1' }, patch, 'u1')).rejects.toThrow()
  })
})

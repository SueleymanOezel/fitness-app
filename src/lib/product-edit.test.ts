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

const patch = {
  name: 'Haferflocken',
  kalorien: 350,
  eiweiss: 13,
  fett: 7,
  kohlenhydrate: 59,
  ballaststoffe: 10,
  zucker: 1,
  salz: 0,
}

describe('saveProductEdit', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('updates the product in place when it belongs to the user and has no barcode', async () => {
    const updated = { id: 'p1', barcode: null, ...patch }
    const builder = createQueryBuilder({ data: updated })
    mockFrom.mockReturnValue(builder)

    const { saveProductEdit } = await import('./product-edit')
    const result = await saveProductEdit({ id: 'p1', created_by: 'u1', barcode: null }, patch, 'u1')

    expect(result).toEqual(updated)
    expect(builder.update).toHaveBeenCalledWith(patch)
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1')
    expect(builder.insert).not.toHaveBeenCalled()
  })

  it('copies instead of overwriting when the product has a barcode, even if it belongs to the user', async () => {
    // products_update_own (RLS) rejects an in-place update once a barcode is
    // set: a barcode makes the row shared community data (Open Food Facts
    // cache or a manually entered but barcode-carrying product), and an
    // owner's edit must not silently rewrite it for every future scanner.
    const copy = { id: 'p2', barcode: null, ...patch }
    const builder = createQueryBuilder({ data: copy })
    mockFrom.mockReturnValue(builder)

    const { saveProductEdit } = await import('./product-edit')
    const result = await saveProductEdit(
      { id: 'p1', created_by: 'u1', barcode: '4001234567890' },
      patch,
      'u1',
    )

    expect(result).toEqual(copy)
    expect(builder.update).not.toHaveBeenCalled()
    expect(builder.insert).toHaveBeenCalledWith({ ...patch, barcode: null, created_by: 'u1' })
  })

  it('copies the product instead of overwriting when it belongs to someone else', async () => {
    const copy = { id: 'p2', barcode: null, ...patch }
    const builder = createQueryBuilder({ data: copy })
    mockFrom.mockReturnValue(builder)

    const { saveProductEdit } = await import('./product-edit')
    const result = await saveProductEdit(
      { id: 'p1', created_by: 'someone-else', barcode: null },
      patch,
      'u1',
    )

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
    await saveProductEdit({ id: 'p1', created_by: null, barcode: null }, patch, 'u1')

    expect(builder.insert).toHaveBeenCalled()
    expect(builder.update).not.toHaveBeenCalled()
  })

  it('throws when the write is rejected instead of reporting success', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'denied' } }))

    const { saveProductEdit } = await import('./product-edit')
    await expect(
      saveProductEdit({ id: 'p1', created_by: 'u1', barcode: null }, patch, 'u1'),
    ).rejects.toThrow()
  })
})

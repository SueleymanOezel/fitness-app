import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetchProductByBarcode = vi.fn()
vi.mock('./open-food-facts', () => ({
  fetchProductByBarcode: (barcode: string) => mockFetchProductByBarcode(barcode),
}))

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('./supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const existingProduct = {
  id: 'p1',
  name: 'Lokales Produkt',
  barcode: '4001234567890',
  kalorien: 100,
  eiweiss: 1,
  fett: 2,
  kohlenhydrate: 3,
}

describe('findOrFetchProductByBarcode', () => {
  beforeEach(() => {
    mockFetchProductByBarcode.mockReset()
    mockFrom.mockReset()
  })

  it('returns the local product without calling Open Food Facts when found', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: existingProduct }))

    const { findOrFetchProductByBarcode } = await import('./product-lookup')
    const result = await findOrFetchProductByBarcode('4001234567890')

    expect(result).toEqual(existingProduct)
    expect(mockFetchProductByBarcode).not.toHaveBeenCalled()
  })

  it('falls back to Open Food Facts and caches the result when not found locally', async () => {
    const selectBuilder = createQueryBuilder({ data: null })
    const upsertedProduct = {
      id: 'p2',
      name: 'OFF Produkt',
      barcode: '5001234567890',
      kalorien: 200,
      eiweiss: 5,
      fett: 6,
      kohlenhydrate: 7,
    }
    const upsertBuilder = createQueryBuilder({ data: upsertedProduct })
    mockFrom.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(upsertBuilder)
    mockFetchProductByBarcode.mockResolvedValue({
      name: 'OFF Produkt',
      kalorien: 200,
      eiweiss: 5,
      fett: 6,
      kohlenhydrate: 7,
    })

    const { findOrFetchProductByBarcode } = await import('./product-lookup')
    const result = await findOrFetchProductByBarcode('5001234567890')

    expect(result).toEqual(upsertedProduct)
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ barcode: '5001234567890', name: 'OFF Produkt' }),
      { onConflict: 'barcode' },
    )
  })

  it('returns null when neither the local DB nor Open Food Facts have the product', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null }))
    mockFetchProductByBarcode.mockResolvedValue(null)

    const { findOrFetchProductByBarcode } = await import('./product-lookup')
    expect(await findOrFetchProductByBarcode('9999999999999')).toBeNull()
  })
})

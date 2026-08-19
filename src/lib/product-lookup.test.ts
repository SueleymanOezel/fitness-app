import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetchProductByBarcode = vi.fn()
vi.mock('./open-food-facts', async (importOriginal) => ({
  // Only the network call is mocked; barcode validation stays the real one so
  // the guard here is tested rather than stubbed away.
  ...(await importOriginal<typeof import('./open-food-facts')>()),
  fetchProductByBarcode: (barcode: string) => mockFetchProductByBarcode(barcode),
}))

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('./supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } } }) },
  },
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

  const offProduct = { name: 'OFF Produkt', kalorien: 200, eiweiss: 5, fett: 6, kohlenhydrate: 7 }
  const cachedProduct = { id: 'p2', barcode: '5001234567890', ...offProduct }

  it('falls back to Open Food Facts and caches the result when not found locally', async () => {
    const selectBuilder = createQueryBuilder({ data: null })
    const insertBuilder = createQueryBuilder({ data: cachedProduct })
    mockFrom.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(insertBuilder)
    mockFetchProductByBarcode.mockResolvedValue(offProduct)

    const { findOrFetchProductByBarcode } = await import('./product-lookup')
    const result = await findOrFetchProductByBarcode('5001234567890')

    expect(result).toEqual(cachedProduct)
    // created_by must carry the scanning user's id — the only INSERT policy on
    // products is `created_by = auth.uid()`, so a null here is rejected by RLS
    // and the whole barcode path dead-ends into the manual form.
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ barcode: '5001234567890', name: 'OFF Produkt', created_by: 'u1' }),
    )
  })

  it('returns the row that won the race when the cache insert is rejected', async () => {
    const selectBuilder = createQueryBuilder({ data: null })
    const insertBuilder = createQueryBuilder({ data: null, error: { code: '23505' } })
    const racedBuilder = createQueryBuilder({ data: cachedProduct })
    mockFrom
      .mockReturnValueOnce(selectBuilder)
      .mockReturnValueOnce(insertBuilder)
      .mockReturnValueOnce(racedBuilder)
    mockFetchProductByBarcode.mockResolvedValue(offProduct)

    const { findOrFetchProductByBarcode } = await import('./product-lookup')

    expect(await findOrFetchProductByBarcode('5001234567890')).toEqual(cachedProduct)
  })

  it('rejects a non-barcode payload before touching the database', async () => {
    const { findOrFetchProductByBarcode } = await import('./product-lookup')

    expect(await findOrFetchProductByBarcode('https://example.com/evil')).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns null when neither the local DB nor Open Food Facts have the product', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null }))
    mockFetchProductByBarcode.mockResolvedValue(null)

    const { findOrFetchProductByBarcode } = await import('./product-lookup')
    expect(await findOrFetchProductByBarcode('9999999999999')).toBeNull()
  })
})

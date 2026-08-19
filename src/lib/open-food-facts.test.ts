import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchProductByBarcode } from './open-food-facts'

describe('fetchProductByBarcode', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns a normalized product on a successful lookup', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 1,
            product: {
              product_name: 'Testprodukt',
              nutriments: {
                'energy-kcal_100g': 250,
                proteins_100g: 10,
                fat_100g: 5,
                carbohydrates_100g: 30,
              },
            },
          }),
      }),
    )

    const result = await fetchProductByBarcode('4001234567890')

    expect(result).toEqual({
      name: 'Testprodukt',
      kalorien: 250,
      eiweiss: 10,
      fett: 5,
      kohlenhydrate: 30,
    })
  })

  it('returns null when the API reports the product as not found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: 0 }) }),
    )

    expect(await fetchProductByBarcode('0000000000000')).toBeNull()
  })

  it('returns null when the product has no name or no calorie value', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ status: 1, product: { product_name: '', nutriments: {} } }),
      }),
    )

    expect(await fetchProductByBarcode('1111111111111')).toBeNull()
  })

  it('returns null when the HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    expect(await fetchProductByBarcode('2222222222222')).toBeNull()
  })

  it('returns null when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    expect(await fetchProductByBarcode('3333333333333')).toBeNull()
  })

  it('never requests a barcode that is not 8-14 digits', async () => {
    // The scanner decodes QR codes too, so this string is attacker-controlled: a
    // prepared code on a package could otherwise steer the request to any path.
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(await fetchProductByBarcode('../../../cgi/search.pl?x=y')).toBeNull()
    expect(await fetchProductByBarcode('123')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('coerces stringified nutriments and drops implausible ones', async () => {
    // Open Food Facts is community-editable: values arrive as strings, negatives,
    // or absurd magnitudes that would poison the daily totals.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 1,
            product: {
              product_name: '  Testprodukt  ',
              nutriments: {
                'energy-kcal_100g': '250',
                proteins_100g: -5,
                fat_100g: 1e12,
                carbohydrates_100g: 'abc',
              },
            },
          }),
      }),
    )

    expect(await fetchProductByBarcode('4001234567890')).toEqual({
      name: 'Testprodukt',
      kalorien: 250,
      eiweiss: null,
      fett: null,
      kohlenhydrate: null,
    })
  })

  it('returns null when the calorie value itself is implausible', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 1,
            product: { product_name: 'Kaputt', nutriments: { 'energy-kcal_100g': -999 } },
          }),
      }),
    )

    expect(await fetchProductByBarcode('4001234567890')).toBeNull()
  })
})

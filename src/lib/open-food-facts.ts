export type OffProduct = {
  name: string
  kalorien: number
  eiweiss: number | null
  fett: number | null
  kohlenhydrate: number | null
}

type OffApiResponse = {
  status: number
  product?: {
    product_name?: unknown
    nutriments?: {
      'energy-kcal_100g'?: unknown
      proteins_100g?: unknown
      fat_100g?: unknown
      carbohydrates_100g?: unknown
    }
  }
}

/** Shared with the manual form so both writers into `products` cap names alike. */
export const MAX_NAME_LENGTH = 200

/** The scanner also decodes QR codes, so a "barcode" is attacker-controlled text until this passes. */
export function isValidBarcode(barcode: string): boolean {
  return /^\d{8,14}$/.test(barcode)
}

/**
 * Open Food Facts is community-editable and returns numbers as strings, nulls, or
 * nonsense; anything outside a plausible per-100-g range is treated as missing.
 */
function plausibleNutrient(raw: unknown, max: number): number | null {
  if (raw == null || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 && value <= max ? value : null
}

export async function fetchProductByBarcode(barcode: string): Promise<OffProduct | null> {
  if (!isValidBarcode(barcode)) return null

  let response: Response
  try {
    response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
    )
  } catch {
    return null
  }

  if (!response.ok) return null

  let data: OffApiResponse
  try {
    data = await response.json()
  } catch {
    return null
  }

  if (data.status !== 1 || !data.product) return null

  const { product_name, nutriments } = data.product
  const name = typeof product_name === 'string' ? product_name.trim().slice(0, MAX_NAME_LENGTH) : ''
  const kalorien = plausibleNutrient(nutriments?.['energy-kcal_100g'], 900)
  if (!name || kalorien == null) return null

  return {
    name,
    kalorien,
    eiweiss: plausibleNutrient(nutriments?.proteins_100g, 100),
    fett: plausibleNutrient(nutriments?.fat_100g, 100),
    kohlenhydrate: plausibleNutrient(nutriments?.carbohydrates_100g, 100),
  }
}

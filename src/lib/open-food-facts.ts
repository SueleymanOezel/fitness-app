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
    product_name?: string
    nutriments?: {
      'energy-kcal_100g'?: number
      proteins_100g?: number
      fat_100g?: number
      carbohydrates_100g?: number
    }
  }
}

export async function fetchProductByBarcode(barcode: string): Promise<OffProduct | null> {
  let response: Response
  try {
    response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`)
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
  const kalorien = nutriments?.['energy-kcal_100g']
  if (!product_name || kalorien == null) return null

  return {
    name: product_name,
    kalorien,
    eiweiss: nutriments?.proteins_100g ?? null,
    fett: nutriments?.fat_100g ?? null,
    kohlenhydrate: nutriments?.carbohydrates_100g ?? null,
  }
}

import { supabase } from './supabase'
import { fetchProductByBarcode } from './open-food-facts'

export type Product = {
  id: string
  name: string
  barcode: string | null
  kalorien: number
  eiweiss: number | null
  fett: number | null
  kohlenhydrate: number | null
}

const PRODUCT_COLUMNS = 'id, name, barcode, kalorien, eiweiss, fett, kohlenhydrate'

export async function findOrFetchProductByBarcode(barcode: string): Promise<Product | null> {
  const { data: existing } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('barcode', barcode)
    .maybeSingle()

  if (existing) return existing as Product

  const offProduct = await fetchProductByBarcode(barcode)
  if (!offProduct) return null

  const { data: inserted, error } = await supabase
    .from('products')
    .upsert(
      {
        barcode,
        name: offProduct.name,
        kalorien: offProduct.kalorien,
        eiweiss: offProduct.eiweiss,
        fett: offProduct.fett,
        kohlenhydrate: offProduct.kohlenhydrate,
      },
      { onConflict: 'barcode' },
    )
    .select(PRODUCT_COLUMNS)
    .single()

  if (error || !inserted) return null
  return inserted as Product
}

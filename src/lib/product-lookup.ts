import { supabase } from './supabase'
import { fetchProductByBarcode, isValidBarcode } from './open-food-facts'

export type Product = {
  id: string
  name: string
  barcode: string | null
  kalorien: number
  eiweiss: number | null
  fett: number | null
  kohlenhydrate: number | null
  ballaststoffe: number | null
  zucker: number | null
  salz: number | null
}

/** One list for every reader of the table, so a new column cannot reach some callers and not others. */
export const PRODUCT_COLUMNS =
  'id, name, barcode, kalorien, eiweiss, fett, kohlenhydrate, ballaststoffe, zucker, salz'

export async function findOrFetchProductByBarcode(barcode: string): Promise<Product | null> {
  // Self-defending: callers pre-validate today, but this must not become the hole
  // if it is ever called from somewhere else.
  if (!isValidBarcode(barcode)) return null

  const { data: existing } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('barcode', barcode)
    .maybeSingle()

  if (existing) return existing as Product

  const offProduct = await fetchProductByBarcode(barcode)
  if (!offProduct) return null

  // The only INSERT policy on products is `created_by = auth.uid()`, so a cached
  // row must carry the scanning user's id — a null created_by is rejected by RLS.
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return null

  const { data: inserted } = await supabase
    .from('products')
    .insert({
      barcode,
      created_by: userId,
      name: offProduct.name,
      kalorien: offProduct.kalorien,
      eiweiss: offProduct.eiweiss,
      fett: offProduct.fett,
      kohlenhydrate: offProduct.kohlenhydrate,
      ballaststoffe: offProduct.ballaststoffe,
      zucker: offProduct.zucker,
      salz: offProduct.salz,
    })
    .select(PRODUCT_COLUMNS)
    .maybeSingle()

  if (inserted) return inserted as Product

  // ponytail: insert lost the race against products_barcode_unique — read the winner's row
  const { data: raced } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('barcode', barcode)
    .maybeSingle()

  return (raced as Product | null) ?? null
}

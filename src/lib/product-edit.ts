import { supabase } from './supabase'
import { PRODUCT_COLUMNS, type Product } from './product-lookup'
import type { Nutrients } from './nutrients'

export type EditableProduct = { id: string; created_by: string | null }
export type ProductPatch = Nutrients & { name: string }

/**
 * products is shared: several users can point at the same row, so a correction
 * must not rewrite someone else's data. Own rows are updated in place — which
 * keeps the barcode attached, so a later scan returns the corrected values.
 * Other people's rows are copied; the copy carries no barcode because
 * products_barcode_unique is global.
 */
export async function saveProductEdit(
  product: EditableProduct,
  patch: ProductPatch,
  userId: string,
): Promise<Product> {
  if (product.created_by === userId) {
    const { data, error } = await supabase
      .from('products')
      .update(patch)
      .eq('id', product.id)
      .select(PRODUCT_COLUMNS)
      .maybeSingle()
    if (error || !data) throw new Error('product update failed')
    return data as Product
  }

  const { data, error } = await supabase
    .from('products')
    .insert({ ...patch, barcode: null, created_by: userId })
    .select(PRODUCT_COLUMNS)
    .maybeSingle()
  if (error || !data) throw new Error('product copy failed')
  return data as Product
}

import { supabase } from './supabase'
import { PRODUCT_COLUMNS, type Product } from './product-lookup'
import type { Nutrients } from './nutrients'

export type EditableProduct = { id: string; created_by: string | null; barcode: string | null }
export type ProductPatch = Nutrients & { name: string }

/**
 * products is shared: several users can point at the same row, so a correction
 * must not rewrite someone else's data. A barcode makes a row shared community
 * data (an Open Food Facts cache fill, or a manually entered product that is
 * still keyed by a barcode future scans will hit) — `created_by` on such a row
 * is only there to satisfy the insert policy, not real authorship, so it is
 * never updated in place by anyone, RLS backs this with the same rule
 * (products_update_own requires `barcode is null`). Only a genuinely personal,
 * barcode-less row updates in place for its owner. Every other case copies;
 * the copy carries no barcode because products_barcode_unique is global.
 */
export async function saveProductEdit(
  product: EditableProduct,
  patch: ProductPatch,
  userId: string,
): Promise<Product> {
  if (product.created_by === userId && product.barcode === null) {
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

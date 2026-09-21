-- products_update_own allowed the first scanner of a barcode to keep editing
-- that shared row's nutrition values forever, for every future scanner: a
-- barcode-cached row's created_by exists only to satisfy products_insert_own,
-- it is not real authorship. It also had no `with check`, so an update could
-- rewrite created_by to an arbitrary value. Replaced with a policy that only
-- allows in-place updates on genuinely personal, barcode-less rows; any row
-- with a barcode is shared community data and can only be copied, never
-- overwritten in place, regardless of who created it (src/lib/product-edit.ts
-- enforces the same rule at the application layer).
drop policy "products_update_own" on public.products;

create policy "products_update_own" on public.products
  for update to authenticated
  using (created_by = auth.uid() and barcode is null)
  with check (created_by = auth.uid() and barcode is null);

-- Same reasoning applies to delete: the first scanner of a barcode is not the
-- real owner of that shared row and must not be able to unilaterally remove
-- it out from under every other user who might scan the same barcode later.
drop policy "products_delete_own" on public.products;

create policy "products_delete_own" on public.products
  for delete to authenticated
  using (created_by = auth.uid() and barcode is null);

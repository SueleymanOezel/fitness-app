-- Progress photos are the most sensitive data in this application. The bucket is
-- private and stays private: a public bucket cannot be undone after the fact,
-- because anything once reachable through a guessed URL may already be copied.
--
-- Layout is {user_id}/{uuid}.{ext}, so the first path segment is the owner and
-- every policy checks it. Reading happens through short-lived signed links that
-- are created on demand and never stored.

insert into storage.buckets (id, name, public)
values ('body-photos', 'body-photos', false)
on conflict (id) do nothing;

create policy "body_photos_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'body-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "body_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'body-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No update policy on purpose: a photo is replaced by deleting and uploading
-- again, which keeps the stored path and the database row in step.
create policy "body_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'body-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

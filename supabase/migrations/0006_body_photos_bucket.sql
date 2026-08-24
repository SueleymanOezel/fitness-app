-- Progress photos are the most sensitive data in this application. The bucket is
-- private and stays private: a public bucket cannot be undone after the fact,
-- because anything once reachable through a guessed URL may already be copied.
--
-- Layout is {user_id}/{uuid}.{ext}, so the first path segment is the owner and
-- every policy checks it. Reading happens through short-lived signed links that
-- are created on demand and never stored.

-- Size and type are limited in the bucket itself, not only in the client: the
-- resize before upload is a convenience, and anyone holding the anon key plus
-- their own token can post any file of any type to their own folder. 5 MB is
-- well above a resized JPEG; the list matches what the client actually sends
-- (image/jpeg from the canvas re-encode) plus the two formats a direct upload
-- would plausibly use.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('body-photos', 'body-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
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

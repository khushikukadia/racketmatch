-- Run in Supabase Dashboard → SQL Editor (once per project).
-- Creates public buckets and policies so signed-in users upload only under their user id folder.

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('post-images', 'post-images', true)
on conflict (id) do update set public = excluded.public;

-- Avatars: authenticated users upload/update/delete only in {userId}/...
create policy "avatars_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatars_select_public"
on storage.objects for select to public
using (bucket_id = 'avatars');

-- Post images: same folder rule per user
create policy "post_images_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "post_images_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "post_images_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "post_images_select_public"
on storage.objects for select to public
using (bucket_id = 'post-images');

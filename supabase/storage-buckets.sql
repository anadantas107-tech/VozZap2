-- Create storage buckets for audio, covers, and avatars
insert into storage.buckets (id, name, public)
values
  ('audio-files', 'audio-files', true),
  ('covers', 'covers', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Audio files: public read, authenticated upload
drop policy if exists "Public read access for audio-files" on storage.objects;
create policy "Public read access for audio-files"
on storage.objects for select
using (bucket_id = 'audio-files');

drop policy if exists "Users can upload audio files" on storage.objects;
create policy "Users can upload audio files"
on storage.objects for insert
with check (bucket_id = 'audio-files' and auth.role() = 'authenticated');

drop policy if exists "Users can update own audio files" on storage.objects;
create policy "Users can update own audio files"
on storage.objects for update
using (bucket_id = 'audio-files' and auth.uid() = owner)
with check (bucket_id = 'audio-files' and auth.uid() = owner);

drop policy if exists "Users can delete own audio files" on storage.objects;
create policy "Users can delete own audio files"
on storage.objects for delete
using (bucket_id = 'audio-files' and auth.uid() = owner);

-- Covers: public read, authenticated upload

drop policy if exists "Public read access for covers" on storage.objects;
create policy "Public read access for covers"
on storage.objects for select
using (bucket_id = 'covers');

drop policy if exists "Users can upload covers" on storage.objects;
create policy "Users can upload covers"
on storage.objects for insert
with check (bucket_id = 'covers' and auth.role() = 'authenticated');

drop policy if exists "Users can update own covers" on storage.objects;
create policy "Users can update own covers"
on storage.objects for update
using (bucket_id = 'covers' and auth.uid() = owner)
with check (bucket_id = 'covers' and auth.uid() = owner);

drop policy if exists "Users can delete own covers" on storage.objects;
create policy "Users can delete own covers"
on storage.objects for delete
using (bucket_id = 'covers' and auth.uid() = owner);

-- Avatars: public read, authenticated upload and owner-based updates/deletes

drop policy if exists "Public read access for avatars" on storage.objects;
create policy "Public read access for avatars"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload avatars" on storage.objects;
create policy "Users can upload avatars"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "Users can update own avatars" on storage.objects;
create policy "Users can update own avatars"
on storage.objects for update
using (bucket_id = 'avatars' and auth.uid() = owner)
with check (bucket_id = 'avatars' and auth.uid() = owner);

drop policy if exists "Users can delete own avatars" on storage.objects;
create policy "Users can delete own avatars"
on storage.objects for delete
using (bucket_id = 'avatars' and auth.uid() = owner);

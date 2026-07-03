-- Run in Supabase SQL Editor after creating the profile-images bucket.
-- In Storage, create a public bucket named: profile-images

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read profile images" on storage.objects;
drop policy if exists "Anon upload profile images" on storage.objects;
drop policy if exists "Anon update profile images" on storage.objects;

create policy "Public read profile images"
on storage.objects
for select
to public
using (bucket_id = 'profile-images');

-- MVP demo policies for anon uploads without auth.
create policy "Anon upload profile images"
on storage.objects
for insert
to public
with check (bucket_id = 'profile-images');

create policy "Anon update profile images"
on storage.objects
for update
to public
using (bucket_id = 'profile-images')
with check (bucket_id = 'profile-images');

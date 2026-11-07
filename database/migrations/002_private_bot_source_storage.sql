-- Private source archive bucket. Files are scoped to an authenticated user's bot.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bot-source', 'bot-source', false, 20971520, array['application/zip', 'application/x-zip-compressed', 'application/octet-stream'])
on conflict (id) do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Bot owners can upload source archives"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'bot-source'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.bots b
    where b.id::text = (storage.foldername(name))[2]
      and b.owner_id = auth.uid()
  )
);

create policy "Bot owners can read source archives"
on storage.objects for select to authenticated
using (
  bucket_id = 'bot-source'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.bots b
    where b.id::text = (storage.foldername(name))[2]
      and b.owner_id = auth.uid()
  )
);

create policy "Bot owners can replace source archives"
on storage.objects for update to authenticated
using (
  bucket_id = 'bot-source'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.bots b
    where b.id::text = (storage.foldername(name))[2]
      and b.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'bot-source'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.bots b
    where b.id::text = (storage.foldername(name))[2]
      and b.owner_id = auth.uid()
  )
);

create policy "Bot owners can delete source archives"
on storage.objects for delete to authenticated
using (
  bucket_id = 'bot-source'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.bots b
    where b.id::text = (storage.foldername(name))[2]
      and b.owner_id = auth.uid()
  )
);

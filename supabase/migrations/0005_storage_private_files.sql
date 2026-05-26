insert into storage.buckets (id, name, public)
values ('private-files', 'private-files', false)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

drop policy if exists private_files_select on storage.objects;
create policy private_files_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'private-files'
  and (
    public.is_admin()
    or name like ('contractors/' || auth.uid() || '/%')
  )
);

drop policy if exists private_files_insert on storage.objects;
create policy private_files_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'private-files'
  and (
    public.is_admin()
    or name like ('contractors/' || auth.uid() || '/%')
  )
);

drop policy if exists private_files_update on storage.objects;
create policy private_files_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'private-files'
  and (
    public.is_admin()
    or name like ('contractors/' || auth.uid() || '/%')
  )
)
with check (
  bucket_id = 'private-files'
  and (
    public.is_admin()
    or name like ('contractors/' || auth.uid() || '/%')
  )
);

drop policy if exists private_files_delete on storage.objects;
create policy private_files_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'private-files'
  and (
    public.is_admin()
    or name like ('contractors/' || auth.uid() || '/%')
  )
);

drop policy if exists projects_contractor_select_open on public.projects;
create policy projects_contractor_select_open
on public.projects
for select
to authenticated
using (
  deleted_at is null
  and status = 'open'
  and exists (
    select 1
    from public.contractor_profiles cp
    where cp.contractor_id = auth.uid()
      and cp.deleted_at is null
      and cp.verification_status = 'approved'
  )
);

drop policy if exists bids_contractor_insert on public.bids;
create policy bids_contractor_insert
on public.bids
for insert
to authenticated
with check (
  deleted_at is null
  and contractor_id = auth.uid()
  and exists (
    select 1
    from public.contractor_profiles cp
    where cp.contractor_id = auth.uid()
      and cp.deleted_at is null
      and cp.verification_status = 'approved'
  )
);

drop policy if exists bids_contractor_update on public.bids;
create policy bids_contractor_update
on public.bids
for update
to authenticated
using (
  deleted_at is null
  and contractor_id = auth.uid()
)
with check (
  deleted_at is null
  and contractor_id = auth.uid()
  and exists (
    select 1
    from public.contractor_profiles cp
    where cp.contractor_id = auth.uid()
      and cp.deleted_at is null
      and cp.verification_status = 'approved'
  )
);

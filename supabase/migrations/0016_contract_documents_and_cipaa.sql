do $$
declare
  r record;
begin
  execute 'alter table public.disputes drop constraint if exists disputes_status_check';

  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.disputes'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.disputes drop constraint if exists %I', r.conname);
  end loop;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.disputes'::regclass
      and c.contype = 'c'
      and c.conname = 'disputes_status_check'
  ) then
    execute $q$
      alter table public.disputes
      add constraint disputes_status_check
      check (status in ('open', 'in_review', 'cipaa_claim_sent', 'cipaa_response_received', 'adjudication_requested', 'resolved', 'cancelled'))
    $q$;
  end if;
end
$$;

alter table public.disputes
add column if not exists claim_amount numeric(12,2) check (claim_amount is null or claim_amount >= 0),
add column if not exists cipaa_reference text,
add column if not exists payment_claim_sent_at timestamptz,
add column if not exists payment_response_received_at timestamptz,
add column if not exists adjudication_requested_at timestamptz;

create table if not exists public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  doc_type text not null,
  title text not null,
  content text not null,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_contract_documents_contract
on public.contract_documents (contract_id, created_at desc);

alter table public.contract_documents enable row level security;
grant select, insert, delete on public.contract_documents to authenticated;

create policy contract_documents_party_select
on public.contract_documents
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or contract_id in (select c.id from public.contracts c join public.projects p on p.id = c.project_id where p.owner_id = auth.uid() and p.deleted_at is null and c.deleted_at is null)
    or contract_id in (select c.id from public.contracts c join public.bids b on b.id = c.bid_id where b.contractor_id = auth.uid() and b.deleted_at is null and c.deleted_at is null)
  )
);

create policy contract_documents_owner_insert
on public.contract_documents
for insert
to authenticated
with check (
  deleted_at is null
  and created_by = auth.uid()
  and (
    public.is_admin()
    or contract_id in (select c.id from public.contracts c join public.projects p on p.id = c.project_id where p.owner_id = auth.uid() and p.deleted_at is null and c.deleted_at is null)
  )
);

create policy contract_documents_owner_delete
on public.contract_documents
for delete
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or (created_by = auth.uid() and contract_id in (select c.id from public.contracts c join public.projects p on p.id = c.project_id where p.owner_id = auth.uid() and p.deleted_at is null and c.deleted_at is null))
  )
);

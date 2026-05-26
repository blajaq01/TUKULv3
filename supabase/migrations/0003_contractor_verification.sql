create table if not exists public.contractor_profiles (
  contractor_id uuid primary key references public.users (id) on delete cascade,
  business_name text,
  ssm_number text,
  cidb_registration_number text,
  cidb_grade text,
  cidb_expiry date,
  insurance_provider text,
  insurance_policy_number text,
  insurance_expiry date,
  specialties text[],
  service_areas text[],
  bio text,
  verification_status text not null default 'draft'
    check (verification_status in ('draft', 'submitted', 'approved', 'rejected')),
  verification_submitted_at timestamptz,
  verification_reviewed_at timestamptz,
  verification_reviewed_by uuid references public.users (id),
  verification_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create index if not exists idx_contractor_profiles_status
on public.contractor_profiles (verification_status);

create table if not exists public.contractor_documents (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.users (id) on delete cascade,
  doc_type text not null check (doc_type in ('cidb', 'ssm', 'insurance', 'portfolio', 'other')),
  bucket text not null,
  path text not null,
  status text not null default 'uploaded'
    check (status in ('uploaded', 'approved', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_contractor_documents_contractor_id
on public.contractor_documents (contractor_id);

alter table public.contractor_profiles enable row level security;
alter table public.contractor_documents enable row level security;

grant select, insert, update, delete on public.contractor_profiles to authenticated;
grant select, insert, update, delete on public.contractor_documents to authenticated;

create policy contractor_profiles_select
on public.contractor_profiles
for select
to authenticated
using (deleted_at is null);

create policy contractor_profiles_insert_self
on public.contractor_profiles
for insert
to authenticated
with check (
  deleted_at is null
  and contractor_id = auth.uid()
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
    and u.deleted_at is null
    and u.is_contractor = true
  )
  and verification_status in ('draft', 'submitted')
);

create policy contractor_profiles_update_self
on public.contractor_profiles
for update
to authenticated
using (
  deleted_at is null
  and contractor_id = auth.uid()
)
with check (
  deleted_at is null
  and contractor_id = auth.uid()
  and verification_status in ('draft', 'submitted')
);

create policy contractor_documents_select
on public.contractor_documents
for select
to authenticated
using (deleted_at is null);

create policy contractor_documents_insert_self
on public.contractor_documents
for insert
to authenticated
with check (
  deleted_at is null
  and contractor_id = auth.uid()
  and status = 'uploaded'
);

create policy contractor_documents_update_self
on public.contractor_documents
for update
to authenticated
using (
  deleted_at is null
  and contractor_id = auth.uid()
  and status = 'uploaded'
)
with check (
  deleted_at is null
  and contractor_id = auth.uid()
  and status = 'uploaded'
);

create policy contractor_profiles_admin_all
on public.contractor_profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy contractor_documents_admin_all
on public.contractor_documents
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

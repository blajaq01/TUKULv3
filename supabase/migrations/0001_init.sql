create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  phone text,
  full_name text not null,
  is_contractor boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id),
  title text not null,
  description text,
  budget numeric(12, 2),
  status text not null default 'open' check (status in ('draft', 'open', 'in_progress', 'completed', 'cancelled')),
  location text,
  due_date date,
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz
);

create index if not exists idx_projects_status on public.projects (status);

create table if not exists public.categories (
  id bigserial primary key,
  name text not null unique,
  description text
);

create table if not exists public.project_categories (
  project_id uuid not null references public.projects (id) on delete cascade,
  category_id bigint not null references public.categories (id) on delete cascade,
  primary key (project_id, category_id)
);

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contractor_id uuid not null references public.users (id),
  total_price numeric(12, 2) not null check (total_price > 0),
  status text not null default 'pending' check (status in ('pending', 'selected', 'rejected', 'withdrawn')),
  details jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz
);

create index if not exists idx_bids_project_id on public.bids (project_id);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  bid_id uuid not null unique references public.bids (id) on delete cascade,
  agreed_price numeric(12, 2) not null check (agreed_price > 0),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  name text not null,
  description text,
  sequence int not null check (sequence >= 1),
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'approved', 'payment_released', 'disputed')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz,
  unique (contract_id, sequence)
);

create index if not exists idx_milestones_contract_sequence on public.milestones (contract_id, sequence);

create table if not exists public.ledger_entries (
  id bigserial primary key,
  milestone_id uuid references public.milestones (id) on delete set null,
  contract_id uuid references public.contracts (id) on delete set null,
  from_user uuid not null references public.users (id),
  to_user uuid not null references public.users (id),
  amount numeric(12, 2) not null check (amount > 0),
  type text not null check (type in ('deposit', 'pending_release', 'release', 'refund')),
  created_at timestamptz not null default now()
);

create index if not exists idx_ledger_entries_contract_id on public.ledger_entries (contract_id);
create index if not exists idx_ledger_entries_milestone_id on public.ledger_entries (milestone_id);

create table if not exists public.reviews (
  id bigserial primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  reviewer_id uuid not null references public.users (id),
  reviewee_id uuid not null references public.users (id),
  rating smallint not null check (rating between 1 and 5),
  comments text,
  created_at timestamptz not null default now(),
  unique (project_id, reviewer_id)
);

create index if not exists idx_reviews_reviewee_id on public.reviews (reviewee_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users (id),
  receiver_id uuid not null references public.users (id),
  project_id uuid references public.projects (id) on delete set null,
  content text not null,
  sent_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, is_contractor, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'is_contractor')::boolean, false),
    now()
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.bids enable row level security;
alter table public.contracts enable row level security;
alter table public.milestones enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.reviews enable row level security;
alter table public.messages enable row level security;
alter table public.categories enable row level security;
alter table public.project_categories enable row level security;

grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.bids to authenticated;
grant select, insert, update, delete on public.contracts to authenticated;
grant select, insert, update, delete on public.milestones to authenticated;
grant select, insert, update, delete on public.ledger_entries to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select on public.categories to anon, authenticated;
grant select, insert, delete on public.project_categories to authenticated;

grant usage, select on sequence public.categories_id_seq to authenticated;
grant usage, select on sequence public.ledger_entries_id_seq to authenticated;
grant usage, select on sequence public.reviews_id_seq to authenticated;

create policy users_self_select
on public.users
for select
to authenticated
using (deleted_at is null and id = auth.uid());

create policy users_self_update
on public.users
for update
to authenticated
using (deleted_at is null and id = auth.uid())
with check (deleted_at is null and id = auth.uid());

create policy users_contractor_directory_select
on public.users
for select
to authenticated
using (deleted_at is null and is_contractor = true);

create policy projects_owner_select
on public.projects
for select
to authenticated
using (deleted_at is null and owner_id = auth.uid());

create policy projects_contractor_select_open
on public.projects
for select
to authenticated
using (
  deleted_at is null
  and status = 'open'
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
    and u.deleted_at is null
    and u.is_contractor = true
  )
);

create policy projects_owner_insert
on public.projects
for insert
to authenticated
with check (deleted_at is null and owner_id = auth.uid());

create policy projects_owner_update
on public.projects
for update
to authenticated
using (deleted_at is null and owner_id = auth.uid())
with check (deleted_at is null and owner_id = auth.uid());

create policy projects_owner_delete
on public.projects
for delete
to authenticated
using (deleted_at is null and owner_id = auth.uid());

create policy bids_contractor_select
on public.bids
for select
to authenticated
using (deleted_at is null and contractor_id = auth.uid());

create policy bids_owner_select
on public.bids
for select
to authenticated
using (
  deleted_at is null
  and project_id in (select id from public.projects p where p.owner_id = auth.uid() and p.deleted_at is null)
);

create policy bids_contractor_insert
on public.bids
for insert
to authenticated
with check (deleted_at is null and contractor_id = auth.uid());

create policy bids_contractor_update
on public.bids
for update
to authenticated
using (deleted_at is null and contractor_id = auth.uid())
with check (deleted_at is null and contractor_id = auth.uid());

create policy bids_owner_update
on public.bids
for update
to authenticated
using (
  deleted_at is null
  and project_id in (select id from public.projects p where p.owner_id = auth.uid() and p.deleted_at is null)
)
with check (
  deleted_at is null
  and project_id in (select id from public.projects p where p.owner_id = auth.uid() and p.deleted_at is null)
);

create policy contracts_party_select
on public.contracts
for select
to authenticated
using (
  deleted_at is null
  and (
    project_id in (select id from public.projects p where p.owner_id = auth.uid() and p.deleted_at is null)
    or bid_id in (select id from public.bids b where b.contractor_id = auth.uid() and b.deleted_at is null)
  )
);

create policy contracts_owner_insert
on public.contracts
for insert
to authenticated
with check (
  deleted_at is null
  and project_id in (select id from public.projects p where p.owner_id = auth.uid() and p.deleted_at is null)
);

create policy contracts_owner_update
on public.contracts
for update
to authenticated
using (
  deleted_at is null
  and project_id in (select id from public.projects p where p.owner_id = auth.uid() and p.deleted_at is null)
)
with check (
  deleted_at is null
  and project_id in (select id from public.projects p where p.owner_id = auth.uid() and p.deleted_at is null)
);

create policy milestones_party_select
on public.milestones
for select
to authenticated
using (
  deleted_at is null
  and auth.uid() in (
    select b.contractor_id
    from public.contracts c
    join public.bids b on b.id = c.bid_id
    where c.id = milestones.contract_id and c.deleted_at is null and b.deleted_at is null
    union
    select p.owner_id
    from public.contracts c
    join public.projects p on p.id = c.project_id
    where c.id = milestones.contract_id and c.deleted_at is null and p.deleted_at is null
  )
);

create policy milestones_party_write
on public.milestones
for insert, update, delete
to authenticated
using (
  deleted_at is null
  and auth.uid() in (
    select b.contractor_id
    from public.contracts c
    join public.bids b on b.id = c.bid_id
    where c.id = milestones.contract_id and c.deleted_at is null and b.deleted_at is null
    union
    select p.owner_id
    from public.contracts c
    join public.projects p on p.id = c.project_id
    where c.id = milestones.contract_id and c.deleted_at is null and p.deleted_at is null
  )
)
with check (
  deleted_at is null
  and auth.uid() in (
    select b.contractor_id
    from public.contracts c
    join public.bids b on b.id = c.bid_id
    where c.id = milestones.contract_id and c.deleted_at is null and b.deleted_at is null
    union
    select p.owner_id
    from public.contracts c
    join public.projects p on p.id = c.project_id
    where c.id = milestones.contract_id and c.deleted_at is null and p.deleted_at is null
  )
);

create policy ledger_entries_party_select
on public.ledger_entries
for select
to authenticated
using (from_user = auth.uid() or to_user = auth.uid());

create policy reviews_participant_select
on public.reviews
for select
to authenticated
using (reviewer_id = auth.uid() or reviewee_id = auth.uid());

create policy reviews_reviewer_insert
on public.reviews
for insert
to authenticated
with check (reviewer_id = auth.uid());

create policy messages_participant_select
on public.messages
for select
to authenticated
using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy messages_sender_insert
on public.messages
for insert
to authenticated
with check (sender_id = auth.uid());

create policy categories_select
on public.categories
for select
to anon, authenticated
using (true);

create policy project_categories_party_select
on public.project_categories
for select
to authenticated
using (
  project_id in (select id from public.projects p where p.owner_id = auth.uid() and p.deleted_at is null)
  or exists (
    select 1
    from public.projects p
    where p.id = project_id
    and p.deleted_at is null
    and p.status = 'open'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
      and u.deleted_at is null
      and u.is_contractor = true
    )
  )
);

create function public.on_milestone_completed() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_contractor_id uuid;
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    select p.owner_id into v_owner_id
    from public.contracts c
    join public.projects p on p.id = c.project_id
    where c.id = new.contract_id;

    select b.contractor_id into v_contractor_id
    from public.contracts c
    join public.bids b on b.id = c.bid_id
    where c.id = new.contract_id;

    if v_owner_id is not null and v_contractor_id is not null then
      insert into public.ledger_entries (contract_id, milestone_id, from_user, to_user, amount, type)
      values (new.contract_id, new.id, v_owner_id, v_contractor_id, new.amount, 'pending_release');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists milestone_after_update on public.milestones;
create trigger milestone_after_update
after update on public.milestones
for each row
when (old.status is distinct from new.status)
execute function public.on_milestone_completed();

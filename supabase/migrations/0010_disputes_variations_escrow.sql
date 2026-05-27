create or replace function public.platform_admin_id() returns uuid
language sql
stable
as $$
  select u.id
  from public.users u
  where u.deleted_at is null
    and u.is_admin = true
  order by u.created_at asc
  limit 1
$$;

create table if not exists public.variation_orders (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  milestone_id uuid references public.milestones (id) on delete set null,
  requested_by uuid not null references public.users (id),
  title text not null,
  description text,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'rejected', 'cancelled')),
  decided_at timestamptz,
  decided_by uuid references public.users (id),
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz
);

create index if not exists idx_variation_orders_contract
on public.variation_orders (contract_id, created_at desc);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  milestone_id uuid references public.milestones (id) on delete set null,
  raised_by uuid not null references public.users (id),
  reason text not null,
  status text not null default 'open'
    check (status in ('open', 'resolved', 'cancelled')),
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz
);

create index if not exists idx_disputes_contract
on public.disputes (contract_id, created_at desc);

alter table public.variation_orders enable row level security;
alter table public.disputes enable row level security;

grant select, insert, update, delete on public.variation_orders to authenticated;
grant select, insert, update, delete on public.disputes to authenticated;

create policy variation_orders_party_select
on public.variation_orders
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or auth.uid() in (
      select b.contractor_id
      from public.contracts c
      join public.bids b on b.id = c.bid_id
      where c.id = variation_orders.contract_id and c.deleted_at is null and b.deleted_at is null
      union
      select p.owner_id
      from public.contracts c
      join public.projects p on p.id = c.project_id
      where c.id = variation_orders.contract_id and c.deleted_at is null and p.deleted_at is null
    )
  )
);

create policy variation_orders_party_insert
on public.variation_orders
for insert
to authenticated
with check (
  deleted_at is null
  and requested_by = auth.uid()
  and status = 'proposed'
  and (
    public.is_admin()
    or auth.uid() in (
      select b.contractor_id
      from public.contracts c
      join public.bids b on b.id = c.bid_id
      where c.id = variation_orders.contract_id and c.deleted_at is null and b.deleted_at is null
      union
      select p.owner_id
      from public.contracts c
      join public.projects p on p.id = c.project_id
      where c.id = variation_orders.contract_id and c.deleted_at is null and p.deleted_at is null
    )
  )
);

create policy variation_orders_owner_decide
on public.variation_orders
for update
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or exists (
      select 1
      from public.contracts c
      join public.projects p on p.id = c.project_id
      where c.id = variation_orders.contract_id
        and c.deleted_at is null
        and p.deleted_at is null
        and p.owner_id = auth.uid()
    )
  )
)
with check (
  deleted_at is null
);

create policy disputes_party_select
on public.disputes
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or auth.uid() in (
      select b.contractor_id
      from public.contracts c
      join public.bids b on b.id = c.bid_id
      where c.id = disputes.contract_id and c.deleted_at is null and b.deleted_at is null
      union
      select p.owner_id
      from public.contracts c
      join public.projects p on p.id = c.project_id
      where c.id = disputes.contract_id and c.deleted_at is null and p.deleted_at is null
    )
  )
);

create policy disputes_party_insert
on public.disputes
for insert
to authenticated
with check (
  deleted_at is null
  and raised_by = auth.uid()
  and status = 'open'
  and (
    public.is_admin()
    or auth.uid() in (
      select b.contractor_id
      from public.contracts c
      join public.bids b on b.id = c.bid_id
      where c.id = disputes.contract_id and c.deleted_at is null and b.deleted_at is null
      union
      select p.owner_id
      from public.contracts c
      join public.projects p on p.id = c.project_id
      where c.id = disputes.contract_id and c.deleted_at is null and p.deleted_at is null
    )
  )
);

create policy disputes_admin_resolve
on public.disputes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy ledger_entries_owner_insert_deposit
on public.ledger_entries
for insert
to authenticated
with check (
  type = 'deposit'
  and from_user = auth.uid()
  and to_user = public.platform_admin_id()
  and contract_id in (
    select c.id
    from public.contracts c
    join public.projects p on p.id = c.project_id
    where p.owner_id = auth.uid()
      and p.deleted_at is null
      and c.deleted_at is null
  )
);

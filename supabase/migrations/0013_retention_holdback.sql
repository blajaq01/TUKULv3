do $$
declare
  r record;
begin
  execute 'alter table public.ledger_entries drop constraint if exists ledger_entries_type_check';

  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.ledger_entries'::regclass
      and c.contype = 'c'
      and (
        pg_get_constraintdef(c.oid) ilike '%deposit%'
        and pg_get_constraintdef(c.oid) ilike '%type%'
      )
  loop
    execute format('alter table public.ledger_entries drop constraint if exists %I', r.conname);
  end loop;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.ledger_entries'::regclass
      and c.contype = 'c'
      and c.conname = 'ledger_entries_type_check'
  ) then
    execute $q$
      alter table public.ledger_entries
      add constraint ledger_entries_type_check
      check (type in ('deposit', 'pending_release', 'release', 'refund', 'retention_hold', 'retention_release'))
    $q$;
  end if;
end
$$;

create table if not exists public.contract_retention_terms (
  contract_id uuid primary key references public.contracts (id) on delete cascade,
  retention_percent numeric(5,2) not null default 0 check (retention_percent >= 0 and retention_percent <= 30),
  defect_liability_days int not null default 30 check (defect_liability_days >= 0 and defect_liability_days <= 365),
  defect_liability_start_at timestamptz,
  retention_release_available_at timestamptz,
  retention_released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz
);

alter table public.contract_retention_terms enable row level security;
grant select, insert, update, delete on public.contract_retention_terms to authenticated;

create policy contract_retention_terms_party_select
on public.contract_retention_terms
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

create policy contract_retention_terms_owner_upsert
on public.contract_retention_terms
for insert
to authenticated
with check (
  deleted_at is null
  and (
    public.is_admin()
    or contract_id in (select c.id from public.contracts c join public.projects p on p.id = c.project_id where p.owner_id = auth.uid() and p.deleted_at is null and c.deleted_at is null)
  )
);

create policy contract_retention_terms_owner_update
on public.contract_retention_terms
for update
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or contract_id in (select c.id from public.contracts c join public.projects p on p.id = c.project_id where p.owner_id = auth.uid() and p.deleted_at is null and c.deleted_at is null)
  )
)
with check (deleted_at is null);

create or replace function public.on_milestone_status_change() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_contractor_id uuid;
  v_admin_id uuid;
  v_retention_percent numeric(5,2);
  v_retention_amount numeric(12,2);
  v_release_amount numeric(12,2);
begin
  select p.owner_id into v_owner_id
  from public.contracts c
  join public.projects p on p.id = c.project_id
  where c.id = new.contract_id;

  select b.contractor_id into v_contractor_id
  from public.contracts c
  join public.bids b on b.id = c.bid_id
  where c.id = new.contract_id;

  if v_owner_id is null or v_contractor_id is null then
    return new;
  end if;

  if new.status = 'approved' and old.status is distinct from new.status then
    insert into public.ledger_entries (contract_id, milestone_id, from_user, to_user, amount, type)
    values (new.contract_id, new.id, v_owner_id, v_contractor_id, new.amount, 'pending_release')
    on conflict (milestone_id, type) do nothing;
  end if;

  if new.status = 'payment_released' and old.status is distinct from new.status then
    select coalesce(rt.retention_percent, 0) into v_retention_percent
    from public.contract_retention_terms rt
    where rt.contract_id = new.contract_id and rt.deleted_at is null;

    if v_retention_percent is null then
      v_retention_percent := 0;
    end if;

    v_retention_amount := round((new.amount * (v_retention_percent / 100.0))::numeric, 2);
    if v_retention_amount < 0 then
      v_retention_amount := 0;
    end if;

    v_release_amount := round((new.amount - v_retention_amount)::numeric, 2);
    if v_release_amount < 0 then
      v_release_amount := 0;
    end if;

    if v_release_amount > 0 then
      insert into public.ledger_entries (contract_id, milestone_id, from_user, to_user, amount, type)
      values (new.contract_id, new.id, v_owner_id, v_contractor_id, v_release_amount, 'release')
      on conflict (milestone_id, type) do nothing;
    end if;

    if v_retention_amount > 0 then
      v_admin_id := public.platform_admin_id();
      if v_admin_id is not null then
        insert into public.ledger_entries (contract_id, milestone_id, from_user, to_user, amount, type)
        values (new.contract_id, new.id, v_owner_id, v_admin_id, v_retention_amount, 'retention_hold')
        on conflict do nothing;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.release_contract_retention(p_contract_id uuid) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_contractor_id uuid;
  v_admin_id uuid;
  v_available_at timestamptz;
  v_held numeric(12,2);
  v_released numeric(12,2);
  v_to_release numeric(12,2);
begin
  if not public.is_admin() then
    select p.owner_id into v_owner_id
    from public.contracts c
    join public.projects p on p.id = c.project_id
    where c.id = p_contract_id and c.deleted_at is null and p.deleted_at is null;

    if v_owner_id is distinct from auth.uid() then
      raise exception 'Not authorized';
    end if;
  end if;

  select b.contractor_id into v_contractor_id
  from public.contracts c
  join public.bids b on b.id = c.bid_id
  where c.id = p_contract_id and c.deleted_at is null and b.deleted_at is null;

  if v_contractor_id is null then
    raise exception 'Contractor not found';
  end if;

  select rt.retention_release_available_at into v_available_at
  from public.contract_retention_terms rt
  where rt.contract_id = p_contract_id and rt.deleted_at is null;

  if v_available_at is not null and now() < v_available_at then
    raise exception 'Retention is not yet available for release';
  end if;

  select coalesce(sum(le.amount) filter (where le.type = 'retention_hold'), 0) into v_held
  from public.ledger_entries le
  where le.contract_id = p_contract_id;

  select coalesce(sum(le.amount) filter (where le.type = 'retention_release'), 0) into v_released
  from public.ledger_entries le
  where le.contract_id = p_contract_id;

  v_to_release := round((v_held - v_released)::numeric, 2);
  if v_to_release <= 0 then
    return 0;
  end if;

  v_admin_id := public.platform_admin_id();
  if v_admin_id is null then
    raise exception 'Platform admin not found';
  end if;

  insert into public.ledger_entries (contract_id, from_user, to_user, amount, type)
  values (p_contract_id, v_admin_id, v_contractor_id, v_to_release, 'retention_release');

  update public.contract_retention_terms
  set retention_released_at = now(), updated_at = now(), updated_by = auth.uid()
  where contract_id = p_contract_id;

  return v_to_release;
end;
$$;

grant execute on function public.release_contract_retention(uuid) to authenticated;

create or replace view public.contract_financials_v1 as
select
  c.id as contract_id,
  c.project_id,
  coalesce(sum(m.amount) filter (where m.deleted_at is null), 0)::numeric(12,2) as milestone_total,
  coalesce(sum(le.amount) filter (where le.type = 'deposit'), 0)::numeric(12,2) as deposit_total,
  coalesce(sum(le.amount) filter (where le.type = 'release'), 0)::numeric(12,2) as released_total,
  coalesce(sum(le.amount) filter (where le.type = 'retention_hold'), 0)::numeric(12,2) as retention_held_total,
  coalesce(sum(le.amount) filter (where le.type = 'retention_release'), 0)::numeric(12,2) as retention_released_total
from public.contracts c
left join public.milestones m on m.contract_id = c.id
left join public.ledger_entries le on le.contract_id = c.id
where c.deleted_at is null
group by c.id, c.project_id;

grant select on public.contract_financials_v1 to authenticated;

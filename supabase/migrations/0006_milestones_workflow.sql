alter table public.milestones
add column if not exists evidence jsonb;

create unique index if not exists uniq_ledger_milestone_type
on public.ledger_entries (milestone_id, type)
where milestone_id is not null;

drop trigger if exists milestone_after_update on public.milestones;
drop function if exists public.on_milestone_completed();

create function public.on_milestone_status_change() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_contractor_id uuid;
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
    insert into public.ledger_entries (contract_id, milestone_id, from_user, to_user, amount, type)
    values (new.contract_id, new.id, v_owner_id, v_contractor_id, new.amount, 'release')
    on conflict (milestone_id, type) do nothing;
  end if;

  return new;
end;
$$;

create trigger milestone_after_update
after update on public.milestones
for each row
when (old.status is distinct from new.status)
execute function public.on_milestone_status_change();

create function public.validate_milestone_update() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_contractor_id uuid;
begin
  if public.is_admin() then
    return new;
  end if;

  select p.owner_id into v_owner_id
  from public.contracts c
  join public.projects p on p.id = c.project_id
  where c.id = old.contract_id;

  select b.contractor_id into v_contractor_id
  from public.contracts c
  join public.bids b on b.id = c.bid_id
  where c.id = old.contract_id;

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() = v_contractor_id then
    if new.contract_id is distinct from old.contract_id
      or new.sequence is distinct from old.sequence
      or new.amount is distinct from old.amount
      or new.name is distinct from old.name
      or new.due_date is distinct from old.due_date
    then
      raise exception 'Contractor cannot modify milestone structure';
    end if;

    if new.status not in ('not_started', 'in_progress', 'completed') then
      raise exception 'Contractor can only set status to in_progress or completed';
    end if;

    if new.status = 'in_progress' and old.status <> 'not_started' then
      raise exception 'Invalid status transition';
    end if;

    if new.status = 'completed' and old.status <> 'in_progress' then
      raise exception 'Invalid status transition';
    end if;

    if new.status = 'completed' and new.completed_at is null then
      new.completed_at := now();
    end if;

    return new;
  end if;

  if auth.uid() = v_owner_id then
    if new.status = 'approved' and old.status <> 'completed' then
      raise exception 'Only completed milestones can be approved';
    end if;

    if new.status = 'payment_released' and old.status <> 'approved' then
      raise exception 'Only approved milestones can be released';
    end if;

    if old.status <> 'not_started' then
      if new.name is distinct from old.name
        or new.sequence is distinct from old.sequence
        or new.amount is distinct from old.amount
        or new.due_date is distinct from old.due_date
        or new.contract_id is distinct from old.contract_id
      then
        raise exception 'Milestone structure cannot be edited after work starts';
      end if;
    end if;

    return new;
  end if;

  raise exception 'Not authorized';
end;
$$;

drop trigger if exists milestone_before_update on public.milestones;
create trigger milestone_before_update
before update on public.milestones
for each row
execute function public.validate_milestone_update();

drop policy if exists milestones_party_insert on public.milestones;
drop policy if exists milestones_party_update on public.milestones;
drop policy if exists milestones_party_delete on public.milestones;

create policy milestones_owner_insert
on public.milestones
for insert
to authenticated
with check (
  deleted_at is null
  and (
    public.is_admin()
    or exists (
      select 1
      from public.contracts c
      join public.projects p on p.id = c.project_id
      where c.id = milestones.contract_id
        and c.deleted_at is null
        and p.deleted_at is null
        and p.owner_id = auth.uid()
    )
  )
);

create policy milestones_party_update
on public.milestones
for update
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or auth.uid() in (
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
)
with check (
  deleted_at is null
  and (
    public.is_admin()
    or auth.uid() in (
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
);

create policy milestones_owner_delete
on public.milestones
for delete
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or exists (
      select 1
      from public.contracts c
      join public.projects p on p.id = c.project_id
      where c.id = milestones.contract_id
        and c.deleted_at is null
        and p.deleted_at is null
        and p.owner_id = auth.uid()
    )
  )
);

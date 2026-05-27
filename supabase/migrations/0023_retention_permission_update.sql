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
  if not (public.is_admin() or public.has_permission('finance.write')) then
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


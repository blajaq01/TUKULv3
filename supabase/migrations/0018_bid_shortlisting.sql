do $$
declare
  v_conname text;
begin
  select c.conname into v_conname
  from pg_constraint c
  where c.conrelid = 'public.bids'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%status in%';

  if v_conname is not null then
    execute format('alter table public.bids drop constraint %I', v_conname);
  end if;
end
$$;

alter table public.bids
add constraint bids_status_check
check (status in ('pending', 'shortlisted', 'selected', 'rejected', 'withdrawn'));


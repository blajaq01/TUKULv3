do $$
declare
  r record;
begin
  execute 'alter table public.bids drop constraint if exists bids_status_check';

  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.bids'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.bids drop constraint if exists %I', r.conname);
  end loop;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.bids'::regclass
      and c.contype = 'c'
      and c.conname = 'bids_status_check'
  ) then
    execute $q$
      alter table public.bids
      add constraint bids_status_check
      check (status in ('pending', 'shortlisted', 'selected', 'rejected', 'withdrawn'))
    $q$;
  end if;
end
$$;

do $$
declare
  r record;
begin
  execute 'alter table public.platform_integrations drop constraint if exists platform_integrations_type_check';

  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.platform_integrations'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%integration_type%'
  loop
    execute format('alter table public.platform_integrations drop constraint if exists %I', r.conname);
  end loop;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.platform_integrations'::regclass
      and c.contype = 'c'
      and c.conname = 'platform_integrations_type_check'
  ) then
    execute $q$
      alter table public.platform_integrations
      add constraint platform_integrations_type_check
      check (integration_type in ('payment_gateway', 'email_provider', 'sms_provider', 'whatsapp_provider', 'supabase'))
    $q$;
  end if;
end
$$;


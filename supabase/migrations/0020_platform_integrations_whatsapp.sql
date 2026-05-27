do $$
declare
  v_conname text;
begin
  select c.conname into v_conname
  from pg_constraint c
  where c.conrelid = 'public.platform_integrations'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%integration_type in%';

  if v_conname is not null then
    execute format('alter table public.platform_integrations drop constraint %I', v_conname);
  end if;
end
$$;

alter table public.platform_integrations
add constraint platform_integrations_type_check
check (integration_type in ('payment_gateway', 'email_provider', 'sms_provider', 'whatsapp_provider'));


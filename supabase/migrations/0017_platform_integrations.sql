create table if not exists public.platform_integrations (
  id uuid primary key default gen_random_uuid(),
  integration_type text not null check (integration_type in ('payment_gateway', 'email_provider', 'sms_provider')),
  provider text not null,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz,
  unique (integration_type, provider)
);

create index if not exists idx_platform_integrations_type
on public.platform_integrations (integration_type, is_active);

alter table public.platform_integrations enable row level security;
grant select, insert, update, delete on public.platform_integrations to authenticated;

create policy platform_integrations_admin_all
on public.platform_integrations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


insert into public.access_permissions (code, name, description)
values ('landing.manage', 'Landing - manage', 'Manage landing page content and media')
on conflict (code) do nothing;

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users (id)
);

alter table public.site_content enable row level security;

grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

create policy site_content_select_all
on public.site_content
for select
to anon, authenticated
using (true);

create policy site_content_manage
on public.site_content
for all
to authenticated
using (public.has_permission('landing.manage'))
with check (public.has_permission('landing.manage'));

create or replace function public.touch_site_content_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_site_content_updated_at on public.site_content;
create trigger trg_touch_site_content_updated_at
before update on public.site_content
for each row execute function public.touch_site_content_updated_at();

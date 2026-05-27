create table if not exists public.access_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz
);

create table if not exists public.access_permissions (
  code text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.access_roles (id) on delete cascade,
  permission_code text not null references public.access_permissions (code) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id),
  deleted_at timestamptz,
  primary key (role_id, permission_code)
);

create table if not exists public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  role_id uuid not null references public.access_roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id),
  deleted_at timestamptz,
  unique (user_id, role_id)
);

alter table public.access_roles enable row level security;
alter table public.access_permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_role_assignments enable row level security;

grant select on public.access_roles to authenticated;
grant select on public.access_permissions to authenticated;
grant select on public.role_permissions to authenticated;
grant select on public.user_role_assignments to authenticated;

grant insert, update, delete on public.access_roles to authenticated;
grant insert, update, delete on public.access_permissions to authenticated;
grant insert, update, delete on public.role_permissions to authenticated;
grant insert, update, delete on public.user_role_assignments to authenticated;

create policy access_roles_select_all
on public.access_roles
for select
to authenticated
using (deleted_at is null);

create policy access_roles_admin_write
on public.access_roles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy access_permissions_select_all
on public.access_permissions
for select
to authenticated
using (deleted_at is null);

create policy access_permissions_admin_write
on public.access_permissions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy role_permissions_select_all
on public.role_permissions
for select
to authenticated
using (deleted_at is null);

create policy role_permissions_admin_write
on public.role_permissions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy user_role_assignments_self_select
on public.user_role_assignments
for select
to authenticated
using (deleted_at is null and (public.is_admin() or user_id = auth.uid()));

create policy user_role_assignments_admin_write
on public.user_role_assignments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.has_permission(p_code text) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
  or exists (
    select 1
    from public.user_role_assignments ura
    join public.role_permissions rp on rp.role_id = ura.role_id
    where ura.deleted_at is null
      and rp.deleted_at is null
      and ura.user_id = auth.uid()
      and rp.permission_code = p_code
  );
$$;

grant execute on function public.has_permission(text) to authenticated;

insert into public.access_permissions (code, name, description)
values
  ('projects.read', 'Projects - read', 'View projects, bids, and related records'),
  ('projects.write', 'Projects - write', 'Create/update projects and invites/files'),
  ('contracts.read', 'Contracts - read', 'View contracts and milestones'),
  ('contracts.write', 'Contracts - write', 'Update milestones and contract documents'),
  ('finance.read', 'Finance - read', 'View ledger entries, retention, and financial summaries'),
  ('finance.write', 'Finance - write', 'Create deposits and release retention'),
  ('verification.manage', 'Verification - manage', 'Approve/reject contractor verification'),
  ('integrations.manage', 'Integrations - manage', 'Manage platform integrations settings'),
  ('notifications.outbox.read', 'Outbox - read', 'View notification outbox jobs')
on conflict (code) do nothing;

insert into public.access_roles (code, name, description)
values
  ('manager', 'Manager', 'Operational manager access'),
  ('clerk', 'Clerical staff', 'Limited clerical access')
on conflict (code) do nothing;

with roles as (
  select id, code
  from public.access_roles
  where deleted_at is null and code in ('manager', 'clerk')
)
insert into public.role_permissions (role_id, permission_code, created_by)
select r.id, p.code, public.platform_admin_id()
from roles r
join public.access_permissions p on p.deleted_at is null
where
  (r.code = 'manager' and p.code in (
    'projects.read','projects.write','contracts.read','contracts.write','finance.read','finance.write','verification.manage','integrations.manage','notifications.outbox.read'
  ))
  or
  (r.code = 'clerk' and p.code in (
    'projects.read','contracts.read','finance.read'
  ))
on conflict do nothing;


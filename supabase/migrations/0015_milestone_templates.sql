create table if not exists public.milestone_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references public.users (id),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz
);

create index if not exists idx_milestone_templates_created_by
on public.milestone_templates (created_by, created_at desc);

alter table public.milestone_templates enable row level security;
grant select, insert, update, delete on public.milestone_templates to authenticated;

create policy milestone_templates_select
on public.milestone_templates
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or created_by = auth.uid()
    or is_public = true
  )
);

create policy milestone_templates_insert
on public.milestone_templates
for insert
to authenticated
with check (
  deleted_at is null
  and (public.is_admin() or created_by = auth.uid())
);

create policy milestone_templates_update
on public.milestone_templates
for update
to authenticated
using (
  deleted_at is null
  and (public.is_admin() or created_by = auth.uid())
)
with check (deleted_at is null);

create policy milestone_templates_delete
on public.milestone_templates
for delete
to authenticated
using (
  deleted_at is null
  and (public.is_admin() or created_by = auth.uid())
);

create table if not exists public.milestone_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.milestone_templates (id) on delete cascade,
  sequence int not null check (sequence >= 1),
  name text not null,
  description text,
  recommended_percent numeric(5,2) check (recommended_percent is null or (recommended_percent > 0 and recommended_percent <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz,
  unique (template_id, sequence)
);

create index if not exists idx_milestone_template_items_template
on public.milestone_template_items (template_id, sequence);

alter table public.milestone_template_items enable row level security;
grant select, insert, update, delete on public.milestone_template_items to authenticated;

create policy milestone_template_items_select
on public.milestone_template_items
for select
to authenticated
using (
  deleted_at is null
  and template_id in (
    select t.id
    from public.milestone_templates t
    where t.deleted_at is null
      and (public.is_admin() or t.created_by = auth.uid() or t.is_public = true)
  )
);

create policy milestone_template_items_insert
on public.milestone_template_items
for insert
to authenticated
with check (
  deleted_at is null
  and template_id in (
    select t.id
    from public.milestone_templates t
    where t.deleted_at is null
      and (public.is_admin() or t.created_by = auth.uid())
  )
);

create policy milestone_template_items_update
on public.milestone_template_items
for update
to authenticated
using (
  deleted_at is null
  and template_id in (
    select t.id
    from public.milestone_templates t
    where t.deleted_at is null
      and (public.is_admin() or t.created_by = auth.uid())
  )
)
with check (deleted_at is null);

create policy milestone_template_items_delete
on public.milestone_template_items
for delete
to authenticated
using (
  deleted_at is null
  and template_id in (
    select t.id
    from public.milestone_templates t
    where t.deleted_at is null
      and (public.is_admin() or t.created_by = auth.uid())
  )
);


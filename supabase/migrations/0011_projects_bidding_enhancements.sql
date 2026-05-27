alter table public.projects
add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'invite_only')),
add column if not exists target_start_date date,
add column if not exists target_end_date date;

create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  contractor_id uuid not null references public.users (id),
  invited_by uuid not null references public.users (id),
  status text not null default 'invited' check (status in ('invited', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz,
  unique (project_id, contractor_id)
);

create index if not exists idx_project_invites_project
on public.project_invites (project_id, created_at desc);

create index if not exists idx_project_invites_contractor
on public.project_invites (contractor_id, created_at desc);

alter table public.project_invites enable row level security;
grant select, insert, update, delete on public.project_invites to authenticated;

create policy project_invites_party_select
on public.project_invites
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or contractor_id = auth.uid()
    or exists (
      select 1
      from public.projects p
      where p.id = project_invites.project_id
        and p.deleted_at is null
        and p.owner_id = auth.uid()
    )
  )
);

create policy project_invites_owner_insert
on public.project_invites
for insert
to authenticated
with check (
  deleted_at is null
  and invited_by = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = project_invites.project_id
        and p.deleted_at is null
        and p.owner_id = auth.uid()
    )
  )
);

create policy project_invites_owner_update
on public.project_invites
for update
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = project_invites.project_id
        and p.deleted_at is null
        and p.owner_id = auth.uid()
    )
  )
)
with check (deleted_at is null);

create policy project_invites_owner_delete
on public.project_invites
for delete
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = project_invites.project_id
        and p.deleted_at is null
        and p.owner_id = auth.uid()
    )
  )
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uploaded_by uuid not null references public.users (id),
  kind text not null default 'attachment' check (kind in ('photo', 'attachment')),
  file_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz
);

create index if not exists idx_project_files_project
on public.project_files (project_id, created_at desc);

alter table public.project_files enable row level security;
grant select, insert, update, delete on public.project_files to authenticated;

create policy project_files_party_select
on public.project_files
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = project_files.project_id
        and p.deleted_at is null
        and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.projects p
      join public.contractor_profiles cp on cp.contractor_id = auth.uid()
      where p.id = project_files.project_id
        and p.deleted_at is null
        and cp.deleted_at is null
        and cp.verification_status = 'approved'
        and (
          (p.status = 'open' and (p.visibility = 'public' or exists (
            select 1
            from public.project_invites i
            where i.project_id = p.id
              and i.contractor_id = auth.uid()
              and i.deleted_at is null
              and i.status = 'invited'
          )))
          or (p.status <> 'open' and exists (
            select 1
            from public.contracts c
            join public.bids b on b.id = c.bid_id
            where c.project_id = p.id
              and c.deleted_at is null
              and b.deleted_at is null
              and b.contractor_id = auth.uid()
          ))
        )
    )
  )
);

create policy project_files_owner_insert
on public.project_files
for insert
to authenticated
with check (
  deleted_at is null
  and uploaded_by = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = project_files.project_id
        and p.deleted_at is null
        and p.owner_id = auth.uid()
    )
  )
);

create policy project_files_owner_update
on public.project_files
for update
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = project_files.project_id
        and p.deleted_at is null
        and p.owner_id = auth.uid()
    )
  )
)
with check (deleted_at is null);

create policy project_files_owner_delete
on public.project_files
for delete
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or exists (
      select 1
      from public.projects p
      where p.id = project_files.project_id
        and p.deleted_at is null
        and p.owner_id = auth.uid()
    )
  )
);

drop policy if exists project_categories_party_select on public.project_categories;

create policy project_categories_party_select
on public.project_categories
for select
to authenticated
using (
  project_id in (select id from public.projects p where p.owner_id = auth.uid() and p.deleted_at is null)
  or exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.deleted_at is null
      and p.status = 'open'
      and exists (
        select 1
        from public.contractor_profiles cp
        where cp.contractor_id = auth.uid()
          and cp.deleted_at is null
          and cp.verification_status = 'approved'
      )
      and (p.visibility = 'public' or exists (
        select 1
        from public.project_invites i
        where i.project_id = p.id
          and i.contractor_id = auth.uid()
          and i.deleted_at is null
          and i.status = 'invited'
      ))
  )
  or public.is_admin()
);

create policy project_categories_owner_insert
on public.project_categories
for insert
to authenticated
with check (
  public.is_admin()
  or project_id in (select id from public.projects p where p.owner_id = auth.uid() and p.deleted_at is null)
);

create policy project_categories_owner_delete
on public.project_categories
for delete
to authenticated
using (
  public.is_admin()
  or project_id in (select id from public.projects p where p.owner_id = auth.uid() and p.deleted_at is null)
);

drop policy if exists projects_contractor_select_open on public.projects;
create policy projects_contractor_select_open
on public.projects
for select
to authenticated
using (
  deleted_at is null
  and status = 'open'
  and exists (
    select 1
    from public.contractor_profiles cp
    where cp.contractor_id = auth.uid()
      and cp.deleted_at is null
      and cp.verification_status = 'approved'
  )
  and (
    visibility = 'public'
    or exists (
      select 1
      from public.project_invites i
      where i.project_id = projects.id
        and i.contractor_id = auth.uid()
        and i.deleted_at is null
        and i.status = 'invited'
    )
  )
);

drop policy if exists bids_contractor_insert on public.bids;
create policy bids_contractor_insert
on public.bids
for insert
to authenticated
with check (
  deleted_at is null
  and contractor_id = auth.uid()
  and exists (
    select 1
    from public.contractor_profiles cp
    where cp.contractor_id = auth.uid()
      and cp.deleted_at is null
      and cp.verification_status = 'approved'
  )
  and exists (
    select 1
    from public.projects p
    where p.id = bids.project_id
      and p.deleted_at is null
      and p.status = 'open'
      and (
        p.visibility = 'public'
        or exists (
          select 1
          from public.project_invites i
          where i.project_id = p.id
            and i.contractor_id = auth.uid()
            and i.deleted_at is null
            and i.status = 'invited'
        )
      )
  )
);

drop policy if exists bids_contractor_update on public.bids;
create policy bids_contractor_update
on public.bids
for update
to authenticated
using (
  deleted_at is null
  and contractor_id = auth.uid()
)
with check (
  deleted_at is null
  and contractor_id = auth.uid()
  and exists (
    select 1
    from public.contractor_profiles cp
    where cp.contractor_id = auth.uid()
      and cp.deleted_at is null
      and cp.verification_status = 'approved'
  )
);

create table if not exists public.bid_milestones (
  id uuid primary key default gen_random_uuid(),
  bid_id uuid not null references public.bids (id) on delete cascade,
  sequence int not null check (sequence >= 1),
  name text not null,
  description text,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  created_by uuid references public.users (id),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz,
  unique (bid_id, sequence)
);

create index if not exists idx_bid_milestones_bid
on public.bid_milestones (bid_id, sequence);

alter table public.bid_milestones enable row level security;
grant select, insert, update, delete on public.bid_milestones to authenticated;

create policy bid_milestones_party_select
on public.bid_milestones
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or bid_id in (select b.id from public.bids b where b.contractor_id = auth.uid() and b.deleted_at is null)
    or bid_id in (
      select b.id
      from public.bids b
      join public.projects p on p.id = b.project_id
      where p.owner_id = auth.uid()
        and p.deleted_at is null
        and b.deleted_at is null
    )
  )
);

create policy bid_milestones_contractor_insert
on public.bid_milestones
for insert
to authenticated
with check (
  deleted_at is null
  and (
    public.is_admin()
    or bid_id in (select b.id from public.bids b where b.contractor_id = auth.uid() and b.deleted_at is null)
  )
);

create policy bid_milestones_contractor_update
on public.bid_milestones
for update
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or bid_id in (select b.id from public.bids b where b.contractor_id = auth.uid() and b.deleted_at is null)
  )
)
with check (deleted_at is null);

create policy bid_milestones_contractor_delete
on public.bid_milestones
for delete
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or bid_id in (select b.id from public.bids b where b.contractor_id = auth.uid() and b.deleted_at is null)
  )
);

insert into public.categories (name, description)
values
  ('Carpentry', 'Woodwork, cabinetry, custom carpentry'),
  ('Plumbing', 'Plumbing, piping, sanitary works'),
  ('Electrical', 'Electrical wiring, lighting, power points'),
  ('Painting', 'Interior/exterior painting'),
  ('Tiling', 'Floor and wall tiling'),
  ('Renovation', 'General renovation and remodeling'),
  ('Roofing', 'Roof repair and installation'),
  ('Masonry', 'Brickwork and plastering')
on conflict (name) do nothing;


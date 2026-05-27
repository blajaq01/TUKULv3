create table if not exists public.milestone_files (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  uploaded_by uuid not null references public.users (id),
  kind text not null default 'attachment' check (kind in ('photo', 'attachment', 'invoice')),
  file_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz
);

create index if not exists idx_milestone_files_milestone
on public.milestone_files (milestone_id, created_at desc);

alter table public.milestone_files enable row level security;
grant select, insert, update, delete on public.milestone_files to authenticated;

create policy milestone_files_party_select
on public.milestone_files
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or auth.uid() in (
      select b.contractor_id
      from public.milestones m
      join public.contracts c on c.id = m.contract_id
      join public.bids b on b.id = c.bid_id
      where m.id = milestone_files.milestone_id
        and m.deleted_at is null
        and c.deleted_at is null
        and b.deleted_at is null
      union
      select p.owner_id
      from public.milestones m
      join public.contracts c on c.id = m.contract_id
      join public.projects p on p.id = c.project_id
      where m.id = milestone_files.milestone_id
        and m.deleted_at is null
        and c.deleted_at is null
        and p.deleted_at is null
    )
  )
);

create policy milestone_files_party_insert
on public.milestone_files
for insert
to authenticated
with check (
  deleted_at is null
  and uploaded_by = auth.uid()
  and (
    public.is_admin()
    or auth.uid() in (
      select b.contractor_id
      from public.milestones m
      join public.contracts c on c.id = m.contract_id
      join public.bids b on b.id = c.bid_id
      where m.id = milestone_files.milestone_id
        and m.deleted_at is null
        and c.deleted_at is null
        and b.deleted_at is null
      union
      select p.owner_id
      from public.milestones m
      join public.contracts c on c.id = m.contract_id
      join public.projects p on p.id = c.project_id
      where m.id = milestone_files.milestone_id
        and m.deleted_at is null
        and c.deleted_at is null
        and p.deleted_at is null
    )
  )
);

create policy milestone_files_uploader_update
on public.milestone_files
for update
to authenticated
using (
  deleted_at is null
  and (public.is_admin() or uploaded_by = auth.uid())
)
with check (deleted_at is null);

create policy milestone_files_uploader_delete
on public.milestone_files
for delete
to authenticated
using (
  deleted_at is null
  and (public.is_admin() or uploaded_by = auth.uid())
);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  uploaded_by uuid not null references public.users (id),
  file_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_message_attachments_message
on public.message_attachments (message_id, created_at desc);

alter table public.message_attachments enable row level security;
grant select, insert, delete on public.message_attachments to authenticated;

create policy message_attachments_party_select
on public.message_attachments
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_admin()
    or exists (
      select 1
      from public.messages m
      where m.id = message_attachments.message_id
        and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
    )
  )
);

create policy message_attachments_sender_insert
on public.message_attachments
for insert
to authenticated
with check (
  deleted_at is null
  and uploaded_by = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.messages m
      where m.id = message_attachments.message_id
        and m.sender_id = auth.uid()
    )
  )
);

create policy message_attachments_uploader_delete
on public.message_attachments
for delete
to authenticated
using (
  deleted_at is null
  and (public.is_admin() or uploaded_by = auth.uid())
);


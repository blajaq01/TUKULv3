do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'is_admin'
  ) then
    alter table public.users add column is_admin boolean not null default false;
  end if;
end $$;

create or replace function public.is_admin() returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.deleted_at is null
      and u.is_admin = true
  );
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, is_contractor, is_admin, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'is_contractor')::boolean, false),
    lower(new.email) = lower('blajaq01@gmail.com'),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        is_contractor = excluded.is_contractor,
        is_admin = public.users.is_admin or excluded.is_admin;

  return new;
end;
$$;

insert into public.users (id, email, full_name, is_contractor, is_admin, created_at)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data ->> 'full_name', ''),
  coalesce((au.raw_user_meta_data ->> 'is_contractor')::boolean, false),
  lower(au.email) = lower('blajaq01@gmail.com'),
  now()
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;

update public.users
set is_admin = true
where lower(email) = lower('blajaq01@gmail.com');

create policy users_admin_all
on public.users
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy projects_admin_all
on public.projects
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy bids_admin_all
on public.bids
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy contracts_admin_all
on public.contracts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy milestones_admin_all
on public.milestones
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy ledger_entries_admin_all
on public.ledger_entries
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy reviews_admin_all
on public.reviews
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy messages_admin_all
on public.messages
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy categories_admin_all
on public.categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy project_categories_admin_all
on public.project_categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

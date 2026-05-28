do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'state'
  ) then
    alter table public.users add column state text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'district'
  ) then
    alter table public.users add column district text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'area'
  ) then
    alter table public.users add column area text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'service_areas'
  ) then
    alter table public.users add column service_areas text[] not null default '{}'::text[];
  end if;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
  v_district text;
  v_area text;
  v_service_areas text[];
begin
  v_state := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'state', '')), '');
  v_district := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'district', '')), '');
  v_area := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'area', '')), '');

  select coalesce(array_agg(v), '{}'::text[])
  into v_service_areas
  from (
    select distinct btrim(x) as v
    from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'service_areas', '[]'::jsonb)) as x
    where btrim(x) <> ''
    order by btrim(x)
    limit 10
  ) s;

  insert into public.users (id, email, full_name, is_contractor, is_admin, state, district, area, service_areas, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'is_contractor')::boolean, false),
    lower(new.email) = lower('blajaq01@gmail.com'),
    v_state,
    v_district,
    v_area,
    v_service_areas,
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        is_contractor = excluded.is_contractor,
        is_admin = public.users.is_admin or excluded.is_admin,
        state = coalesce(excluded.state, public.users.state),
        district = coalesce(excluded.district, public.users.district),
        area = coalesce(excluded.area, public.users.area),
        service_areas = case when array_length(excluded.service_areas, 1) is null then public.users.service_areas else excluded.service_areas end;

  return new;
end;
$$;


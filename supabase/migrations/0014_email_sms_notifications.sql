create table if not exists public.user_notification_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by uuid references public.users (id),
  deleted_at timestamptz
);

alter table public.user_notification_settings enable row level security;
grant select, insert, update, delete on public.user_notification_settings to authenticated;

create policy user_notification_settings_self_select
on public.user_notification_settings
for select
to authenticated
using (deleted_at is null and (public.is_admin() or user_id = auth.uid()));

create policy user_notification_settings_self_upsert
on public.user_notification_settings
for insert
to authenticated
with check (deleted_at is null and (public.is_admin() or user_id = auth.uid()));

create policy user_notification_settings_self_update
on public.user_notification_settings
for update
to authenticated
using (deleted_at is null and (public.is_admin() or user_id = auth.uid()))
with check (deleted_at is null and (public.is_admin() or user_id = auth.uid()));

create table if not exists public.notification_outbox (
  id bigserial primary key,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  recipient_id uuid not null references public.users (id) on delete cascade,
  channel text not null check (channel in ('email', 'sms')),
  to_address text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_notification_outbox_status
on public.notification_outbox (status, created_at desc);

create index if not exists idx_notification_outbox_recipient
on public.notification_outbox (recipient_id, created_at desc);

alter table public.notification_outbox enable row level security;
grant select, update on public.notification_outbox to authenticated;

create policy notification_outbox_admin_select
on public.notification_outbox
for select
to authenticated
using (public.is_admin());

create policy notification_outbox_admin_update
on public.notification_outbox
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.enqueue_notification_outbox() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_enabled boolean;
  v_sms_enabled boolean;
  v_email text;
  v_phone text;
begin
  select s.email_enabled, s.sms_enabled into v_email_enabled, v_sms_enabled
  from public.user_notification_settings s
  where s.user_id = new.recipient_id and s.deleted_at is null;

  if v_email_enabled is null then
    v_email_enabled := true;
    v_sms_enabled := false;
  end if;

  select u.email, u.phone into v_email, v_phone
  from public.users u
  where u.id = new.recipient_id and u.deleted_at is null;

  if v_email_enabled and v_email is not null and length(v_email) > 0 then
    insert into public.notification_outbox (notification_id, recipient_id, channel, to_address)
    values (new.id, new.recipient_id, 'email', v_email);
  end if;

  if v_sms_enabled and v_phone is not null and length(v_phone) > 0 then
    insert into public.notification_outbox (notification_id, recipient_id, channel, to_address)
    values (new.id, new.recipient_id, 'sms', v_phone);
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_after_insert_outbox on public.notifications;
create trigger notifications_after_insert_outbox
after insert on public.notifications
for each row
execute function public.enqueue_notification_outbox();

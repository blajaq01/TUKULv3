create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_recipient_created
on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;
grant select, update on public.notifications to authenticated;

create policy notifications_recipient_select
on public.notifications
for select
to authenticated
using (recipient_id = auth.uid());

create policy notifications_recipient_update
on public.notifications
for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create policy notifications_admin_all
on public.notifications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.notify(
  p_recipient_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (recipient_id, type, title, body, data)
  values (p_recipient_id, p_type, p_title, p_body, p_data)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.notify(uuid, text, text, text, jsonb) to authenticated;

create or replace function public.notify_on_contractor_profile_change() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status = 'submitted' and (old.verification_status is distinct from new.verification_status) then
    perform public.notify(
      (select id from public.users where is_admin = true and deleted_at is null order by created_at asc limit 1),
      'contractor_verification_submitted',
      'Contractor verification submitted',
      coalesce(new.business_name, 'A contractor') || ' submitted verification.',
      jsonb_build_object('contractor_id', new.contractor_id)
    );
  end if;

  if new.verification_status in ('approved', 'rejected') and (old.verification_status is distinct from new.verification_status) then
    perform public.notify(
      new.contractor_id,
      'contractor_verification_' || new.verification_status,
      'Verification ' || new.verification_status,
      coalesce(new.verification_notes, ''),
      jsonb_build_object('contractor_id', new.contractor_id, 'status', new.verification_status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists contractor_profile_after_update on public.contractor_profiles;
create trigger contractor_profile_after_update
after update on public.contractor_profiles
for each row
execute function public.notify_on_contractor_profile_change();

create or replace function public.notify_on_bid_insert() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select p.owner_id into v_owner_id
  from public.projects p
  where p.id = new.project_id and p.deleted_at is null;

  if v_owner_id is not null then
    perform public.notify(
      v_owner_id,
      'bid_submitted',
      'New bid submitted',
      'A contractor submitted a bid for your project.',
      jsonb_build_object('project_id', new.project_id, 'bid_id', new.id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists bids_after_insert on public.bids;
create trigger bids_after_insert
after insert on public.bids
for each row
execute function public.notify_on_bid_insert();

create or replace function public.notify_on_bid_selected() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'selected' and (old.status is distinct from new.status) then
    perform public.notify(
      new.contractor_id,
      'bid_selected',
      'Bid accepted',
      'Your bid was accepted. A contract has been created.',
      jsonb_build_object('project_id', new.project_id, 'bid_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists bids_after_update_selected on public.bids;
create trigger bids_after_update_selected
after update on public.bids
for each row
execute function public.notify_on_bid_selected();

create or replace function public.notify_on_milestone_status() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_contractor_id uuid;
  v_project_id uuid;
begin
  select p.id, p.owner_id into v_project_id, v_owner_id
  from public.contracts c
  join public.projects p on p.id = c.project_id
  where c.id = new.contract_id and c.deleted_at is null and p.deleted_at is null;

  select b.contractor_id into v_contractor_id
  from public.contracts c
  join public.bids b on b.id = c.bid_id
  where c.id = new.contract_id and c.deleted_at is null and b.deleted_at is null;

  if v_owner_id is null or v_contractor_id is null then
    return new;
  end if;

  if new.status = 'completed' and (old.status is distinct from new.status) then
    perform public.notify(
      v_owner_id,
      'milestone_completed',
      'Milestone completed',
      'A milestone was marked completed and awaits approval.',
      jsonb_build_object('contract_id', new.contract_id, 'milestone_id', new.id, 'project_id', v_project_id)
    );
  end if;

  if new.status = 'approved' and (old.status is distinct from new.status) then
    perform public.notify(
      v_contractor_id,
      'milestone_approved',
      'Milestone approved',
      'A milestone was approved.',
      jsonb_build_object('contract_id', new.contract_id, 'milestone_id', new.id, 'project_id', v_project_id)
    );
  end if;

  if new.status = 'payment_released' and (old.status is distinct from new.status) then
    perform public.notify(
      v_contractor_id,
      'payment_released',
      'Payment released',
      'Payment was released for a milestone.',
      jsonb_build_object('contract_id', new.contract_id, 'milestone_id', new.id, 'project_id', v_project_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists milestones_after_update_notify on public.milestones;
create trigger milestones_after_update_notify
after update on public.milestones
for each row
execute function public.notify_on_milestone_status();

create or replace function public.notify_on_message_insert() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify(
    new.receiver_id,
    'message_received',
    'New message',
    new.content,
    jsonb_build_object('project_id', new.project_id, 'message_id', new.id, 'sender_id', new.sender_id)
  );
  return new;
end;
$$;

drop trigger if exists messages_after_insert_notify on public.messages;
create trigger messages_after_insert_notify
after insert on public.messages
for each row
execute function public.notify_on_message_insert();

create or replace function public.notify_bid_shortlisted() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'shortlisted' and old.status is distinct from new.status then
    perform public.notify(
      new.contractor_id,
      'bid_shortlisted',
      'You have been shortlisted',
      'The project owner shortlisted your bid.',
      jsonb_build_object('project_id', new.project_id, 'bid_id', new.id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists bids_after_update_shortlisted on public.bids;
create trigger bids_after_update_shortlisted
after update on public.bids
for each row
execute function public.notify_bid_shortlisted();


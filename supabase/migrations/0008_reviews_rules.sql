drop policy if exists reviews_reviewer_insert on public.reviews;

create policy reviews_reviewer_insert
on public.reviews
for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1
    from public.contracts c
    join public.projects p on p.id = c.project_id
    join public.bids b on b.id = c.bid_id
    where p.id = reviews.project_id
      and p.deleted_at is null
      and p.status = 'completed'
      and (
        p.owner_id = auth.uid()
        or b.contractor_id = auth.uid()
      )
  )
  and exists (
    select 1
    from public.contracts c
    join public.projects p on p.id = c.project_id
    join public.bids b on b.id = c.bid_id
    where p.id = reviews.project_id
      and (
        (p.owner_id = auth.uid() and b.contractor_id = reviews.reviewee_id)
        or (b.contractor_id = auth.uid() and p.owner_id = reviews.reviewee_id)
      )
  )
);

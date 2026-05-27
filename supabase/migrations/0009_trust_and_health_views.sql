create or replace view public.contractor_trust_score_v1 as
with contractor_contracts as (
  select
    b.contractor_id,
    c.id as contract_id,
    p.id as project_id,
    p.status as project_status
  from public.contracts c
  join public.bids b on b.id = c.bid_id and b.deleted_at is null
  join public.projects p on p.id = c.project_id and p.deleted_at is null
  where c.deleted_at is null
),
ratings as (
  select
    r.reviewee_id as contractor_id,
    avg(r.rating::numeric) as avg_rating,
    count(*) as review_count
  from public.reviews r
  group by r.reviewee_id
),
completed as (
  select
    contractor_id,
    count(*) filter (where project_status = 'completed') as completed_projects
  from contractor_contracts
  group by contractor_id
),
verification as (
  select
    cp.contractor_id,
    cp.verification_status
  from public.contractor_profiles cp
  where cp.deleted_at is null
)
select
  u.id as contractor_id,
  coalesce(v.verification_status, 'draft') as verification_status,
  coalesce(rt.avg_rating, 0) as avg_rating,
  coalesce(rt.review_count, 0) as review_count,
  coalesce(c.completed_projects, 0) as completed_projects,
  (
    (case when coalesce(v.verification_status, 'draft') = 'approved' then 40 else 0 end)
    + (coalesce(rt.avg_rating, 0) / 5.0 * 40)
    + (least(coalesce(c.completed_projects, 0), 10) / 10.0 * 20)
  )::numeric(5,2) as score
from public.users u
left join verification v on v.contractor_id = u.id
left join ratings rt on rt.contractor_id = u.id
left join completed c on c.contractor_id = u.id
where u.deleted_at is null
  and u.is_contractor = true;

create or replace view public.project_health_v1 as
with contract_projects as (
  select
    c.id as contract_id,
    p.id as project_id,
    p.owner_id,
    b.contractor_id
  from public.contracts c
  join public.projects p on p.id = c.project_id and p.deleted_at is null
  join public.bids b on b.id = c.bid_id and b.deleted_at is null
  where c.deleted_at is null
),
milestone_totals as (
  select
    m.contract_id,
    sum(m.amount)::numeric(12,2) as milestone_total,
    sum(m.amount) filter (where m.status = 'payment_released')::numeric(12,2) as released_total,
    sum(m.amount) filter (where m.status = 'approved')::numeric(12,2) as approved_total,
    sum(m.amount) filter (where m.status = 'completed')::numeric(12,2) as completed_total,
    count(*) filter (where m.status = 'disputed') as disputed_count
  from public.milestones m
  where m.deleted_at is null
  group by m.contract_id
),
ledger_totals as (
  select
    le.contract_id,
    sum(le.amount) filter (where le.type = 'pending_release')::numeric(12,2) as pending_release_total,
    sum(le.amount) filter (where le.type = 'release')::numeric(12,2) as ledger_release_total,
    sum(le.amount) filter (where le.type = 'deposit')::numeric(12,2) as deposit_total,
    sum(le.amount) filter (where le.type = 'refund')::numeric(12,2) as refund_total
  from public.ledger_entries le
  group by le.contract_id
)
select
  cp.project_id,
  cp.contract_id,
  coalesce(mt.milestone_total, 0) as milestone_total,
  coalesce(mt.released_total, 0) as released_total,
  coalesce(mt.approved_total, 0) as approved_total,
  coalesce(mt.completed_total, 0) as completed_total,
  coalesce(mt.disputed_count, 0) as disputed_count,
  coalesce(lt.pending_release_total, 0) as pending_release_total,
  coalesce(lt.ledger_release_total, 0) as ledger_release_total,
  coalesce(lt.deposit_total, 0) as deposit_total,
  coalesce(lt.refund_total, 0) as refund_total
from contract_projects cp
left join milestone_totals mt on mt.contract_id = cp.contract_id
left join ledger_totals lt on lt.contract_id = cp.contract_id;

create or replace view public.contractor_directory as
select
  u.id as contractor_id,
  u.full_name,
  u.email,
  cp.business_name,
  cp.cidb_grade,
  cp.service_areas,
  cp.specialties,
  cp.verification_status,
  ts.avg_rating,
  ts.review_count,
  ts.completed_projects,
  ts.score as trust_score
from public.users u
left join public.contractor_profiles cp on cp.contractor_id = u.id and cp.deleted_at is null
left join public.contractor_trust_score_v1 ts on ts.contractor_id = u.id
where u.deleted_at is null
  and u.is_contractor = true;

grant select on public.contractor_trust_score_v1 to authenticated;
grant select on public.project_health_v1 to authenticated;
grant select on public.contractor_directory to authenticated;

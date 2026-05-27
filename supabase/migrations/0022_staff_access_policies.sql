create policy projects_staff_select
on public.projects
for select
to authenticated
using (deleted_at is null and public.has_permission('projects.read'));

create policy bids_staff_select
on public.bids
for select
to authenticated
using (deleted_at is null and public.has_permission('projects.read'));

create policy bids_staff_update
on public.bids
for update
to authenticated
using (deleted_at is null and public.has_permission('projects.write'))
with check (deleted_at is null and public.has_permission('projects.write'));

create policy contracts_staff_select
on public.contracts
for select
to authenticated
using (deleted_at is null and public.has_permission('contracts.read'));

create policy milestones_staff_select
on public.milestones
for select
to authenticated
using (deleted_at is null and public.has_permission('contracts.read'));

create policy milestones_staff_update
on public.milestones
for update
to authenticated
using (deleted_at is null and public.has_permission('contracts.write'))
with check (deleted_at is null and public.has_permission('contracts.write'));

create policy ledger_entries_staff_select
on public.ledger_entries
for select
to authenticated
using (public.has_permission('finance.read'));

create policy contractor_profiles_staff_select
on public.contractor_profiles
for select
to authenticated
using (deleted_at is null and public.has_permission('verification.manage'));

create policy contractor_profiles_staff_update
on public.contractor_profiles
for update
to authenticated
using (deleted_at is null and public.has_permission('verification.manage'))
with check (deleted_at is null and public.has_permission('verification.manage'));

create policy contractor_documents_staff_select
on public.contractor_documents
for select
to authenticated
using (deleted_at is null and public.has_permission('verification.manage'));

create policy platform_integrations_staff_all
on public.platform_integrations
for all
to authenticated
using (public.has_permission('integrations.manage'))
with check (public.has_permission('integrations.manage'));

create policy notification_outbox_staff_select
on public.notification_outbox
for select
to authenticated
using (public.has_permission('notifications.outbox.read'));


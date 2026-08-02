-- Complete the Milestone 2 permission vocabulary and tenant access history.
-- Additive only: existing memberships, invitations, roles, and audit logs remain intact.

insert into public.platform_permissions(permission_key,label) values
  ('platform.dashboard.view','View Platform Admin Hub'),
  ('platform.communication.view','View platform communications'),
  ('platform.communication.manage','Manage platform communications')
on conflict (permission_key) do update set label=excluded.label;

insert into public.platform_role_permissions(role_key,permission_key)
select 'platform_owner', permission_key from public.platform_permissions
on conflict do nothing;

insert into public.platform_role_permissions(role_key,permission_key) values
  ('platform_admin','platform.dashboard.view'),
  ('platform_admin','platform.communication.view'),
  ('platform_admin','platform.communication.manage'),
  ('platform_support','platform.dashboard.view'),
  ('platform_billing_admin','platform.dashboard.view'),
  ('platform_content_admin','platform.dashboard.view'),
  ('platform_content_admin','platform.communication.view'),
  ('platform_analyst','platform.dashboard.view'),
  ('platform_developer','platform.dashboard.view')
on conflict do nothing;

insert into public.tenant_permissions(permission_key,label) values
  ('tenant.dashboard.view','View tenant dashboard'),
  ('tenant.members.view','View members'),
  ('tenant.members.manage','Manage members'),
  ('tenant.billing.view','View tenant billing'),
  ('tenant.content.view','View tenant content'),
  ('tenant.content.create','Create tenant content'),
  ('tenant.content.edit','Edit tenant content'),
  ('tenant.content.publish','Publish tenant content'),
  ('tenant.courses.manage','Manage courses'),
  ('tenant.podcasts.manage','Manage podcasts'),
  ('tenant.memberships.manage','Manage memberships'),
  ('tenant.shop.manage','Manage shop'),
  ('tenant.orders.view','View orders'),
  ('tenant.communication.view','View communications'),
  ('tenant.communication.create','Create communications'),
  ('tenant.communication.approve','Approve communications'),
  ('tenant.communication.send','Send communications'),
  ('tenant.settings.manage','Manage tenant settings'),
  ('tenant.ai.use','Use tenant AI')
on conflict (permission_key) do update set label=excluded.label;

-- Keep permission resolution functional for legacy assignments without
-- offering these roles for new invitations.
insert into public.tenant_role_definitions(role_key,label,description,status) values
  ('course_manager','Course Manager','Legacy course administration role.','inactive'),
  ('event_manager','Event Manager','Legacy event administration role.','inactive'),
  ('community_manager','Community Manager','Legacy community administration role.','inactive'),
  ('community_moderator','Community Moderator','Legacy community moderation role.','inactive'),
  ('support_staff','Support Staff','Legacy support role.','inactive')
on conflict (role_key) do nothing;

insert into public.tenant_role_permissions(role_key,permission_key)
select 'tenant_owner', permission_key from public.tenant_permissions
on conflict do nothing;

insert into public.tenant_role_permissions(role_key,permission_key) values
  ('tenant_admin','tenant.dashboard.view'),
  ('tenant_admin','tenant.members.view'),
  ('tenant_admin','tenant.members.manage'),
  ('tenant_admin','tenant.billing.view'),
  ('tenant_admin','tenant.billing.manage'),
  ('tenant_admin','tenant.content.view'),
  ('tenant_admin','tenant.content.create'),
  ('tenant_admin','tenant.content.edit'),
  ('tenant_admin','tenant.content.publish'),
  ('tenant_admin','tenant.courses.manage'),
  ('tenant_admin','tenant.podcasts.manage'),
  ('tenant_admin','tenant.memberships.manage'),
  ('tenant_admin','tenant.shop.manage'),
  ('tenant_admin','tenant.orders.view'),
  ('tenant_admin','tenant.communication.view'),
  ('tenant_admin','tenant.communication.create'),
  ('tenant_admin','tenant.communication.approve'),
  ('tenant_admin','tenant.communication.send'),
  ('tenant_admin','tenant.settings.manage'),
  ('tenant_admin','tenant.ai.use'),
  ('billing_admin','tenant.dashboard.view'),
  ('billing_admin','tenant.billing.view'),
  ('billing_admin','tenant.orders.view'),
  ('communication_manager','tenant.dashboard.view'),
  ('communication_manager','tenant.communication.view'),
  ('communication_manager','tenant.communication.create'),
  ('communication_manager','tenant.communication.approve'),
  ('communication_manager','tenant.communication.send'),
  ('content_manager','tenant.dashboard.view'),
  ('content_manager','tenant.content.view'),
  ('content_manager','tenant.content.create'),
  ('content_manager','tenant.content.edit'),
  ('content_manager','tenant.content.publish'),
  ('content_manager','tenant.courses.manage'),
  ('content_manager','tenant.podcasts.manage'),
  ('content_manager','tenant.memberships.manage'),
  ('content_manager','tenant.ai.use'),
  ('support_manager','tenant.dashboard.view'),
  ('support_manager','tenant.members.view'),
  ('support_manager','tenant.members.manage'),
  ('analyst','tenant.dashboard.view'),
  ('analyst','tenant.members.view'),
  ('analyst','tenant.content.view'),
  ('analyst','tenant.billing.view'),
  ('analyst','tenant.orders.view'),
  ('analyst','tenant.communication.view'),
  ('contributor','tenant.dashboard.view'),
  ('contributor','tenant.content.view'),
  ('contributor','tenant.content.create'),
  ('contributor','tenant.content.edit'),
  ('contributor','tenant.ai.use'),
  ('viewer','tenant.dashboard.view'),
  ('viewer','tenant.members.view'),
  ('viewer','tenant.content.view')
on conflict do nothing;

insert into public.tenant_role_permissions(role_key,permission_key) values
  ('course_manager','tenant.dashboard.view'),
  ('course_manager','tenant.content.view'),
  ('course_manager','tenant.content.create'),
  ('course_manager','tenant.content.edit'),
  ('course_manager','tenant.content.publish'),
  ('course_manager','tenant.courses.manage'),
  ('course_manager','tenant.content.manage'),
  ('course_manager','tenant.ai.use'),
  ('course_manager','tenant.workspace.view'),
  ('event_manager','tenant.dashboard.view'),
  ('event_manager','tenant.content.view'),
  ('event_manager','tenant.content.manage'),
  ('event_manager','tenant.workspace.view'),
  ('community_manager','tenant.dashboard.view'),
  ('community_manager','tenant.members.view'),
  ('community_manager','tenant.members.manage'),
  ('community_manager','tenant.content.view'),
  ('community_manager','tenant.workspace.view'),
  ('community_moderator','tenant.dashboard.view'),
  ('community_moderator','tenant.members.view'),
  ('community_moderator','tenant.content.view'),
  ('community_moderator','tenant.workspace.view'),
  ('support_staff','tenant.dashboard.view'),
  ('support_staff','tenant.members.view'),
  ('support_staff','tenant.support.manage'),
  ('support_staff','tenant.workspace.view')
on conflict do nothing;

create or replace function public.has_tenant_permission(
  target_tenant uuid,
  required_permission text
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    join public.tenant_role_permissions role_permission
      on role_permission.role_key=membership.role
    where membership.tenant_id=target_tenant
      and membership.user_id=auth.uid()
      and membership.status='active'
      and role_permission.permission_key=required_permission
  )
$$;
revoke all on function public.has_tenant_permission(uuid,text) from public,anon;
grant execute on function public.has_tenant_permission(uuid,text) to authenticated,service_role;

create table if not exists public.tenant_access_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  membership_id uuid references public.tenant_memberships(id) on delete set null,
  invitation_id uuid references public.tenant_invitations(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_tenant_access_history_tenant_created
  on public.tenant_access_history(tenant_id,created_at desc);
create index if not exists idx_tenant_access_history_target
  on public.tenant_access_history(tenant_id,target_user_id,created_at desc);

alter table public.tenant_access_history enable row level security;
drop policy if exists "authorized tenant users read access history" on public.tenant_access_history;
create policy "authorized tenant users read access history"
  on public.tenant_access_history for select to authenticated
  using (
    public.has_tenant_permission(tenant_id,'tenant.team.view')
    or public.has_platform_permission('platform.tenants.manage')
  );

-- Browser writes are intentionally absent; trusted routes write only after
-- permission checks and always include the resolved tenant ID.

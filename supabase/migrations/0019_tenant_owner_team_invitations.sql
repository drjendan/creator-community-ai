-- Allow trusted tenant-team workflows to invite an additional or replacement
-- Tenant Owner. The final active owner remains protected by migration 0018.

alter table public.tenant_invitations
  drop constraint if exists tenant_invitations_role_check;
alter table public.tenant_invitations
  add constraint tenant_invitations_role_check check (role in (
    'tenant_owner','tenant_admin','billing_admin','communication_manager',
    'content_manager','support_manager','analyst','contributor','viewer',
    'course_manager','event_manager','community_manager','support_staff'
  ));

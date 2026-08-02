alter table public.tenants
  add column if not exists workspace_kind text not null default 'customer';

alter table public.tenants
  drop constraint if exists tenants_workspace_kind_check;

alter table public.tenants
  add constraint tenants_workspace_kind_check
  check (workspace_kind in ('customer', 'demo'));

create unique index if not exists tenants_single_demo_workspace_idx
  on public.tenants (workspace_kind)
  where workspace_kind = 'demo';

comment on column public.tenants.workspace_kind is
  'Customer workspaces must never receive demo business data. Demo is reserved for the future dedicated demo.upnexx.net workspace.';

-- Remove only untouched, unreferenced records created by the retired tenant
-- provisioning seeds. Customized or used records are legitimate tenant data
-- and are deliberately preserved.
delete from public.communication_automations automation
using public.tenants tenant
where automation.tenant_id = tenant.id
  and tenant.workspace_kind = 'customer'
  and automation.name = 'Welcome new members'
  and automation.trigger_type = 'member_joined'
  and automation.status = 'inactive'
  and automation.is_system_default
  and automation.created_at = automation.updated_at
  and not exists (
    select 1 from public.communication_automation_runs run
    where run.automation_id = automation.id
  )
  and 2 = (
    select count(*) from public.communication_automation_steps step
    where step.automation_id = automation.id
  )
  and not exists (
    select 1 from public.communication_automation_steps step
    where step.automation_id = automation.id
      and step.created_at <> step.updated_at
  );

delete from public.email_templates template
using public.tenants tenant
where template.tenant_id = tenant.id
  and tenant.workspace_kind = 'customer'
  and template.created_from_system_template
  and template.created_at = template.updated_at
  and template.name in (
    'Welcome', 'Announcement', 'Newsletter', 'Event Invitation', 'Event Reminder',
    'New Content', 'Course Enrollment', 'Course Reminder', 'Membership Renewal', 'General Update'
  )
  and not exists (
    select 1 from public.email_campaigns campaign
    where campaign.template_id = template.id
  )
  and not exists (
    select 1 from public.communication_automation_steps step
    where step.configuration ->> 'template_id' = template.id::text
  );

delete from public.tenant_membership_plans plan
using public.tenants tenant
where plan.tenant_id = tenant.id
  and tenant.workspace_kind = 'customer'
  and plan.created_from_template
  and plan.created_at = plan.updated_at
  and not exists (
    select 1 from public.member_subscriptions subscription
    where subscription.plan_id = plan.id
  );

create or replace function public.assert_demo_workspace_seed_boundary(target_tenant uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_kind text;
  has_demo_hostname boolean;
begin
  select workspace_kind into target_kind
  from public.tenants
  where id = target_tenant;

  if target_kind is distinct from 'demo' then
    raise exception 'demo_seed_forbidden_for_customer_workspace'
      using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.tenant_domains
    where tenant_id = target_tenant
      and lower(hostname) = 'demo.upnexx.net'
  ) into has_demo_hostname;

  if not has_demo_hostname then
    raise exception 'demo_seed_requires_dedicated_hostname'
      using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.assert_demo_workspace_seed_boundary(uuid) from public;
revoke all on function public.assert_demo_workspace_seed_boundary(uuid) from anon;
revoke all on function public.assert_demo_workspace_seed_boundary(uuid) from authenticated;
grant execute on function public.assert_demo_workspace_seed_boundary(uuid) to service_role;

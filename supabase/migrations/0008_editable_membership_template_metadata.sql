-- Editable, tenant-owned starter membership metadata.
-- The prerequisite columns are repeated here with IF NOT EXISTS so this
-- migration can safely repair projects where migration 0006 was only
-- partially applied.
alter table public.tenant_membership_plans
  add column if not exists description text,
  add column if not exists plan_type text not null default 'free',
  add column if not exists price_annual numeric(12,2) not null default 0,
  add column if not exists currency text not null default 'USD',
  add column if not exists trial_days integer not null default 0,
  add column if not exists community_access boolean not null default false,
  add column if not exists ai_access boolean not null default false,
  add column if not exists ai_monthly_allowance integer not null default 0,
  add column if not exists member_limit integer,
  add column if not exists visibility text not null default 'public',
  add column if not exists sort_order integer not null default 0,
  add column if not exists display_order integer not null default 0,
  add column if not exists is_active boolean not null default true,
  add column if not exists is_editable boolean not null default true,
  add column if not exists created_from_template boolean not null default false,
  add column if not exists template_key text,
  add column if not exists benefits jsonb not null default '[]'::jsonb,
  add column if not exists color text;

alter table public.tenant_membership_plans
  drop constraint if exists tenant_membership_plans_plan_type_check;
alter table public.tenant_membership_plans
  add constraint tenant_membership_plans_plan_type_check
  check (plan_type in ('free','paid'));

alter table public.tenant_membership_plans
  drop constraint if exists tenant_membership_plans_visibility_check;
alter table public.tenant_membership_plans
  add constraint tenant_membership_plans_visibility_check
  check (visibility in ('public','private'));

update public.tenant_membership_plans
set
  display_order = sort_order,
  is_active = (status = 'active')
where display_order = 0 or is_active is distinct from (status = 'active');

alter table public.tenant_membership_plans
  drop constraint if exists tenant_membership_plans_color_check;
alter table public.tenant_membership_plans
  add constraint tenant_membership_plans_color_check
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');

create index if not exists idx_tenant_membership_plans_template
  on public.tenant_membership_plans(tenant_id, template_key)
  where created_from_template;

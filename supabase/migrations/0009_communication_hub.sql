-- UpNexx tenant-scoped Communication Hub, team roles, and expanded branding.
-- Apply after 0008_editable_membership_template_metadata.sql.

alter table public.tenant_memberships drop constraint if exists tenant_memberships_role_check;
alter table public.tenant_memberships add constraint tenant_memberships_role_check check (role in (
  'platform_owner','platform_admin','tenant_owner','tenant_admin',
  'communication_manager','content_manager','course_manager','event_manager',
  'community_manager','community_moderator','analyst','support_staff','member','guest'
));

alter table public.tenant_invitations add column if not exists invited_user_id uuid references auth.users(id) on delete set null;

alter table public.tenant_branding
  add column if not exists square_icon_url text,
  add column if not exists favicon_url text,
  add column if not exists text_color text default '#1f2937',
  add column if not exists member_welcome_image_url text,
  add column if not exists email_logo_url text,
  add column if not exists email_header_text text,
  add column if not exists email_footer_text text,
  add column if not exists welcome_headline text,
  add column if not exists welcome_message text,
  add column if not exists member_term text default 'Member',
  add column if not exists support_email text,
  add column if not exists support_phone text,
  add column if not exists website_url text,
  add column if not exists social_links jsonb not null default '{}';

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(group_id,user_id)
);

create table if not exists public.tenant_communication_provider_configs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email')),
  provider text not null check (provider in ('resend')),
  encrypted_api_key text not null,
  key_last_four text not null,
  from_name text not null,
  from_email text not null,
  reply_to_email text,
  connection_status text not null default 'pending' check (connection_status in ('not_configured','pending','connected','failed','disabled')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','failed')),
  domain_verification_status text,
  last_tested_at timestamptz,
  last_test_result text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,channel,provider)
);

revoke select on table public.tenant_communication_provider_configs from anon, authenticated;
grant select (
  id, tenant_id, channel, provider, key_last_four, from_name, from_email,
  reply_to_email, connection_status, verification_status,
  domain_verification_status, last_tested_at, last_test_result, is_active,
  created_by, updated_by, created_at, updated_at
) on table public.tenant_communication_provider_configs to authenticated;

create table if not exists public.communication_announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  summary text,
  body text not null,
  image_url text,
  status text not null default 'draft' check (status in ('draft','scheduled','published','expired','archived')),
  is_pinned boolean not null default false,
  publish_at timestamptz,
  expires_at timestamptz,
  audience_type text not null default 'all_active_members' check (audience_type in ('all_active_members','membership_plans','groups','segments','individual_members')),
  audience_ids jsonb not null default '[]',
  send_email_notification boolean not null default false,
  comments_enabled boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft','scheduled','sent','archived','canceled')),
  audience_type text not null default 'individual_members' check (audience_type in ('all_active_members','membership_plans','groups','segments','individual_members')),
  audience_ids jsonb not null default '[]',
  send_email_notification boolean not null default false,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_message_recipients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  message_id uuid not null references public.communication_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique(message_id,user_id)
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'general_update',
  subject text not null,
  preview_text text,
  content_json jsonb not null default '[]',
  html_content text not null default '',
  plain_text_content text not null default '',
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_from_system_template boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audience_segments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  match_type text not null default 'and' check (match_type in ('and','or')),
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audience_segment_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  segment_id uuid not null references public.audience_segments(id) on delete cascade,
  rule_type text not null check (rule_type in ('membership_plan','membership_status','group_membership','course_enrollment','event_registration','joined_before','joined_after','email_opt_in','last_login','profile_tag')),
  operator text not null default 'equals',
  rule_value jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  internal_name text not null,
  subject text not null,
  preview_text text,
  template_id uuid references public.email_templates(id) on delete set null,
  content_json jsonb not null default '[]',
  html_content text not null default '',
  plain_text_content text not null default '',
  message_type text not null default 'marketing' check (message_type in ('marketing','transactional')),
  audience_type text not null default 'all_active_members' check (audience_type in ('all_active_members','membership_plans','groups','segments','individual_members')),
  audience_ids jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft','scheduled','processing','sent','partially_sent','failed','canceled','archived')),
  scheduled_at timestamptz,
  processing_started_at timestamptz,
  sent_at timestamptz,
  idempotency_key text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,idempotency_key)
);

create table if not exists public.email_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  status text not null default 'eligible',
  provider_message_id text,
  attempted_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  unique(campaign_id,email)
);

create table if not exists public.member_communication_preferences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  email_enabled boolean not null default true,
  consent_source text not null default 'account',
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(tenant_id,user_id,category)
);

create table if not exists public.communication_consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  category text not null,
  opted_in boolean not null default true,
  consent_source text not null,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(tenant_id,email,category)
);

create table if not exists public.communication_suppressions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  reason text not null check (reason in ('unsubscribed','hard_bounce','complaint','invalid_address','administrator_suppressed','provider_suppressed')),
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,email,reason)
);

create table if not exists public.communication_delivery_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid references public.email_campaigns(id) on delete set null,
  message_id uuid references public.communication_messages(id) on delete set null,
  recipient_id uuid references public.email_campaign_recipients(id) on delete set null,
  provider text not null,
  provider_message_id text,
  provider_event_id text not null,
  event_type text not null check (event_type in ('queued','sent','delivered','opened','clicked','bounced','complained','delayed','failed','suppressed')),
  event_timestamp timestamptz not null,
  provider_payload_reference jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(provider,provider_event_id)
);

create table if not exists public.communication_automations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  trigger_type text not null check (trigger_type in ('member_joined','member_invited','membership_assigned','course_enrollment','event_registration','membership_expiring','content_published')),
  status text not null default 'inactive' check (status in ('inactive','active','archived')),
  is_system_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_automation_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  automation_id uuid not null references public.communication_automations(id) on delete cascade,
  position integer not null default 0,
  action_type text not null check (action_type in ('send_email','create_message','wait','stop')),
  configuration jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(automation_id,position)
);

create table if not exists public.communication_automation_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  automation_id uuid not null references public.communication_automations(id) on delete cascade,
  subject_user_id uuid references auth.users(id) on delete set null,
  trigger_event_id text not null,
  status text not null default 'pending' check (status in ('pending','processing','waiting','completed','failed','canceled')),
  current_step integer not null default 0,
  next_process_at timestamptz,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(automation_id,trigger_event_id)
);

create table if not exists public.communication_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_start date not null,
  emails_attempted integer not null default 0,
  emails_accepted integer not null default 0,
  emails_delivered integer not null default 0,
  campaigns_created integer not null default 0,
  campaigns_sent integer not null default 0,
  templates_created integer not null default 0,
  active_automations integer not null default 0,
  automation_runs integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(tenant_id,period_start)
);

alter table public.communication_usage
  add column if not exists templates_created integer not null default 0,
  add column if not exists active_automations integer not null default 0;

create or replace function public.increment_communication_usage(
  target_tenant uuid,
  attempted_delta integer default 0,
  accepted_delta integer default 0,
  delivered_delta integer default 0,
  campaigns_created_delta integer default 0,
  campaigns_sent_delta integer default 0,
  templates_created_delta integer default 0,
  automation_runs_delta integer default 0
)
returns void
language sql
security definer
set search_path=public
as $$
  insert into public.communication_usage (
    tenant_id, period_start, emails_attempted, emails_accepted,
    emails_delivered, campaigns_created, campaigns_sent,
    templates_created, automation_runs, updated_at
  ) values (
    target_tenant, date_trunc('month', now())::date,
    greatest(attempted_delta,0), greatest(accepted_delta,0),
    greatest(delivered_delta,0), greatest(campaigns_created_delta,0),
    greatest(campaigns_sent_delta,0), greatest(templates_created_delta,0),
    greatest(automation_runs_delta,0), now()
  )
  on conflict (tenant_id,period_start) do update set
    emails_attempted=communication_usage.emails_attempted+greatest(excluded.emails_attempted,0),
    emails_accepted=communication_usage.emails_accepted+greatest(excluded.emails_accepted,0),
    emails_delivered=communication_usage.emails_delivered+greatest(excluded.emails_delivered,0),
    campaigns_created=communication_usage.campaigns_created+greatest(excluded.campaigns_created,0),
    campaigns_sent=communication_usage.campaigns_sent+greatest(excluded.campaigns_sent,0),
    templates_created=communication_usage.templates_created+greatest(excluded.templates_created,0),
    automation_runs=communication_usage.automation_runs+greatest(excluded.automation_runs,0),
    updated_at=now()
$$;

revoke all on function public.increment_communication_usage(uuid,integer,integer,integer,integer,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.increment_communication_usage(uuid,integer,integer,integer,integer,integer,integer,integer) to service_role;

create table if not exists public.communication_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.can_manage_communications(target_tenant uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists (
  select 1 from public.tenant_memberships m
  where m.tenant_id=target_tenant and m.user_id=auth.uid() and m.status='active'
    and m.role in ('tenant_owner','tenant_admin','communication_manager')
) $$;

create or replace function public.is_communication_audience_member(
  target_tenant uuid, target_audience_type text, target_audience_ids jsonb
)
returns boolean language sql stable security definer set search_path=public
as $$
  select public.is_tenant_member(target_tenant) and (
    target_audience_type='all_active_members'
    or (target_audience_type='individual_members' and target_audience_ids ? auth.uid()::text)
    or (target_audience_type='membership_plans' and exists (
      select 1 from public.member_subscriptions s
      where s.tenant_id=target_tenant and s.user_id=auth.uid() and s.status in ('active','trialing')
        and target_audience_ids ? s.plan_id::text
    ))
    or (target_audience_type='groups' and exists (
      select 1 from public.group_members gm
      where gm.tenant_id=target_tenant and gm.user_id=auth.uid()
        and target_audience_ids ? gm.group_id::text
    ))
  )
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'groups','group_members',
    'tenant_communication_provider_configs','communication_announcements','communication_messages',
    'communication_message_recipients','email_templates','audience_segments','audience_segment_rules',
    'email_campaigns','email_campaign_recipients','member_communication_preferences','communication_consents',
    'communication_suppressions','communication_delivery_events','communication_automations',
    'communication_automation_steps','communication_automation_runs','communication_usage',
    'communication_audit_events'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create index if not exists %I on public.%I(tenant_id)','idx_'||t||'_tenant_id',t);
    execute format('drop policy if exists "communication managers read" on public.%I',t);
    execute format('drop policy if exists "communication managers insert" on public.%I',t);
    execute format('drop policy if exists "communication managers update" on public.%I',t);
    execute format('drop policy if exists "communication managers delete" on public.%I',t);
    execute format('create policy "communication managers read" on public.%I for select using (public.can_manage_communications(tenant_id))',t);
    execute format('create policy "communication managers insert" on public.%I for insert with check (public.can_manage_communications(tenant_id))',t);
    execute format('create policy "communication managers update" on public.%I for update using (public.can_manage_communications(tenant_id)) with check (public.can_manage_communications(tenant_id))',t);
    execute format('create policy "communication managers delete" on public.%I for delete using (public.can_manage_communications(tenant_id))',t);
  end loop;
end $$;

-- Member-facing reads and preference ownership are intentionally narrower.
drop policy if exists "communication managers read" on public.communication_announcements;
drop policy if exists "eligible members read announcements" on public.communication_announcements;
create policy "eligible members read announcements" on public.communication_announcements for select using (
  public.can_manage_communications(tenant_id) or (
    public.is_communication_audience_member(tenant_id,audience_type,audience_ids) and status='published'
    and (publish_at is null or publish_at <= now()) and (expires_at is null or expires_at > now())
  )
);
drop policy if exists "communication managers read" on public.communication_message_recipients;
drop policy if exists "members read message recipients" on public.communication_message_recipients;
drop policy if exists "members update own message status" on public.communication_message_recipients;
create policy "members read message recipients" on public.communication_message_recipients for select using (
  public.can_manage_communications(tenant_id) or user_id=auth.uid()
);
create policy "members update own message status" on public.communication_message_recipients for update
  using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "communication managers read" on public.communication_messages;
drop policy if exists "members read assigned messages" on public.communication_messages;
create policy "members read assigned messages" on public.communication_messages for select using (
  public.can_manage_communications(tenant_id) or exists (
    select 1 from public.communication_message_recipients r
    where r.message_id=id and r.tenant_id=communication_messages.tenant_id and r.user_id=auth.uid()
  )
);
drop policy if exists "communication managers read" on public.member_communication_preferences;
drop policy if exists "members read own preferences" on public.member_communication_preferences;
drop policy if exists "members insert own preferences" on public.member_communication_preferences;
drop policy if exists "members update own preferences" on public.member_communication_preferences;
create policy "members read own preferences" on public.member_communication_preferences for select using (
  public.can_manage_communications(tenant_id) or user_id=auth.uid()
);
create policy "members insert own preferences" on public.member_communication_preferences for insert
  with check (user_id=auth.uid() and public.is_tenant_member(tenant_id));
create policy "members update own preferences" on public.member_communication_preferences for update
  using (user_id=auth.uid()) with check (user_id=auth.uid());

insert into public.tenant_feature_entitlements (tenant_id,feature_key,enabled,source)
select t.id, f.key, false, 'override'
from public.tenants t
cross join (values
  ('communication_hub'),('communication_announcements'),('communication_direct_messages'),
  ('communication_email_campaigns'),('communication_templates'),('communication_segments'),
  ('communication_scheduling'),('communication_automations'),('communication_reports'),
  ('communication_byop_email')
) f(key)
on conflict (tenant_id,feature_key) do nothing;

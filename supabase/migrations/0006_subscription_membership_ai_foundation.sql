-- PodcastOS subscription, audience membership, and AI-credit foundation.
-- Extends the concepts introduced by 0002; it intentionally does not create a
-- second platform subscription or audience membership-plan model.

alter table public.tenants
  add column if not exists tenant_type text not null default 'podcaster';
alter table public.tenants drop constraint if exists tenants_tenant_type_check;
alter table public.tenants add constraint tenants_tenant_type_check check (tenant_type in (
  'podcaster','educator','coach','consultant','church_ministry',
  'therapist_wellness','author_speaker','association','nonprofit','other'
));

alter table public.platform_plans add column if not exists price_annual numeric(12,2);
alter table public.platform_plans add column if not exists currency text not null default 'USD';
alter table public.platform_plans add column if not exists billing_frequencies text[] not null default array['monthly','annual'];
alter table public.platform_plans add column if not exists ai_credit_allowance integer not null default 0;
alter table public.platform_plans add column if not exists description text;

insert into public.platform_plans (name,slug,price_monthly,price_annual,status,ai_credit_allowance,description,limits)
values
  ('Creator','creator',49.99,499.90,'active',1000,'For new creator businesses','{"admins":1,"members":250}'::jsonb),
  ('Growth','growth',99.99,999.90,'active',5000,'For growing audiences','{"admins":3,"members":1000}'::jsonb),
  ('Professional','professional',199.99,1999.90,'active',20000,'For established creator teams','{"admins":10,"members":5000}'::jsonb),
  ('Enterprise','enterprise',null,null,'active',100000,'Contract-based platform access','{}'::jsonb),
  ('Trial','trial',0,0,'active',250,'Time-limited evaluation','{"trial_days":14}'::jsonb),
  ('Complimentary','complimentary',0,0,'active',1000,'Platform-granted access','{}'::jsonb),
  ('Custom','custom',null,null,'active',0,'Individually configured access','{}'::jsonb)
on conflict (slug) do update set
  name=excluded.name, price_monthly=excluded.price_monthly, price_annual=excluded.price_annual,
  ai_credit_allowance=excluded.ai_credit_allowance, description=excluded.description,
  limits=excluded.limits, updated_at=now();

alter table public.tenant_subscriptions add column if not exists billing_frequency text not null default 'monthly';
alter table public.tenant_subscriptions add column if not exists trial_starts_at timestamptz;
alter table public.tenant_subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.tenant_subscriptions add column if not exists starts_at timestamptz not null default now();
alter table public.tenant_subscriptions add column if not exists renewal_at timestamptz;
alter table public.tenant_subscriptions add column if not exists custom_price numeric(12,2);
alter table public.tenant_subscriptions add column if not exists complimentary boolean not null default false;
alter table public.tenant_subscriptions add column if not exists stripe_customer_id text;
alter table public.tenant_subscriptions add column if not exists stripe_subscription_id text;
alter table public.tenant_subscriptions add column if not exists ai_credit_allowance integer;
alter table public.tenant_subscriptions add column if not exists current_ai_usage integer not null default 0;
alter table public.tenant_subscriptions drop constraint if exists tenant_subscriptions_billing_frequency_check;
alter table public.tenant_subscriptions add constraint tenant_subscriptions_billing_frequency_check
  check (billing_frequency in ('monthly','annual','custom','none'));
create unique index if not exists idx_tenant_subscriptions_one_per_tenant on public.tenant_subscriptions(tenant_id);

update public.tenant_subscriptions set
  stripe_customer_id=coalesce(stripe_customer_id,provider_customer_id),
  stripe_subscription_id=coalesce(stripe_subscription_id,provider_subscription_id),
  renewal_at=coalesce(renewal_at,current_period_end);

create table if not exists public.tenant_feature_entitlements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  limit_value numeric,
  configuration jsonb not null default '{}',
  source text not null default 'plan' check (source in ('plan','override')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,feature_key)
);

create table if not exists public.tenant_ai_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  allowance integer not null default 0,
  credits_used integer not null default 0,
  projected_credits integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(tenant_id,period_start)
);

create table if not exists public.tenant_ai_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  feature text not null,
  transaction_type text not null check (transaction_type in ('allowance','usage','adjustment','refund')),
  credits integer not null,
  balance_after integer,
  reference_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.tenant_membership_plans add column if not exists description text;
alter table public.tenant_membership_plans add column if not exists plan_type text not null default 'free';
alter table public.tenant_membership_plans add column if not exists price_annual numeric(12,2) not null default 0;
alter table public.tenant_membership_plans add column if not exists currency text not null default 'USD';
alter table public.tenant_membership_plans add column if not exists trial_days integer not null default 0;
alter table public.tenant_membership_plans add column if not exists community_access boolean not null default false;
alter table public.tenant_membership_plans add column if not exists ai_access boolean not null default false;
alter table public.tenant_membership_plans add column if not exists ai_monthly_allowance integer not null default 0;
alter table public.tenant_membership_plans add column if not exists member_limit integer;
alter table public.tenant_membership_plans add column if not exists visibility text not null default 'public';
alter table public.tenant_membership_plans add column if not exists sort_order integer not null default 0;
alter table public.tenant_membership_plans drop constraint if exists tenant_membership_plans_plan_type_check;
alter table public.tenant_membership_plans add constraint tenant_membership_plans_plan_type_check check (plan_type in ('free','paid'));
alter table public.tenant_membership_plans drop constraint if exists tenant_membership_plans_visibility_check;
alter table public.tenant_membership_plans add constraint tenant_membership_plans_visibility_check check (visibility in ('public','private'));

create table if not exists public.membership_plan_features (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.tenant_membership_plans(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  configuration jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id,feature_key)
);

create table if not exists public.content_access_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.tenant_membership_plans(id) on delete cascade,
  content_type text not null check (content_type in ('podcast','episode','course','lesson','resource','event','community_space')),
  content_id uuid,
  access_mode text not null default 'include' check (access_mode in ('include','exclude','all')),
  created_at timestamptz not null default now(),
  unique(plan_id,content_type,content_id)
);

create table if not exists public.membership_ai_allowances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.tenant_membership_plans(id) on delete cascade,
  monthly_allowance integer not null default 0,
  credits_used integer not null default 0,
  period_start date not null default date_trunc('month',now())::date,
  updated_at timestamptz not null default now(),
  unique(plan_id,period_start)
);

alter table public.member_subscriptions add column if not exists starts_at timestamptz not null default now();
alter table public.member_subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.member_subscriptions add column if not exists renewal_at timestamptz;
alter table public.member_subscriptions add column if not exists stripe_customer_id text;
alter table public.member_subscriptions add column if not exists stripe_subscription_id text;

alter table public.ai_usage add column if not exists feature text not null default 'member_assistant';
alter table public.ai_usage add column if not exists model_provider text not null default 'unknown';
alter table public.ai_usage add column if not exists model_name text;
alter table public.ai_usage add column if not exists estimated_provider_cost numeric(12,6) not null default 0;
alter table public.ai_usage add column if not exists credits_charged integer not null default 0;
alter table public.ai_usage add column if not exists request_status text not null default 'completed';
update public.ai_usage set model_name=coalesce(model_name,model), estimated_provider_cost=coalesce(estimated_provider_cost,cost);

create table if not exists public.ai_feature_credit_config (
  id uuid primary key default gen_random_uuid(),
  feature text not null unique,
  base_credits integer not null default 1,
  credits_per_1000_input_tokens numeric(10,3) not null default 1,
  credits_per_1000_output_tokens numeric(10,3) not null default 2,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.ai_feature_credit_config(feature,base_credits,credits_per_1000_input_tokens,credits_per_1000_output_tokens)
values ('creator_studio',1,1,2),('member_assistant',1,1,2),('recommendation_explanation',1,0.5,1),('administrator_insight',1,1,2)
on conflict (feature) do nothing;

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  source_text text,
  output_type text not null,
  audience text,
  tone text,
  length text,
  call_to_action text,
  variation_count integer not null default 1,
  output jsonb not null default '[]',
  status text not null default 'saved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_recommendations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_type text not null,
  content_id uuid,
  title text not null,
  reason text not null,
  score numeric(6,3) not null default 0,
  signals jsonb not null default '{}',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.administrator_ai_insights (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  insight_type text not null,
  title text not null,
  qualified_summary text not null,
  supporting_metrics jsonb not null default '{}',
  confidence numeric(5,4),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create or replace function public.has_active_audience_subscription(target_tenant uuid, target_plan uuid default null)
returns boolean language sql stable security definer set search_path=public
as $$ select exists (
  select 1 from public.member_subscriptions s
  where s.tenant_id=target_tenant and s.user_id=auth.uid()
    and s.status in ('active','trialing')
    and (target_plan is null or s.plan_id=target_plan)
    and (s.current_period_end is null or s.current_period_end > now())
) $$;

create or replace function public.is_tenant_member(target_tenant uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists (
  select 1 from public.tenant_memberships m
  where m.tenant_id=target_tenant and m.user_id=auth.uid() and m.status='active'
) $$;

create or replace function public.has_content_access(
  target_tenant uuid, target_content_type text, target_content_id uuid, required_access text
)
returns boolean language sql stable security definer set search_path=public
as $$
  select
    public.is_platform_admin()
    or public.can_manage_tenant(target_tenant)
    or required_access='public'
    or (
      public.is_tenant_member(target_tenant)
      and required_access='member'
    )
    or exists (
      select 1
      from public.member_subscriptions s
      join public.tenant_membership_plans p on p.id=s.plan_id and p.tenant_id=s.tenant_id
      where s.tenant_id=target_tenant and s.user_id=auth.uid()
        and s.status in ('active','trialing') and p.status='active'
        and coalesce(
          (p.access_rules ->> case target_content_type
            when 'episode' then 'podcasts'
            when 'course' then 'courses'
            when 'resource' then 'resources'
            when 'event' then 'events'
            else target_content_type
          end)::boolean,
          true
        )
        and (
          not exists (select 1 from public.content_access_rules r where r.plan_id=p.id and r.content_type=target_content_type)
          or exists (
            select 1 from public.content_access_rules r
            where r.plan_id=p.id and r.content_type=target_content_type
              and r.access_mode in ('all','include')
              and (r.content_id is null or r.content_id=target_content_id)
          )
        )
    )
$$;

-- RLS for every new tenant-aware table.
do $$
declare t text;
begin
  foreach t in array array[
    'tenant_feature_entitlements','tenant_ai_usage','tenant_ai_credit_transactions',
    'membership_plan_features','content_access_rules','membership_ai_allowances',
    'ai_generations','member_recommendations','administrator_ai_insights'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists "tenant members read" on public.%I',t);
    execute format('drop policy if exists "tenant managers insert" on public.%I',t);
    execute format('drop policy if exists "tenant managers update" on public.%I',t);
    execute format('drop policy if exists "tenant managers delete" on public.%I',t);
    execute format('create policy "tenant members read" on public.%I for select using (public.is_platform_admin() or public.is_tenant_member(tenant_id))',t);
    execute format('create policy "tenant managers insert" on public.%I for insert with check (public.can_manage_tenant(tenant_id))',t);
    execute format('create policy "tenant managers update" on public.%I for update using (public.can_manage_tenant(tenant_id)) with check (public.can_manage_tenant(tenant_id))',t);
    execute format('create policy "tenant managers delete" on public.%I for delete using (public.can_manage_tenant(tenant_id))',t);
    execute format('create index if not exists %I on public.%I(tenant_id)','idx_'||t||'_tenant_id',t);
  end loop;
end $$;

alter table public.ai_feature_credit_config enable row level security;
drop policy if exists "authenticated read credit config" on public.ai_feature_credit_config;
create policy "authenticated read credit config" on public.ai_feature_credit_config
  for select to authenticated using (true);

-- Member-owned AI and recommendation reads are narrower than general tenant reads.
drop policy if exists "tenant members read" on public.ai_generations;
create policy "owners read ai generations" on public.ai_generations for select
  using (public.can_manage_tenant(tenant_id) or user_id=auth.uid());
drop policy if exists "tenant members read" on public.member_recommendations;
create policy "members read own recommendations" on public.member_recommendations for select
  using (public.can_manage_tenant(tenant_id) or user_id=auth.uid());

-- Enforce membership-plan content rules on the main content tables.
drop policy if exists "tenant members read" on public.episodes;
drop policy if exists "public published episodes" on public.episodes;
create policy "authorized published episodes" on public.episodes for select using (
  status='published' and (publish_date is null or publish_date <= now())
  and public.has_content_access(tenant_id,'episode',id,access_level)
);
create policy "tenant managers read all episodes" on public.episodes for select using (public.can_manage_tenant(tenant_id));
drop policy if exists "tenant members read" on public.courses;
drop policy if exists "public published courses" on public.courses;
create policy "authorized published courses" on public.courses for select using (
  status='published' and (publish_date is null or publish_date <= now())
  and public.has_content_access(tenant_id,'course',id,access_level)
);
create policy "tenant managers read all courses" on public.courses for select using (public.can_manage_tenant(tenant_id));
drop policy if exists "tenant members read" on public.events;
drop policy if exists "public published events" on public.events;
create policy "authorized published events" on public.events for select using (
  status='published' and (publish_date is null or publish_date <= now())
  and public.has_content_access(tenant_id,'event',id,access_level)
);
create policy "tenant managers read all events" on public.events for select using (public.can_manage_tenant(tenant_id));
drop policy if exists "tenant members read" on public.resources;
create policy "authorized published resources" on public.resources for select using (
  status='published' and public.has_content_access(tenant_id,'resource',id,access_level)
);
create policy "tenant managers read all resources" on public.resources for select using (public.can_manage_tenant(tenant_id));

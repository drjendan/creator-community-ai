-- Full, time-limited UpNexx trial lifecycle.
-- Active trials receive every standard entitlement. Expiration is read-only and
-- never deletes tenant data.

alter table public.support_requests
  add column if not exists metadata jsonb not null default '{}';

alter table public.tenant_subscriptions
  add column if not exists trial_days_granted integer,
  add column if not exists trial_status text,
  add column if not exists trial_plan_name text not null default 'Professional',
  add column if not exists trial_extended_at timestamptz,
  add column if not exists trial_extended_by uuid references auth.users(id) on delete set null,
  add column if not exists trial_extension_reason text,
  add column if not exists trial_changed_by uuid references auth.users(id) on delete set null,
  add column if not exists trial_changed_role text,
  add column if not exists trial_ended_at timestamptz,
  add column if not exists trial_converted_at timestamptz;

alter table public.tenant_subscriptions
  drop constraint if exists tenant_subscriptions_trial_status_check;
alter table public.tenant_subscriptions
  add constraint tenant_subscriptions_trial_status_check
  check (trial_status is null or trial_status in (
    'pending','active','extended','expired','cancelled','converted'
  ));
alter table public.tenant_subscriptions
  drop constraint if exists tenant_subscriptions_trial_days_granted_check;
alter table public.tenant_subscriptions
  add constraint tenant_subscriptions_trial_days_granted_check
  check (trial_days_granted is null or trial_days_granted between 0 and 3650);

update public.tenant_subscriptions
set
  trial_starts_at = coalesce(trial_starts_at, created_at),
  trial_ends_at = coalesce(trial_ends_at, current_period_end, created_at + interval '7 days'),
  trial_days_granted = coalesce(
    trial_days_granted,
    greatest(0, ceil(extract(epoch from (
      coalesce(trial_ends_at, current_period_end, created_at + interval '7 days')
      - coalesce(trial_starts_at, created_at)
    )) / 86400.0)::integer)
  ),
  trial_status = case
    when coalesce(trial_ends_at, current_period_end, created_at + interval '7 days') <= now()
      then 'expired'
    else 'active'
  end,
  status = case
    when coalesce(trial_ends_at, current_period_end, created_at + interval '7 days') <= now()
      then 'expired_trial'
    else status
  end
where status = 'trialing' or trial_status in ('pending','active','extended');

create table if not exists public.trial_history (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subscription_id uuid not null references public.tenant_subscriptions(id) on delete cascade,
  event_type text not null check (event_type in (
    'started','extended','ended','expired','converted'
  )),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  reason text,
  previous_state jsonb not null default '{}',
  new_state jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_trial_history_tenant_created
  on public.trial_history(tenant_id, created_at desc);
create index if not exists idx_trial_history_subscription
  on public.trial_history(subscription_id, created_at desc);

alter table public.trial_history enable row level security;
drop policy if exists "tenant members read trial history" on public.trial_history;
create policy "tenant members read trial history" on public.trial_history
  for select using (
    public.is_platform_admin() or public.is_tenant_member(tenant_id)
  );
drop policy if exists "platform admins manage trial history" on public.trial_history;
create policy "platform admins manage trial history" on public.trial_history
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create or replace function public.tenant_trial_allows_mutation(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.tenant_subscriptions s
    where s.tenant_id = target_tenant
      and s.trial_status is distinct from 'converted'
      and (
        s.status = 'expired_trial'
        or s.trial_status in ('expired','cancelled')
        or (
          s.status = 'trialing'
          and s.trial_ends_at is not null
          and s.trial_ends_at <= now()
        )
      )
  )
$$;

-- Restrictive policies are ANDed with the existing role/tenant policies. They
-- prevent a browser client from bypassing the matching server-route checks,
-- while leaving every SELECT policy unchanged for read-only access.
do $$
declare t text;
begin
  foreach t in array array[
    'podcasts','episodes','courses','course_modules','lessons',
    'lesson_resources','resources','events','event_replays',
    'community_spaces','community_posts','community_comments',
    'ai_generations','ai_usage','tenant_ai_credit_transactions',
    'email_campaigns','tenant_invitations'
  ] loop
    execute format('drop policy if exists "trial allows inserts" on public.%I', t);
    execute format('drop policy if exists "trial allows updates" on public.%I', t);
    execute format('drop policy if exists "trial allows deletes" on public.%I', t);
    execute format(
      'create policy "trial allows inserts" on public.%I as restrictive for insert with check (public.tenant_trial_allows_mutation(tenant_id))',
      t
    );
    execute format(
      'create policy "trial allows updates" on public.%I as restrictive for update using (public.tenant_trial_allows_mutation(tenant_id)) with check (public.tenant_trial_allows_mutation(tenant_id))',
      t
    );
    execute format(
      'create policy "trial allows deletes" on public.%I as restrictive for delete using (public.tenant_trial_allows_mutation(tenant_id))',
      t
    );
  end loop;
end
$$;

do $$ begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists "trial allows tenant uploads" on storage.objects;
    create policy "trial allows tenant uploads" on storage.objects
      as restrictive for insert
      with check (
        bucket_id <> 'tenant-assets'
        or public.tenant_trial_allows_mutation(((storage.foldername(name))[1])::uuid)
      );
  end if;
end $$;

create or replace function public.record_trial_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_name text;
  event_reason text;
  actor uuid;
  prior jsonb;
  current_state jsonb;
begin
  if tg_op = 'INSERT' and new.status = 'trialing' then
    event_name := 'started';
  elsif tg_op = 'UPDATE' then
    if new.trial_status = 'converted' and old.trial_status is distinct from 'converted' then
      event_name := 'converted';
    elsif new.trial_status = 'cancelled' and old.trial_status is distinct from 'cancelled' then
      event_name := 'ended';
    elsif new.trial_status = 'expired' and old.trial_status is distinct from 'expired' then
      event_name := 'expired';
    elsif new.trial_ends_at is distinct from old.trial_ends_at
      and new.trial_ends_at > old.trial_ends_at then
      event_name := 'extended';
    end if;
  end if;

  if event_name is null then return new; end if;
  actor := coalesce(new.trial_changed_by, new.trial_extended_by, auth.uid());
  event_reason := new.trial_extension_reason;
  prior := case when tg_op = 'INSERT' then '{}'::jsonb else jsonb_build_object(
    'status', old.status,
    'trial_status', old.trial_status,
    'trial_starts_at', old.trial_starts_at,
    'trial_ends_at', old.trial_ends_at,
    'trial_days_granted', old.trial_days_granted,
    'plan_id', old.plan_id
  ) end;
  current_state := jsonb_build_object(
    'status', new.status,
    'trial_status', new.trial_status,
    'trial_starts_at', new.trial_starts_at,
    'trial_ends_at', new.trial_ends_at,
    'trial_days_granted', new.trial_days_granted,
    'plan_id', new.plan_id
  );

  insert into public.trial_history (
    tenant_id, subscription_id, event_type, actor_id, actor_role, reason,
    previous_state, new_state
  ) values (
    new.tenant_id, new.id, event_name, actor, new.trial_changed_role, event_reason,
    prior, current_state
  );

  insert into public.audit_logs (
    tenant_id, user_id, action, entity_type, entity_id, metadata
  ) values (
    new.tenant_id, actor, 'platform.trial.' || event_name,
    'tenant_subscription', new.id,
    jsonb_build_object(
      'reason', event_reason,
      'acting_role', new.trial_changed_role,
      'previous', prior,
      'current', current_state
    )
  );
  return new;
end
$$;

drop trigger if exists tenant_subscription_trial_history on public.tenant_subscriptions;
create trigger tenant_subscription_trial_history
after insert or update of status, trial_status, trial_ends_at, plan_id
on public.tenant_subscriptions
for each row execute function public.record_trial_subscription_change();

-- Backfill a canonical starting event for trials that existed before this migration.
insert into public.trial_history (
  tenant_id, subscription_id, event_type, previous_state, new_state, created_at
)
select
  s.tenant_id,
  s.id,
  'started',
  '{}'::jsonb,
  jsonb_build_object(
    'status', s.status,
    'trial_status', s.trial_status,
    'trial_starts_at', s.trial_starts_at,
    'trial_ends_at', s.trial_ends_at,
    'trial_days_granted', s.trial_days_granted,
    'plan_id', s.plan_id
  ),
  coalesce(s.trial_starts_at, s.created_at)
from public.tenant_subscriptions s
where s.trial_starts_at is not null
  and not exists (
    select 1 from public.trial_history h
    where h.subscription_id = s.id and h.event_type = 'started'
  );

-- A live trial is unrestricted across the standard product catalog.
insert into public.tenant_feature_entitlements (
  tenant_id, feature_key, enabled, source, updated_at
)
select
  s.tenant_id,
  feature_key,
  true,
  'plan',
  now()
from public.tenant_subscriptions s
cross join unnest(array[
  'podcasts','courses','resources','events','community','memberships',
  'creator_ai_studio','communication_hub','communication_announcements',
  'communication_direct_messages','communication_email_campaigns',
  'communication_templates','communication_segments',
  'communication_scheduling','communication_reports','communication_byop_email'
]) as feature_key
where s.status = 'trialing'
  and s.trial_status in ('active','extended')
  and s.trial_ends_at > now()
on conflict (tenant_id, feature_key) do update
set enabled = true, source = 'plan', updated_at = now();

-- Milestone 17: durable abuse controls and reviewable security events.
select pg_advisory_xact_lock(55404, 33);

insert into public.platform_permissions(permission_key,label) values
  ('platform.security.manage','Review and resolve platform security events')
on conflict (permission_key) do update set label=excluded.label;
insert into public.platform_role_permissions(role_key,permission_key) values
  ('platform_owner','platform.security.manage'),
  ('platform_admin','platform.security.manage')
on conflict do nothing;

create table if not exists public.api_rate_limit_windows (
  scope text not null,
  key_hash text not null check(char_length(key_hash)=64),
  window_started_at timestamptz not null,
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  request_count integer not null default 1 check(request_count>0),
  expires_at timestamptz not null,
  primary key(scope,key_hash,window_started_at)
);
create index if not exists idx_api_rate_limit_expiry on public.api_rate_limit_windows(expires_at);
alter table public.api_rate_limit_windows enable row level security;

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  correlation_id text,
  event_type text not null,
  severity text not null default 'warning' check(severity in ('info','warning','critical')),
  fingerprint text not null,
  summary text not null check(char_length(summary) between 1 and 500),
  metadata jsonb not null default '{}',
  status text not null default 'open' check(status in ('open','investigating','resolved','ignored')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  resolution_notes text not null default '' check(char_length(resolution_notes)<=5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_security_events_queue on public.security_events(status,severity,created_at desc);
create index if not exists idx_security_events_tenant on public.security_events(tenant_id,created_at desc);
alter table public.security_events enable row level security;
drop policy if exists "platform audit readers read security events" on public.security_events;
create policy "platform audit readers read security events" on public.security_events for select using(public.has_platform_permission('platform.audit.view'));
drop policy if exists "platform security managers update events" on public.security_events;
create policy "platform security managers update events" on public.security_events for update using(public.has_platform_permission('platform.security.manage')) with check(public.has_platform_permission('platform.security.manage'));
drop policy if exists "tenant data managers read security events" on public.security_events;
create policy "tenant data managers read security events" on public.security_events for select using(tenant_id is not null and public.has_tenant_permission(tenant_id,'tenant.data.manage'));

create or replace function public.consume_api_rate_limit(target_scope text,target_key_hash text,target_limit integer,target_window_seconds integer,target_tenant uuid default null,target_user uuid default null)
returns table(allowed boolean,remaining integer,retry_after_seconds integer)
language plpgsql security definer set search_path=public as $$
declare started timestamptz; current_count integer;
begin
  if target_limit<1 or target_limit>100000 or target_window_seconds<1 or target_window_seconds>86400 or target_key_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_rate_limit_configuration'; end if;
  delete from public.api_rate_limit_windows where scope=target_scope and key_hash=target_key_hash and expires_at<clock_timestamp();
  started:=to_timestamp(floor(extract(epoch from clock_timestamp())/target_window_seconds)*target_window_seconds);
  insert into public.api_rate_limit_windows(scope,key_hash,window_started_at,tenant_id,user_id,request_count,expires_at)
  values(target_scope,target_key_hash,started,target_tenant,target_user,1,started+make_interval(secs=>target_window_seconds))
  on conflict(scope,key_hash,window_started_at) do update set request_count=public.api_rate_limit_windows.request_count+1
  returning request_count into current_count;
  return query select current_count<=target_limit,greatest(target_limit-current_count,0),greatest(ceil(extract(epoch from (started+make_interval(secs=>target_window_seconds)-clock_timestamp())))::integer,1);
end $$;
revoke all on function public.consume_api_rate_limit(text,text,integer,integer,uuid,uuid) from public,anon,authenticated;
grant execute on function public.consume_api_rate_limit(text,text,integer,integer,uuid,uuid) to service_role;

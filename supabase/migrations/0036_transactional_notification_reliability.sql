-- Milestone 20: durable, retryable transactional notification delivery.
select pg_advisory_xact_lock(55404, 36);

create table if not exists public.transactional_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  category text not null check(category in ('tenant_invitation','platform_invitation','access_change','account_security')),
  source_type text check(source_type is null or source_type in ('tenant_invitation','platform_invitation','tenant_membership','platform_administrator')),
  source_id uuid,
  idempotency_key text not null unique check(char_length(idempotency_key) between 16 and 200),
  recipient_hash text not null check(char_length(recipient_hash)=64),
  recipient_hint text not null check(char_length(recipient_hint)<=320),
  encrypted_payload text not null,
  status text not null default 'pending' check(status in ('pending','processing','retry_scheduled','accepted','failed','canceled')),
  attempts integer not null default 0 check(attempts between 0 and 10),
  max_attempts integer not null default 5 check(max_attempts between 1 and 10),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  provider text not null default 'resend',
  provider_message_id text,
  last_error text not null default '' check(char_length(last_error)<=1000),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_transactional_notification_queue on public.transactional_notification_deliveries(status,next_attempt_at) where status in ('pending','processing','retry_scheduled');
create index if not exists idx_transactional_notification_tenant on public.transactional_notification_deliveries(tenant_id,created_at desc);
alter table public.transactional_notification_deliveries enable row level security;

drop policy if exists "platform auditors read notification deliveries" on public.transactional_notification_deliveries;
create policy "platform auditors read notification deliveries" on public.transactional_notification_deliveries for select using(public.has_platform_permission('platform.audit.view'));
drop policy if exists "tenant communication managers read notification deliveries" on public.transactional_notification_deliveries;
create policy "tenant communication managers read notification deliveries" on public.transactional_notification_deliveries for select using(tenant_id is not null and public.has_tenant_permission(tenant_id,'tenant.communication.view'));

create or replace function public.claim_transactional_notification_deliveries(batch_size integer default 25)
returns setof public.transactional_notification_deliveries
language plpgsql security definer set search_path=public as $$
begin
  if batch_size<1 or batch_size>100 then raise exception 'invalid_notification_batch_size'; end if;
  return query
  with candidates as (
    select id from public.transactional_notification_deliveries
    where (status in ('pending','retry_scheduled') and next_attempt_at<=clock_timestamp())
       or (status='processing' and locked_at<clock_timestamp()-interval '10 minutes')
    order by next_attempt_at,created_at
    for update skip locked limit batch_size
  )
  update public.transactional_notification_deliveries delivery
  set status='processing',attempts=delivery.attempts+1,locked_at=clock_timestamp(),updated_at=clock_timestamp()
  from candidates where delivery.id=candidates.id
  returning delivery.*;
end $$;
revoke all on function public.claim_transactional_notification_deliveries(integer) from public,anon,authenticated;
grant execute on function public.claim_transactional_notification_deliveries(integer) to service_role;

create or replace function public.retry_transactional_notification_delivery(delivery_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.has_platform_permission('platform.operations.manage') then raise exception 'insufficient_permission'; end if;
  update public.transactional_notification_deliveries set status='retry_scheduled',next_attempt_at=now(),locked_at=null,last_error='',updated_at=now()
  where id=delivery_id and status in ('failed','retry_scheduled');
  return found;
end $$;
revoke all on function public.retry_transactional_notification_delivery(uuid) from public,anon;
grant execute on function public.retry_transactional_notification_delivery(uuid) to authenticated,service_role;

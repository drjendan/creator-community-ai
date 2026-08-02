-- Milestone 12: complete event scheduling, registration, attendance, and replay workflows.

insert into public.tenant_permissions(permission_key,label) values
  ('tenant.events.manage','Manage events')
on conflict (permission_key) do update set label=excluded.label;
insert into public.tenant_role_permissions(role_key,permission_key) values
  ('tenant_owner','tenant.events.manage'),
  ('tenant_admin','tenant.events.manage'),
  ('content_manager','tenant.events.manage'),
  ('event_manager','tenant.events.manage')
on conflict do nothing;

alter table public.events
  add column if not exists ends_at timestamptz,
  add column if not exists timezone text not null default 'UTC',
  add column if not exists event_format text not null default 'online',
  add column if not exists venue_name text not null default '',
  add column if not exists venue_address text not null default '',
  add column if not exists capacity integer,
  add column if not exists registration_required boolean not null default true,
  add column if not exists registration_deadline timestamptz,
  add column if not exists waitlist_enabled boolean not null default true,
  add column if not exists member_instructions text not null default '',
  add column if not exists featured boolean not null default false;
alter table public.events drop constraint if exists events_schedule_check;
alter table public.events add constraint events_schedule_check check(
  (ends_at is null or ends_at>starts_at)
  and (registration_deadline is null or registration_deadline<=starts_at)
  and (capacity is null or capacity>0)
);
alter table public.events drop constraint if exists events_format_check;
alter table public.events add constraint events_format_check check(event_format in ('online','in_person','hybrid'));

alter table public.event_registrations
  add column if not exists registered_at timestamptz not null default now(),
  add column if not exists cancelled_at timestamptz,
  add column if not exists checked_in_at timestamptz;
alter table public.event_registrations drop constraint if exists event_registrations_status_check;
alter table public.event_registrations add constraint event_registrations_status_check check(status in ('registered','waitlisted','cancelled','attended','no_show'));

alter table public.event_replays
  add column if not exists title text not null default 'Event replay',
  add column if not exists description text not null default '',
  add column if not exists allow_download boolean not null default false,
  add column if not exists sort_order integer not null default 0;
alter table public.event_replays drop constraint if exists event_replays_access_check;
alter table public.event_replays add constraint event_replays_access_check check(access_level in ('public','member','paid'));
alter table public.event_replays drop constraint if exists event_replays_status_check;
alter table public.event_replays add constraint event_replays_status_check check(status in ('draft','published'));

create index if not exists idx_events_schedule on public.events(tenant_id,starts_at,status);
create index if not exists idx_event_registrations_roster on public.event_registrations(tenant_id,event_id,status,registered_at);
create index if not exists idx_event_replays_order on public.event_replays(tenant_id,event_id,sort_order);

create or replace function public.can_manage_event_content(target_tenant uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.is_platform_admin() or public.has_tenant_permission(target_tenant,'tenant.events.manage') $$;

drop policy if exists "tenant members read" on public.event_registrations;
drop policy if exists "users register self" on public.event_registrations;
drop policy if exists "members read own event registrations" on public.event_registrations;
create policy "members read own event registrations" on public.event_registrations for select using(
  user_id=auth.uid() or public.can_manage_event_content(tenant_id)
);
drop policy if exists "event managers insert registrations" on public.event_registrations;
create policy "event managers insert registrations" on public.event_registrations for insert with check(public.can_manage_event_content(tenant_id));
drop policy if exists "event managers update registrations" on public.event_registrations;
create policy "event managers update registrations" on public.event_registrations for update using(public.can_manage_event_content(tenant_id)) with check(public.can_manage_event_content(tenant_id));
drop policy if exists "event managers delete registrations" on public.event_registrations;
create policy "event managers delete registrations" on public.event_registrations for delete using(public.can_manage_event_content(tenant_id));

drop policy if exists "tenant members read" on public.event_replays;
drop policy if exists "members read accessible event replays" on public.event_replays;
create policy "members read accessible event replays" on public.event_replays for select using(
  (status='published' and exists(
    select 1 from public.events event
    where event.id=event_replays.event_id and event.tenant_id=event_replays.tenant_id
      and event.status='published'
      and public.has_content_access(event_replays.tenant_id,'event',event.id,event_replays.access_level)
  )) or public.can_manage_event_content(tenant_id)
);
drop policy if exists "event managers insert replays" on public.event_replays;
create policy "event managers insert replays" on public.event_replays for insert with check(public.can_manage_event_content(tenant_id));
drop policy if exists "event managers update replays" on public.event_replays;
create policy "event managers update replays" on public.event_replays for update using(public.can_manage_event_content(tenant_id)) with check(public.can_manage_event_content(tenant_id));
drop policy if exists "event managers delete replays" on public.event_replays;
create policy "event managers delete replays" on public.event_replays for delete using(public.can_manage_event_content(tenant_id));

create or replace function public.validate_event_support_relationships()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.events where id=new.event_id and tenant_id=new.tenant_id) then raise exception 'invalid_event_relationship'; end if;
  return new;
end $$;
drop trigger if exists validate_event_registration_relationship on public.event_registrations;
create trigger validate_event_registration_relationship before insert or update on public.event_registrations for each row execute function public.validate_event_support_relationships();
drop trigger if exists validate_event_replay_relationship on public.event_replays;
create trigger validate_event_replay_relationship before insert or update on public.event_replays for each row execute function public.validate_event_support_relationships();

create or replace function public.register_for_event(target_event uuid)
returns text language plpgsql security definer set search_path=public as $$
declare
  target public.events%rowtype;
  current_count integer;
  next_status text;
  current_status text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into target from public.events where id=target_event for update;
  if target.id is null or target.status<>'published' or target.starts_at<=now() then raise exception 'event_unavailable'; end if;
  if not public.is_tenant_member(target.tenant_id) or not public.has_content_access(target.tenant_id,'event',target.id,target.access_level) then raise exception 'event_access_denied'; end if;
  if target.registration_deadline is not null and target.registration_deadline<now() then raise exception 'registration_closed'; end if;
  select status into current_status from public.event_registrations where event_id=target.id and user_id=auth.uid();
  if current_status in ('registered','waitlisted','attended') then return current_status; end if;
  select count(*) into current_count from public.event_registrations where event_id=target.id and status in ('registered','attended');
  if target.capacity is null or current_count<target.capacity then next_status := 'registered';
  elsif target.waitlist_enabled then next_status := 'waitlisted';
  else raise exception 'event_full';
  end if;
  insert into public.event_registrations(tenant_id,event_id,user_id,status,registered_at,cancelled_at,updated_at)
  values(target.tenant_id,target.id,auth.uid(),next_status,now(),null,now())
  on conflict(event_id,user_id) do update set status=excluded.status,registered_at=excluded.registered_at,cancelled_at=null,updated_at=now();
  return next_status;
end $$;

create or replace function public.cancel_event_registration(target_event uuid)
returns text language plpgsql security definer set search_path=public as $$
declare previous_status text; next_registration uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select status into previous_status from public.event_registrations where event_id=target_event and user_id=auth.uid() for update;
  if previous_status is null then raise exception 'registration_not_found'; end if;
  update public.event_registrations set status='cancelled',cancelled_at=now(),updated_at=now() where event_id=target_event and user_id=auth.uid();
  if previous_status='registered' then
    select id into next_registration from public.event_registrations where event_id=target_event and status='waitlisted' order by registered_at limit 1 for update skip locked;
    update public.event_registrations set status='registered',updated_at=now() where id=next_registration;
  end if;
  return 'cancelled';
end $$;

revoke all on function public.register_for_event(uuid) from public;
revoke all on function public.cancel_event_registration(uuid) from public;
grant execute on function public.register_for_event(uuid) to authenticated;
grant execute on function public.cancel_event_registration(uuid) to authenticated;

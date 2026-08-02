-- Milestone 7: trusted AI Studio sources, versioned drafts, and Content Library integration.

alter table public.ai_generations
  add column if not exists source_title text,
  add column if not exists channel text,
  add column if not exists prompt_config jsonb not null default '{}',
  add column if not exists provider text,
  add column if not exists model text,
  add column if not exists credits_charged integer not null default 0,
  add column if not exists current_version integer not null default 1;

create table if not exists public.ai_generation_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  generation_id uuid not null references public.ai_generations(id) on delete cascade,
  version integer not null,
  output jsonb not null default '[]',
  status text not null default 'draft',
  change_type text not null default 'generated' check (change_type in ('generated','edited','regenerated','status_changed')),
  edited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(generation_id,version)
);
create index if not exists idx_ai_generation_versions_tenant_created
  on public.ai_generation_versions(tenant_id,created_at desc);
alter table public.ai_generation_versions enable row level security;
drop policy if exists "authorized users read AI generation versions" on public.ai_generation_versions;
create policy "authorized users read AI generation versions" on public.ai_generation_versions for select to authenticated
  using (public.has_tenant_permission(tenant_id,'tenant.ai.use'));

-- Repair the Content Library prerequisite when an environment reports 0021 as
-- applied but does not contain its assignment relation. These statements are
-- idempotent and preserve existing assignments when the table already exists.
create table if not exists public.content_category_assignments (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null references public.content_categories(id) on delete cascade,
  content_type text not null,
  content_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (category_id,content_type,content_id)
);
create index if not exists idx_content_category_assignments_tenant_content
  on public.content_category_assignments(tenant_id,content_type,content_id);
alter table public.content_category_assignments enable row level security;
drop policy if exists "tenant content viewers read category assignments" on public.content_category_assignments;
create policy "tenant content viewers read category assignments" on public.content_category_assignments for select to authenticated
  using (public.is_tenant_member(tenant_id));

create or replace function public.remove_content_category_assignments()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  delete from public.content_category_assignments
  where tenant_id=old.tenant_id and content_type=tg_argv[0] and content_id=old.id;
  return old;
end $$;
drop trigger if exists remove_episode_category_assignments on public.episodes;
create trigger remove_episode_category_assignments after delete on public.episodes for each row execute function public.remove_content_category_assignments('episodes');
drop trigger if exists remove_course_category_assignments on public.courses;
create trigger remove_course_category_assignments after delete on public.courses for each row execute function public.remove_content_category_assignments('courses');
drop trigger if exists remove_resource_category_assignments on public.resources;
create trigger remove_resource_category_assignments after delete on public.resources for each row execute function public.remove_content_category_assignments('resources');
drop trigger if exists remove_event_category_assignments on public.events;
create trigger remove_event_category_assignments after delete on public.events for each row execute function public.remove_content_category_assignments('events');

alter table public.content_categories drop constraint if exists content_categories_content_type_check;
alter table public.content_categories add constraint content_categories_content_type_check
  check (content_type in ('all','podcasts','courses','resources','events','ai_generations'));
alter table public.content_category_assignments drop constraint if exists content_category_assignments_content_type_check;
alter table public.content_category_assignments add constraint content_category_assignments_content_type_check
  check (content_type in ('episodes','courses','resources','events','ai_generations'));

create or replace function public.validate_content_category_assignment()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  category_scope text;
  expected_scope text;
begin
  expected_scope := new.content_type;
  if new.content_type = 'episodes' then
    expected_scope := 'podcasts';
  end if;
  select content_type into category_scope from public.content_categories where id=new.category_id and tenant_id=new.tenant_id;
  if category_scope is null then raise exception 'invalid_content_category'; end if;
  if category_scope <> 'all' and category_scope <> expected_scope then
    raise exception 'category_content_type_mismatch';
  end if;
  if (new.content_type='episodes' and not exists(select 1 from public.episodes where id=new.content_id and tenant_id=new.tenant_id))
    or (new.content_type='courses' and not exists(select 1 from public.courses where id=new.content_id and tenant_id=new.tenant_id))
    or (new.content_type='resources' and not exists(select 1 from public.resources where id=new.content_id and tenant_id=new.tenant_id))
    or (new.content_type='events' and not exists(select 1 from public.events where id=new.content_id and tenant_id=new.tenant_id))
    or (new.content_type='ai_generations' and not exists(select 1 from public.ai_generations where id=new.content_id and tenant_id=new.tenant_id)) then
    raise exception 'invalid_tenant_content';
  end if;
  return new;
end $$;
drop trigger if exists validate_content_category_assignment on public.content_category_assignments;
create trigger validate_content_category_assignment before insert or update on public.content_category_assignments
for each row execute function public.validate_content_category_assignment();

drop trigger if exists remove_ai_generation_category_assignments on public.ai_generations;
create trigger remove_ai_generation_category_assignments after delete on public.ai_generations
for each row execute function public.remove_content_category_assignments('ai_generations');

create or replace function public.replace_content_category_assignments(target_tenant uuid,target_type text,target_content uuid,target_categories uuid[])
returns void language plpgsql security definer set search_path=public as $$
declare category_id uuid;
begin
  if coalesce(auth.role(),'') <> 'service_role'
     and not public.has_tenant_permission(target_tenant,'tenant.content.manage')
     and not public.has_platform_permission('platform.tenants.manage') then
    raise exception 'content_management_permission_required';
  end if;
  if target_type not in ('episodes','courses','resources','events','ai_generations') then raise exception 'invalid_content_type'; end if;
  delete from public.content_category_assignments where tenant_id=target_tenant and content_type=target_type and content_id=target_content;
  foreach category_id in array coalesce(target_categories,array[]::uuid[]) loop
    insert into public.content_category_assignments(tenant_id,category_id,content_type,content_id)
    values(target_tenant,category_id,target_type,target_content);
  end loop;
end $$;
revoke all on function public.replace_content_category_assignments(uuid,text,uuid,uuid[]) from public,anon;
grant execute on function public.replace_content_category_assignments(uuid,text,uuid,uuid[]) to authenticated,service_role;

create table if not exists public.ai_credit_reservations (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  reserved_credits integer not null check (reserved_credits > 0),
  charged_credits integer not null default 0 check (charged_credits >= 0),
  status text not null default 'reserved' check (status in ('reserved','settled','released')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index if not exists idx_ai_credit_reservations_tenant_created on public.ai_credit_reservations(tenant_id,created_at desc);
alter table public.ai_credit_reservations enable row level security;

create or replace function public.reserve_tenant_ai_credits(target_tenant uuid,target_reservation uuid,target_user uuid,target_credits integer)
returns integer language plpgsql security definer set search_path=public as $$
declare remaining integer;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'service_role_required'; end if;
  if target_credits <= 0 then raise exception 'invalid_credit_reservation'; end if;
  if exists(select 1 from public.ai_credit_reservations where id=target_reservation and tenant_id=target_tenant) then
    select ai_credit_allowance-current_ai_usage into remaining from public.tenant_subscriptions where tenant_id=target_tenant;
    return remaining;
  end if;
  update public.tenant_subscriptions
  set current_ai_usage=current_ai_usage+target_credits, updated_at=now()
  where tenant_id=target_tenant and current_ai_usage+target_credits <= ai_credit_allowance
  returning ai_credit_allowance-current_ai_usage into remaining;
  if remaining is null then raise exception 'ai_allowance_exhausted'; end if;
  insert into public.ai_credit_reservations(id,tenant_id,user_id,reserved_credits)
  values(target_reservation,target_tenant,target_user,target_credits);
  return remaining;
end $$;

create or replace function public.settle_tenant_ai_credits(target_reservation uuid,target_charged integer)
returns void language plpgsql security definer set search_path=public as $$
declare reservation public.ai_credit_reservations%rowtype;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'service_role_required'; end if;
  select * into reservation from public.ai_credit_reservations where id=target_reservation for update;
  if reservation.id is null then raise exception 'credit_reservation_not_found'; end if;
  if reservation.status <> 'reserved' then return; end if;
  if target_charged < 0 or target_charged > reservation.reserved_credits then raise exception 'invalid_credit_settlement'; end if;
  update public.tenant_subscriptions
  set current_ai_usage=greatest(0,current_ai_usage-(reservation.reserved_credits-target_charged)), updated_at=now()
  where tenant_id=reservation.tenant_id;
  update public.ai_credit_reservations set charged_credits=target_charged,status='settled',settled_at=now() where id=target_reservation;
end $$;

create or replace function public.release_tenant_ai_credits(target_reservation uuid)
returns void language plpgsql security definer set search_path=public as $$
declare reservation public.ai_credit_reservations%rowtype;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'service_role_required'; end if;
  select * into reservation from public.ai_credit_reservations where id=target_reservation for update;
  if reservation.id is null or reservation.status <> 'reserved' then return; end if;
  update public.tenant_subscriptions set current_ai_usage=greatest(0,current_ai_usage-reservation.reserved_credits),updated_at=now() where tenant_id=reservation.tenant_id;
  update public.ai_credit_reservations set status='released',settled_at=now() where id=target_reservation;
end $$;
revoke all on function public.reserve_tenant_ai_credits(uuid,uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.settle_tenant_ai_credits(uuid,integer) from public,anon,authenticated;
revoke all on function public.release_tenant_ai_credits(uuid) from public,anon,authenticated;
grant execute on function public.reserve_tenant_ai_credits(uuid,uuid,uuid,integer) to service_role;
grant execute on function public.settle_tenant_ai_credits(uuid,integer) to service_role;
grant execute on function public.release_tenant_ai_credits(uuid) to service_role;

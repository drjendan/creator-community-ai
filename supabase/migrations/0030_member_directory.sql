-- Milestone 14: complete audience member profiles, segmentation, notes, and lifecycle management.

alter table public.tenant_invitations drop constraint if exists tenant_invitations_role_check;
alter table public.tenant_invitations add constraint tenant_invitations_role_check check(role in (
  'tenant_owner','tenant_admin','billing_admin','communication_manager','content_manager',
  'support_manager','analyst','contributor','viewer','course_manager','event_manager',
  'community_manager','support_staff','member','guest'
));

alter table public.tenant_memberships
  add column if not exists audience_source text not null default 'direct',
  add column if not exists lifecycle_stage text not null default 'active';
alter table public.tenant_memberships drop constraint if exists tenant_memberships_audience_source_check;
alter table public.tenant_memberships add constraint tenant_memberships_audience_source_check check(audience_source in ('direct','invitation','signup','checkout','import','admin'));
alter table public.tenant_memberships drop constraint if exists tenant_memberships_lifecycle_stage_check;
alter table public.tenant_memberships add constraint tenant_memberships_lifecycle_stage_check check(lifecycle_stage in ('lead','onboarding','active','at_risk','inactive','alumni'));
alter table public.member_subscriptions add column if not exists assignment_type text not null default 'stripe';
alter table public.member_subscriptions drop constraint if exists member_subscriptions_assignment_type_check;
alter table public.member_subscriptions add constraint member_subscriptions_assignment_type_check check(assignment_type in ('stripe','manual','complimentary'));

create table if not exists public.tenant_member_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  membership_id uuid not null references public.tenant_memberships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  preferred_name text not null default '',
  job_title text not null default '',
  organization text not null default '',
  phone text not null default '',
  location text not null default '',
  timezone text not null default 'UTC',
  bio text not null default '',
  custom_fields jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(membership_id),
  unique(tenant_id,user_id)
);

create table if not exists public.member_tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  color text not null default '#5b46d8',
  description text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,name)
);

create table if not exists public.member_tag_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  membership_id uuid not null references public.tenant_memberships(id) on delete cascade,
  tag_id uuid not null references public.member_tags(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(membership_id,tag_id)
);

create table if not exists public.member_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  membership_id uuid not null references public.tenant_memberships(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 5000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tenant_memberships_audience on public.tenant_memberships(tenant_id,role,status,lifecycle_stage,created_at desc);
create index if not exists idx_member_tags_tenant on public.member_tags(tenant_id,name);
create index if not exists idx_member_tag_assignments_member on public.member_tag_assignments(tenant_id,membership_id);
create index if not exists idx_member_notes_member on public.member_notes(tenant_id,membership_id,created_at desc);
alter table public.tenant_member_profiles enable row level security;
alter table public.member_tags enable row level security;
alter table public.member_tag_assignments enable row level security;
alter table public.member_notes enable row level security;

drop policy if exists "members read own tenant profile" on public.tenant_member_profiles;
create policy "members read own tenant profile" on public.tenant_member_profiles for select using(user_id=auth.uid() or public.has_tenant_permission(tenant_id,'tenant.members.view'));
drop policy if exists "members update own tenant profile" on public.tenant_member_profiles;
create policy "members update own tenant profile" on public.tenant_member_profiles for update using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "member managers insert tenant profiles" on public.tenant_member_profiles;
create policy "member managers insert tenant profiles" on public.tenant_member_profiles for insert with check(public.has_tenant_permission(tenant_id,'tenant.members.manage'));
drop policy if exists "member managers update tenant profiles" on public.tenant_member_profiles;
create policy "member managers update tenant profiles" on public.tenant_member_profiles for update using(public.has_tenant_permission(tenant_id,'tenant.members.manage')) with check(public.has_tenant_permission(tenant_id,'tenant.members.manage'));

drop policy if exists "member viewers read tags" on public.member_tags;
create policy "member viewers read tags" on public.member_tags for select using(public.has_tenant_permission(tenant_id,'tenant.members.view'));
drop policy if exists "member managers manage tags" on public.member_tags;
create policy "member managers manage tags" on public.member_tags for all using(public.has_tenant_permission(tenant_id,'tenant.members.manage')) with check(public.has_tenant_permission(tenant_id,'tenant.members.manage'));

drop policy if exists "members read own tag assignments" on public.member_tag_assignments;
create policy "members read own tag assignments" on public.member_tag_assignments for select using(
  public.has_tenant_permission(tenant_id,'tenant.members.view') or exists(select 1 from public.tenant_memberships membership where membership.id=member_tag_assignments.membership_id and membership.user_id=auth.uid())
);
drop policy if exists "member managers manage tag assignments" on public.member_tag_assignments;
create policy "member managers manage tag assignments" on public.member_tag_assignments for all using(public.has_tenant_permission(tenant_id,'tenant.members.manage')) with check(public.has_tenant_permission(tenant_id,'tenant.members.manage'));

drop policy if exists "member managers read notes" on public.member_notes;
create policy "member managers read notes" on public.member_notes for select using(public.has_tenant_permission(tenant_id,'tenant.members.manage'));
drop policy if exists "member managers manage notes" on public.member_notes;
create policy "member managers manage notes" on public.member_notes for all using(public.has_tenant_permission(tenant_id,'tenant.members.manage')) with check(public.has_tenant_permission(tenant_id,'tenant.members.manage'));

create or replace function public.validate_member_directory_relationships()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='tenant_member_profiles' then
    if not exists(select 1 from public.tenant_memberships where id=new.membership_id and tenant_id=new.tenant_id and user_id=new.user_id and role in ('member','guest')) then raise exception 'invalid_member_profile_relationship'; end if;
  elsif tg_table_name='member_tag_assignments' then
    if not exists(select 1 from public.tenant_memberships where id=new.membership_id and tenant_id=new.tenant_id and role in ('member','guest')) or not exists(select 1 from public.member_tags where id=new.tag_id and tenant_id=new.tenant_id) then raise exception 'invalid_member_tag_relationship'; end if;
  else
    if not exists(select 1 from public.tenant_memberships where id=new.membership_id and tenant_id=new.tenant_id and role in ('member','guest')) then raise exception 'invalid_member_note_relationship'; end if;
  end if;
  return new;
end $$;
drop trigger if exists validate_tenant_member_profile_relationship on public.tenant_member_profiles;
create trigger validate_tenant_member_profile_relationship before insert or update on public.tenant_member_profiles for each row execute function public.validate_member_directory_relationships();
drop trigger if exists validate_member_tag_assignment_relationship on public.member_tag_assignments;
create trigger validate_member_tag_assignment_relationship before insert or update on public.member_tag_assignments for each row execute function public.validate_member_directory_relationships();
drop trigger if exists validate_member_note_relationship on public.member_notes;
create trigger validate_member_note_relationship before insert or update on public.member_notes for each row execute function public.validate_member_directory_relationships();

create or replace function public.validate_group_member_relationship()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.groups where id=new.group_id and tenant_id=new.tenant_id)
    or not exists(select 1 from public.tenant_memberships where tenant_id=new.tenant_id and user_id=new.user_id and role in ('member','guest')) then raise exception 'invalid_group_member_relationship'; end if;
  return new;
end $$;
drop trigger if exists validate_group_member_tenant on public.group_members;
create trigger validate_group_member_tenant before insert or update on public.group_members for each row execute function public.validate_group_member_relationship();

create or replace function public.replace_member_segments(target_membership uuid,target_tags uuid[],target_groups uuid[])
returns void language plpgsql security definer set search_path=public as $$
declare target_tenant uuid; target_user uuid;
begin
  select tenant_id,user_id into target_tenant,target_user from public.tenant_memberships where id=target_membership and role in ('member','guest');
  if target_tenant is null or not public.has_tenant_permission(target_tenant,'tenant.members.manage') then raise exception 'member_management_required'; end if;
  if exists(select 1 from unnest(coalesce(target_tags,array[]::uuid[])) as selected_tag(tag_id) where not exists(select 1 from public.member_tags where id=selected_tag.tag_id and tenant_id=target_tenant)) then raise exception 'invalid_member_tag'; end if;
  if exists(select 1 from unnest(coalesce(target_groups,array[]::uuid[])) as selected_group(group_id) where not exists(select 1 from public.groups where id=selected_group.group_id and tenant_id=target_tenant)) then raise exception 'invalid_member_group'; end if;
  delete from public.member_tag_assignments where tenant_id=target_tenant and membership_id=target_membership;
  insert into public.member_tag_assignments(tenant_id,membership_id,tag_id,assigned_by)
    select target_tenant,target_membership,selected_tag.tag_id,auth.uid() from unnest(coalesce(target_tags,array[]::uuid[])) as selected_tag(tag_id);
  delete from public.group_members where tenant_id=target_tenant and user_id=target_user;
  insert into public.group_members(tenant_id,group_id,user_id)
    select target_tenant,selected_group.group_id,target_user from unnest(coalesce(target_groups,array[]::uuid[])) as selected_group(group_id);
end $$;
revoke all on function public.replace_member_segments(uuid,uuid[],uuid[]) from public;
grant execute on function public.replace_member_segments(uuid,uuid[],uuid[]) to authenticated;

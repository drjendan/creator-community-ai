-- Milestone 5: unify category organization across episodes, courses, resources, and events.

create table if not exists public.content_category_assignments (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null references public.content_categories(id) on delete cascade,
  content_type text not null check (content_type in ('episodes','courses','resources','events')),
  content_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (category_id,content_type,content_id)
);
create index if not exists idx_content_category_assignments_tenant_content
  on public.content_category_assignments(tenant_id,content_type,content_id);

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
  select content_type into category_scope from public.content_categories
  where id=new.category_id and tenant_id=new.tenant_id;
  if category_scope is null then raise exception 'invalid_content_category'; end if;
  if category_scope <> 'all' and category_scope <> expected_scope then
    raise exception 'category_content_type_mismatch';
  end if;
  if (new.content_type='episodes' and not exists(select 1 from public.episodes where id=new.content_id and tenant_id=new.tenant_id))
    or (new.content_type='courses' and not exists(select 1 from public.courses where id=new.content_id and tenant_id=new.tenant_id))
    or (new.content_type='resources' and not exists(select 1 from public.resources where id=new.content_id and tenant_id=new.tenant_id))
    or (new.content_type='events' and not exists(select 1 from public.events where id=new.content_id and tenant_id=new.tenant_id)) then
    raise exception 'invalid_tenant_content';
  end if;
  return new;
end $$;
drop trigger if exists validate_content_category_assignment on public.content_category_assignments;
create trigger validate_content_category_assignment before insert or update on public.content_category_assignments
for each row execute function public.validate_content_category_assignment();

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

alter table public.content_category_assignments enable row level security;
drop policy if exists "tenant content viewers read category assignments" on public.content_category_assignments;
create policy "tenant content viewers read category assignments" on public.content_category_assignments for select to authenticated
  using (public.is_tenant_member(tenant_id));

create or replace function public.replace_content_category_assignments(
  target_tenant uuid,
  target_type text,
  target_content uuid,
  target_categories uuid[]
) returns void language plpgsql security definer set search_path=public as $$
declare category_id uuid;
begin
  if coalesce(auth.role(),'') <> 'service_role'
     and not public.has_tenant_permission(target_tenant,'tenant.content.manage')
     and not public.has_platform_permission('platform.tenants.manage') then
    raise exception 'content_management_permission_required';
  end if;
  if target_type not in ('episodes','courses','resources','events') then raise exception 'invalid_content_type'; end if;
  delete from public.content_category_assignments where tenant_id=target_tenant and content_type=target_type and content_id=target_content;
  foreach category_id in array coalesce(target_categories,array[]::uuid[]) loop
    insert into public.content_category_assignments(tenant_id,category_id,content_type,content_id)
    values(target_tenant,category_id,target_type,target_content);
  end loop;
end $$;
revoke all on function public.replace_content_category_assignments(uuid,text,uuid,uuid[]) from public,anon;
grant execute on function public.replace_content_category_assignments(uuid,text,uuid,uuid[]) to authenticated,service_role;

-- Category labels are safe tenant metadata needed for the authenticated member library.
drop policy if exists "tenant content viewers read categories" on public.content_categories;
create policy "tenant content viewers read categories" on public.content_categories for select to authenticated
  using (public.is_tenant_member(tenant_id));

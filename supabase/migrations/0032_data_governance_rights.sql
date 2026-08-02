-- Milestone 16: authenticated data rights, governed resolution, and audit export.
select pg_advisory_xact_lock(55404, 32);

insert into public.tenant_permissions(permission_key,label) values
  ('tenant.data.manage','Manage data rights and governance exports')
on conflict (permission_key) do update set label=excluded.label;
insert into public.tenant_role_permissions(role_key,permission_key) values
  ('tenant_owner','tenant.data.manage'),
  ('tenant_admin','tenant.data.manage')
on conflict do nothing;

create table if not exists public.data_rights_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  subject_user_id uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  request_type text not null check(request_type in ('export','correction','closure')),
  status text not null default 'submitted' check(status in ('submitted','in_review','completed','denied')),
  request_details text not null default '' check(char_length(request_details)<=5000),
  resolution_notes text not null default '' check(char_length(resolution_notes)<=5000),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_data_rights_requests_queue on public.data_rights_requests(tenant_id,status,created_at);
create index if not exists idx_data_rights_requests_subject on public.data_rights_requests(tenant_id,subject_user_id,created_at desc);
create unique index if not exists uq_open_data_rights_request on public.data_rights_requests(tenant_id,subject_user_id,request_type) where status in ('submitted','in_review');
alter table public.data_rights_requests enable row level security;

drop policy if exists "members read own data rights requests" on public.data_rights_requests;
create policy "members read own data rights requests" on public.data_rights_requests for select using(subject_user_id=auth.uid() or public.has_tenant_permission(tenant_id,'tenant.data.manage'));
drop policy if exists "members submit own data rights requests" on public.data_rights_requests;
create policy "members submit own data rights requests" on public.data_rights_requests for insert with check(subject_user_id=auth.uid() and requested_by=auth.uid() and public.is_tenant_member(tenant_id));
drop policy if exists "data managers update requests" on public.data_rights_requests;
create policy "data managers update requests" on public.data_rights_requests for update using(public.has_tenant_permission(tenant_id,'tenant.data.manage')) with check(public.has_tenant_permission(tenant_id,'tenant.data.manage'));

-- Audit records can contain private operational metadata and are never general member data.
drop policy if exists "tenant members read" on public.audit_logs;
drop policy if exists "tenant managers insert" on public.audit_logs;
drop policy if exists "tenant managers update" on public.audit_logs;
drop policy if exists "tenant managers delete" on public.audit_logs;
drop policy if exists "tenant data managers read audit logs" on public.audit_logs;
create policy "tenant data managers read audit logs" on public.audit_logs for select using(tenant_id is not null and public.has_tenant_permission(tenant_id,'tenant.data.manage'));

create or replace function public.validate_data_rights_request()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.tenant_memberships where tenant_id=new.tenant_id and user_id=new.subject_user_id and role in ('member','guest')) then
    raise exception 'invalid_data_rights_subject';
  end if;
  if new.requested_by<>new.subject_user_id then raise exception 'invalid_data_rights_requester'; end if;
  if new.resolved_by is not null
    and not exists(select 1 from public.tenant_memberships where tenant_id=new.tenant_id and user_id=new.resolved_by and status='active')
    and not exists(select 1 from auth.users where id=new.resolved_by and coalesce(raw_app_meta_data->>'platform_role','') in ('platform_owner','platform_admin')) then
    raise exception 'invalid_data_rights_resolver';
  end if;
  if new.status in ('completed','denied') and (new.resolved_by is null or new.resolved_at is null) then raise exception 'data_rights_resolution_required'; end if;
  return new;
end $$;
drop trigger if exists validate_data_rights_request_relationship on public.data_rights_requests;
create trigger validate_data_rights_request_relationship before insert or update on public.data_rights_requests for each row execute function public.validate_data_rights_request();

-- Platform and tenant Team & Access foundation.
-- Platform access is independent from tenant memberships. Trusted server routes
-- use the service role only after checking these permission records.

create table if not exists public.platform_permissions (
  permission_key text primary key,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_roles (
  role_key text primary key,
  label text not null,
  description text,
  status text not null default 'active' check (status in ('active','inactive')),
  is_owner_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_role_permissions (
  role_key text not null references public.platform_roles(role_key) on delete cascade,
  permission_key text not null references public.platform_permissions(permission_key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);

create table if not exists public.platform_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_key text not null references public.platform_roles(role_key),
  status text not null default 'active' check (status in ('active','suspended','removed')),
  invited_by uuid references auth.users(id) on delete set null,
  invitation_id uuid,
  accepted_at timestamptz,
  last_active_at timestamptz,
  suspended_at timestamptz,
  suspended_by uuid references auth.users(id) on delete set null,
  removed_at timestamptz,
  removed_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.platform_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text not null,
  last_name text not null,
  role_key text not null references public.platform_roles(role_key),
  token_hash text not null unique,
  status text not null default 'pending'
    check (status in ('pending','accepted','expired','revoked','failed')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  invited_user_id uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  failed_at timestamptz,
  delivery_error text,
  resend_count integer not null default 0 check (resend_count between 0 and 100),
  last_resent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_platform_open_invitation_email
  on public.platform_invitations(lower(email))
  where status='pending';
create index if not exists idx_platform_memberships_status_role
  on public.platform_memberships(status,role_key);
create index if not exists idx_platform_invitations_status_expires
  on public.platform_invitations(status,expires_at);

create table if not exists public.platform_access_history (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid references public.platform_memberships(id) on delete set null,
  invitation_id uuid references public.platform_invitations(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  before_state jsonb not null default '{}',
  after_state jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_platform_access_history_created
  on public.platform_access_history(created_at desc);
create index if not exists idx_platform_access_history_target
  on public.platform_access_history(target_user_id,created_at desc);

insert into public.platform_permissions(permission_key,label) values
  ('platform.team.view','View platform team'),
  ('platform.team.invite','Invite platform team'),
  ('platform.team.manage_roles','Manage platform roles'),
  ('platform.team.grant_owner','Grant Platform Owner'),
  ('platform.team.suspend','Suspend platform access'),
  ('platform.team.remove','Remove platform access'),
  ('platform.tenants.view','View tenants'),
  ('platform.tenants.manage','Manage tenants'),
  ('platform.billing.view','View platform billing'),
  ('platform.billing.manage','Manage platform billing'),
  ('platform.support.view','View platform support'),
  ('platform.support.manage','Manage platform support'),
  ('platform.content.manage','Manage platform content'),
  ('platform.analytics.view','View platform analytics'),
  ('platform.settings.manage','Manage platform settings'),
  ('platform.audit.view','View platform audit'),
  ('platform.integrations.manage','Manage platform integrations')
on conflict (permission_key) do update set label=excluded.label;

insert into public.platform_roles(role_key,label,description,is_owner_role) values
  ('platform_owner','Platform Owner','Full platform control and owner safeguards.',true),
  ('platform_admin','Platform Administrator','Platform operations excluding ownership grants.',false),
  ('platform_support','Platform Support','Cross-tenant support workspace access.',false),
  ('platform_billing_admin','Platform Billing Administrator','Platform billing administration.',false),
  ('platform_content_admin','Platform Content Administrator','Platform content and legal administration.',false),
  ('platform_analyst','Platform Analyst','Read-only analytics and audit access.',false),
  ('platform_developer','Platform Developer','Platform settings and integration administration.',false)
on conflict (role_key) do update set
  label=excluded.label,description=excluded.description,is_owner_role=excluded.is_owner_role,updated_at=now();

insert into public.platform_role_permissions(role_key,permission_key)
select 'platform_owner',permission_key from public.platform_permissions
on conflict do nothing;
insert into public.platform_role_permissions(role_key,permission_key) values
  ('platform_admin','platform.team.view'),
  ('platform_admin','platform.team.invite'),
  ('platform_admin','platform.team.manage_roles'),
  ('platform_admin','platform.team.suspend'),
  ('platform_admin','platform.team.remove'),
  ('platform_admin','platform.tenants.view'),
  ('platform_admin','platform.tenants.manage'),
  ('platform_admin','platform.billing.view'),
  ('platform_admin','platform.billing.manage'),
  ('platform_admin','platform.support.view'),
  ('platform_admin','platform.support.manage'),
  ('platform_admin','platform.content.manage'),
  ('platform_admin','platform.analytics.view'),
  ('platform_admin','platform.settings.manage'),
  ('platform_admin','platform.audit.view'),
  ('platform_admin','platform.integrations.manage'),
  ('platform_support','platform.team.view'),
  ('platform_support','platform.tenants.view'),
  ('platform_support','platform.support.view'),
  ('platform_support','platform.support.manage'),
  ('platform_billing_admin','platform.team.view'),
  ('platform_billing_admin','platform.tenants.view'),
  ('platform_billing_admin','platform.billing.view'),
  ('platform_billing_admin','platform.billing.manage'),
  ('platform_content_admin','platform.team.view'),
  ('platform_content_admin','platform.tenants.view'),
  ('platform_content_admin','platform.content.manage'),
  ('platform_analyst','platform.team.view'),
  ('platform_analyst','platform.tenants.view'),
  ('platform_analyst','platform.analytics.view'),
  ('platform_analyst','platform.audit.view'),
  ('platform_developer','platform.team.view'),
  ('platform_developer','platform.tenants.view'),
  ('platform_developer','platform.settings.manage'),
  ('platform_developer','platform.audit.view'),
  ('platform_developer','platform.integrations.manage')
on conflict do nothing;

-- Preserve trusted platform claims as the bootstrap source. Future changes are
-- managed through platform_memberships and synchronized by trusted server code.
insert into public.platform_memberships(
  user_id,role_key,status,accepted_at,created_at,updated_at
)
select
  id,
  raw_app_meta_data->>'platform_role',
  'active',
  coalesce(email_confirmed_at,created_at),
  created_at,
  now()
from auth.users
where raw_app_meta_data->>'platform_role' in ('platform_owner','platform_admin')
on conflict (user_id) do nothing;

create or replace function public.has_platform_permission(required_permission text)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists (
    select 1
    from public.platform_memberships m
    join public.platform_role_permissions rp on rp.role_key=m.role_key
    where m.user_id=auth.uid()
      and m.status='active'
      and rp.permission_key=required_permission
  )
  or (
    coalesce(auth.jwt()->'app_metadata'->>'platform_role','') in ('platform_owner','platform_admin')
    and not exists (
      select 1 from public.platform_memberships blocked
      where blocked.user_id=auth.uid() and blocked.status<>'active'
    )
  )
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select public.has_platform_permission('platform.tenants.view') $$;

create or replace function public.protect_final_platform_owner()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if old.role_key='platform_owner' and old.status='active' then
    if tg_op='DELETE'
       or new.role_key<>'platform_owner'
       or new.status<>'active' then
      if not exists (
        select 1 from public.platform_memberships
        where role_key='platform_owner' and status='active' and id<>old.id
      ) then
        raise exception 'final_platform_owner_required';
      end if;
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end
$$;
drop trigger if exists protect_final_platform_owner on public.platform_memberships;
create trigger protect_final_platform_owner
before update of role_key,status or delete on public.platform_memberships
for each row execute function public.protect_final_platform_owner();

alter table public.platform_memberships
  drop constraint if exists platform_memberships_invitation_id_fkey;
alter table public.platform_memberships
  add constraint platform_memberships_invitation_id_fkey
  foreign key (invitation_id) references public.platform_invitations(id) on delete set null;

create or replace function public.accept_platform_invitation(
  supplied_token_hash text,
  accepting_user_id uuid,
  accepting_email text
)
returns table(membership_id uuid, role_key text)
language plpgsql security definer set search_path=public
as $$
declare
  invitation public.platform_invitations%rowtype;
  membership uuid;
begin
  select * into invitation from public.platform_invitations
  where token_hash=supplied_token_hash for update;
  if invitation.id is null then raise exception 'invalid_invitation'; end if;
  if invitation.status<>'pending' then raise exception 'inactive_invitation'; end if;
  if invitation.expires_at<=now() then
    update public.platform_invitations set status='expired',updated_at=now()
    where id=invitation.id;
    raise exception 'expired_invitation';
  end if;
  if lower(invitation.email)<>lower(accepting_email) then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.platform_memberships(
    user_id,role_key,status,invited_by,invitation_id,accepted_at,created_by,updated_by
  ) values (
    accepting_user_id,invitation.role_key,'active',invitation.invited_by,
    invitation.id,now(),invitation.invited_by,invitation.invited_by
  )
  on conflict (user_id) do update set
    role_key=excluded.role_key,status='active',invited_by=excluded.invited_by,
    invitation_id=excluded.invitation_id,accepted_at=now(),suspended_at=null,
    removed_at=null,updated_by=excluded.updated_by,updated_at=now()
  returning id into membership;

  update public.platform_invitations set
    status='accepted',accepted_at=now(),accepted_by=accepting_user_id,
    invited_user_id=accepting_user_id,updated_at=now()
  where id=invitation.id;

  insert into public.platform_access_history(
    membership_id,invitation_id,target_user_id,actor_id,action,after_state
  ) values (
    membership,invitation.id,accepting_user_id,accepting_user_id,
    'platform.invitation.accepted',
    jsonb_build_object('role_key',invitation.role_key,'status','active')
  );
  return query select membership,invitation.role_key;
end
$$;
revoke all on function public.accept_platform_invitation(text,uuid,text)
  from public,anon,authenticated;
grant execute on function public.accept_platform_invitation(text,uuid,text)
  to service_role;

alter table public.platform_permissions enable row level security;
alter table public.platform_roles enable row level security;
alter table public.platform_role_permissions enable row level security;
alter table public.platform_memberships enable row level security;
alter table public.platform_invitations enable row level security;
alter table public.platform_access_history enable row level security;

create policy "authorized platform users read permissions"
  on public.platform_permissions for select
  using (public.has_platform_permission('platform.team.view'));
create policy "authorized platform users read roles"
  on public.platform_roles for select
  using (public.has_platform_permission('platform.team.view'));
create policy "authorized platform users read role permissions"
  on public.platform_role_permissions for select
  using (public.has_platform_permission('platform.team.view'));
create policy "authorized platform users read memberships"
  on public.platform_memberships for select
  using (public.has_platform_permission('platform.team.view') or user_id=auth.uid());
create policy "authorized platform users read invitations"
  on public.platform_invitations for select
  using (public.has_platform_permission('platform.team.view'));
create policy "authorized platform users read access history"
  on public.platform_access_history for select
  using (public.has_platform_permission('platform.audit.view'));

-- Platform-global audit events use a null tenant. Existing tenant audit behavior
-- and tenant-scoped RLS remain unchanged.
alter table public.audit_logs alter column tenant_id drop not null;
alter table public.audit_logs drop constraint if exists audit_logs_tenant_id_fkey;
alter table public.audit_logs add constraint audit_logs_tenant_id_fkey
  foreign key (tenant_id) references public.tenants(id) on delete set null;
drop policy if exists "platform audit readers" on public.audit_logs;
create policy "platform audit readers" on public.audit_logs for select
  using (tenant_id is null and public.has_platform_permission('platform.audit.view'));

-- Normalize requested tenant roles while retaining legacy assignments.
alter table public.tenant_memberships drop constraint if exists tenant_memberships_role_check;
alter table public.tenant_memberships add constraint tenant_memberships_role_check check (role in (
  'tenant_owner','tenant_admin','billing_admin','communication_manager',
  'content_manager','support_manager','analyst','contributor','viewer',
  'course_manager','event_manager','community_manager','community_moderator',
  'support_staff','member','guest'
));

alter table public.tenant_invitations drop constraint if exists tenant_invitations_role_check;
alter table public.tenant_invitations add constraint tenant_invitations_role_check check (role in (
  'tenant_admin','billing_admin','communication_manager','content_manager',
  'support_manager','analyst','contributor','viewer',
  'course_manager','event_manager','community_manager','support_staff'
));
alter table public.tenant_invitations
  add column if not exists resend_count integer not null default 0,
  add column if not exists last_resent_at timestamptz;

create or replace function public.protect_final_tenant_owner()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if old.role='tenant_owner' and old.status='active' then
    if tg_op='DELETE' or new.role<>'tenant_owner' or new.status<>'active' then
      if not exists (
        select 1 from public.tenant_memberships
        where tenant_id=old.tenant_id and role='tenant_owner' and status='active'
          and id<>old.id
      ) then
        raise exception 'final_tenant_owner_required';
      end if;
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists protect_final_tenant_owner on public.tenant_memberships;
create trigger protect_final_tenant_owner
before update or delete on public.tenant_memberships
for each row execute function public.protect_final_tenant_owner();

-- tenant_roles is a legacy tenant/user assignment table from migration 0002.
-- Preserve it; the normalized role catalog uses a non-conflicting name.
create table if not exists public.tenant_role_definitions (
  role_key text primary key,
  label text not null,
  description text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.tenant_role_definitions(role_key,label,description) values
  ('tenant_owner','Tenant Owner','Full tenant control with owner safeguards.'),
  ('tenant_admin','Tenant Administrator','Tenant operations and team administration.'),
  ('billing_admin','Billing Administrator','Tenant billing administration.'),
  ('communication_manager','Communications Manager','Communication Hub administration.'),
  ('content_manager','Content Manager','Tenant content administration.'),
  ('support_manager','Support Manager','Tenant support administration.'),
  ('analyst','Analyst','Read-only analytics and reporting.'),
  ('contributor','Contributor','Content contribution access.'),
  ('viewer','Viewer','Read-only tenant workspace access.')
on conflict (role_key) do update set
  label=excluded.label,description=excluded.description,updated_at=now();

create table if not exists public.tenant_permissions (
  permission_key text primary key,
  label text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.tenant_role_permissions (
  role_key text not null references public.tenant_role_definitions(role_key) on delete cascade,
  permission_key text not null references public.tenant_permissions(permission_key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(role_key,permission_key)
);
insert into public.tenant_permissions(permission_key,label) values
  ('tenant.team.view','View tenant team'),
  ('tenant.team.invite','Invite tenant team'),
  ('tenant.team.manage_roles','Manage tenant roles'),
  ('tenant.team.suspend','Suspend tenant access'),
  ('tenant.team.remove','Remove tenant access'),
  ('tenant.billing.manage','Manage tenant billing'),
  ('tenant.communications.manage','Manage communications'),
  ('tenant.content.manage','Manage content'),
  ('tenant.support.manage','Manage support'),
  ('tenant.analytics.view','View analytics'),
  ('tenant.workspace.view','View workspace')
on conflict (permission_key) do update set label=excluded.label;
insert into public.tenant_role_permissions(role_key,permission_key)
select role_key,permission_key from (
  values
    ('tenant_owner','tenant.team.view'),('tenant_owner','tenant.team.invite'),
    ('tenant_owner','tenant.team.manage_roles'),('tenant_owner','tenant.team.suspend'),
    ('tenant_owner','tenant.team.remove'),('tenant_owner','tenant.billing.manage'),
    ('tenant_owner','tenant.communications.manage'),('tenant_owner','tenant.content.manage'),
    ('tenant_owner','tenant.support.manage'),('tenant_owner','tenant.analytics.view'),
    ('tenant_owner','tenant.workspace.view'),
    ('tenant_admin','tenant.team.view'),('tenant_admin','tenant.team.invite'),
    ('tenant_admin','tenant.team.manage_roles'),('tenant_admin','tenant.team.suspend'),
    ('tenant_admin','tenant.team.remove'),('tenant_admin','tenant.communications.manage'),
    ('tenant_admin','tenant.content.manage'),('tenant_admin','tenant.support.manage'),
    ('tenant_admin','tenant.analytics.view'),('tenant_admin','tenant.workspace.view'),
    ('billing_admin','tenant.billing.manage'),('billing_admin','tenant.workspace.view'),
    ('communication_manager','tenant.communications.manage'),('communication_manager','tenant.workspace.view'),
    ('content_manager','tenant.content.manage'),('content_manager','tenant.workspace.view'),
    ('support_manager','tenant.support.manage'),('support_manager','tenant.workspace.view'),
    ('analyst','tenant.analytics.view'),('analyst','tenant.workspace.view'),
    ('contributor','tenant.content.manage'),('contributor','tenant.workspace.view'),
    ('viewer','tenant.workspace.view')
) as permissions(role_key,permission_key)
on conflict do nothing;
alter table public.tenant_role_definitions enable row level security;
alter table public.tenant_permissions enable row level security;
alter table public.tenant_role_permissions enable row level security;
create policy "tenant members read tenant roles"
  on public.tenant_role_definitions for select to authenticated using (true);
create policy "tenant members read tenant permissions"
  on public.tenant_permissions for select to authenticated using (true);
create policy "tenant members read tenant role permissions"
  on public.tenant_role_permissions for select to authenticated using (true);

-- Complete tenant branding and tenant-team workflows.
-- Apply after 0010_platform_branding.sql.

alter table public.tenant_branding
  add column if not exists organization_short_name text,
  add column if not exists logo_storage_path text,
  add column if not exists square_icon_storage_path text,
  add column if not exists hero_image_storage_path text,
  add column if not exists member_welcome_image_storage_path text,
  add column if not exists email_logo_storage_path text,
  add column if not exists favicon_storage_path text,
  add column if not exists button_color text default '#7c3aed',
  add column if not exists link_color text default '#6d28d9',
  add column if not exists member_dashboard_greeting text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.tenant_invitations
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists personal_message text,
  add column if not exists send_email boolean not null default true,
  add column if not exists accepted_by uuid references auth.users(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists delivery_error text;

alter table public.tenant_invitations
  drop constraint if exists tenant_invitations_status_check;
alter table public.tenant_invitations
  add constraint tenant_invitations_status_check
  check (status in ('pending','sent','accepted','expired','revoked','failed'));

alter table public.tenant_memberships
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists joined_at timestamptz,
  add column if not exists last_active_at timestamptz,
  add column if not exists deactivated_at timestamptz;

create index if not exists idx_tenant_invitations_email
  on public.tenant_invitations(tenant_id,lower(email));
create unique index if not exists uq_tenant_open_invitation_email
  on public.tenant_invitations(tenant_id,lower(email))
  where status in ('pending','sent');

create or replace function public.can_administer_tenant(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_platform_admin() or exists (
  select 1 from public.tenant_memberships m
  where m.tenant_id=target_tenant and m.user_id=auth.uid()
    and m.status='active' and m.role in ('tenant_owner','tenant_admin')
) $$;

-- Branding remains readable by tenant members, but only tenant administrators
-- can mutate it. Public presentation is served through trusted server queries.
drop policy if exists "tenant managers insert" on public.tenant_branding;
drop policy if exists "tenant managers update" on public.tenant_branding;
drop policy if exists "tenant managers delete" on public.tenant_branding;
drop policy if exists "tenant administrators insert branding" on public.tenant_branding;
drop policy if exists "tenant administrators update branding" on public.tenant_branding;
drop policy if exists "tenant administrators delete branding" on public.tenant_branding;
create policy "tenant administrators insert branding"
  on public.tenant_branding for insert
  with check (public.can_administer_tenant(tenant_id));
create policy "tenant administrators update branding"
  on public.tenant_branding for update
  using (public.can_administer_tenant(tenant_id))
  with check (public.can_administer_tenant(tenant_id));
create policy "tenant administrators delete branding"
  on public.tenant_branding for delete
  using (public.can_administer_tenant(tenant_id));

-- Invitations contain tokens and personal details; ordinary tenant members
-- must never be able to read or modify them.
drop policy if exists "tenant members read" on public.tenant_invitations;
drop policy if exists "tenant managers insert" on public.tenant_invitations;
drop policy if exists "tenant managers update" on public.tenant_invitations;
drop policy if exists "tenant managers delete" on public.tenant_invitations;
drop policy if exists "tenant administrators read invitations" on public.tenant_invitations;
drop policy if exists "tenant administrators insert invitations" on public.tenant_invitations;
drop policy if exists "tenant administrators update invitations" on public.tenant_invitations;
drop policy if exists "tenant administrators delete invitations" on public.tenant_invitations;
create policy "tenant administrators read invitations"
  on public.tenant_invitations for select
  using (public.can_administer_tenant(tenant_id));
create policy "tenant administrators insert invitations"
  on public.tenant_invitations for insert
  with check (public.can_administer_tenant(tenant_id));
create policy "tenant administrators update invitations"
  on public.tenant_invitations for update
  using (public.can_administer_tenant(tenant_id))
  with check (public.can_administer_tenant(tenant_id));
create policy "tenant administrators delete invitations"
  on public.tenant_invitations for delete
  using (public.can_administer_tenant(tenant_id));

-- Membership mutation is also administrator-only. This replaces the older
-- generic manager policy that included content roles.
drop policy if exists "tenant managers insert" on public.tenant_memberships;
drop policy if exists "tenant managers update" on public.tenant_memberships;
drop policy if exists "tenant managers delete" on public.tenant_memberships;
drop policy if exists "tenant administrators insert memberships" on public.tenant_memberships;
drop policy if exists "tenant administrators update memberships" on public.tenant_memberships;
drop policy if exists "tenant administrators delete memberships" on public.tenant_memberships;
create policy "tenant administrators insert memberships"
  on public.tenant_memberships for insert
  with check (public.can_administer_tenant(tenant_id));
create policy "tenant administrators update memberships"
  on public.tenant_memberships for update
  using (public.can_administer_tenant(tenant_id))
  with check (public.can_administer_tenant(tenant_id));
create policy "tenant administrators delete memberships"
  on public.tenant_memberships for delete
  using (public.can_administer_tenant(tenant_id));

create or replace function public.accept_tenant_invitation(
  supplied_token_hash text,
  accepting_user_id uuid,
  accepting_email text
)
returns table(tenant_id uuid, tenant_slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.tenant_invitations%rowtype;
  slug_value text;
begin
  select * into invitation
  from public.tenant_invitations
  where token_hash=supplied_token_hash
  for update;
  if invitation.id is null then raise exception 'invalid_invitation'; end if;
  if invitation.status not in ('pending','sent') then raise exception 'inactive_invitation'; end if;
  if invitation.expires_at <= now() then
    update public.tenant_invitations
      set status='expired',updated_at=now()
      where id=invitation.id;
    raise exception 'expired_invitation';
  end if;
  if lower(invitation.email) <> lower(accepting_email) then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.tenant_memberships
    (tenant_id,user_id,role,status,invited_by,joined_at,updated_at)
  values
    (invitation.tenant_id,accepting_user_id,invitation.role,'active',invitation.invited_by,now(),now())
  on conflict (tenant_id,user_id) do update set
    role=excluded.role,status='active',invited_by=excluded.invited_by,
    joined_at=coalesce(public.tenant_memberships.joined_at,now()),
    deactivated_at=null,updated_at=now();

  update public.tenant_invitations set
    status='accepted',accepted_by=accepting_user_id,accepted_at=now(),
    invited_user_id=accepting_user_id,updated_at=now()
  where id=invitation.id;

  select slug into slug_value from public.tenants where id=invitation.tenant_id;
  return query select invitation.tenant_id,slug_value;
end $$;

revoke all on function public.accept_tenant_invitation(text,uuid,text) from public,anon,authenticated;
grant execute on function public.accept_tenant_invitation(text,uuid,text) to service_role;

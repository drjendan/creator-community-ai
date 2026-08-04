-- Community launch: identity, public pages, sharing, leads, testimonials, catalog readiness.
-- Additive only. Existing tenant, branding, content, AI, membership, and Stripe records are preserved.

alter table public.tenant_branding
  add column if not exists legal_name text,
  add column if not exists community_name text,
  add column if not exists podcast_name text,
  add column if not exists display_name text,
  add column if not exists tagline text,
  add column if not exists full_description text,
  add column if not exists tenant_type text,
  add column if not exists primary_category text,
  add column if not exists secondary_categories text[] not null default '{}',
  add column if not exists public_contact_email text,
  add column if not exists light_logo_url text,
  add column if not exists dark_logo_url text,
  add column if not exists cover_image_url text,
  add column if not exists community_thumbnail_url text,
  add column if not exists default_content_placeholder_url text,
  add column if not exists heading_font text not null default 'Manrope',
  add column if not exists body_font text not null default 'Inter';

update public.tenant_branding branding
set community_name=coalesce(branding.community_name,tenant.name),
    display_name=coalesce(branding.display_name,tenant.name)
from public.tenants tenant
where tenant.id=branding.tenant_id
  and (branding.community_name is null or branding.display_name is null);

create table if not exists public.tenant_community_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  visibility text not null default 'private_link' check (visibility in ('public','private_link','invite_only','coming_soon','waitlist','paused')),
  publication_status text not null default 'draft' check (publication_status in ('draft','published','unpublished')),
  preferred_public_path text,
  redirect_behavior text not null default 'canonical' check (redirect_behavior in ('canonical','allow_aliases')),
  welcome_heading text,
  welcome_message text,
  member_home_cta text,
  community_terminology text not null default 'Community',
  member_support_url text,
  default_member_landing_page text not null default 'welcome',
  allow_member_directory boolean not null default false,
  allow_member_messaging boolean not null default true,
  allow_member_discussions boolean not null default true,
  allow_member_content_search boolean not null default true,
  primary_cta_label text not null default 'Join the Community',
  primary_cta_url text,
  secondary_cta_label text not null default 'Sign In',
  secondary_cta_url text,
  about_purpose text,
  founder_name text,
  intended_audience text,
  member_expectations text,
  community_values text,
  website_url text,
  social_links jsonb not null default '{}',
  custom_links jsonb not null default '[]',
  section_configuration jsonb not null default '[{"key":"about","visible":true},{"key":"featured_content","visible":true},{"key":"memberships","visible":true},{"key":"resources","visible":true},{"key":"events","visible":true},{"key":"testimonials","visible":true}]',
  seo_title text,
  seo_description text,
  seo_image_url text,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_share_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  label text not null,
  target_type text not null check (target_type in ('community','signup','resource','membership','event','course','episode')),
  target_id uuid,
  public_code text not null unique default encode(gen_random_bytes(9),'hex'),
  source text,
  medium text,
  campaign text,
  content text,
  referrer_code text,
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  use_count integer not null default 0,
  status text not null default 'active' check (status in ('active','inactive','expired')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_community_share_links_tenant on public.community_share_links(tenant_id,created_at desc);

create table if not exists public.community_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete set null,
  first_name text not null,
  last_name text,
  email text not null,
  consent boolean not null,
  marketing_permission boolean not null default false,
  consent_text text not null,
  consented_at timestamptz not null,
  source text,
  campaign text,
  referrer_code text,
  status text not null default 'active' check(status in ('active','unsubscribed','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_community_leads_tenant_email on public.community_leads(tenant_id,lower(email));

create table if not exists public.community_testimonials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  relationship text,
  quote text not null,
  image_url text,
  approval_status text not null default 'draft' check(approval_status in ('draft','approved','rejected')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  product_type text not null check(product_type in ('book','ebook','worksheet','template','download','coaching','event','course','membership')),
  price numeric(12,2) not null default 0,
  currency text not null default 'USD',
  visibility text not null default 'private' check(visibility in ('public','private','coming_soon')),
  status text not null default 'draft' check(status in ('draft','published','archived')),
  external_purchase_url text,
  website_shop_url text,
  external_booking_url text,
  contact_for_purchase text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id,slug)
);

alter table public.tenant_membership_plans
  add column if not exists billing_interval text not null default 'monthly',
  add column if not exists enrollment_type text not null default 'open',
  add column if not exists external_purchase_url text,
  add column if not exists website_shop_url text,
  add column if not exists external_booking_url text,
  add column if not exists contact_for_purchase text;

do $$ declare table_name text; begin
  foreach table_name in array array['tenant_community_settings','community_share_links','community_leads','community_testimonials','tenant_products'] loop
    execute format('alter table public.%I enable row level security',table_name);
  end loop;
end $$;

create policy "tenant settings managers read community settings" on public.tenant_community_settings for select to authenticated using(public.has_tenant_permission(tenant_id,'tenant.settings.manage'));
create policy "tenant settings managers insert community settings" on public.tenant_community_settings for insert to authenticated with check(public.has_tenant_permission(tenant_id,'tenant.settings.manage'));
create policy "tenant settings managers update community settings" on public.tenant_community_settings for update to authenticated using(public.has_tenant_permission(tenant_id,'tenant.settings.manage')) with check(public.has_tenant_permission(tenant_id,'tenant.settings.manage'));
create policy "tenant managers manage share links" on public.community_share_links for all to authenticated using(public.has_tenant_permission(tenant_id,'tenant.members.manage')) with check(public.has_tenant_permission(tenant_id,'tenant.members.manage'));
create policy "tenant communicators read leads" on public.community_leads for select to authenticated using(public.has_tenant_permission(tenant_id,'tenant.communication.view'));
create policy "tenant communicators manage leads" on public.community_leads for all to authenticated using(public.has_tenant_permission(tenant_id,'tenant.communications.manage')) with check(public.has_tenant_permission(tenant_id,'tenant.communications.manage'));
create policy "tenant settings managers manage testimonials" on public.community_testimonials for all to authenticated using(public.has_tenant_permission(tenant_id,'tenant.settings.manage')) with check(public.has_tenant_permission(tenant_id,'tenant.settings.manage'));
create policy "tenant content managers manage products" on public.tenant_products for all to authenticated using(public.has_tenant_permission(tenant_id,'tenant.content.manage')) with check(public.has_tenant_permission(tenant_id,'tenant.content.manage'));

comment on table public.community_leads is 'Tenant-scoped public lead capture with explicit consent evidence; not a tenant membership.';
comment on table public.tenant_products is 'Commerce-ready catalog. External links are usable while native checkout remains feature-flagged off.';

alter table public.transactional_notification_deliveries drop constraint if exists transactional_notification_deliveries_category_check;
alter table public.transactional_notification_deliveries add constraint transactional_notification_deliveries_category_check check(category in ('tenant_invitation','platform_invitation','access_change','account_security','lead_resource'));
alter table public.transactional_notification_deliveries drop constraint if exists transactional_notification_deliveries_source_type_check;
alter table public.transactional_notification_deliveries add constraint transactional_notification_deliveries_source_type_check check(source_type is null or source_type in ('tenant_invitation','platform_invitation','tenant_membership','platform_administrator','community_lead'));

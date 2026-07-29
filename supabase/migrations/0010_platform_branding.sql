-- Platform-wide branding plus permanent public brand assets.
-- Apply after 0009_communication_hub.sql.

create table if not exists public.platform_branding (
  id boolean primary key default true check (id),
  platform_name text not null default 'UpNexx',
  tagline text not null default 'The Intelligent Content, Learning & Community Platform',
  logo_url text,
  square_icon_url text,
  favicon_url text,
  primary_color text not null default '#0b1533',
  accent_color text not null default '#7c3aed',
  background_color text not null default '#f8fafc',
  text_color text not null default '#0f172a',
  support_email text,
  website_url text,
  footer_text text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_branding enable row level security;
drop policy if exists "platform administrators read branding" on public.platform_branding;
drop policy if exists "platform administrators insert branding" on public.platform_branding;
drop policy if exists "platform administrators update branding" on public.platform_branding;
create policy "platform administrators read branding"
  on public.platform_branding for select using (public.is_platform_admin());
create policy "platform administrators insert branding"
  on public.platform_branding for insert with check (public.is_platform_admin());
create policy "platform administrators update branding"
  on public.platform_branding for update
  using (public.is_platform_admin()) with check (public.is_platform_admin());

insert into public.platform_branding (id)
values (true)
on conflict (id) do nothing;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'brand-assets',
  'brand-assets',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/svg+xml','image/x-icon']
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "public read brand assets" on storage.objects;
create policy "public read brand assets"
  on storage.objects for select using (bucket_id='brand-assets');

-- Platform-owned Nexx Jenn artwork must not appear as a tenant-uploaded logo.
-- Keep the public platform assets; clear only tenant branding references.

update public.tenant_branding
set
  logo_url = null,
  logo_storage_path = null,
  updated_at = now()
where
  lower(coalesce(logo_url, '')) like '%/nexx-jenn-logo.png%'
  or lower(coalesce(logo_url, '')) like '%/nexx-jenn-mark.png%';

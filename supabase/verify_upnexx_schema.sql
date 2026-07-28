-- Read-only UpNexx migration verification.
-- Safe to run in the Supabase SQL Editor. This query changes no data.

with checks(migration, requirement, installed) as (
  values
    ('0001', 'tenants table', to_regclass('public.tenants') is not null),
    ('0001', 'profiles table', to_regclass('public.profiles') is not null),
    ('0001', 'tenant_memberships table', to_regclass('public.tenant_memberships') is not null),
    ('0001', 'tenant_branding table', to_regclass('public.tenant_branding') is not null),

    ('0002', 'platform_plans table', to_regclass('public.platform_plans') is not null),
    ('0002', 'tenant_subscriptions table', to_regclass('public.tenant_subscriptions') is not null),
    ('0002', 'tenant_membership_plans table', to_regclass('public.tenant_membership_plans') is not null),
    ('0002', 'tenant_ai_settings table', to_regclass('public.tenant_ai_settings') is not null),
    ('0002', 'feature_flags table', to_regclass('public.feature_flags') is not null),
    ('0002', 'audit_logs table', to_regclass('public.audit_logs') is not null),

    ('0003', 'AI provider credential table', to_regclass('public.ai_provider_settings') is not null),
    ('0003', 'encrypted AI credential column', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='ai_provider_settings' and column_name='encrypted_api_key'
    )),

    ('0004', 'resources table', to_regclass('public.resources') is not null),
    ('0004', 'episode cover images', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='episodes' and column_name='cover_image_url'
    )),

    ('0005', 'course content URL', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='courses' and column_name='content_url'
    )),

    ('0006', 'tenant business type', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenants' and column_name='tenant_type'
    )),
    ('0006', 'subscription billing frequency', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_subscriptions' and column_name='billing_frequency'
    )),
    ('0006', 'subscription AI allowance', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_subscriptions' and column_name='ai_credit_allowance'
    )),
    ('0006', 'tenant feature entitlements', to_regclass('public.tenant_feature_entitlements') is not null),
    ('0006', 'AI generations table', to_regclass('public.ai_generations') is not null),
    ('0006', 'membership sort order', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_membership_plans' and column_name='sort_order'
    )),

    ('0007', 'multiple provider default support', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='ai_provider_settings' and column_name='is_default'
    )),
    ('0007', 'AI verification status', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='ai_provider_settings' and column_name='verification_status'
    )),
    ('0007', 'AI update context', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='ai_provider_settings' and column_name='updated_context'
    )),

    ('0008', 'editable membership metadata', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_membership_plans' and column_name='is_editable'
    )),
    ('0008', 'membership template provenance', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_membership_plans' and column_name='template_key'
    )),
    ('0008', 'membership benefits', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_membership_plans' and column_name='benefits'
    )),
    ('0008', 'membership colors', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_membership_plans' and column_name='color'
    ))
)
select
  migration,
  requirement,
  case when installed then 'PASS' else 'MISSING' end as status
from checks
order by migration, requirement;

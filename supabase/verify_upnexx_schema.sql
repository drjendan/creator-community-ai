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
    )),

    ('0009', 'communication provider configuration', to_regclass('public.tenant_communication_provider_configs') is not null),
    ('0009', 'announcements', to_regclass('public.communication_announcements') is not null),
    ('0009', 'organization messages', to_regclass('public.communication_messages') is not null),
    ('0009', 'email campaigns', to_regclass('public.email_campaigns') is not null),
    ('0009', 'email templates', to_regclass('public.email_templates') is not null),
    ('0009', 'audience segments', to_regclass('public.audience_segments') is not null),
    ('0009', 'communication automations', to_regclass('public.communication_automations') is not null),
    ('0009', 'delivery events', to_regclass('public.communication_delivery_events') is not null),
    ('0009', 'member communication preferences', to_regclass('public.member_communication_preferences') is not null),
    ('0009', 'communication suppressions', to_regclass('public.communication_suppressions') is not null),
    ('0009', 'communication usage tracking', to_regclass('public.communication_usage') is not null),
    ('0009', 'communication audit events', to_regclass('public.communication_audit_events') is not null),
    ('0009', 'expanded tenant branding', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_branding' and column_name='welcome_headline'
    )),
    ('0009', 'team invitation user tracking', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_invitations' and column_name='invited_user_id'
    )),

    ('0010', 'platform branding', to_regclass('public.platform_branding') is not null),
    ('0010', 'public brand asset bucket', exists (
      select 1 from storage.buckets
      where id='brand-assets' and public is true
    )),

    ('0011', 'branding storage paths', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_branding' and column_name='logo_storage_path'
    )),
    ('0011', 'branding button and link colors', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_branding' and column_name='button_color'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_branding' and column_name='link_color'
    )),
    ('0011', 'team invitation lifecycle', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_invitations' and column_name='accepted_at'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_invitations' and column_name='delivery_error'
    )),
    ('0011', 'atomic invitation acceptance', exists (
      select 1 from pg_proc where proname='accept_tenant_invitation'
    )),
    ('0012', 'no platform logo assigned to tenants', not exists (
      select 1 from public.tenant_branding
      where lower(coalesce(logo_url, '')) like '%/nexx-jenn-logo.png%'
         or lower(coalesce(logo_url, '')) like '%/nexx-jenn-mark.png%'
    )),
    ('0013', 'tenant domain metadata', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_domains' and column_name='domain_type'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_domains' and column_name='ssl_status'
    )),
    ('0013', 'tenant Stripe Connect accounts', to_regclass('public.tenant_stripe_accounts') is not null),
    ('0013', 'paid membership setup gate', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_membership_plans' and column_name='payment_setup_required'
    )),
    ('0014', 'tenant lifecycle metadata', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenants' and column_name='suspended_at'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenants' and column_name='archived_at'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenants' and column_name='deleted_at'
    )),
    ('0014', 'owner invitation tracking', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenants' and column_name='owner_invitation_last_sent_at'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenants' and column_name='owner_invitation_send_count'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenants' and column_name='owner_activated_at'
    )),
    ('0014', 'retained deletion records', to_regclass('public.platform_tenant_deletion_records') is not null),
    ('0015', 'content categories', to_regclass('public.content_categories') is not null),
    ('0015', 'tenant content settings', to_regclass('public.tenant_content_settings') is not null),
    ('0016', 'communication contacts', to_regclass('public.communication_contacts') is not null),
    ('0016', 'legal documents', to_regclass('public.legal_documents') is not null),
    ('0016', 'legal version history', to_regclass('public.legal_versions') is not null),
    ('0016', 'user legal acceptance', to_regclass('public.user_legal_acceptance') is not null),
    ('0016', 'tenant legal profiles', to_regclass('public.tenant_legal_profiles') is not null),
    ('0017', 'trial lifecycle fields', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_subscriptions' and column_name='trial_days_granted'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_subscriptions' and column_name='trial_status'
    )),
    ('0017', 'trial history', to_regclass('public.trial_history') is not null),
    ('0017', 'trial write enforcement', exists (
      select 1 from pg_proc where proname='tenant_trial_allows_mutation'
    )),
    ('0017', 'trial audit trigger', exists (
      select 1 from pg_trigger where tgname='tenant_subscription_trial_history'
    )),
    ('0018', 'platform role and permission catalogs',
      to_regclass('public.platform_roles') is not null
      and to_regclass('public.platform_permissions') is not null
      and to_regclass('public.platform_role_permissions') is not null
    ),
    ('0018', 'platform memberships and invitations',
      to_regclass('public.platform_memberships') is not null
      and to_regclass('public.platform_invitations') is not null
    ),
    ('0018', 'platform access history',
      to_regclass('public.platform_access_history') is not null
    ),
    ('0018', 'platform invitation acceptance', exists (
      select 1 from pg_proc where proname='accept_platform_invitation'
    )),
    ('0018', 'final platform owner safeguard', exists (
      select 1 from pg_trigger where tgname='protect_final_platform_owner'
    )),
    ('0018', 'tenant role and permission catalogs',
      to_regclass('public.tenant_role_definitions') is not null
      and to_regclass('public.tenant_permissions') is not null
      and to_regclass('public.tenant_role_permissions') is not null
    ),
    ('0018', 'final tenant owner safeguard', exists (
      select 1 from pg_trigger where tgname='protect_final_tenant_owner'
    )),
    ('0019', 'Tenant Owner invitation role', exists (
      select 1
      from pg_constraint
      where conname='tenant_invitations_role_check'
        and pg_get_constraintdef(oid) like '%tenant_owner%'
    )),
    ('0020', 'expanded team permission vocabulary', exists (
      select 1 from public.tenant_permissions where permission_key='tenant.content.publish'
    ) and exists (
      select 1 from public.platform_permissions where permission_key='platform.communication.manage'
    )),
    ('0020', 'tenant permission helper', exists (
      select 1 from pg_proc where proname='has_tenant_permission'
    )),
    ('0020', 'tenant access history',
      to_regclass('public.tenant_access_history') is not null
    ),
    ('0021', 'content category assignments',
      to_regclass('public.content_category_assignments') is not null
    ),
    ('0021', 'atomic content category replacement', exists (
      select 1 from pg_proc where proname='replace_content_category_assignments'
    )),
    ('0021', 'content assignment validation', exists (
      select 1 from pg_trigger where tgname='validate_content_category_assignment'
    )),
    ('0022', 'production Stripe price identifiers', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='platform_plans' and column_name='stripe_monthly_price_id'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_membership_plans' and column_name='stripe_product_id'
    )),
    ('0022', 'subscription checkout state', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tenant_subscriptions' and column_name='stripe_checkout_session_id'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='member_subscriptions' and column_name='stripe_checkout_session_id'
    )),
    ('0022', 'idempotent billing event processing', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='billing_events' and column_name='processed_at'
    ) and exists (
      select 1 from pg_indexes
      where schemaname='public' and indexname='uq_payments_stripe_invoice'
    )),
    ('0023', 'AI generation workflow metadata', exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='ai_generations' and column_name='source_title'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='ai_generations' and column_name='current_version'
    )),
    ('0023', 'AI generation version history',
      to_regclass('public.ai_generation_versions') is not null
    ),
    ('0023', 'atomic AI credit reservation', exists (
      select 1 from pg_proc where proname='reserve_tenant_ai_credits'
    ) and exists (
      select 1 from pg_proc where proname='settle_tenant_ai_credits'
    ) and to_regclass('public.ai_credit_reservations') is not null
    ),
    ('0023', 'AI drafts in Content Library', exists (
      select 1 from pg_trigger where tgname='remove_ai_generation_category_assignments'
    )),
    ('0024', 'complete course metadata', exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='courses' and column_name='completion_requirements'
    ) and exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='lessons' and column_name='lesson_type'
    )),
    ('0024', 'course materials and assessments',
      to_regclass('public.course_materials') is not null
      and to_regclass('public.course_quizzes') is not null
      and to_regclass('public.course_quiz_questions') is not null
    ),
    ('0024', 'safe course hierarchy and ordering', exists (
      select 1 from pg_trigger where tgname='validate_course_lesson_relationships'
    ) and exists (
      select 1 from pg_proc where proname='reorder_course_items'
    )),
    ('0025', 'member AI Coach settings', exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='tenant_ai_settings' and column_name='coach_name'
    ) and exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='tenant_ai_settings' and column_name='retain_message_content'
    )),
    ('0025', 'tenant-scoped AI knowledge search', exists (
      select 1 from pg_proc where proname='search_ai_coach_sources'
    ) and exists (
      select 1 from pg_indexes where schemaname='public' and indexname='idx_ai_knowledge_sources_search'
    )),
    ('0025', 'atomic AI Coach rate limiting',
      to_regclass('public.ai_coach_request_limits') is not null
      and exists(select 1 from pg_proc where proname='reserve_ai_coach_request')
    ),
    ('0026', 'community moderation permission', exists (
      select 1 from public.tenant_permissions where permission_key='tenant.community.manage'
    )),
    ('0026', 'community reports and governance',
      to_regclass('public.community_reports') is not null
      and exists(select 1 from information_schema.columns where table_schema='public' and table_name='community_posts' and column_name='is_pinned')
      and exists(select 1 from information_schema.columns where table_schema='public' and table_name='community_spaces' and column_name='posting_policy')
    ),
    ('0026', 'community hierarchy validation', exists (
      select 1 from pg_trigger where tgname='validate_community_reports'
    ) and exists (
      select 1 from pg_indexes where schemaname='public' and indexname='uq_community_post_reaction'
    )),
    ('0027', 'podcast learning metadata', exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='episodes' and column_name='show_notes'
    ) and exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='episodes' and column_name='reflection_questions'
    )),
    ('0027', 'podcast transcript and resource controls', exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='episode_transcripts' and column_name='allow_download'
    ) and exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='episode_resources' and column_name='resource_type'
    )),
    ('0027', 'podcast support relationship validation', exists (
      select 1 from pg_trigger where tgname='validate_episode_transcript_relationship'
    ) and exists (
      select 1 from pg_trigger where tgname='validate_episode_resource_relationship'
    )),
    ('0028', 'event scheduling and registration controls', exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='timezone'
    ) and exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='registration_deadline'
    )),
    ('0028', 'atomic event registration', exists (
      select 1 from pg_proc where proname='register_for_event'
    ) and exists (
      select 1 from pg_proc where proname='cancel_event_registration'
    )),
    ('0028', 'event relationship validation and permission', exists (
      select 1 from pg_trigger where tgname='validate_event_registration_relationship'
    ) and exists (
      select 1 from public.tenant_permissions where permission_key='tenant.events.manage'
    )),
    ('0029', 'resource metadata and versioning', exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='resources' and column_name='full_description'
    ) and to_regclass('public.resource_versions') is not null),
    ('0029', 'member resource bookmarks',
      to_regclass('public.resource_bookmarks') is not null
      and exists(select 1 from pg_indexes where schemaname='public' and indexname='idx_resource_bookmarks_user')
    ),
    ('0029', 'resource relationship validation and permission', exists (
      select 1 from pg_trigger where tgname='validate_resource_bookmark_relationship'
    ) and exists (
      select 1 from public.tenant_permissions where permission_key='tenant.resources.manage'
    )),
    ('0030', 'tenant member profiles and segmentation',
      to_regclass('public.tenant_member_profiles') is not null
      and to_regclass('public.member_tags') is not null
      and to_regclass('public.member_tag_assignments') is not null
    ),
    ('0030', 'private member notes and assignment provenance',
      to_regclass('public.member_notes') is not null
      and exists(select 1 from information_schema.columns where table_schema='public' and table_name='member_subscriptions' and column_name='assignment_type')
    ),
    ('0030', 'member relationship validation and atomic segments', exists (
      select 1 from pg_trigger where tgname='validate_tenant_member_profile_relationship'
    ) and exists (
      select 1 from pg_proc where proname='replace_member_segments'
    )),
    ('0031', 'recommendation explanation and feedback', exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='member_recommendations' and column_name='explanation'
    ) and exists (
      select 1 from pg_trigger where tgname='validate_member_recommendation_target'
    )),
    ('0031', 'qualified insight review workflow', exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='administrator_ai_insights' and column_name='recommended_action'
    ) and exists (
      select 1 from public.tenant_permissions where permission_key='tenant.insights.manage'
    )),
    ('0032', 'data rights request lifecycle and validation',
      to_regclass('public.data_rights_requests') is not null
      and exists(select 1 from pg_trigger where tgname='validate_data_rights_request_relationship')
    ),
    ('0032', 'data governance permission and audit privacy', exists (
      select 1 from public.tenant_permissions where permission_key='tenant.data.manage'
    ) and not exists (
      select 1 from pg_policies where schemaname='public' and tablename='audit_logs' and policyname='tenant members read'
    )),
    ('0033', 'durable abuse controls',
      to_regclass('public.api_rate_limit_windows') is not null
      and exists(select 1 from pg_proc where proname='consume_api_rate_limit')
    ),
    ('0033', 'security event review',
      to_regclass('public.security_events') is not null
      and exists(select 1 from public.platform_permissions where permission_key='platform.security.manage')
    ),
    ('0034', 'protected media registry and validation',
      to_regclass('public.protected_media_assets') is not null
      and exists(select 1 from pg_trigger where tgname='validate_protected_media_relationship')
    ),
    ('0034', 'private media delivery policy', exists (
      select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='protected media managers read'
    ) and not exists (
      select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='tenant scoped storage read'
    )),
    ('0035', 'operational settings and recovery evidence',
      to_regclass('public.platform_operational_settings') is not null
      and to_regclass('public.recovery_verifications') is not null
      and exists(select 1 from public.platform_permissions where permission_key='platform.operations.manage')
    ),
    ('0035', 'pending production release gates and evidence validation',
      to_regclass('public.production_readiness_checks') is not null
      and exists(select 1 from public.production_readiness_checks where check_key='database_restore_proven' and status='pending')
      and exists(select 1 from pg_trigger where tgname='validate_production_readiness_evidence')
      and exists(select 1 from pg_trigger where tgname='validate_recovery_verification_evidence')
    ),
    ('0036', 'durable transactional notification delivery',
      to_regclass('public.transactional_notification_deliveries') is not null
      and exists(select 1 from pg_proc where proname='claim_transactional_notification_deliveries')
      and exists(select 1 from pg_indexes where schemaname='public' and indexname='idx_transactional_notification_queue')
    ),
    ('0036', 'authorized notification recovery without delete policy',
      exists(select 1 from pg_proc where proname='retry_transactional_notification_delivery')
      and not exists(select 1 from pg_policies where schemaname='public' and tablename='transactional_notification_deliveries' and cmd='DELETE')
    ),
    ('0037', 'production RLS verification evidence model',
      to_regclass('public.rls_verification_case_catalog') is not null
      and to_regclass('public.rls_verification_runs') is not null
      and to_regclass('public.rls_verification_results') is not null
      and exists(select 1 from public.rls_verification_case_catalog where case_key='cross_tenant_read_denied' and verification_mode='manual_behavioral')
    ),
    ('0037', 'strict isolation verification lifecycle',
      exists(select 1 from pg_proc where proname='start_production_rls_verification')
      and exists(select 1 from pg_proc where proname='finalize_production_rls_verification')
      and not exists(select 1 from pg_policies where schemaname='public' and tablename in ('rls_verification_runs','rls_verification_results') and cmd='DELETE')
    ),
    ('0038', 'accessibility and critical-path evidence model',
      to_regclass('public.quality_verification_case_catalog') is not null
      and to_regclass('public.quality_verification_runs') is not null
      and to_regclass('public.quality_verification_results') is not null
      and exists(select 1 from public.platform_permissions where permission_key='platform.quality.manage')
    ),
    ('0038', 'strict production quality lifecycle',
      exists(select 1 from pg_proc where proname='start_production_quality_verification')
      and exists(select 1 from pg_proc where proname='finalize_production_quality_verification')
      and exists(select 1 from public.production_readiness_checks where check_key='accessibility_verified' and status='pending')
      and not exists(select 1 from pg_policies where schemaname='public' and tablename in ('quality_verification_runs','quality_verification_results') and cmd='DELETE')
    ),
    ('0039', 'custom-domain lifecycle and append-only evidence',
      to_regclass('public.tenant_domain_verification_attempts') is not null
      and exists(select 1 from public.tenant_permissions where permission_key='tenant.domains.manage')
      and exists(select 1 from pg_trigger where tgname='validate_tenant_domain_lifecycle')
      and not exists(select 1 from pg_policies where schemaname='public' and tablename='tenant_domain_verification_attempts' and cmd='DELETE')
    ),
    ('0039', 'verified routing, canonical activation, and rollback',
      exists(select 1 from pg_proc where proname='resolve_active_tenant_domain')
      and exists(select 1 from pg_proc where proname='resolve_tenant_canonical_domain')
      and exists(select 1 from pg_proc where proname='activate_tenant_custom_domain')
      and exists(select 1 from pg_proc where proname='rollback_tenant_custom_domain')
      and exists(select 1 from public.production_readiness_checks where check_key='custom_domain_verified' and status='pending')
    ),
    ('0040', 'immutable production release package',
      to_regclass('public.production_release_candidates') is not null
      and to_regclass('public.production_release_events') is not null
      and exists(select 1 from public.platform_permissions where permission_key='platform.release.approve')
      and exists(select 1 from pg_trigger where tgname='validate_production_release_candidate_update')
      and exists(select 1 from pg_trigger where tgname='prevent_production_release_event_mutation')
      and not exists(select 1 from pg_policies where schemaname='public' and tablename in ('production_release_candidates','production_release_events') and cmd='DELETE')
    ),
    ('0040', 'strict release approval and deployment lifecycle',
      exists(select 1 from pg_proc where proname='create_production_release_candidate')
      and exists(select 1 from pg_proc where proname='approve_production_release_candidate')
      and exists(select 1 from pg_proc where proname='record_production_release_deployment')
      and exists(select 1 from pg_proc where proname='cancel_production_release_candidate')
    )
)
select
  migration,
  requirement,
  case when installed then 'PASS' else 'MISSING' end as status
from checks
order by migration, requirement;

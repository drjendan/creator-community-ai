-- PodcastOS multi-tenant foundation.
-- Apply after 0001_initial.sql. Review and test policies in a Supabase staging project
-- before production use; this repository does not claim the RLS is production-certified.

create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

-- Normalize the interrupted MVP schema.
alter table public.tenant_memberships drop constraint if exists tenant_memberships_role_check;
alter table public.tenant_memberships add column if not exists status text not null default 'active';
alter table public.tenant_memberships add column if not exists updated_at timestamptz not null default now();
alter table public.tenant_memberships add constraint tenant_memberships_role_check check (
  role in ('platform_owner','platform_admin','tenant_owner','tenant_admin','content_manager','community_moderator','member','guest')
);
alter table public.tenant_branding add column if not exists created_at timestamptz not null default now();

create table public.tenant_domains (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  hostname text not null unique, is_primary boolean not null default false, status text not null default 'pending',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tenant_roles (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id,user_id,role)
);
create table public.tenant_invitations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null, role text not null, token_hash text not null unique, status text not null default 'pending',
  invited_by uuid references auth.users(id), expires_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.podcasts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null, slug text not null, description text, status text not null default 'draft', is_public boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,slug)
);
create table public.episodes (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  podcast_id uuid not null references public.podcasts(id) on delete cascade, title text not null, slug text not null,
  description text, audio_url text, status text not null default 'draft', access_level text not null default 'public',
  publish_date timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(tenant_id,slug), check(access_level in ('public','member','paid'))
);
create table public.episode_guests (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade, name text not null, bio text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.episode_tags (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade, tag text not null,
  created_at timestamptz not null default now(), unique(episode_id,tag)
);
create table public.episode_resources (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade, title text not null, url text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.episode_transcripts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade, content text not null, status text not null default 'draft',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.episode_comments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade, user_id uuid not null references auth.users(id),
  body text not null, status text not null default 'published', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null, slug text not null, description text, status text not null default 'draft', access_level text not null default 'member',
  publish_date timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,slug)
);
create table public.course_modules (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade, title text not null, position integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_id uuid not null references public.course_modules(id) on delete cascade, title text not null, slug text not null,
  content jsonb not null default '{}', status text not null default 'draft', position integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,slug)
);
create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade, title text not null, url text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade, user_id uuid not null references auth.users(id),
  status text not null default 'active', enrolled_at timestamptz not null default now(), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(course_id,user_id)
);
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade, user_id uuid not null references auth.users(id),
  status text not null default 'started', progress_percent integer not null default 0 check(progress_percent between 0 and 100),
  completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(lesson_id,user_id)
);

create table public.community_spaces (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, slug text not null, description text, status text not null default 'active', access_level text not null default 'member',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,slug)
);
create table public.community_posts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  space_id uuid not null references public.community_spaces(id) on delete cascade, user_id uuid not null references auth.users(id),
  title text, body text not null, status text not null default 'published', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.community_comments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade, user_id uuid not null references auth.users(id),
  body text not null, status text not null default 'published', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.community_reactions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade, comment_id uuid references public.community_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id), reaction text not null, created_at timestamptz not null default now()
);

create table public.platform_plans (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, price_monthly numeric(12,2),
  status text not null default 'active', limits jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.platform_plan_features (
  id uuid primary key default gen_random_uuid(), plan_id uuid not null references public.platform_plans(id) on delete cascade,
  key text not null, value jsonb not null default 'true', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(plan_id,key)
);
create table public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.platform_plans(id), provider_customer_id text, provider_subscription_id text,
  status text not null default 'trialing', current_period_end timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tenant_membership_plans (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null, slug text not null, price_monthly numeric(12,2) not null default 0, status text not null default 'active',
  access_rules jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,slug)
);
create table public.member_subscriptions (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id), plan_id uuid not null references public.tenant_membership_plans(id),
  status text not null default 'active', provider_subscription_id text, current_period_end timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id), amount numeric(12,2) not null, currency text not null default 'USD',
  provider_payment_id text, status text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.billing_events (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider_event_id text not null unique, event_type text not null, payload jsonb not null, status text not null default 'received',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null, slug text not null, description text, starts_at timestamptz not null, status text not null default 'draft',
  access_level text not null default 'member', publish_date timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(tenant_id,slug)
);
create table public.event_registrations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade, user_id uuid not null references auth.users(id),
  status text not null default 'registered', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(event_id,user_id)
);
create table public.event_replays (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade, url text not null, access_level text not null default 'member',
  status text not null default 'published', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.ai_knowledge_sources (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_type text not null, source_id uuid, status text not null default 'pending',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.ai_documents (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  source_id uuid references public.ai_knowledge_sources(id) on delete cascade, title text not null, content text,
  status text not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.ai_chunks (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  document_id uuid not null references public.ai_documents(id) on delete cascade, content text not null, embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id), title text, status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade, role text not null, content text not null,
  citations jsonb not null default '[]', created_at timestamptz not null default now()
);
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id), model text not null, input_tokens integer not null default 0, output_tokens integer not null default 0,
  cost numeric(12,6) not null default 0, created_at timestamptz not null default now()
);
create table public.tenant_ai_settings (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  enabled boolean not null default false, system_instructions text, monthly_token_limit integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id), type text not null, title text not null, body text, status text not null default 'unread',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id), action text not null, entity_type text, entity_id uuid, metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table public.support_requests (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id), subject text not null, body text not null, status text not null default 'open',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.feature_flags (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null, enabled boolean not null default false, configuration jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(tenant_id,key)
);
create table public.usage_metrics (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id) on delete cascade,
  metric text not null, value numeric not null default 0, period_start timestamptz not null, period_end timestamptz not null,
  created_at timestamptz not null default now(), unique(tenant_id,metric,period_start)
);

-- Separate platform authorization is based on an app_metadata claim set only by a
-- trusted server/admin process. Browser-editable user_metadata is never accepted.
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(auth.jwt()->'app_metadata'->>'platform_role','') in ('platform_owner','platform_admin') $$;

create or replace function public.can_manage_tenant(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_platform_admin() or exists (
  select 1 from public.tenant_memberships m where m.tenant_id=target_tenant and m.user_id=auth.uid()
  and m.status='active' and m.role in ('tenant_owner','tenant_admin','content_manager','community_moderator')
) $$;

-- Index every common tenant and query key without repeating fragile DDL.
do $$
declare t text; c text;
begin
  foreach t in array array[
    'tenant_domains','tenant_branding','tenant_memberships','tenant_roles','tenant_invitations','podcasts','episodes',
    'episode_guests','episode_tags','episode_resources','episode_transcripts','episode_comments','courses','course_modules',
    'lessons','lesson_resources','course_enrollments','lesson_progress','community_spaces','community_posts',
    'community_comments','community_reactions','tenant_subscriptions','tenant_membership_plans','member_subscriptions',
    'payments','billing_events','events','event_registrations','event_replays','ai_knowledge_sources','ai_documents',
    'ai_chunks','ai_conversations','ai_messages','ai_usage','tenant_ai_settings','notifications','audit_logs',
    'support_requests','feature_flags','usage_metrics'
  ] loop
    execute format('create index if not exists %I on public.%I(tenant_id)', 'idx_'||t||'_tenant_id', t);
    foreach c in array array['user_id','slug','status','created_at','publish_date'] loop
      if exists(select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name=c) then
        execute format('create index if not exists %I on public.%I(%I)', 'idx_'||t||'_'||c, t, c);
      end if;
    end loop;
  end loop;
end $$;

-- Default tenant policies: active members can read; tenant managers can mutate.
-- More restrictive paid-content policies below replace the default read policy.
do $$
declare t text;
begin
  foreach t in array array[
    'tenant_domains','tenant_branding','tenant_memberships','tenant_roles','tenant_invitations','podcasts','episodes',
    'episode_guests','episode_tags','episode_resources','episode_transcripts','episode_comments','courses','course_modules',
    'lessons','lesson_resources','course_enrollments','lesson_progress','community_spaces','community_posts',
    'community_comments','community_reactions','tenant_subscriptions','tenant_membership_plans','member_subscriptions',
    'payments','billing_events','events','event_registrations','event_replays','ai_knowledge_sources','ai_documents',
    'ai_chunks','ai_conversations','ai_messages','ai_usage','tenant_ai_settings','notifications','audit_logs',
    'support_requests','feature_flags','usage_metrics'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "tenant members read" on public.%I for select using (public.is_platform_admin() or public.is_tenant_member(tenant_id))', t);
    execute format('create policy "tenant managers insert" on public.%I for insert with check (public.can_manage_tenant(tenant_id))', t);
    execute format('create policy "tenant managers update" on public.%I for update using (public.can_manage_tenant(tenant_id)) with check (public.can_manage_tenant(tenant_id))', t);
    execute format('create policy "tenant managers delete" on public.%I for delete using (public.can_manage_tenant(tenant_id))', t);
  end loop;
end $$;

-- Public visitors can only read explicitly published public content.
create policy "public published podcasts" on public.podcasts for select using (is_public and status='published');
create policy "public published episodes" on public.episodes for select using (status='published' and access_level='public' and publish_date <= now());
create policy "public published courses" on public.courses for select using (status='published' and access_level='public' and publish_date <= now());
create policy "public published events" on public.events for select using (status='published' and access_level='public' and publish_date <= now());

-- User-owned records are additionally constrained to the current user for inserts.
create policy "users enroll self" on public.course_enrollments for insert with check (user_id=auth.uid() and public.is_tenant_member(tenant_id));
create policy "users update own progress" on public.lesson_progress for update using (user_id=auth.uid() and public.is_tenant_member(tenant_id));
create policy "users register self" on public.event_registrations for insert with check (user_id=auth.uid() and public.is_tenant_member(tenant_id));
create policy "users create own conversations" on public.ai_conversations for insert with check (user_id=auth.uid() and public.is_tenant_member(tenant_id));

-- Storage convention: object names begin with <tenant_uuid>/...
-- Apply only when storage.objects exists (managed Supabase projects).
do $$ begin
  if to_regclass('storage.objects') is not null then
    execute 'create policy "tenant scoped storage read" on storage.objects for select using (
      bucket_id=''tenant-assets'' and public.is_tenant_member(((storage.foldername(name))[1])::uuid)
    )';
    execute 'create policy "tenant scoped storage write" on storage.objects for insert with check (
      bucket_id=''tenant-assets'' and public.can_manage_tenant(((storage.foldername(name))[1])::uuid)
    )';
  end if;
end $$;

-- Milestone 10: complete member discussions and tenant moderation.

insert into public.tenant_permissions(permission_key,label) values
  ('tenant.community.manage','Manage and moderate community')
on conflict(permission_key) do update set label=excluded.label;
insert into public.tenant_role_permissions(role_key,permission_key) values
  ('tenant_owner','tenant.community.manage'),('tenant_admin','tenant.community.manage'),
  ('content_manager','tenant.community.manage'),('community_manager','tenant.community.manage'),
  ('community_moderator','tenant.community.manage')
on conflict do nothing;

alter table public.community_spaces
  add column if not exists guidelines text not null default '',
  add column if not exists posting_policy text not null default 'members',
  add column if not exists sort_order integer not null default 0,
  add column if not exists featured boolean not null default false;
alter table public.community_spaces drop constraint if exists community_spaces_posting_policy_check;
alter table public.community_spaces add constraint community_spaces_posting_policy_check check(posting_policy in ('members','managers'));

alter table public.community_posts
  add column if not exists is_pinned boolean not null default false,
  add column if not exists is_locked boolean not null default false,
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists moderation_reason text,
  add column if not exists edited_at timestamptz;
alter table public.community_comments
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists moderation_reason text,
  add column if not exists edited_at timestamptz;
alter table public.community_posts drop constraint if exists community_posts_status_check;
alter table public.community_posts add constraint community_posts_status_check check(status in ('published','hidden','deleted'));
alter table public.community_comments drop constraint if exists community_comments_status_check;
alter table public.community_comments add constraint community_comments_status_check check(status in ('published','hidden','deleted'));

alter table public.community_reactions drop constraint if exists community_reactions_target_check;
alter table public.community_reactions add constraint community_reactions_target_check check((post_id is not null)::integer+(comment_id is not null)::integer=1);
alter table public.community_reactions drop constraint if exists community_reactions_value_check;
alter table public.community_reactions add constraint community_reactions_value_check check(reaction in ('like','celebrate','support','insightful'));
create unique index if not exists uq_community_post_reaction on public.community_reactions(post_id,user_id,reaction) where post_id is not null;
create unique index if not exists uq_community_comment_reaction on public.community_reactions(comment_id,user_id,reaction) where comment_id is not null;

create table if not exists public.community_reports(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check(status in ('open','reviewed','dismissed','actioned')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check((post_id is not null)::integer+(comment_id is not null)::integer=1)
);
create index if not exists idx_community_reports_queue on public.community_reports(tenant_id,status,created_at);

create or replace function public.validate_community_relationships()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='community_posts' and not exists(select 1 from public.community_spaces where id=new.space_id and tenant_id=new.tenant_id) then raise exception 'invalid_community_space'; end if;
  if tg_table_name='community_comments' and not exists(select 1 from public.community_posts where id=new.post_id and tenant_id=new.tenant_id) then raise exception 'invalid_community_post'; end if;
  if tg_table_name='community_reactions' then
    if new.post_id is not null and not exists(select 1 from public.community_posts where id=new.post_id and tenant_id=new.tenant_id) then raise exception 'invalid_community_post'; end if;
    if new.comment_id is not null and not exists(select 1 from public.community_comments where id=new.comment_id and tenant_id=new.tenant_id) then raise exception 'invalid_community_comment'; end if;
  end if;
  if tg_table_name='community_reports' then
    if new.post_id is not null and not exists(select 1 from public.community_posts where id=new.post_id and tenant_id=new.tenant_id) then raise exception 'invalid_community_post'; end if;
    if new.comment_id is not null and not exists(select 1 from public.community_comments where id=new.comment_id and tenant_id=new.tenant_id) then raise exception 'invalid_community_comment'; end if;
  end if;
  return new;
end $$;
drop trigger if exists validate_community_posts on public.community_posts;
create trigger validate_community_posts before insert or update on public.community_posts for each row execute function public.validate_community_relationships();
drop trigger if exists validate_community_comments on public.community_comments;
create trigger validate_community_comments before insert or update on public.community_comments for each row execute function public.validate_community_relationships();
drop trigger if exists validate_community_reactions on public.community_reactions;
create trigger validate_community_reactions before insert or update on public.community_reactions for each row execute function public.validate_community_relationships();
drop trigger if exists validate_community_reports on public.community_reports;
create trigger validate_community_reports before insert or update on public.community_reports for each row execute function public.validate_community_relationships();

-- Replace broad tenant reads with access-aware, visibility-aware policies.
drop policy if exists "tenant members read" on public.community_spaces;
create policy "members read accessible spaces" on public.community_spaces for select using (
  (status='active' and public.has_content_access(tenant_id,'community_space',id,access_level))
  or public.has_tenant_permission(tenant_id,'tenant.community.manage')
);
drop policy if exists "tenant members read" on public.community_posts;
create policy "members read visible posts" on public.community_posts for select using (
  (status='published' and hidden_at is null and exists(select 1 from public.community_spaces space where space.id=space_id and space.tenant_id=community_posts.tenant_id and space.status='active' and public.has_content_access(community_posts.tenant_id,'community_space',space.id,space.access_level)))
  or public.has_tenant_permission(tenant_id,'tenant.community.manage')
);
drop policy if exists "tenant members read" on public.community_comments;
create policy "members read visible comments" on public.community_comments for select using (
  (status='published' and hidden_at is null and exists(select 1 from public.community_posts post join public.community_spaces space on space.id=post.space_id where post.id=post_id and post.tenant_id=community_comments.tenant_id and post.status='published' and post.hidden_at is null and space.status='active' and public.has_content_access(community_comments.tenant_id,'community_space',space.id,space.access_level)))
  or public.has_tenant_permission(tenant_id,'tenant.community.manage')
);
drop policy if exists "tenant members read" on public.community_reactions;
create policy "members read visible reactions" on public.community_reactions for select using (public.is_tenant_member(tenant_id) or public.has_tenant_permission(tenant_id,'tenant.community.manage'));

create policy "members create posts" on public.community_posts for insert with check (
  user_id=auth.uid() and public.is_tenant_member(tenant_id) and public.tenant_trial_allows_mutation(tenant_id)
  and status='published' and not is_pinned and not is_locked and hidden_at is null and hidden_by is null and moderation_reason is null
  and exists(select 1 from public.community_spaces space where space.id=space_id and space.tenant_id=community_posts.tenant_id and space.status='active' and space.posting_policy='members' and public.has_content_access(community_posts.tenant_id,'community_space',space.id,space.access_level))
);
create policy "members create comments" on public.community_comments for insert with check (
  user_id=auth.uid() and public.is_tenant_member(tenant_id) and public.tenant_trial_allows_mutation(tenant_id)
  and status='published' and hidden_at is null and hidden_by is null and moderation_reason is null
  and exists(select 1 from public.community_posts post join public.community_spaces space on space.id=post.space_id where post.id=post_id and post.tenant_id=community_comments.tenant_id and post.status='published' and post.hidden_at is null and not post.is_locked and space.status='active' and public.has_content_access(community_comments.tenant_id,'community_space',space.id,space.access_level))
);
drop policy if exists "members read visible reactions" on public.community_reactions;
create policy "members read visible reactions" on public.community_reactions for select using (
  public.has_tenant_permission(tenant_id,'tenant.community.manage') or exists(
    select 1 from public.community_posts post join public.community_spaces space on space.id=post.space_id
    where post.id=community_reactions.post_id and post.tenant_id=community_reactions.tenant_id and post.status='published' and post.hidden_at is null and space.status='active' and public.has_content_access(community_reactions.tenant_id,'community_space',space.id,space.access_level)
  ) or exists(
    select 1 from public.community_comments comment join public.community_posts post on post.id=comment.post_id join public.community_spaces space on space.id=post.space_id
    where comment.id=community_reactions.comment_id and comment.tenant_id=community_reactions.tenant_id and comment.status='published' and comment.hidden_at is null and post.status='published' and post.hidden_at is null and space.status='active' and public.has_content_access(community_reactions.tenant_id,'community_space',space.id,space.access_level)
  )
);
create policy "members create reactions" on public.community_reactions for insert with check(
  user_id=auth.uid() and public.is_tenant_member(tenant_id) and public.tenant_trial_allows_mutation(tenant_id) and (
    exists(select 1 from public.community_posts post join public.community_spaces space on space.id=post.space_id where post.id=community_reactions.post_id and post.tenant_id=community_reactions.tenant_id and post.status='published' and post.hidden_at is null and space.status='active' and public.has_content_access(community_reactions.tenant_id,'community_space',space.id,space.access_level))
    or exists(select 1 from public.community_comments comment join public.community_posts post on post.id=comment.post_id join public.community_spaces space on space.id=post.space_id where comment.id=community_reactions.comment_id and comment.tenant_id=community_reactions.tenant_id and comment.status='published' and comment.hidden_at is null and post.status='published' and post.hidden_at is null and space.status='active' and public.has_content_access(community_reactions.tenant_id,'community_space',space.id,space.access_level))
  )
);
create policy "members remove own reactions" on public.community_reactions for delete using(user_id=auth.uid());

alter table public.community_reports enable row level security;
drop policy if exists "trial allows reaction inserts" on public.community_reactions;
create policy "trial allows reaction inserts" on public.community_reactions as restrictive for insert with check(public.tenant_trial_allows_mutation(tenant_id));
drop policy if exists "trial allows reaction deletes" on public.community_reactions;
create policy "trial allows reaction deletes" on public.community_reactions as restrictive for delete using(public.tenant_trial_allows_mutation(tenant_id));
drop policy if exists "trial allows report inserts" on public.community_reports;
create policy "trial allows report inserts" on public.community_reports as restrictive for insert with check(public.tenant_trial_allows_mutation(tenant_id));
create policy "members create reports" on public.community_reports for insert with check(reporter_id=auth.uid() and public.is_tenant_member(tenant_id) and public.tenant_trial_allows_mutation(tenant_id) and status='open' and resolved_by is null and resolved_at is null);
create policy "members read own reports" on public.community_reports for select using(reporter_id=auth.uid() or public.has_tenant_permission(tenant_id,'tenant.community.manage'));
create policy "community managers update reports" on public.community_reports for update using(public.has_tenant_permission(tenant_id,'tenant.community.manage')) with check(public.has_tenant_permission(tenant_id,'tenant.community.manage'));

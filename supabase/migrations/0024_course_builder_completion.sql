-- Milestone 8: complete the beta Course Builder data model and ordering integrity.

alter table public.courses
  add column if not exists full_description text,
  add column if not exists difficulty text not null default 'all_levels',
  add column if not exists estimated_duration_minutes integer,
  add column if not exists learning_objectives jsonb not null default '[]',
  add column if not exists prerequisites text,
  add column if not exists featured boolean not null default false,
  add column if not exists completion_requirements jsonb not null default '{}',
  add column if not exists certificate_settings jsonb not null default '{"enabled":false,"title":"Certificate of Completion"}';
alter table public.courses drop constraint if exists courses_difficulty_check;
alter table public.courses add constraint courses_difficulty_check
  check (difficulty in ('all_levels','beginner','intermediate','advanced'));
alter table public.courses drop constraint if exists courses_estimated_duration_check;
alter table public.courses add constraint courses_estimated_duration_check
  check (estimated_duration_minutes is null or estimated_duration_minutes between 1 and 100000);

alter table public.course_modules add column if not exists description text not null default '';
alter table public.lessons
  add column if not exists lesson_type text not null default 'text',
  add column if not exists is_required boolean not null default true,
  add column if not exists estimated_duration_minutes integer,
  add column if not exists drip_days integer not null default 0,
  add column if not exists prerequisite_lesson_id uuid references public.lessons(id) on delete set null,
  add column if not exists completion_rule jsonb not null default '{}';
alter table public.lessons drop constraint if exists lessons_lesson_type_check;
alter table public.lessons add constraint lessons_lesson_type_check
  check (lesson_type in ('video','audio','text','live_session','embed','download','assignment','quiz','discussion','worksheet','template','document'));
alter table public.lessons drop constraint if exists lessons_duration_check;
alter table public.lessons add constraint lessons_duration_check
  check (estimated_duration_minutes is null or estimated_duration_minutes between 1 and 10000);
alter table public.lessons drop constraint if exists lessons_drip_days_check;
alter table public.lessons add constraint lessons_drip_days_check check (drip_days between 0 and 3650);

create table if not exists public.course_materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.course_modules(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  title text not null,
  material_type text not null default 'document' check (material_type in ('worksheet','template','pdf','document','presentation','spreadsheet','graphic','checklist','external_link','recording','transcript','download')),
  url text not null,
  storage_path text,
  access_level text not null default 'member' check (access_level in ('public','member','paid')),
  allow_download boolean not null default true,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_course_materials_course on public.course_materials(tenant_id,course_id,sort_order);

create table if not exists public.course_quizzes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  title text not null,
  passing_score integer not null default 70 check (passing_score between 0 and 100),
  attempts_allowed integer not null default 1 check (attempts_allowed between 1 and 100),
  is_required boolean not null default true,
  randomized_questions boolean not null default false,
  randomized_answers boolean not null default false,
  show_explanations boolean not null default true,
  show_correct_answers boolean not null default true,
  time_limit_minutes integer check (time_limit_minutes is null or time_limit_minutes between 1 and 1440),
  is_graded boolean not null default true,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_course_quizzes_course on public.course_quizzes(tenant_id,course_id,created_at);

create table if not exists public.course_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quiz_id uuid not null references public.course_quizzes(id) on delete cascade,
  question_type text not null check (question_type in ('multiple_choice','true_false','multiple_selection','short_answer')),
  prompt text not null,
  options jsonb not null default '[]',
  correct_answers jsonb not null default '[]',
  explanation text not null default '',
  points numeric(8,2) not null default 1 check (points > 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_course_quiz_questions_quiz on public.course_quiz_questions(tenant_id,quiz_id,position);
alter table public.course_quiz_questions drop constraint if exists course_quiz_questions_answers_check;
alter table public.course_quiz_questions add constraint course_quiz_questions_answers_check check (
  jsonb_typeof(options)='array' and jsonb_typeof(correct_answers)='array'
  and jsonb_array_length(correct_answers)>0
  and (question_type='short_answer' or jsonb_array_length(options)>=2)
);

alter table public.course_enrollments
  add column if not exists progress_percent integer not null default 0,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists last_activity_at timestamptz;
alter table public.course_enrollments drop constraint if exists course_enrollments_progress_check;
alter table public.course_enrollments add constraint course_enrollments_progress_check check (progress_percent between 0 and 100);
alter table public.lesson_progress add column if not exists last_accessed_at timestamptz;

-- Course readers only see published curriculum they are entitled to. Enrollment
-- and progress rows are private to the learner unless the caller manages courses.
drop policy if exists "tenant members read" on public.course_modules;
create policy "authorized course modules" on public.course_modules for select using (
  exists(select 1 from public.courses course where course.id=course_modules.course_id and course.tenant_id=course_modules.tenant_id
    and course.status='published' and public.has_content_access(course_modules.tenant_id,'course',course.id,course.access_level))
  or public.has_tenant_permission(course_modules.tenant_id,'tenant.courses.manage')
);
drop policy if exists "tenant members read" on public.lessons;
create policy "authorized published lessons" on public.lessons for select using (
  (status='published' and exists(select 1 from public.course_modules module join public.courses course on course.id=module.course_id
    where module.id=lessons.module_id and module.tenant_id=lessons.tenant_id and course.status='published'
      and public.has_content_access(lessons.tenant_id,'course',course.id,course.access_level)))
  or public.has_tenant_permission(lessons.tenant_id,'tenant.courses.manage')
);
drop policy if exists "tenant members read" on public.lesson_resources;
create policy "authorized lesson resources" on public.lesson_resources for select using (
  exists(select 1 from public.lessons lesson join public.course_modules module on module.id=lesson.module_id
    join public.courses course on course.id=module.course_id where lesson.id=lesson_resources.lesson_id and lesson.status='published'
      and lesson.tenant_id=lesson_resources.tenant_id and course.status='published'
      and public.has_content_access(lesson_resources.tenant_id,'course',course.id,course.access_level))
  or public.has_tenant_permission(lesson_resources.tenant_id,'tenant.courses.manage')
);
drop policy if exists "tenant members read" on public.course_enrollments;
create policy "learners read own enrollment" on public.course_enrollments for select using (
  user_id=auth.uid() or public.has_tenant_permission(tenant_id,'tenant.courses.manage')
);
drop policy if exists "tenant members read" on public.lesson_progress;
create policy "learners read own progress" on public.lesson_progress for select using (
  user_id=auth.uid() or public.has_tenant_permission(tenant_id,'tenant.courses.manage')
);

create or replace function public.validate_course_builder_relationships()
returns trigger language plpgsql security definer set search_path=public as $$
declare related_module uuid;
begin
  if tg_table_name='lessons' and new.prerequisite_lesson_id is not null then
    if new.prerequisite_lesson_id=new.id or not exists(
      select 1 from public.lessons prerequisite
      join public.course_modules prerequisite_module on prerequisite_module.id=prerequisite.module_id
      join public.course_modules current_module on current_module.id=new.module_id
      where prerequisite.id=new.prerequisite_lesson_id
        and prerequisite.tenant_id=new.tenant_id
        and prerequisite_module.course_id=current_module.course_id
        and current_module.tenant_id=new.tenant_id
    ) then raise exception 'invalid_course_lesson_prerequisite'; end if;
  elsif tg_table_name='course_materials' then
    if new.module_id is not null and not exists(select 1 from public.course_modules where id=new.module_id and tenant_id=new.tenant_id and course_id=new.course_id) then
      raise exception 'invalid_course_material_module';
    end if;
    if new.lesson_id is not null then
      select module_id into related_module from public.lessons where id=new.lesson_id and tenant_id=new.tenant_id;
      if related_module is null or not exists(select 1 from public.course_modules where id=related_module and course_id=new.course_id and tenant_id=new.tenant_id) then
        raise exception 'invalid_course_material_lesson';
      end if;
      if new.module_id is not null and new.module_id<>related_module then raise exception 'course_material_hierarchy_mismatch'; end if;
    end if;
  elsif tg_table_name='course_quizzes' and new.lesson_id is not null then
    select module_id into related_module from public.lessons where id=new.lesson_id and tenant_id=new.tenant_id;
    if related_module is null or not exists(select 1 from public.course_modules where id=related_module and course_id=new.course_id and tenant_id=new.tenant_id) then
      raise exception 'invalid_course_quiz_lesson';
    end if;
  elsif tg_table_name='course_quiz_questions' and not exists(select 1 from public.course_quizzes where id=new.quiz_id and tenant_id=new.tenant_id) then
    raise exception 'invalid_course_quiz';
  end if;
  return new;
end $$;
drop trigger if exists validate_course_lesson_relationships on public.lessons;
create trigger validate_course_lesson_relationships before insert or update on public.lessons for each row execute function public.validate_course_builder_relationships();
drop trigger if exists validate_course_material_relationships on public.course_materials;
create trigger validate_course_material_relationships before insert or update on public.course_materials for each row execute function public.validate_course_builder_relationships();
drop trigger if exists validate_course_quiz_relationships on public.course_quizzes;
create trigger validate_course_quiz_relationships before insert or update on public.course_quizzes for each row execute function public.validate_course_builder_relationships();
drop trigger if exists validate_course_question_relationships on public.course_quiz_questions;
create trigger validate_course_question_relationships before insert or update on public.course_quiz_questions for each row execute function public.validate_course_builder_relationships();

alter table public.course_materials enable row level security;
alter table public.course_quizzes enable row level security;
alter table public.course_quiz_questions enable row level security;
do $$
declare table_name text;
begin
  foreach table_name in array array['course_materials','course_quizzes','course_quiz_questions'] loop
    execute format('drop policy if exists "course managers read" on public.%I',table_name);
    execute format('drop policy if exists "course managers insert" on public.%I',table_name);
    execute format('drop policy if exists "course managers update" on public.%I',table_name);
    execute format('drop policy if exists "course managers delete" on public.%I',table_name);
    execute format('create policy "course managers read" on public.%I for select using (public.has_tenant_permission(tenant_id,''tenant.courses.manage''))',table_name);
    execute format('create policy "course managers insert" on public.%I for insert with check (public.has_tenant_permission(tenant_id,''tenant.courses.manage''))',table_name);
    execute format('create policy "course managers update" on public.%I for update using (public.has_tenant_permission(tenant_id,''tenant.courses.manage'')) with check (public.has_tenant_permission(tenant_id,''tenant.courses.manage''))',table_name);
    execute format('create policy "course managers delete" on public.%I for delete using (public.has_tenant_permission(tenant_id,''tenant.courses.manage''))',table_name);
  end loop;
end $$;

drop policy if exists "members read published course materials" on public.course_materials;
create policy "members read published course materials" on public.course_materials for select to authenticated
  using (status='published' and public.has_content_access(tenant_id,'course',course_id,access_level));
drop policy if exists "members read published course quizzes" on public.course_quizzes;
create policy "members read published course quizzes" on public.course_quizzes for select to authenticated
  using (status='published' and public.has_content_access(tenant_id,'course',course_id,'member'));
drop policy if exists "members read published quiz questions" on public.course_quiz_questions;
-- Correct answers remain manager-only. A future quiz-attempt endpoint must return
-- a safe projection and grade in trusted server code rather than exposing rows.

create or replace function public.reorder_course_items(target_tenant uuid,target_course uuid,target_kind text,target_parent uuid,target_ids uuid[])
returns void language plpgsql security definer set search_path=public as $$
declare item_id uuid; item_position integer:=0; matched integer;
begin
  if coalesce(auth.role(),'')<>'service_role' and not public.has_tenant_permission(target_tenant,'tenant.courses.manage') then raise exception 'course_management_permission_required'; end if;
  if target_kind='module' then
    select count(*) into matched from public.course_modules where tenant_id=target_tenant and course_id=target_course and id=any(target_ids);
    if matched<>cardinality(target_ids) then raise exception 'invalid_course_module_order'; end if;
    foreach item_id in array target_ids loop update public.course_modules set position=item_position,updated_at=now() where id=item_id and tenant_id=target_tenant and course_id=target_course; item_position:=item_position+1; end loop;
  elsif target_kind='lesson' then
    if not exists(select 1 from public.course_modules where id=target_parent and tenant_id=target_tenant and course_id=target_course) then raise exception 'invalid_course_module'; end if;
    select count(*) into matched from public.lessons where tenant_id=target_tenant and module_id=target_parent and id=any(target_ids);
    if matched<>cardinality(target_ids) then raise exception 'invalid_course_lesson_order'; end if;
    foreach item_id in array target_ids loop update public.lessons set position=item_position,updated_at=now() where id=item_id and tenant_id=target_tenant and module_id=target_parent; item_position:=item_position+1; end loop;
  else raise exception 'invalid_course_item_kind';
  end if;
end $$;
revoke all on function public.reorder_course_items(uuid,uuid,text,uuid,uuid[]) from public,anon;
grant execute on function public.reorder_course_items(uuid,uuid,text,uuid,uuid[]) to authenticated,service_role;

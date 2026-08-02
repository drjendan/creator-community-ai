import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenantWithPermission } from "@/lib/tenant-context";
import { getTenantEntitlements } from "@/lib/feature-entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { trialMutationError } from "@/lib/trials";

const lessonTypes = ["video","audio","text","live_session","embed","download","assignment","quiz","discussion","worksheet","template","document"] as const;
const structureSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("course"), fullDescription: z.string().trim().max(20000).default(""), difficulty: z.enum(["all_levels","beginner","intermediate","advanced"]), estimatedDurationMinutes: z.number().int().min(1).max(100000).nullable(), learningObjectives: z.array(z.string().trim().min(1).max(500)).max(30), prerequisites: z.string().trim().max(5000).default(""), featured: z.boolean(), completionRequirements: z.object({ requiredLessons: z.boolean(), requiredQuizzes: z.boolean(), minimumProgress: z.number().int().min(0).max(100) }), certificateSettings: z.object({ enabled: z.boolean(), title: z.string().trim().min(2).max(180) }) }),
  z.object({ kind: z.literal("module"), id: z.string().uuid().optional(), title: z.string().trim().min(2).max(160), description: z.string().trim().max(2000).default(""), position: z.number().int().min(0).default(0) }),
  z.object({ kind: z.literal("lesson"), id: z.string().uuid().optional(), moduleId: z.string().uuid(), title: z.string().trim().min(2).max(160), description: z.string().trim().max(10000).default(""), mediaUrl: z.string().trim().max(2000).default(""), resourceUrl: z.string().trim().max(2000).default(""), lessonType: z.enum(lessonTypes), required: z.boolean(), durationMinutes: z.number().int().min(1).max(10000).nullable(), dripDays: z.number().int().min(0).max(3650), prerequisiteLessonId: z.string().uuid().nullable(), status: z.enum(["draft","published","archived"]), position: z.number().int().min(0).default(0) }),
  z.object({ kind: z.literal("material"), id: z.string().uuid().optional(), moduleId: z.string().uuid().nullable(), lessonId: z.string().uuid().nullable(), title: z.string().trim().min(2).max(180), materialType: z.enum(["worksheet","template","pdf","document","presentation","spreadsheet","graphic","checklist","external_link","recording","transcript","download"]), url: z.string().trim().url().max(2000), accessLevel: z.enum(["public","member","paid"]), allowDownload: z.boolean(), version: z.number().int().min(1).max(10000), status: z.enum(["draft","published","archived"]), sortOrder: z.number().int().min(0) }),
  z.object({ kind: z.literal("quiz"), id: z.string().uuid().optional(), lessonId: z.string().uuid().nullable(), title: z.string().trim().min(2).max(180), passingScore: z.number().int().min(0).max(100), attemptsAllowed: z.number().int().min(1).max(100), required: z.boolean(), randomizedQuestions: z.boolean(), randomizedAnswers: z.boolean(), showExplanations: z.boolean(), showCorrectAnswers: z.boolean(), timeLimitMinutes: z.number().int().min(1).max(1440).nullable(), graded: z.boolean(), status: z.enum(["draft","published","archived"]) }),
  z.object({ kind: z.literal("question"), id: z.string().uuid().optional(), quizId: z.string().uuid(), questionType: z.enum(["multiple_choice","true_false","multiple_selection","short_answer"]), prompt: z.string().trim().min(2).max(5000), options: z.array(z.string().trim().min(1).max(1000)).max(20), correctAnswers: z.array(z.string().trim().min(1).max(1000)).min(1).max(20), explanation: z.string().trim().max(5000).default(""), points: z.number().positive().max(10000), position: z.number().int().min(0) })
]);
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reorder"), kind: z.enum(["module","lesson"]), parentId: z.string().uuid().nullable(), ids: z.array(z.string().uuid()).min(1).max(500) }),
  z.object({ action: z.literal("duplicate"), kind: z.enum(["module","lesson"]), id: z.string().uuid() })
]);

async function authorize(courseId: string) {
  const context = await getActiveTenantWithPermission("tenant.courses.manage");
  if (!context) return null;
  const entitlements = await getTenantEntitlements(context.tenant.id, context.supabase);
  if (entitlements.get("courses") !== true) return null;
  const admin = createAdminClient();
  const { data: course } = await admin.from("courses").select("*").eq("id", courseId).eq("tenant_id", context.tenant.id).maybeSingle();
  return course ? { context, course, admin } : null;
}

function slugify(value: string) {
  const base = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "lesson"}-${randomUUID().slice(0, 8)}`;
}

async function audit(authorized: NonNullable<Awaited<ReturnType<typeof authorize>>>, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  await authorized.admin.from("audit_logs").insert({ tenant_id: authorized.context.tenant.id, user_id: authorized.context.user.id, action, entity_type: entityType, entity_id: entityId, metadata: { course_id: authorized.course.id, ...metadata } });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  if (!z.string().uuid().safeParse(courseId).success) return NextResponse.json({ error: "A valid course is required." }, { status: 400 });
  const authorized = await authorize(courseId);
  if (!authorized) return NextResponse.json({ error: "Course management permission is required." }, { status: 403 });
  const { admin, context, course } = authorized;
  const [{ data: modules, error: moduleError }, { data: materials, error: materialError }, { data: quizzes, error: quizError }, { data: enrollments }, { data: progress }] = await Promise.all([
    admin.from("course_modules").select("*").eq("tenant_id", context.tenant.id).eq("course_id", courseId).order("position"),
    admin.from("course_materials").select("*").eq("tenant_id", context.tenant.id).eq("course_id", courseId).order("sort_order"),
    admin.from("course_quizzes").select("*").eq("tenant_id", context.tenant.id).eq("course_id", courseId).order("created_at"),
    admin.from("course_enrollments").select("status,progress_percent,completed_at").eq("tenant_id", context.tenant.id).eq("course_id", courseId),
    admin.from("lesson_progress").select("progress_percent,status,lesson_id").eq("tenant_id", context.tenant.id)
  ]);
  const migrationError = [materialError, quizError].find(Boolean);
  if (migrationError) return NextResponse.json({ error: /course_materials|course_quizzes|schema cache|relation/i.test(migrationError.message) ? "Course Builder migration 0024 is required." : migrationError.message }, { status: 500 });
  if (moduleError) return NextResponse.json({ error: moduleError.message }, { status: 500 });
  const moduleIds = (modules ?? []).map((module) => module.id);
  const { data: lessons, error: lessonError } = moduleIds.length ? await admin.from("lessons").select("*").eq("tenant_id", context.tenant.id).in("module_id", moduleIds).order("position") : { data: [], error: null };
  if (lessonError) return NextResponse.json({ error: lessonError.message }, { status: 500 });
  const quizIds = (quizzes ?? []).map((quiz) => quiz.id);
  const { data: questions, error: questionError } = quizIds.length ? await admin.from("course_quiz_questions").select("*").eq("tenant_id", context.tenant.id).in("quiz_id", quizIds).order("position") : { data: [], error: null };
  if (questionError) return NextResponse.json({ error: questionError.message }, { status: 500 });
  const lessonIds = new Set((lessons ?? []).map((lesson) => lesson.id));
  const courseProgress = (progress ?? []).filter((row) => lessonIds.has(row.lesson_id));
  const completionRate = enrollments?.length ? Math.round((enrollments.filter((row) => row.completed_at || row.progress_percent === 100).length / enrollments.length) * 100) : 0;
  return NextResponse.json({ course, modules: modules ?? [], lessons: lessons ?? [], materials: materials ?? [], quizzes: quizzes ?? [], questions: questions ?? [], summary: { modules: modules?.length ?? 0, lessons: lessons?.length ?? 0, quizzes: quizzes?.length ?? 0, materials: materials?.length ?? 0, enrollments: enrollments?.length ?? 0, completionRate, averageLessonProgress: courseProgress.length ? Math.round(courseProgress.reduce((sum, row) => sum + Number(row.progress_percent ?? 0), 0) / courseProgress.length) : 0 } });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const parsed = structureSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the Course Builder fields." }, { status: 400 });
  const authorized = await authorize(courseId);
  if (!authorized) return NextResponse.json({ error: "Course management permission is required." }, { status: 403 });
  const { admin, context } = authorized;
  const trialError = await trialMutationError(context.tenant.id, "content");
  if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  const input = parsed.data;
  const now = new Date().toISOString();
  let result: { data: Record<string, unknown> | null; error: { message: string } | null };
  if (input.kind === "course") {
    result = await admin.from("courses").update({ full_description: input.fullDescription, difficulty: input.difficulty, estimated_duration_minutes: input.estimatedDurationMinutes, learning_objectives: input.learningObjectives, prerequisites: input.prerequisites, featured: input.featured, completion_requirements: input.completionRequirements, certificate_settings: input.certificateSettings, updated_at: now }).eq("tenant_id", context.tenant.id).eq("id", courseId).select("*").single();
  } else if (input.kind === "module") {
    const values = { tenant_id: context.tenant.id, course_id: courseId, title: input.title, description: input.description, position: input.position, updated_at: now };
    result = input.id ? await admin.from("course_modules").update(values).eq("id", input.id).eq("tenant_id", context.tenant.id).eq("course_id", courseId).select("*").single() : await admin.from("course_modules").insert(values).select("*").single();
  } else if (input.kind === "lesson") {
    const { data: parent } = await admin.from("course_modules").select("id").eq("id", input.moduleId).eq("course_id", courseId).eq("tenant_id", context.tenant.id).maybeSingle();
    if (!parent) return NextResponse.json({ error: "The selected module was not found." }, { status: 404 });
    if (input.id) {
      const { data: existing } = await admin.from("lessons").select("id,course_modules!inner(course_id)").eq("id", input.id).eq("tenant_id", context.tenant.id).eq("course_modules.course_id", courseId).maybeSingle();
      if (!existing) return NextResponse.json({ error: "Lesson not found in this course." }, { status: 404 });
    }
    if (input.prerequisiteLessonId) {
      const { data: prerequisite } = await admin.from("lessons").select("id,module_id,course_modules!inner(course_id)").eq("id", input.prerequisiteLessonId).eq("tenant_id", context.tenant.id).eq("course_modules.course_id", courseId).maybeSingle();
      if (!prerequisite || prerequisite.id === input.id) return NextResponse.json({ error: "Choose another lesson in this course as the prerequisite." }, { status: 400 });
    }
    if (input.status === "published" && !input.description && !input.mediaUrl && !input.resourceUrl) return NextResponse.json({ error: "Add lesson content before publishing." }, { status: 400 });
    const values = { tenant_id: context.tenant.id, module_id: input.moduleId, title: input.title, content: { description: input.description, media_url: input.mediaUrl || null, resource_url: input.resourceUrl || null }, lesson_type: input.lessonType, is_required: input.required, estimated_duration_minutes: input.durationMinutes, drip_days: input.dripDays, prerequisite_lesson_id: input.prerequisiteLessonId, status: input.status, position: input.position, updated_at: now };
    result = input.id ? await admin.from("lessons").update(values).eq("id", input.id).eq("tenant_id", context.tenant.id).select("*").single() : await admin.from("lessons").insert({ ...values, slug: slugify(input.title) }).select("*").single();
  } else if (input.kind === "material") {
    const values = { tenant_id: context.tenant.id, course_id: courseId, module_id: input.moduleId, lesson_id: input.lessonId, title: input.title, material_type: input.materialType, url: input.url, access_level: input.accessLevel, allow_download: input.allowDownload, version: input.version, status: input.status, sort_order: input.sortOrder, created_by: context.user.id, updated_at: now };
    result = input.id ? await admin.from("course_materials").update(values).eq("id", input.id).eq("tenant_id", context.tenant.id).eq("course_id", courseId).select("*").single() : await admin.from("course_materials").insert(values).select("*").single();
  } else if (input.kind === "quiz") {
    const values = { tenant_id: context.tenant.id, course_id: courseId, lesson_id: input.lessonId, title: input.title, passing_score: input.passingScore, attempts_allowed: input.attemptsAllowed, is_required: input.required, randomized_questions: input.randomizedQuestions, randomized_answers: input.randomizedAnswers, show_explanations: input.showExplanations, show_correct_answers: input.showCorrectAnswers, time_limit_minutes: input.timeLimitMinutes, is_graded: input.graded, status: input.status, updated_at: now };
    result = input.id ? await admin.from("course_quizzes").update(values).eq("id", input.id).eq("tenant_id", context.tenant.id).eq("course_id", courseId).select("*").single() : await admin.from("course_quizzes").insert(values).select("*").single();
  } else {
    if (input.questionType !== "short_answer" && input.options.length < 2) return NextResponse.json({ error: "Add at least two answer options." }, { status: 400 });
    const { data: quiz } = await admin.from("course_quizzes").select("id").eq("tenant_id", context.tenant.id).eq("course_id", courseId).eq("id", input.quizId).maybeSingle();
    if (!quiz) return NextResponse.json({ error: "The selected quiz was not found." }, { status: 404 });
    if (input.id) {
      const { data: existing } = await admin.from("course_quiz_questions").select("id,course_quizzes!inner(course_id)").eq("id", input.id).eq("tenant_id", context.tenant.id).eq("course_quizzes.course_id", courseId).maybeSingle();
      if (!existing) return NextResponse.json({ error: "Question not found in this course." }, { status: 404 });
    }
    const values = { tenant_id: context.tenant.id, quiz_id: input.quizId, question_type: input.questionType, prompt: input.prompt, options: input.options, correct_answers: input.correctAnswers, explanation: input.explanation, points: input.points, position: input.position, updated_at: now };
    result = input.id ? await admin.from("course_quiz_questions").update(values).eq("id", input.id).eq("tenant_id", context.tenant.id).select("*").single() : await admin.from("course_quiz_questions").insert(values).select("*").single();
  }
  if (result.error) return NextResponse.json({ error: /course_materials|course_quizzes|lesson_type|full_description|schema cache/i.test(result.error.message) ? "Course Builder migration 0024 is required." : result.error.message }, { status: 500 });
  await audit(authorized, `tenant.course_builder.${input.kind}_saved`, input.kind, String(result.data?.id ?? courseId));
  return NextResponse.json({ item: result.data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid Course Builder action." }, { status: 400 });
  const authorized = await authorize(courseId);
  if (!authorized) return NextResponse.json({ error: "Course management permission is required." }, { status: 403 });
  const { admin, context } = authorized;
  const trialError = await trialMutationError(context.tenant.id, "content");
  if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  if (parsed.data.action === "reorder") {
    const { error } = await admin.rpc("reorder_course_items", { target_tenant: context.tenant.id, target_course: courseId, target_kind: parsed.data.kind, target_parent: parsed.data.parentId, target_ids: parsed.data.ids });
    if (error) return NextResponse.json({ error: /reorder_course_items|schema cache|function/i.test(error.message) ? "Course Builder migration 0024 is required." : "Unable to reorder the course." }, { status: 500 });
    await audit(authorized, "tenant.course_builder.reordered", parsed.data.kind, undefined, { ids: parsed.data.ids, parent_id: parsed.data.parentId });
    return NextResponse.json({ reordered: true });
  }
  if (parsed.data.kind === "lesson") {
    const { data: source } = await admin.from("lessons").select("*,course_modules!inner(course_id)").eq("tenant_id", context.tenant.id).eq("id", parsed.data.id).eq("course_modules.course_id", courseId).maybeSingle();
    if (!source) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    const sourceValues = { ...source };
    delete sourceValues.course_modules;
    const { data, error } = await admin.from("lessons").insert({ ...sourceValues, id: undefined, title: `${source.title} (Copy)`, slug: slugify(source.title), status: "draft", created_at: undefined, updated_at: new Date().toISOString() }).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await audit(authorized, "tenant.course_builder.lesson_duplicated", "lesson", data.id, { source_id: source.id });
    return NextResponse.json({ item: data });
  }
  const { data: source } = await admin.from("course_modules").select("*").eq("tenant_id", context.tenant.id).eq("course_id", courseId).eq("id", parsed.data.id).maybeSingle();
  if (!source) return NextResponse.json({ error: "Module not found." }, { status: 404 });
  const { data: duplicate, error } = await admin.from("course_modules").insert({ ...source, id: undefined, title: `${source.title} (Copy)`, position: Number(source.position) + 1, created_at: undefined, updated_at: new Date().toISOString() }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: lessons } = await admin.from("lessons").select("*").eq("tenant_id", context.tenant.id).eq("module_id", source.id).order("position");
  if (lessons?.length) {
    const copies = lessons.map((lesson) => ({ ...lesson, id: undefined, module_id: duplicate.id, slug: slugify(lesson.title), status: "draft", created_at: undefined, updated_at: new Date().toISOString() }));
    const { error: lessonError } = await admin.from("lessons").insert(copies);
    if (lessonError) { await admin.from("course_modules").delete().eq("id", duplicate.id); return NextResponse.json({ error: "Unable to duplicate the module lessons." }, { status: 500 }); }
  }
  await audit(authorized, "tenant.course_builder.module_duplicated", "course_module", duplicate.id, { source_id: source.id });
  return NextResponse.json({ item: duplicate });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const id = request.nextUrl.searchParams.get("id");
  const kind = request.nextUrl.searchParams.get("kind");
  const tables: Record<string, string> = { module: "course_modules", lesson: "lessons", material: "course_materials", quiz: "course_quizzes", question: "course_quiz_questions" };
  if (!id || !z.string().uuid().safeParse(id).success || !kind || !tables[kind]) return NextResponse.json({ error: "A valid Course Builder item is required." }, { status: 400 });
  const authorized = await authorize(courseId);
  if (!authorized) return NextResponse.json({ error: "Course management permission is required." }, { status: 403 });
  const context = authorized.context;
  const trialError = await trialMutationError(context.tenant.id, "content");
  if (trialError) return NextResponse.json({ error: trialError }, { status: 402 });
  if (kind === "lesson") {
    const { data } = await authorized.admin.from("lessons").select("id,course_modules!inner(course_id)").eq("id", id).eq("tenant_id", authorized.context.tenant.id).eq("course_modules.course_id", courseId).maybeSingle();
    if (!data) return NextResponse.json({ error: "Lesson not found in this course." }, { status: 404 });
  }
  if (kind === "question") {
    const { data } = await authorized.admin.from("course_quiz_questions").select("id,course_quizzes!inner(course_id)").eq("id", id).eq("tenant_id", authorized.context.tenant.id).eq("course_quizzes.course_id", courseId).maybeSingle();
    if (!data) return NextResponse.json({ error: "Question not found in this course." }, { status: 404 });
  }
  let query = authorized.admin.from(tables[kind]).delete().eq("id", id).eq("tenant_id", authorized.context.tenant.id);
  if (["module","material","quiz"].includes(kind)) query = query.eq("course_id", courseId);
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await audit(authorized, `tenant.course_builder.${kind}_deleted`, kind, id);
  return NextResponse.json({ deleted: true });
}

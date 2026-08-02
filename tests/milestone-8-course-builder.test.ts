import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/0024_course_builder_completion.sql");
const api = read("app/api/courses/[courseId]/structure/route.ts");
const builder = read("components/dashboard/CourseStructureManager.tsx");
const member = read("lib/content/member-library.ts");

describe("Milestone 8 Course Builder", () => {
  it("adds complete course materials and assessment storage", () => {
    expect(migration).toContain("create table if not exists public.course_materials");
    expect(migration).toContain("create table if not exists public.course_quizzes");
    expect(migration).toContain("create table if not exists public.course_quiz_questions");
    expect(migration).toContain("completion_requirements");
  });

  it("validates hierarchy and authorizes ordered mutations", () => {
    expect(migration).toContain("invalid_course_lesson_prerequisite");
    expect(migration).toContain("reorder_course_items");
    expect(api).toContain('getActiveTenantWithPermission("tenant.courses.manage")');
    expect(api).toContain('eq("course_modules.course_id", courseId)');
    expect(api).toContain('eq("course_quizzes.course_id", courseId)');
  });

  it("keeps learner records private and answer keys manager-only", () => {
    expect(migration).toContain('drop policy if exists "tenant members read" on public.course_enrollments');
    expect(migration).toContain('drop policy if exists "members read published quiz questions"');
    expect(migration).not.toContain('create policy "members read published quiz questions"');
  });

  it("ships five builder areas and structured member courses", () => {
    for (const label of ["Overview", "Curriculum", "Materials", "Assessments", "Progress"]) expect(builder).toContain(`label: "${label}"`);
    expect(builder).toContain('action: "reorder"');
    expect(builder).toContain('action: "duplicate"');
    expect(member).toContain("getPublishedCourse");
    expect(member).not.toContain('.not("content_url", "is", null)');
  });
});

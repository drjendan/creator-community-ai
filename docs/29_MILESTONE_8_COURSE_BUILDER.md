# Milestone 8 — Course Builder

Milestone 8 completes the production Course Builder. It is part of the single production release and is not a staging deployment.

## Delivered

- Five builder areas: Overview, Curriculum, Materials, Assessments, and Progress.
- Course objectives, prerequisites, difficulty, duration, featured state, and completion rules.
- Ordered modules and lessons with duplication, prerequisites, drip timing, required state, duration, and nine lesson types.
- Versioned course materials scoped to a course, module, or lesson.
- Graded or ungraded assessments with attempts, passing scores, timing, randomization, explanations, and four question types.
- Member course tiles and course detail pages with curriculum, materials, assessments, and course metadata.
- Course-level authorization, hierarchy validation, learner-private enrollment/progress reads, and manager-only answer keys.

## Required migration

Run `supabase/migrations/0024_course_builder_completion.sql` after `0023` and before the combined production application deployment. The migration adds the Course Builder schema, policies, validation triggers, and ordering function.

After applying it, run `supabase/verify_upnexx_schema.sql` and confirm all `0024` checks report `PASS`.

-- Separate downloadable course content from visual cover images and add
-- optional cover images to resources.

alter table public.courses add column if not exists content_url text;
alter table public.resources add column if not exists cover_image_url text;

-- Migration 0004 temporarily used courses.cover_image_url for the course file.
-- Preserve those existing attachments in the new content_url column.
update public.courses
set
  content_url = cover_image_url,
  cover_image_url = null
where content_url is null
  and cover_image_url is not null;

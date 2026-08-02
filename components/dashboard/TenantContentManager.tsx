"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { BookOpen, CalendarDays, Edit3, ExternalLink, FileText, ImageIcon, LayoutGrid, List, PlayCircle, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { VideoPlayer } from "@/components/content/VideoPlayer";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";

type ContentType = "episodes" | "courses" | "events" | "resources" | "community";
type ContentItem = {
  id: string;
  title: string;
  description?: string;
  status?: string;
  access_level?: "public" | "member" | "paid";
  publish_date?: string;
  starts_at?: string;
  audio_url?: string;
  video_url?: string;
  location_url?: string;
  url?: string;
  cover_image_url?: string;
  content_url?: string;
  resource_type?: string;
  instructor?: string;
  updated_at?: string;
  module_count?: number;
  lesson_count?: number;
  material_count?: number;
  quiz_count?: number;
  enrollment_count?: number;
  completion_count?: number;
};

const copy: Record<ContentType, { title: string; singular: string; description: string; upload: string }> = {
  episodes: { title: "Podcast", singular: "episode", description: "Publish audio and video episodes for your members.", upload: "podcast" },
  courses: { title: "Courses", singular: "course", description: "Create learning experiences and control member access.", upload: "courses" },
  events: { title: "Events", singular: "event", description: "Schedule workshops, livestreams, and member gatherings.", upload: "events" },
  resources: { title: "Resources", singular: "resource", description: "Upload guides, worksheets, recordings, and templates.", upload: "resources" },
  community: { title: "Community", singular: "space", description: "Create and manage focused member discussion spaces.", upload: "community" }
};

function mediaValue(type: ContentType, item: ContentItem | null) {
  if (!item) return "";
  if (type === "episodes") return item.audio_url ?? "";
  if (type === "courses") return item.content_url ?? "";
  if (type === "events") return item.location_url ?? "";
  return item.url ?? "";
}

export function TenantContentManager({ type }: { type: ContentType }) {
  const labels = copy[type];
  const [items, setItems] = useState<ContentItem[]>([]);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">(type === "episodes" ? "list" : "grid");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/tenant-content/${type}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to load content.");
        setItems([]);
      } else {
        setItems(Array.isArray(result.items) ? result.items : []);
        setTenantSlug(result.tenant?.slug ?? "");
      }
    } catch {
      setMessage("Unable to load content. Check your connection and try again.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  function openCreate() {
    setEditing(null);
    setUploadedUrl("");
    setThumbnailUrl("");
    setVideoUrl("");
    setMessage("");
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(item: ContentItem) {
    setEditing(item);
    setUploadedUrl(mediaValue(type, item));
    setThumbnailUrl(item.cover_image_url ?? "");
    setVideoUrl(item.video_url ?? "");
    setMessage("");
    setFormError("");
    setFormOpen(true);
  }

  async function uploadFile(file: File, target: "content" | "thumbnail" = "content") {
    setSaving(true);
    setMessage("Uploading file…");
    setFormError("");
    const data = new FormData();
    data.set("file", file);
    data.set("folder", labels.upload);
    data.set("assetRole", target === "thumbnail" ? "cover" : "content");
    const response = await fetch("/api/tenant-assets", { method: "POST", body: data });
    const result = await response.json();
    if (!response.ok) {
      const errorMessage = result.error ?? "Upload failed.";
      setMessage(errorMessage);
      setFormError(errorMessage);
    }
    else {
      if (target === "thumbnail") setThumbnailUrl(result.url);
      else setUploadedUrl(result.url);
      setMessage(`${result.name} uploaded successfully.`);
    }
    setSaving(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setFormError("");
    const data = new FormData(event.currentTarget);
    const payload = {
      id: editing?.id,
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      status: String(data.get("status") ?? "draft"),
      accessLevel: String(data.get("accessLevel") ?? "member"),
      publishDate: String(data.get("publishDate") ?? ""),
      startsAt: String(data.get("startsAt") ?? ""),
      mediaUrl: uploadedUrl || String(data.get("mediaUrl") ?? ""),
      thumbnailUrl,
      secondaryUrl: videoUrl,
      resourceType: String(data.get("resourceType") ?? "file"),
      instructor: String(data.get("instructor") ?? "")
    };
    const response = await fetch(`/api/tenant-content/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      const errorMessage = result.error ?? "Unable to save content.";
      setFormError(errorMessage);
      setMessage(errorMessage);
    }
    else {
      setMessage(`${labels.singular[0].toUpperCase()}${labels.singular.slice(1)} saved.`);
      setFormOpen(false);
      setEditing(null);
      setUploadedUrl("");
      setThumbnailUrl("");
      await loadItems();
    }
    setSaving(false);
  }

  async function remove(item: ContentItem) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    const response = await fetch(`/api/tenant-content/${type}?id=${item.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) setMessage(result.error ?? "Unable to delete content.");
    else {
      setMessage(`${labels.singular[0].toUpperCase()}${labels.singular.slice(1)} deleted.`);
      await loadItems();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">{labels.title}</h1>
          <p className="mt-2 text-sm text-brand-600">{labels.description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {type === "episodes" && tenantSlug && (
            <Button href={`/demo/${tenantSlug}/episodes`} variant="secondary">
              <ExternalLink className="h-4 w-4" /> Member View
            </Button>
          )}
          <Button type="button" onClick={openCreate}><Plus className="h-4 w-4" /> Add {labels.singular}</Button>
        </div>
      </div>

      {message && <div role="status" className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700">{message}</div>}

      {type !== "episodes" && (
        <div className="flex justify-end gap-1">
          <button type="button" onClick={() => setViewMode("grid")} className={cn("rounded-lg p-2", viewMode === "grid" ? "bg-accent-100 text-accent-700" : "text-brand-500")} aria-label="Tile view"><LayoutGrid className="h-5 w-5" /></button>
          <button type="button" onClick={() => setViewMode("list")} className={cn("rounded-lg p-2", viewMode === "list" ? "bg-accent-100 text-accent-700" : "text-brand-500")} aria-label="List view"><List className="h-5 w-5" /></button>
        </div>
      )}

      {formOpen && (
        <Card>
          <div className="mb-5 flex items-center justify-between border-b border-brand-100 pb-4">
            <h2 className="font-display text-xl font-bold text-brand-900">{editing ? "Edit" : "Add"} {labels.singular}</h2>
            <button type="button" onClick={() => setFormOpen(false)} aria-label="Close form"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={save} className="grid gap-5 md:grid-cols-2">
            <Field label="Title" htmlFor={`${type}-title`} required>
              <Input id={`${type}-title`} name="title" defaultValue={editing?.title} required />
            </Field>
            <Field label="Status" htmlFor={`${type}-status`}>
              <Select id={`${type}-status`} name="status" defaultValue={editing?.status ?? "draft"}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
                {type === "community" && <option value="active">Active</option>}
              </Select>
            </Field>
            <Field label="Description" htmlFor={`${type}-description`} className="md:col-span-2">
              <Textarea id={`${type}-description`} name="description" defaultValue={editing?.description} className="min-h-28" />
            </Field>
            <Field label="Access" htmlFor={`${type}-access`}>
              <Select id={`${type}-access`} name="accessLevel" defaultValue={editing?.access_level ?? "member"}>
                <option value="public">Public</option>
                <option value="member">Members</option>
                <option value="paid">Paid members</option>
              </Select>
            </Field>
            {type === "events" ? (
              <Field label="Starts at" htmlFor={`${type}-starts`} required>
                <Input id={`${type}-starts`} name="startsAt" type="datetime-local" defaultValue={editing?.starts_at?.slice(0, 16)} required />
              </Field>
            ) : type !== "community" && (
              <Field label="Publish date" htmlFor={`${type}-publish`}>
                <Input id={`${type}-publish`} name="publishDate" type="datetime-local" defaultValue={editing?.publish_date?.slice(0, 16)} />
              </Field>
            )}
            {type !== "community" && (
              <>
                <Field label={type === "events" ? "Meeting or livestream URL" : type === "episodes" ? "Audio URL" : type === "courses" ? "Course file or lesson URL" : "Resource file or URL"} htmlFor={`${type}-media`}>
                  <Input id={`${type}-media`} name="mediaUrl" type="url" value={uploadedUrl} onChange={(event) => setUploadedUrl(event.target.value)} placeholder="https://" />
                </Field>
                {type !== "events" && (
                  <Field label={type === "courses" ? "Upload course file" : type === "resources" ? "Upload resource file" : "Upload audio file"} htmlFor={`${type}-file`} hint="Documents, slides, spreadsheets, audio, video, images, or ZIP up to 100 MB.">
                    <Input id={`${type}-file`} type="file" accept="audio/*,video/mp4,image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); }} />
                  </Field>
                )}
                <Field label="Thumbnail or cover image" htmlFor={`${type}-thumbnail`} hint="Optional. Recommended 16:9 JPG, PNG, or WebP. A branded cover is used when omitted.">
                  <Input id={`${type}-thumbnail`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file, "thumbnail"); }} />
                </Field>
                <Field label="Thumbnail image URL" htmlFor={`${type}-thumbnail-url`}>
                  <Input id={`${type}-thumbnail-url`} type="url" value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} placeholder="https://" />
                </Field>
                {thumbnailUrl && (
                  <div className="overflow-hidden rounded-xl border border-brand-200 md:col-span-2">
                    {/* User-managed tenant imagery may be served from signed Supabase URLs. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnailUrl} alt="Thumbnail preview" className="aspect-video w-full object-cover" />
                  </div>
                )}
              </>
            )}
            {type === "episodes" && (
              <>
                <Field label="Video URL" htmlFor={`${type}-video`} className="md:col-span-2" hint="YouTube, Vimeo, and direct MP4 links render in the member player.">
                  <Input id={`${type}-video`} name="secondaryUrl" type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
                </Field>
                {videoUrl && (
                  <div className="overflow-hidden rounded-xl border border-brand-200 bg-black md:col-span-2">
                    <VideoPlayer url={videoUrl} title={editing?.title || "Episode preview"} />
                  </div>
                )}
              </>
            )}
            {type === "courses" && (
              <Field label="Instructor" htmlFor={`${type}-instructor`} className="md:col-span-2">
                <Input id={`${type}-instructor`} name="instructor" defaultValue={editing?.instructor} placeholder="Instructor or facilitator name" />
              </Field>
            )}
            {type === "resources" && (
              <Field label="Resource type" htmlFor={`${type}-resource-type`}>
                <Select id={`${type}-resource-type`} name="resourceType" defaultValue={editing?.resource_type ?? "file"}>
                  <option value="file">File</option><option value="guide">Guide</option><option value="worksheet">Worksheet</option><option value="template">Template</option><option value="checklist">Checklist</option><option value="ebook">Ebook</option><option value="article">Article</option><option value="tool">Tool</option><option value="video">Video</option><option value="audio">Audio</option><option value="link">Link</option>
                </Select>
              </Field>
            )}
            {formError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 md:col-span-2">
                {formError}
              </div>
            )}
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : `Save ${labels.singular}`}</Button>
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {viewMode === "grid" && type !== "episodes" && !loading && items.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const contentUrl = type === "courses" ? item.content_url : type === "events" ? item.location_url : item.url;
            return (
              <Card key={item.id} className="flex min-h-72 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-bold capitalize text-accent-800">{item.status}</span>
                  <span className="text-xs font-bold capitalize text-brand-500">{item.access_level}</span>
                </div>
                {item.cover_image_url ? (
                  <div className="mt-5 overflow-hidden rounded-xl bg-brand-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.cover_image_url} alt="" className="aspect-video w-full object-cover" />
                  </div>
                ) : (
                  <div className="relative mt-5 grid aspect-video place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-900 via-accent-700 to-highlight-500 text-white">
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border-[18px] border-white/10" />
                    {type === "events" ? <CalendarDays className="h-10 w-10" /> : type === "courses" ? <BookOpen className="h-10 w-10" /> : type === "resources" ? <FileText className="h-10 w-10" /> : <ImageIcon className="h-10 w-10" />}
                    <span className="absolute bottom-3 left-4 text-xs font-extrabold uppercase tracking-[0.18em] text-white/85">{labels.title}</span>
                  </div>
                )}
                <h2 className="mt-5 font-display text-xl font-bold text-brand-900">{item.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-brand-600">{item.description || `No ${labels.singular} description added.`}</p>
                {type === "courses" && <p className="mt-3 text-xs font-semibold text-brand-500">{item.module_count ?? 0} modules · {item.lesson_count ?? 0} lessons · {item.material_count ?? 0} materials · {item.quiz_count ?? 0} assessments · {item.enrollment_count ?? 0} enrolled</p>}
                {type === "events" && item.starts_at && <p className="mt-3 text-sm font-bold text-brand-700">{new Date(item.starts_at).toLocaleString()}</p>}
                <div className="mt-auto flex items-center gap-2 pt-5">
                  {type === "courses" && <Button href={`/dashboard/courses/${item.id}`} size="sm" variant="secondary"><BookOpen className="h-4 w-4" /> Open builder</Button>}
                  {type === "resources" && <Button href={`/dashboard/resources/${item.id}`} size="sm" variant="secondary"><FileText className="h-4 w-4" /> Details</Button>}
                  {contentUrl ? <a href={contentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-bold text-white"><ExternalLink className="h-4 w-4" />{type === "events" ? "Open event" : "Open file"}</a> : <span className="text-xs font-semibold text-brand-400">{type === "events" ? "No event URL" : "No file attached"}</span>}
                  <button onClick={() => openEdit(item)} className="ml-auto rounded-lg p-2 text-accent-700 hover:bg-accent-50" aria-label={`Edit ${item.title}`}><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => void remove(item)} className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${item.title}`}><Trash2 className="h-4 w-4" /></button>
                </div>
                {item.status !== "published" && <p className="mt-3 text-xs font-semibold text-warning-strong">Draft content is hidden from members.</p>}
              </Card>
            );
          })}
        </div>
      ) : <Card padded={false} className="overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-brand-600"><RefreshCw className="h-4 w-4 animate-spin" /> Loading {labels.title.toLowerCase()}…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center"><p className="font-display text-xl font-bold text-brand-900">No {labels.title.toLowerCase()} yet</p><p className="mt-2 text-sm text-brand-500">Add your first {labels.singular} to get started.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-100 text-brand-700"><tr><th className="px-5 py-3">Title</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Access</th>{type === "episodes" && <th className="px-5 py-3">Video</th>}<th className="px-5 py-3 text-right">Actions</th></tr></thead>
              <tbody>{items.map((item) => <tr key={item.id} className="border-t border-brand-200"><td className="px-5 py-4 font-bold text-brand-900">{item.title}</td><td className="px-5 py-4 capitalize text-brand-600">{item.status}</td><td className="px-5 py-4 capitalize text-brand-600">{item.access_level ?? "—"}</td>{type === "episodes" && <td className="px-5 py-4">{(item.video_url || item.audio_url) && item.status === "published" && tenantSlug ? <Link href={`/demo/${tenantSlug}/episodes/${item.id}`} className="inline-flex items-center gap-2 rounded-lg bg-accent-50 px-3 py-2 text-xs font-bold text-accent-700"><PlayCircle className="h-4 w-4" />Play</Link> : <span className="text-xs text-brand-400">{item.video_url || item.audio_url ? "Publish to play" : "No media"}</span>}</td>}<td className="px-5 py-4"><div className="flex justify-end gap-2">{type === "courses" && <Link href={`/dashboard/courses/${item.id}`} className="rounded-lg p-2 text-accent-700 hover:bg-accent-50" aria-label={`Manage lessons for ${item.title}`}><BookOpen className="h-4 w-4" /></Link>}{type === "episodes" && <Link href={`/dashboard/podcast/${item.id}`} className="rounded-lg p-2 text-accent-700 hover:bg-accent-50" aria-label={`Manage episode details for ${item.title}`}><FileText className="h-4 w-4" /></Link>}{type === "events" && <Link href={`/dashboard/events/${item.id}`} className="rounded-lg p-2 text-accent-700 hover:bg-accent-50" aria-label={`Manage event experience for ${item.title}`}><CalendarDays className="h-4 w-4" /></Link>}<button onClick={() => openEdit(item)} className="rounded-lg p-2 text-accent-700 hover:bg-accent-50" aria-label={`Edit ${item.title}`}><Edit3 className="h-4 w-4" /></button><button onClick={() => void remove(item)} className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${item.title}`}><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Card>}
    </div>
  );
}


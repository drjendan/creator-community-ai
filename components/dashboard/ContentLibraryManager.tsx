"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, FileText, Library, Mic2, RefreshCw, Search, Sparkles } from "lucide-react";
import { Button, Card, Field, Input, Select } from "@/components/ui";

type ContentType = "episodes" | "courses" | "resources" | "events" | "ai_generations";
type Category = { id: string; name: string; content_type: string };
type LibraryItem = {
  id: string;
  title: string;
  description?: string;
  status: string;
  access_level: string;
  updated_at: string;
  cover_image_url?: string | null;
  content_type: ContentType;
  category_ids: string[];
};

const typeCopy = {
  episodes: { label: "Episodes", icon: Mic2, href: "/dashboard/podcast" },
  courses: { label: "Courses", icon: BookOpen, href: "/dashboard/courses" },
  resources: { label: "Resources", icon: FileText, href: "/dashboard/resources" },
  events: { label: "Events", icon: CalendarDays, href: "/dashboard/events" },
  ai_generations: { label: "AI drafts", icon: Sparkles, href: "/dashboard/ai-studio" }
} as const;

export function ContentLibraryManager() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [savingId, setSavingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/content-library", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(result.error ?? "Unable to load the Content Library.");
    else {
      setItems(result.items ?? []);
      setCategories(result.categories ?? []);
      setCanManage(Boolean(result.canManage));
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => items.filter((item) => {
    const matchesSearch = !search || `${item.title} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (type === "all" || item.content_type === type) && (status === "all" || item.status === status) && (category === "all" || item.category_ids.includes(category));
  }), [items, search, type, status, category]);

  async function saveCategories(item: LibraryItem, categoryIds: string[]) {
    setSavingId(item.id);
    setMessage("");
    const response = await fetch("/api/content-library", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ contentType: item.content_type, contentId: item.id, categoryIds }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(result.error ?? "Unable to save categories.");
    else {
      setItems((current) => current.map((candidate) => candidate.id === item.id && candidate.content_type === item.content_type ? { ...candidate, category_ids: result.categoryIds } : candidate));
      setMessage(`Categories updated for ${item.title}.`);
    }
    setSavingId("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-wide text-accent-700">Tenant content</p><h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">Content Library</h1><p className="mt-2 text-sm text-brand-600">Search, filter, categorize, and open every tenant content type from one workspace.</p></div>
        <div className="flex flex-wrap gap-2">{Object.entries(typeCopy).map(([key, copy]) => <Button key={key} href={copy.href} variant="secondary" size="sm">Manage {copy.label}</Button>)}</div>
      </div>
      {message && <div role="status" className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700">{message}</div>}
      <Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Search" htmlFor="library-search"><div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brand-400" /><Input id="library-search" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Title or description" /></div></Field>
          <Field label="Type" htmlFor="library-type"><Select id="library-type" value={type} onChange={(event) => setType(event.target.value)}><option value="all">All types</option>{Object.entries(typeCopy).map(([key, copy]) => <option key={key} value={key}>{copy.label}</option>)}</Select></Field>
          <Field label="Status" htmlFor="library-status"><Select id="library-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="saved">Saved</option><option value="scheduled">Scheduled</option><option value="published">Published</option><option value="archived">Archived</option></Select></Field>
          <Field label="Category" htmlFor="library-category"><Select id="library-category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
        </div>
      </Card>
      {loading ? <Card><p className="flex items-center gap-2 text-sm text-brand-600"><RefreshCw className="h-4 w-4 animate-spin" />Loading Content Library…</p></Card> : filtered.length === 0 ? <Card><div className="py-8 text-center"><Library className="mx-auto h-10 w-10 text-brand-300" /><p className="mt-3 font-display text-xl font-bold text-brand-900">No content matches these filters.</p><p className="mt-2 text-sm text-brand-600">Clear a filter or open a specialized manager to create content.</p></div></Card> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => {
          const copy = typeCopy[item.content_type];
          const Icon = copy.icon;
          const applicable = categories.filter((candidate) => candidate.content_type === "all" || candidate.content_type === (item.content_type === "episodes" ? "podcasts" : item.content_type));
          return <Card key={`${item.content_type}-${item.id}`} className="flex flex-col">
            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-accent-700"><Icon className="h-4 w-4" />{copy.label}</span><span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold capitalize text-brand-700">{item.status}</span></div>
            <h2 className="mt-4 font-display text-xl font-bold text-brand-900">{item.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-brand-600">{item.description || "No description added."}</p>
            <div className="mt-4 flex flex-wrap gap-2">{item.category_ids.map((id) => <span key={id} className="rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-800">{categories.find((candidate) => candidate.id === id)?.name ?? "Category"}</span>)}</div>
            {canManage && applicable.length > 0 && <Field label="Categories" htmlFor={`categories-${item.content_type}-${item.id}`} className="mt-4"><Select multiple size={Math.min(4, applicable.length)} id={`categories-${item.content_type}-${item.id}`} value={item.category_ids} onChange={(event) => void saveCategories(item, Array.from(event.currentTarget.selectedOptions, (option) => option.value))} disabled={savingId === item.id}>{applicable.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</Select></Field>}
            <div className="mt-auto flex items-center justify-between gap-3 pt-5"><span className="text-xs capitalize text-brand-500">{item.access_level} access · Updated {new Date(item.updated_at).toLocaleDateString()}</span><Button href={copy.href} size="sm" variant="secondary">Open editor</Button></div>
          </Card>;
        })}</div>
      )}
    </div>
  );
}

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Edit3, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type Category = {
  id: string;
  name: string;
  description: string;
  content_type: string;
};

type Settings = {
  default_access_level: "public" | "member" | "paid";
  require_publish_date: boolean;
  allow_downloads: boolean;
  show_draft_badges: boolean;
};

const defaultSettings: Settings = {
  default_access_level: "member",
  require_publish_date: false,
  allow_downloads: true,
  show_draft_badges: true
};

export function ContentConfigurationManager({ mode }: { mode: "categories" | "settings" }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/content-admin/${mode}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? "Unable to load content configuration.");
      else if (mode === "categories") setCategories(result.items ?? []);
      else setSettings(result.settings ?? defaultSettings);
    } catch {
      setError("Unable to load content configuration. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { void load(); }, [load]);

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/content-admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        name: data.get("name"),
        description: data.get("description"),
        contentType: data.get("contentType")
      })
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Unable to save category.");
    else {
      setMessage(`Category ${editing ? "updated" : "created"}.`);
      setEditing(null);
      setFormOpen(false);
      await load();
    }
    setSaving(false);
  }

  async function removeCategory(category: Category) {
    if (!window.confirm(`Delete “${category.name}”?`)) return;
    const response = await fetch(`/api/content-admin/categories?id=${category.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Unable to delete category.");
    else {
      setMessage("Category deleted.");
      await load();
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/content-admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultAccessLevel: data.get("defaultAccessLevel"),
        requirePublishDate: data.get("requirePublishDate") === "on",
        allowDownloads: data.get("allowDownloads") === "on",
        showDraftBadges: data.get("showDraftBadges") === "on"
      })
    });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Unable to save content settings.");
    else {
      setSettings(result.settings);
      setMessage("Content settings saved.");
    }
    setSaving(false);
  }

  if (mode === "settings") {
    return (
      <div className="space-y-6">
        <div><h1 className="font-display text-3xl font-extrabold text-brand-900">Content Settings</h1><p className="mt-2 text-sm text-brand-600">Set tenant-wide publishing defaults for content managers.</p></div>
        {message && <div role="status" className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700">{message}</div>}
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
        <Card>
          {loading ? <p className="flex items-center gap-2 text-sm text-brand-600"><RefreshCw className="h-4 w-4 animate-spin" /> Loading content settings…</p> : (
            <form onSubmit={saveSettings} className="grid gap-5 md:grid-cols-2">
              <Field label="Default access" htmlFor="default-access"><Select id="default-access" name="defaultAccessLevel" defaultValue={settings.default_access_level}><option value="public">Public</option><option value="member">Members</option><option value="paid">Paid members</option></Select></Field>
              <div className="space-y-3 md:col-span-2">
                {[
                  ["requirePublishDate", "Require a publish date", settings.require_publish_date],
                  ["allowDownloads", "Allow member downloads", settings.allow_downloads],
                  ["showDraftBadges", "Show draft badges to managers", settings.show_draft_badges]
                ].map(([name, label, checked]) => <label key={String(name)} className="flex items-center gap-3 rounded-xl border border-brand-200 p-4 text-sm font-semibold text-brand-800"><input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} />{String(label)}</label>)}
              </div>
              <div className="md:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button></div>
            </form>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-3xl font-extrabold text-brand-900">Content Categories</h1><p className="mt-2 text-sm text-brand-600">Organize tenant content with reusable categories.</p></div><Button type="button" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add category</Button></div>
      {message && <div role="status" className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700">{message}</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
      {formOpen && <Card><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-xl font-bold">{editing ? "Edit" : "Add"} category</h2><button type="button" onClick={() => setFormOpen(false)} aria-label="Close form"><X className="h-5 w-5" /></button></div><form onSubmit={saveCategory} className="grid gap-5 md:grid-cols-2"><Field label="Name" htmlFor="category-name" required><Input id="category-name" name="name" defaultValue={editing?.name} required /></Field><Field label="Applies to" htmlFor="category-type"><Select id="category-type" name="contentType" defaultValue={editing?.content_type ?? "all"}><option value="all">All content</option><option value="podcasts">Podcasts</option><option value="courses">Courses</option><option value="resources">Resources</option><option value="events">Events</option><option value="ai_generations">AI drafts</option></Select></Field><Field label="Description" htmlFor="category-description" className="md:col-span-2"><Textarea id="category-description" name="description" defaultValue={editing?.description} /></Field><div className="flex gap-3 md:col-span-2"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save category"}</Button><Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button></div></form></Card>}
      <Card padded={false} className="overflow-hidden">{loading ? <p className="flex items-center gap-2 p-6 text-sm text-brand-600"><RefreshCw className="h-4 w-4 animate-spin" /> Loading categories…</p> : categories.length === 0 ? <div className="p-10 text-center"><p className="font-display text-xl font-bold text-brand-900">No content categories yet</p><p className="mt-2 text-sm text-brand-500">Add a category to organize podcasts, courses, resources, and events.</p></div> : <div className="divide-y divide-brand-200">{categories.map((category) => <div key={category.id} className="flex items-center gap-4 p-5"><div className="min-w-0 flex-1"><p className="font-bold text-brand-900">{category.name}</p><p className="mt-1 text-xs capitalize text-brand-500">{category.content_type === "all" ? "All content" : category.content_type}</p>{category.description && <p className="mt-2 text-sm text-brand-600">{category.description}</p>}</div><button type="button" onClick={() => { setEditing(category); setFormOpen(true); }} aria-label={`Edit ${category.name}`} className="rounded-lg p-2 text-accent-700 hover:bg-accent-50"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => void removeCategory(category)} aria-label={`Delete ${category.name}`} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>)}</div>}</Card>
    </div>
  );
}

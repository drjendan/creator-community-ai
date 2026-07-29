/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Copy,
  Eye,
  Plus,
  RefreshCw,
  Send,
  X
} from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type Resource = "announcements" | "messages" | "campaigns" | "templates";
type Item = Record<string, any> & { id: string; created_at: string };

const labels: Record<
  Resource,
  { title: string; singular: string; description: string }
> = {
  announcements: {
    title: "Announcements",
    singular: "announcement",
    description: "Publish tenant-scoped updates to eligible members."
  },
  messages: {
    title: "Messages",
    singular: "message",
    description: "Send in-app organization messages to selected members."
  },
  campaigns: {
    title: "Email Campaigns",
    singular: "campaign",
    description:
      "Create and send marketing email through the connected tenant provider."
  },
  templates: {
    title: "Email Templates",
    singular: "template",
    description: "Create reusable, tenant-owned email content."
  }
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function itemName(item: Item) {
  return item.title || item.subject || item.name || item.internal_name;
}

export function CommunicationRecords({ resource }: { resource: Resource }) {
  const copy = labels[resource];
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [previewing, setPreviewing] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  async function load() {
    setLoading(true);
    const response = await fetch(`/api/communications/${resource}`, {
      cache: "no-store"
    });
    const result = await response.json();
    setItems(response.ok && Array.isArray(result.items) ? result.items : []);
    if (!response.ok) {
      setMessage(result.error ?? "Unable to load records.");
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [resource]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save");
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const body = String(data.get("body") ?? "").trim();
    const audienceType = String(
      data.get("audienceType") ?? "all_active_members"
    );
    const audienceIds = String(data.get("audienceIds") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const selectedStatus = String(data.get("status") ?? "draft");
    let payload: Record<string, unknown> = { id: editing?.id };

    if (resource === "announcements") {
      payload = {
        ...payload,
        title,
        summary: String(data.get("summary") ?? ""),
        body,
        status: selectedStatus,
        is_pinned: data.get("pinned") === "on",
        publish_at:
          selectedStatus === "published"
            ? new Date().toISOString()
            : data.get("publishAt") || null,
        expires_at: data.get("expiresAt") || null,
        audience_type: audienceType,
        audience_ids: audienceIds,
        send_email_notification: false
      };
    }
    if (resource === "messages") {
      payload = {
        ...payload,
        subject: title,
        body,
        status: selectedStatus,
        sent_at: null,
        audience_type: audienceType,
        audience_ids: audienceIds,
        scheduled_at:
          selectedStatus === "scheduled" ? data.get("scheduledAt") || null : null,
        send_email_notification: data.get("email") === "on"
      };
    }
    if (resource === "campaigns") {
      payload = {
        ...payload,
        internal_name: String(data.get("internalName") ?? title),
        subject: title,
        preview_text: String(data.get("previewText") ?? ""),
        plain_text_content: body,
        html_content: `<div><p>${escapeHtml(body).replaceAll(
          "\n",
          "<br>"
        )}</p></div>`,
        content_json: [{ type: "paragraph", text: body }],
        message_type: "marketing",
        audience_type: audienceType,
        audience_ids: audienceIds,
        status: selectedStatus,
        scheduled_at:
          selectedStatus === "scheduled" ? data.get("scheduledAt") || null : null
      };
    }
    if (resource === "templates") {
      payload = {
        ...payload,
        name: String(data.get("internalName") ?? title),
        category: data.get("category"),
        subject: title,
        preview_text: String(data.get("previewText") ?? ""),
        plain_text_content: body,
        html_content: `<div><p>${escapeHtml(body).replaceAll(
          "\n",
          "<br>"
        )}</p></div>`,
        content_json: [{ type: "paragraph", text: body }],
        is_default: data.get("default") === "on",
        is_active: true
      };
    }

    const response = await fetch(`/api/communications/${resource}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? `${copy.singular[0].toUpperCase()}${copy.singular.slice(1)} saved.`
        : result.error ?? "Unable to save."
    );
    if (response.ok) {
      setOpen(false);
      setEditing(null);
      await load();
    }
    setBusy("");
  }

  async function archive(item: Item) {
    if (!window.confirm(`Archive “${itemName(item)}”?`)) return;
    const response = await fetch(
      `/api/communications/${resource}?id=${encodeURIComponent(item.id)}`,
      { method: "DELETE" }
    );
    const result = await response.json();
    setMessage(
      response.ok
        ? "Record archived."
        : result.error ?? "Unable to archive."
    );
    if (response.ok) await load();
  }

  async function sendCampaign(item: Item) {
    if (
      !window.confirm(
        `Send “${item.internal_name}” to its eligible recipients now?`
      )
    ) {
      return;
    }
    setBusy(item.id);
    const response = await fetch(
      `/api/communications/campaigns/${item.id}/send`,
      { method: "POST" }
    );
    const result = await response.json();
    setMessage(
      response.ok
        ? `${result.accepted} of ${result.attempted} emails were accepted by the provider.`
        : result.error ?? "Unable to send campaign."
    );
    await load();
    setBusy("");
  }

  async function sendMessage(item: Item) {
    if (
      !window.confirm(`Send “${item.subject}” to its eligible recipients now?`)
    ) {
      return;
    }
    setBusy(item.id);
    const response = await fetch(
      `/api/communications/messages/${item.id}/send`,
      { method: "POST" }
    );
    const result = await response.json();
    setMessage(
      response.ok
        ? `Delivered in-app to ${result.inAppDelivered} eligible members${
            item.send_email_notification
              ? `; ${result.accepted} email notifications were accepted`
              : ""
          }.`
        : result.error ?? "Unable to send message."
    );
    await load();
    setBusy("");
  }

  async function cancel(item: Item) {
    if (!window.confirm(`Cancel “${itemName(item)}”?`)) return;
    const payload: Record<string, any> = {
      ...item,
      status: resource === "announcements" ? "draft" : "canceled",
      scheduled_at: null,
      publish_at: null
    };
    delete payload.created_at;
    const response = await fetch(`/api/communications/${resource}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? "Scheduled delivery canceled."
        : result.error ?? "Unable to cancel."
    );
    if (response.ok) await load();
  }

  async function duplicate(item: Item) {
    const payload = {
      ...item,
      id: undefined,
      created_at: undefined,
      updated_at: undefined,
      status: resource === "campaigns" ? "draft" : item.status,
      scheduled_at: null,
      internal_name: item.internal_name
        ? `${item.internal_name} (copy)`
        : undefined,
      name: item.name ? `${item.name} (copy)` : undefined,
      is_default: false,
      created_from_system_template: false
    };
    const response = await fetch(`/api/communications/${resource}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? `${copy.singular[0].toUpperCase()}${copy.singular.slice(1)} duplicated.`
        : result.error ?? "Unable to duplicate."
    );
    if (response.ok) await load();
  }

  async function sendTest(item: Item) {
    const email = window.prompt("Send a test to which email address?");
    if (!email) return;
    setBusy(item.id);
    const response = await fetch(
      `/api/communications/campaigns/${item.id}/test`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      }
    );
    const result = await response.json();
    setMessage(
      response.ok
        ? "Test email accepted by the provider."
        : result.error ?? "Unable to send test email."
    );
    setBusy("");
  }

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const matchesText = itemName(item)
          .toLowerCase()
          .includes(query.toLowerCase());
        const itemStatus = item.status ?? (item.is_active ? "active" : "archived");
        return matchesText && (status === "all" || itemStatus === status);
      }),
    [items, query, status]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-brand-600">{copy.description}</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Create {copy.singular}
        </Button>
      </div>

      {message && (
        <p
          role="status"
          className="rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700"
        >
          {message}
        </p>
      )}

      {previewing && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-500">
                Email preview
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-brand-900">
                {previewing.subject}
              </h2>
              {previewing.preview_text && (
                <p className="mt-1 text-sm text-brand-500">
                  {previewing.preview_text}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPreviewing(null)}
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-brand-200 bg-white p-6 whitespace-pre-wrap text-brand-800">
            {previewing.plain_text_content || previewing.body}
          </div>
        </Card>
      )}

      {open && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-brand-900">
              {editing ? "Edit" : "Create"} {copy.singular}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form
            onSubmit={save}
            className="mt-5 grid gap-5 md:grid-cols-2"
          >
            {(resource === "campaigns" || resource === "templates") && (
              <Field label="Internal name" htmlFor="internal-name" required>
                <Input
                  id="internal-name"
                  name="internalName"
                  defaultValue={editing?.internal_name || editing?.name}
                  required
                />
              </Field>
            )}
            <Field
              label={
                resource === "campaigns" ||
                resource === "templates" ||
                resource === "messages"
                  ? "Subject"
                  : "Title"
              }
              htmlFor="record-title"
              required
            >
              <Input
                id="record-title"
                name="title"
                defaultValue={editing?.title || editing?.subject}
                required
              />
            </Field>
            {resource === "announcements" && (
              <Field label="Summary" htmlFor="summary">
                <Input
                  id="summary"
                  name="summary"
                  defaultValue={editing?.summary}
                />
              </Field>
            )}
            {(resource === "campaigns" || resource === "templates") && (
              <Field label="Preview text" htmlFor="preview-text">
                <Input
                  id="preview-text"
                  name="previewText"
                  defaultValue={editing?.preview_text}
                />
              </Field>
            )}
            <Field
              label="Content"
              htmlFor="record-body"
              className="md:col-span-2"
              required
            >
              <Textarea
                id="record-body"
                name="body"
                defaultValue={
                  editing?.body || editing?.plain_text_content
                }
                className="min-h-40"
                required
              />
            </Field>
            {["announcements", "messages", "campaigns"].includes(resource) && (
              <>
                <Field label="Audience" htmlFor="audience-type">
                  <Select
                    id="audience-type"
                    name="audienceType"
                    defaultValue={
                      editing?.audience_type ?? "all_active_members"
                    }
                  >
                    <option value="all_active_members">
                      All active members
                    </option>
                    <option value="membership_plans">
                      Selected membership plans
                    </option>
                    <option value="groups">Selected groups</option>
                    <option value="segments">Selected audience segments</option>
                    <option value="individual_members">
                      Selected individual members
                    </option>
                  </Select>
                </Field>
                <Field
                  label="Selected IDs"
                  htmlFor="audience-ids"
                  hint="Comma-separated IDs. Leave blank only for all active members."
                >
                  <Input
                    id="audience-ids"
                    name="audienceIds"
                    defaultValue={
                      Array.isArray(editing?.audience_ids)
                        ? editing.audience_ids.join(", ")
                        : ""
                    }
                  />
                </Field>
              </>
            )}
            {resource === "templates" && (
              <>
                <Field label="Category" htmlFor="template-category">
                  <Select
                    id="template-category"
                    name="category"
                    defaultValue={editing?.category ?? "general_update"}
                  >
                    <option value="welcome">Welcome</option>
                    <option value="announcement">Announcement</option>
                    <option value="newsletter">Newsletter</option>
                    <option value="event_invitation">Event invitation</option>
                    <option value="event_reminder">Event reminder</option>
                    <option value="new_content">New content</option>
                    <option value="course_enrollment">Course enrollment</option>
                    <option value="membership_renewal">
                      Membership renewal
                    </option>
                    <option value="general_update">General update</option>
                  </Select>
                </Field>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    name="default"
                    defaultChecked={editing?.is_default}
                  />
                  Use as the default for this category
                </label>
              </>
            )}
            {resource !== "templates" && (
              <Field label="Status" htmlFor="record-status">
                <Select
                  id="record-status"
                  name="status"
                  defaultValue={editing?.status ?? "draft"}
                >
                  <option value="draft">Draft</option>
                  {resource === "announcements" && (
                    <option value="published">Publish now</option>
                  )}
                  <option value="scheduled">Scheduled</option>
                </Select>
              </Field>
            )}
            {resource === "announcements" && (
              <>
                <Field label="Publish at" htmlFor="publish-at">
                  <Input
                    id="publish-at"
                    name="publishAt"
                    type="datetime-local"
                    defaultValue={editing?.publish_at?.slice(0, 16)}
                  />
                </Field>
                <Field label="Expires at" htmlFor="expires-at">
                  <Input
                    id="expires-at"
                    name="expiresAt"
                    type="datetime-local"
                    defaultValue={editing?.expires_at?.slice(0, 16)}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    name="pinned"
                    defaultChecked={editing?.is_pinned}
                  />
                  Pin announcement
                </label>
              </>
            )}
            {(resource === "messages" || resource === "campaigns") && (
              <Field label="Schedule at" htmlFor="scheduled-at">
                <Input
                  id="scheduled-at"
                  name="scheduledAt"
                  type="datetime-local"
                  defaultValue={editing?.scheduled_at?.slice(0, 16)}
                />
              </Field>
            )}
            {resource === "messages" && (
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="email"
                  defaultChecked={editing?.send_email_notification}
                />
                Send an email notification too
              </label>
            )}
            <div className="flex gap-3 md:col-span-2">
              <Button type="submit" disabled={Boolean(busy)}>
                {busy === "save" ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padded={false}>
        <div className="grid gap-3 border-b border-brand-100 p-4 sm:grid-cols-[1fr_12rem]">
          <Input
            aria-label={`Search ${copy.title.toLowerCase()}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${copy.title.toLowerCase()}`}
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="sent">Sent</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="canceled">Canceled</option>
            <option value="failed">Failed</option>
          </Select>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-brand-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : !filtered.length ? (
          <div className="p-10 text-center">
            <h2 className="font-display text-xl font-bold text-brand-900">
              No matching {copy.title.toLowerCase()}
            </h2>
            <p className="mt-2 text-sm text-brand-500">
              {items.length
                ? "Change the search or status filter."
                : `Create the first ${copy.singular} when your organization is ready.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-100 text-brand-700">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t border-brand-200">
                    <td className="px-5 py-4 font-bold text-brand-900">
                      {itemName(item)}
                    </td>
                    <td className="px-5 py-4 capitalize text-brand-600">
                      {String(
                        item.status ??
                          (item.is_active ? "active" : "archived")
                      ).replaceAll("_", " ")}
                    </td>
                    <td className="px-5 py-4 text-brand-600">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditing(item);
                            setOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        {(resource === "campaigns" ||
                          resource === "templates") && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setPreviewing(item)}
                            >
                              <Eye className="h-4 w-4" />
                              Preview
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => void duplicate(item)}
                            >
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </Button>
                          </>
                        )}
                        {resource === "campaigns" &&
                          ["draft", "failed"].includes(item.status) && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={busy === item.id}
                                onClick={() => void sendTest(item)}
                              >
                                Test
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={busy === item.id}
                                onClick={() => void sendCampaign(item)}
                              >
                                <Send className="h-4 w-4" />
                                Send
                              </Button>
                            </>
                          )}
                        {resource === "messages" &&
                          item.status === "draft" && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy === item.id}
                              onClick={() => void sendMessage(item)}
                            >
                              <Send className="h-4 w-4" />
                              Send now
                            </Button>
                          )}
                        {["campaigns", "messages", "announcements"].includes(resource) &&
                          item.status === "scheduled" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => void cancel(item)}
                            >
                              Cancel schedule
                            </Button>
                          )}
                        <button
                          type="button"
                          onClick={() => void archive(item)}
                          className="rounded-lg p-2 text-red-700 hover:bg-red-50"
                          aria-label={`Archive ${itemName(item)}`}
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

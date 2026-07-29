"use client";

import { useEffect, useState } from "react";
import { Archive, Copy, Plus, RefreshCw, X } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type Rule = {
  ruleType: string;
  operator: string;
  value: string;
};
type Segment = {
  id: string;
  name: string;
  description: string;
  match_type: "and" | "or";
  estimated_count: number;
  rules: Array<{
    id: string;
    rule_type: string;
    operator: string;
    rule_value: string | string[];
  }>;
};

const ruleTypes = [
  ["membership_plan", "Membership plan ID"],
  ["membership_status", "Membership status"],
  ["group_membership", "Group ID"],
  ["course_enrollment", "Course ID"],
  ["event_registration", "Event ID"],
  ["joined_before", "Joined before date"],
  ["joined_after", "Joined after date"],
  ["email_opt_in", "Marketing email opt-in"],
  ["last_login", "Last login date"]
];
const emptyRule: Rule = {
  ruleType: "membership_status",
  operator: "equals",
  value: "active"
};

export function AudienceSegments() {
  const [items, setItems] = useState<Segment[]>([]);
  const [editing, setEditing] = useState<Segment | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [matchType, setMatchType] = useState<"and" | "or">("and");
  const [rules, setRules] = useState<Rule[]>([{ ...emptyRule }]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{
    name: string;
    emails: string[];
  } | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/communications/segments", {
      cache: "no-store"
    });
    const result = await response.json();
    if (response.ok) setItems(result.items);
    else setMessage(result.error ?? "Unable to load segments.");
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);

  function start(item?: Segment) {
    setEditing(item ?? null);
    setName(item?.name ?? "");
    setDescription(item?.description ?? "");
    setMatchType(item?.match_type ?? "and");
    setRules(
      item?.rules.length
        ? item.rules.map((rule) => ({
            ruleType: rule.rule_type,
            operator: rule.operator,
            value: Array.isArray(rule.rule_value)
              ? rule.rule_value.join(", ")
              : String(rule.rule_value)
          }))
        : [{ ...emptyRule }]
    );
    setOpen(true);
  }

  function updateRule(index: number, value: Partial<Rule>) {
    setRules((current) =>
      current.map((rule, position) =>
        position === index ? { ...rule, ...value } : rule
      )
    );
  }

  async function save() {
    setBusy(true);
    const response = await fetch("/api/communications/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        name,
        description,
        matchType,
        rules: rules.map((rule) => {
          const values = rule.value
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
          return {
            ...rule,
            value: values.length === 1 ? values[0] : values
          };
        })
      })
    });
    const result = await response.json();
    setMessage(
      response.ok ? "Audience segment saved." : result.error ?? "Unable to save."
    );
    if (response.ok) {
      setOpen(false);
      await load();
    }
    setBusy(false);
  }

  async function duplicate(item: Segment) {
    const response = await fetch("/api/communications/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${item.name} (copy)`,
        description: item.description,
        matchType: item.match_type,
        rules: item.rules.map((rule) => ({
          ruleType: rule.rule_type,
          operator: rule.operator,
          value: rule.rule_value
        }))
      })
    });
    const result = await response.json();
    setMessage(
      response.ok ? "Audience segment duplicated." : result.error ?? "Unable to duplicate."
    );
    if (response.ok) await load();
  }

  async function archive(item: Segment) {
    if (!window.confirm(`Archive “${item.name}”?`)) return;
    const response = await fetch(
      `/api/communications/segments?id=${encodeURIComponent(item.id)}`,
      { method: "DELETE" }
    );
    const result = await response.json();
    setMessage(
      response.ok ? "Audience segment archived." : result.error ?? "Unable to archive."
    );
    if (response.ok) await load();
  }

  async function showPreview(item: Segment) {
    const response = await fetch(
      `/api/communications/segments/${item.id}/preview`,
      { cache: "no-store" }
    );
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Unable to preview the segment.");
      return;
    }
    setPreview({
      name: item.name,
      emails: result.recipients.map(
        (recipient: { email: string }) => recipient.email
      )
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">
            Audience Segments
          </h1>
          <p className="mt-2 text-sm text-brand-600">
            Build reusable audiences from current tenant membership and
            engagement data.
          </p>
        </div>
        <Button type="button" onClick={() => start()}>
          <Plus className="h-4 w-4" />
          Create segment
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
      {preview && (
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-brand-900">
                {preview.name}
              </h2>
              <p className="mt-1 text-sm text-brand-600">
                {preview.emails.length} currently eligible recipient
                {preview.emails.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreview(null)}
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {preview.emails.length > 0 && (
            <ul className="mt-4 max-h-72 divide-y divide-brand-100 overflow-auto">
              {preview.emails.map((email) => (
                <li key={email} className="py-2 text-sm text-brand-700">
                  {email}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {open && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-brand-900">
              {editing ? "Edit segment" : "Create segment"}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Name" htmlFor="segment-name" required>
              <Input
                id="segment-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field label="Rule matching" htmlFor="segment-match">
              <Select
                id="segment-match"
                value={matchType}
                onChange={(event) =>
                  setMatchType(event.target.value as "and" | "or")
                }
              >
                <option value="and">All rules (AND)</option>
                <option value="or">Any rule (OR)</option>
              </Select>
            </Field>
            <Field
              label="Description"
              htmlFor="segment-description"
              className="md:col-span-2"
            >
              <Textarea
                id="segment-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-6 space-y-3">
            <h3 className="font-bold text-brand-900">Rules</h3>
            {rules.map((rule, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-xl border border-brand-100 p-4 md:grid-cols-[1fr_10rem_1fr_auto]"
              >
                <Select
                  aria-label={`Rule ${index + 1} type`}
                  value={rule.ruleType}
                  onChange={(event) =>
                    updateRule(index, { ruleType: event.target.value })
                  }
                >
                  {ruleTypes.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label={`Rule ${index + 1} operator`}
                  value={rule.operator}
                  onChange={(event) =>
                    updateRule(index, { operator: event.target.value })
                  }
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Does not equal</option>
                  <option value="before">Before</option>
                  <option value="after">After</option>
                </Select>
                <Input
                  aria-label={`Rule ${index + 1} value`}
                  value={rule.value}
                  onChange={(event) =>
                    updateRule(index, { value: event.target.value })
                  }
                  placeholder={
                    rule.ruleType.includes("date") ||
                    rule.ruleType.startsWith("joined") ||
                    rule.ruleType === "last_login"
                      ? "YYYY-MM-DD"
                      : "Value or comma-separated IDs"
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={rules.length === 1}
                  onClick={() =>
                    setRules((current) =>
                      current.filter((_, position) => position !== index)
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                setRules((current) => [...current, { ...emptyRule }])
              }
            >
              Add rule
            </Button>
          </div>
          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              onClick={() => void save()}
              disabled={busy || !name.trim() || rules.some((rule) => !rule.value.trim())}
            >
              {busy ? "Saving…" : "Save segment"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}
      <Card padded={false}>
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-brand-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-100 text-brand-700">
                <tr>
                  <th className="px-5 py-3">Segment</th>
                  <th className="px-5 py-3">Rules</th>
                  <th className="px-5 py-3">Eligible now</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-brand-100">
                    <td className="px-5 py-4">
                      <p className="font-bold text-brand-900">{item.name}</p>
                      <p className="text-xs text-brand-500">
                        {item.description}
                      </p>
                    </td>
                    <td className="px-5 py-4 capitalize text-brand-600">
                      {item.rules.length} · {item.match_type.toUpperCase()}
                    </td>
                    <td className="px-5 py-4 font-bold text-brand-900">
                      {item.estimated_count}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => void showPreview(item)}
                        >
                          Preview
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => start(item)}
                        >
                          Edit
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
                        <button
                          type="button"
                          className="rounded-lg p-2 text-red-700 hover:bg-red-50"
                          onClick={() => void archive(item)}
                          aria-label={`Archive ${item.name}`}
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
        ) : (
          <div className="p-10 text-center">
            <h2 className="font-display text-xl font-bold text-brand-900">
              No audience segments
            </h2>
            <p className="mt-2 text-sm text-brand-500">
              Create a segment to calculate a reusable audience from current
              tenant data.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

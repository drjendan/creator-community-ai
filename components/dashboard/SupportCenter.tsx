"use client";

import { FormEvent, useState } from "react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type RequestItem = {
  id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
};

export function SupportCenter({ initialRequests }: { initialRequests: RequestItem[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Technical Issue");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject, body, category })
    });
    const result = await response.json().catch(() => ({})) as { error?: string; request?: RequestItem };
    setBusy(false);
    if (!response.ok || !result.request) {
      setError(result.error || "Unable to submit the support request.");
      return;
    }
    setRequests((current) => [result.request!, ...current]);
    setSubject("");
    setBody("");
    setMessage("Your support request was submitted.");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <Card>
        <h2 className="font-display text-xl font-bold text-brand-900">Contact Support</h2>
        <p className="mt-2 text-sm text-brand-600">Billing and support remain available even after a trial expires.</p>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <Field label="Category" htmlFor="support-category">
            <Select id="support-category" value={category} onChange={(event) => setCategory(event.target.value)}>
              {["Account Access", "Billing", "Content", "Courses", "Podcasts", "Communication Hub", "AI Features", "Technical Issue", "Other"].map((value) => <option key={value}>{value}</option>)}
            </Select>
          </Field>
          <Field label="Subject" htmlFor="support-subject"><Input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} minLength={3} maxLength={160} required /></Field>
          <Field label="How can we help?" htmlFor="support-body"><Textarea id="support-body" value={body} onChange={(event) => setBody(event.target.value)} minLength={10} maxLength={5000} required /></Field>
          <Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit Request"}</Button>
          {message && <p role="status" className="text-sm font-semibold text-success-strong">{message}</p>}
          {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        </form>
      </Card>
      <Card>
        <h2 className="font-display text-xl font-bold text-brand-900">Your requests</h2>
        {requests.length === 0 ? (
          <p className="mt-4 text-sm text-brand-500">No support requests yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {requests.map((request) => (
              <li key={request.id} className="rounded-xl border border-brand-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-brand-900">{request.subject}</p>
                  <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold capitalize text-brand-700">{request.status}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-brand-600">{request.body}</p>
                <time className="mt-2 block text-xs text-brand-500" dateTime={request.created_at}>{new Date(request.created_at).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

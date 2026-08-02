"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Container, Input } from "@/components/ui";
import type { ResolvedLegalDocument } from "@/lib/legal";

export function LegalDocumentPage({ document }: { document: ResolvedLegalDocument }) {
  const [query, setQuery] = useState("");
  const sections = useMemo(() => {
    const blocks = document.content.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
    const pairs: { heading: string; body: string }[] = [];
    for (let index = 0; index < blocks.length; index += 2) pairs.push({ heading: blocks[index], body: blocks[index + 1] ?? "" });
    const normalized = query.trim().toLowerCase();
    return normalized ? pairs.filter((section) => `${section.heading} ${section.body}`.toLowerCase().includes(normalized)) : pairs;
  }, [document.content, query]);

  return (
    <main className="min-h-screen bg-brand-50">
      <header className="border-b border-brand-200 bg-white"><Container className="flex items-center justify-between py-5"><BrandMark /><Link href="/" className="text-sm font-bold text-accent-700">Back to UpNexx</Link></Container></header>
      <Container className="max-w-4xl py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-accent-700">Legal Center</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold text-brand-900 md:text-5xl">{document.title}</h1>
        <p className="mt-4 text-sm text-brand-500">Version {document.version} · Effective {new Date(document.effectiveAt).toLocaleDateString()}</p>
        <label className="mt-8 flex items-center gap-3 rounded-xl border border-brand-200 bg-white px-4 shadow-sm"><Search className="h-5 w-5 text-brand-400" /><Input aria-label={`Search ${document.title}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this policy" className="border-0 shadow-none focus:ring-0" /></label>
        <div className="mt-10 space-y-9">{sections.length ? sections.map((section) => <section key={section.heading}><h2 className="font-display text-2xl font-bold text-brand-900">{section.heading}</h2><p className="mt-3 whitespace-pre-wrap text-base leading-8 text-brand-700">{section.body}</p></section>) : <p role="status" className="rounded-xl border border-brand-200 bg-white p-6 text-brand-600">No sections match your search.</p>}</div>
      </Container>
    </main>
  );
}

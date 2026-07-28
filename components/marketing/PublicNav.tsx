"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { Button, Container } from "@/components/ui";
import { landingNav } from "@/lib/mock/podcastos";

export function PublicNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-950/90 text-white backdrop-blur-xl">
      <Container className="flex h-20 items-center justify-between gap-6">
        <BrandMark inverse compact />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Public navigation">
          {landingNav.slice(0, 5).map((item, index) => <Link key={item.href} href={item.href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-100 transition hover:text-highlight-300">{item.label}{index < 2 ? <ChevronDown className="h-3.5 w-3.5" /> : null}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button href="/login" variant="ghost" size="sm" className="text-white hover:bg-white/10">Log In</Button>
          <Button href="/request-demo" size="sm">Start Free Trial</Button>
        </div>
        <button type="button" className="rounded-lg border border-white/20 p-2 text-white md:hidden" aria-label="Toggle mobile navigation" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? <X /> : <Menu />}
        </button>
      </Container>
      {open && (
        <nav className="border-t border-white/10 bg-brand-950 px-6 py-5 md:hidden" aria-label="Mobile navigation">
          <div className="space-y-1">
            {landingNav.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 font-semibold text-brand-100 hover:bg-white/10">{item.label}</Link>)}
          </div>
          <div className="mt-4 grid gap-2"><Button href="/login" variant="secondary" className="border-white/30 text-white hover:bg-white/10">Log In</Button><Button href="/request-demo">Start Free Trial</Button></div>
        </nav>
      )}
    </header>
  );
}
